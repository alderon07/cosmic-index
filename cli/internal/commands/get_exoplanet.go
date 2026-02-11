package commands

import (
	"encoding/json"
	"fmt"

	"cosmic-index/cli/internal/api"
	"cosmic-index/cli/internal/ids"
	"cosmic-index/cli/internal/output"

	"github.com/spf13/cobra"
)

func newGetExoplanetCommand(state *runtime) *cobra.Command {
	return &cobra.Command{
		Use:     "exoplanets <id>",
		Aliases: []string{"exo", "exoplanet"},
		Short:   "Get an exoplanet by id",
		Args:    cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			normalizedID, err := ids.Normalize(args[0])
			if err != nil {
				return usageError(err.Error())
			}

			body, _, _, err := state.client.Get(resolveContext(cmd), "/exoplanets/"+normalizedID, nil)
			if err != nil {
				return apiError(err)
			}

			if state.cfg.Output == "json" {
				return writeJSONRaw(state.stdout, body)
			}

			var envelope api.DetailEnvelope[api.ExoplanetData]
			if err := json.Unmarshal(body, &envelope); err != nil {
				return apiError(fmt.Errorf("failed to decode exoplanet response: %w", err))
			}
			return output.PrintExoplanetFactSheet(state.stdout, envelope.Data)
		},
	}
}
