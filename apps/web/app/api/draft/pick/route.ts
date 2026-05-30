import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@hoopmanager/db";
import { revalidatePath } from "next/cache";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { draftPickId, prospectId } = await req.json();
  if (!draftPickId || !prospectId) {
    return NextResponse.json({ error: "draftPickId and prospectId required" }, { status: 400 });
  }

  const pick = await db.draftPick.findUnique({
    where: { id: draftPickId },
    include: { team: { select: { managerId: true, id: true } } },
  });

  if (!pick || pick.isUsed) return NextResponse.json({ error: "Pick not available" }, { status: 400 });
  if (pick.team.managerId !== session.user.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const prospect = await db.draftProspect.findUnique({
    where: { id: prospectId },
    include: { draftClass: true },
  });

  if (!prospect || prospect.draftedByTeamId) {
    return NextResponse.json({ error: "Prospect already drafted" }, { status: 400 });
  }

  // Convert prospect → player and add to team
  const attrs = prospect.attributes as Record<string, number>;

  await db.$transaction(async (tx) => {
    // Create player from prospect
    const player = await tx.player.create({
      data: {
        teamId: pick.team.id,
        firstName: prospect.firstName,
        lastName: prospect.lastName,
        age: prospect.age,
        nationality: prospect.nationality,
        position: prospect.position,
        potential: prospect.potential,
        potentialKnown: prospect.scoutingLevel >= 3,
        salary: rookieSalary(pick.round, pick.pickNumber ?? 30),
        contractYears: pick.round === 1 ? 4 : 2,
        contractType: "ROOKIE",
        // attributes
        speed:         attrs.speed ?? 50,
        strength:      attrs.strength ?? 50,
        verticalJump:  attrs.verticalJump ?? 50,
        stamina:       attrs.stamina ?? 50,
        wingspan:      attrs.wingspan ?? 50,
        ballHandling:  attrs.ballHandling ?? 50,
        passing:       attrs.passing ?? 50,
        threePoint:    attrs.threePoint ?? 50,
        midRange:      attrs.midRange ?? 50,
        insideScoring: attrs.insideScoring ?? 50,
        postGame:      attrs.postGame ?? 50,
        freeThrow:     attrs.freeThrow ?? 50,
        offMovement:   attrs.offMovement ?? 50,
        perimeterDef:  attrs.perimeterDef ?? 50,
        interiorDef:   attrs.interiorDef ?? 50,
        rebounding:    attrs.rebounding ?? 50,
        shotBlocking:  attrs.shotBlocking ?? 50,
        stealing:      attrs.stealing ?? 50,
        defensiveIQ:   attrs.defensiveIQ ?? 50,
        offensiveIQ:   attrs.offensiveIQ ?? 50,
        leadership:    attrs.leadership ?? 50,
        clutch:        attrs.clutch ?? 50,
        coachability:  attrs.coachability ?? 50,
        consistency:   attrs.consistency ?? 50,
      },
    });

    // Mark prospect as drafted
    await tx.draftProspect.update({
      where: { id: prospectId },
      data: { draftedByTeamId: pick.team.id, draftedAtPick: pick.pickNumber },
    });

    // Mark pick as used
    await tx.draftPick.update({
      where: { id: draftPickId },
      data: { isUsed: true },
    });

    // Notification
    await tx.notification.create({
      data: {
        userId: session.user!.id,
        type: "DRAFT_PICK",
        title: `Pick #${pick.pickNumber}: ${prospect.firstName} ${prospect.lastName}`,
        body: `You drafted ${prospect.firstName} ${prospect.lastName} (${prospect.position}, ${prospect.potential} potential) with pick #${pick.pickNumber}.`,
        data: { playerId: player.id },
      },
    });
  });

  revalidatePath("/draft");
  revalidatePath("/team");
  return NextResponse.json({ success: true });
}

function rookieSalary(round: number, pickNumber: number): number {
  // NBA rookie scale approximation in $K
  if (round === 1) {
    const scale = Math.max(1, 31 - pickNumber);
    return 1500 + scale * 300; // #1 pick ~$10.4M, #30 ~$1.8M
  }
  return 1100 + Math.floor(Math.random() * 400); // 2nd round: minimum-ish
}
