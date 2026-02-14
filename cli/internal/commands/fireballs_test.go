package commands

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestFireballsQueryMapping(t *testing.T) {
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
		_, _ = w.Write([]byte(`{"data":[{"id":"x","date":"2025-01-01 00:00:00","dateRaw":"2025-01-01 00:00:00","radiatedEnergyJ":1.2,"isComplete":false}],"pagination":{"mode":"none","hasMore":false},"meta":{"requestId":"r1","apiVersion":"1","timestamp":"t","count":1,"limitApplied":20}}`))
	}))
	defer server.Close()

	var stdout bytes.Buffer
	var stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{
		"--base-url", server.URL,
		"fireballs",
		"--date-min", "2025-01-01",
		"--date-max", "2025-01-31",
		"--req-loc",
		"--req-alt",
		"--req-vel",
		"--sort", "energy",
		"--order", "asc",
		"--limit", "20",
	})
	if code != 0 {
		t.Fatalf("unexpected exit code: %d stderr=%s", code, stderr.String())
	}
	if gotQuery["dateMin"] != "2025-01-01" || gotQuery["dateMax"] != "2025-01-31" || gotQuery["reqLoc"] != "true" || gotQuery["reqAlt"] != "true" || gotQuery["reqVel"] != "true" || gotQuery["sort"] != "energy" || gotQuery["order"] != "asc" || gotQuery["limit"] != "20" {
		t.Fatalf("unexpected mapped query: %#v", gotQuery)
	}
	if !strings.Contains(stdout.String(), "RADIATED_J_x1e10") {
		t.Fatalf("expected fireball table header in output")
	}
}

func TestFireballsOrderWithoutSort(t *testing.T) {
	t.Parallel()

	var stdout bytes.Buffer
	var stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{"fireballs", "--order", "desc"})
	if code != 2 {
		t.Fatalf("expected usage exit code 2, got %d", code)
	}
}

func TestFireballsDateRangeValidation(t *testing.T) {
	t.Parallel()

	var stdout bytes.Buffer
	var stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{
		"fireballs",
		"--date-min", "2025-02-01",
		"--date-max", "2025-01-01",
	})
	if code != 2 {
		t.Fatalf("expected usage exit code 2, got %d", code)
	}
}

func TestFireballsColumnsSubset(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"data":[],"pagination":{"mode":"none","hasMore":false},"meta":{"requestId":"r1","apiVersion":"1","timestamp":"t","count":0,"limitApplied":20}}`))
	}))
	defer server.Close()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{
		"--base-url", server.URL,
		"fireballs", "--columns", "date,complete",
	})
	if code != 0 {
		t.Fatalf("expected exit 0, got %d stderr=%s", code, stderr.String())
	}
	header := strings.Split(strings.TrimSpace(stdout.String()), "\n")[0]
	if !strings.Contains(header, "DATE") || !strings.Contains(header, "COMPLETE") || strings.Contains(header, "LAT") {
		t.Fatalf("unexpected header: %q", header)
	}
}

func TestFireballsNoTruncDate(t *testing.T) {
	t.Parallel()

	longDate := "2025-01-01 00:00:00 UTC (long token)"
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"data":[{"id":"x","date":"` + longDate + `","dateRaw":"` + longDate + `","radiatedEnergyJ":1.2,"isComplete":false}],"pagination":{"mode":"none","hasMore":false},"meta":{"requestId":"r1","apiVersion":"1","timestamp":"t","count":1,"limitApplied":20}}`))
	}))
	defer server.Close()

	var stdoutDefault, stderr bytes.Buffer
	code := Execute(&stdoutDefault, &stderr, "test", []string{"--base-url", server.URL, "fireballs", "--columns", "date"})
	if code != 0 {
		t.Fatalf("unexpected exit code: %d stderr=%s", code, stderr.String())
	}
	if strings.Contains(stdoutDefault.String(), longDate) {
		t.Fatalf("expected default truncation, got %q", stdoutDefault.String())
	}

	var stdoutNoTrunc bytes.Buffer
	stderr.Reset()
	code = Execute(&stdoutNoTrunc, &stderr, "test", []string{"--base-url", server.URL, "fireballs", "--columns", "date", "--no-trunc"})
	if code != 0 {
		t.Fatalf("unexpected exit code: %d stderr=%s", code, stderr.String())
	}
	if !strings.Contains(stdoutNoTrunc.String(), longDate) {
		t.Fatalf("expected full date with --no-trunc, got %q", stdoutNoTrunc.String())
	}
}
