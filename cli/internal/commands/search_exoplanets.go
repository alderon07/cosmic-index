package commands

import (
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"strings"

	"cosmic-index/cli/internal/api"
	"cosmic-index/cli/internal/output"

	"github.com/spf13/cobra"
)

type exoplanetSearchOptions struct {
	query           string
	discoveryMethod string
	year            int
	hasRadius       bool
	hasMass         bool
	sizeCategory    string
	habitable       bool
	facility        string
	multiPlanet     bool
	maxDistancePc   float64
	sort            string
	order           string
	page            int
	limit           int
	columns         string
}

func newSearchExoplanetsCommand(state *runtime) *cobra.Command {
	opts := &exoplanetSearchOptions{
		page:  defaultPage,
		limit: defaultLimit,
	}

	cmd := &cobra.Command{
		Use:     "exoplanets",
		Aliases: []string{"exo", "exoplanet"},
		Short:   "Search exoplanets",
		RunE: func(cmd *cobra.Command, args []string) error {
			var selectedColumns []string
			if state.cfg.Output == "table" {
				selected, err := parseColumnsFlag(opts.columns, "search exoplanets", output.ExoplanetTableColumnKeys())
				if err != nil {
					return usageError(err.Error())
				}
				selectedColumns = selected
			}

			query, err := buildExoplanetQuery(cmd, opts)
			if err != nil {
				return usageError(err.Error())
			}

			body, _, _, err := state.client.Get(resolveContext(cmd), "/exoplanets", query)
			if err != nil {
				return apiError(err)
			}

			if state.cfg.Output == "json" {
				return writeJSONRaw(state.stdout, body)
			}

			var envelope api.PaginatedEnvelope[api.ExoplanetData]
			if err := json.Unmarshal(body, &envelope); err != nil {
				return apiError(fmt.Errorf("failed to decode exoplanet response: %w", err))
			}

			if err := output.PrintExoplanetTable(state.stdout, envelope.Data, selectedColumns); err != nil {
				return apiError(err)
			}
			return output.PrintPaginationSummary(state.stderr, envelope.Pagination)
		},
	}

	cmd.Flags().StringVarP(&opts.query, "query", "q", "", "Free-text search query")
	cmd.Flags().StringVar(&opts.discoveryMethod, "method", "", "Discovery method filter (e.g. Transit)")
	cmd.Flags().StringVar(&opts.discoveryMethod, "discovery-method", "", "Alias for --method")
	cmd.Flags().BoolVar(&opts.hasRadius, "has-radius", false, "Filter to exoplanets with radius data")
	cmd.Flags().BoolVar(&opts.hasMass, "has-mass", false, "Filter to exoplanets with mass data")
	cmd.Flags().StringVar(&opts.sizeCategory, "size", "", "Size category: earth|super-earth|neptune|jupiter")
	cmd.Flags().StringVar(&opts.sizeCategory, "size-category", "", "Alias for --size")
	cmd.Flags().BoolVar(&opts.habitable, "habitable", false, "Filter to potentially habitable exoplanets")
	cmd.Flags().StringVar(&opts.facility, "facility", "", "Discovery facility filter")
	cmd.Flags().BoolVar(&opts.multiPlanet, "multi-planet", false, "Filter to multi-planet systems")
	cmd.Flags().Float64Var(&opts.maxDistancePc, "max-distance", 0, "Maximum distance in parsecs")
	cmd.Flags().Float64Var(&opts.maxDistancePc, "max-distance-pc", 0, "Alias for --max-distance")
	cmd.Flags().IntVar(&opts.year, "year", 0, "Discovery year")
	cmd.Flags().StringVar(&opts.sort, "sort", "", "Sort by: name|year|discovered|distance|radius|mass")
	cmd.Flags().StringVar(&opts.order, "order", "", "Sort order: asc|desc")
	cmd.Flags().StringVar(&opts.columns, "columns", "", "Table columns: id,name,year,method,dist-pc")
	cmd.Flags().IntVarP(&opts.page, "page", "p", defaultPage, "Page number")
	cmd.Flags().IntVarP(&opts.limit, "limit", "n", defaultLimit, "Results per page (max 48)")
	_ = cmd.Flags().MarkHidden("discovery-method")
	_ = cmd.Flags().MarkHidden("size-category")
	_ = cmd.Flags().MarkHidden("max-distance-pc")

	return cmd
}

func buildExoplanetQuery(cmd *cobra.Command, opts *exoplanetSearchOptions) (url.Values, error) {
	if opts.page < 1 {
		return nil, fmt.Errorf("page must be at least 1")
	}
	if opts.limit < 1 || opts.limit > maxLimit {
		return nil, fmt.Errorf("limit must be between 1 and %d", maxLimit)
	}
	if cmd.Flags().Changed("year") && (opts.year < 1900 || opts.year > 2100) {
		return nil, fmt.Errorf("year must be between 1900 and 2100")
	}
	if cmd.Flags().Changed("max-distance") && opts.maxDistancePc <= 0 {
		return nil, fmt.Errorf("max-distance must be greater than 0")
	}
	if cmd.Flags().Changed("size") {
		switch strings.ToLower(opts.sizeCategory) {
		case "earth", "super-earth", "neptune", "jupiter":
		default:
			return nil, fmt.Errorf("invalid size: %s", opts.sizeCategory)
		}
	}

	mappedSort := mapExoplanetSort(opts.sort)
	if opts.sort != "" && mappedSort == "" {
		return nil, fmt.Errorf("invalid sort: %s", opts.sort)
	}
	if opts.order != "" && opts.order != "asc" && opts.order != "desc" {
		return nil, fmt.Errorf("invalid order: %s", opts.order)
	}

	query := url.Values{}
	setIfNotEmpty(query, "query", opts.query)
	if cmd.Flags().Changed("method") || cmd.Flags().Changed("discovery-method") {
		setIfNotEmpty(query, "discoveryMethod", opts.discoveryMethod)
	}
	if cmd.Flags().Changed("year") {
		setInt(query, "year", opts.year)
	}
	setBoolIfTrue(query, "hasRadius", cmd.Flags().Changed("has-radius"), opts.hasRadius)
	setBoolIfTrue(query, "hasMass", cmd.Flags().Changed("has-mass"), opts.hasMass)
	if cmd.Flags().Changed("size") || cmd.Flags().Changed("size-category") {
		setIfNotEmpty(query, "sizeCategory", strings.ToLower(opts.sizeCategory))
	}
	setBoolIfTrue(query, "habitable", cmd.Flags().Changed("habitable"), opts.habitable)
	setBoolIfTrue(query, "multiPlanet", cmd.Flags().Changed("multi-planet"), opts.multiPlanet)
	setIfNotEmpty(query, "facility", opts.facility)
	if cmd.Flags().Changed("max-distance") || cmd.Flags().Changed("max-distance-pc") {
		setFloat(query, "maxDistancePc", opts.maxDistancePc)
	}
	if mappedSort != "" {
		setIfNotEmpty(query, "sort", mappedSort)
	}
	setIfNotEmpty(query, "order", opts.order)
	setInt(query, "page", opts.page)
	setInt(query, "limit", opts.limit)

	return query, nil
}

func mapExoplanetSort(sort string) string {
	switch strings.ToLower(strings.TrimSpace(sort)) {
	case "":
		return ""
	case "name":
		return "name"
	case "year", "discovered":
		return "discovered"
	case "distance":
		return "distance"
	case "radius":
		return "radius"
	case "mass":
		return "mass"
	default:
		return ""
	}
}

func resolveContext(cmd *cobra.Command) context.Context {
	if cmd.Context() != nil {
		return cmd.Context()
	}
	return context.Background()
}
