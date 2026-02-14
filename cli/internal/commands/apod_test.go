package commands

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestApodTruncationAndFullText(t *testing.T) {
	t.Parallel()

	longExplanation := strings.Repeat("x", 300)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"data":{"date":"2026-01-01","title":"A title","explanation":"` + longExplanation + `","imageUrl":"https://example.com","mediaType":"video"},"meta":{"requestId":"r1","apiVersion":"1","timestamp":"t"}}`))
	}))
	defer server.Close()

	var stdout bytes.Buffer
	var stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{"--base-url", server.URL, "apod"})
	if code != 0 {
		t.Fatalf("unexpected exit code: %d stderr=%s", code, stderr.String())
	}
	if strings.Contains(stdout.String(), longExplanation) {
		t.Fatalf("expected truncated explanation in default table mode")
	}

	stdout.Reset()
	stderr.Reset()
	code = Execute(&stdout, &stderr, "test", []string{"--base-url", server.URL, "apod", "--full-text"})
	if code != 0 {
		t.Fatalf("unexpected exit code: %d stderr=%s", code, stderr.String())
	}
	if !strings.Contains(stdout.String(), longExplanation) {
		t.Fatalf("expected full explanation with --full-text")
	}
}

func TestApodDateValidation(t *testing.T) {
	t.Parallel()

	var stdout bytes.Buffer
	var stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{"apod", "--date", "2026/01/01"})
	if code != 2 {
		t.Fatalf("expected usage exit code 2, got %d", code)
	}
}

const apodDetailJSON = `{"data":{"date":"2026-01-15","title":"A title","explanation":"An explanation","imageUrl":"https://example.com","mediaType":"image"},"meta":{"requestId":"r1","apiVersion":"1","timestamp":"t"}}`

func TestApodJSON(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(apodDetailJSON))
	}))
	defer server.Close()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{
		"--base-url", server.URL,
		"--output", "json",
		"apod",
	})
	if code != 0 {
		t.Fatalf("expected exit 0, got %d stderr=%s", code, stderr.String())
	}

	var payload map[string]any
	if err := json.Unmarshal(stdout.Bytes(), &payload); err != nil {
		t.Fatalf("expected valid JSON, got error: %v output=%q", err, stdout.String())
	}
}

func TestApodDateQueryParam(t *testing.T) {
	t.Parallel()

	var gotDate string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotDate = r.URL.Query().Get("date")
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(apodDetailJSON))
	}))
	defer server.Close()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{
		"--base-url", server.URL,
		"apod", "--date", "2026-01-15",
	})
	if code != 0 {
		t.Fatalf("expected exit 0, got %d stderr=%s", code, stderr.String())
	}
	if gotDate != "2026-01-15" {
		t.Fatalf("expected date=2026-01-15, got %q", gotDate)
	}
}

func TestApodValidDateAccepted(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(apodDetailJSON))
	}))
	defer server.Close()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{
		"--base-url", server.URL,
		"apod", "--date", "2026-01-01",
	})
	if code != 0 {
		t.Fatalf("expected exit 0, got %d stderr=%s", code, stderr.String())
	}
}

func TestApodColumnsSubset(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(apodDetailJSON))
	}))
	defer server.Close()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{
		"--base-url", server.URL,
		"apod", "--columns", "date,explanation",
	})
	if code != 0 {
		t.Fatalf("expected exit 0, got %d stderr=%s", code, stderr.String())
	}
	header := strings.Split(strings.TrimSpace(stdout.String()), "\n")[0]
	if !strings.Contains(header, "DATE") || !strings.Contains(header, "EXPLANATION") || strings.Contains(header, "MEDIA_TYPE") {
		t.Fatalf("unexpected header: %q", header)
	}
}

func TestApodNoTruncShowsFullExplanationWithoutFullText(t *testing.T) {
	t.Parallel()

	longExplanation := strings.Repeat("x", 300)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"data":{"date":"2026-01-01","title":"A title","explanation":"` + longExplanation + `","imageUrl":"https://example.com","mediaType":"video"},"meta":{"requestId":"r1","apiVersion":"1","timestamp":"t"}}`))
	}))
	defer server.Close()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{"--base-url", server.URL, "apod", "--no-trunc"})
	if code != 0 {
		t.Fatalf("unexpected exit code: %d stderr=%s", code, stderr.String())
	}
	if !strings.Contains(stdout.String(), longExplanation) {
		t.Fatalf("expected full explanation with --no-trunc")
	}
}

func TestApodNoTruncIgnoredInJSON(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(apodDetailJSON))
	}))
	defer server.Close()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{
		"--base-url", server.URL,
		"--output", "json",
		"apod",
		"--no-trunc",
	})
	if code != 0 {
		t.Fatalf("expected exit 0, got %d stderr=%s", code, stderr.String())
	}

	var payload map[string]any
	if err := json.Unmarshal(stdout.Bytes(), &payload); err != nil {
		t.Fatalf("expected valid JSON, got error: %v output=%q", err, stdout.String())
	}
}
