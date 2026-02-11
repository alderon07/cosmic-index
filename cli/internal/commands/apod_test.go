package commands

import (
	"bytes"
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
