import type { Metadata } from "next";
import Link from "next/link";
import { CircleHelp, Database, Radar, Telescope } from "lucide-react";
import { JsonLd } from "@/components/seo/json-ld";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buildBreadcrumbJsonLd, buildHubMetadata } from "@/lib/seo";

const FAQ_DESCRIPTION =
  "Frequently asked questions about Cosmic Index, including data sources, update cadence, space weather interpretation, object catalogs, alerts, and account features.";

type FaqSection = {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  questions: Array<{
    id: string;
    question: string;
    answer: string;
  }>;
};

const FAQ_SECTIONS: FaqSection[] = [
  {
    title: "About Cosmic Index",
    description: "What the site is, how it should be used, and what it is not.",
    icon: CircleHelp,
    questions: [
      {
        id: "what-is-cosmic-index",
        question: "What is Cosmic Index?",
        answer:
          "Cosmic Index is a space-data browser for exoplanets, stars, small bodies, close approaches, fireballs, and space weather. It combines searchable catalogs with detail pages, event streams, and educational context so people can explore public astronomy and heliophysics data more easily.",
      },
      {
        id: "official-source",
        question: "Is Cosmic Index an official NASA or NOAA site?",
        answer:
          "No. Cosmic Index is an independent product that uses public upstream datasets and operational products from organizations such as NASA, JPL, NOAA SWPC, GFZ, and Kyoto WDC. It is not affiliated with, endorsed by, or sponsored by those organizations.",
      },
      {
        id: "advice",
        question: "Should I treat Cosmic Index as official operational advice?",
        answer:
          "No. Cosmic Index is designed for exploration, monitoring, and interpretation. For official warnings, watches, alerts, or mission-critical decisions, use the original upstream providers directly, especially NOAA SWPC and NASA data products.",
      },
    ],
  },
  {
    title: "Data & Updates",
    description: "Where the data comes from and how fresh it is.",
    icon: Database,
    questions: [
      {
        id: "data-sources",
        question: "Where does Cosmic Index data come from?",
        answer:
          "Different parts of the site use different primary sources. Examples include the NASA Exoplanet Archive for exoplanet catalog data, JPL and CNEOS sources for small bodies and close approaches, NASA DONKI for space weather events, NOAA SWPC for operational space weather monitoring products, GFZ Potsdam for Hp30, and Kyoto WDC for AE quicklook data.",
      },
      {
        id: "update-frequency",
        question: "How often does Cosmic Index update its data?",
        answer:
          "It depends on the dataset. Some catalog data refreshes less often, while space weather products can update every few minutes. Each page tries to show source attribution and timing so you can tell whether you are looking at a forecast, a quicklook product, a near-real-time stream, or a slower archival feed.",
      },
      {
        id: "differences-from-source",
        question: "Why might values on Cosmic Index differ from an upstream source page?",
        answer:
          "Cosmic Index sometimes normalizes, caches, or summarizes upstream data to make it more readable. That can introduce small timing differences, especially when products update rapidly. When precision matters, use the upstream link shown on the page.",
      },
    ],
  },
  {
    title: "Space Weather",
    description: "How to interpret the weather pages and alerts.",
    icon: Radar,
    questions: [
      {
        id: "space-weather-meaning",
        question: "What is space weather?",
        answer:
          "On Cosmic Index, space weather refers to solar activity and its effects between the Sun and Earth, including flares, CMEs, interplanetary shocks, high-speed streams, solar energetic particles, geomagnetic storms, radio absorption, and upstream solar wind conditions.",
      },
      {
        id: "southward-bz",
        question: "What does southward Bz mean for geomagnetic storms?",
        answer:
          "Southward Bz is one of the most important solar-wind inputs for geomagnetic coupling. When the interplanetary magnetic field points southward, it can reconnect more efficiently with Earth&apos;s magnetic field, making geomagnetic disturbance and stronger aurora more likely.",
      },
      {
        id: "alerts-vs-events",
        question: "What is the difference between events and alerts?",
        answer:
          "Events are records of solar or geomagnetic activity, often sourced from NASA DONKI. Alerts are operational notices, watches, warnings, or merged alert-style summaries. In other words, events help explain what happened, while alerts focus more on what operators may need to watch right now.",
      },
      {
        id: "unsupported-event-types",
        question: "Why do some DONKI-linked event types not open internal detail pages?",
        answer:
          "Not every upstream DONKI-linked type is fully supported as a first-class detail page inside Cosmic Index yet. When that happens, the app may route you to the upstream DONKI reference instead of pretending the internal detail support exists.",
      },
    ],
  },
  {
    title: "Catalogs & Objects",
    description: "Questions about exoplanets, stars, small bodies, and event pages.",
    icon: Telescope,
    questions: [
      {
        id: "habitable",
        question: "Does a habitable exoplanet label mean a planet is definitely life-friendly?",
        answer:
          "No. Habitability-related labels usually reflect broad screening heuristics such as insolation, equilibrium temperature, or size ranges. They are useful for exploration, but they do not prove surface water, atmosphere quality, or biological potential.",
      },
      {
        id: "potentially-hazardous",
        question: "What does potentially hazardous asteroid mean?",
        answer:
          "No. Potentially hazardous is an orbital and size classification, not an impact prediction. It generally means an object is large enough and can approach Earth closely enough that it should be monitored carefully over time.",
      },
      {
        id: "missing-fields",
        question: "Why are some object fields missing?",
        answer:
          "Astronomy catalogs are incomplete by nature. Some objects simply do not have well-constrained measurements for mass, radius, metallicity, albedo, composition, or other fields yet. Cosmic Index usually shows those as unavailable rather than guessing.",
      },
      {
        id: "saved-searches",
        question: "Can I save objects, collections, searches, or alerts?",
        answer:
          "Yes, depending on the feature and your access tier. Cosmic Index supports account-based features such as saved objects, collections, saved searches, alerts, and exports, with availability and limits based on the active product configuration.",
      },
    ],
  },
];

export const metadata: Metadata = buildHubMetadata({
  title: "FAQ",
  description: FAQ_DESCRIPTION,
  path: "/faq",
  variantKeys: [],
  params: {},
  imageAlt: "Cosmic Index - Frequently Asked Questions",
});

export default function FaqPage() {
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { label: "Home", href: "/" },
    { label: "FAQ", href: "/faq" },
  ]);

  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />
      <div className="shell-container py-8 md:py-10">
        <section className="relative overflow-hidden rounded-3xl border border-border/50 bg-[#120d0f] px-6 py-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_20px_50px_rgba(0,0,0,0.35)] md:px-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,163,67,0.16),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(42,238,255,0.08),transparent_30%)]" />
          <div className="relative space-y-4">
            <Badge variant="outline" className="border-orange-300/30 bg-orange-400/10 text-orange-100">
              Help Center
            </Badge>
            <h1 className="font-display text-3xl tracking-wide text-foreground md:text-5xl">
              Frequently Asked Questions
            </h1>
            <p className="max-w-3xl text-base leading-relaxed text-muted-foreground/85">
              Answers to the questions most people have about Cosmic Index, including data sources,
              update cadence, how to read space weather surfaces, and what catalog labels do and do
              not mean.
            </p>
            <p className="text-sm text-muted-foreground/75">
              Looking for a specific surface? Try{" "}
              <Link href="/space-weather" className="text-aurora-violet underline-offset-4 hover:underline">
                Space Weather
              </Link>
              ,{" "}
              <Link href="/exoplanets" className="text-primary underline-offset-4 hover:underline">
                Exoplanets
              </Link>
              , or{" "}
              <Link href="/small-bodies" className="text-secondary underline-offset-4 hover:underline">
                Small Bodies
              </Link>
              .
            </p>
          </div>
        </section>

        <section className="mt-8 grid gap-4">
          {FAQ_SECTIONS.map((section) => {
            const Icon = section.icon;

            return (
              <Card key={section.title} className="border-border/50 bg-card/70">
                <CardHeader className="gap-3">
                  <CardTitle className="flex items-center gap-2 font-display text-xl tracking-wide">
                    <Icon className="h-5 w-5 text-orange-300" />
                    {section.title}
                  </CardTitle>
                  <CardDescription className="text-sm leading-relaxed text-muted-foreground/80">
                    {section.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {section.questions.map((entry) => (
                      <AccordionItem key={entry.id} value={entry.id} className="border-border/30">
                        <AccordionTrigger className="text-left font-medium hover:no-underline">
                          {entry.question}
                        </AccordionTrigger>
                        <AccordionContent className="pb-4 text-sm leading-relaxed text-muted-foreground/80">
                          {entry.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            );
          })}
        </section>

        <section className="mt-8">
          <Card className="border-border/50 bg-card/70">
            <CardHeader className="gap-3">
              <CardTitle className="font-display text-xl tracking-wide">
                Need More Help?
              </CardTitle>
              <CardDescription className="text-sm leading-relaxed text-muted-foreground/80">
                Jump into the part of the site that best matches what you&apos;re trying to understand.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <Link
                href="/space-weather"
                className="rounded-2xl border border-aurora-violet/25 bg-aurora-violet/6 p-4 text-sm transition-colors hover:border-aurora-violet/45 hover:bg-aurora-violet/10"
              >
                <p className="font-display tracking-wide text-foreground">Space Weather</p>
                <p className="mt-2 leading-relaxed text-muted-foreground/80">
                  For alerts, solar wind, flares, geomagnetic monitoring, and event timelines.
                </p>
              </Link>
              <Link
                href="/exoplanets"
                className="rounded-2xl border border-primary/25 bg-primary/6 p-4 text-sm transition-colors hover:border-primary/45 hover:bg-primary/10"
              >
                <p className="font-display tracking-wide text-foreground">Exoplanets</p>
                <p className="mt-2 leading-relaxed text-muted-foreground/80">
                  For discovery methods, planet properties, filters, and habitability caveats.
                </p>
              </Link>
              <Link
                href="/small-bodies"
                className="rounded-2xl border border-secondary/25 bg-secondary/6 p-4 text-sm transition-colors hover:border-secondary/45 hover:bg-secondary/10"
              >
                <p className="font-display tracking-wide text-foreground">Small Bodies</p>
                <p className="mt-2 leading-relaxed text-muted-foreground/80">
                  For asteroid and comet records, close-approach context, and hazard classifications.
                </p>
              </Link>
            </CardContent>
          </Card>
        </section>
      </div>
    </>
  );
}
