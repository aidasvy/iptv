import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { advanceWeek, scheduleRegularSeason } from "@/lib/jobs/week-scheduler";
import { db } from "@hoopmanager/db";

// Called by a cron job (e.g. Vercel Cron / GitHub Actions) on a weekly schedule.
// Also supports manual admin trigger for dev/testing.

export async function POST(req: NextRequest) {
  // Allow either admin session OR a secret cron token
  const cronToken = req.headers.get("x-cron-token");
  const isValidCron = cronToken === process.env.CRON_SECRET;

  if (!isValidCron) {
    const session = await auth();
    const isAdmin = (session?.user as any)?.isAdmin;
    if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const leagueId: string | undefined = body.leagueId;

  if (!leagueId) return NextResponse.json({ error: "leagueId required" }, { status: 400 });

  await advanceWeek(leagueId);

  return NextResponse.json({ success: true });
}
