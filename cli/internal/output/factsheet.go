package output

import (
	"fmt"
	"io"

	"cosmic-index/cli/internal/api"
)

func PrintExoplanetFactSheet(w io.Writer, item api.ExoplanetData) error {
	if _, err := fmt.Fprintf(w, "%s (%s)\n", item.DisplayName, item.Type); err != nil {
		return err
	}
	if _, err := fmt.Fprintf(w, "ID: %s\n", item.ID); err != nil {
		return err
	}
	if _, err := fmt.Fprintf(w, "Host star: %s\n", fallback(item.HostStar)); err != nil {
		return err
	}
	if _, err := fmt.Fprintf(w, "Discovery method: %s\n", fallback(item.DiscoveryMethod)); err != nil {
		return err
	}
	if _, err := fmt.Fprintf(w, "Discovered year: %s\n", formatInt(item.DiscoveredYear)); err != nil {
		return err
	}
	if _, err := fmt.Fprintf(w, "Distance (pc): %s\n", formatFloat(item.DistanceParsecs, 1)); err != nil {
		return err
	}
	return printFactsAndLinks(w, item.KeyFacts, item.Links)
}

func PrintStarFactSheet(w io.Writer, item api.StarData) error {
	if _, err := fmt.Fprintf(w, "%s (%s)\n", item.DisplayName, item.Type); err != nil {
		return err
	}
	if _, err := fmt.Fprintf(w, "ID: %s\n", item.ID); err != nil {
		return err
	}
	if _, err := fmt.Fprintf(w, "Planet count: %d\n", item.PlanetCount); err != nil {
		return err
	}
	spectral := item.SpectralClass
	if spectral == "" {
		spectral = item.SpectralType
	}
	if _, err := fmt.Fprintf(w, "Spectral: %s\n", fallback(spectral)); err != nil {
		return err
	}
	if _, err := fmt.Fprintf(w, "Distance (pc): %s\n", formatFloat(item.DistanceParsecs, 1)); err != nil {
		return err
	}
	return printFactsAndLinks(w, item.KeyFacts, item.Links)
}

func PrintSmallBodyFactSheet(w io.Writer, item api.SmallBodyData) error {
	if _, err := fmt.Fprintf(w, "%s (%s)\n", item.DisplayName, item.Type); err != nil {
		return err
	}
	if _, err := fmt.Fprintf(w, "ID: %s\n", item.ID); err != nil {
		return err
	}
	if _, err := fmt.Fprintf(w, "Kind: %s\n", fallback(item.BodyKind)); err != nil {
		return err
	}
	if _, err := fmt.Fprintf(w, "Orbit class: %s\n", fallback(item.OrbitClass)); err != nil {
		return err
	}
	if _, err := fmt.Fprintf(w, "NEO: %t\n", item.IsNeo); err != nil {
		return err
	}
	if _, err := fmt.Fprintf(w, "PHA: %t\n", item.IsPha); err != nil {
		return err
	}
	return printFactsAndLinks(w, item.KeyFacts, item.Links)
}

func printFactsAndLinks(w io.Writer, facts []api.KeyFact, links []api.SourceLink) error {
	if _, err := fmt.Fprintln(w, ""); err != nil {
		return err
	}
	if _, err := fmt.Fprintln(w, "Key facts:"); err != nil {
		return err
	}
	if len(facts) == 0 {
		if _, err := fmt.Fprintln(w, "- none"); err != nil {
			return err
		}
	}
	for _, fact := range facts {
		if fact.Unit != "" {
			if _, err := fmt.Fprintf(w, "- %s: %s %s\n", fact.Label, fact.Value, fact.Unit); err != nil {
				return err
			}
			continue
		}
		if _, err := fmt.Fprintf(w, "- %s: %s\n", fact.Label, fact.Value); err != nil {
			return err
		}
	}

	if _, err := fmt.Fprintln(w, ""); err != nil {
		return err
	}
	if _, err := fmt.Fprintln(w, "Links:"); err != nil {
		return err
	}
	if len(links) == 0 {
		if _, err := fmt.Fprintln(w, "- none"); err != nil {
			return err
		}
	}
	for _, link := range links {
		if _, err := fmt.Fprintf(w, "- %s: %s\n", link.Label, link.URL); err != nil {
			return err
		}
	}
	return nil
}
