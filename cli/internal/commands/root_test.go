package commands

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestVersionCommand(t *testing.T) {
	t.Parallel()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "v1.2.3", []string{"version"})
	if code != 0 {
		t.Fatalf("expected exit 0, got %d stderr=%s", code, stderr.String())
	}
	if got := strings.TrimSpace(stdout.String()); got != "v1.2.3" {
		t.Fatalf("expected version output %q, got %q", "v1.2.3", got)
	}
}

func TestJsonFlagAlias(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"data":[],"pagination":{"mode":"offset","page":1,"limit":24,"hasMore":false},"meta":{"requestId":"r1","apiVersion":"1","timestamp":"t"}}`))
	}))
	defer server.Close()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{
		"--base-url", server.URL,
		"--json",
		"search", "exoplanets",
	})
	if code != 0 {
		t.Fatalf("expected exit 0, got %d stderr=%s", code, stderr.String())
	}

	var payload map[string]any
	if err := json.Unmarshal(stdout.Bytes(), &payload); err != nil {
		t.Fatalf("expected valid JSON output with --json flag, got error: %v output=%q", err, stdout.String())
	}
}

func TestUnknownCommand(t *testing.T) {
	t.Parallel()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{"bogus"})
	if code != 1 {
		t.Fatalf("expected exit 1 for unknown command, got %d", code)
	}
}

func TestGlobalHelpExitsZero(t *testing.T) {
	t.Parallel()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{"--help"})
	if code != 0 {
		t.Fatalf("expected exit 0 for --help, got %d stderr=%s", code, stderr.String())
	}
}
