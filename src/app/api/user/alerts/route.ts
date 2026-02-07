import { NextRequest, NextResponse } from "next/server";
import { requirePro, authErrorResponse } from "@/lib/auth";
import { requireUserDb } from "@/lib/user-db";
import { CreateAlertSchema, Alert } from "@/lib/types";
import { isMockUserStoreEnabled } from "@/lib/runtime-mode";
import { createAlert, listAlerts } from "@/lib/mock-user-store";

/**
 * GET /api/user/alerts
 *
 * List all alerts for the authenticated Pro user.
 */
export async function GET() {
  try {
    const user = await requirePro();

    if (isMockUserStoreEnabled()) {
      return NextResponse.json({ alerts: listAlerts(user.userId) });
    }

    const db = requireUserDb();

    const result = await db.execute({
      sql: `
        SELECT id, alert_type, config, enabled, email_enabled, created_at, updated_at
        FROM alerts
        WHERE user_id = ?
        ORDER BY created_at DESC
      `,
      args: [user.userId],
    });

    const alerts: Alert[] = result.rows.map((row) => ({
      id: row.id as number,
      alertType: row.alert_type as "space_weather" | "fireball" | "close_approach",
      config: JSON.parse(row.config as string),
      enabled: Boolean(row.enabled),
      emailEnabled: Boolean(row.email_enabled),
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }));

    return NextResponse.json({ alerts });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/**
 * POST /api/user/alerts
 *
 * Create a new alert. Pro feature only.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requirePro();

    const body = await request.json();
    const parseResult = CreateAlertSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { alertType, config, emailEnabled } = parseResult.data;

    if (isMockUserStoreEnabled()) {
      const alert = createAlert({
        userId: user.userId,
        alertType,
        config,
        emailEnabled: emailEnabled ?? true,
      });
      return NextResponse.json(alert, { status: 201 });
    }

    const db = requireUserDb();

    const result = await db.execute({
      sql: `
        INSERT INTO alerts (user_id, alert_type, config, email_enabled)
        VALUES (?, ?, ?, ?)
        RETURNING id, alert_type, config, enabled, email_enabled, created_at, updated_at
      `,
      args: [
        user.userId,
        alertType,
        JSON.stringify(config),
        emailEnabled ?? true ? 1 : 0,
      ],
    });

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Failed to create alert" },
        { status: 500 }
      );
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

    return NextResponse.json(alert, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
