// Generate a draft class for a league's upcoming draft.
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@hoopmanager/db";
import { generateProspects, generateProspectAttributes, getRevealedAttributes } from "@hoopmanager/engine";

export async function POST(req: NextRequest) {
  const cronToken = req.headers.get("x-cron-token");
  const isValidCron = cronToken === process.env.CRON_SECRET;

  if (!isValidCron) {
    const session = await auth();
    const isAdmin = (session?.user as any)?.isAdmin;
    if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { leagueId, seasonNumber } = await req.json();
  if (!leagueId) return NextResponse.json({ error: "leagueId required" }, { status: 400 });

  const teamCount = await db.team.count({ where: { leagueId } });
  const prospectCount = teamCount * 2 + 10; // generous pool

  const seeds = generateProspects(prospectCount);

  const draftClass = await db.draftClass.create({
    data: {
      leagueId,
      season: seasonNumber ?? 1,
    },
  });

  for (const seed of seeds) {
    const fullAttrs = generateProspectAttributes(seed.position, seed.potential, seed.age);
    // Store full attributes in JSON — manager reveals them via scouting
    await db.draftProspect.create({
      data: {
        draftClassId: draftClass.id,
        firstName: seed.firstName,
        lastName: seed.lastName,
        age: seed.age,
        nationality: seed.nationality,
        position: seed.position,
        potential: seed.potential,
        scoutingLevel: 0,
        attributes: fullAttrs,
      },
    });
  }

  // Generate draft picks (2 rounds, ordered by standings reverse — worst first)
  const teams = await db.team.findMany({
    where: { leagueId },
    include: {
      standings: { orderBy: { week: "desc" }, take: 1 },
    },
  });

  // Sort worst-to-best for lottery order
  const sorted = teams.sort((a, b) => {
    const aW = a.standings[0]?.wins ?? 0;
    const bW = b.standings[0]?.wins ?? 0;
    return aW - bW;
  });

  let pickNumber = 1;
  for (const round of [1, 2]) {
    for (const team of sorted) {
      await db.draftPick.create({
        data: {
          draftClassId: draftClass.id,
          teamId: team.id,
          round,
          pickNumber: pickNumber++,
          isOwn: true,
        },
      });
    }
    pickNumber = sorted.length * (round) + 1;
  }

  return NextResponse.json({ success: true, draftClassId: draftClass.id, prospects: prospectCount });
}
