package commands

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func newAliasTestServer(t *testing.T, wantPath string, gotQuery *map[string]string) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if wantPath != "" && r.URL.Path != wantPath {
			t.Fatalf("unexpected path: got %q want %q", r.URL.Path, wantPath)
		}
		if gotQuery != nil {
			q := map[string]string{}
			for key, values := range r.URL.Query() {
				if len(values) > 0 {
					q[key] = values[0]
				}
			}
			*gotQuery = q
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"data":[],"pagination":{"mode":"none","hasMore":false},"meta":{"requestId":"r1","apiVersion":"1","timestamp":"t","count":0}}`))
	}))
}

func TestSearchCloseApproachesAliasRoutes(t *testing.T) {
	t.Parallel()

	var gotQuery map[string]string
	server := newAliasTestServer(t, "/api/v1/close-approaches", &gotQuery)
	defer server.Close()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{
		"--base-url", server.URL,
		"search", "close-approaches",
		"--date-min", "now",
		"--limit", "5",
	})
	if code != 0 {
		t.Fatalf("expected exit 0, got %d stderr=%s", code, stderr.String())
	}
	if gotQuery["dateMin"] != "now" {
		t.Fatalf("expected dateMin=now, got %v", gotQuery)
	}
	if gotQuery["limit"] != "5" {
		t.Fatalf("expected limit=5, got %v", gotQuery)
	}
}

func TestSearchFireballsAliasRoutes(t *testing.T) {
	t.Parallel()

	var gotQuery map[string]string
	server := newAliasTestServer(t, "/api/v1/fireballs", &gotQuery)
	defer server.Close()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{
		"--base-url", server.URL,
		"search", "fireballs",
		"--date-min", "2025-01-01",
		"--limit", "10",
	})
	if code != 0 {
		t.Fatalf("expected exit 0, got %d stderr=%s", code, stderr.String())
	}
	if gotQuery["dateMin"] != "2025-01-01" {
		t.Fatalf("expected dateMin=2025-01-01, got %v", gotQuery)
	}
	if gotQuery["limit"] != "10" {
		t.Fatalf("expected limit=10, got %v", gotQuery)
	}
}

func TestSearchCloseApproachesAliasIsHidden(t *testing.T) {
	t.Parallel()

	root := NewRootCommand(&bytes.Buffer{}, &bytes.Buffer{}, "test")
	searchCmd, _, err := root.Find([]string{"search"})
	if err != nil {
		t.Fatalf("could not find search command: %v", err)
	}

	var found *bool
	for _, sub := range searchCmd.Commands() {
		if sub.Name() == "close-approaches" {
			hidden := sub.Hidden
			found = &hidden
			break
		}
	}
	if found == nil {
		t.Fatal("close-approaches subcommand not found under search")
	}
	if !*found {
		t.Fatal("expected close-approaches alias to be hidden")
	}
}

func TestSearchFireballsAliasIsHidden(t *testing.T) {
	t.Parallel()

	root := NewRootCommand(&bytes.Buffer{}, &bytes.Buffer{}, "test")
	searchCmd, _, err := root.Find([]string{"search"})
	if err != nil {
		t.Fatalf("could not find search command: %v", err)
	}

	var found *bool
	for _, sub := range searchCmd.Commands() {
		if sub.Name() == "fireballs" {
			hidden := sub.Hidden
			found = &hidden
			break
		}
	}
	if found == nil {
		t.Fatal("fireballs subcommand not found under search")
	}
	if !*found {
		t.Fatal("expected fireballs alias to be hidden")
	}
}

func TestSearchCloseApproachesAliasValidation(t *testing.T) {
	t.Parallel()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{
		"search", "close-approaches", "--order", "desc",
	})
	if code != 2 {
		t.Fatalf("expected exit 2, got %d stderr=%s", code, stderr.String())
	}
}

func TestSearchFireballsAliasValidation(t *testing.T) {
	t.Parallel()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{
		"search", "fireballs", "--order", "asc",
	})
	if code != 2 {
		t.Fatalf("expected exit 2, got %d stderr=%s", code, stderr.String())
	}
}

func TestSearchCloseApproachesAliasJSON(t *testing.T) {
	t.Parallel()

	server := newAliasTestServer(t, "", nil)
	defer server.Close()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{
		"--base-url", server.URL,
		"--output", "json",
		"search", "close-approaches",
	})
	if code != 0 {
		t.Fatalf("expected exit 0, got %d stderr=%s", code, stderr.String())
	}

	var payload map[string]any
	if err := json.Unmarshal(stdout.Bytes(), &payload); err != nil {
		t.Fatalf("expected valid JSON, got error: %v output=%q", err, stdout.String())
	}
}

func TestSearchFireballsAliasJSON(t *testing.T) {
	t.Parallel()

	server := newAliasTestServer(t, "", nil)
	defer server.Close()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{
		"--base-url", server.URL,
		"--output", "json",
		"search", "fireballs",
	})
	if code != 0 {
		t.Fatalf("expected exit 0, got %d stderr=%s", code, stderr.String())
	}

	var payload map[string]any
	if err := json.Unmarshal(stdout.Bytes(), &payload); err != nil {
		t.Fatalf("expected valid JSON, got error: %v output=%q", err, stdout.String())
	}
}

func TestFindAliasCloseApproachesRoutes(t *testing.T) {
	t.Parallel()

	var gotQuery map[string]string
	server := newAliasTestServer(t, "/api/v1/close-approaches", &gotQuery)
	defer server.Close()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{
		"--base-url", server.URL,
		"find", "close-approaches",
		"--date-min", "now",
	})
	if code != 0 {
		t.Fatalf("expected exit 0, got %d stderr=%s", code, stderr.String())
	}
	if gotQuery["dateMin"] != "now" {
		t.Fatalf("expected dateMin=now, got %v", gotQuery)
	}
}
