import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@hoopmanager/db";
import { z } from "zod";
import { generatePlayerAttributes } from "@hoopmanager/engine";

const schema = z.object({
  city: z.string().min(2).max(50),
  teamName: z.string().min(2).max(50),
  abbreviation: z.string().length(3).regex(/^[A-Z]+$/),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  arena: z.string().min(2).max(80),
  leagueId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const existing = await db.team.findFirst({ where: { managerId: session.user.id } });
  if (existing) return NextResponse.json({ error: "You already have a team" }, { status: 400 });

  // Find an open league or create one
  let league = parsed.data.leagueId
    ? await db.league.findUnique({ where: { id: parsed.data.leagueId } })
    : await db.league.findFirst({
        where: { isPublic: true },
        orderBy: { createdAt: "desc" },
      });

  if (!league) {
    // Create the first league
    league = await db.league.create({
      data: {
        name: "Season 1 League",
        slug: `season-1-${Date.now()}`,
        type: "COMPETITIVE",
        maxTeams: 16,
        salaryCap: 136000,
        luxuryTax: 165000,
        currentPhase: "OFFSEASON_TRAINING",
        currentWeek: 1,
        isPublic: true,
      },
    });
  }

  const { city, teamName, abbreviation, primaryColor, secondaryColor, arena } = parsed.data;

  // Create team and seed a starter roster (12 players)
  const team = await db.$transaction(async (tx) => {
    const newTeam = await tx.team.create({
      data: {
        leagueId: league!.id,
        managerId: session.user!.id,
        name: teamName,
        city,
        abbreviation,
        primaryColor,
        secondaryColor,
        arena,
        budget: 50000,
      },
    });

    // Generate a starter roster
    const rosterBlueprint: Array<{
      pos: "PG" | "SG" | "SF" | "PF" | "C";
      potential: "ELITE" | "STAR" | "STARTER" | "ROTATION" | "FRINGE";
      ageRange: [number, number];
      salary: number;
      years: number;
    }> = [
      { pos: "PG", potential: "STAR",     ageRange: [24, 28], salary: 24000, years: 3 },
      { pos: "SG", potential: "STARTER",  ageRange: [22, 27], salary: 14000, years: 2 },
      { pos: "SF", potential: "STARTER",  ageRange: [25, 30], salary: 18000, years: 3 },
      { pos: "PF", potential: "ROTATION", ageRange: [24, 29], salary: 10000, years: 2 },
      { pos: "C",  potential: "STARTER",  ageRange: [24, 28], salary: 16000, years: 2 },
      { pos: "PG", potential: "ROTATION", ageRange: [22, 26], salary: 4000,  years: 2 },
      { pos: "SG", potential: "ROTATION", ageRange: [26, 32], salary: 6000,  years: 1 },
      { pos: "SF", potential: "ROTATION", ageRange: [23, 28], salary: 5000,  years: 2 },
      { pos: "PF", potential: "ROTATION", ageRange: [22, 27], salary: 3500,  years: 2 },
      { pos: "C",  potential: "FRINGE",   ageRange: [24, 30], salary: 2500,  years: 1 },
      { pos: "PG", potential: "FRINGE",   ageRange: [20, 23], salary: 1500,  years: 2 },
      { pos: "SF", potential: "STAR",     ageRange: [19, 22], salary: 4000,  years: 3 },
    ];

    const firstNames = ["James","Kevin","Stephen","LeBron","Jaylen","Devin","Trae","Luka","Giannis","Joel","Nikola","Damian","Chris","Anthony","Bradley","Marcus","Devon","Amir","Kwame","Jonas","Kai","Mateo"];
    const lastNames  = ["Johnson","Williams","Brown","Davis","Smith","Jones","Garcia","Miller","Taylor","Wilson","Thompson","Harris","Martinez","Clark","Lewis","Robinson","Walker","Young","Allen","King","Wright","Scott"];

    const nationalities = ["🇺🇸","🇺🇸","🇺🇸","🇺🇸","🇺🇸","🇺🇸","🇫🇷","🇩🇪","🇬🇷","🇩🇰","🇸🇳","🇦🇺","🇧🇷","🇷🇸","🇩🇿","🇯🇵","🇬🇭","🇪🇸","🇦🇷","🇨🇦"];

    for (const bp of rosterBlueprint) {
      const age = bp.ageRange[0] + Math.floor(Math.random() * (bp.ageRange[1] - bp.ageRange[0]));
      const attrs = generatePlayerAttributes(bp.pos, bp.potential, age);
      const fn = firstNames[Math.floor(Math.random() * firstNames.length)];
      const ln = lastNames[Math.floor(Math.random() * lastNames.length)];

      await tx.player.create({
        data: {
          teamId: newTeam.id,
          firstName: fn,
          lastName: ln,
          age,
          nationality: nationalities[Math.floor(Math.random() * nationalities.length)],
          position: bp.pos,
          potential: bp.potential,
          salary: bp.salary,
          contractYears: bp.years,
          contractType: bp.salary > 20000 ? "MAX" : bp.salary > 10000 ? "VETERAN" : bp.salary < 3000 ? "MINIMUM" : "VETERAN",
          ...attrs,
        },
      });
    }

    return newTeam;
  });

  return NextResponse.json({ success: true, teamId: team.id });
}
