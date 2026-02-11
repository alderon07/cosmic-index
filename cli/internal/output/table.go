package output

import (
	"fmt"
	"io"
	"text/tabwriter"

	"cosmic-index/cli/internal/api"
)

func PrintExoplanetTable(w io.Writer, rows []api.ExoplanetData) error {
	tw := tabwriter.NewWriter(w, 2, 4, 2, ' ', 0)
	if _, err := fmt.Fprintln(tw, "ID\tNAME\tYEAR\tMETHOD\tDIST_PC"); err != nil {
		return err
	}
	for _, row := range rows {
		if _, err := fmt.Fprintf(
			tw,
			"%s\t%s\t%s\t%s\t%s\n",
			row.ID,
			row.DisplayName,
			formatInt(row.DiscoveredYear),
			fallback(row.DiscoveryMethod),
			formatFloat(row.DistanceParsecs, 1),
		); err != nil {
			return err
		}
	}
	return tw.Flush()
}

func PrintStarTable(w io.Writer, rows []api.StarData) error {
	tw := tabwriter.NewWriter(w, 2, 4, 2, ' ', 0)
	if _, err := fmt.Fprintln(tw, "ID\tNAME\tPLANETS\tSPECTRAL\tDIST_PC"); err != nil {
		return err
	}
	for _, row := range rows {
		spectral := row.SpectralClass
		if spectral == "" {
			spectral = row.SpectralType
		}
		if _, err := fmt.Fprintf(
			tw,
			"%s\t%s\t%d\t%s\t%s\n",
			row.ID,
			row.DisplayName,
			row.PlanetCount,
			fallback(spectral),
			formatFloat(row.DistanceParsecs, 1),
		); err != nil {
			return err
		}
	}
	return tw.Flush()
}

func PrintSmallBodyTable(w io.Writer, rows []api.SmallBodyData) error {
	tw := tabwriter.NewWriter(w, 2, 4, 2, ' ', 0)
	if _, err := fmt.Fprintln(tw, "ID\tNAME\tKIND\tORBIT\tNEO\tPHA"); err != nil {
		return err
	}
	for _, row := range rows {
		if _, err := fmt.Fprintf(
			tw,
			"%s\t%s\t%s\t%s\t%t\t%t\n",
			row.ID,
			row.DisplayName,
			fallback(row.BodyKind),
			fallback(row.OrbitClass),
			row.IsNeo,
			row.IsPha,
		); err != nil {
			return err
		}
	}
	return tw.Flush()
}

func PrintPaginationSummary(w io.Writer, pagination api.Pagination) error {
	switch pagination.Mode {
	case "offset":
		page := "-"
		limit := "-"
		total := "-"
		if pagination.Page != nil {
			page = fmt.Sprintf("%d", *pagination.Page)
		}
		if pagination.Limit != nil {
			limit = fmt.Sprintf("%d", *pagination.Limit)
		}
		if pagination.Total != nil {
			total = fmt.Sprintf("%d", *pagination.Total)
		}
		_, err := fmt.Fprintf(w, "page=%s limit=%s total=%s hasMore=%t\n", page, limit, total, pagination.HasMore)
		return err
	case "cursor":
		limit := "-"
		if pagination.Limit != nil {
			limit = fmt.Sprintf("%d", *pagination.Limit)
		}
		next := pagination.NextCursor
		if next == "" {
			next = "-"
		}
		_, err := fmt.Fprintf(w, "mode=cursor limit=%s hasMore=%t nextCursor=%s\n", limit, pagination.HasMore, next)
		return err
	default:
		_, err := fmt.Fprintf(w, "mode=%s hasMore=%t\n", fallback(pagination.Mode), pagination.HasMore)
		return err
	}
}

func formatInt(value *int) string {
	if value == nil {
		return "-"
	}
	return fmt.Sprintf("%d", *value)
}

func formatFloat(value *float64, precision int) string {
	if value == nil {
		return "-"
	}
	format := fmt.Sprintf("%%.%df", precision)
	return fmt.Sprintf(format, *value)
}

func fallback(value string) string {
	if value == "" {
		return "-"
	}
	return value
}
