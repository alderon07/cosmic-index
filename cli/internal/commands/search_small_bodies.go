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

type smallBodySearchOptions struct {
	query      string
	kind       string
	neo        bool
	pha        bool
	orbitClass string
	page       int
	limit      int
}

func newSearchSmallBodiesCommand(state *runtime) *cobra.Command {
	opts := &smallBodySearchOptions{
		page:  defaultPage,
		limit: defaultLimit,
	}

	cmd := &cobra.Command{
		Use:     "small-bodies",
		Aliases: []string{"sb", "smallbodies", "small-body"},
		Short:   "Search small bodies",
		RunE: func(cmd *cobra.Command, args []string) error {
			query, err := buildSmallBodyQuery(cmd, opts)
			if err != nil {
				return usageError(err.Error())
			}

			body, _, _, err := state.client.Get(resolveContext(cmd), "/small-bodies", query)
			if err != nil {
				return apiError(err)
			}

			if state.cfg.Output == "json" {
				return writeJSONRaw(state.stdout, body)
			}

			var envelope api.PaginatedEnvelope[api.SmallBodyData]
			if err := json.Unmarshal(body, &envelope); err != nil {
				return apiError(fmt.Errorf("failed to decode small-body response: %w", err))
			}

			if err := output.PrintSmallBodyTable(state.stdout, envelope.Data); err != nil {
				return apiError(err)
			}
			return output.PrintPaginationSummary(state.stderr, envelope.Pagination)
		},
	}

	cmd.Flags().StringVarP(&opts.query, "query", "q", "", "Free-text search query")
	cmd.Flags().StringVar(&opts.kind, "kind", "", "Body kind: asteroid|comet")
	cmd.Flags().BoolVar(&opts.neo, "neo", false, "Filter to near-Earth objects")
	cmd.Flags().BoolVar(&opts.pha, "pha", false, "Filter to potentially hazardous objects")
	cmd.Flags().StringVar(&opts.orbitClass, "orbit-class", "", "Orbit class filter")
	cmd.Flags().IntVarP(&opts.page, "page", "p", defaultPage, "Page number")
	cmd.Flags().IntVarP(&opts.limit, "limit", "n", defaultLimit, "Results per page (max 48)")

	return cmd
}

func buildSmallBodyQuery(cmd *cobra.Command, opts *smallBodySearchOptions) (url.Values, error) {
	if opts.page < 1 {
		return nil, fmt.Errorf("page must be at least 1")
	}
	if opts.limit < 1 || opts.limit > maxLimit {
		return nil, fmt.Errorf("limit must be between 1 and %d", maxLimit)
	}

	kind := strings.ToLower(strings.TrimSpace(opts.kind))
	if cmd.Flags().Changed("kind") {
		if kind != "asteroid" && kind != "comet" {
			return nil, fmt.Errorf("invalid kind: %s", opts.kind)
		}
	}

	query := url.Values{}
	setIfNotEmpty(query, "query", opts.query)
	if cmd.Flags().Changed("kind") {
		setIfNotEmpty(query, "kind", kind)
	}
	setBoolIfTrue(query, "neo", cmd.Flags().Changed("neo"), opts.neo)
	setBoolIfTrue(query, "pha", cmd.Flags().Changed("pha"), opts.pha)
	setIfNotEmpty(query, "orbitClass", opts.orbitClass)
	setInt(query, "page", opts.page)
	setInt(query, "limit", opts.limit)

	return query, nil
}
