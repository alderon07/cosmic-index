package httpx

import (
	"context"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"
	"time"
)

func TestClientGetSuccess(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/v1/exoplanets" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"data":[],"pagination":{"mode":"offset","page":1,"limit":24,"hasMore":false},"meta":{"requestId":"r1","apiVersion":"1","timestamp":"t"}}`))
	}))
	defer server.Close()

	client := New(server.URL+"/api/v1", 5*time.Second, false, nil, "test-agent")
	body, _, status, err := client.Get(context.Background(), "/exoplanets", url.Values{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if status != http.StatusOK {
		t.Fatalf("unexpected status: %d", status)
	}
	if len(body) == 0 {
		t.Fatalf("expected response body")
	}
}

func TestClientGetJSONError(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Retry-After", "17")
		w.WriteHeader(http.StatusTooManyRequests)
		_, _ = w.Write([]byte(`{"error":{"code":"RATE_LIMIT_EXCEEDED","message":"Rate limit exceeded."},"meta":{"requestId":"abc-123","apiVersion":"1","timestamp":"t"}}`))
	}))
	defer server.Close()

	client := New(server.URL+"/api/v1", 5*time.Second, false, nil, "test-agent")
	_, _, _, err := client.Get(context.Background(), "/exoplanets", nil)
	if err == nil {
		t.Fatalf("expected error")
	}

	requestError, ok := err.(*RequestError)
	if !ok {
		t.Fatalf("expected RequestError, got %T", err)
	}
	if requestError.Code != "RATE_LIMIT_EXCEEDED" {
		t.Fatalf("unexpected code: %s", requestError.Code)
	}
	if requestError.RequestID != "abc-123" {
		t.Fatalf("unexpected request id: %s", requestError.RequestID)
	}
	if requestError.RetryAfter != "17" {
		t.Fatalf("unexpected retry-after: %s", requestError.RetryAfter)
	}
}

func TestClientGetNonJSONError(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusBadGateway)
		_, _ = w.Write([]byte("<html>upstream failed</html>"))
	}))
	defer server.Close()

	client := New(server.URL+"/api/v1", 5*time.Second, false, nil, "test-agent")
	_, _, _, err := client.Get(context.Background(), "/exoplanets", nil)
	if err == nil {
		t.Fatalf("expected error")
	}

	requestError, ok := err.(*RequestError)
	if !ok {
		t.Fatalf("expected RequestError, got %T", err)
	}
	if requestError.Status != http.StatusBadGateway {
		t.Fatalf("unexpected status: %d", requestError.Status)
	}
	if requestError.BodySnippet == "" {
		t.Fatalf("expected body snippet")
	}
}

func TestClientGetVercelCheckpointError(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Header().Set("Retry-After", "30")
		w.WriteHeader(http.StatusTooManyRequests)
		_, _ = w.Write([]byte("<!DOCTYPE html><html><head><title>Vercel Security Checkpoint</title></head><body>blocked</body></html>"))
	}))
	defer server.Close()

	client := New(server.URL+"/api/v1", 5*time.Second, false, nil, "test-agent")
	_, _, _, err := client.Get(context.Background(), "/exoplanets", nil)
	if err == nil {
		t.Fatalf("expected error")
	}

	requestError, ok := err.(*RequestError)
	if !ok {
		t.Fatalf("expected RequestError, got %T", err)
	}
	if requestError.Code != "SECURITY_CHECKPOINT" {
		t.Fatalf("unexpected code: %s", requestError.Code)
	}
	if requestError.RetryAfter != "30" {
		t.Fatalf("unexpected retry-after: %s", requestError.RetryAfter)
	}
	if requestError.BodySnippet != "" {
		t.Fatalf("expected empty body snippet, got %q", requestError.BodySnippet)
	}
}
