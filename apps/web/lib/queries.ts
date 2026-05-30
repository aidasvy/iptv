// Server-side database query helpers used by server components.
import { db } from "@hoopmanager/db";
import { computeOverall } from "@hoopmanager/engine";
import type { SimPlayer } from "@hoopmanager/engine";

// ─── Team queries ─────────────────────────────────────────────────────────────

export async function getTeamForUser(userId: string, leagueId?: string) {
  return db.team.findFirst({
    where: { managerId: userId, ...(leagueId ? { leagueId } : {}) },
    include: {
      league: { select: { id: true, name: true, currentPhase: true, currentWeek: true, salaryCap: true, luxuryTax: true } },
      players: {
        orderBy: [{ position: "asc" }],
        select: {
          id: true, firstName: true, lastName: true, age: true, nationality: true,
          position: true, secondPos: true, potential: true, potentialKnown: true,
          salary: true, contractYears: true, contractType: true,
          morale: true, form: true, fatigue: true,
          isInjured: true, injuryType: true, injuryWeeks: true,
          // attributes
          speed: true, strength: true, verticalJump: true, stamina: true, wingspan: true,
          ballHandling: true, passing: true, threePoint: true, midRange: true,
          insideScoring: true, postGame: true, freeThrow: true, offMovement: true,
          perimeterDef: true, interiorDef: true, rebounding: true,
          shotBlocking: true, stealing: true, defensiveIQ: true,
          offensiveIQ: true, leadership: true, clutch: true, coachability: true, consistency: true,
        },
      },
      homeGames: {
        where: { isPlayed: true },
        orderBy: { scheduledAt: "desc" },
        take: 5,
        include: { awayTeam: { select: { name: true } } },
      },
      awayGames: {
        where: { isPlayed: true },
        orderBy: { scheduledAt: "desc" },
        take: 5,
        include: { homeTeam: { select: { name: true } } },
      },
      standings: { orderBy: { week: "desc" }, take: 1 },
    },
  });
}

export async function getNextGame(teamId: string) {
  return db.game.findFirst({
    where: {
      isPlayed: false,
      OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
    },
    orderBy: { scheduledAt: "asc" },
    include: {
      homeTeam: { select: { id: true, name: true, abbreviation: true, primaryColor: true } },
      awayTeam: { select: { id: true, name: true, abbreviation: true, primaryColor: true } },
    },
  });
}

export async function getInjuredPlayers(teamId: string) {
  return db.player.findMany({
    where: { teamId, isInjured: true },
    select: { id: true, firstName: true, lastName: true, injuryType: true, injuryWeeks: true },
  });
}

// ─── Season / standings ───────────────────────────────────────────────────────

export async function getCurrentSeason(leagueId: string) {
  return db.season.findFirst({
    where: { leagueId },
    orderBy: { seasonNumber: "desc" },
    select: { id: true, seasonNumber: true, startDate: true },
  });
}

export async function getStandings(leagueId: string) {
  const season = await getCurrentSeason(leagueId);
  if (!season) return [];

  return db.standing.findMany({
    where: { seasonId: season.id },
    orderBy: [{ week: "desc" }, { wins: "desc" }],
    distinct: ["teamId"],
    include: {
      team: { select: { id: true, name: true, abbreviation: true, primaryColor: true, managerId: true } },
    },
  });
}

// ─── Player season stats ──────────────────────────────────────────────────────

export async function getPlayerSeasonStats(teamId: string, seasonId: string) {
  return db.seasonPlayerStat.findMany({
    where: { teamId, seasonId },
    include: {
      player: { select: { id: true, firstName: true, lastName: true, position: true } },
    },
    orderBy: { ppg: "desc" },
  });
}

// ─── League overview ──────────────────────────────────────────────────────────

export async function getLeagueOverview(leagueId: string) {
  const [league, teams, season] = await Promise.all([
    db.league.findUnique({
      where: { id: leagueId },
      select: { id: true, name: true, currentPhase: true, currentWeek: true, maxTeams: true },
    }),
    db.team.findMany({
      where: { leagueId },
      select: { id: true, name: true, city: true, abbreviation: true, primaryColor: true, managerId: true },
    }),
    getCurrentSeason(leagueId),
  ]);
  return { league, teams, season };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Convert Prisma player record to SimPlayer for engine use
export function toSimPlayer(p: any): SimPlayer {
  return {
    id: p.id,
    name: `${p.firstName} ${p.lastName}`,
    position: p.position,
    secondPos: p.secondPos ?? null,
    age: p.age,
    attrs: {
      speed: p.speed, strength: p.strength, verticalJump: p.verticalJump,
      stamina: p.stamina, wingspan: p.wingspan,
      ballHandling: p.ballHandling, passing: p.passing, threePoint: p.threePoint,
      midRange: p.midRange, insideScoring: p.insideScoring, postGame: p.postGame,
      freeThrow: p.freeThrow, offMovement: p.offMovement,
      perimeterDef: p.perimeterDef, interiorDef: p.interiorDef,
      rebounding: p.rebounding, shotBlocking: p.shotBlocking,
      stealing: p.stealing, defensiveIQ: p.defensiveIQ,
      offensiveIQ: p.offensiveIQ, leadership: p.leadership,
      clutch: p.clutch, coachability: p.coachability, consistency: p.consistency,
    },
    potential: p.potential,
    morale: p.morale,
    form: p.form,
    fatigue: p.fatigue,
    isInjured: p.isInjured,
    salary: p.salary,
  };
}

export function computePlayerOverall(p: any): number {
  return computeOverall(toSimPlayer(p));
}
