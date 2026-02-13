package commands

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestSearchStarsQueryMapping(t *testing.T) {
	t.Parallel()

	var gotQuery map[string]string
	server := newAliasTestServer(t, "/api/v1/stars", &gotQuery)
	defer server.Close()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{
		"--base-url", server.URL,
		"search", "stars",
		"-q", "sun",
		"--spectral-class", "G",
		"--min-planets", "2",
		"--multi-planet",
		"--max-distance", "50",
		"--sort", "name",
		"--order", "desc",
		"--page", "3",
		"--limit", "12",
	})
	if code != 0 {
		t.Fatalf("expected exit 0, got %d stderr=%s", code, stderr.String())
	}

	expect := map[string]string{
		"query":         "sun",
		"spectralClass": "G",
		"minPlanets":    "2",
		"multiPlanet":   "true",
		"maxDistancePc": "50",
		"sort":          "name",
		"order":         "desc",
		"page":          "3",
		"limit":         "12",
	}
	for key, want := range expect {
		if got := gotQuery[key]; got != want {
			t.Errorf("query param %s = %q, want %q", key, got, want)
		}
	}
}

func TestSearchStarsInvalidPage(t *testing.T) {
	t.Parallel()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{
		"search", "stars", "--page", "0",
	})
	if code != 2 {
		t.Fatalf("expected exit 2, got %d stderr=%s", code, stderr.String())
	}
}

func TestSearchStarsInvalidLimitHigh(t *testing.T) {
	t.Parallel()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{
		"search", "stars", "--limit", "49",
	})
	if code != 2 {
		t.Fatalf("expected exit 2, got %d stderr=%s", code, stderr.String())
	}
}

func TestSearchStarsInvalidMinPlanets(t *testing.T) {
	t.Parallel()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{
		"search", "stars", "--min-planets", "0",
	})
	if code != 2 {
		t.Fatalf("expected exit 2, got %d stderr=%s", code, stderr.String())
	}
}

func TestSearchStarsInvalidMaxDistance(t *testing.T) {
	t.Parallel()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{
		"search", "stars", "--max-distance", "-5",
	})
	if code != 2 {
		t.Fatalf("expected exit 2, got %d stderr=%s", code, stderr.String())
	}
}

func TestSearchStarsInvalidSpectralClass(t *testing.T) {
	t.Parallel()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{
		"search", "stars", "--spectral-class", "X",
	})
	if code != 2 {
		t.Fatalf("expected exit 2, got %d stderr=%s", code, stderr.String())
	}
}

func TestSearchStarsInvalidSort(t *testing.T) {
	t.Parallel()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{
		"search", "stars", "--sort", "bogus",
	})
	if code != 2 {
		t.Fatalf("expected exit 2, got %d stderr=%s", code, stderr.String())
	}
}

func TestSearchStarsSortMapping(t *testing.T) {
	t.Parallel()

	var gotSort string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotSort = r.URL.Query().Get("sort")
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(paginatedEmpty))
	}))
	defer server.Close()

	for _, tc := range []struct{ flag, want string }{
		{"name", "name"},
		{"distance", "distance"},
		{"brightness", "vmag"},
		{"vmag", "vmag"},
		{"planets", "planetCount"},
		{"planets-desc", "planetCountDesc"},
	} {
		t.Run(tc.flag, func(t *testing.T) {
			gotSort = ""
			var stdout, stderr bytes.Buffer
			code := Execute(&stdout, &stderr, "test", []string{
				"--base-url", server.URL,
				"search", "stars", "--sort", tc.flag,
			})
			if code != 0 {
				t.Fatalf("expected exit 0, got %d stderr=%s", code, stderr.String())
			}
			if gotSort != tc.want {
				t.Fatalf("sort param = %q, want %q", gotSort, tc.want)
			}
		})
	}
}

func TestSearchStarsSpectralClassUppercased(t *testing.T) {
	t.Parallel()

	var gotQuery map[string]string
	server := newAliasTestServer(t, "/api/v1/stars", &gotQuery)
	defer server.Close()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{
		"--base-url", server.URL,
		"search", "stars", "--spectral-class", "g",
	})
	if code != 0 {
		t.Fatalf("expected exit 0, got %d stderr=%s", code, stderr.String())
	}
	if gotQuery["spectralClass"] != "G" {
		t.Fatalf("expected spectralClass=G, got %q", gotQuery["spectralClass"])
	}
}

func TestSearchStarsAliasStar(t *testing.T) {
	t.Parallel()

	server := newAliasTestServer(t, "/api/v1/stars", nil)
	defer server.Close()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{
		"--base-url", server.URL,
		"search", "star", "-q", "sun",
	})
	if code != 0 {
		t.Fatalf("expected exit 0, got %d stderr=%s", code, stderr.String())
	}
}

func TestSearchStarsJSON(t *testing.T) {
	t.Parallel()

	server := newAliasTestServer(t, "", nil)
	defer server.Close()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{
		"--base-url", server.URL,
		"--output", "json",
		"search", "stars",
	})
	if code != 0 {
		t.Fatalf("expected exit 0, got %d stderr=%s", code, stderr.String())
	}

	var payload map[string]any
	if err := json.Unmarshal(stdout.Bytes(), &payload); err != nil {
		t.Fatalf("expected valid JSON, got error: %v output=%q", err, stdout.String())
	}
}
