package commands

import (
	"encoding/json"
	"fmt"
	"net/url"
	"strings"

	"cosmic-index/cli/internal/api"
	"cosmic-index/cli/internal/output"

	"github.com/spf13/cobra"
)

type starSearchOptions struct {
	query         string
	spectralClass string
	minPlanets    int
	multiPlanet   bool
	maxDistancePc float64
	sort          string
	order         string
	page          int
	limit         int
}

func newSearchStarsCommand(state *runtime) *cobra.Command {
	opts := &starSearchOptions{
		page:  defaultPage,
		limit: defaultLimit,
	}

	cmd := &cobra.Command{
		Use:     "stars",
		Aliases: []string{"star"},
		Short:   "Search stars",
		RunE: func(cmd *cobra.Command, args []string) error {
			query, err := buildStarQuery(cmd, opts)
			if err != nil {
				return usageError(err.Error())
			}

			body, _, _, err := state.client.Get(resolveContext(cmd), "/stars", query)
			if err != nil {
				return apiError(err)
			}

			if state.cfg.Output == "json" {
				return writeJSONRaw(state.stdout, body)
			}

			var envelope api.PaginatedEnvelope[api.StarData]
			if err := json.Unmarshal(body, &envelope); err != nil {
				return apiError(fmt.Errorf("failed to decode star response: %w", err))
			}

			if err := output.PrintStarTable(state.stdout, envelope.Data); err != nil {
				return apiError(err)
			}
			return output.PrintPaginationSummary(state.stderr, envelope.Pagination)
		},
	}

	cmd.Flags().StringVarP(&opts.query, "query", "q", "", "Free-text search query")
	cmd.Flags().StringVar(&opts.spectralClass, "spectral-class", "", "Spectral class: O|B|A|F|G|K|M")
	cmd.Flags().IntVar(&opts.minPlanets, "min-planets", 0, "Minimum number of planets")
	cmd.Flags().BoolVar(&opts.multiPlanet, "multi-planet", false, "Filter to multi-planet systems")
	cmd.Flags().Float64Var(&opts.maxDistancePc, "max-distance", 0, "Maximum distance in parsecs")
	cmd.Flags().StringVar(&opts.sort, "sort", "", "Sort by: name|distance|brightness|vmag|planets|planets-desc")
	cmd.Flags().StringVar(&opts.order, "order", "", "Sort order: asc|desc")
	cmd.Flags().IntVarP(&opts.page, "page", "p", defaultPage, "Page number")
	cmd.Flags().IntVarP(&opts.limit, "limit", "n", defaultLimit, "Results per page (max 48)")

	return cmd
}

func buildStarQuery(cmd *cobra.Command, opts *starSearchOptions) (url.Values, error) {
	if opts.page < 1 {
		return nil, fmt.Errorf("page must be at least 1")
	}
	if opts.limit < 1 || opts.limit > maxLimit {
		return nil, fmt.Errorf("limit must be between 1 and %d", maxLimit)
	}
	if cmd.Flags().Changed("min-planets") && opts.minPlanets < 1 {
		return nil, fmt.Errorf("min-planets must be at least 1")
	}
	if cmd.Flags().Changed("max-distance") && opts.maxDistancePc <= 0 {
		return nil, fmt.Errorf("max-distance must be greater than 0")
	}
	if cmd.Flags().Changed("spectral-class") {
		switch strings.ToUpper(opts.spectralClass) {
		case "O", "B", "A", "F", "G", "K", "M":
		default:
			return nil, fmt.Errorf("invalid spectral-class: %s", opts.spectralClass)
		}
	}

	mappedSort := mapStarSort(opts.sort)
	if opts.sort != "" && mappedSort == "" {
		return nil, fmt.Errorf("invalid sort: %s", opts.sort)
	}
	if opts.order != "" && opts.order != "asc" && opts.order != "desc" {
		return nil, fmt.Errorf("invalid order: %s", opts.order)
	}

	query := url.Values{}
	setIfNotEmpty(query, "query", opts.query)
	if cmd.Flags().Changed("spectral-class") {
		setIfNotEmpty(query, "spectralClass", strings.ToUpper(opts.spectralClass))
	}
	if cmd.Flags().Changed("min-planets") {
		setInt(query, "minPlanets", opts.minPlanets)
	}
	setBoolIfTrue(query, "multiPlanet", cmd.Flags().Changed("multi-planet"), opts.multiPlanet)
	if cmd.Flags().Changed("max-distance") {
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

func mapStarSort(sort string) string {
	switch strings.ToLower(strings.TrimSpace(sort)) {
	case "":
		return ""
	case "name":
		return "name"
	case "distance":
		return "distance"
	case "brightness", "vmag":
		return "vmag"
	case "planets":
		return "planetCount"
	case "planets-desc":
		return "planetCountDesc"
	default:
		return ""
	}
}
