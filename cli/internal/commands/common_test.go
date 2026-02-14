package commands

import (
	"strings"
	"testing"
)

func TestTruncate(t *testing.T) {
	t.Parallel()

	for _, tc := range []struct {
		name  string
		value string
		max   int
		want  string
	}{
		{"empty string", "", 10, ""},
		{"short string no-op", "hello", 10, "hello"},
		{"exact length no-op", "hello", 5, "hello"},
		{"over length truncated", "hello world", 8, "hello w..."},
		{"max zero no-op", "hello", 0, "hello"},
		{"max negative no-op", "hello", -1, "hello"},
		{"max one single char", "hello", 1, "h"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			got := truncate(tc.value, tc.max)
			if got != tc.want {
				t.Fatalf("truncate(%q, %d) = %q, want %q", tc.value, tc.max, got, tc.want)
			}
		})
	}
}

func TestValidateDateYYYYMMDD(t *testing.T) {
	t.Parallel()

	for _, tc := range []struct {
		name  string
		value string
		want  bool
	}{
		{"valid date", "2025-01-15", true},
		{"slash separator", "2025/01/15", false},
		{"US format", "01-15-2025", false},
		{"empty", "", false},
		{"single digit month/day", "2025-1-5", false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			got := validateDateYYYYMMDD(tc.value)
			if got != tc.want {
				t.Fatalf("validateDateYYYYMMDD(%q) = %v, want %v", tc.value, got, tc.want)
			}
		})
	}
}

func TestRequireSortIfOrderSet(t *testing.T) {
	t.Parallel()

	for _, tc := range []struct {
		name    string
		sort    string
		order   string
		wantErr bool
	}{
		{"order without sort", "", "asc", true},
		{"order with sort", "name", "asc", false},
		{"both empty", "", "", false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			err := requireSortIfOrderSet(tc.sort, tc.order)
			if tc.wantErr && err == nil {
				t.Fatal("expected error, got nil")
			}
			if !tc.wantErr && err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
		})
	}
}

func TestMetaInt(t *testing.T) {
	t.Parallel()

	for _, tc := range []struct {
		name    string
		meta    map[string]any
		key     string
		wantVal int
		wantOk  bool
	}{
		{"float64 input", map[string]any{"k": float64(42)}, "k", 42, true},
		{"int input", map[string]any{"k": int(7)}, "k", 7, true},
		{"missing key", map[string]any{}, "k", 0, false},
		{"nil value", map[string]any{"k": nil}, "k", 0, false},
		{"string value", map[string]any{"k": "nope"}, "k", 0, false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			val, ok := metaInt(tc.meta, tc.key)
			if ok != tc.wantOk {
				t.Fatalf("metaInt ok = %v, want %v", ok, tc.wantOk)
			}
			if val != tc.wantVal {
				t.Fatalf("metaInt val = %d, want %d", val, tc.wantVal)
			}
		})
	}
}

func TestMetaBool(t *testing.T) {
	t.Parallel()

	for _, tc := range []struct {
		name    string
		meta    map[string]any
		key     string
		wantVal bool
		wantOk  bool
	}{
		{"true", map[string]any{"k": true}, "k", true, true},
		{"false", map[string]any{"k": false}, "k", false, true},
		{"missing key", map[string]any{}, "k", false, false},
		{"nil value", map[string]any{"k": nil}, "k", false, false},
		{"non-bool type", map[string]any{"k": "true"}, "k", false, false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			val, ok := metaBool(tc.meta, tc.key)
			if ok != tc.wantOk {
				t.Fatalf("metaBool ok = %v, want %v", ok, tc.wantOk)
			}
			if val != tc.wantVal {
				t.Fatalf("metaBool val = %v, want %v", val, tc.wantVal)
			}
		})
	}
}

func TestParseColumnsFlag(t *testing.T) {
	t.Parallel()

	allowed := []string{"id", "name", "year"}

	t.Run("empty raw returns nil selection", func(t *testing.T) {
		got, err := parseColumnsFlag("", "exoplanets", allowed)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if got != nil {
			t.Fatalf("expected nil, got %#v", got)
		}
	})

	t.Run("normalizes and dedupes preserving order", func(t *testing.T) {
		got, err := parseColumnsFlag(" Name,ID,name,year ", "exoplanets", allowed)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		want := []string{"name", "id", "year"}
		if len(got) != len(want) {
			t.Fatalf("len=%d want=%d (%#v)", len(got), len(want), got)
		}
		for i := range want {
			if got[i] != want[i] {
				t.Fatalf("index %d got=%q want=%q", i, got[i], want[i])
			}
		}
	})

	t.Run("invalid key returns deterministic error", func(t *testing.T) {
		_, err := parseColumnsFlag("name,bogus", "exoplanets", allowed)
		if err == nil {
			t.Fatal("expected error")
		}
		msg := err.Error()
		if !strings.Contains(msg, "invalid --columns for exoplanets: bogus") {
			t.Fatalf("unexpected error: %q", msg)
		}
		if !strings.Contains(msg, "valid: id,name,year") {
			t.Fatalf("expected sorted valid key list, got %q", msg)
		}
	})

	t.Run("only empty tokens fails", func(t *testing.T) {
		_, err := parseColumnsFlag(" , , ", "exoplanets", allowed)
		if err == nil {
			t.Fatal("expected error")
		}
		if !strings.Contains(err.Error(), "did not include any valid keys") {
			t.Fatalf("unexpected error: %q", err.Error())
		}
	})

	t.Run("trailing comma keeps valid key", func(t *testing.T) {
		got, err := parseColumnsFlag("id,", "exoplanets", allowed)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(got) != 1 || got[0] != "id" {
			t.Fatalf("unexpected parsed keys: %#v", got)
		}
	})
}
