package httpx

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"cosmic-index/cli/internal/api"
)

const snippetLimit = 300
const detectionSampleLimit = 8192
const maxAttempts = 3
const maxRetryDelay = 5 * time.Second

type Client struct {
	apiRoot    string
	httpClient *http.Client
	debug      bool
	stderr     io.Writer
	userAgent  string
	now        func() time.Time
	sleep      func(context.Context, time.Duration) error
}

type RequestError struct {
	Status      int
	Code        string
	Message     string
	RequestID   string
	RetryAfter  string
	BodySnippet string
}

func (e *RequestError) Error() string {
	if e.Code != "" {
		return fmt.Sprintf("%s: %s", e.Code, e.Message)
	}
	if e.Message != "" {
		return e.Message
	}
	if e.BodySnippet != "" {
		return fmt.Sprintf("request failed (status=%d): %s", e.Status, e.BodySnippet)
	}
	return fmt.Sprintf("request failed (status=%d)", e.Status)
}

func New(apiRoot string, timeout time.Duration, debug bool, stderr io.Writer, userAgent string) *Client {
	if stderr == nil {
		stderr = io.Discard
	}
	return &Client{
		apiRoot: apiRoot,
		httpClient: &http.Client{
			Timeout: timeout,
		},
		debug:     debug,
		stderr:    stderr,
		userAgent: userAgent,
		now:       time.Now,
		sleep:     waitWithContext,
	}
}

func (c *Client) Get(ctx context.Context, endpoint string, query url.Values) ([]byte, http.Header, int, error) {
	requestURL, err := c.buildURL(endpoint, query)
	if err != nil {
		return nil, nil, 0, err
	}
	if ctx == nil {
		ctx = context.Background()
	}

	for attempt := 1; attempt <= maxAttempts; attempt++ {
		if c.debug {
			fmt.Fprintf(c.stderr, "-> GET %s\n", requestURL)
		}

		req, err := http.NewRequestWithContext(ctx, http.MethodGet, requestURL, nil)
		if err != nil {
			return nil, nil, 0, err
		}
		req.Header.Set("Accept", "application/json")
		req.Header.Set("User-Agent", c.userAgent)

		resp, err := c.httpClient.Do(req)
		if err != nil {
			return nil, nil, 0, err
		}

		body, readErr := io.ReadAll(resp.Body)
		_ = resp.Body.Close()
		if readErr != nil {
			return nil, resp.Header, resp.StatusCode, readErr
		}

		if c.debug {
			fmt.Fprintf(c.stderr, "<- %d %s\n", resp.StatusCode, http.StatusText(resp.StatusCode))
		}

		if resp.StatusCode >= 200 && resp.StatusCode < 300 {
			return body, resp.Header, resp.StatusCode, nil
		}

		requestErr := parseError(resp.StatusCode, resp.Header, body)
		if !isRetriableStatus(resp.StatusCode) || attempt == maxAttempts {
			return nil, resp.Header, resp.StatusCode, requestErr
		}

		wait, ok := parseRetryAfter(resp.Header, c.now())
		source := "retry-after"
		if !ok {
			wait = computeBackoff(attempt)
			source = "backoff"
		}
		if wait > maxRetryDelay {
			wait = maxRetryDelay
		}
		if wait <= 0 {
			wait = computeBackoff(attempt)
			source = "backoff"
		}

		if c.debug {
			fmt.Fprintf(c.stderr, "retry attempt=%d/%d status=%d delay=%s source=%s\n", attempt+1, maxAttempts, resp.StatusCode, wait, source)
		}
		if err := c.sleep(ctx, wait); err != nil {
			return nil, resp.Header, resp.StatusCode, err
		}
	}

	return nil, nil, 0, fmt.Errorf("unreachable")
}

func (c *Client) buildURL(endpoint string, query url.Values) (string, error) {
	base, err := url.Parse(c.apiRoot)
	if err != nil {
		return "", err
	}

	basePath := strings.TrimRight(base.Path, "/")
	endpointPath := "/" + strings.TrimLeft(endpoint, "/")
	base.Path = basePath + endpointPath
	base.RawQuery = query.Encode()
	base.Fragment = ""

	return base.String(), nil
}

func parseError(status int, headers http.Header, body []byte) error {
	if isVercelSecurityCheckpoint(status, headers, body) {
		return &RequestError{
			Status:     status,
			Code:       "SECURITY_CHECKPOINT",
			Message:    "blocked by Vercel Security Checkpoint (bot protection); retry later or use --base-url with a trusted endpoint",
			RetryAfter: headers.Get("Retry-After"),
		}
	}

	var envelope api.ErrorEnvelope
	if err := json.Unmarshal(body, &envelope); err == nil && envelope.Error.Code != "" {
		return &RequestError{
			Status:     status,
			Code:       envelope.Error.Code,
			Message:    envelope.Error.Message,
			RequestID:  envelope.Meta.RequestID,
			RetryAfter: headers.Get("Retry-After"),
		}
	}

	snippet := strings.TrimSpace(string(body))
	if len(snippet) > snippetLimit {
		snippet = snippet[:snippetLimit]
	}
	snippet = strings.ReplaceAll(snippet, "\n", " ")

	return &RequestError{
		Status:      status,
		Message:     fmt.Sprintf("request failed (status=%d)", status),
		RetryAfter:  headers.Get("Retry-After"),
		BodySnippet: snippet,
	}
}

func isRetriableStatus(status int) bool {
	return status == http.StatusTooManyRequests || status == http.StatusServiceUnavailable
}

func parseRetryAfter(headers http.Header, now time.Time) (time.Duration, bool) {
	raw := strings.TrimSpace(headers.Get("Retry-After"))
	if raw == "" {
		return 0, false
	}

	seconds, err := strconv.ParseInt(raw, 10, 64)
	if err == nil {
		if seconds <= 0 {
			return 0, false
		}
		delay := time.Duration(seconds) * time.Second
		if delay <= 0 {
			return 0, false
		}
		return delay, true
	}

	retryAt, err := http.ParseTime(raw)
	if err != nil {
		return 0, false
	}
	delay := retryAt.Sub(now)
	if delay <= 0 {
		return 0, false
	}
	return delay, true
}

func computeBackoff(attempt int) time.Duration {
	if attempt <= 1 {
		return 200 * time.Millisecond
	}
	return 500 * time.Millisecond
}

func waitWithContext(ctx context.Context, wait time.Duration) error {
	timer := time.NewTimer(wait)
	defer timer.Stop()

	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-timer.C:
		return nil
	}
}

func isVercelSecurityCheckpoint(status int, headers http.Header, body []byte) bool {
	if status != http.StatusTooManyRequests {
		return false
	}

	contentType := strings.ToLower(headers.Get("Content-Type"))
	if !strings.Contains(contentType, "text/html") {
		return false
	}

	sample := body
	if len(sample) > detectionSampleLimit {
		sample = sample[:detectionSampleLimit]
	}
	text := strings.ToLower(string(sample))

	return strings.Contains(text, "vercel security checkpoint")
}
