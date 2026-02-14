package output

import (
	"bytes"
	"strings"
	"testing"

	"cosmic-index/cli/internal/api"
)

func TestExoplanetCompareRowsStableOrder(t *testing.T) {
	t.Parallel()

	rows := exoplanetCompareRows()
	if len(rows) != 10 {
		t.Fatalf("expected 10 rows, got %d", len(rows))
	}

	want := []string{
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
	for i := range want {
		if rows[i].key != want[i] {
			t.Fatalf("row %d key=%q want %q", i, rows[i].key, want[i])
		}
	}
}

func TestPrintExoplanetCompareTableMissingAsDash(t *testing.T) {
	t.Parallel()

	itemA := api.ExoplanetData{DisplayName: "Alpha", HostStar: "Host A", DiscoveryMethod: "Transit"}
	itemB := api.ExoplanetData{DisplayName: "Beta", HostStar: "Host B", DiscoveryMethod: "Imaging"}

	var out bytes.Buffer
	if err := PrintExoplanetCompareTable(&out, []api.ExoplanetData{itemA, itemB}, nil, TableRenderOptions{}); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !strings.Contains(out.String(), "Radius") || !strings.Contains(out.String(), "-        -") {
		t.Fatalf("expected at least one missing value fallback, got %q", out.String())
	}
}

func TestPrintExoplanetCompareTableTruncatesHeaderNames(t *testing.T) {
	t.Parallel()

	longName := "This Is A Very Long Exoplanet Name That Should Truncate"
	var out bytes.Buffer
	err := PrintExoplanetCompareTable(&out, []api.ExoplanetData{
		{DisplayName: longName, HostStar: "H1", DiscoveryMethod: "Transit"},
		{DisplayName: "Beta", HostStar: "H2", DiscoveryMethod: "Transit"},
	}, nil, TableRenderOptions{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if strings.Contains(out.String(), longName) {
		t.Fatalf("expected truncated header, got %q", out.String())
	}
}

func TestPrintExoplanetCompareTableMetricFilter(t *testing.T) {
	t.Parallel()

	var out bytes.Buffer
	err := PrintExoplanetCompareTable(&out, []api.ExoplanetData{
		{DisplayName: "Alpha", HostStar: "H1", DiscoveryMethod: "Transit"},
		{DisplayName: "Beta", HostStar: "H2", DiscoveryMethod: "Transit"},
	}, []string{"host-star", "discovery-method"}, TableRenderOptions{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	text := out.String()
	if strings.Contains(text, "Radius") {
		t.Fatalf("expected filtered metrics, got %q", text)
	}
	if !strings.Contains(text, "Host Star") || !strings.Contains(text, "Discovery Method") {
		t.Fatalf("expected selected metrics only, got %q", text)
	}
}

func TestPrintExoplanetCompareTableNoTruncHeader(t *testing.T) {
	t.Parallel()

	longName := "This Is A Very Long Exoplanet Name That Should Not Truncate"
	var out bytes.Buffer
	err := PrintExoplanetCompareTable(&out, []api.ExoplanetData{
		{DisplayName: longName, HostStar: "H1", DiscoveryMethod: "Transit"},
		{DisplayName: "Beta", HostStar: "H2", DiscoveryMethod: "Transit"},
	}, nil, TableRenderOptions{NoTrunc: true})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !strings.Contains(out.String(), longName) {
		t.Fatalf("expected full header name, got %q", out.String())
	}
}

func TestBuildExoplanetComparePayloadAsciiUnits(t *testing.T) {
	t.Parallel()

	radius := 1.5
	mass := 2.25
	payload := BuildExoplanetComparePayload([]api.ExoplanetData{
		{
			ID:              "a",
			DisplayName:     "Alpha",
			HostStar:        "Host A",
			RadiusEarth:     &radius,
			MassEarth:       &mass,
			DiscoveryMethod: "Transit",
		},
		{
			ID:              "b",
			DisplayName:     "Beta",
			HostStar:        "Host B",
			DiscoveryMethod: "Transit",
		},
	})

	if payload.Domain != "exoplanets" {
		t.Fatalf("domain=%q want exoplanets", payload.Domain)
	}
	if len(payload.Rows) < 3 {
		t.Fatalf("expected rows, got %d", len(payload.Rows))
	}

	var foundRadius bool
	var foundMass bool
	for _, row := range payload.Rows {
		if row.Key == "radius-earth" {
			foundRadius = true
			if row.Values[0].Unit != "Re" {
				t.Fatalf("radius unit=%q want Re", row.Values[0].Unit)
			}
		}
		if row.Key == "mass-earth" {
			foundMass = true
			if row.Values[0].Unit != "Me" {
				t.Fatalf("mass unit=%q want Me", row.Values[0].Unit)
			}
		}
	}
	if !foundRadius || !foundMass {
		t.Fatalf("expected radius/mass rows present")
	}
}
