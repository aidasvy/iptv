// Weekly player development: apply training gains, age regression, injury checks.
import { db } from "@hoopmanager/db";
import { developPlayer, toSimPlayer } from "@hoopmanager/engine";
import type { PlayerAttributes } from "@hoopmanager/engine";

const TRAINING_ATTR_MAP: Record<string, (keyof PlayerAttributes)[]> = {
  SHOOTING:    ["threePoint", "midRange", "freeThrow"],
  ATHLETICISM: ["speed", "verticalJump", "stamina"],
  BALL_SKILLS: ["ballHandling", "passing"],
  DEFENSE:     ["perimeterDef", "interiorDef", "defensiveIQ"],
  STRENGTH:    ["strength", "interiorDef", "rebounding"],
  PLAYMAKING:  ["offensiveIQ", "passing", "offMovement"],
  FINISHING:   ["insideScoring", "postGame"],
  MENTAL:      ["leadership", "clutch", "consistency"],
};

// Base gain per attr per week at intensity 100 — scales with intensity
const BASE_GAIN = 0.8;

export async function runWeeklyDevelopment(leagueId: string, week: number): Promise<void> {
  const teams = await db.team.findMany({
    where: { leagueId },
    include: {
      players: {
        where: { isInjured: false },
      },
      trainingSchedule: {
        where: { week },
      },
    },
  });

  for (const team of teams) {
    const schedule = team.trainingSchedule[0];
    if (!schedule) continue;

    const focusAttrs = TRAINING_ATTR_MAP[schedule.focus] ?? [];
    const intensityScale = schedule.intensity / 100;

    for (const player of team.players) {
      const sim = toSimPlayer(player);

      // Base gain for each trained attribute
      const baseGain: Partial<PlayerAttributes> = {};
      for (const attr of focusAttrs) {
        baseGain[attr] = BASE_GAIN * intensityScale;
      }

      const delta = developPlayer(sim, baseGain, week);

      // Injury risk check
      const injuryProb = Math.max(0, (schedule.intensity - 40) * 0.003);
      const injured = Math.random() < injuryProb;

      // Build attribute update
      const attrUpdate: Record<string, number> = {};
      for (const [attr, gain] of Object.entries(delta)) {
        const current = (player as any)[attr] as number;
        if (typeof current === "number" && typeof gain === "number") {
          attrUpdate[attr] = Math.min(99, Math.max(20, Math.round((current + gain) * 10) / 10));
        }
      }

      await db.player.update({
        where: { id: player.id },
        data: {
          ...attrUpdate,
          // Recover fatigue during lighter weeks
          fatigue: { decrement: schedule.intensity < 50 ? 10 : 5 },
          ...(injured ? {
            isInjured: true,
            injuryType: "ANKLE_SPRAIN",
            injuryWeeks: 1 + Math.floor(Math.random() * 3),
          } : {}),
        },
      });

      // Record training session
      await db.trainingSession.create({
        data: {
          playerId: player.id,
          scheduleId: schedule.id,
          gain: delta,
          injuryRisk: injuryProb,
          resultedInInjury: injured,
        },
      });

      // Notify manager if player was injured in training
      if (injured) {
        await db.notification.create({
          data: {
            userId: team.managerId,
            type: "INJURY",
            title: "Training Injury",
            body: `${player.firstName} ${player.lastName} suffered an ankle sprain during training. Out for ${1}-${3} weeks.`,
            data: { playerId: player.id },
          },
        });
      }
    }

    // Reduce injury duration for already-injured players
    await db.player.updateMany({
      where: { teamId: team.id, isInjured: true },
      data: { injuryWeeks: { decrement: 1 } },
    });

    // Heal players whose injury time is up
    await db.player.updateMany({
      where: { teamId: team.id, isInjured: true, injuryWeeks: { lte: 0 } },
      data: { isInjured: false, injuryType: null, injuryWeeks: 0 },
    });
  }
}
