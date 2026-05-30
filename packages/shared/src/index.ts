// Shared constants and utilities used across web app and engine

export const LEAGUE_DEFAULTS = {
  SALARY_CAP: 136000,       // $136M in $K
  LUXURY_TAX: 165000,       // $165M
  FIRST_APRON: 178000,      // $178M
  SECOND_APRON: 189000,     // $189M
  ROSTER_MIN: 12,
  ROSTER_MAX: 15,
  DRAFT_ROUNDS: 2,
  REGULAR_SEASON_GAMES: 30, // Per team (adjusted for browser game)
  PLAYOFF_TEAMS: 8,
} as const;

export const POSITION_LABELS: Record<string, string> = {
  PG: "Point Guard",
  SG: "Shooting Guard",
  SF: "Small Forward",
  PF: "Power Forward",
  C:  "Center",
};

export const POTENTIAL_LABELS: Record<string, { label: string; short: string; description: string }> = {
  ELITE:    { label: "Elite",    short: "A+", description: "Franchise cornerstone — perennial All-Star" },
  STAR:     { label: "Star",     short: "A",  description: "All-Star caliber ceiling with development" },
  STARTER:  { label: "Starter",  short: "B",  description: "Reliable starter for most teams" },
  ROTATION: { label: "Rotation", short: "C",  description: "Solid 6th–8th man" },
  FRINGE:   { label: "Fringe",   short: "D",  description: "End-of-bench / developmental" },
};

export function formatSalary(salaryInK: number): string {
  if (salaryInK >= 1000) {
    return `$${(salaryInK / 1000).toFixed(1)}M`;
  }
  return `$${salaryInK.toLocaleString()}K`;
}

export function formatRecord(wins: number, losses: number): string {
  return `${wins}–${losses}`;
}

export function formatPct(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function winProbability(homeOvr: number, awayOvr: number, homeChemistry: number, homeAdvantage: number): number {
  const diff = (homeOvr - awayOvr) + homeChemistry * 0.1 + homeAdvantage;
  // Logistic function
  return 1 / (1 + Math.exp(-diff / 8));
}
