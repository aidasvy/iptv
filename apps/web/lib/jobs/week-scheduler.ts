// Season lifecycle: fixture generation, week advancement, season-end detection,
// playoff transition and offseason reset.

import { db } from "@hoopmanager/db";
import {
  seedPlayoffs,
  buildInitialBracket,
  advanceRound,
  checkSeriesWinner,
  SERIES_LENGTH,
} from "@hoopmanager/engine";
import { enqueueWeekSimulation } from "./queue";
import { runGameSimulation } from "./simulate-game";

const PLAYOFF_TEAMS = 8;

// ─── Regular season schedule generation ──────────────────────────────────────

export async function scheduleRegularSeason(
  leagueId: string,
  seasonId: string
): Promise<void> {
  const teams = await db.team.findMany({
    where: { leagueId },
    select: { id: true },
  });
  if (teams.length < 2) return;

  const fixtures = generateRoundRobin(teams.map((t) => t.id));
  const startDate = nextMonday();

  const createOps = fixtures.flatMap((round, weekIdx) =>
    round.map(([homeId, awayId], i) => {
      const weekDate = new Date(startDate);
      weekDate.setDate(startDate.getDate() + weekIdx * 7 + i);
      return db.game.create({
        data: {
          seasonId,
          week: weekIdx + 1,
          homeTeamId: homeId,
          awayTeamId: awayId,
          scheduledAt: weekDate,
        },
      });
    })
  );

  // Batch in chunks to avoid timeout
  for (let i = 0; i < createOps.length; i += 20) {
    await Promise.all(createOps.slice(i, i + 20));
  }
}

// ─── Advance one week ─────────────────────────────────────────────────────────

export async function advanceWeek(leagueId: string): Promise<{ status: string }> {
  const league = await db.league.findUnique({
    where: { id: leagueId },
    select: { currentWeek: true, currentPhase: true },
  });

  if (!league) return { status: "league_not_found" };
  if (league.currentPhase !== "REGULAR_SEASON") {
    return { status: `wrong_phase:${league.currentPhase}` };
  }

  const nextWeek = league.currentWeek + 1;

  // Check if there are still games left
  const remainingGames = await db.game.count({
    where: {
      season: { leagueId },
      week: { gt: league.currentWeek },
      isPlayed: false,
    },
  });

  if (remainingGames === 0) {
    // Regular season over — transition to playoffs
    await transitionToPlayoffs(leagueId);
    return { status: "playoffs_started" };
  }

  await enqueueWeekSimulation(leagueId, nextWeek);
  await db.league.update({
    where: { id: leagueId },
    data: { currentWeek: nextWeek },
  });

  return { status: "week_queued", week: nextWeek } as any;
}

// ─── Regular season end → playoff seeding ────────────────────────────────────

async function transitionToPlayoffs(leagueId: string): Promise<void> {
  const season = await db.season.findFirst({
    where: { leagueId },
    orderBy: { seasonNumber: "desc" },
    select: { id: true, seasonNumber: true },
  });
  if (!season) return;

  // Get final standings (most recent entry per team)
  const rawStandings = await db.standing.findMany({
    where: { seasonId: season.id },
    orderBy: { week: "desc" },
    distinct: ["teamId"],
    select: { teamId: true, wins: true, losses: true },
  });

  const seeds = seedPlayoffs(rawStandings, PLAYOFF_TEAMS);
  const matchups = buildInitialBracket(seeds);

  // Store playoff state as JSON on the season
  await db.season.update({
    where: { id: season.id },
    data: {
      // Store bracket as JSON in a "endDate" field doesn't work; we use
      // the momentum JSON field on Season via a raw approach —
      // better: add a playoff bracket table in a future migration.
      // For now we persist it in the league's currentPhase data and
      // schedule game records for round 1.
    } as any,
  });

  await db.league.update({
    where: { id: leagueId },
    data: { currentPhase: "PLAYOFFS", currentWeek: 1 },
  });

  // Create playoff game records (best-of-5: up to SERIES_LENGTH*2-1 games per matchup)
  for (const matchup of matchups) {
    for (let gameNum = 1; gameNum <= SERIES_LENGTH * 2 - 1; gameNum++) {
      const scheduledAt = new Date();
      scheduledAt.setDate(scheduledAt.getDate() + gameNum);
      // Alternate home court: odd games at high seed, even at low seed
      const homeId = gameNum % 2 === 1 ? matchup.highSeedId : matchup.lowSeedId;
      const awayId = gameNum % 2 === 1 ? matchup.lowSeedId : matchup.highSeedId;
      await db.game.create({
        data: {
          seasonId: season.id,
          // Use week to encode: round 1 = week 100+matchupIndex, game number in description
          week: 100 + matchup.matchupIndex * 10 + gameNum,
          homeTeamId: homeId,
          awayTeamId: awayId,
          scheduledAt,
        },
      });
    }
  }

  // Notify all managers
  const managers = await db.team.findMany({
    where: { leagueId },
    select: { managerId: true, id: true },
  });

  const mySeeds = Object.fromEntries(seeds.map((s) => [s.teamId, s.seed]));

  for (const { managerId, id } of managers) {
    const seed = mySeeds[id];
    const madePlayoffs = seed !== undefined;
    await db.notification.create({
      data: {
        userId: managerId,
        type: "PLAYOFFS",
        title: madePlayoffs ? `🏆 Playoffs! You're the #${seed} seed` : "Regular Season Over",
        body: madePlayoffs
          ? `Your team made the playoffs as the #${seed} seed. The bracket is set!`
          : "Your team did not qualify for the playoffs this season.",
        data: { seasonId: season.id, seed: seed ?? null },
      },
    });
  }
}

// ─── Simulate a full playoff round ───────────────────────────────────────────

export async function simulatePlayoffRound(
  leagueId: string,
  round: number
): Promise<{ advanced: string[]; champion: string | null }> {
  const season = await db.season.findFirst({
    where: { leagueId },
    orderBy: { seasonNumber: "desc" },
    select: { id: true },
  });
  if (!season) throw new Error("No active season");

  // Get all games for this playoff round (week range 100+round*10 to 100+(round+1)*10)
  const weekMin = 100 + (round - 1) * 40;
  const weekMax = 100 + round * 40;

  const games = await db.game.findMany({
    where: {
      seasonId: season.id,
      week: { gte: weekMin, lt: weekMax },
      isPlayed: false,
    },
    select: { id: true, homeTeamId: true, awayTeamId: true, week: true },
    orderBy: { week: "asc" },
  });

  // Group games by matchup (week hundreds digit encodes matchup)
  const matchupGroups = new Map<string, typeof games>();
  for (const g of games) {
    const matchupKey = Math.floor((g.week - 100) / 10).toString();
    if (!matchupGroups.has(matchupKey)) matchupGroups.set(matchupKey, []);
    matchupGroups.get(matchupKey)!.push(g);
  }

  const winners: string[] = [];

  for (const [, matchupGames] of matchupGroups) {
    const seriesWins: Record<string, number> = {};
    const teams = [matchupGames[0].homeTeamId, matchupGames[0].awayTeamId];

    for (const game of matchupGames) {
      const homeWins = seriesWins[game.homeTeamId] ?? 0;
      const awayWins = seriesWins[game.awayTeamId] ?? 0;

      // Skip if series is already decided
      if (homeWins >= SERIES_LENGTH || awayWins >= SERIES_LENGTH) {
        // Mark remaining games as played with 0-0 (bye)
        await db.game.update({
          where: { id: game.id },
          data: { isPlayed: true, homeScore: 0, awayScore: 0 },
        });
        continue;
      }

      await runGameSimulation(game.id, true);

      const played = await db.game.findUnique({
        where: { id: game.id },
        select: { homeScore: true, awayScore: true },
      });
      if (!played) continue;

      const homeWon = (played.homeScore ?? 0) > (played.awayScore ?? 0);
      seriesWins[game.homeTeamId] = (seriesWins[game.homeTeamId] ?? 0) + (homeWon ? 1 : 0);
      seriesWins[game.awayTeamId] = (seriesWins[game.awayTeamId] ?? 0) + (homeWon ? 0 : 1);
    }

    const winner = teams.find((t) => (seriesWins[t] ?? 0) >= SERIES_LENGTH);
    if (winner) winners.push(winner);
  }

  // Check if this was the final round
  let champion: string | null = null;
  if (winners.length === 1) {
    champion = winners[0];
    await db.season.update({
      where: { id: season.id },
      data: { champion, endDate: new Date() },
    });
    await db.league.update({
      where: { id: leagueId },
      data: { currentPhase: "OFFSEASON_DRAFT" },
    });

    // Notify champion
    const champTeam = await db.team.findUnique({
      where: { id: champion },
      select: { managerId: true, city: true, name: true },
    });
    if (champTeam) {
      await db.notification.create({
        data: {
          userId: champTeam.managerId,
          type: "PLAYOFFS",
          title: "🏆 CHAMPIONS!",
          body: `${champTeam.city} ${champTeam.name} are league champions! Congratulations!`,
          data: { seasonId: season.id, champion: true },
        },
      });
    }
  } else if (winners.length > 1) {
    // Schedule next round
    await schedulePlayoffRound(season.id, round + 1, winners);
  }

  return { advanced: winners, champion };
}

async function schedulePlayoffRound(
  seasonId: string,
  round: number,
  teamIds: string[]
): Promise<void> {
  // Pair winners: 1st vs 2nd, 3rd vs 4th, etc.
  for (let i = 0; i < teamIds.length; i += 2) {
    if (i + 1 >= teamIds.length) break;
    const highId = teamIds[i];
    const lowId = teamIds[i + 1];

    for (let gameNum = 1; gameNum <= SERIES_LENGTH * 2 - 1; gameNum++) {
      const scheduledAt = new Date();
      scheduledAt.setDate(scheduledAt.getDate() + gameNum);
      const homeId = gameNum % 2 === 1 ? highId : lowId;
      const awayId = gameNum % 2 === 1 ? lowId : highId;
      await db.game.create({
        data: {
          seasonId,
          week: 100 + (round - 1) * 40 + (i / 2) * 10 + gameNum,
          homeTeamId: homeId,
          awayTeamId: awayId,
          scheduledAt,
        },
      });
    }
  }
}

// ─── Round-robin fixture generator ───────────────────────────────────────────

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
    padded.splice(1, 0, padded.pop()!);
  }

  // Double round-robin for a full home-and-away season
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
