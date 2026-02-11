package commands

import (
	"errors"
	"fmt"
	"io"
)

type ExitError struct {
	Code    int
	Message string
}

func (e *ExitError) Error() string {
	return e.Message
}

func Execute(stdout, stderr io.Writer, version string, args []string) int {
	cmd := NewRootCommand(stdout, stderr, version)
	cmd.SetArgs(args)
	if err := cmd.Execute(); err != nil {
		var exitError *ExitError
		if errors.As(err, &exitError) {
			if exitError.Message != "" {
				fmt.Fprintln(stderr, exitError.Message)
			}
			return exitError.Code
		}

		fmt.Fprintln(stderr, err.Error())
		return 1
	}
	return 0
}
