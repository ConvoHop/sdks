package examples_test

import (
	"bufio"
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"sync"
	"testing"

	convohop "github.com/ConvoHop/sdks/go"
)

// repoRoot is the SDK repository's root, relative to this directory.
var repoRoot = filepath.Join("..", "..", "..", "..")

// mockTarget is the conformance mock's descriptor: a local stand-in for the
// ConvoHop API.
type mockTarget struct {
	CommunicationURL string `json:"communicationUrl"`
	ProjectID        string `json:"projectId"`
	Incarnation      string `json:"incarnation"`
	Credentials      struct {
		Backend string `json:"backend"`
	} `json:"credentials"`
	Control string `json:"control"`
}

var mock struct {
	once    sync.Once
	process *exec.Cmd
	target  mockTarget
	err     error
}

func TestMain(m *testing.M) {
	code := m.Run()
	if mock.process != nil {
		_ = mock.process.Process.Kill()
		_ = mock.process.Wait()
	}
	os.Exit(code)
}

// startMock starts the conformance mock, a Node.js process, the first time a
// test needs it. TestMain stops it.
func startMock(t *testing.T) mockTarget {
	t.Helper()
	mock.once.Do(func() {
		node, err := exec.LookPath("node")
		if err != nil {
			mock.err = errors.New("the tests start the conformance mock with Node.js, which isn't on PATH")
			return
		}
		process := exec.Command(node, filepath.Join(repoRoot, "conformance", "mock", "cli.mjs"))
		process.Stderr = os.Stderr
		stdout, err := process.StdoutPipe()
		if err != nil {
			mock.err = err
			return
		}
		if err := process.Start(); err != nil {
			mock.err = err
			return
		}
		mock.process = process
		// The mock prints its descriptor as one JSON line.
		reader := bufio.NewReader(stdout)
		line, err := reader.ReadBytes('\n')
		if err != nil {
			// It imports graphql from the repository's node_modules.
			mock.err = fmt.Errorf("the conformance mock exited before it started; did you run npm ci at the repository root? %w", err)
			return
		}
		go func() { _, _ = io.Copy(io.Discard, reader) }()
		mock.err = json.Unmarshal(line, &mock.target)
	})
	if mock.err != nil {
		t.Fatal(mock.err)
	}
	return mock.target
}

// projectConfig is the mock's project, as your backend configures it.
func projectConfig(t *testing.T) convohop.ProjectConfig {
	t.Helper()
	target := startMock(t)
	return convohop.ProjectConfig{
		BaseURL:     target.CommunicationURL,
		ProjectID:   target.ProjectID,
		Incarnation: target.Incarnation,
		BackendKey:  target.Credentials.Backend,
	}
}

// injectFault makes the mock fail the next request to a GraphQL field: it
// closes the connection before or after committing.
func injectFault(t *testing.T, field, action string) {
	t.Helper()
	body, err := json.Marshal(map[string]string{"field": field, "action": action})
	if err != nil {
		t.Fatal(err)
	}
	response, err := http.Post(startMock(t).Control+"/fault", "application/json", bytes.NewReader(body))
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		t.Fatalf("injecting a fault: %s", response.Status)
	}
}

// attempts reports whether each request that the mock received for a field
// and request ID was dropped, oldest first.
func attempts(t *testing.T, field, requestID string) []bool {
	t.Helper()
	response, err := http.Get(startMock(t).Control + "/log")
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()
	var log struct {
		Entries []struct {
			Kind      string `json:"kind"`
			Field     string `json:"field"`
			RequestID string `json:"requestId"`
			Dropped   bool   `json:"dropped"`
		} `json:"entries"`
	}
	if err := json.NewDecoder(response.Body).Decode(&log); err != nil {
		t.Fatal(err)
	}
	dropped := []bool{}
	for _, entry := range log.Entries {
		if entry.Kind == "request" && entry.Field == field && entry.RequestID == requestID {
			dropped = append(dropped, entry.Dropped)
		}
	}
	return dropped
}
