import { GuideLink } from "@/components/guide-link";

interface FireballFilterContextProps {
  reqLoc: boolean;
  reqAlt: boolean;
  reqVel: boolean;
}

export function FireballFilterContext({ reqLoc, reqAlt, reqVel }: FireballFilterContextProps) {
  const active = reqLoc || reqAlt || reqVel;
  return (
    <aside aria-labelledby="fireball-selection-context" className="mb-6 border-l-2 border-primary/50 bg-primary/5 p-4 sm:p-5">
      <h2 id="fireball-selection-context" className="font-display text-lg">What this selection leaves out</h2>
      {active ? (
        <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
          {reqLoc ? <li>Location required. Events without a reported position are excluded, not placed at zero latitude or longitude.</li> : null}
          {reqAlt ? <li>Altitude required. Events without a reported peak-brightness altitude are excluded. This is not a filter for material reaching the ground.</li> : null}
          {reqVel ? <li>Velocity required. Events without reported speed are excluded. Missing speed does not mean the object was stationary or less energetic.</li> : null}
        </ul>
      ) : <p className="mt-3 text-sm leading-6 text-muted-foreground">No measurement requirements are active. Records can have energy estimates while location, altitude, or velocity is missing.</p>}
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {active ? "Every active requirement must be met. " : ""}
        This browser returns at most 100 records in the selected order. The result count describes that window, not the total number of fireballs on Earth. CNEOS does not publish a complete census.
      </p>
      <GuideLink slug="fireball-selection" />
    </aside>
  );
}
