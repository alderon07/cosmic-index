package commands

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

const starDetailJSON = `{"data":{"id":"sun","type":"STAR","displayName":"Sun","planetCount":8,"keyFacts":[],"links":[],"summary":"s"},"meta":{"requestId":"r1","apiVersion":"1","timestamp":"t"}}`
const smallBodyDetailJSON = `{"data":{"id":"ceres","type":"SMALL_BODY","displayName":"1 Ceres","bodyKind":"asteroid","orbitClass":"MBA","isNeo":false,"isPha":false,"keyFacts":[],"links":[],"summary":"s"},"meta":{"requestId":"r1","apiVersion":"1","timestamp":"t"}}`
const exoplanetDetailJSON = `{"data":{"id":"kepler-22b","type":"EXOPLANET","displayName":"Kepler-22 b","hostStar":"Kepler-22","discoveryMethod":"Transit","keyFacts":[],"links":[],"summary":"s"},"meta":{"requestId":"r1","apiVersion":"1","timestamp":"t"}}`

func newGetTestServer(t *testing.T, gotPath *string) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if gotPath != nil {
			*gotPath = r.URL.Path
		}
		w.Header().Set("Content-Type", "application/json")
		switch {
		case strings.HasPrefix(r.URL.Path, "/api/v1/stars/"):
			_, _ = w.Write([]byte(starDetailJSON))
		case strings.HasPrefix(r.URL.Path, "/api/v1/small-bodies/"):
			_, _ = w.Write([]byte(smallBodyDetailJSON))
		case strings.HasPrefix(r.URL.Path, "/api/v1/exoplanets/"):
			_, _ = w.Write([]byte(exoplanetDetailJSON))
		default:
			w.WriteHeader(404)
			_, _ = w.Write([]byte(`{"error":{"code":"NOT_FOUND","message":"not found"},"meta":{"requestId":"r1","apiVersion":"1","timestamp":"t"}}`))
		}
	}))
}

func TestGetStarRoutes(t *testing.T) {
	t.Parallel()

	var gotPath string
	server := newGetTestServer(t, &gotPath)
	defer server.Close()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{
		"--base-url", server.URL,
		"get", "stars", "sun",
	})
	if code != 0 {
		t.Fatalf("expected exit 0, got %d stderr=%s", code, stderr.String())
	}
	if gotPath != "/api/v1/stars/sun" {
		t.Fatalf("expected path /api/v1/stars/sun, got %q", gotPath)
	}
}

func TestGetStarJSON(t *testing.T) {
	t.Parallel()

	server := newGetTestServer(t, nil)
	defer server.Close()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{
		"--base-url", server.URL,
		"--output", "json",
		"get", "stars", "sun",
	})
	if code != 0 {
		t.Fatalf("expected exit 0, got %d stderr=%s", code, stderr.String())
	}

	var payload map[string]any
	if err := json.Unmarshal(stdout.Bytes(), &payload); err != nil {
		t.Fatalf("expected valid JSON, got error: %v output=%q", err, stdout.String())
	}
}

func TestGetStarNormalizesID(t *testing.T) {
	t.Parallel()

	var gotPath string
	server := newGetTestServer(t, &gotPath)
	defer server.Close()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{
		"--base-url", server.URL,
		"--output", "json",
		"get", "stars", "Alpha Centauri",
	})
	if code != 0 {
		t.Fatalf("expected exit 0, got %d stderr=%s", code, stderr.String())
	}
	if gotPath != "/api/v1/stars/Alpha%20Centauri" {
		t.Fatalf("expected path /api/v1/stars/Alpha%%20Centauri, got %q", gotPath)
	}
}

func TestGetStarMissingArg(t *testing.T) {
	t.Parallel()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{
		"get", "stars",
	})
	if code != 1 {
		t.Fatalf("expected exit 1 for missing arg, got %d stderr=%s", code, stderr.String())
	}
}

func TestGetStarAlias(t *testing.T) {
	t.Parallel()

	var gotPath string
	server := newGetTestServer(t, &gotPath)
	defer server.Close()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{
		"--base-url", server.URL,
		"show", "stars", "sun",
	})
	if code != 0 {
		t.Fatalf("expected exit 0, got %d stderr=%s", code, stderr.String())
	}
	if gotPath != "/api/v1/stars/sun" {
		t.Fatalf("expected path /api/v1/stars/sun, got %q", gotPath)
	}
}

func TestGetSmallBodyRoutes(t *testing.T) {
	t.Parallel()

	var gotPath string
	server := newGetTestServer(t, &gotPath)
	defer server.Close()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{
		"--base-url", server.URL,
		"get", "small-bodies", "ceres",
	})
	if code != 0 {
		t.Fatalf("expected exit 0, got %d stderr=%s", code, stderr.String())
	}
	if gotPath != "/api/v1/small-bodies/ceres" {
		t.Fatalf("expected path /api/v1/small-bodies/ceres, got %q", gotPath)
	}
}

func TestGetSmallBodyJSON(t *testing.T) {
	t.Parallel()

	server := newGetTestServer(t, nil)
	defer server.Close()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{
		"--base-url", server.URL,
		"--output", "json",
		"get", "small-bodies", "ceres",
	})
	if code != 0 {
		t.Fatalf("expected exit 0, got %d stderr=%s", code, stderr.String())
	}

	var payload map[string]any
	if err := json.Unmarshal(stdout.Bytes(), &payload); err != nil {
		t.Fatalf("expected valid JSON, got error: %v output=%q", err, stdout.String())
	}
}

func TestGetSmallBodyNormalizesID(t *testing.T) {
	t.Parallel()

	var gotPath string
	server := newGetTestServer(t, &gotPath)
	defer server.Close()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{
		"--base-url", server.URL,
		"--output", "json",
		"get", "small-bodies", "1 Ceres",
	})
	if code != 0 {
		t.Fatalf("expected exit 0, got %d stderr=%s", code, stderr.String())
	}
	if gotPath != "/api/v1/small-bodies/1%20Ceres" {
		t.Fatalf("expected path /api/v1/small-bodies/1%%20Ceres, got %q", gotPath)
	}
}

func TestGetSmallBodyMissingArg(t *testing.T) {
	t.Parallel()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{
		"get", "small-bodies",
	})
	if code != 1 {
		t.Fatalf("expected exit 1 for missing arg, got %d stderr=%s", code, stderr.String())
	}
}

func TestGetSmallBodyAliasSb(t *testing.T) {
	t.Parallel()

	var gotPath string
	server := newGetTestServer(t, &gotPath)
	defer server.Close()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{
		"--base-url", server.URL,
		"get", "sb", "ceres",
	})
	if code != 0 {
		t.Fatalf("expected exit 0, got %d stderr=%s", code, stderr.String())
	}
	if !strings.HasPrefix(gotPath, "/api/v1/small-bodies/") {
		t.Fatalf("expected path to hit /api/v1/small-bodies/, got %q", gotPath)
	}
}

func TestGetExoplanetMissingArg(t *testing.T) {
	t.Parallel()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{
		"get", "exoplanets",
	})
	if code != 1 {
		t.Fatalf("expected exit 1 for missing arg, got %d stderr=%s", code, stderr.String())
	}
}

func TestGetExoplanetAlias(t *testing.T) {
	t.Parallel()

	var gotPath string
	server := newGetTestServer(t, &gotPath)
	defer server.Close()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{
		"--base-url", server.URL,
		"info", "exoplanets", "kepler-22b",
	})
	if code != 0 {
		t.Fatalf("expected exit 0, got %d stderr=%s", code, stderr.String())
	}
	if gotPath != "/api/v1/exoplanets/kepler-22b" {
		t.Fatalf("expected path /api/v1/exoplanets/kepler-22b, got %q", gotPath)
	}
}
