import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@hoopmanager/db";
import { getRevealedAttributes, scoutingCost } from "@hoopmanager/engine";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { prospectId } = await req.json();
  if (!prospectId) return NextResponse.json({ error: "prospectId required" }, { status: 400 });

  const prospect = await db.draftProspect.findUnique({ where: { id: prospectId } });
  if (!prospect) return NextResponse.json({ error: "Prospect not found" }, { status: 404 });

  if (prospect.scoutingLevel >= 5) {
    return NextResponse.json({ error: "Prospect is fully scouted" }, { status: 400 });
  }

  const team = await db.team.findFirst({
    where: { managerId: session.user.id },
    select: { id: true, budget: true },
  });
  if (!team) return NextResponse.json({ error: "No team found" }, { status: 404 });

  const cost = scoutingCost(prospect.scoutingLevel);
  if (team.budget < cost) {
    return NextResponse.json({ error: `Insufficient budget. Scouting costs $${cost.toLocaleString()}K` }, { status: 400 });
  }

  const newLevel = prospect.scoutingLevel + 1;
  const revealed = getRevealedAttributes(prospect.attributes as any, newLevel);

  await db.$transaction([
    db.draftProspect.update({
      where: { id: prospectId },
      data: { scoutingLevel: newLevel },
    }),
    db.team.update({
      where: { id: team.id },
      data: { budget: { decrement: cost } },
    }),
  ]);

  return NextResponse.json({ success: true, newLevel, revealed, cost });
}
