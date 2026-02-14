package commands

import (
	"encoding/json"
	"fmt"
	"sync"

	"cosmic-index/cli/internal/api"
	"cosmic-index/cli/internal/ids"
	"cosmic-index/cli/internal/output"

	"github.com/spf13/cobra"
)

type compareExoplanetResult struct {
	item api.ExoplanetData
	err  error
}

func newCompareExoplanetsCommand(state *runtime) *cobra.Command {
	opts := struct {
		columns string
		noTrunc bool
	}{}

	cmd := &cobra.Command{
		Use:   "exoplanets <id1> <id2> [id3]",
		Short: "Compare exoplanets by key metrics",
		Args:  cobra.RangeArgs(2, 3),
		RunE: func(cmd *cobra.Command, args []string) error {
			var selectedMetricKeys []string
			if state.cfg.Output == "table" {
				selected, err := parseColumnsFlag(opts.columns, "compare exoplanets", output.ExoplanetCompareMetricKeys())
				if err != nil {
					return usageError(err.Error())
				}
				selectedMetricKeys = selected
			}

			normalizedIDs := make([]string, len(args))
			for i := range args {
				normalizedID, err := ids.Normalize(args[i])
				if err != nil {
					return usageError(err.Error())
				}
				normalizedIDs[i] = normalizedID
			}

			results := make([]compareExoplanetResult, len(normalizedIDs))
			var wg sync.WaitGroup
			for i := range normalizedIDs {
				wg.Add(1)
				go func(index int) {
					defer wg.Done()
					body, _, _, err := state.client.Get(resolveContext(cmd), "/exoplanets/"+normalizedIDs[index], nil)
					if err != nil {
						results[index].err = err
						return
					}

					var envelope api.DetailEnvelope[api.ExoplanetData]
					if err := json.Unmarshal(body, &envelope); err != nil {
						results[index].err = fmt.Errorf("failed to decode exoplanet response: %w", err)
						return
					}
					results[index].item = envelope.Data
				}(i)
			}
			wg.Wait()

			items := make([]api.ExoplanetData, 0, len(results))
			for i := range results {
				if results[i].err != nil {
					return apiError(results[i].err)
				}
				items = append(items, results[i].item)
			}

			if state.cfg.Output == "json" {
				payload, err := json.Marshal(output.BuildExoplanetComparePayload(items))
				if err != nil {
					return apiError(err)
				}
				return writeJSONRaw(state.stdout, payload)
			}

			return output.PrintExoplanetCompareTable(
				state.stdout,
				items,
				selectedMetricKeys,
				output.TableRenderOptions{NoTrunc: opts.noTrunc},
			)
		},
	}

	cmd.Flags().BoolVar(&opts.noTrunc, "no-trunc", false, "Disable truncation of long table fields")
	cmd.Flags().StringVar(&opts.columns, "columns", "", "Compare metrics: host-star,radius-earth,mass-earth,orbital-period-days,distance-pc,equilibrium-temp-k,discovery-method,discovery-year,stars-in-system,planets-in-system")
	return cmd
}
