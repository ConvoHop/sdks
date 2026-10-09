// Package spectest reads the SDK repository's shared specification files in
// tests.
package spectest

import (
	"errors"
	"io/fs"
	"os"
	"path/filepath"
	"testing"
)

// Read returns the file at name, relative to the spec directory next to the
// module's directory. It skips the test when the module was copied without
// the repository, unless CONVOHOP_REQUIRE_SPEC is 1, as in CI.
func Read(t testing.TB, name string) []byte {
	t.Helper()
	directory, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	for {
		if _, err := os.Stat(filepath.Join(directory, "go.mod")); err == nil {
			break
		}
		parent := filepath.Dir(directory)
		if parent == directory {
			t.Fatal("no go.mod above the test's directory")
		}
		directory = parent
	}
	path := filepath.Join(filepath.Dir(directory), "spec", filepath.FromSlash(name))
	data, err := os.ReadFile(path)
	if errors.Is(err, fs.ErrNotExist) && os.Getenv("CONVOHOP_REQUIRE_SPEC") != "1" {
		t.Skipf("%s is missing; set CONVOHOP_REQUIRE_SPEC=1 to require it", path)
	}
	if err != nil {
		t.Fatal(err)
	}
	return data
}
