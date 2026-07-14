import { CircleAlert, RadioTower, Satellite, Telescope } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const emptyCopy = {
  watches: {
    icon: Telescope,
    title: "Nothing is being watched yet",
    body: "Make one watch and we will keep an eye on space for you.",
  },
  signals: {
    icon: RadioTower,
    title: "No signals yet",
    body: "Quiet is good. New matches will appear here when your watch spots something.",
  },
} as const;

export function ObservatoryEmptyState({
  kind,
  action,
}: {
  kind: keyof typeof emptyCopy;
  action?: React.ReactNode;
}) {
  const copy = emptyCopy[kind];
  const Icon = copy.icon;
  return (
    <Card className="border-dashed border-border/70 bg-black/15">
      <CardContent className="flex flex-col items-center py-10 text-center sm:py-14">
        <span className="mb-4 grid size-14 place-items-center rounded-full border border-reactor-orange/25 bg-reactor-orange/10">
          <Icon aria-hidden="true" className="size-7 text-reactor-orange" />
        </span>
        <h2 className="font-display text-lg text-orange-100">{copy.title}</h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{copy.body}</p>
        {action ? <div className="mt-6">{action}</div> : null}
      </CardContent>
    </Card>
  );
}

export function ObservatoryLoadingState({ label = "Checking the sky…" }: { label?: string }) {
  return (
    <div role="status" className="grid min-h-52 place-items-center rounded-xl border border-border/50 bg-black/10 text-center">
      <div>
        <Satellite aria-hidden="true" className="mx-auto size-8 animate-pulse text-radium-teal motion-reduce:animate-none" />
        <p className="mt-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export function ObservatoryErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-destructive/35 bg-destructive/5 p-6 text-center">
      <CircleAlert aria-hidden="true" className="mx-auto size-7 text-destructive" />
      <h2 className="mt-3 font-display text-base text-foreground">We lost the signal</h2>
      <p className="mt-2 text-sm text-muted-foreground">The data did not load. Your watches are still safe.</p>
      <button type="button" onClick={onRetry} className="mt-5 min-h-11 rounded-md border border-border px-4 text-sm hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-light/30">
        Try again
      </button>
    </div>
  );
}

