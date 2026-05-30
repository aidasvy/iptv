// Schedule generation: creates game fixtures for the entire regular season.
import { db } from "@hoopmanager/db";
import { enqueueWeekSimulation } from "./queue";

const GAMES_PER_WEEK = 2; // each team plays 2 games per week

export async function scheduleRegularSeason(leagueId: string, seasonId: string): Promise<void> {
  const teams = await db.team.findMany({
    where: { leagueId },
    select: { id: true },
  });

  if (teams.length < 2) return;

  const teamIds = teams.map((t) => t.id);
  const fixtures = generateRoundRobin(teamIds);

  // Each round = 1 week; games start from next Monday
  const startDate = nextMonday();
  let week = 1;

  for (const round of fixtures) {
    const weekDate = new Date(startDate);
    weekDate.setDate(startDate.getDate() + (week - 1) * 7);

    const games = round.map(([homeId, awayId], i) =>
      db.game.create({
        data: {
          seasonId,
          week,
          homeTeamId: homeId,
          awayTeamId: awayId,
          scheduledAt: new Date(weekDate.getTime() + i * 24 * 60 * 60 * 1000), // spread across week
        },
      })
    );

    await Promise.all(games);
    week++;
  }
}

// Queue simulation for a given week across all leagues
export async function advanceWeek(leagueId: string): Promise<void> {
  const league = await db.league.findUnique({
    where: { id: leagueId },
    select: { currentWeek: true, currentPhase: true },
  });

  if (!league || league.currentPhase !== "REGULAR_SEASON") return;

  const nextWeek = league.currentWeek + 1;

  await enqueueWeekSimulation(leagueId, nextWeek);

  await db.league.update({
    where: { id: leagueId },
    data: { currentWeek: nextWeek },
  });
}

// ─── Round-robin fixture generator ───────────────────────────────────────────
// Standard circle-method: each team plays every other team exactly once.

function generateRoundRobin(teams: string[]): [string, string][][] {
  const n = teams.length % 2 === 0 ? teams.length : teams.length + 1;
  const padded = teams.length % 2 === 0 ? [...teams] : [...teams, "BYE"];
  const rounds: [string, string][][] = [];

  for (let round = 0; round < n - 1; round++) {
    const matchups: [string, string][] = [];
    for (let i = 0; i < n / 2; i++) {
      const home = padded[i];
      const away = padded[n - 1 - i];
      if (home !== "BYE" && away !== "BYE") {
        matchups.push(round % 2 === 0 ? [home, away] : [away, home]);
      }
    }
    rounds.push(matchups);

    // Rotate all except first element
    padded.splice(1, 0, padded.pop()!);
  }

  // Double round-robin (home and away for all matchups)
  const secondHalf = rounds.map((round) =>
    round.map(([h, a]) => [a, h] as [string, string])
  );

  return [...rounds, ...secondHalf];
}

function nextMonday(): Date {
  const d = new Date();
  const day = d.getDay();
  const daysUntilMonday = (8 - day) % 7 || 7;
  d.setDate(d.getDate() + daysUntilMonday);
  d.setHours(19, 30, 0, 0);
  return d;
}
