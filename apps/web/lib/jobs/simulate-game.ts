// Core game simulation job — called per-game by the worker.
import { db } from "@hoopmanager/db";
import {
  simulateGame,
  computeGameAdvancedStats,
  toSimPlayer,
} from "@hoopmanager/engine";
import type { SimTeam } from "@hoopmanager/engine";

export async function runGameSimulation(gameId: string): Promise<void> {
  const game = await db.game.findUnique({
    where: { id: gameId },
    include: {
      homeTeam: {
        include: {
          players: true,
        },
      },
      awayTeam: {
        include: {
          players: true,
        },
      },
      season: { select: { id: true } },
    },
  });

  if (!game || game.isPlayed) return;

  const homeTeam = buildSimTeam(game.homeTeam as any);
  const awayTeam = buildSimTeam(game.awayTeam as any);

  const result = simulateGame(homeTeam, awayTeam);
  computeGameAdvancedStats(result);

  await db.$transaction(async (tx) => {
    // Save game result
    await tx.game.update({
      where: { id: gameId },
      data: {
        homeScore: result.homeScore,
        awayScore: result.awayScore,
        isPlayed: true,
        playByPlay: result.playByPlay as any,
        boxScore: { home: result.homeBoxScore, away: result.awayBoxScore } as any,
        gameNarrative: result.narrative,
        clutchMoments: result.clutchMoments as any,
      },
    });

    // Save per-player stats
    const allStats = [
      ...result.homeBoxScore.map((b) => ({ ...b, teamId: game.homeTeamId })),
      ...result.awayBoxScore.map((b) => ({ ...b, teamId: game.awayTeamId })),
    ];

    for (const stat of allStats) {
      await tx.gamePlayerStat.upsert({
        where: { gameId_playerId: { gameId, playerId: stat.playerId } },
        create: {
          gameId,
          playerId: stat.playerId,
          teamId: stat.teamId,
          isStarter: stat.isStarter,
          minutes: stat.minutes,
          points: stat.points,
          assists: stat.assists,
          rebounds: stat.rebounds,
          offRebounds: stat.offRebounds,
          defRebounds: stat.defRebounds,
          steals: stat.steals,
          blocks: stat.blocks,
          turnovers: stat.turnovers,
          fouls: stat.fouls,
          plusMinus: stat.plusMinus,
          fgm: stat.fgm,
          fga: stat.fga,
          threePM: stat.threePM,
          threePA: stat.threePA,
          ftm: stat.ftm,
          fta: stat.fta,
          per: (stat as any).per ?? null,
          trueShootingPct: (stat as any).trueShootingPct ?? null,
          usageRate: (stat as any).usageRate ?? null,
        },
        update: {},
      });
    }

    // Update season aggregate stats
    await updateSeasonStats(tx, game.season.id, allStats);

    // Update standings
    await updateStandings(tx, game, result.homeScore, result.awayScore);

    // Apply post-game fatigue and form
    await applyPostGameEffects(tx, game.homeTeamId, result.homeBoxScore);
    await applyPostGameEffects(tx, game.awayTeamId, result.awayBoxScore);

    // Send game result notifications
    const homeWon = result.homeScore > result.awayScore;
    await sendGameNotifications(tx, game, result.homeScore, result.awayScore, homeWon);
  });
}

// ─── Build SimTeam from DB records ───────────────────────────────────────────

function buildSimTeam(team: any): SimTeam {
  const healthyPlayers = team.players.filter((p: any) => !p.isInjured && !p.isSuspended);

  const getStarter = (id: string | null) =>
    id ? healthyPlayers.find((p: any) => p.id === id) : null;

  // Build starters — fall back to best available by position if slot is empty
  const starterPG = getStarter(team.starterPG) ?? bestAtPosition(healthyPlayers, "PG");
  const starterSG = getStarter(team.starterSG) ?? bestAtPosition(healthyPlayers, "SG");
  const starterSF = getStarter(team.starterSF) ?? bestAtPosition(healthyPlayers, "SF");
  const starterPF = getStarter(team.starterPF) ?? bestAtPosition(healthyPlayers, "PF");
  const starterC  = getStarter(team.starterC)  ?? bestAtPosition(healthyPlayers, "C");

  const starterIds = new Set([starterPG, starterSG, starterSF, starterPF, starterC].filter(Boolean).map((p: any) => p.id));

  const bench = healthyPlayers
    .filter((p: any) => !starterIds.has(p.id))
    .sort((a: any, b: any) => {
      const ro = team.rotationOrder as string[];
      const ai = ro.indexOf(a.id);
      const bi = ro.indexOf(b.id);
      if (ai === -1 && bi === -1) return 0;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    })
    .map(toSimPlayer);

  return {
    id: team.id,
    name: `${team.city} ${team.name}`,
    starters: [starterPG, starterSG, starterSF, starterPF, starterC].map(toSimPlayer) as SimTeam["starters"],
    bench,
    tactics: {
      offensiveScheme: team.offensiveScheme,
      defensiveScheme: team.defensiveScheme,
      tempo: team.tempoSetting,
      aggression: team.aggressionLevel,
      threePointRate: team.threePointRate,
      pressureLevel: team.aggressionLevel,
    },
    chemistry: team.teamChemistry,
    homeCourtAdvantage: 5,
  };
}

function bestAtPosition(players: any[], position: string) {
  return players
    .filter((p) => p.position === position || p.secondPos === position)
    .sort((a, b) => (b.offensiveIQ + b.defensiveIQ) - (a.offensiveIQ + a.defensiveIQ))[0] ?? players[0];
}

// ─── Season stat aggregation ──────────────────────────────────────────────────

async function updateSeasonStats(tx: any, seasonId: string, stats: any[]) {
  for (const stat of stats) {
    const existing = await tx.seasonPlayerStat.findUnique({
      where: { seasonId_playerId: { seasonId, playerId: stat.playerId } },
    });

    const gp = (existing?.gamesPlayed ?? 0) + 1;
    const gs = (existing?.gamesStarted ?? 0) + (stat.isStarter ? 1 : 0);

    const avg = (prev: number, next: number) => ((prev * (gp - 1)) + next) / gp;

    await tx.seasonPlayerStat.upsert({
      where: { seasonId_playerId: { seasonId, playerId: stat.playerId } },
      create: {
        seasonId,
        playerId: stat.playerId,
        teamId: stat.teamId,
        gamesPlayed: 1,
        gamesStarted: stat.isStarter ? 1 : 0,
        minutesPerGame: stat.minutes,
        ppg: stat.points,
        rpg: stat.rebounds,
        apg: stat.assists,
        spg: stat.steals,
        bpg: stat.blocks,
        topg: stat.turnovers,
        fgPct: stat.fga > 0 ? stat.fgm / stat.fga : 0,
        threePct: stat.threePA > 0 ? stat.threePM / stat.threePA : 0,
        ftPct: stat.fta > 0 ? stat.ftm / stat.fta : 0,
        per: stat.per ?? 0,
        trueShootingPct: stat.trueShootingPct ?? 0,
        usageRate: stat.usageRate ?? 0,
      },
      update: {
        gamesPlayed: gp,
        gamesStarted: gs,
        minutesPerGame: avg(existing?.minutesPerGame ?? 0, stat.minutes),
        ppg: avg(existing?.ppg ?? 0, stat.points),
        rpg: avg(existing?.rpg ?? 0, stat.rebounds),
        apg: avg(existing?.apg ?? 0, stat.assists),
        spg: avg(existing?.spg ?? 0, stat.steals),
        bpg: avg(existing?.bpg ?? 0, stat.blocks),
        topg: avg(existing?.topg ?? 0, stat.turnovers),
        fgPct: stat.fga > 0 ? avg(existing?.fgPct ?? 0, stat.fgm / stat.fga) : existing?.fgPct ?? 0,
        threePct: stat.threePA > 0 ? avg(existing?.threePct ?? 0, stat.threePM / stat.threePA) : existing?.threePct ?? 0,
        ftPct: stat.fta > 0 ? avg(existing?.ftPct ?? 0, stat.ftm / stat.fta) : existing?.ftPct ?? 0,
        per: stat.per ? avg(existing?.per ?? 0, stat.per) : existing?.per ?? 0,
        trueShootingPct: stat.trueShootingPct ? avg(existing?.trueShootingPct ?? 0, stat.trueShootingPct) : existing?.trueShootingPct ?? 0,
        usageRate: stat.usageRate ? avg(existing?.usageRate ?? 0, stat.usageRate) : existing?.usageRate ?? 0,
      },
    });
  }
}

// ─── Standings update ─────────────────────────────────────────────────────────

async function updateStandings(tx: any, game: any, homeScore: number, awayScore: number) {
  const homeWon = homeScore > awayScore;
  const seasonId = game.season.id;

  const upsertStanding = async (teamId: string, won: boolean, ptsFor: number, ptsAgainst: number) => {
    const existing = await tx.standing.findFirst({
      where: { seasonId, teamId },
      orderBy: { week: "desc" },
    });

    const wins = (existing?.wins ?? 0) + (won ? 1 : 0);
    const losses = (existing?.losses ?? 0) + (won ? 0 : 1);
    const streak = won
      ? Math.max(0, existing?.streak ?? 0) + 1
      : Math.min(0, existing?.streak ?? 0) - 1;

    const last10Games = ((existing?.last10 ?? "0-0").split("-").map(Number));
    const l10w = Math.min(10, last10Games[0] + (won ? 1 : 0));
    const l10l = Math.min(10, last10Games[1] + (won ? 0 : 1));
    const last10 = `${l10w}-${l10l}`;

    await tx.standing.upsert({
      where: { seasonId_teamId_week: { seasonId, teamId, week: game.week } },
      create: {
        seasonId,
        teamId,
        week: game.week,
        wins,
        losses,
        pointsFor: (existing?.pointsFor ?? 0) + ptsFor,
        pointsAgainst: (existing?.pointsAgainst ?? 0) + ptsAgainst,
        streak,
        last10,
      },
      update: {
        wins,
        losses,
        pointsFor: (existing?.pointsFor ?? 0) + ptsFor,
        pointsAgainst: (existing?.pointsAgainst ?? 0) + ptsAgainst,
        streak,
        last10,
      },
    });
  };

  await upsertStanding(game.homeTeamId, homeWon, homeScore, awayScore);
  await upsertStanding(game.awayTeamId, !homeWon, awayScore, homeScore);
}

// ─── Post-game effects ────────────────────────────────────────────────────────

async function applyPostGameEffects(tx: any, teamId: string, boxScores: any[]) {
  for (const box of boxScores) {
    const fatigueDelta = Math.min(25, box.minutes * 0.4);
    const formDelta = box.points >= 20 ? 3 : box.points <= 5 ? -3 : 0;

    await tx.player.update({
      where: { id: box.playerId },
      data: {
        fatigue: { increment: fatigueDelta },
        form: { increment: formDelta },
      },
    });
  }

  // Rest slightly reduces fatigue for players who didn't play
  await tx.player.updateMany({
    where: { teamId, id: { notIn: boxScores.map((b) => b.playerId) } },
    data: { fatigue: { decrement: 5 } },
  });
}

// ─── Notifications ────────────────────────────────────────────────────────────

async function sendGameNotifications(tx: any, game: any, homeScore: number, awayScore: number, homeWon: boolean) {
  const homeManager = await tx.team.findUnique({
    where: { id: game.homeTeamId },
    select: { managerId: true, name: true },
  });
  const awayManager = await tx.team.findUnique({
    where: { id: game.awayTeamId },
    select: { managerId: true, name: true },
  });

  if (homeManager) {
    await tx.notification.create({
      data: {
        userId: homeManager.managerId,
        type: "GAME_RESULT",
        title: homeWon ? "Victory!" : "Defeat",
        body: `${game.homeTeam?.city ?? "Your team"} ${homeWon ? "won" : "lost"} ${homeScore}–${awayScore} vs ${awayManager?.name ?? "opponent"}.`,
        data: { gameId: game.id },
      },
    });
  }

  if (awayManager) {
    await tx.notification.create({
      data: {
        userId: awayManager.managerId,
        type: "GAME_RESULT",
        title: !homeWon ? "Victory!" : "Defeat",
        body: `${game.awayTeam?.city ?? "Your team"} ${!homeWon ? "won" : "lost"} ${awayScore}–${homeScore} vs ${homeManager?.name ?? "opponent"}.`,
        data: { gameId: game.id },
      },
    });
  }
}
