package commands

import (
	"encoding/json"
	"fmt"
	"net/url"

	"cosmic-index/cli/internal/api"
	"cosmic-index/cli/internal/output"

	"github.com/spf13/cobra"
)

type closeApproachOptions struct {
	dateMin   string
	dateMax   string
	distMaxLd float64
	phaOnly   bool
	sort      string
	order     string
	limit     int
	columns   string
}

func newCloseApproachesCommand(state *runtime) *cobra.Command {
	opts := &closeApproachOptions{}

	cmd := &cobra.Command{
		Use:   "close-approaches",
		Short: "List close approach events",
		PreRunE: func(cmd *cobra.Command, args []string) error {
			return state.initClient()
		},
		RunE: func(cmd *cobra.Command, args []string) error {
			var selectedColumns []string
			if state.cfg.Output == "table" {
				selected, err := parseColumnsFlag(opts.columns, "close-approaches", output.CloseApproachTableColumnKeys())
				if err != nil {
					return usageError(err.Error())
				}
				selectedColumns = selected
			}

			query, err := buildCloseApproachQuery(cmd, opts)
			if err != nil {
				return usageError(err.Error())
			}

			body, _, _, err := state.client.Get(resolveContext(cmd), "/close-approaches", query)
			if err != nil {
				return apiError(err)
			}

			if state.cfg.Output == "json" {
				return writeJSONRaw(state.stdout, body)
			}

			var envelope struct {
				Data       []api.CloseApproach `json:"data"`
				Pagination api.Pagination      `json:"pagination"`
				Meta       map[string]any      `json:"meta"`
			}
			if err := json.Unmarshal(body, &envelope); err != nil {
				return apiError(fmt.Errorf("failed to decode close-approaches response: %w", err))
			}

			if err := output.PrintCloseApproachesTable(state.stdout, envelope.Data, selectedColumns); err != nil {
				return apiError(err)
			}

			summary := "count=- limitApplied=- phaFilterApplied=-"
			if count, ok := metaInt(envelope.Meta, "count"); ok {
				summary = fmt.Sprintf("count=%d", count)
			} else {
				summary = "count=-"
			}
			if limit, ok := metaInt(envelope.Meta, "limitApplied"); ok {
				summary += fmt.Sprintf(" limitApplied=%d", limit)
			} else {
				summary += " limitApplied=-"
			}
			if pha, ok := metaBool(envelope.Meta, "phaFilterApplied"); ok {
				summary += fmt.Sprintf(" phaFilterApplied=%t", pha)
			} else {
				summary += " phaFilterApplied=-"
			}
			_, err = fmt.Fprintln(state.stderr, summary)
			return err
		},
	}

	cmd.Flags().StringVar(&opts.dateMin, "date-min", "", "Start date/token (supports relative values like now)")
	cmd.Flags().StringVar(&opts.dateMax, "date-max", "", "End date/token (supports relative values like +60)")
	cmd.Flags().Float64Var(&opts.distMaxLd, "dist-max-ld", 0, "Maximum approach distance in lunar distances")
	cmd.Flags().BoolVar(&opts.phaOnly, "pha-only", false, "Only potentially hazardous asteroids")
	cmd.Flags().StringVar(&opts.sort, "sort", "", "Sort by: date|dist|h|v-rel")
	cmd.Flags().StringVar(&opts.order, "order", "", "Sort order: asc|desc (requires --sort)")
	cmd.Flags().StringVar(&opts.columns, "columns", "", "Table columns: designation,approach-time,dist-ld,vel-km-s,h,pha")
	cmd.Flags().IntVarP(&opts.limit, "limit", "n", 0, "Maximum number of events (1..200)")
	return cmd
}

func buildCloseApproachQuery(cmd *cobra.Command, opts *closeApproachOptions) (url.Values, error) {
	if err := requireSortIfOrderSet(opts.sort, opts.order); err != nil {
		return nil, err
	}

	if cmd.Flags().Changed("dist-max-ld") && opts.distMaxLd <= 0 {
		return nil, fmt.Errorf("dist-max-ld must be greater than 0")
	}
	if cmd.Flags().Changed("limit") && (opts.limit < 1 || opts.limit > 200) {
		return nil, fmt.Errorf("limit must be between 1 and 200")
	}
	if opts.sort != "" {
		switch opts.sort {
		case "date", "dist", "h", "v-rel":
		default:
			return nil, fmt.Errorf("invalid sort: %s", opts.sort)
		}
	}
	if opts.order != "" && opts.order != "asc" && opts.order != "desc" {
		return nil, fmt.Errorf("invalid order: %s", opts.order)
	}

	query := url.Values{}
	setIfNotEmpty(query, "dateMin", opts.dateMin)
	setIfNotEmpty(query, "dateMax", opts.dateMax)
	if cmd.Flags().Changed("dist-max-ld") {
		setFloat(query, "distMaxLd", opts.distMaxLd)
	}
	setBoolIfTrue(query, "phaOnly", cmd.Flags().Changed("pha-only"), opts.phaOnly)
	setIfNotEmpty(query, "sort", opts.sort)
	setIfNotEmpty(query, "order", opts.order)
	if cmd.Flags().Changed("limit") {
		setInt(query, "limit", opts.limit)
	}
	return query, nil
}
