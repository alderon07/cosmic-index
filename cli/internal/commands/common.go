package commands

import (
	"encoding/json"
	"fmt"
	"io"
	"net/url"
	"strconv"
	"strings"
)

const (
	defaultPage  = 1
	defaultLimit = 24
	maxLimit     = 48
)

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
