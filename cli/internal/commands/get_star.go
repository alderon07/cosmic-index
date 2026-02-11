package commands

import (
	"encoding/json"
	"fmt"

	"cosmic-index/cli/internal/api"
	"cosmic-index/cli/internal/ids"
	"cosmic-index/cli/internal/output"

	"github.com/spf13/cobra"
)

func newGetStarCommand(state *runtime) *cobra.Command {
	return &cobra.Command{
		Use:     "stars <id>",
		Aliases: []string{"star"},
		Short:   "Get a star by id",
		Args:    cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			normalizedID, err := ids.Normalize(args[0])
			if err != nil {
				return usageError(err.Error())
			}

			body, _, _, err := state.client.Get(resolveContext(cmd), "/stars/"+normalizedID, nil)
			if err != nil {
				return apiError(err)
			}

			if state.cfg.Output == "json" {
				return writeJSONRaw(state.stdout, body)
			}

			var envelope api.DetailEnvelope[api.StarData]
			if err := json.Unmarshal(body, &envelope); err != nil {
				return apiError(fmt.Errorf("failed to decode star response: %w", err))
			}
			return output.PrintStarFactSheet(state.stdout, envelope.Data)
		},
	}
}
