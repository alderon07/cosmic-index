package config

import (
	"testing"
	"time"
)

func TestNormalizeBaseURL(t *testing.T) {
	t.Parallel()

	testCases := []struct {
		name    string
		input   string
		want    string
		wantErr bool
	}{
		{name: "host root", input: "https://cosmic-index.vercel.app", want: "https://cosmic-index.vercel.app/api/v1"},
		{name: "host with trailing slash", input: "https://cosmic-index.vercel.app/", want: "https://cosmic-index.vercel.app/api/v1"},
		{name: "api root already set", input: "https://cosmic-index.vercel.app/api/v1", want: "https://cosmic-index.vercel.app/api/v1"},
		{name: "api root with slash", input: "https://cosmic-index.vercel.app/api/v1/", want: "https://cosmic-index.vercel.app/api/v1"},
		{name: "api path", input: "https://cosmic-index.vercel.app/api", want: "https://cosmic-index.vercel.app/api/v1"},
		{name: "relative url", input: "/api/v1", wantErr: true},
	}

	for _, testCase := range testCases {
		testCase := testCase
		t.Run(testCase.name, func(t *testing.T) {
			t.Parallel()
			got, err := NormalizeBaseURL(testCase.input)
			if testCase.wantErr {
				if err == nil {
					t.Fatalf("expected error, got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got != testCase.want {
				t.Fatalf("unexpected normalized url: got %q want %q", got, testCase.want)
			}
		})
	}
}

func TestLoadOutputValidation(t *testing.T) {
	t.Parallel()

	if _, err := Load("https://cosmic-index.vercel.app", 5*time.Second, "yaml", false, false); err == nil {
		t.Fatalf("expected invalid output error")
	}
}
