import Link from "next/link";
import { Activity, Eye, RadioTower } from "lucide-react";
import { cn } from "@/lib/utils";

type ObservatorySection = "overview" | "signals" | "watches";

const sections = [
  { id: "overview" as const, label: "Overview", href: "/user/observatory", icon: Eye },
  { id: "signals" as const, label: "Signals", href: "/user/observatory/signals", icon: RadioTower },
  { id: "watches" as const, label: "Watches", href: "/user/observatory/watches", icon: Activity },
];

export function ObservatoryShell({
  active,
  children,
}: {
  active: ObservatorySection;
  children: React.ReactNode;
}) {
  return (
    <main className="shell-container py-6 sm:py-10">
      <header className="relative mb-6 overflow-hidden rounded-2xl border border-reactor-orange/25 bg-[#17100c]/90 px-5 py-6 shadow-[inset_0_1px_0_rgba(255,190,125,0.12),0_18px_44px_rgba(0,0,0,0.28)] scanlines sm:px-8 sm:py-8">
        <div aria-hidden="true" className="absolute -right-10 -top-12 size-44 rounded-full border border-reactor-orange/20 shadow-[inset_0_0_40px_rgba(255,116,72,0.08)]" />
        <div aria-hidden="true" className="absolute right-4 top-5 size-20 rounded-full border border-dashed border-radium-teal/20" />
        <div className="relative z-20 max-w-3xl">
          <p className="mb-2 flex items-center gap-2 font-mono text-[0.68rem] uppercase tracking-[0.22em] text-reactor-orange">
            <span className="inline-block size-2 rounded-full bg-radium-teal shadow-[0_0_10px_rgba(61,219,217,0.75)]" />
            Personal sky station
          </p>
          <h1 className="font-display text-2xl text-orange-100 sm:text-4xl">My Observatory</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
            Here is what is happening in your corner of space.
          </p>
        </div>
      </header>

      <nav aria-label="Observatory sections" className="mb-6 overflow-x-auto">
        <div className="inline-flex min-w-full gap-1 rounded-xl border border-border/55 bg-card/65 p-1.5 sm:min-w-0">
          {sections.map(({ id, label, href, icon: Icon }) => (
            <Link
              key={id}
              href={href}
              aria-current={active === id ? "page" : undefined}
              className={cn(
                "flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-light/35 sm:flex-none",
                active === id
                  ? "bg-panel-bronze text-brass-light shadow-[inset_0_0_0_1px_rgba(255,190,125,0.16)]"
                  : "text-muted-foreground hover:bg-panel-bronze/55 hover:text-foreground",
              )}
            >
              <Icon aria-hidden="true" className="size-4" />
              {label}
            </Link>
          ))}
        </div>
      </nav>

      {children}
    </main>
  );
}

