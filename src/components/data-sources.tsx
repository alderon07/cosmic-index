import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";

interface DataSourcesProps {
  links: { label: string; url: string }[];
  sourceId: string;
}

export function DataSources({ links, sourceId }: DataSourcesProps) {
  return (
    <Card className="bg-card border-border/50 bezel">
      <CardHeader>
        <CardTitle className="font-display text-base">Data Sources</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {links.map((link, index) => (
            <a
              key={index}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-muted/50 hover:bg-muted rounded-md text-foreground hover:text-primary transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              {link.label}
            </a>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          Source ID:{" "}
          <span className="font-mono text-foreground">{sourceId}</span>
        </p>
      </CardContent>
    </Card>
  );
}
