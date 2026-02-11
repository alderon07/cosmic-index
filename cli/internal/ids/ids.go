package ids

import (
	"fmt"
	"net/url"
	"strings"
)

func Normalize(raw string) (string, error) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return "", fmt.Errorf("id must not be empty")
	}

	unescaped := trimmed
	if value, err := url.PathUnescape(trimmed); err == nil {
		unescaped = value
	}

	escaped := url.PathEscape(unescaped)
	// PathEscape leaves '+' unescaped; Cosmic Index slugs are encodeURIComponent-style.
	escaped = strings.ReplaceAll(escaped, "+", "%2B")

	return escaped, nil
}
