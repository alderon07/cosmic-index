package commands

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestCloseApproachesQueryMapping(t *testing.T) {
	t.Parallel()

	var gotQuery map[string]string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotQuery = map[string]string{}
		for key, values := range r.URL.Query() {
			if len(values) > 0 {
				gotQuery[key] = values[0]
			}
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"data":[],"pagination":{"mode":"none","hasMore":false},"meta":{"requestId":"r1","apiVersion":"1","timestamp":"t","count":0}}`))
	}))
	defer server.Close()

	var stdout bytes.Buffer
	var stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{
		"--base-url", server.URL,
		"close-approaches",
		"--date-min", "now",
		"--date-max", "+30",
		"--dist-max-ld", "5",
		"--pha-only",
		"--sort", "v-rel",
		"--order", "desc",
		"--limit", "10",
	})
	if code != 0 {
		t.Fatalf("unexpected exit code: %d stderr=%s", code, stderr.String())
	}

	for key := range gotQuery {
		if key == "date-min" || key == "date-max" || key == "dist-max-ld" || key == "pha-only" {
			t.Fatalf("unexpected kebab-case query key: %s", key)
		}
	}
	if gotQuery["dateMin"] != "now" || gotQuery["dateMax"] != "+30" || gotQuery["phaOnly"] != "true" || gotQuery["sort"] != "v-rel" || gotQuery["order"] != "desc" || gotQuery["limit"] != "10" {
		t.Fatalf("unexpected mapped query: %#v", gotQuery)
	}
}

func TestCloseApproachesOrderWithoutSort(t *testing.T) {
	t.Parallel()

	var stdout bytes.Buffer
	var stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{
		"close-approaches",
		"--order", "asc",
	})
	if code != 2 {
		t.Fatalf("expected usage exit code 2, got %d", code)
	}
}

func TestCloseApproachesOptionalPhaRendersDash(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"data":[{"id":"a","designation":"A","approachTimeRaw":"2025-Jan-01 00:00","distanceLd":1.23,"relativeVelocityKmS":12.34,"absoluteMagnitude":21.1}],"pagination":{"mode":"none","hasMore":false},"meta":{"requestId":"r1","apiVersion":"1","timestamp":"t","count":1}}`))
	}))
	defer server.Close()

	var stdout bytes.Buffer
	var stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{"--base-url", server.URL, "close-approaches"})
	if code != 0 {
		t.Fatalf("unexpected exit code: %d stderr=%s", code, stderr.String())
	}
	lines := strings.Split(strings.TrimSpace(stdout.String()), "\n")
	if len(lines) < 2 {
		t.Fatalf("expected at least one data row, got output: %q", stdout.String())
	}
	fields := strings.Fields(lines[1])
	if len(fields) == 0 || fields[len(fields)-1] != "-" {
		t.Fatalf("expected optional PHA field to render as '-', got row: %q", lines[1])
	}
}

func TestCloseApproachesColumnsSubset(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"data":[],"pagination":{"mode":"none","hasMore":false},"meta":{"requestId":"r1","apiVersion":"1","timestamp":"t","count":0}}`))
	}))
	defer server.Close()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{
		"--base-url", server.URL,
		"close-approaches", "--columns", "designation,h",
	})
	if code != 0 {
		t.Fatalf("expected exit 0, got %d stderr=%s", code, stderr.String())
	}
	header := strings.Split(strings.TrimSpace(stdout.String()), "\n")[0]
	if !strings.Contains(header, "DESIGNATION") || !strings.Contains(header, "H") || strings.Contains(header, "DIST_LD") {
		t.Fatalf("unexpected header: %q", header)
	}
}

func TestCloseApproachesNoTruncDesignation(t *testing.T) {
	t.Parallel()

	longDesignation := "99942 Apophis Very Long Designation Value"
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"data":[{"id":"a","designation":"` + longDesignation + `","approachTimeRaw":"2025-Jan-01 00:00","distanceLd":1.23,"relativeVelocityKmS":12.34,"absoluteMagnitude":21.1}],"pagination":{"mode":"none","hasMore":false},"meta":{"requestId":"r1","apiVersion":"1","timestamp":"t","count":1}}`))
	}))
	defer server.Close()

	var stdoutDefault, stderr bytes.Buffer
	code := Execute(&stdoutDefault, &stderr, "test", []string{"--base-url", server.URL, "close-approaches", "--columns", "designation"})
	if code != 0 {
		t.Fatalf("unexpected exit code: %d stderr=%s", code, stderr.String())
	}
	if strings.Contains(stdoutDefault.String(), longDesignation) {
		t.Fatalf("expected default truncation, got %q", stdoutDefault.String())
	}

	var stdoutNoTrunc bytes.Buffer
	stderr.Reset()
	code = Execute(&stdoutNoTrunc, &stderr, "test", []string{"--base-url", server.URL, "close-approaches", "--columns", "designation", "--no-trunc"})
	if code != 0 {
		t.Fatalf("unexpected exit code: %d stderr=%s", code, stderr.String())
	}
	if !strings.Contains(stdoutNoTrunc.String(), longDesignation) {
		t.Fatalf("expected full designation with --no-trunc, got %q", stdoutNoTrunc.String())
	}
}
