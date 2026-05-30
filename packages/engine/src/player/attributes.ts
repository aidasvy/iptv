import type { SimPlayer, PlayerAttributes } from "../types";

// Returns an attribute value adjusted for morale, form, and fatigue.
export function getEffectiveRating(
  player: SimPlayer,
  attr: keyof PlayerAttributes
): number {
  const raw = player.attrs[attr] ?? 50;
  const moraleEffect = (player.morale - 75) / 100 * 5;   // ±5 at extremes
  const formEffect = (player.form - 75) / 100 * 8;        // ±8
  const fatigueEffect = -(player.fatigue / 100) * 12;     // up to -12

  return Math.max(1, Math.min(99, raw + moraleEffect + formEffect + fatigueEffect));
}

// Compute overall rating — weighted by position importance
export function computeOverall(player: SimPlayer): number {
  const a = player.attrs;
  const weights: Record<string, Partial<Record<keyof PlayerAttributes, number>>> = {
    PG: {
      ballHandling: 0.15, passing: 0.15, offensiveIQ: 0.12,
      threePoint: 0.10, midRange: 0.08,
      perimeterDef: 0.10, stealing: 0.08,
      speed: 0.10, stamina: 0.06, clutch: 0.06,
    },
    SG: {
      threePoint: 0.18, midRange: 0.12, ballHandling: 0.10,
      offensiveIQ: 0.10, perimeterDef: 0.12, stealing: 0.08,
      speed: 0.10, clutch: 0.08, consistency: 0.06, stamina: 0.06,
    },
    SF: {
      threePoint: 0.14, insideScoring: 0.10, midRange: 0.10,
      strength: 0.08, perimeterDef: 0.12, rebounding: 0.10,
      ballHandling: 0.08, speed: 0.10, offensiveIQ: 0.10, clutch: 0.08,
    },
    PF: {
      strength: 0.12, rebounding: 0.14, insideScoring: 0.12,
      interiorDef: 0.14, verticalJump: 0.10, postGame: 0.10,
      threePoint: 0.08, offensiveIQ: 0.08, stamina: 0.06, clutch: 0.06,
    },
    C: {
      strength: 0.12, rebounding: 0.16, shotBlocking: 0.14,
      interiorDef: 0.16, insideScoring: 0.12, postGame: 0.10,
      verticalJump: 0.08, stamina: 0.06, offensiveIQ: 0.06,
    },
  };

  const pos = player.position;
  const w = weights[pos] ?? weights.SF;
  let sum = 0;
  let totalWeight = 0;

  for (const [attr, weight] of Object.entries(w)) {
    const val = a[attr as keyof PlayerAttributes] ?? 50;
    sum += val * (weight ?? 0);
    totalWeight += weight ?? 0;
  }

  // Fill remaining weight with average of all attrs
  if (totalWeight < 1) {
    const allAvg = Object.values(a).reduce((s, v) => s + v, 0) / Object.values(a).length;
    sum += allAvg * (1 - totalWeight);
  }

  return Math.round(Math.max(1, Math.min(99, sum)));
}

// Player development: apply age curve + training gains
export function developPlayer(
  player: SimPlayer,
  trainingGain: Partial<PlayerAttributes>,
  weeksInSeason: number
): Partial<PlayerAttributes> {
  const age = player.age;
  const potential = player.attrs;

  // Age curve: peak ~27, decline from 30+
  const ageCurveMult =
    age < 22 ? 1.2 :
    age < 25 ? 1.1 :
    age < 28 ? 1.0 :
    age < 31 ? 0.9 :
    age < 34 ? 0.7 :
    0.4;

  const coachabilityMult = 0.7 + (player.attrs.coachability / 100) * 0.6;
  const delta: Partial<PlayerAttributes> = {};

  for (const [attr, gain] of Object.entries(trainingGain)) {
    const k = attr as keyof PlayerAttributes;
    const current = player.attrs[k] ?? 50;
    // Diminishing returns: harder to improve already high attributes
    const ceilingFactor = 1 - (current / 100) * 0.6;
    const change = (gain as number) * ageCurveMult * coachabilityMult * ceilingFactor;
    delta[k] = change;
  }

  return delta;
}

// Generate a realistic player based on position + potential
export function generatePlayerAttributes(
  position: "PG" | "SG" | "SF" | "PF" | "C",
  potential: "ELITE" | "STAR" | "STARTER" | "ROTATION" | "FRINGE",
  age: number,
  rng: () => number = Math.random
): PlayerAttributes {
  const potentialBase: Record<string, number> = {
    ELITE: 78, STAR: 68, STARTER: 58, ROTATION: 48, FRINGE: 38,
  };
  const base = potentialBase[potential];
  const variance = 15;

  // Apply age regression for older players, lower base for young
  const ageAdj = age < 22 ? -10 : age > 30 ? -((age - 30) * 2.5) : 0;

  const stat = (bias: number = 0, spread: number = variance): number =>
    Math.round(Math.max(20, Math.min(99, base + ageAdj + bias + (rng() - 0.5) * spread * 2)));

  const positionProfiles: Record<string, Partial<PlayerAttributes>> = {
    PG: { ballHandling: 10, passing: 12, speed: 8, offensiveIQ: 10, threePoint: 5, perimeterDef: 2 },
    SG: { threePoint: 10, midRange: 8, ballHandling: 5, perimeterDef: 5, speed: 5 },
    SF: { threePoint: 6, insideScoring: 5, perimeterDef: 5, rebounding: 4, speed: 4, strength: 4 },
    PF: { strength: 10, rebounding: 12, interiorDef: 10, insideScoring: 8, shotBlocking: 5 },
    C: { strength: 12, rebounding: 15, shotBlocking: 15, interiorDef: 15, insideScoring: 8 },
  };

  const profile = positionProfiles[position] ?? {};

  return {
    speed:          stat(profile.speed ?? -5),
    strength:       stat(profile.strength ?? -5),
    verticalJump:   stat(profile.verticalJump ?? 0),
    stamina:        stat(0),
    wingspan:       stat(profile.wingspan ?? 0),
    ballHandling:   stat(profile.ballHandling ?? -8),
    passing:        stat(profile.passing ?? -5),
    threePoint:     stat(profile.threePoint ?? -10),
    midRange:       stat(profile.midRange ?? -5),
    insideScoring:  stat(profile.insideScoring ?? -5),
    postGame:       stat(profile.postGame ?? -10),
    freeThrow:      stat(profile.freeThrow ?? 0),
    offMovement:    stat(profile.offMovement ?? 0),
    perimeterDef:   stat(profile.perimeterDef ?? -5),
    interiorDef:    stat(profile.interiorDef ?? -10),
    rebounding:     stat(profile.rebounding ?? -5),
    shotBlocking:   stat(profile.shotBlocking ?? -15),
    stealing:       stat(profile.stealing ?? -5),
    defensiveIQ:    stat(profile.defensiveIQ ?? 0),
    offensiveIQ:    stat(profile.offensiveIQ ?? 0),
    leadership:     stat(0),
    clutch:         stat(0),
    coachability:   stat(0),
    consistency:    stat(0),
  };
}
