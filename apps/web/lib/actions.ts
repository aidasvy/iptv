"use server";
// Server Actions — called from client components for mutations.

import { db } from "@hoopmanager/db";
import { requireSession } from "./session";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";

// ─── Auth ─────────────────────────────────────────────────────────────────────

const registerSchema = z.object({
  email: z.string().email("Invalid email"),
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/, "Letters, numbers and underscores only"),
  displayName: z.string().min(2).max(40),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function registerUser(formData: FormData) {
  const raw = {
    email: formData.get("email") as string,
    username: formData.get("username") as string,
    displayName: formData.get("displayName") as string,
    password: formData.get("password") as string,
  };

  const result = registerSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const { email, username, displayName, password } = result.data;

  const existing = await db.user.findFirst({
    where: { OR: [{ email }, { username }] },
    select: { email: true, username: true },
  });

  if (existing) {
    return { error: existing.email === email ? "Email already registered" : "Username taken" };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await db.user.create({
    data: { email, username, displayName, passwordHash },
  });

  return { success: true };
}

// ─── Team lineup ──────────────────────────────────────────────────────────────

const lineupSchema = z.object({
  teamId: z.string().cuid(),
  starterPG: z.string().cuid().nullable(),
  starterSG: z.string().cuid().nullable(),
  starterSF: z.string().cuid().nullable(),
  starterPF: z.string().cuid().nullable(),
  starterC:  z.string().cuid().nullable(),
  rotationOrder: z.array(z.string().cuid()),
});

export async function saveLineup(data: z.infer<typeof lineupSchema>) {
  const session = await requireSession();

  const team = await db.team.findUnique({
    where: { id: data.teamId },
    select: { managerId: true },
  });

  if (team?.managerId !== session.user.id) {
    return { error: "Unauthorized" };
  }

  const parsed = lineupSchema.safeParse(data);
  if (!parsed.success) return { error: "Invalid lineup data" };

  await db.team.update({
    where: { id: data.teamId },
    data: {
      starterPG: parsed.data.starterPG,
      starterSG: parsed.data.starterSG,
      starterSF: parsed.data.starterSF,
      starterPF: parsed.data.starterPF,
      starterC:  parsed.data.starterC,
      rotationOrder: parsed.data.rotationOrder,
    },
  });

  revalidatePath("/team");
  return { success: true };
}

// ─── Tactics ──────────────────────────────────────────────────────────────────

const tacticsSchema = z.object({
  teamId: z.string().cuid(),
  offensiveScheme: z.enum(["PACE_AND_SPACE","TRIANGLE","MOTION_OFFENSE","ISOLATION","PICK_AND_ROLL","PRINCETON","RUN_AND_GUN","HALF_COURT_GRIND"]),
  defensiveScheme: z.enum(["MAN_TO_MAN","ZONE_2_3","ZONE_3_2","PRESS_FULL","PRESS_HALF","SWITCHING_EVERYTHING","DROP_COVERAGE","AGGRESSIVE_HELP"]),
  tempoSetting: z.number().min(1).max(100),
  aggressionLevel: z.number().min(1).max(100),
  threePointRate: z.number().min(1).max(100),
});

export async function saveTactics(data: z.infer<typeof tacticsSchema>) {
  const session = await requireSession();

  const team = await db.team.findUnique({
    where: { id: data.teamId },
    select: { managerId: true },
  });

  if (team?.managerId !== session.user.id) return { error: "Unauthorized" };

  const parsed = tacticsSchema.safeParse(data);
  if (!parsed.success) return { error: "Invalid tactics data" };

  await db.team.update({
    where: { id: data.teamId },
    data: {
      offensiveScheme: parsed.data.offensiveScheme,
      defensiveScheme: parsed.data.defensiveScheme,
      tempoSetting: parsed.data.tempoSetting,
      aggressionLevel: parsed.data.aggressionLevel,
      threePointRate: parsed.data.threePointRate,
    },
  });

  revalidatePath("/team");
  return { success: true };
}

// ─── Training ─────────────────────────────────────────────────────────────────

const trainingSchema = z.object({
  teamId: z.string().cuid(),
  week: z.number().int().min(1),
  focus: z.enum(["SHOOTING","ATHLETICISM","BALL_SKILLS","DEFENSE","STRENGTH","PLAYMAKING","FINISHING","MENTAL"]),
  intensity: z.number().min(10).max(100),
});

export async function saveTrainingPlan(data: z.infer<typeof trainingSchema>) {
  const session = await requireSession();

  const team = await db.team.findUnique({
    where: { id: data.teamId },
    select: { managerId: true, leagueId: true },
  });

  if (team?.managerId !== session.user.id) return { error: "Unauthorized" };

  const parsed = trainingSchema.safeParse(data);
  if (!parsed.success) return { error: "Invalid training data" };

  await db.trainingSchedule.upsert({
    where: { teamId_week: { teamId: parsed.data.teamId, week: parsed.data.week } },
    create: { ...parsed.data },
    update: { focus: parsed.data.focus, intensity: parsed.data.intensity },
  });

  revalidatePath("/training");
  return { success: true };
}

// ─── Trade ────────────────────────────────────────────────────────────────────

const tradeSchema = z.object({
  fromTeamId: z.string().cuid(),
  toTeamId: z.string().cuid(),
  toUserId: z.string().cuid(),
  outgoingPlayerIds: z.array(z.string().cuid()),
  incomingPlayerIds: z.array(z.string().cuid()),
  outgoingPickIds: z.array(z.string().cuid()).optional(),
  incomingPickIds: z.array(z.string().cuid()).optional(),
  message: z.string().max(500).optional(),
});

export async function proposeTrade(data: z.infer<typeof tradeSchema>) {
  const session = await requireSession();

  const team = await db.team.findUnique({
    where: { id: data.fromTeamId },
    select: { managerId: true },
  });

  if (team?.managerId !== session.user.id) return { error: "Unauthorized" };

  const parsed = tradeSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48h

  const trade = await db.tradeOffer.create({
    data: {
      fromUserId: session.user.id,
      toUserId: parsed.data.toUserId,
      fromTeamId: parsed.data.fromTeamId,
      toTeamId: parsed.data.toTeamId,
      message: parsed.data.message,
      expiresAt,
      assets: {
        create: [
          ...parsed.data.outgoingPlayerIds.map((id) => ({ playerId: id, direction: "from" })),
          ...parsed.data.incomingPlayerIds.map((id) => ({ playerId: id, direction: "to" })),
          ...(parsed.data.outgoingPickIds ?? []).map((id) => ({ draftPickId: id, direction: "from" })),
          ...(parsed.data.incomingPickIds ?? []).map((id) => ({ draftPickId: id, direction: "to" })),
        ],
      },
    },
  });

  // Notify the receiving manager
  await db.notification.create({
    data: {
      userId: parsed.data.toUserId,
      type: "TRADE_RECEIVED",
      title: "Trade Offer Received",
      body: "You have a new trade proposal. Check the Transfers page.",
      data: { tradeId: trade.id },
    },
  });

  revalidatePath("/transfers");
  return { success: true, tradeId: trade.id };
}

export async function respondToTrade(tradeId: string, accept: boolean) {
  const session = await requireSession();

  const trade = await db.tradeOffer.findUnique({
    where: { id: tradeId },
    include: {
      assets: { include: { player: true } },
      fromTeam: true,
      toTeam: true,
    },
  });

  if (!trade || trade.toUserId !== session.user.id) return { error: "Unauthorized" };
  if (trade.status !== "PROPOSED") return { error: "Trade is no longer active" };
  if (trade.expiresAt < new Date()) return { error: "Trade offer has expired" };

  if (!accept) {
    await db.tradeOffer.update({ where: { id: tradeId }, data: { status: "REJECTED" } });
    revalidatePath("/transfers");
    return { success: true };
  }

  // Execute the trade — swap players between teams
  await db.$transaction(async (tx) => {
    await tx.tradeOffer.update({ where: { id: tradeId }, data: { status: "ACCEPTED" } });

    for (const asset of trade.assets) {
      if (!asset.playerId) continue;
      const targetTeamId = asset.direction === "from" ? trade.toTeamId : trade.fromTeamId;
      await tx.player.update({ where: { id: asset.playerId }, data: { teamId: targetTeamId } });
    }

    // Notify original proposer
    await tx.notification.create({
      data: {
        userId: trade.fromUserId,
        type: "TRADE_ACCEPTED",
        title: "Trade Accepted!",
        body: `${trade.toTeam.name} accepted your trade offer.`,
        data: { tradeId },
      },
    });
  });

  revalidatePath("/transfers");
  revalidatePath("/team");
  return { success: true };
}
