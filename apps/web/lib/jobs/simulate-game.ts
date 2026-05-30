// Core game simulation job — called per-game by the worker.
import { db } from "@hoopmanager/db";
import {
  simulateGame,
  computeGameAdvancedStats,
  toSimPlayer,
} from "@hoopmanager/engine";
import type { SimTeam } from "@hoopmanager/engine";
import { computeMoraleDeltas, clampStat } from "./morale-chemistry";

export async function runGameSimulation(
  gameId: string,
  isPlayoffs = false
): Promise<void> {
  const game = await db.game.findUnique({
    where: { id: gameId },
    include: {
      homeTeam: { include: { players: true } },
      awayTeam: { include: { players: true } },
      season: { select: { id: true } },
    },
  });

  if (!game || game.isPlayed) return;

  const homeTeam = buildSimTeam(game.homeTeam as any);
  const awayTeam = buildSimTeam(game.awayTeam as any);

  const result = simulateGame(homeTeam, awayTeam);
  computeGameAdvancedStats(result);

  const homeWon = result.homeScore > result.awayScore;

  // Compute morale/chemistry deltas for both sides
  const homeLeadershipAvg = avgAttr(game.homeTeam.players, "leadership");
  const awayLeadershipAvg = avgAttr(game.awayTeam.players, "leadership");

  const homeMorale = computeMoraleDeltas({
    teamId: game.homeTeamId,
    won: homeWon,
    isPlayoffs,
    boxScores: result.homeBoxScore,
    teamChemistry: (game.homeTeam as any).teamChemistry,
    leadershipAvg: homeLeadershipAvg,
  });

  const awayMorale = computeMoraleDeltas({
    teamId: game.awayTeamId,
    won: !homeWon,
    isPlayoffs,
    boxScores: result.awayBoxScore,
    teamChemistry: (game.awayTeam as any).teamChemistry,
    leadershipAvg: awayLeadershipAvg,
  });

  await db.$transaction(async (tx) => {
    // ── 1. Save game result ─────────────────────────────────────────────────
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
        momentum: result.quarterScores as any,
      },
    });

    // ── 2. Per-player game stats ────────────────────────────────────────────
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

    // ── 3. Season aggregate stats ───────────────────────────────────────────
    if (!isPlayoffs) {
      await updateSeasonStats(tx, game.season.id, allStats);
    }

    // ── 4. Standings ────────────────────────────────────────────────────────
    if (!isPlayoffs) {
      await updateStandings(tx, game, result.homeScore, result.awayScore);
    }

    // ── 5. Fatigue (both sides) ─────────────────────────────────────────────
    await applyFatigueDelta(tx, game.homeTeamId, result.homeBoxScore);
    await applyFatigueDelta(tx, game.awayTeamId, result.awayBoxScore);

    // ── 6. Morale + chemistry (both sides) ─────────────────────────────────
    await applyMoraleDeltas(tx, game.homeTeamId, homeMorale);
    await applyMoraleDeltas(tx, game.awayTeamId, awayMorale);

    // ── 7. Unhappy player notifications ────────────────────────────────────
    await checkUnhappyPlayers(tx, game.homeTeamId, (game.homeTeam as any).managerId);
    await checkUnhappyPlayers(tx, game.awayTeamId, (game.awayTeam as any).managerId);

    // ── 8. Game result notifications ────────────────────────────────────────
    await sendGameNotifications(tx, game, result.homeScore, result.awayScore, homeWon);
  });
}

// ─── Build SimTeam from DB records ───────────────────────────────────────────

function buildSimTeam(team: any): SimTeam {
  const healthyPlayers = team.players.filter(
    (p: any) => !p.isInjured && !p.isSuspended
  );

  const getStarter = (id: string | null) =>
    id ? healthyPlayers.find((p: any) => p.id === id) ?? null : null;

  const starterPG = getStarter(team.starterPG) ?? bestAtPosition(healthyPlayers, "PG");
  const starterSG = getStarter(team.starterSG) ?? bestAtPosition(healthyPlayers, "SG");
  const starterSF = getStarter(team.starterSF) ?? bestAtPosition(healthyPlayers, "SF");
  const starterPF = getStarter(team.starterPF) ?? bestAtPosition(healthyPlayers, "PF");
  const starterC  = getStarter(team.starterC)  ?? bestAtPosition(healthyPlayers, "C");

  const starterIds = new Set(
    [starterPG, starterSG, starterSF, starterPF, starterC]
      .filter(Boolean)
      .map((p: any) => p.id)
  );

  const bench = healthyPlayers
    .filter((p: any) => !starterIds.has(p.id))
    .sort((a: any, b: any) => {
      const ro = (team.rotationOrder ?? []) as string[];
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
    starters: [starterPG, starterSG, starterSF, starterPF, starterC].map(
      toSimPlayer
    ) as SimTeam["starters"],
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
  return (
    players
      .filter((p) => p.position === position || p.secondPos === position)
      .sort((a, b) => b.offensiveIQ + b.defensiveIQ - (a.offensiveIQ + a.defensiveIQ))[0] ??
    players[0]
  );
}

function avgAttr(players: any[], attr: string): number {
  if (!players.length) return 60;
  return players.reduce((s, p) => s + (p[attr] ?? 60), 0) / players.length;
}

// ─── Season stat aggregation ──────────────────────────────────────────────────

async function updateSeasonStats(tx: any, seasonId: string, stats: any[]) {
  for (const stat of stats) {
    const existing = await tx.seasonPlayerStat.findUnique({
      where: { seasonId_playerId: { seasonId, playerId: stat.playerId } },
    });

    const gp = (existing?.gamesPlayed ?? 0) + 1;
    const gs = (existing?.gamesStarted ?? 0) + (stat.isStarter ? 1 : 0);
    const avg = (prev: number, next: number) => (prev * (gp - 1) + next) / gp;

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
        fgPct: stat.fga > 0 ? avg(existing?.fgPct ?? 0, stat.fgm / stat.fga) : (existing?.fgPct ?? 0),
        threePct: stat.threePA > 0 ? avg(existing?.threePct ?? 0, stat.threePM / stat.threePA) : (existing?.threePct ?? 0),
        ftPct: stat.fta > 0 ? avg(existing?.ftPct ?? 0, stat.ftm / stat.fta) : (existing?.ftPct ?? 0),
        per: stat.per ? avg(existing?.per ?? 0, stat.per) : (existing?.per ?? 0),
        trueShootingPct: stat.trueShootingPct ? avg(existing?.trueShootingPct ?? 0, stat.trueShootingPct) : (existing?.trueShootingPct ?? 0),
        usageRate: stat.usageRate ? avg(existing?.usageRate ?? 0, stat.usageRate) : (existing?.usageRate ?? 0),
      },
    });
  }
}

// ─── Standings ────────────────────────────────────────────────────────────────

async function updateStandings(
  tx: any,
  game: any,
  homeScore: number,
  awayScore: number
) {
  const homeWon = homeScore > awayScore;
  const seasonId = game.season.id;

  const upsert = async (
    teamId: string,
    won: boolean,
    ptsFor: number,
    ptsAgainst: number
  ) => {
    const existing = await tx.standing.findFirst({
      where: { seasonId, teamId },
      orderBy: { week: "desc" },
    });

    const wins = (existing?.wins ?? 0) + (won ? 1 : 0);
    const losses = (existing?.losses ?? 0) + (won ? 0 : 1);
    const streak = won
      ? Math.max(0, existing?.streak ?? 0) + 1
      : Math.min(0, existing?.streak ?? 0) - 1;

    const [l10w, l10l] = (existing?.last10 ?? "0-0").split("-").map(Number);
    const last10 = `${Math.min(10, l10w + (won ? 1 : 0))}-${Math.min(10, l10l + (won ? 0 : 1))}`;

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

  await upsert(game.homeTeamId, homeWon, homeScore, awayScore);
  await upsert(game.awayTeamId, !homeWon, awayScore, homeScore);
}

// ─── Fatigue ──────────────────────────────────────────────────────────────────

async function applyFatigueDelta(tx: any, teamId: string, boxScores: any[]) {
  for (const box of boxScores) {
    const delta = Math.min(30, box.minutes * 0.45);
    await tx.player.update({
      where: { id: box.playerId },
      data: {
        fatigue: {
          set: clampStat(
            (await tx.player.findUnique({ where: { id: box.playerId }, select: { fatigue: true } }))
              ?.fatigue ?? 0 + delta
          ),
        },
      },
    });
  }
  // Bench/DNP players recover fatigue
  await tx.player.updateMany({
    where: { teamId, id: { notIn: boxScores.map((b) => b.playerId) } },
    data: { fatigue: { decrement: 8 } },
  });
}

// ─── Morale + chemistry ───────────────────────────────────────────────────────

async function applyMoraleDeltas(
  tx: any,
  teamId: string,
  deltas: ReturnType<typeof computeMoraleDeltas>
) {
  // Team chemistry
  const team = await tx.team.findUnique({
    where: { id: teamId },
    select: { teamChemistry: true, lockerRoomMood: true },
  });
  await tx.team.update({
    where: { id: teamId },
    data: {
      teamChemistry: clampStat((team?.teamChemistry ?? 75) + deltas.chemistryDelta),
      lockerRoomMood: clampStat((team?.lockerRoomMood ?? 75) + deltas.teamMoraleDelta),
    },
  });

  // Per-player morale + form
  for (const d of deltas.playerDeltas) {
    const player = await tx.player.findUnique({
      where: { id: d.playerId },
      select: { morale: true, form: true },
    });
    if (!player) continue;
    await tx.player.update({
      where: { id: d.playerId },
      data: {
        morale: clampStat(player.morale + d.moraleDelta),
        form: clampStat(player.form + d.formDelta),
      },
    });
  }
}

// ─── Unhappy player detection ─────────────────────────────────────────────────

async function checkUnhappyPlayers(
  tx: any,
  teamId: string,
  managerId: string
) {
  const unhappy = await tx.player.findMany({
    where: { teamId, morale: { lt: 35 } },
    select: { id: true, firstName: true, lastName: true, morale: true },
  });

  for (const p of unhappy) {
    const recent = await tx.notification.findFirst({
      where: { userId: managerId, type: "PLAYER_UNHAPPY", data: { path: ["playerId"], equals: p.id } },
      orderBy: { createdAt: "desc" },
    });
    // Only notify once per week (avoid spam)
    const daysSince = recent
      ? (Date.now() - new Date(recent.createdAt).getTime()) / 86400000
      : Infinity;
    if (daysSince < 7) continue;

    await tx.notification.create({
      data: {
        userId: managerId,
        type: "PLAYER_UNHAPPY",
        title: `${p.firstName} ${p.lastName} is unhappy`,
        body: `Morale has dropped to ${p.morale}/100. Consider adjusting their playing time or making a trade.`,
        data: { playerId: p.id },
      },
    });
  }
}

// ─── Notifications ────────────────────────────────────────────────────────────

async function sendGameNotifications(
  tx: any,
  game: any,
  homeScore: number,
  awayScore: number,
  homeWon: boolean
) {
  const [homeTeam, awayTeam] = await Promise.all([
    tx.team.findUnique({ where: { id: game.homeTeamId }, select: { managerId: true, city: true, name: true } }),
    tx.team.findUnique({ where: { id: game.awayTeamId }, select: { managerId: true, city: true, name: true } }),
  ]);

  if (homeTeam) {
    await tx.notification.create({
      data: {
        userId: homeTeam.managerId,
        type: "GAME_RESULT",
        title: homeWon ? "Victory! 🏆" : "Defeat",
        body: `${homeTeam.city} ${homeTeam.name} ${homeWon ? "won" : "lost"} ${homeScore}–${awayScore} vs ${awayTeam?.city} ${awayTeam?.name}.`,
        data: { gameId: game.id, homeScore, awayScore, won: homeWon },
      },
    });
  }

  if (awayTeam) {
    await tx.notification.create({
      data: {
        userId: awayTeam.managerId,
        type: "GAME_RESULT",
        title: !homeWon ? "Victory! 🏆" : "Defeat",
        body: `${awayTeam.city} ${awayTeam.name} ${!homeWon ? "won" : "lost"} ${awayScore}–${homeScore} vs ${homeTeam?.city} ${homeTeam?.name}.`,
        data: { gameId: game.id, homeScore: awayScore, awayScore: homeScore, won: !homeWon },
      },
    });
  }
}
