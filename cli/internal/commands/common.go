package commands

import (
	"encoding/json"
	"fmt"
	"io"
	"net/url"
	"regexp"
	"sort"
	"strconv"
	"strings"
)

const (
	defaultPage  = 1
	defaultLimit = 24
	maxLimit     = 48
)

var datePattern = regexp.MustCompile(`^\d{4}-\d{2}-\d{2}$`)

func writeJSONRaw(w io.Writer, body []byte) error {
	var payload any
	if err := json.Unmarshal(body, &payload); err != nil {
		return err
	}
	encoded, err := json.MarshalIndent(payload, "", "  ")
	if err != nil {
		return err
	}
	if _, err := fmt.Fprintln(w, string(encoded)); err != nil {
		return err
	}
	return nil
}

func setIfNotEmpty(values url.Values, key, value string) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return
	}
	values.Set(key, trimmed)
}

func setBoolIfTrue(values url.Values, key string, changed bool, value bool) {
	if changed && value {
		values.Set(key, "true")
	}
}

func setInt(values url.Values, key string, value int) {
	values.Set(key, strconv.Itoa(value))
}

func setFloat(values url.Values, key string, value float64) {
	values.Set(key, strconv.FormatFloat(value, 'f', -1, 64))
}

func validateDateYYYYMMDD(value string) bool {
	return datePattern.MatchString(strings.TrimSpace(value))
}

func requireSortIfOrderSet(sort string, order string) error {
	if strings.TrimSpace(order) != "" && strings.TrimSpace(sort) == "" {
		return fmt.Errorf("--order requires --sort")
	}
	return nil
}

func truncate(value string, max int) string {
	if max <= 0 || len(value) <= max {
		return value
	}
	if max <= 1 {
		return value[:max]
	}
	return value[:max-1] + "..."
}

func metaInt(meta map[string]any, key string) (int, bool) {
	raw, ok := meta[key]
	if !ok || raw == nil {
		return 0, false
	}
	switch value := raw.(type) {
	case float64:
		return int(value), true
	case int:
		return value, true
	default:
		return 0, false
	}
}

func metaBool(meta map[string]any, key string) (bool, bool) {
	raw, ok := meta[key]
	if !ok || raw == nil {
		return false, false
	}
	value, ok := raw.(bool)
	return value, ok
}

func parseColumnsFlag(raw string, commandLabel string, allowed []string) ([]string, error) {
	if strings.TrimSpace(raw) == "" {
		return nil, nil
	}

	allowedSet := make(map[string]struct{}, len(allowed))
	for _, key := range allowed {
		allowedSet[key] = struct{}{}
	}

	seen := map[string]struct{}{}
	selected := make([]string, 0, len(allowed))
	invalidSet := map[string]struct{}{}
	invalid := make([]string, 0)

	for _, token := range strings.Split(raw, ",") {
		key := strings.ToLower(strings.TrimSpace(token))
		if key == "" {
			continue
		}
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}

		if _, ok := allowedSet[key]; !ok {
			if _, exists := invalidSet[key]; !exists {
				invalidSet[key] = struct{}{}
				invalid = append(invalid, key)
			}
			continue
		}

		selected = append(selected, key)
	}

	validList := append([]string(nil), allowed...)
	sort.Strings(validList)
	if len(invalid) > 0 {
		sort.Strings(invalid)
		return nil, fmt.Errorf(
			"invalid --columns for %s: %s (valid: %s)",
			commandLabel,
			strings.Join(invalid, ","),
			strings.Join(validList, ","),
		)
	}
	if len(selected) == 0 {
		return nil, fmt.Errorf(
			"--columns for %s did not include any valid keys (valid: %s)",
			commandLabel,
			strings.Join(validList, ","),
		)
	}

	return selected, nil
}
