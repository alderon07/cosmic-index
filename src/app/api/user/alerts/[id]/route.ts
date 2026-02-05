import { NextRequest, NextResponse } from "next/server";
import { requirePro, authErrorResponse } from "@/lib/auth";
import { requireUserDb } from "@/lib/user-db";
import { UpdateAlertSchema, Alert } from "@/lib/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/user/alerts/[id]
 *
 * Get a single alert by ID.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requirePro();
    const db = requireUserDb();
    const { id } = await params;

    const alertId = parseInt(id, 10);
    if (isNaN(alertId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const result = await db.execute({
      sql: `
        SELECT id, alert_type, config, enabled, email_enabled, created_at, updated_at
        FROM alerts
        WHERE id = ? AND user_id = ?
      `,
      args: [alertId, user.userId],
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const row = result.rows[0];
    const alert: Alert = {
      id: row.id as number,
      alertType: row.alert_type as "space_weather" | "fireball" | "close_approach",
      config: JSON.parse(row.config as string),
      enabled: Boolean(row.enabled),
      emailEnabled: Boolean(row.email_enabled),
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };

    return NextResponse.json(alert);
  } catch (error) {
    return authErrorResponse(error);
  }
}

/**
 * PATCH /api/user/alerts/[id]
 *
 * Update an alert's config, enabled status, or email settings.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requirePro();
    const db = requireUserDb();
    const { id } = await params;

    const alertId = parseInt(id, 10);
    if (isNaN(alertId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const body = await request.json();
    const parseResult = UpdateAlertSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const updates = parseResult.data;

    // Build dynamic UPDATE query
    const setClauses: string[] = ['updated_at = datetime("now")'];
    const args: (string | number)[] = [];

    if (updates.config !== undefined) {
      setClauses.push("config = ?");
      args.push(JSON.stringify(updates.config));
    }
    if (updates.enabled !== undefined) {
      setClauses.push("enabled = ?");
      args.push(updates.enabled ? 1 : 0);
    }
    if (updates.emailEnabled !== undefined) {
      setClauses.push("email_enabled = ?");
      args.push(updates.emailEnabled ? 1 : 0);
    }

    args.push(alertId, user.userId);

    const result = await db.execute({
      sql: `
        UPDATE alerts
        SET ${setClauses.join(", ")}
        WHERE id = ? AND user_id = ?
        RETURNING id, alert_type, config, enabled, email_enabled, created_at, updated_at
      `,
      args,
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const row = result.rows[0];
    const alert: Alert = {
      id: row.id as number,
      alertType: row.alert_type as "space_weather" | "fireball" | "close_approach",
      config: JSON.parse(row.config as string),
      enabled: Boolean(row.enabled),
      emailEnabled: Boolean(row.email_enabled),
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };

    return NextResponse.json(alert);
  } catch (error) {
    return authErrorResponse(error);
  }
}

/**
 * DELETE /api/user/alerts/[id]
 *
 * Delete an alert. Also removes its triggers via CASCADE.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requirePro();
    const db = requireUserDb();
    const { id } = await params;

    const alertId = parseInt(id, 10);
    if (isNaN(alertId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const result = await db.execute({
      sql: "DELETE FROM alerts WHERE id = ? AND user_id = ? RETURNING id",
      args: [alertId, user.userId],
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
