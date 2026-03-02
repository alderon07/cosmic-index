import { NextResponse } from "next/server";

type TimingMetric = {
  name: string;
  durationMs: number;
  description?: string;
};

function sanitizeToken(token: string): string {
  return token.replace(/[^a-zA-Z0-9_\\-\\.]/g, "_");
}

export class ServerTiming {
  private readonly requestStart = performance.now();
  private readonly metrics: TimingMetric[] = [];

  add(name: string, durationMs: number, description?: string): void {
    this.metrics.push({
      name: sanitizeToken(name),
      durationMs: Math.max(0, durationMs),
      description,
    });
  }

  measureSync<T>(name: string, fn: () => T, description?: string): T {
    const startedAt = performance.now();
    try {
      return fn();
    } finally {
      this.add(name, performance.now() - startedAt, description);
    }
  }

  async measure<T>(name: string, fn: () => Promise<T>, description?: string): Promise<T> {
    const startedAt = performance.now();
    try {
      return await fn();
    } finally {
      this.add(name, performance.now() - startedAt, description);
    }
  }

  toHeaderValue(): string {
    const allMetrics = [
      ...this.metrics,
      {
        name: "total",
        durationMs: performance.now() - this.requestStart,
      },
    ];

    return allMetrics
      .map((metric) => {
        const base = `${metric.name};dur=${metric.durationMs.toFixed(1)}`;
        if (!metric.description) return base;
        const sanitizedDescription = metric.description.replace(/"/g, "'");
        return `${base};desc="${sanitizedDescription}"`;
      })
      .join(", ");
  }

  json(
    body: unknown,
    init?: number | ResponseInit
  ): NextResponse {
    const response = NextResponse.json(
      body,
      typeof init === "number" ? { status: init } : init,
    );
    response.headers.set("Server-Timing", this.toHeaderValue());
    return response;
  }
}
