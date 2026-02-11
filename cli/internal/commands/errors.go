package commands

import (
	"errors"
	"fmt"
	"strings"

	"cosmic-index/cli/internal/httpx"
)

func usageError(message string) error {
	return &ExitError{
		Code:    2,
		Message: message,
	}
}

func apiError(err error) error {
	var requestError *httpx.RequestError
	if errors.As(err, &requestError) {
		parts := []string{}
		if requestError.Code != "" {
			parts = append(parts, fmt.Sprintf("%s: %s", requestError.Code, requestError.Message))
		} else if requestError.BodySnippet != "" {
			parts = append(parts, fmt.Sprintf("HTTP %d: %s", requestError.Status, requestError.BodySnippet))
		} else {
			parts = append(parts, requestError.Error())
		}
		if requestError.RequestID != "" {
			parts = append(parts, fmt.Sprintf("request_id=%s", requestError.RequestID))
		}
		if requestError.RetryAfter != "" {
			parts = append(parts, fmt.Sprintf("retry_after=%ss", requestError.RetryAfter))
		}
		return &ExitError{
			Code:    1,
			Message: strings.Join(parts, " "),
		}
	}

	return &ExitError{
		Code:    1,
		Message: err.Error(),
	}
}
