package output

import (
	"fmt"
	"io"
	"text/tabwriter"

	"cosmic-index/cli/internal/api"
)

type ComparePayload struct {
	Domain string               `json:"domain"`
	Items  []ComparePayloadItem `json:"items"`
	Rows   []ComparePayloadRow  `json:"rows"`
}

type ComparePayloadItem struct {
	ID          string `json:"id"`
	DisplayName string `json:"displayName"`
}

type ComparePayloadRow struct {
	Key    string                   `json:"key"`
	Label  string                   `json:"label"`
	Values []ComparePayloadRowValue `json:"values"`
}

type ComparePayloadRowValue struct {
	Value string `json:"value"`
	Unit  string `json:"unit,omitempty"`
}

type exoplanetCompareRow struct {
	key   string
	label string
	value func(item api.ExoplanetData) (string, string)
}

func exoplanetCompareRows() []exoplanetCompareRow {
	return []exoplanetCompareRow{
		{
			key:   "host-star",
			label: "Host Star",
			value: func(item api.ExoplanetData) (string, string) {
				return nonEmpty(item.HostStar), ""
			},
		},
		{
			key:   "radius-earth",
			label: "Radius",
			value: func(item api.ExoplanetData) (string, string) {
				return formatFloat(item.RadiusEarth, 2), "Re"
			},
		},
		{
			key:   "mass-earth",
			label: "Mass",
			value: func(item api.ExoplanetData) (string, string) {
				return formatFloat(item.MassEarth, 2), "Me"
			},
		},
		{
			key:   "orbital-period-days",
			label: "Orbital Period",
			value: func(item api.ExoplanetData) (string, string) {
				return formatFloat(item.OrbitalPeriodDays, 2), "days"
			},
		},
		{
			key:   "distance-pc",
			label: "Distance",
			value: func(item api.ExoplanetData) (string, string) {
				return formatFloat(item.DistanceParsecs, 1), "pc"
			},
		},
		{
			key:   "equilibrium-temp-k",
			label: "Eq. Temp",
			value: func(item api.ExoplanetData) (string, string) {
				return formatFloat(item.EquilibriumTempK, 0), "K"
			},
		},
		{
			key:   "discovery-method",
			label: "Discovery Method",
			value: func(item api.ExoplanetData) (string, string) {
				return nonEmpty(item.DiscoveryMethod), ""
			},
		},
		{
			key:   "discovery-year",
			label: "Discovery Year",
			value: func(item api.ExoplanetData) (string, string) {
				return formatInt(item.DiscoveredYear), ""
			},
		},
		{
			key:   "stars-in-system",
			label: "Stars in System",
			value: func(item api.ExoplanetData) (string, string) {
				return formatInt(item.StarsInSystem), ""
			},
		},
		{
			key:   "planets-in-system",
			label: "Planets in System",
			value: func(item api.ExoplanetData) (string, string) {
				return formatInt(item.PlanetsInSystem), ""
			},
		},
	}
}

func ExoplanetCompareMetricKeys() []string {
	return []string{
		"host-star",
		"radius-earth",
		"mass-earth",
		"orbital-period-days",
		"distance-pc",
		"equilibrium-temp-k",
		"discovery-method",
		"discovery-year",
		"stars-in-system",
		"planets-in-system",
	}
}

func PrintExoplanetCompareTable(w io.Writer, items []api.ExoplanetData, metricKeys []string) error {
	rows, err := selectCompareRows(exoplanetCompareRows(), metricKeys)
	if err != nil {
		return err
	}

	tw := tabwriter.NewWriter(w, 2, 4, 2, ' ', 0)
	if _, err := fmt.Fprintf(tw, "METRIC"); err != nil {
		return err
	}
	for _, item := range items {
		if _, err := fmt.Fprintf(tw, "\t%s", truncate(nonEmpty(item.DisplayName), 24)); err != nil {
			return err
		}
	}
	if _, err := fmt.Fprintln(tw); err != nil {
		return err
	}

	for _, row := range rows {
		if _, err := fmt.Fprintf(tw, "%s", row.label); err != nil {
			return err
		}
		for _, item := range items {
			value, unit := row.value(item)
			if value == "" {
				value = "-"
			}
			cell := value
			if value != "-" && unit != "" {
				cell = value + " " + unit
			}
			if _, err := fmt.Fprintf(tw, "\t%s", cell); err != nil {
				return err
			}
		}
		if _, err := fmt.Fprintln(tw); err != nil {
			return err
		}
	}

	return tw.Flush()
}

func BuildExoplanetComparePayload(items []api.ExoplanetData) ComparePayload {
	payload := ComparePayload{
		Domain: "exoplanets",
		Items:  make([]ComparePayloadItem, 0, len(items)),
		Rows:   make([]ComparePayloadRow, 0, len(exoplanetCompareRows())),
	}

	for _, item := range items {
		payload.Items = append(payload.Items, ComparePayloadItem{
			ID:          item.ID,
			DisplayName: item.DisplayName,
		})
	}

	for _, row := range exoplanetCompareRows() {
		payloadRow := ComparePayloadRow{
			Key:    row.key,
			Label:  row.label,
			Values: make([]ComparePayloadRowValue, 0, len(items)),
		}
		for _, item := range items {
			value, unit := row.value(item)
			if value == "" {
				value = "-"
			}
			payloadValue := ComparePayloadRowValue{Value: value}
			if value != "-" && unit != "" {
				payloadValue.Unit = unit
			}
			payloadRow.Values = append(payloadRow.Values, payloadValue)
		}
		payload.Rows = append(payload.Rows, payloadRow)
	}

	return payload
}

func nonEmpty(value string) string {
	if value == "" {
		return "-"
	}
	return value
}

func selectCompareRows(all []exoplanetCompareRow, selected []string) ([]exoplanetCompareRow, error) {
	if len(selected) == 0 {
		return all, nil
	}

	index := make(map[string]exoplanetCompareRow, len(all))
	for _, row := range all {
		index[row.key] = row
	}

	resolved := make([]exoplanetCompareRow, 0, len(selected))
	for _, key := range selected {
		row, ok := index[key]
		if !ok {
			return nil, fmt.Errorf("unknown compare metric key: %s", key)
		}
		resolved = append(resolved, row)
	}
	return resolved, nil
}
