package commands

import (
	"encoding/json"
	"fmt"
	"net/url"

	"cosmic-index/cli/internal/api"
	"cosmic-index/cli/internal/output"

	"github.com/spf13/cobra"
)

type apodOptions struct {
	date     string
	fullText bool
}

func newApodCommand(state *runtime) *cobra.Command {
	opts := &apodOptions{}
	cmd := &cobra.Command{
		Use:   "apod",
		Short: "Get Astronomy Picture of the Day",
		PreRunE: func(cmd *cobra.Command, args []string) error {
			return state.initClient()
		},
		RunE: func(cmd *cobra.Command, args []string) error {
			if cmd.Flags().Changed("date") && !validateDateYYYYMMDD(opts.date) {
				return usageError("date must be in YYYY-MM-DD format")
			}

			query := url.Values{}
			setIfNotEmpty(query, "date", opts.date)

			body, _, _, err := state.client.Get(resolveContext(cmd), "/apod", query)
			if err != nil {
				return apiError(err)
			}

			if state.cfg.Output == "json" {
				return writeJSONRaw(state.stdout, body)
			}

			var envelope api.DetailEnvelope[api.APODData]
			if err := json.Unmarshal(body, &envelope); err != nil {
				return apiError(fmt.Errorf("failed to decode apod response: %w", err))
			}

			return output.PrintApodTable(state.stdout, envelope.Data, opts.fullText)
		},
	}

	cmd.Flags().StringVar(&opts.date, "date", "", "APOD date (YYYY-MM-DD)")
	cmd.Flags().BoolVar(&opts.fullText, "full-text", false, "Show full APOD explanation in table output")
	return cmd
}
