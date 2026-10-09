package main

import (
	"bytes"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// languagePath is the language file's path in a repository.
const languagePath = "docs/languages/go/language.json"

// repo returns the files of a repository whose language file lists the
// package example.com/m, in the module example.com/m in m, with files, keyed
// by name, as its source.
func repo(files map[string]string) map[string]string {
	out := map[string]string{
		languagePath: `{"id": "go", "packages": [{"name": "example.com/m", "source": "m"}]}`,
		"m/go.mod":   "module example.com/m\n\ngo 1.26.0\n",
	}
	for name, content := range files {
		out["m/"+name] = content
	}
	return out
}

// write writes files, keyed by slash-separated path, to a new temporary
// directory and returns the directory.
func write(t *testing.T, files map[string]string) string {
	t.Helper()
	root := t.TempDir()
	for name, content := range files {
		file := filepath.Join(root, filepath.FromSlash(name))
		if err := os.MkdirAll(filepath.Dir(file), 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(file, []byte(content), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	return root
}

// languageIn returns the path of the language file in the repository root.
func languageIn(root string) string {
	return filepath.Join(root, filepath.FromSlash(languagePath))
}

// runExtractor runs the command with args and returns its exit code, standard
// output and standard error.
func runExtractor(args ...string) (int, string, string) {
	var stdout, stderr bytes.Buffer
	code := run(args, &stdout, &stderr)
	return code, stdout.String(), stderr.String()
}

func TestUsage(t *testing.T) {
	for _, args := range [][]string{nil, {"a.json", "b.json"}} {
		code, stdout, stderr := runExtractor(args...)
		if code != 2 || stdout != "" || stderr != "usage: go run . <language.json>\n" {
			t.Errorf("run(%q) = %d, %q, %q; want 2, no output and the usage", args, code, stdout, stderr)
		}
	}
}

func TestLanguageFileErrors(t *testing.T) {
	language := func(packages string) string { return `{"id": "go", "packages": ` + packages + `}` }
	tests := []struct {
		name  string
		files map[string]string
		want  string // the message, after the language file's path
	}{
		{
			name:  "invalid JSON",
			files: map[string]string{languagePath: "{"},
			want:  ": unexpected end of JSON input",
		},
		{
			name:  "another language",
			files: map[string]string{languagePath: `{"id": "python", "packages": [{"name": "convohop", "source": "python"}]}`},
			want:  ": isn't the Go language config",
		},
		{
			name:  "no packages",
			files: map[string]string{languagePath: language(`[]`)},
			want:  ": lists no packages",
		},
		{
			name:  "package without a name",
			files: map[string]string{languagePath: language(`[{"source": "m"}]`)},
			want:  ": every package needs a name and a source directory in the repository",
		},
		{
			name:  "package without a source",
			files: map[string]string{languagePath: language(`[{"name": "example.com/m"}]`)},
			want:  ": every package needs a name and a source directory in the repository",
		},
		{
			name:  "source outside the repository",
			files: map[string]string{languagePath: language(`[{"name": "example.com/m", "source": "../m"}]`)},
			want:  ": every package needs a name and a source directory in the repository",
		},
		{
			name:  "absolute source",
			files: map[string]string{languagePath: language(`[{"name": "example.com/m", "source": "/m"}]`)},
			want:  ": every package needs a name and a source directory in the repository",
		},
		{
			name:  "source outside a module",
			files: map[string]string{languagePath: language(`[{"name": "example.com/m", "source": "m"}]`), "m/m.go": "package m\n"},
			want:  ": package example.com/m: m isn't in a Go module: no go.mod in it or above it in the repository",
		},
		{
			name:  "go.mod without a module directive",
			files: map[string]string{languagePath: language(`[{"name": "example.com/m", "source": "m"}]`), "m/go.mod": "go 1.26.0\n", "m/m.go": "package m\n"},
			want:  ": package example.com/m: m/go.mod has no module directive",
		},
		{
			name:  "name that isn't the source's import path",
			files: map[string]string{languagePath: language(`[{"name": "example.com/other", "source": "m"}]`), "m/go.mod": "module example.com/m\n", "m/m.go": "package m\n"},
			want:  ": package example.com/other's source m is package example.com/m",
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			file := languageIn(write(t, test.files))
			code, stdout, stderr := runExtractor(file)
			if want := "go extractor: " + file + test.want + "\n"; code != 1 || stdout != "" || stderr != want {
				t.Errorf("run = %d, %q, %q; want 1, no output and %q", code, stdout, stderr, want)
			}
		})
	}
}

func TestMissingLanguageFile(t *testing.T) {
	file := filepath.Join(t.TempDir(), "language.json")
	code, stdout, stderr := runExtractor(file)
	if code != 1 || stdout != "" || !strings.HasPrefix(stderr, "go extractor: open "+file+": ") {
		t.Errorf("run = %d, %q, %q; want 1, no output and the open error", code, stdout, stderr)
	}
}

func TestMissingSource(t *testing.T) {
	file := languageIn(write(t, map[string]string{
		languagePath: `{"id": "go", "packages": [{"name": "example.com/r/m", "source": "m"}]}`,
		"go.mod":     "module example.com/r\n",
	}))
	if code, _, stderr := runExtractor(file); code != 1 || stderr != "go extractor: m: no such directory\n" {
		t.Errorf("run = %d, %q; want 1 and the missing directory", code, stderr)
	}
}

func TestImportPath(t *testing.T) {
	tests := []struct {
		name   string
		files  map[string]string
		source string
		want   string
	}{
		{
			name:   "module root",
			files:  map[string]string{"m/go.mod": "module example.com/m\n"},
			source: "m",
			want:   "example.com/m",
		},
		{
			name:   "package below the module root",
			files:  map[string]string{"go.mod": "module example.com/r\n", "a/b/b.go": "package b\n"},
			source: "a/b",
			want:   "example.com/r/a/b",
		},
		{
			name:   "nearest go.mod",
			files:  map[string]string{"go.mod": "module example.com/r\n", "a/go.mod": "module example.com/a\n", "a/b/b.go": "package b\n"},
			source: "a/b",
			want:   "example.com/a/b",
		},
		{
			name:   "quoted module path with a comment",
			files:  map[string]string{"m/go.mod": "// The m module.\nmodule \"example.com/q\" // q\n"},
			source: "./m/",
			want:   "example.com/q",
		},
		{
			name:   "module at the repository root",
			files:  map[string]string{"go.mod": "module\texample.com/r\n"},
			source: ".",
			want:   "example.com/r",
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			got, err := importPathOf(write(t, test.files), test.source)
			if got != test.want || err != nil {
				t.Errorf("importPathOf(%q) = %q, %v; want %q", test.source, got, err, test.want)
			}
		})
	}
}

func TestModulePath(t *testing.T) {
	tests := []struct{ gomod, want string }{
		{"module example.com/m\n", "example.com/m"},
		{"module example.com/m // the module\n\ngo 1.26.0\n", "example.com/m"},
		{"  module\t\"example.com/m\"\r\n", "example.com/m"},
		{"// module example.com/comment\nmodule example.com/m\n", "example.com/m"},
		{"modules example.com/m\n", ""},
		{"go 1.26.0\n", ""},
		{"", ""},
	}
	for _, test := range tests {
		if got := modulePath([]byte(test.gomod)); got != test.want {
			t.Errorf("modulePath(%q) = %q; want %q", test.gomod, got, test.want)
		}
	}
}
