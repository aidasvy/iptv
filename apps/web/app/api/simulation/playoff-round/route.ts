import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { simulatePlayoffRound } from "@/lib/jobs/week-scheduler";

export async function POST(req: NextRequest) {
  const cronToken = req.headers.get("x-cron-token");
  const isValidCron = cronToken === process.env.CRON_SECRET;

  if (!isValidCron) {
    const session = await auth();
    const isAdmin = (session?.user as any)?.isAdmin;
    if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { leagueId, round } = await req.json();
  if (!leagueId || !round) {
    return NextResponse.json({ error: "leagueId and round required" }, { status: 400 });
  }

  const result = await simulatePlayoffRound(leagueId, round);
  return NextResponse.json({ success: true, ...result });
}
