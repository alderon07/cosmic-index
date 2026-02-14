package output

import (
	"bytes"
	"strings"
	"testing"

	"cosmic-index/cli/internal/api"
)

func TestPrintExoplanetTableColumnsSubsetOrder(t *testing.T) {
	t.Parallel()

	year := 2011
	dist := 120.4
	rows := []api.ExoplanetData{{ID: "kepler-22b", DisplayName: "Kepler22b", DiscoveredYear: &year, DiscoveryMethod: "Transit", DistanceParsecs: &dist}}

	var out bytes.Buffer
	if err := PrintExoplanetTable(&out, rows, []string{"name", "id"}); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	lines := strings.Split(strings.TrimSpace(out.String()), "\n")
	if len(lines) < 2 {
		t.Fatalf("expected at least two lines, got %q", out.String())
	}
	header := strings.Fields(lines[0])
	if len(header) != 2 || header[0] != "NAME" || header[1] != "ID" {
		t.Fatalf("unexpected header: %v", header)
	}
	if strings.Contains(lines[0], "YEAR") {
		t.Fatalf("unexpected YEAR in filtered header: %q", lines[0])
	}
}

func TestPrintStarTableColumnsSubset(t *testing.T) {
	t.Parallel()

	rows := []api.StarData{{ID: "sun", DisplayName: "Sun", PlanetCount: 8, SpectralClass: "G"}}
	var out bytes.Buffer
	if err := PrintStarTable(&out, rows, []string{"id", "spectral"}); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	header := strings.Fields(strings.Split(strings.TrimSpace(out.String()), "\n")[0])
	if len(header) != 2 || header[0] != "ID" || header[1] != "SPECTRAL" {
		t.Fatalf("unexpected header: %v", header)
	}
}

func TestPrintSmallBodyTableColumnsSubset(t *testing.T) {
	t.Parallel()

	rows := []api.SmallBodyData{{ID: "ceres", DisplayName: "Ceres", BodyKind: "asteroid", OrbitClass: "MBA", IsNeo: false, IsPha: false}}
	var out bytes.Buffer
	if err := PrintSmallBodyTable(&out, rows, []string{"name", "neo"}); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	lines := strings.Split(strings.TrimSpace(out.String()), "\n")
	if !strings.Contains(lines[0], "NAME") || !strings.Contains(lines[0], "NEO") {
		t.Fatalf("unexpected header: %q", lines[0])
	}
	if strings.Contains(lines[0], "PHA") {
		t.Fatalf("unexpected PHA in filtered header: %q", lines[0])
	}
}

func TestPrintCloseApproachesTableColumnsSubset(t *testing.T) {
	t.Parallel()

	rows := []api.CloseApproach{{Designation: "Apophis", ApproachTimeRaw: "2026-Jan-01", DistanceLd: 1.2, RelativeVelocityKm: 5.6, AbsoluteMagnitude: 19.3}}
	var out bytes.Buffer
	if err := PrintCloseApproachesTable(&out, rows, []string{"designation", "h"}); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	header := strings.Fields(strings.Split(strings.TrimSpace(out.String()), "\n")[0])
	if len(header) != 2 || header[0] != "DESIGNATION" || header[1] != "H" {
		t.Fatalf("unexpected header: %v", header)
	}
}

func TestPrintFireballsTableColumnsSubset(t *testing.T) {
	t.Parallel()

	rows := []api.FireballEvent{{Date: "2026-01-01", RadiatedEnergy: 1.2, IsComplete: true}}
	var out bytes.Buffer
	if err := PrintFireballsTable(&out, rows, []string{"date", "complete"}); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	header := strings.Fields(strings.Split(strings.TrimSpace(out.String()), "\n")[0])
	if len(header) != 2 || header[0] != "DATE" || header[1] != "COMPLETE" {
		t.Fatalf("unexpected header: %v", header)
	}
}

func TestPrintApodTableColumnsFullTextAndSubset(t *testing.T) {
	t.Parallel()

	apod := api.APODData{
		Date:        "2026-01-01",
		Title:       "A title",
		Explanation: strings.Repeat("x", 300),
		ImageURL:    "https://example.com",
		MediaType:   "image",
	}

	var out bytes.Buffer
	if err := PrintApodTable(&out, apod, true, []string{"date", "explanation"}); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	text := out.String()
	if !strings.Contains(text, "DATE") || !strings.Contains(text, "EXPLANATION") {
		t.Fatalf("expected selected headers, got %q", text)
	}
	if strings.Contains(text, "MEDIA_TYPE") {
		t.Fatalf("unexpected MEDIA_TYPE in filtered output: %q", text)
	}
	if !strings.Contains(text, strings.Repeat("x", 300)) {
		t.Fatalf("expected full explanation when fullText=true")
	}
}

func TestPrintTableDefaultColumnsWhenSelectionEmpty(t *testing.T) {
	t.Parallel()

	rows := []api.StarData{{ID: "sun", DisplayName: "Sun", PlanetCount: 8, SpectralClass: "G"}}
	var out bytes.Buffer
	if err := PrintStarTable(&out, rows, nil); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	header := strings.Fields(strings.Split(strings.TrimSpace(out.String()), "\n")[0])
	if len(header) != 5 {
		t.Fatalf("expected default 5 columns, got %v", header)
	}
}
