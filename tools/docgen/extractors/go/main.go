// Command go prints the public surface of the Go packages that a docs
// language file lists, in the shape spec/docs/surface.schema.json describes.
// docgen runs it as the go language's extract command:
//
//	go run -C tools/docgen/extractors/go . ../../../../docs/languages/go/language.json
//
// It reads each package's source with go/parser and go/doc, so it needs
// neither a build of the package nor any dependency. A package's source
// directory is relative to the repository root, three directories above the
// language file. The extractor fails, naming the file and line, on anything
// it can't document faithfully. See docs/docs-pipeline.md.
package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"os"
	"path"
	"path/filepath"
	"slices"
	"strconv"
	"strings"
)

type surface struct {
	Language string           `json:"language"`
	Packages []packageSurface `json:"packages"`
}

type packageSurface struct {
	Name    string   `json:"name"`
	Symbols []symbol `json:"symbols"`
}

type symbol struct {
	Name       string   `json:"name"`
	Kind       string   `json:"kind"`
	Signatures []string `json:"signatures"`
	Docs       string   `json:"docs"`
	Deprecated *string  `json:"deprecated,omitempty"`
	Members    []member `json:"members,omitempty"`
}

type member struct {
	Name       string   `json:"name"`
	Kind       string   `json:"kind"`
	Signatures []string `json:"signatures"`
	Docs       string   `json:"docs"`
	Deprecated *string  `json:"deprecated,omitempty"`
	Inherited  string   `json:"inherited,omitempty"`
}

// languageFile is the part of docs/languages/<id>/language.json that the
// extractor reads.
type languageFile struct {
	ID       string `json:"id"`
	Packages []struct {
		Name   string `json:"name"`
		Source string `json:"source"`
	} `json:"packages"`
}

func main() {
	os.Exit(run(os.Args[1:], os.Stdout, os.Stderr))
}

func run(args []string, stdout, stderr io.Writer) int {
	if len(args) != 1 {
		fmt.Fprintln(stderr, "usage: go run . <language.json>")
		return 2
	}
	out, err := extractLanguage(args[0])
	if err != nil {
		fmt.Fprintf(stderr, "go extractor: %v\n", err)
		return 1
	}
	encoder := json.NewEncoder(stdout)
	encoder.SetEscapeHTML(false)
	if err := encoder.Encode(out); err != nil {
		fmt.Fprintf(stderr, "go extractor: %v\n", err)
		return 1
	}
	return 0
}

// extractLanguage extracts the packages of the language file at file, which
// must be docs/languages/go/language.json in the repository.
func extractLanguage(file string) (*surface, error) {
	data, err := os.ReadFile(file)
	if err != nil {
		return nil, err
	}
	var language languageFile
	if err := json.Unmarshal(data, &language); err != nil {
		return nil, fmt.Errorf("%s: %v", file, err)
	}
	if language.ID != "go" {
		return nil, fmt.Errorf("%s: isn't the Go language config", file)
	}
	if len(language.Packages) == 0 {
		return nil, fmt.Errorf("%s: lists no packages", file)
	}
	root := filepath.Join(filepath.Dir(file), "..", "..", "..")
	out := &surface{Language: language.ID, Packages: make([]packageSurface, 0, len(language.Packages))}
	for _, item := range language.Packages {
		if item.Name == "" || !filepath.IsLocal(filepath.FromSlash(item.Source)) {
			return nil, fmt.Errorf("%s: every package needs a name and a source directory in the repository", file)
		}
		importPath, err := importPathOf(root, item.Source)
		if err != nil {
			return nil, fmt.Errorf("%s: package %s: %v", file, item.Name, err)
		}
		if importPath != item.Name {
			return nil, fmt.Errorf("%s: package %s's source %s is package %s", file, item.Name, item.Source, importPath)
		}
		symbols, err := extractPackage(root, item.Source, item.Name)
		if err != nil {
			return nil, err
		}
		out.Packages = append(out.Packages, packageSurface{Name: item.Name, Symbols: symbols})
	}
	return out, nil
}

// importPathOf returns the import path of the package in the directory
// source, relative to root, from the nearest go.mod at or above it in root.
func importPathOf(root, source string) (string, error) {
	var parts []string
	dir := path.Clean(source)
	for {
		data, err := os.ReadFile(filepath.Join(root, filepath.FromSlash(dir), "go.mod"))
		if err == nil {
			module := modulePath(data)
			if module == "" {
				return "", fmt.Errorf("%s has no module directive", path.Join(dir, "go.mod"))
			}
			slices.Reverse(parts)
			return path.Join(append([]string{module}, parts...)...), nil
		}
		if !errors.Is(err, fs.ErrNotExist) {
			return "", err
		}
		if dir == "." {
			return "", fmt.Errorf("%s isn't in a Go module: no go.mod in it or above it in the repository", source)
		}
		parts = append(parts, path.Base(dir))
		dir = path.Dir(dir)
	}
}

// modulePath returns the path of a go.mod file's module directive.
func modulePath(gomod []byte) string {
	for _, line := range strings.Split(string(gomod), "\n") {
		rest, ok := strings.CutPrefix(strings.TrimSpace(line), "module")
		if !ok || rest == "" || !strings.ContainsRune(" \t\"", rune(rest[0])) {
			continue
		}
		rest, _, _ = strings.Cut(rest, "//")
		rest = strings.TrimSpace(rest)
		if unquoted, err := strconv.Unquote(rest); err == nil {
			return unquoted
		}
		return rest
	}
	return ""
}
