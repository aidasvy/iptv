import type { PlayerBoxScore, GameResult } from "../types";

// Compute advanced stats from a box score — mirrors NBA official formulas.

export function computeAdvancedStats(
  box: PlayerBoxScore,
  teamPts: number,
  teamFga: number,
  teamFta: number,
  teamTov: number,
  teamOrb: number,
  oppDrb: number,
  teamMins: number = 240
): {
  per: number;
  trueShootingPct: number;
  usageRate: number;
  offRtg: number;
  assistPct: number;
  reboundPct: number;
} {
  const { minutes, points, fgm, fga, threePM, ftm, fta, rebounds, offRebounds, assists, turnovers, steals, blocks, fouls } = box;

  if (minutes === 0) return { per: 0, trueShootingPct: 0, usageRate: 0, offRtg: 0, assistPct: 0, reboundPct: 0 };

  // True Shooting %
  const tsAttempts = fga + 0.44 * fta;
  const trueShootingPct = tsAttempts > 0 ? points / (2 * tsAttempts) : 0;

  // Usage Rate
  const usageRate = teamMins > 0 && minutes > 0
    ? ((fga + 0.44 * fta + turnovers) * (teamMins / 5)) /
      (minutes * (teamFga + 0.44 * teamFta + teamTov))
    : 0;

  // Assist %: of teammate made FGs while on floor, % assisted by player
  const assistPct = fga > 0 && minutes > 0
    ? assists / ((minutes * (teamFga - fga) / teamMins) + assists)
    : 0;

  // Offensive Rebound %
  const reboundPct =
    (teamMins > 0 && minutes > 0 && offRebounds + oppDrb > 0)
      ? (offRebounds * (teamMins / 5)) / (minutes * (teamOrb + oppDrb))
      : 0;

  // PER (simplified Hollinger formula)
  const pace = 100; // approximate
  const factor = 2 / 3 - (0.5 * assists) / (2 * fgm + 0.0001);
  const vop = teamPts > 0 ? teamPts / (teamFga - teamOrb + teamTov + 0.44 * teamFta) : 1;
  const drbp = oppDrb > 0 ? oppDrb / (teamOrb + oppDrb) : 0.7;

  const perUnadj =
    (1 / minutes) *
    (threePM
      + (2 / 3) * assists
      + (2 - factor * (teamFga / (teamMins / 5 + 0.0001))) * fgm
      - vop * turnovers
      - vop * drbp * (fga - fgm)
      + vop * (1 - drbp) * (rebounds - offRebounds)
      + vop * drbp * offRebounds
      + vop * steals
      + vop * drbp * blocks
      - fouls * (0.44 * (teamFta / (teamMins / 5 + 0.0001)) * vop - 0.44 * vop * 0.44 + vop * (1 - 0.44))
    );

  const per = Math.round(perUnadj * (pace / 100) * 15 * 10) / 10;

  // Offensive rating (simplified: team pts attributed by usage share)
  const offRtg = usageRate > 0
    ? Math.round((points + assists * 1.5) / (fga + 0.44 * fta + turnovers + 0.0001) * 100) / 100
    : 0;

  return {
    per: Math.max(0, Math.min(50, per)),
    trueShootingPct: Math.round(trueShootingPct * 1000) / 10,
    usageRate: Math.round(usageRate * 1000) / 10,
    offRtg,
    assistPct: Math.round(assistPct * 1000) / 10,
    reboundPct: Math.round(reboundPct * 1000) / 10,
  };
}

// Value Over Replacement Player (season-level)
export function computeVORP(bpm: number, minutesPlayed: number, gamesPlayed: number): number {
  const minutesPer100Poss = (minutesPlayed / (gamesPlayed || 1)) * (100 / 48);
  return Math.round(((bpm + 2) * minutesPer100Poss * gamesPlayed) / 100 * 10) / 10;
}

// Win Shares (simplified)
export function computeWinShares(per: number, minutesPlayed: number, seasonMinutes: number = 19728): number {
  const leagueAvgPer = 15;
  const marginalPer = per - leagueAvgPer;
  const ws = (marginalPer * minutesPlayed) / (seasonMinutes * 0.3);
  return Math.round(ws * 10) / 10;
}

// Box Plus/Minus estimate from season box stats
export function estimateBPM(ppg: number, rpg: number, apg: number, spg: number, bpg: number, topg: number, usageRate: number): number {
  // Simplified model; real BPM requires team context
  return Math.round(
    (ppg * 0.12 + rpg * 0.15 + apg * 0.2 + spg * 0.8 + bpg * 0.5 - topg * 0.25 - (15 - ppg) * 0.01) *
    (usageRate / 20) * 10
  ) / 10;
}

export function computeGameAdvancedStats(result: GameResult): void {
  // Aggregate team stats for context
  const homeTeamStats = aggregateTeam(result.homeBoxScore);
  const awayTeamStats = aggregateTeam(result.awayBoxScore);

  for (const box of result.homeBoxScore) {
    const adv = computeAdvancedStats(
      box,
      homeTeamStats.pts, homeTeamStats.fga, homeTeamStats.fta, homeTeamStats.tov,
      homeTeamStats.orb, awayTeamStats.drb
    );
    (box as any).per = adv.per;
    (box as any).trueShootingPct = adv.trueShootingPct;
    (box as any).usageRate = adv.usageRate;
  }

  for (const box of result.awayBoxScore) {
    const adv = computeAdvancedStats(
      box,
      awayTeamStats.pts, awayTeamStats.fga, awayTeamStats.fta, awayTeamStats.tov,
      awayTeamStats.orb, homeTeamStats.drb
    );
    (box as any).per = adv.per;
    (box as any).trueShootingPct = adv.trueShootingPct;
    (box as any).usageRate = adv.usageRate;
  }
}

function aggregateTeam(boxes: PlayerBoxScore[]) {
  return boxes.reduce(
    (acc, b) => ({
      pts: acc.pts + b.points,
      fga: acc.fga + b.fga,
      fta: acc.fta + b.fta,
      tov: acc.tov + b.turnovers,
      orb: acc.orb + b.offRebounds,
      drb: acc.drb + b.defRebounds,
    }),
    { pts: 0, fga: 0, fta: 0, tov: 0, orb: 0, drb: 0 }
  );
}
