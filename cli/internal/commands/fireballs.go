package commands

import (
	"encoding/json"
	"fmt"
	"net/url"
	"time"

	"cosmic-index/cli/internal/api"
	"cosmic-index/cli/internal/output"

	"github.com/spf13/cobra"
)

type fireballOptions struct {
	dateMin string
	dateMax string
	reqLoc  bool
	reqAlt  bool
	reqVel  bool
	sort    string
	order   string
	limit   int
	columns string
	noTrunc bool
}

func newFireballsCommand(state *runtime) *cobra.Command {
	opts := &fireballOptions{}
	cmd := &cobra.Command{
		Use:   "fireballs",
		Short: "List fireball events",
		PreRunE: func(cmd *cobra.Command, args []string) error {
			return state.initClient()
		},
		RunE: func(cmd *cobra.Command, args []string) error {
			var selectedColumns []string
			if state.cfg.Output == "table" {
				selected, err := parseColumnsFlag(opts.columns, "fireballs", output.FireballTableColumnKeys())
				if err != nil {
					return usageError(err.Error())
				}
				selectedColumns = selected
			}

			query, err := buildFireballsQuery(cmd, opts)
			if err != nil {
				return usageError(err.Error())
			}

			body, _, _, err := state.client.Get(resolveContext(cmd), "/fireballs", query)
			if err != nil {
				return apiError(err)
			}

			if state.cfg.Output == "json" {
				return writeJSONRaw(state.stdout, body)
			}

			var envelope struct {
				Data       []api.FireballEvent `json:"data"`
				Pagination api.Pagination      `json:"pagination"`
				Meta       map[string]any      `json:"meta"`
			}
			if err := json.Unmarshal(body, &envelope); err != nil {
				return apiError(fmt.Errorf("failed to decode fireballs response: %w", err))
			}

			if err := output.PrintFireballsTable(
				state.stdout,
				envelope.Data,
				selectedColumns,
				output.TableRenderOptions{NoTrunc: opts.noTrunc},
			); err != nil {
				return apiError(err)
			}

			summary := "count=- limitApplied=-"
			if count, ok := metaInt(envelope.Meta, "count"); ok {
				summary = fmt.Sprintf("count=%d", count)
			}
			if limit, ok := metaInt(envelope.Meta, "limitApplied"); ok {
				summary += fmt.Sprintf(" limitApplied=%d", limit)
			} else {
				summary += " limitApplied=-"
			}
			_, err = fmt.Fprintln(state.stderr, summary)
			return err
		},
	}

	cmd.Flags().StringVar(&opts.dateMin, "date-min", "", "Start date (YYYY-MM-DD)")
	cmd.Flags().StringVar(&opts.dateMax, "date-max", "", "End date (YYYY-MM-DD)")
	cmd.Flags().BoolVar(&opts.reqLoc, "req-loc", false, "Only events with location data")
	cmd.Flags().BoolVar(&opts.reqAlt, "req-alt", false, "Only events with altitude data")
	cmd.Flags().BoolVar(&opts.reqVel, "req-vel", false, "Only events with velocity data")
	cmd.Flags().StringVar(&opts.sort, "sort", "", "Sort by: date|energy|impact-e|vel|alt")
	cmd.Flags().StringVar(&opts.order, "order", "", "Sort order: asc|desc (requires --sort)")
	cmd.Flags().BoolVar(&opts.noTrunc, "no-trunc", false, "Disable truncation of long table fields")
	cmd.Flags().StringVar(&opts.columns, "columns", "", "Table columns: date,radiated-j-x1e10,impact-kt,lat,lon,alt-km,vel-km-s,complete")
	cmd.Flags().IntVarP(&opts.limit, "limit", "n", 0, "Maximum number of events (1..500)")

	return cmd
}

func buildFireballsQuery(cmd *cobra.Command, opts *fireballOptions) (url.Values, error) {
	if err := requireSortIfOrderSet(opts.sort, opts.order); err != nil {
		return nil, err
	}
	if cmd.Flags().Changed("date-min") && !validateDateYYYYMMDD(opts.dateMin) {
		return nil, fmt.Errorf("date-min must be in YYYY-MM-DD format")
	}
	if cmd.Flags().Changed("date-max") && !validateDateYYYYMMDD(opts.dateMax) {
		return nil, fmt.Errorf("date-max must be in YYYY-MM-DD format")
	}
	if cmd.Flags().Changed("date-min") && cmd.Flags().Changed("date-max") {
		minDate, _ := time.Parse("2006-01-02", opts.dateMin)
		maxDate, _ := time.Parse("2006-01-02", opts.dateMax)
		if minDate.After(maxDate) {
			return nil, fmt.Errorf("date-min must be earlier than or equal to date-max")
		}
	}
	if cmd.Flags().Changed("limit") && (opts.limit < 1 || opts.limit > 500) {
		return nil, fmt.Errorf("limit must be between 1 and 500")
	}
	if opts.sort != "" {
		switch opts.sort {
		case "date", "energy", "impact-e", "vel", "alt":
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
	setBoolIfTrue(query, "reqLoc", cmd.Flags().Changed("req-loc"), opts.reqLoc)
	setBoolIfTrue(query, "reqAlt", cmd.Flags().Changed("req-alt"), opts.reqAlt)
	setBoolIfTrue(query, "reqVel", cmd.Flags().Changed("req-vel"), opts.reqVel)
	setIfNotEmpty(query, "sort", opts.sort)
	setIfNotEmpty(query, "order", opts.order)
	if cmd.Flags().Changed("limit") {
		setInt(query, "limit", opts.limit)
	}
	return query, nil
}
