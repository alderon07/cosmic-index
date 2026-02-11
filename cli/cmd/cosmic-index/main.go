package main

import (
	"os"

	"cosmic-index/cli/internal/commands"
	"cosmic-index/cli/internal/version"
)

func main() {
	os.Exit(commands.Execute(os.Stdout, os.Stderr, version.Version, os.Args[1:]))
}
