// Post-game morale and team chemistry updates.
// Called inside the simulate-game transaction after results are saved.

import type { PlayerBoxScore } from "@hoopmanager/engine";

interface MoraleInput {
  teamId: string;
  won: boolean;
  isPlayoffs: boolean;
  boxScores: PlayerBoxScore[];
  teamChemistry: number;
  leadershipAvg: number; // avg leadership attr of starters
}

interface MoraleDeltas {
  teamMoraleDelta: number;
  chemistryDelta: number;
  playerDeltas: Array<{ playerId: string; moraleDelta: number; formDelta: number }>;
}

export function computeMoraleDeltas(input: MoraleInput): MoraleDeltas {
  const { won, isPlayoffs, boxScores, teamChemistry, leadershipAvg } = input;

  // Team morale: win/loss base
  const winLossBase = won ? 3 : -3;
  // Playoffs amplify everything
  const playoffMult = isPlayoffs ? 1.8 : 1.0;
  // Leadership cushions losses, amplifies wins
  const leadershipMod = ((leadershipAvg - 60) / 100) * 1.5;

  const teamMoraleDelta = Math.round((winLossBase + leadershipMod) * playoffMult);

  // Chemistry: builds slowly with consistent wins, erodes with losses + low minutes variance
  const chemistryDelta = won
    ? Math.round(0.5 + (teamChemistry < 60 ? 1.5 : 0.5)) // builds faster when low
    : Math.round(-0.5 - (teamChemistry > 80 ? 0.5 : 0));  // erodes faster when high

  // Per-player morale: based on their individual performance and role
  const playerDeltas = boxScores.map((box) => {
    const pts = box.points;
    const mins = box.minutes;

    // Performance satisfaction: did they have a good game?
    const performanceMod = pts >= 25 ? 4 : pts >= 15 ? 2 : pts >= 8 ? 0 : -1;

    // Minutes satisfaction: starters expect big minutes
    const minutesMod = box.isStarter
      ? mins >= 28 ? 1 : mins >= 20 ? 0 : -2
      : mins >= 15 ? 1 : mins >= 8 ? 0 : 0;

    const moraleDelta = Math.round(
      (winLossBase * 0.5 + performanceMod + minutesMod) * playoffMult
    );

    // Form: hot/cold streak — weighted recent performance
    const formDelta = pts >= 25
      ? 5
      : pts >= 15
      ? 2
      : pts <= 4 && mins >= 20
      ? -4
      : -1;

    return { playerId: box.playerId, moraleDelta, formDelta };
  });

  return { teamMoraleDelta, chemistryDelta, playerDeltas };
}

// Clamp values to valid range
export function clampStat(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}
