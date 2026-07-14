import { verifyWebhook } from "@clerk/nextjs/webhooks";
import type { NextRequest } from "next/server";
import { requireUserDb } from "@/lib/user-db";

const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store",
};

export async function POST(request: NextRequest): Promise<Response> {
  let event: Awaited<ReturnType<typeof verifyWebhook>>;
  try {
    event = await verifyWebhook(request);
  } catch {
    return Response.json(
      { error: "invalid_webhook_signature" },
      { status: 400, headers: PRIVATE_HEADERS },
    );
  }

  if (event.type !== "user.deleted") {
    return Response.json({ received: true }, { headers: PRIVATE_HEADERS });
  }

  const userId = event.data.id;
  if (typeof userId !== "string" || userId.length === 0) {
    return Response.json(
      { error: "missing_user_id" },
      { status: 400, headers: PRIVATE_HEADERS },
    );
  }

  const db = requireUserDb();
  await db.execute({
    sql: "DELETE FROM users WHERE id = ?",
    args: [userId],
  });

  return Response.json({ received: true }, { headers: PRIVATE_HEADERS });
}
