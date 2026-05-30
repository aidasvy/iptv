import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { scheduleRegularSeason } from "@/lib/jobs/week-scheduler";
import { db } from "@hoopmanager/db";

// Starts a new season: creates season record, generates full fixture list,
// transitions league phase to REGULAR_SEASON.

export async function POST(req: NextRequest) {
  const cronToken = req.headers.get("x-cron-token");
  const isValidCron = cronToken === process.env.CRON_SECRET;

  if (!isValidCron) {
    const session = await auth();
    const isAdmin = (session?.user as any)?.isAdmin;
    if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { leagueId } = await req.json();
  if (!leagueId) return NextResponse.json({ error: "leagueId required" }, { status: 400 });

  const league = await db.league.findUnique({ where: { id: leagueId } });
  if (!league) return NextResponse.json({ error: "League not found" }, { status: 404 });

  const lastSeason = await db.season.findFirst({
    where: { leagueId },
    orderBy: { seasonNumber: "desc" },
    select: { seasonNumber: true },
  });

  const seasonNumber = (lastSeason?.seasonNumber ?? 0) + 1;
  const startDate = new Date();

  const season = await db.season.create({
    data: { leagueId, seasonNumber, startDate },
  });

  await scheduleRegularSeason(leagueId, season.id);

  await db.league.update({
    where: { id: leagueId },
    data: { currentPhase: "REGULAR_SEASON", currentWeek: 1 },
  });

  const gameCount = await db.game.count({ where: { seasonId: season.id } });

  return NextResponse.json({ success: true, seasonId: season.id, gamesScheduled: gameCount });
}
