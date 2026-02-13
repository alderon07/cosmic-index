package commands

import (
	"bytes"
	"encoding/json"
	"testing"
)

func TestSearchSmallBodiesQueryMapping(t *testing.T) {
	t.Parallel()

	var gotQuery map[string]string
	server := newAliasTestServer(t, "/api/v1/small-bodies", &gotQuery)
	defer server.Close()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{
		"--base-url", server.URL,
		"search", "small-bodies",
		"-q", "ceres",
		"--kind", "asteroid",
		"--neo",
		"--pha",
		"--orbit-class", "MBA",
		"--page", "2",
		"--limit", "10",
	})
	if code != 0 {
		t.Fatalf("expected exit 0, got %d stderr=%s", code, stderr.String())
	}

	expect := map[string]string{
		"query":      "ceres",
		"kind":       "asteroid",
		"neo":        "true",
		"pha":        "true",
		"orbitClass": "MBA",
		"page":       "2",
		"limit":      "10",
	}
	for key, want := range expect {
		if got := gotQuery[key]; got != want {
			t.Errorf("query param %s = %q, want %q", key, got, want)
		}
	}
}

func TestSearchSmallBodiesInvalidPage(t *testing.T) {
	t.Parallel()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{
		"search", "small-bodies", "--page", "0",
	})
	if code != 2 {
		t.Fatalf("expected exit 2, got %d stderr=%s", code, stderr.String())
	}
}

func TestSearchSmallBodiesInvalidLimitHigh(t *testing.T) {
	t.Parallel()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{
		"search", "small-bodies", "--limit", "49",
	})
	if code != 2 {
		t.Fatalf("expected exit 2, got %d stderr=%s", code, stderr.String())
	}
}

func TestSearchSmallBodiesInvalidKind(t *testing.T) {
	t.Parallel()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{
		"search", "small-bodies", "--kind", "meteor",
	})
	if code != 2 {
		t.Fatalf("expected exit 2, got %d stderr=%s", code, stderr.String())
	}
}

func TestSearchSmallBodiesKindLowercased(t *testing.T) {
	t.Parallel()

	var gotQuery map[string]string
	server := newAliasTestServer(t, "/api/v1/small-bodies", &gotQuery)
	defer server.Close()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{
		"--base-url", server.URL,
		"search", "small-bodies", "--kind", "Asteroid",
	})
	if code != 0 {
		t.Fatalf("expected exit 0, got %d stderr=%s", code, stderr.String())
	}
	if gotQuery["kind"] != "asteroid" {
		t.Fatalf("expected kind=asteroid, got %q", gotQuery["kind"])
	}
}

func TestSearchSmallBodiesAliasSb(t *testing.T) {
	t.Parallel()

	server := newAliasTestServer(t, "/api/v1/small-bodies", nil)
	defer server.Close()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{
		"--base-url", server.URL,
		"search", "sb", "-q", "ceres",
	})
	if code != 0 {
		t.Fatalf("expected exit 0, got %d stderr=%s", code, stderr.String())
	}
}

func TestSearchSmallBodiesJSON(t *testing.T) {
	t.Parallel()

	server := newAliasTestServer(t, "", nil)
	defer server.Close()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{
		"--base-url", server.URL,
		"--output", "json",
		"search", "small-bodies",
	})
	if code != 0 {
		t.Fatalf("expected exit 0, got %d stderr=%s", code, stderr.String())
	}

	var payload map[string]any
	if err := json.Unmarshal(stdout.Bytes(), &payload); err != nil {
		t.Fatalf("expected valid JSON, got error: %v output=%q", err, stdout.String())
	}
}
