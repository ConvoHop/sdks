package main

import (
	"bytes"
	"encoding/json"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"testing"
)

// extract extracts the package example.com/m from files, keyed by name.
func extract(t *testing.T, files map[string]string) ([]symbol, error) {
	t.Helper()
	out, err := extractLanguage(languageIn(write(t, repo(files))))
	if err != nil {
		return nil, err
	}
	return out.Packages[0].Symbols, nil
}

// lookup returns the symbol called name in the package example.com/m, whose
// only file holds src.
func lookup(t *testing.T, src, name string) symbol {
	t.Helper()
	symbols, err := extract(t, map[string]string{"m.go": src})
	if err != nil {
		t.Fatal(err)
	}
	i := slices.IndexFunc(symbols, func(s symbol) bool { return s.Name == name })
	if i < 0 {
		t.Fatalf("no symbol %s in %v", name, symbols)
	}
	return symbols[i]
}

// TestFixture extracts testdata/repo, whose packages hold each kind of
// declaration that the extractor documents, and compares the surface with
// testdata/surface.golden.json. After an intended change, run
// UPDATE_GOLDEN=1 go test . and review the golden file's diff.
func TestFixture(t *testing.T) {
	file := languageIn(filepath.Join("testdata", "repo"))
	code, stdout, stderr := runExtractor(file)
	if code != 0 || stderr != "" {
		t.Fatalf("run = %d, %q", code, stderr)
	}
	for range 2 {
		if _, again, _ := runExtractor(file); again != stdout {
			t.Fatal("two runs printed different surfaces")
		}
	}
	var got bytes.Buffer
	if err := json.Indent(&got, []byte(stdout), "", "  "); err != nil {
		t.Fatal(err)
	}
	golden := filepath.Join("testdata", "surface.golden.json")
	if os.Getenv("UPDATE_GOLDEN") == "1" {
		if err := os.WriteFile(golden, got.Bytes(), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	want, err := os.ReadFile(golden)
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.Equal(got.Bytes(), want) {
		t.Errorf("the surface isn't %s; after an intended change, run UPDATE_GOLDEN=1 go test . and review the diff. Got:\n%s", golden, got.Bytes())
	}
}

// TestFailures checks that the extractor fails, naming the file and line,
// on what it can't document faithfully.
func TestFailures(t *testing.T) {
	tests := []struct {
		name  string
		files map[string]string
		want  string
	}{
		{
			name:  "go:build constraint",
			files: map[string]string{"m.go": "//go:build linux\n\npackage m\n"},
			want:  "m/m.go:1: build constraints aren't supported; the reference documents one build of the package",
		},
		{
			name:  "+build constraint",
			files: map[string]string{"m.go": "// Package m is m.\n// +build linux\n\npackage m\n"},
			want:  "m/m.go:2: build constraints aren't supported; the reference documents one build of the package",
		},
		{
			name:  "file for one operating system",
			files: map[string]string{"m.go": "package m\n", "m_windows.go": "package m\n"},
			want:  "m/m_windows.go: doesn't build for linux/amd64; the reference documents files that build everywhere",
		},
		{
			name:  "file for one architecture",
			files: map[string]string{"m.go": "package m\n", "m_arm64.go": "package m\n"},
			want:  "m/m_arm64.go: doesn't build for linux/amd64; the reference documents files that build everywhere",
		},
		{
			name:  "cgo",
			files: map[string]string{"m.go": "package m\n\n// #include <stdlib.h>\nimport \"C\"\n"},
			want:  "m/m.go:4: imports C; the reference documents files that build everywhere, without cgo",
		},
		{
			name:  "files of two packages",
			files: map[string]string{"a.go": "package m\n", "b.go": "package n\n"},
			want:  "m/b.go: package n isn't package m, like m/a.go",
		},
		{
			name:  "no Go files",
			files: map[string]string{"m_test.go": "package m\n", "_m.go": "package m\n"},
			want:  "m: no Go files",
		},
		{
			name:  "unexported embedded struct",
			files: map[string]string{"m.go": "package m\n\ntype base struct{ ID string }\n\n// T is a type.\ntype T struct {\n\tbase\n}\n"},
			want:  "m/m.go:7: T embeds base, which isn't exported, so the reference can't list the members it promotes; embed an exported type or declare the members",
		},
		{
			name:  "unexported embedded pointer",
			files: map[string]string{"m.go": "package m\n\ntype base struct{}\n\n// T is a type.\ntype T struct{ *base }\n"},
			want:  "m/m.go:6: T embeds base, which isn't exported, so the reference can't list the members it promotes; embed an exported type or declare the members",
		},
		{
			name:  "unexported embedded interface",
			files: map[string]string{"m.go": "package m\n\ntype reader interface{ Read() }\n\n// R reads.\ntype R interface {\n\treader\n\tClose()\n}\n"},
			want:  "m/m.go:7: R embeds reader, which isn't exported, so the reference can't list the members it promotes; embed an exported type or declare the members",
		},
		{
			name:  "union",
			files: map[string]string{"m.go": "package m\n\n// Number is a number.\ntype Number interface{ ~int | ~float64 }\n"},
			want:  "m/m.go:4: Number has a type-set element; the reference documents interfaces of methods only",
		},
		{
			name:  "predeclared constraint",
			files: map[string]string{"m.go": "package m\n\n// Key is a key.\ntype Key interface {\n\tcomparable\n\tString() string\n}\n"},
			want:  "m/m.go:5: Key has a type-set element; the reference documents interfaces of methods only",
		},
		{
			name:  "iota",
			files: map[string]string{"m.go": "package m\n\n// Level is a level.\ntype Level int\n\n// The levels.\nconst (\n\tLow Level = iota\n\tHigh\n)\n"},
			want:  "m/m.go:9: High repeats the previous constant's expression, as iota blocks do; give each exported constant its own value",
		},
		{
			name:  "values of one expression",
			files: map[string]string{"m.go": "package m\n\n// A and B are a pair.\nvar A, B = pair()\n\nfunc pair() (int, int) { return 1, 2 }\n"},
			want:  "m/m.go:4: A takes one of the values of a single expression; declare each exported value on its own",
		},
		{
			name:  "untyped constant in an enum's block",
			files: map[string]string{"m.go": "package m\n\n// Color is a color.\ntype Color string\n\n// The colors.\nconst (\n\tRed   Color = \"red\"\n\tGreen Color = \"green\"\n\tBlue  Color = \"blue\"\n\tCount       = 3\n)\n"},
			want:  "m/m.go:11: Count is in a constant block of Color but isn't declared as a Color; declare it with the type or move it out of the block",
		},
		{
			name:  "unused link definition",
			files: map[string]string{"m.go": "package m\n\n// F does it.\n//\n// [unused]: https://example.com\nfunc F() {}\n"},
			want:  "m/m.go:6: doc comment: the link definition [unused] isn't used; the reference drops link definitions, so link to it or remove it",
		},
		{
			name:  "http link",
			files: map[string]string{"m.go": "package m\n\n// F follows [the spec].\n//\n// [the spec]: http://example.com/spec\nfunc F() {}\n"},
			want:  "m/m.go:6: doc comment: the link to http://example.com/spec isn't https: or mailto:, the only links the docs site allows",
		},
		{
			name:  "field doc that MDX reads as an import",
			files: map[string]string{"m.go": "package m\n\n// T is a type.\ntype T struct {\n\t// import the value.\n\tF int\n}\n"},
			want:  "m/m.go:6: doc comment: a paragraph starts with \"import\", which MDX reads as JavaScript; reword it",
		},
		{
			name:  "list item that MDX reads as an export",
			files: map[string]string{"m.go": "package m\n\n// F does it:\n//   - export the value\nfunc F() {}\n"},
			want:  "m/m.go:5: doc comment: a paragraph starts with \"export\", which MDX reads as JavaScript; reword it",
		},
		{
			name:  "code block",
			files: map[string]string{"m.go": "package m\n\n// F does it:\n//\n//\tm.F()\nfunc F() {}\n"},
			want:  "m/m.go:6: doc comment: code blocks aren't tested; put example code in a tested quickstart snippet",
		},
		{
			name:  "code block in a field doc",
			files: map[string]string{"m.go": "package m\n\n// T is a type.\ntype T struct {\n\t// F is set like this:\n\t//\n\t//\tt.F = 1\n\tF int\n}\n"},
			want:  "m/m.go:8: doc comment: code blocks aren't tested; put example code in a tested quickstart snippet",
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			_, err := extract(t, test.files)
			if err == nil || err.Error() != test.want {
				t.Errorf("err = %v; want %s", err, test.want)
			}
		})
	}
}

func TestSyntaxError(t *testing.T) {
	_, err := extract(t, map[string]string{"m.go": "package m\n\nfunc {\n"})
	if err == nil || !strings.HasPrefix(err.Error(), "m/m.go:3:") {
		t.Errorf("err = %v; want a syntax error at m/m.go:3", err)
	}
}

// TestIgnoredFiles checks that the extractor reads the files that the go
// command builds into the package, and no others.
func TestIgnoredFiles(t *testing.T) {
	symbols, err := extract(t, map[string]string{
		"m.go":       "package m\n\n// A is documented.\nconst A = 1\n",
		"_draft.go":  "package draft\n\n// B isn't.\nconst B = 2\n",
		".hidden.go": "package hidden\n\n// C isn't.\nconst C = 3\n",
		"m_test.go":  "package m_test\n\n// D isn't.\nconst D = 4\n",
		"m.go.txt":   "package text\n",
		"sub/sub.go": "package sub\n\n// E isn't.\nconst E = 5\n",
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(symbols) != 1 || symbols[0].Name != "A" {
		t.Errorf("symbols = %v; want only A", symbols)
	}
}

// TestSignatures checks that signatures are gofmt-formatted declarations
// without comments, except where go/doc removed unexported members.
func TestSignatures(t *testing.T) {
	tests := []struct {
		name, src, symbol, want string
	}{
		{
			name:   "struct with commented and unexported fields",
			src:    "package m\n\n// T is a type.\ntype T struct {\n\t// Name names it.\n\tName string `json:\"name\"` // The name.\n\tid   string\n}\n",
			symbol: "T",
			want:   "type T struct {\n\tName string `json:\"name\"`\n\t// contains filtered or unexported fields\n}",
		},
		{
			name:   "interface with commented and unexported methods",
			src:    "package m\n\n// S stores.\ntype S interface {\n\t// Load loads.\n\tLoad() error // It may fail.\n\tsave()\n}\n",
			symbol: "S",
			want:   "type S interface {\n\tLoad() error\n\t// contains filtered or unexported methods\n}",
		},
		{
			name:   "raw string with comment-like text and a blank line",
			src:    "package m\n\n// Usage is the help.\nconst Usage = `usage:\n// not a comment\n\n/* nor this */`\n",
			symbol: "Usage",
			want:   "const Usage = `usage:\n// not a comment\n\n/* nor this */`",
		},
		{
			name:   "function with comments between its parameters",
			src:    "package m\n\n// F does it.\nfunc F(\n\t// a is first.\n\ta int, /* b is second. */ b string,\n) error {\n\treturn nil\n}\n",
			symbol: "F",
			want:   "func F(\n\ta int, b string,\n) error",
		},
		{
			name:   "one of several names",
			src:    "package m\n\n// A, b and C count.\nconst A, b, C = 1, 2, 3\n",
			symbol: "C",
			want:   "const C = 3",
		},
		{
			name:   "typed constant in a block",
			src:    "package m\n\n// Limits.\nconst (\n\t// Max is the most.\n\tMax int64 = 1 << 20 // bytes\n)\n",
			symbol: "Max",
			want:   "const Max int64 = 1 << 20",
		},
		{
			name:   "generic type",
			src:    "package m\n\n// Page is a page.\ntype Page[T any] struct {\n\tItems []T // The items.\n}\n",
			symbol: "Page",
			want:   "type Page[T any] struct {\n\tItems []T\n}",
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			got := lookup(t, test.src, test.symbol).Signatures
			if len(got) != 1 || got[0] != test.want {
				t.Errorf("signatures = %q; want %q", got, test.want)
			}
		})
	}
}

// TestPromotion checks that a type lists the members it promotes from the
// package's types, where a shallower name hides deeper ones and a name that
// two types at the same depth declare is promoted from neither.
func TestPromotion(t *testing.T) {
	const src = `package m

// A is a base.
type A struct{ ID string }

// Hello greets.
func (A) Hello() {}

// B is another base.
type B struct{ ID string }

// Bye leaves.
func (*B) Bye() {}

// C embeds both bases.
type C struct {
	A
	*B
}

// Hello hides A's Hello.
func (C) Hello() {}

// D embeds C.
type D struct{ C }
`
	tests := []struct {
		symbol string
		want   []string
	}{
		{"C", []string{"A property", "B property", "Hello method", "Bye method from B"}},
		{"D", []string{"C property", "A property from C", "B property from C", "Hello method from C", "Bye method from B"}},
	}
	for _, test := range tests {
		var got []string
		for _, m := range lookup(t, src, test.symbol).Members {
			text := m.Name + " " + m.Kind
			if m.Inherited != "" {
				text += " from " + m.Inherited
			}
			got = append(got, text)
		}
		if !slices.Equal(got, test.want) {
			t.Errorf("%s's members = %q; want %q", test.symbol, got, test.want)
		}
	}
}
