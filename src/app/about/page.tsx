import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { BASE_URL } from "@/lib/config";

export const metadata: Metadata = {
  title: "About Cosmic Index and our data methods",
  description: "Who publishes Cosmic Index, where its astronomy data comes from, how calculations and estimates work, and how to report a correction.",
  alternates: { canonical: `${BASE_URL}/about` },
};
const linkStyle = "text-primary underline underline-offset-4";

export default function AboutPage() {
  return (
    <div className="shell-container py-8 sm:py-12">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "About & methods" }]} />
      <article className="mt-8 max-w-3xl space-y-10 text-base leading-8 text-muted-foreground">
        <header>
          <h1 className="font-display text-3xl leading-tight text-foreground sm:text-4xl">About Cosmic Index</h1>
          <p className="mt-5">Cosmic Index is an independent space-data browser and educational project. It brings public scientific records into searchable catalogs, connects planets with their host stars, and helps readers interpret the measurements through worked examples.</p>
          <p className="mt-4">The project publishes its code in the <a href="https://github.com/alderon07/cosmic-index" className={linkStyle}>Cosmic Index GitHub repository</a>. Guides published under the Cosmic Index name explain how to use the site. That byline identifies the project, not a NASA author or a claim of scientific peer review.</p>
          <p className="mt-4">Cosmic Index is not affiliated with or endorsed by NASA, JPL, NOAA, or the other data providers. Their archives supply observations and agency assessments. The site&apos;s comparisons, layouts, and explanations are separate work.</p>
        </header>
        <section aria-labelledby="sources">
          <h2 id="sources" className="font-display text-xl text-foreground">Where the data comes from</h2>
          <ul className="mt-4 list-disc space-y-3 pl-5">
            <li><a href="https://exoplanetarchive.ipac.caltech.edu/" className={linkStyle}>NASA Exoplanet Archive</a> supplies exoplanets and their host stars. The stars catalog covers known exoplanet hosts, not every star in the sky.</li>
            <li><a href="https://ssd.jpl.nasa.gov/" className={linkStyle}>JPL Solar System Dynamics</a> and <a href="https://cneos.jpl.nasa.gov/" className={linkStyle}>CNEOS</a> supply small-body properties, close approaches, and fireball reports.</li>
            <li><a href="https://kauai.ccmc.gsfc.nasa.gov/DONKI/" className={linkStyle}>NASA DONKI</a> supplies space-weather event records. <a href="https://www.swpc.noaa.gov/" className={linkStyle}>NOAA SWPC</a> supplies operational monitoring products. Individual panels also attribute GFZ Hp30 and Kyoto AE data.</li>
          </ul>
          <p className="mt-4">Follow the source link on a record for its scientific reference. Catalog searches use an indexed copy and shared caches. Retrieval time, event time, and publication time can differ. A cached page is not evidence that an observation has just happened.</p>
        </section>
        <section aria-labelledby="methods">
          <h2 id="methods" className="font-display text-xl text-foreground">Calculations, estimates, and missing values</h2>
          <p className="mt-4">Volume comparisons assume spheres and cube the radius ratio. Orbit counts divide elapsed Earth days by a planet&apos;s orbital period. These are calculations from published inputs, not new measurements. Worked case studies retain dated source snapshots so the results can be reproduced.</p>
          <p className="mt-4">When an exoplanet has a radius but no reported mass, the catalog may estimate its mass from a radius relationship. For radius R in Earth radii, the implementation uses (R / 1.008)^(1 / 0.279) below 1.23 Earth radii, and (R / 0.7790)^(1 / 0.589) otherwise. The result is labelled estimated. It is a model output, not independent evidence for composition or a measured density.</p>
          <p className="mt-4">A minimum mass, M sin i, depends on orbital inclination. Upper and lower bounds constrain a quantity rather than specifying an exact value. Compare preserves supplied mass provenance, mass uncertainty, and orbital-period bounds. Radius uncertainty is not currently included in the comparison, so consult the original publication for calculations that need it.</p>
          <p className="mt-4">Missing values remain unknown. An absent temperature does not mean a cold planet, and a failed monitoring feed does not mean quiet space weather. For operational warnings and impact assessments, use the responsible agency.</p>
        </section>
        <section aria-labelledby="editorial">
          <h2 id="editorial" className="font-display text-xl text-foreground">How to read our guides</h2>
          <p className="mt-4">Scientific definitions link to primary sources. Invented examples are explicitly labelled. Real case studies identify the source values and the date they were checked. Calculations state their assumptions and what they cannot establish. A source-check date describes that check, not the age of the original observation.</p>
          <p className="mt-4">Guides are educational explanations, not research papers or personalized observing forecasts. When a published value changes, compare the source date and precision before treating the difference as an error.</p>
        </section>
        <section id="corrections" aria-labelledby="corrections-title" className="scroll-mt-24">
          <h2 id="corrections-title" className="font-display text-xl text-foreground">Corrections and contact</h2>
          <p className="mt-4">Use <strong className="font-medium text-foreground">Report a bug</strong> in the footer for content corrections as well as technical problems. Include the page address, the passage or value, and a source that supports the correction.</p>
          <p className="mt-4">If the reporter is unavailable, <a href="https://github.com/alderon07/cosmic-index/issues" className={linkStyle}>open a GitHub issue</a>. Issues are public. Do not include private account information, billing records, or credentials.</p>
        </section>
        <section aria-labelledby="funding">
          <h2 id="funding" className="font-display text-xl text-foreground">Funding and privacy</h2>
          <p className="mt-4">Cosmic Index accepts voluntary support through the Ko-fi link in the footer. Advertising, when enabled, is limited to selected editorial pages. Source attribution and uncertainty labels remain part of the content.</p>
          <p className="mt-4">The optional guide reading list stores guide identifiers in your browser. It does not create an account or sync across devices. See the <a href="/privacy" className={linkStyle}>privacy policy</a> for account, analytics, and advertising data.</p>
        </section>
        <Link href="/learn" className={`${linkStyle} inline-block`}>Explore the field guides</Link>
      </article>
    </div>
  );
}
