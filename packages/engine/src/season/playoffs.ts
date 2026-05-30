// Playoff bracket generation and seeding.

export interface PlayoffSeed {
  teamId: string;
  seed: number;
  wins: number;
  losses: number;
}

export interface PlayoffMatchup {
  round: number;       // 1=quarterfinal, 2=semifinal, 3=final
  matchupIndex: number; // position in bracket (0-based per round)
  highSeedId: string;
  lowSeedId: string;
  seriesWins: Record<string, number>; // teamId → wins in series
  isComplete: boolean;
  winnerId: string | null;
  games: string[];     // game IDs in this series
}

export interface PlayoffBracket {
  leagueId: string;
  seasonId: string;
  seeds: PlayoffSeed[];
  matchups: PlayoffMatchup[];
  champion: string | null;
}

// Seed teams by wins descending and build a single-elimination bracket.
// For a 16-team league: top 8 make playoffs.
// Seeds: 1v8, 2v7, 3v6, 4v5 (quarterfinals)
export function seedPlayoffs(
  standings: Array<{ teamId: string; wins: number; losses: number }>,
  playoffTeams: number = 8
): PlayoffSeed[] {
  const sorted = [...standings]
    .sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      // Tiebreaker: fewer losses
      return a.losses - b.losses;
    })
    .slice(0, playoffTeams);

  return sorted.map((s, i) => ({ ...s, seed: i + 1 }));
}

// Generate the initial round of matchups from seeds (1v8, 2v7, 3v6, 4v5)
export function buildInitialBracket(seeds: PlayoffSeed[]): PlayoffMatchup[] {
  const n = seeds.length;
  const matchups: PlayoffMatchup[] = [];

  for (let i = 0; i < n / 2; i++) {
    const high = seeds[i];
    const low  = seeds[n - 1 - i];
    matchups.push({
      round: 1,
      matchupIndex: i,
      highSeedId: high.teamId,
      lowSeedId: low.teamId,
      seriesWins: { [high.teamId]: 0, [low.teamId]: 0 },
      isComplete: false,
      winnerId: null,
      games: [],
    });
  }

  return matchups;
}

// Determine series winner (best-of-5: first to 3 wins)
export const SERIES_LENGTH = 3; // first to win this many games

export function checkSeriesWinner(matchup: PlayoffMatchup): string | null {
  for (const [teamId, wins] of Object.entries(matchup.seriesWins)) {
    if (wins >= SERIES_LENGTH) return teamId;
  }
  return null;
}

// Advance a completed round: pair up winners to form next round matchups
export function advanceRound(
  completedMatchups: PlayoffMatchup[],
  nextRound: number
): PlayoffMatchup[] {
  const winners = completedMatchups
    .sort((a, b) => a.matchupIndex - b.matchupIndex)
    .map((m) => m.winnerId!)
    .filter(Boolean);

  const nextMatchups: PlayoffMatchup[] = [];
  for (let i = 0; i < winners.length; i += 2) {
    if (i + 1 >= winners.length) break;
    nextMatchups.push({
      round: nextRound,
      matchupIndex: i / 2,
      highSeedId: winners[i],
      lowSeedId: winners[i + 1],
      seriesWins: { [winners[i]]: 0, [winners[i + 1]]: 0 },
      isComplete: false,
      winnerId: null,
      games: [],
    });
  }

  return nextMatchups;
}

// Get the label for a playoff round given total teams
export function roundLabel(round: number, totalTeams: number): string {
  const totalRounds = Math.log2(totalTeams);
  const roundsFromFinal = totalRounds - round;
  if (roundsFromFinal === 0) return "Finals";
  if (roundsFromFinal === 1) return "Conference Finals";
  if (roundsFromFinal === 2) return "Semifinals";
  return `Round ${round}`;
}
