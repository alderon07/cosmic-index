package output

import (
	"fmt"
	"io"
	"text/tabwriter"

	"cosmic-index/cli/internal/api"
)

type tableColumnSpec[T any] struct {
	key    string
	header string
	value  func(T) string
}

func ExoplanetTableColumnKeys() []string {
	return []string{"id", "name", "year", "method", "dist-pc"}
}

func StarTableColumnKeys() []string {
	return []string{"id", "name", "planets", "spectral", "dist-pc"}
}

func SmallBodyTableColumnKeys() []string {
	return []string{"id", "name", "kind", "orbit", "neo", "pha"}
}

func CloseApproachTableColumnKeys() []string {
	return []string{"designation", "approach-time", "dist-ld", "vel-km-s", "h", "pha"}
}

func FireballTableColumnKeys() []string {
	return []string{"date", "radiated-j-x1e10", "impact-kt", "lat", "lon", "alt-km", "vel-km-s", "complete"}
}

func ApodTableColumnKeys() []string {
	return []string{"date", "title", "media-type", "media-url", "hd-url", "thumbnail-url", "copyright", "explanation"}
}

func PrintExoplanetTable(w io.Writer, rows []api.ExoplanetData, columns []string) error {
	specs, err := selectTableColumns(exoplanetColumnSpecs(), columns)
	if err != nil {
		return err
	}

	tw := tabwriter.NewWriter(w, 2, 4, 2, ' ', 0)
	if err := writeTableHeaders(tw, specs); err != nil {
		return err
	}
	for _, row := range rows {
		if err := writeTableRow(tw, specs, row); err != nil {
			return err
		}
	}
	return tw.Flush()
}

func PrintStarTable(w io.Writer, rows []api.StarData, columns []string) error {
	specs, err := selectTableColumns(starColumnSpecs(), columns)
	if err != nil {
		return err
	}

	tw := tabwriter.NewWriter(w, 2, 4, 2, ' ', 0)
	if err := writeTableHeaders(tw, specs); err != nil {
		return err
	}
	for _, row := range rows {
		if err := writeTableRow(tw, specs, row); err != nil {
			return err
		}
	}
	return tw.Flush()
}

func PrintSmallBodyTable(w io.Writer, rows []api.SmallBodyData, columns []string) error {
	specs, err := selectTableColumns(smallBodyColumnSpecs(), columns)
	if err != nil {
		return err
	}

	tw := tabwriter.NewWriter(w, 2, 4, 2, ' ', 0)
	if err := writeTableHeaders(tw, specs); err != nil {
		return err
	}
	for _, row := range rows {
		if err := writeTableRow(tw, specs, row); err != nil {
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

func PrintApodTable(w io.Writer, apod api.APODData, fullText bool, columns []string) error {
	explanation := apod.Explanation
	if !fullText {
		explanation = truncate(explanation, 240)
	}
	specs, err := selectTableColumns(apodColumnSpecs(explanation), columns)
	if err != nil {
		return err
	}

	tw := tabwriter.NewWriter(w, 2, 4, 2, ' ', 0)
	if err := writeTableHeaders(tw, specs); err != nil {
		return err
	}
	if err := writeTableRow(tw, specs, apod); err != nil {
		return err
	}
	return tw.Flush()
}

func PrintCloseApproachesTable(w io.Writer, rows []api.CloseApproach, columns []string) error {
	specs, err := selectTableColumns(closeApproachColumnSpecs(), columns)
	if err != nil {
		return err
	}

	tw := tabwriter.NewWriter(w, 2, 4, 2, ' ', 0)
	if err := writeTableHeaders(tw, specs); err != nil {
		return err
	}
	for _, row := range rows {
		if err := writeTableRow(tw, specs, row); err != nil {
			return err
		}
	}
	return tw.Flush()
}

func PrintFireballsTable(w io.Writer, rows []api.FireballEvent, columns []string) error {
	specs, err := selectTableColumns(fireballColumnSpecs(), columns)
	if err != nil {
		return err
	}

	tw := tabwriter.NewWriter(w, 2, 4, 2, ' ', 0)
	if err := writeTableHeaders(tw, specs); err != nil {
		return err
	}
	for _, row := range rows {
		if err := writeTableRow(tw, specs, row); err != nil {
			return err
		}
	}
	return tw.Flush()
}

func exoplanetColumnSpecs() []tableColumnSpec[api.ExoplanetData] {
	return []tableColumnSpec[api.ExoplanetData]{
		{key: "id", header: "ID", value: func(row api.ExoplanetData) string { return row.ID }},
		{key: "name", header: "NAME", value: func(row api.ExoplanetData) string { return row.DisplayName }},
		{key: "year", header: "YEAR", value: func(row api.ExoplanetData) string { return formatInt(row.DiscoveredYear) }},
		{key: "method", header: "METHOD", value: func(row api.ExoplanetData) string { return fallback(row.DiscoveryMethod) }},
		{key: "dist-pc", header: "DIST_PC", value: func(row api.ExoplanetData) string { return formatFloat(row.DistanceParsecs, 1) }},
	}
}

func starColumnSpecs() []tableColumnSpec[api.StarData] {
	return []tableColumnSpec[api.StarData]{
		{key: "id", header: "ID", value: func(row api.StarData) string { return row.ID }},
		{key: "name", header: "NAME", value: func(row api.StarData) string { return row.DisplayName }},
		{key: "planets", header: "PLANETS", value: func(row api.StarData) string { return fmt.Sprintf("%d", row.PlanetCount) }},
		{key: "spectral", header: "SPECTRAL", value: func(row api.StarData) string {
			spectral := row.SpectralClass
			if spectral == "" {
				spectral = row.SpectralType
			}
			return fallback(spectral)
		}},
		{key: "dist-pc", header: "DIST_PC", value: func(row api.StarData) string { return formatFloat(row.DistanceParsecs, 1) }},
	}
}

func smallBodyColumnSpecs() []tableColumnSpec[api.SmallBodyData] {
	return []tableColumnSpec[api.SmallBodyData]{
		{key: "id", header: "ID", value: func(row api.SmallBodyData) string { return row.ID }},
		{key: "name", header: "NAME", value: func(row api.SmallBodyData) string { return row.DisplayName }},
		{key: "kind", header: "KIND", value: func(row api.SmallBodyData) string { return fallback(row.BodyKind) }},
		{key: "orbit", header: "ORBIT", value: func(row api.SmallBodyData) string { return fallback(row.OrbitClass) }},
		{key: "neo", header: "NEO", value: func(row api.SmallBodyData) string { return fmt.Sprintf("%t", row.IsNeo) }},
		{key: "pha", header: "PHA", value: func(row api.SmallBodyData) string { return fmt.Sprintf("%t", row.IsPha) }},
	}
}

func closeApproachColumnSpecs() []tableColumnSpec[api.CloseApproach] {
	return []tableColumnSpec[api.CloseApproach]{
		{key: "designation", header: "DESIGNATION", value: func(row api.CloseApproach) string { return truncate(row.Designation, 40) }},
		{key: "approach-time", header: "APPROACH_TIME", value: func(row api.CloseApproach) string { return row.ApproachTimeRaw }},
		{key: "dist-ld", header: "DIST_LD", value: func(row api.CloseApproach) string { return fmt.Sprintf("%.2f", row.DistanceLd) }},
		{key: "vel-km-s", header: "VEL_KM_S", value: func(row api.CloseApproach) string { return fmt.Sprintf("%.2f", row.RelativeVelocityKm) }},
		{key: "h", header: "H", value: func(row api.CloseApproach) string { return fmt.Sprintf("%.1f", row.AbsoluteMagnitude) }},
		{key: "pha", header: "PHA", value: func(row api.CloseApproach) string { return formatOptionalBool(row.IsPha) }},
	}
}

func fireballColumnSpecs() []tableColumnSpec[api.FireballEvent] {
	return []tableColumnSpec[api.FireballEvent]{
		{key: "date", header: "DATE", value: func(row api.FireballEvent) string { return truncate(row.Date, 24) }},
		{key: "radiated-j-x1e10", header: "RADIATED_J_x1e10", value: func(row api.FireballEvent) string { return fmt.Sprintf("%.2f", row.RadiatedEnergy) }},
		{key: "impact-kt", header: "IMPACT_KT", value: func(row api.FireballEvent) string { return formatFloat(row.ImpactEnergyKt, 2) }},
		{key: "lat", header: "LAT", value: func(row api.FireballEvent) string { return formatFloat(row.Latitude, 2) }},
		{key: "lon", header: "LON", value: func(row api.FireballEvent) string { return formatFloat(row.Longitude, 2) }},
		{key: "alt-km", header: "ALT_KM", value: func(row api.FireballEvent) string { return formatFloat(row.AltitudeKm, 2) }},
		{key: "vel-km-s", header: "VEL_KM_S", value: func(row api.FireballEvent) string { return formatFloat(row.VelocityKmS, 2) }},
		{key: "complete", header: "COMPLETE", value: func(row api.FireballEvent) string { return fmt.Sprintf("%t", row.IsComplete) }},
	}
}

func apodColumnSpecs(explanation string) []tableColumnSpec[api.APODData] {
	return []tableColumnSpec[api.APODData]{
		{key: "date", header: "DATE", value: func(apod api.APODData) string { return apod.Date }},
		{key: "title", header: "TITLE", value: func(apod api.APODData) string { return truncate(apod.Title, 80) }},
		{key: "media-type", header: "MEDIA_TYPE", value: func(apod api.APODData) string { return fallback(apod.MediaType) }},
		{key: "media-url", header: "MEDIA_URL", value: func(apod api.APODData) string { return fallback(apod.ImageURL) }},
		{key: "hd-url", header: "HD_URL", value: func(apod api.APODData) string { return fallback(apod.ImageURLHD) }},
		{key: "thumbnail-url", header: "THUMBNAIL_URL", value: func(apod api.APODData) string { return fallback(apod.ThumbnailURL) }},
		{key: "copyright", header: "COPYRIGHT", value: func(apod api.APODData) string { return fallback(apod.Copyright) }},
		{key: "explanation", header: "EXPLANATION", value: func(apod api.APODData) string { return fallback(explanation) }},
	}
}

func writeTableHeaders[T any](tw *tabwriter.Writer, specs []tableColumnSpec[T]) error {
	for i, spec := range specs {
		if i == 0 {
			if _, err := fmt.Fprint(tw, spec.header); err != nil {
				return err
			}
			continue
		}
		if _, err := fmt.Fprintf(tw, "\t%s", spec.header); err != nil {
			return err
		}
	}
	_, err := fmt.Fprintln(tw)
	return err
}

func writeTableRow[T any](tw *tabwriter.Writer, specs []tableColumnSpec[T], row T) error {
	for i, spec := range specs {
		value := spec.value(row)
		if i == 0 {
			if _, err := fmt.Fprint(tw, value); err != nil {
				return err
			}
			continue
		}
		if _, err := fmt.Fprintf(tw, "\t%s", value); err != nil {
			return err
		}
	}
	_, err := fmt.Fprintln(tw)
	return err
}

func selectTableColumns[T any](all []tableColumnSpec[T], selected []string) ([]tableColumnSpec[T], error) {
	if len(selected) == 0 {
		return all, nil
	}

	index := make(map[string]tableColumnSpec[T], len(all))
	for _, spec := range all {
		index[spec.key] = spec
	}

	resolved := make([]tableColumnSpec[T], 0, len(selected))
	for _, key := range selected {
		spec, ok := index[key]
		if !ok {
			return nil, fmt.Errorf("unknown column key: %s", key)
		}
		resolved = append(resolved, spec)
	}
	return resolved, nil
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
