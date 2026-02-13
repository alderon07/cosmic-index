package commands

import (
	"fmt"
	"io"
	"strings"
	"time"

	"cosmic-index/cli/internal/config"
	"cosmic-index/cli/internal/httpx"

	"github.com/spf13/cobra"
)

type runtime struct {
	stdout  io.Writer
	stderr  io.Writer
	version string

	baseURL string
	timeout time.Duration
	output  string
	json    bool
	debug   bool

	cfg    config.Runtime
	client *httpx.Client
}

func NewRootCommand(stdout, stderr io.Writer, version string) *cobra.Command {
	state := &runtime{
		stdout:  stdout,
		stderr:  stderr,
		version: version,
		timeout: config.DefaultTimeout,
		output:  config.DefaultOutput,
	}

	root := &cobra.Command{
		Use:           "cosmic-index",
		Short:         "Explore Cosmic Index from your terminal",
		SilenceErrors: true,
		SilenceUsage:  true,
		CompletionOptions: cobra.CompletionOptions{
			DisableDefaultCmd: true,
		},
	}

	root.PersistentFlags().StringVar(&state.baseURL, "base-url", "", "Cosmic Index base URL (default: https://cosmic-index.vercel.app)")
	root.PersistentFlags().DurationVar(&state.timeout, "timeout", config.DefaultTimeout, "HTTP request timeout (e.g. 35s)")
	root.PersistentFlags().StringVarP(&state.output, "output", "o", config.DefaultOutput, "Output format: table|json")
	root.PersistentFlags().BoolVar(&state.json, "json", false, "Alias for --output json")
	root.PersistentFlags().BoolVar(&state.debug, "debug", false, "Print request/response debug logs to stderr")

	root.AddCommand(newVersionCommand(state))
	root.AddCommand(newApodCommand(state))
	root.AddCommand(newCloseApproachesCommand(state))
	root.AddCommand(newFireballsCommand(state))
	root.AddCommand(newSearchCommand(state))
	root.AddCommand(newGetCommand(state))
	root.AddCommand(newCompletionCommand(state))

	return root
}

func newVersionCommand(state *runtime) *cobra.Command {
	return &cobra.Command{
		Use:   "version",
		Short: "Print CLI version",
		RunE: func(cmd *cobra.Command, args []string) error {
			_, err := fmt.Fprintln(state.stdout, state.version)
			return err
		},
	}
}

func (state *runtime) initClient() error {
	cfg, err := config.Load(state.baseURL, state.timeout, state.output, state.json, state.debug)
	if err != nil {
		return usageError(err.Error())
	}

	state.cfg = cfg
	state.client = httpx.New(
		cfg.APIRoot,
		cfg.Timeout,
		cfg.Debug,
		state.stderr,
		fmt.Sprintf("cosmic-index-cli/%s", strings.TrimSpace(state.version)),
	)
	return nil
}
