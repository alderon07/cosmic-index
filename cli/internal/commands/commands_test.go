package commands

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestSearchExoplanetsJSON(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/v1/exoplanets" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"data":[{"id":"kepler-22b","type":"EXOPLANET","displayName":"Kepler-22 b","hostStar":"Kepler-22","discoveryMethod":"Transit","keyFacts":[],"links":[],"summary":"s"}],"pagination":{"mode":"offset","page":1,"limit":24,"hasMore":false},"meta":{"requestId":"r1","apiVersion":"1","timestamp":"t"}}`))
	}))
	defer server.Close()

	var stdout bytes.Buffer
	var stderr bytes.Buffer
	exitCode := Execute(&stdout, &stderr, "test", []string{
		"--base-url", server.URL,
		"--output", "json",
		"search", "exoplanets",
		"-q", "kepler",
	})
	if exitCode != 0 {
		t.Fatalf("unexpected exit code: %d stderr=%s", exitCode, stderr.String())
	}

	var payload map[string]any
	if err := json.Unmarshal(stdout.Bytes(), &payload); err != nil {
		t.Fatalf("expected json output, got error: %v", err)
	}
}

func TestGetExoplanetNormalizesID(t *testing.T) {
	t.Parallel()

	requestPath := ""
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestPath = r.URL.Path
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"data":{"id":"PSR%20B1257%2B12%20b","type":"EXOPLANET","displayName":"PSR B1257+12 b","hostStar":"PSR B1257+12","discoveryMethod":"Pulsar Timing","keyFacts":[],"links":[],"summary":"s"},"meta":{"requestId":"r1","apiVersion":"1","timestamp":"t"}}`))
	}))
	defer server.Close()

	var stdout bytes.Buffer
	var stderr bytes.Buffer
	exitCode := Execute(&stdout, &stderr, "test", []string{
		"--base-url", server.URL,
		"--output", "json",
		"get", "exoplanets", "PSR B1257+12 b",
	})
	if exitCode != 0 {
		t.Fatalf("unexpected exit code: %d stderr=%s", exitCode, stderr.String())
	}

	wantPath := "/api/v1/exoplanets/PSR%20B1257%2B12%20b"
	if requestPath != wantPath {
		t.Fatalf("unexpected request path: got %q want %q", requestPath, wantPath)
	}
}

func TestInvalidOutputReturnsUsageExitCode(t *testing.T) {
	t.Parallel()

	var stdout bytes.Buffer
	var stderr bytes.Buffer
	exitCode := Execute(&stdout, &stderr, "test", []string{
		"--output", "yaml",
		"search", "exoplanets",
	})
	if exitCode != 2 {
		t.Fatalf("unexpected exit code: got %d want 2 (stderr=%s)", exitCode, stderr.String())
	}
}
