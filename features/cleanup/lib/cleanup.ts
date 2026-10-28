import { NextRequest, NextResponse } from "next/server";

import { runCleanup } from "@/features/cleanup/lib/archive-cleanup";

export async function POST(request: NextRequest) {
  try {
    const isVercelCron = request.headers.get("x-vercel-cron") === "1";
    const authHeader = request.headers.get("authorization");
    const expectedSecret = process.env.CRON_SECRET;

    if (!isVercelCron) {
      if (!expectedSecret) {
        console.error("[cleanup] CRON_SECRET is not configured on the server.");
        return NextResponse.json(
          { error: "Server configuration error: CRON_SECRET not set." },
          { status: 500 }
        );
      }

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return NextResponse.json(
          { error: "Unauthorized: missing or invalid Authorization header." },
          { status: 401 }
        );
      }

      const token = authHeader.slice(7);
      if (token !== expectedSecret) {
        return NextResponse.json(
          { error: "Unauthorized: invalid token." },
          { status: 401 }
        );
      }
    }

    const dryRun = process.env.CRON_DRY_RUN === "true";

    const { counts, expiredShifts } = await runCleanup(dryRun);

    return NextResponse.json({
      dry_run: dryRun,
      expired_shift_ids: expiredShifts.map((s) => s.id),
      expired_shift_details: expiredShifts,
      counts,
      message: dryRun
        ? "Dry run complete — no data was deleted."
        : "Cleanup complete — expired data has been deleted.",
    });
  } catch (err) {
    console.error("[cleanup] Fatal error during cron cleanup:", err);
    return NextResponse.json(
      { error: "Internal server error during cleanup." },
      { status: 500 }
    );
  }
}
