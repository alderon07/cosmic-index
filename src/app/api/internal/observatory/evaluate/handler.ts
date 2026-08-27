import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import {
  evaluateObservatory,
  ObservatoryEvaluatorRequestSchema,
} from "@/lib/observatory-evaluator";
import { createObservatoryEvaluatorStore } from "@/lib/observatory-evaluator-store";

const RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store",
  "X-Robots-Tag": "noindex, nofollow",
};

function authorized(request: Request, secret: string): boolean {
  const prefix = "Bearer ";
  const header = request.headers.get("authorization");
  if (!header?.startsWith(prefix)) return false;
  const provided = Buffer.from(header.slice(prefix.length));
  const expected = Buffer.from(secret);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

export function createObservatoryEvaluatorPost(
  dependencies: {
    evaluate?: typeof evaluateObservatory;
    createStore?: typeof createObservatoryEvaluatorStore;
  } = {},
) {
  const evaluate = dependencies.evaluate ?? evaluateObservatory;
  const createStore = dependencies.createStore ?? createObservatoryEvaluatorStore;

  return async function post(request: Request) {
    const secret = process.env.OBSERVATORY_CRON_SECRET;
    if (!secret) {
      return NextResponse.json(
        { error: "evaluator_unavailable" },
        { status: 503, headers: RESPONSE_HEADERS },
      );
    }
    if (!authorized(request, secret)) {
      return NextResponse.json(
        { error: "unauthorized" },
        { status: 401, headers: RESPONSE_HEADERS },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "invalid_json" },
        { status: 400, headers: RESPONSE_HEADERS },
      );
    }
    const parsed = ObservatoryEvaluatorRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_request", issues: parsed.error.issues },
        { status: 400, headers: RESPONSE_HEADERS },
      );
    }

    try {
      const result = await evaluate(parsed.data, {
        store: createStore(),
      });
      return NextResponse.json(result, {
        status: result.status === "incomplete" ? 503 : 200,
        headers: RESPONSE_HEADERS,
      });
    } catch (error) {
      console.error("[observatory] evaluator failed", {
        domain: parsed.data.domain,
        errorCode: error instanceof Error ? error.name : "unknown_error",
      });
      return NextResponse.json(
        { error: "evaluation_failed", domain: parsed.data.domain },
        { status: 503, headers: RESPONSE_HEADERS },
      );
    }
  };
}
