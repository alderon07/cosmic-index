package commands

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"
)

const paginatedEmpty = `{"data":[],"pagination":{"mode":"offset","page":1,"limit":24,"hasMore":false},"meta":{"requestId":"r1","apiVersion":"1","timestamp":"t"}}`

func TestSearchExoplanetsQueryMapping(t *testing.T) {
	t.Parallel()

	var gotQuery map[string]string
	server := newAliasTestServer(t, "/api/v1/exoplanets", &gotQuery)
	defer server.Close()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{
		"--base-url", server.URL,
		"search", "exoplanets",
		"-q", "kepler",
		"--method", "Transit",
		"--year", "2020",
		"--has-radius",
		"--has-mass",
		"--size", "jupiter",
		"--habitable",
		"--facility", "Kepler",
		"--multi-planet",
		"--max-distance", "100",
		"--sort", "name",
		"--order", "asc",
		"--page", "2",
		"--limit", "10",
	})
	if code != 0 {
		t.Fatalf("expected exit 0, got %d stderr=%s", code, stderr.String())
	}

	expect := map[string]string{
		"query":          "kepler",
		"discoveryMethod": "Transit",
		"year":           "2020",
		"hasRadius":      "true",
		"hasMass":        "true",
		"sizeCategory":   "jupiter",
		"habitable":      "true",
		"facility":       "Kepler",
		"multiPlanet":    "true",
		"maxDistancePc":  "100",
		"sort":           "name",
		"order":          "asc",
		"page":           "2",
		"limit":          "10",
	}
	for key, want := range expect {
		if got := gotQuery[key]; got != want {
			t.Errorf("query param %s = %q, want %q", key, got, want)
		}
	}
}

func TestSearchExoplanetsInvalidPage(t *testing.T) {
	t.Parallel()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{
		"search", "exoplanets", "--page", "0",
	})
	if code != 2 {
		t.Fatalf("expected exit 2, got %d stderr=%s", code, stderr.String())
	}
}

func TestSearchExoplanetsInvalidLimitLow(t *testing.T) {
	t.Parallel()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{
		"search", "exoplanets", "--limit", "0",
	})
	if code != 2 {
		t.Fatalf("expected exit 2, got %d stderr=%s", code, stderr.String())
	}
}

func TestSearchExoplanetsInvalidLimitHigh(t *testing.T) {
	t.Parallel()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{
		"search", "exoplanets", "--limit", "49",
	})
	if code != 2 {
		t.Fatalf("expected exit 2, got %d stderr=%s", code, stderr.String())
	}
}

func TestSearchExoplanetsInvalidYear(t *testing.T) {
	t.Parallel()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{
		"search", "exoplanets", "--year", "1800",
	})
	if code != 2 {
		t.Fatalf("expected exit 2, got %d stderr=%s", code, stderr.String())
	}
}

func TestSearchExoplanetsInvalidSize(t *testing.T) {
	t.Parallel()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{
		"search", "exoplanets", "--size", "pluto",
	})
	if code != 2 {
		t.Fatalf("expected exit 2, got %d stderr=%s", code, stderr.String())
	}
}

func TestSearchExoplanetsInvalidSort(t *testing.T) {
	t.Parallel()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{
		"search", "exoplanets", "--sort", "bogus",
	})
	if code != 2 {
		t.Fatalf("expected exit 2, got %d stderr=%s", code, stderr.String())
	}
}

func TestSearchExoplanetsInvalidOrder(t *testing.T) {
	t.Parallel()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{
		"search", "exoplanets", "--order", "sideways",
	})
	if code != 2 {
		t.Fatalf("expected exit 2, got %d stderr=%s", code, stderr.String())
	}
}

func TestSearchExoplanetsInvalidMaxDistance(t *testing.T) {
	t.Parallel()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{
		"search", "exoplanets", "--max-distance", "-1",
	})
	if code != 2 {
		t.Fatalf("expected exit 2, got %d stderr=%s", code, stderr.String())
	}
}

func TestSearchExoplanetsSortMapping(t *testing.T) {
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
		{"year", "discovered"},
		{"discovered", "discovered"},
		{"distance", "distance"},
		{"radius", "radius"},
		{"mass", "mass"},
	} {
		t.Run(tc.flag, func(t *testing.T) {
			gotSort = ""
			var stdout, stderr bytes.Buffer
			code := Execute(&stdout, &stderr, "test", []string{
				"--base-url", server.URL,
				"search", "exoplanets", "--sort", tc.flag,
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

func TestSearchExoplanetsAliasExo(t *testing.T) {
	t.Parallel()

	server := newAliasTestServer(t, "/api/v1/exoplanets", nil)
	defer server.Close()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{
		"--base-url", server.URL,
		"search", "exo", "-q", "test",
	})
	if code != 0 {
		t.Fatalf("expected exit 0, got %d stderr=%s", code, stderr.String())
	}
}

func TestSearchExoplanetsDefaultPagination(t *testing.T) {
	t.Parallel()

	var gotQuery map[string]string
	server := newAliasTestServer(t, "/api/v1/exoplanets", &gotQuery)
	defer server.Close()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{
		"--base-url", server.URL,
		"search", "exoplanets",
	})
	if code != 0 {
		t.Fatalf("expected exit 0, got %d stderr=%s", code, stderr.String())
	}
	if gotQuery["page"] != "1" {
		t.Fatalf("expected default page=1, got %q", gotQuery["page"])
	}
	if gotQuery["limit"] != "24" {
		t.Fatalf("expected default limit=24, got %q", gotQuery["limit"])
	}
}

func TestSearchExoplanetsHiddenAliasFlags(t *testing.T) {
	t.Parallel()

	var gotQuery map[string]string
	server := newAliasTestServer(t, "/api/v1/exoplanets", &gotQuery)
	defer server.Close()

	// --discovery-method alias for --method
	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{
		"--base-url", server.URL,
		"search", "exoplanets", "--discovery-method", "Transit",
	})
	if code != 0 {
		t.Fatalf("--discovery-method: expected exit 0, got %d stderr=%s", code, stderr.String())
	}
	if gotQuery["discoveryMethod"] != "Transit" {
		t.Fatalf("--discovery-method: expected discoveryMethod=Transit, got %q", gotQuery["discoveryMethod"])
	}

	// --size-category alias for --size (bypasses validation per known behavior)
	stdout.Reset()
	stderr.Reset()
	code = Execute(&stdout, &stderr, "test", []string{
		"--base-url", server.URL,
		"search", "exoplanets", "--size-category", "jupiter",
	})
	if code != 0 {
		t.Fatalf("--size-category: expected exit 0, got %d stderr=%s", code, stderr.String())
	}
	if gotQuery["sizeCategory"] != "jupiter" {
		t.Fatalf("--size-category: expected sizeCategory=jupiter, got %q", gotQuery["sizeCategory"])
	}

	// --max-distance-pc alias for --max-distance (bypasses validation per known behavior)
	stdout.Reset()
	stderr.Reset()
	code = Execute(&stdout, &stderr, "test", []string{
		"--base-url", server.URL,
		"search", "exoplanets", "--max-distance-pc", "50",
	})
	if code != 0 {
		t.Fatalf("--max-distance-pc: expected exit 0, got %d stderr=%s", code, stderr.String())
	}
	if gotQuery["maxDistancePc"] != "50" {
		t.Fatalf("--max-distance-pc: expected maxDistancePc=50, got %q", gotQuery["maxDistancePc"])
	}
}
