package httpx

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"cosmic-index/cli/internal/api"
)

const snippetLimit = 300
const detectionSampleLimit = 8192

type Client struct {
	apiRoot    string
	httpClient *http.Client
	debug      bool
	stderr     io.Writer
	userAgent  string
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
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, resp.Header, resp.StatusCode, err
	}

	if c.debug {
		fmt.Fprintf(c.stderr, "<- %d %s\n", resp.StatusCode, http.StatusText(resp.StatusCode))
	}

	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		return body, resp.Header, resp.StatusCode, nil
	}

	return nil, resp.Header, resp.StatusCode, parseError(resp.StatusCode, resp.Header, body)
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
