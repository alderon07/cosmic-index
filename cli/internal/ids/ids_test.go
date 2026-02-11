package ids

import "testing"

func TestNormalize(t *testing.T) {
	t.Parallel()

	got, err := Normalize("PSR B1257+12 b")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	want := "PSR%20B1257%2B12%20b"
	if got != want {
		t.Fatalf("unexpected id: got %q want %q", got, want)
	}
}

func TestNormalizeAlreadyEscaped(t *testing.T) {
	t.Parallel()

	got, err := Normalize("PSR%20B1257%2B12%20b")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	want := "PSR%20B1257%2B12%20b"
	if got != want {
		t.Fatalf("unexpected id: got %q want %q", got, want)
	}
}
