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

func PrintApodTable(w io.Writer, apod api.APODData, fullText bool) error {
	explanation := apod.Explanation
	if !fullText {
		explanation = truncate(explanation, 240)
	}
	tw := tabwriter.NewWriter(w, 2, 4, 2, ' ', 0)
	if _, err := fmt.Fprintln(tw, "DATE\tTITLE\tMEDIA_TYPE\tMEDIA_URL\tHD_URL\tTHUMBNAIL_URL\tCOPYRIGHT\tEXPLANATION"); err != nil {
		return err
	}
	if _, err := fmt.Fprintf(
		tw,
		"%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n",
		apod.Date,
		truncate(apod.Title, 80),
		fallback(apod.MediaType),
		fallback(apod.ImageURL),
		fallback(apod.ImageURLHD),
		fallback(apod.ThumbnailURL),
		fallback(apod.Copyright),
		fallback(explanation),
	); err != nil {
		return err
	}
	return tw.Flush()
}

func PrintCloseApproachesTable(w io.Writer, rows []api.CloseApproach) error {
	tw := tabwriter.NewWriter(w, 2, 4, 2, ' ', 0)
	if _, err := fmt.Fprintln(tw, "DESIGNATION\tAPPROACH_TIME\tDIST_LD\tVEL_KM_S\tH\tPHA"); err != nil {
		return err
	}
	for _, row := range rows {
		if _, err := fmt.Fprintf(
			tw,
			"%s\t%s\t%.2f\t%.2f\t%.1f\t%s\n",
			truncate(row.Designation, 40),
			row.ApproachTimeRaw,
			row.DistanceLd,
			row.RelativeVelocityKm,
			row.AbsoluteMagnitude,
			formatOptionalBool(row.IsPha),
		); err != nil {
			return err
		}
	}
	return tw.Flush()
}

func PrintFireballsTable(w io.Writer, rows []api.FireballEvent) error {
	tw := tabwriter.NewWriter(w, 2, 4, 2, ' ', 0)
	if _, err := fmt.Fprintln(tw, "DATE\tRADIATED_J_x1e10\tIMPACT_KT\tLAT\tLON\tALT_KM\tVEL_KM_S\tCOMPLETE"); err != nil {
		return err
	}
	for _, row := range rows {
		if _, err := fmt.Fprintf(
			tw,
			"%s\t%.2f\t%s\t%s\t%s\t%s\t%s\t%t\n",
			truncate(row.Date, 24),
			row.RadiatedEnergy,
			formatFloat(row.ImpactEnergyKt, 2),
			formatFloat(row.Latitude, 2),
			formatFloat(row.Longitude, 2),
			formatFloat(row.AltitudeKm, 2),
			formatFloat(row.VelocityKmS, 2),
			row.IsComplete,
		); err != nil {
			return err
		}
	}
	return tw.Flush()
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

func truncate(value string, max int) string {
	if max <= 0 || len(value) <= max {
		return value
	}
	if max <= 1 {
		return value[:max]
	}
	return value[:max-1] + "..."
}

func formatOptionalBool(value *bool) string {
	if value == nil {
		return "-"
	}
	return fmt.Sprintf("%t", *value)
}
