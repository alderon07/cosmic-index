package commands

import (
	"encoding/json"
	"fmt"

	"cosmic-index/cli/internal/api"
	"cosmic-index/cli/internal/ids"
	"cosmic-index/cli/internal/output"

	"github.com/spf13/cobra"
)

func newGetSmallBodyCommand(state *runtime) *cobra.Command {
	return &cobra.Command{
		Use:     "small-bodies <id>",
		Aliases: []string{"sb", "smallbodies", "small-body"},
		Short:   "Get a small body by id",
		Args:    cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			normalizedID, err := ids.Normalize(args[0])
			if err != nil {
				return usageError(err.Error())
			}

			body, _, _, err := state.client.Get(resolveContext(cmd), "/small-bodies/"+normalizedID, nil)
			if err != nil {
				return apiError(err)
			}

			if state.cfg.Output == "json" {
				return writeJSONRaw(state.stdout, body)
			}

			var envelope api.DetailEnvelope[api.SmallBodyData]
			if err := json.Unmarshal(body, &envelope); err != nil {
				return apiError(fmt.Errorf("failed to decode small-body response: %w", err))
			}
			return output.PrintSmallBodyFactSheet(state.stdout, envelope.Data)
		},
	}
}
