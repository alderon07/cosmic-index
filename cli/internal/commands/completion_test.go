package commands

import (
	"bytes"
	"strings"
	"testing"
)

func TestCompletionBash(t *testing.T) {
	t.Parallel()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{"completion", "bash"})
	if code != 0 {
		t.Fatalf("expected exit 0, got %d stderr=%s", code, stderr.String())
	}
	if stdout.Len() == 0 {
		t.Fatal("expected non-empty stdout")
	}
	if !strings.Contains(stdout.String(), "bash") {
		t.Fatalf("expected bash completion output, got: %s", stdout.String()[:min(200, stdout.Len())])
	}
}

func TestCompletionZsh(t *testing.T) {
	t.Parallel()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{"completion", "zsh"})
	if code != 0 {
		t.Fatalf("expected exit 0, got %d stderr=%s", code, stderr.String())
	}
	if stdout.Len() == 0 {
		t.Fatal("expected non-empty stdout")
	}
	if !strings.Contains(stdout.String(), "compdef") {
		t.Fatalf("expected zsh compdef marker, got: %s", stdout.String()[:min(200, stdout.Len())])
	}
}

func TestCompletionFish(t *testing.T) {
	t.Parallel()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{"completion", "fish"})
	if code != 0 {
		t.Fatalf("expected exit 0, got %d stderr=%s", code, stderr.String())
	}
	if stdout.Len() == 0 {
		t.Fatal("expected non-empty stdout")
	}
	if !strings.Contains(stdout.String(), "complete -c") {
		t.Fatalf("expected fish completion marker, got: %s", stdout.String()[:min(200, stdout.Len())])
	}
}

func TestCompletionPowershell(t *testing.T) {
	t.Parallel()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{"completion", "powershell"})
	if code != 0 {
		t.Fatalf("expected exit 0, got %d stderr=%s", code, stderr.String())
	}
	if stdout.Len() == 0 {
		t.Fatal("expected non-empty stdout")
	}
	if !strings.Contains(stdout.String(), "Register-ArgumentCompleter") {
		t.Fatalf("expected powershell marker, got: %s", stdout.String()[:min(200, stdout.Len())])
	}
}

func TestCompletionNoArg(t *testing.T) {
	t.Parallel()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{"completion"})
	if code != 2 {
		t.Fatalf("expected exit 2, got %d stderr=%s", code, stderr.String())
	}
}

func TestCompletionInvalidShell(t *testing.T) {
	t.Parallel()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{"completion", "nushell"})
	if code != 2 {
		t.Fatalf("expected exit 2, got %d stderr=%s", code, stderr.String())
	}
}

func TestCompletionTooManyArgs(t *testing.T) {
	t.Parallel()

	var stdout, stderr bytes.Buffer
	code := Execute(&stdout, &stderr, "test", []string{"completion", "bash", "extra"})
	if code != 2 {
		t.Fatalf("expected exit 2, got %d stderr=%s", code, stderr.String())
	}
}
