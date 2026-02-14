package commands

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

type compareResponse struct {
	status int
	body   string
	delay  time.Duration
}

func newCompareServer(t *testing.T, responses map[string]compareResponse, gotPaths *[]string) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if gotPaths != nil {
			*gotPaths = append(*gotPaths, r.URL.Path)
		}
		if !strings.HasPrefix(r.URL.Path, "/api/v1/exoplanets/") {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}

		id := strings.TrimPrefix(r.URL.Path, "/api/v1/exoplanets/")
		resp, ok := responses[id]
		if !ok {
			w.WriteHeader(http.StatusNotFound)
			_, _ = w.Write([]byte(`{"error":{"code":"NOT_FOUND","message":"not found"},"meta":{"requestId":"r1","apiVersion":"1","timestamp":"t"}}`))
			return
		}
		if resp.delay > 0 {
			time.Sleep(resp.delay)
		}
		if resp.status == 0 {
			resp.status = http.StatusOK
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(resp.status)
		_, _ = w.Write([]byte(resp.body))
	}))
}

func exoplanetEnvelope(id, name, host string) string {
	return `{"data":{"id":"` + id + `","type":"EXOPLANET","displayName":"` + name + `","hostStar":"` + host + `","discoveryMethod":"Transit","orbitalPeriodDays":42.5,"radiusEarth":1.5,"massEarth":3.2,"distanceParsecs":120.4,"equilibriumTempK":311,"discoveredYear":2011,"starsInSystem":1,"planetsInSystem":3,"keyFacts":[],"links":[],"summary":"s"},"meta":{"requestId":"r1","apiVersion":"1","timestamp":"t"}}`
}

func apiErrorEnvelope(code, message string) string {
	return `{"error":{"code":"` + code + `","message":"` + message + `"},"meta":{"requestId":"r1","apiVersion":"1","timestamp":"t"}}`
}

func TestCompareExoplanetsArgsRange(t *testing.T) {
	t.Parallel()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{
		"compare", "exoplanets", "kepler-22b",
	})
	if code != 1 {
		t.Fatalf("expected exit 1, got %d stderr=%s", code, stderr.String())
	}

	stdout.Reset()
	stderr.Reset()
	code = Execute(&stdout, &stderr, "test", []string{
		"compare", "exoplanets", "a", "b", "c", "d",
	})
	if code != 1 {
		t.Fatalf("expected exit 1, got %d stderr=%s", code, stderr.String())
	}
}

func TestCompareExoplanetsNormalizesIDs(t *testing.T) {
	t.Parallel()

	var paths []string
	server := newCompareServer(t, map[string]compareResponse{
		"PSR%20B1257%2B12%20b": {body: exoplanetEnvelope("PSR%20B1257%2B12%20b", "PSR B1257+12 b", "PSR B1257+12")},
		"Kepler-22%20b":        {body: exoplanetEnvelope("Kepler-22%20b", "Kepler-22 b", "Kepler-22")},
	}, &paths)
	defer server.Close()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{
		"--base-url", server.URL,
		"compare", "exoplanets", "PSR B1257+12 b", "Kepler-22 b",
	})
	if code != 0 {
		t.Fatalf("expected exit 0, got %d stderr=%s", code, stderr.String())
	}

	got := strings.Join(paths, ",")
	if !strings.Contains(got, "/api/v1/exoplanets/PSR%20B1257%2B12%20b") {
		t.Fatalf("expected normalized PSR id in paths, got %q", got)
	}
	if !strings.Contains(got, "/api/v1/exoplanets/Kepler-22%20b") {
		t.Fatalf("expected normalized Kepler id in paths, got %q", got)
	}
}

func TestCompareExoplanetsTableOutputOrder(t *testing.T) {
	t.Parallel()

	server := newCompareServer(t, map[string]compareResponse{
		"a": {body: exoplanetEnvelope("a", "Alpha One", "Host A"), delay: 30 * time.Millisecond},
		"b": {body: exoplanetEnvelope("b", "Beta Two", "Host B")},
		"c": {body: exoplanetEnvelope("c", "Gamma Three", "Host C"), delay: 10 * time.Millisecond},
	}, nil)
	defer server.Close()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{
		"--base-url", server.URL,
		"compare", "exoplanets", "a", "b", "c",
	})
	if code != 0 {
		t.Fatalf("expected exit 0, got %d stderr=%s", code, stderr.String())
	}

	out := stdout.String()
	headerIdxA := strings.Index(out, "Alpha One")
	headerIdxB := strings.Index(out, "Beta Two")
	headerIdxC := strings.Index(out, "Gamma Three")
	if headerIdxA < 0 || headerIdxB < 0 || headerIdxC < 0 {
		t.Fatalf("expected names in output, got %q", out)
	}
	if !(headerIdxA < headerIdxB && headerIdxB < headerIdxC) {
		t.Fatalf("expected header order Alpha->Beta->Gamma, got %q", out)
	}
}

func TestCompareExoplanetsJSONShape(t *testing.T) {
	t.Parallel()

	server := newCompareServer(t, map[string]compareResponse{
		"a": {body: exoplanetEnvelope("a", "Alpha One", "Host A")},
		"b": {body: exoplanetEnvelope("b", "Beta Two", "Host B")},
	}, nil)
	defer server.Close()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{
		"--base-url", server.URL,
		"--output", "json",
		"compare", "exoplanets", "a", "b",
	})
	if code != 0 {
		t.Fatalf("expected exit 0, got %d stderr=%s", code, stderr.String())
	}

	var payload map[string]any
	if err := json.Unmarshal(stdout.Bytes(), &payload); err != nil {
		t.Fatalf("invalid json output: %v output=%q", err, stdout.String())
	}
	if got, _ := payload["domain"].(string); got != "exoplanets" {
		t.Fatalf("expected domain=exoplanets, got %q", got)
	}
	items, ok := payload["items"].([]any)
	if !ok || len(items) != 2 {
		t.Fatalf("expected 2 items, got %#v", payload["items"])
	}
	rows, ok := payload["rows"].([]any)
	if !ok || len(rows) == 0 {
		t.Fatalf("expected non-empty rows, got %#v", payload["rows"])
	}
}

func TestCompareExoplanetsFailFastFirstErrorByInputIndex(t *testing.T) {
	t.Parallel()

	server := newCompareServer(t, map[string]compareResponse{
		"a": {status: http.StatusNotFound, body: apiErrorEnvelope("NOT_FOUND", "a missing"), delay: 40 * time.Millisecond},
		"b": {status: http.StatusNotFound, body: apiErrorEnvelope("NOT_FOUND", "b missing"), delay: 5 * time.Millisecond},
	}, nil)
	defer server.Close()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{
		"--base-url", server.URL,
		"compare", "exoplanets", "a", "b",
	})
	if code != 1 {
		t.Fatalf("expected exit 1, got %d stderr=%s", code, stderr.String())
	}
	if !strings.Contains(stderr.String(), "a missing") {
		t.Fatalf("expected first input index error, got %q", stderr.String())
	}
}

func TestCompareExoplanetsParallelDeterministicBehavior(t *testing.T) {
	t.Parallel()

	server := newCompareServer(t, map[string]compareResponse{
		"a": {body: exoplanetEnvelope("a", "Alpha One", "Host A"), delay: 35 * time.Millisecond},
		"b": {body: exoplanetEnvelope("b", "Beta Two", "Host B"), delay: 10 * time.Millisecond},
		"c": {status: http.StatusBadGateway, body: apiErrorEnvelope("UPSTREAM_UNAVAILABLE", "c unavailable"), delay: 1 * time.Millisecond},
	}, nil)
	defer server.Close()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{
		"--base-url", server.URL,
		"compare", "exoplanets", "a", "b", "c",
	})
	if code != 1 {
		t.Fatalf("expected exit 1, got %d stderr=%s", code, stderr.String())
	}
	if !strings.Contains(stderr.String(), "c unavailable") {
		t.Fatalf("expected error from index 2, got %q", stderr.String())
	}
}

func TestCompareExoplanetsColumnsSubset(t *testing.T) {
	t.Parallel()

	server := newCompareServer(t, map[string]compareResponse{
		"a": {body: exoplanetEnvelope("a", "Alpha", "Host A")},
		"b": {body: exoplanetEnvelope("b", "Beta", "Host B")},
	}, nil)
	defer server.Close()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{
		"--base-url", server.URL,
		"compare", "exoplanets", "a", "b",
		"--columns", "host-star,discovery-method",
	})
	if code != 0 {
		t.Fatalf("expected exit 0, got %d stderr=%s", code, stderr.String())
	}

	out := stdout.String()
	if strings.Contains(out, "Radius") || strings.Contains(out, "Mass") {
		t.Fatalf("expected filtered metrics only, got %q", out)
	}
	if !strings.Contains(out, "Host Star") || !strings.Contains(out, "Discovery Method") {
		t.Fatalf("expected selected metrics, got %q", out)
	}
}

func TestCompareExoplanetsColumnsInvalid(t *testing.T) {
	t.Parallel()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{
		"compare", "exoplanets", "a", "b",
		"--columns", "bogus",
	})
	if code != 2 {
		t.Fatalf("expected exit 2, got %d stderr=%s", code, stderr.String())
	}
}

func TestCompareExoplanetsColumnsIgnoredInJSON(t *testing.T) {
	t.Parallel()

	server := newCompareServer(t, map[string]compareResponse{
		"a": {body: exoplanetEnvelope("a", "Alpha", "Host A")},
		"b": {body: exoplanetEnvelope("b", "Beta", "Host B")},
	}, nil)
	defer server.Close()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{
		"--base-url", server.URL,
		"--output", "json",
		"compare", "exoplanets", "a", "b",
		"--columns", "bogus",
	})
	if code != 0 {
		t.Fatalf("expected exit 0, got %d stderr=%s", code, stderr.String())
	}
}
