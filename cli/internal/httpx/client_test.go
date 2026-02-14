package httpx

import (
	"bytes"
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"sync/atomic"
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

func TestClientGetRetries429WithRetryAfterSeconds(t *testing.T) {
	t.Parallel()

	var calls atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if calls.Add(1) == 1 {
			w.Header().Set("Retry-After", "1")
			w.WriteHeader(http.StatusTooManyRequests)
			_, _ = w.Write([]byte(`{"error":{"code":"RATE_LIMIT_EXCEEDED","message":"retry"},"meta":{"requestId":"r1","apiVersion":"1","timestamp":"t"}}`))
			return
		}
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"ok":true}`))
	}))
	defer server.Close()

	client := New(server.URL+"/api/v1", 5*time.Second, false, nil, "test-agent")
	client.sleep = func(context.Context, time.Duration) error { return nil }
	_, _, status, err := client.Get(context.Background(), "/exoplanets", nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if status != http.StatusOK {
		t.Fatalf("unexpected status: %d", status)
	}
	if calls.Load() != 2 {
		t.Fatalf("expected 2 calls, got %d", calls.Load())
	}
}

func TestClientGetRetries503WithRetryAfterSeconds(t *testing.T) {
	t.Parallel()

	var calls atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if calls.Add(1) == 1 {
			w.Header().Set("Retry-After", "1")
			w.WriteHeader(http.StatusServiceUnavailable)
			_, _ = w.Write([]byte(`{"error":{"code":"UPSTREAM_UNAVAILABLE","message":"retry"},"meta":{"requestId":"r1","apiVersion":"1","timestamp":"t"}}`))
			return
		}
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"ok":true}`))
	}))
	defer server.Close()

	client := New(server.URL+"/api/v1", 5*time.Second, false, nil, "test-agent")
	client.sleep = func(context.Context, time.Duration) error { return nil }
	_, _, status, err := client.Get(context.Background(), "/stars", nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if status != http.StatusOK {
		t.Fatalf("unexpected status: %d", status)
	}
	if calls.Load() != 2 {
		t.Fatalf("expected 2 calls, got %d", calls.Load())
	}
}

func TestClientGetStopsAfterMaxAttempts(t *testing.T) {
	t.Parallel()

	var calls atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		w.Header().Set("Retry-After", "1")
		w.WriteHeader(http.StatusTooManyRequests)
		_, _ = w.Write([]byte(`{"error":{"code":"RATE_LIMIT_EXCEEDED","message":"still limited"},"meta":{"requestId":"r1","apiVersion":"1","timestamp":"t"}}`))
	}))
	defer server.Close()

	client := New(server.URL+"/api/v1", 5*time.Second, false, nil, "test-agent")
	client.sleep = func(context.Context, time.Duration) error { return nil }
	_, _, _, err := client.Get(context.Background(), "/exoplanets", nil)
	if err == nil {
		t.Fatalf("expected error")
	}
	if calls.Load() != maxAttempts {
		t.Fatalf("expected %d calls, got %d", maxAttempts, calls.Load())
	}
}

func TestClientGetNoRetryForNonRetriableStatus(t *testing.T) {
	t.Parallel()

	var calls atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte(`{"error":{"code":"BAD_REQUEST","message":"bad req"},"meta":{"requestId":"r1","apiVersion":"1","timestamp":"t"}}`))
	}))
	defer server.Close()

	client := New(server.URL+"/api/v1", 5*time.Second, false, nil, "test-agent")
	client.sleep = func(context.Context, time.Duration) error { return nil }
	_, _, _, err := client.Get(context.Background(), "/exoplanets", nil)
	if err == nil {
		t.Fatalf("expected error")
	}
	if calls.Load() != 1 {
		t.Fatalf("expected 1 call, got %d", calls.Load())
	}
}

func TestClientGetContextCancelledDuringBackoff(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusTooManyRequests)
		_, _ = w.Write([]byte(`{"error":{"code":"RATE_LIMIT_EXCEEDED","message":"retry"},"meta":{"requestId":"r1","apiVersion":"1","timestamp":"t"}}`))
	}))
	defer server.Close()

	client := New(server.URL+"/api/v1", 5*time.Second, false, nil, "test-agent")
	client.sleep = waitWithContext
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	_, _, _, err := client.Get(ctx, "/exoplanets", nil)
	if err == nil {
		t.Fatalf("expected error")
	}
	if !errors.Is(err, context.Canceled) {
		t.Fatalf("expected context canceled, got %v", err)
	}
}

func TestClientGetRetryAfterInvalidFallsBackBackoff(t *testing.T) {
	t.Parallel()

	var slept []time.Duration
	var calls atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if calls.Add(1) == 1 {
			w.Header().Set("Retry-After", "0.5")
			w.WriteHeader(http.StatusTooManyRequests)
			_, _ = w.Write([]byte(`{"error":{"code":"RATE_LIMIT_EXCEEDED","message":"retry"},"meta":{"requestId":"r1","apiVersion":"1","timestamp":"t"}}`))
			return
		}
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"ok":true}`))
	}))
	defer server.Close()

	client := New(server.URL+"/api/v1", 5*time.Second, false, nil, "test-agent")
	client.sleep = func(_ context.Context, d time.Duration) error {
		slept = append(slept, d)
		return nil
	}
	_, _, _, err := client.Get(context.Background(), "/exoplanets", nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(slept) != 1 || slept[0] != 200*time.Millisecond {
		t.Fatalf("expected fallback backoff 200ms, got %v", slept)
	}
}

func TestClientGetDebugLogsRetryMetadata(t *testing.T) {
	t.Parallel()

	var calls atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if calls.Add(1) == 1 {
			w.WriteHeader(http.StatusTooManyRequests)
			_, _ = w.Write([]byte(`{"error":{"code":"RATE_LIMIT_EXCEEDED","message":"retry"},"meta":{"requestId":"r1","apiVersion":"1","timestamp":"t"}}`))
			return
		}
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"ok":true}`))
	}))
	defer server.Close()

	var stderr bytes.Buffer
	client := New(server.URL+"/api/v1", 5*time.Second, true, &stderr, "test-agent")
	client.sleep = func(context.Context, time.Duration) error { return nil }
	_, _, _, err := client.Get(context.Background(), "/exoplanets", nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	logs := stderr.String()
	if !strings.Contains(logs, "retry attempt=2/3 status=429") {
		t.Fatalf("expected retry metadata in logs, got %q", logs)
	}
}

func TestParseRetryAfterHTTPDate(t *testing.T) {
	t.Parallel()

	now := time.Date(2026, 2, 14, 12, 0, 0, 0, time.UTC)
	headers := http.Header{}
	headers.Set("Retry-After", now.Add(2*time.Second).Format(http.TimeFormat))

	delay, ok := parseRetryAfter(headers, now)
	if !ok {
		t.Fatalf("expected parsed delay")
	}
	if delay < time.Second || delay > 3*time.Second {
		t.Fatalf("unexpected delay: %s", delay)
	}
}

func TestParseRetryAfterWhitespaceAndOverflow(t *testing.T) {
	t.Parallel()

	headers := http.Header{}
	headers.Set("Retry-After", "  2 ")
	delay, ok := parseRetryAfter(headers, time.Now())
	if !ok || delay != 2*time.Second {
		t.Fatalf("expected 2s, got %s ok=%v", delay, ok)
	}

	headers.Set("Retry-After", "99999999999999999999999999")
	_, ok = parseRetryAfter(headers, time.Now())
	if ok {
		t.Fatalf("expected overflow parse to fail")
	}
}
