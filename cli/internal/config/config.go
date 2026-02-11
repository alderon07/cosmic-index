package config

import (
	"fmt"
	"net/url"
	"os"
	"strings"
	"time"
)

const (
	DefaultBaseURL = "https://cosmic-index.vercel.app"
	DefaultOutput  = "table"
)

const DefaultTimeout = 35 * time.Second

type Runtime struct {
	BaseURL string
	APIRoot string
	Timeout time.Duration
	Output  string
	Debug   bool
}

func Load(baseURL string, timeout time.Duration, output string, jsonOutput bool, debug bool) (Runtime, error) {
	resolvedBase := strings.TrimSpace(baseURL)
	if resolvedBase == "" {
		resolvedBase = strings.TrimSpace(os.Getenv("COSMIC_INDEX_BASE_URL"))
	}
	if resolvedBase == "" {
		resolvedBase = DefaultBaseURL
	}

	apiRoot, err := NormalizeBaseURL(resolvedBase)
	if err != nil {
		return Runtime{}, err
	}

	if timeout <= 0 {
		return Runtime{}, fmt.Errorf("timeout must be greater than 0")
	}

	resolvedOutput := strings.ToLower(strings.TrimSpace(output))
	if jsonOutput {
		resolvedOutput = "json"
	}
	if resolvedOutput == "" {
		resolvedOutput = DefaultOutput
	}
	if resolvedOutput != "table" && resolvedOutput != "json" {
		return Runtime{}, fmt.Errorf("invalid output format %q (allowed: table,json)", resolvedOutput)
	}

	return Runtime{
		BaseURL: resolvedBase,
		APIRoot: apiRoot,
		Timeout: timeout,
		Output:  resolvedOutput,
		Debug:   debug,
	}, nil
}

func NormalizeBaseURL(rawBaseURL string) (string, error) {
	parsed, err := url.Parse(strings.TrimSpace(rawBaseURL))
	if err != nil {
		return "", fmt.Errorf("invalid base URL: %w", err)
	}
	if parsed.Scheme == "" || parsed.Host == "" {
		return "", fmt.Errorf("base URL must include scheme and host")
	}

	parsed.RawQuery = ""
	parsed.Fragment = ""

	path := strings.TrimRight(parsed.EscapedPath(), "/")
	switch {
	case strings.HasSuffix(path, "/api/v1"):
		// Already API root.
	case strings.HasSuffix(path, "/api"):
		path += "/v1"
	default:
		if path == "" {
			path = "/api/v1"
		} else {
			path += "/api/v1"
		}
	}

	parsed.Path = path
	parsed.RawPath = ""

	return strings.TrimRight(parsed.String(), "/"), nil
}
