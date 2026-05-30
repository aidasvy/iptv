import type { TeamTactics, OffensiveScheme, DefensiveScheme } from "../types";

export interface SchemeModifiers {
  threePointRate: number;      // bonus to 3PT attempt probability
  shootingBonus: number;       // to shot make rate
  shootingPenalty: number;     // vs opponent shot make rate
  assistBonus: number;         // to assist rate
  turnoverReduction: number;   // reduces TO rate
  offRebBonus: number;
  defRebBonus: number;
  stealBonus: number;
  blockBonus: number;
  fastBreakBonus: number;      // probability of fast break opportunity
}

// How each offensive scheme shifts the modifiers
const OFFENSIVE_SCHEME_MODS: Record<OffensiveScheme, Partial<SchemeModifiers>> = {
  PACE_AND_SPACE: {
    threePointRate: 0.12,
    shootingBonus: 0.03,
    assistBonus: 0.08,
    fastBreakBonus: 0.05,
  },
  TRIANGLE: {
    assistBonus: 0.12,
    turnoverReduction: 0.02,
    shootingBonus: 0.02,
  },
  MOTION_OFFENSE: {
    assistBonus: 0.10,
    offRebBonus: 0.02,
    shootingBonus: 0.02,
  },
  ISOLATION: {
    threePointRate: -0.05,
    shootingBonus: 0.01,
    turnoverReduction: -0.01, // more predictable → easier to defend
  },
  PICK_AND_ROLL: {
    assistBonus: 0.08,
    insideRate: 0.08,
    shootingBonus: 0.02,
  } as any,
  PRINCETON: {
    assistBonus: 0.14,
    turnoverReduction: 0.04,
    threePointRate: -0.03,
  },
  RUN_AND_GUN: {
    fastBreakBonus: 0.12,
    threePointRate: 0.06,
    offRebBonus: 0.02,
    turnoverReduction: -0.02, // risky
  },
  HALF_COURT_GRIND: {
    turnoverReduction: 0.05,
    threePointRate: -0.08,
    shootingBonus: 0.01,
  },
};

// How each defensive scheme shifts modifiers (as penalty to opponent)
const DEFENSIVE_SCHEME_MODS: Record<DefensiveScheme, Partial<SchemeModifiers>> = {
  MAN_TO_MAN: {
    shootingPenalty: 0.03,
    stealBonus: 0.01,
  },
  ZONE_2_3: {
    shootingPenalty: 0.04,
    stealBonus: 0.02,
    defRebBonus: 0.03,
    threePointRate: 0.05, // zone gives up more 3s
  },
  ZONE_3_2: {
    shootingPenalty: 0.02,
    threePointRate: -0.04,
    stealBonus: 0.01,
  },
  PRESS_FULL: {
    stealBonus: 0.04,
    shootingPenalty: 0.01,
    fastBreakBonus: 0.06, // generates run opportunities
    turnoverReduction: -0.04, // induces TOs on offense
  },
  PRESS_HALF: {
    stealBonus: 0.02,
    turnoverReduction: -0.02,
  },
  SWITCHING_EVERYTHING: {
    shootingPenalty: 0.03,
    stealBonus: 0.02,
    blockBonus: 0.01,
  },
  DROP_COVERAGE: {
    threePointRate: 0.06, // gives up 3PT
    shootingPenalty: 0.04, // but strong inside
    blockBonus: 0.02,
    defRebBonus: 0.03,
  },
  AGGRESSIVE_HELP: {
    stealBonus: 0.03,
    blockBonus: 0.03,
    shootingPenalty: 0.02,
    offRebBonus: 0.03, // opponent gets more off boards from rotations
  },
};

export function computeSchemeModifiers(
  offense: TeamTactics,
  defense: TeamTactics,
  _side: "home" | "away"
): SchemeModifiers {
  const off = OFFENSIVE_SCHEME_MODS[offense.offensiveScheme] ?? {};
  const def = DEFENSIVE_SCHEME_MODS[defense.defensiveScheme] ?? {};

  // Tempo modifier — fast pace boosts three point rate and fast breaks
  const tempoDiff = (offense.tempo - 50) / 100;

  return {
    threePointRate:    (off.threePointRate ?? 0) + (def.threePointRate ?? 0) + tempoDiff * 0.05 + (offense.threePointRate - 50) / 100 * 0.1,
    shootingBonus:     (off.shootingBonus ?? 0),
    shootingPenalty:   (def.shootingPenalty ?? 0) + (defense.aggression - 50) / 100 * 0.02,
    assistBonus:       (off.assistBonus ?? 0),
    turnoverReduction: (off.turnoverReduction ?? 0) + (def.turnoverReduction ?? 0),
    offRebBonus:       (off.offRebBonus ?? 0) + (def.offRebBonus ?? 0),
    defRebBonus:       (def.defRebBonus ?? 0),
    stealBonus:        (def.stealBonus ?? 0) + (defense.aggression - 50) / 100 * 0.02,
    blockBonus:        (def.blockBonus ?? 0),
    fastBreakBonus:    (off.fastBreakBonus ?? 0) + (def.fastBreakBonus ?? 0) + tempoDiff * 0.08,
  };
}
