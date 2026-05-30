import type {
  SimTeam,
  SimPlayer,
  PlayEvent,
  PlayType,
  PlayerBoxScore,
  GameResult,
  TeamTactics,
} from "../types";
import { computeSchemeModifiers } from "../tactics/scheme-modifiers";
import { getEffectiveRating } from "../player/attributes";

// ─── Constants ────────────────────────────────────────────────────────────────

const POSSESSIONS_PER_GAME = 200; // NBA average ~100/team
const QUARTERS = 4;
const SECONDS_PER_QUARTER = 720;

// ─── Main simulation entry point ──────────────────────────────────────────────

export function simulateGame(
  home: SimTeam,
  away: SimTeam,
  random: () => number = Math.random
): GameResult {
  const state = initGameState(home, away);
  const plays: PlayEvent[] = [];
  const quarterScores: { home: number; away: number }[] = [];

  for (let quarter = 1; quarter <= QUARTERS; quarter++) {
    const qPlays = simulateQuarter(state, quarter, random);
    plays.push(...qPlays);
    quarterScores.push({ home: state.homeScore, away: state.awayScore });
    applyFatigue(state, quarter);
  }

  // Overtime
  let otQuarter = 5;
  while (state.homeScore === state.awayScore && otQuarter <= 7) {
    const qPlays = simulateQuarter(state, otQuarter, random, 300); // 5 min OT
    plays.push(...qPlays);
    quarterScores.push({ home: state.homeScore, away: state.awayScore });
    otQuarter++;
  }

  const homeBox = buildBoxScores(state.homeOnCourt, state.homeBoxMap, true);
  const awayBox = buildBoxScores(state.awayOnCourt, state.awayBoxMap, false);

  const clutchMoments = plays.filter((p) => p.isClutch);
  const mvpPlayerId = determineMvp([...homeBox, ...awayBox]);
  const narrative = generateNarrative(home, away, state, plays, mvpPlayerId);

  return {
    homeScore: state.homeScore,
    awayScore: state.awayScore,
    homeBoxScore: homeBox,
    awayBoxScore: awayBox,
    playByPlay: plays,
    quarterScores,
    narrative,
    clutchMoments,
    mvpPlayerId,
  };
}

// ─── Game State ───────────────────────────────────────────────────────────────

interface GameState {
  homeScore: number;
  awayScore: number;
  homeOnCourt: SimPlayer[];
  awayOnCourt: SimPlayer[];
  homeBench: SimPlayer[];
  awayBench: SimPlayer[];
  homeBoxMap: Map<string, PlayerBoxScore>;
  awayBoxMap: Map<string, PlayerBoxScore>;
  home: SimTeam;
  away: SimTeam;
  possession: "home" | "away";
  homeTimeouts: number;
  awayTimeouts: number;
  consecutiveHomeScoring: number;
  consecutiveAwayScoring: number;
}

function initGameState(home: SimTeam, away: SimTeam): GameState {
  const homeOnCourt = [...home.starters];
  const awayOnCourt = [...away.starters];
  const homeBoxMap = new Map<string, PlayerBoxScore>();
  const awayBoxMap = new Map<string, PlayerBoxScore>();

  [...homeOnCourt, ...home.bench].forEach((p) =>
    homeBoxMap.set(p.id, emptyBoxScore(p.id, homeOnCourt.includes(p)))
  );
  [...awayOnCourt, ...away.bench].forEach((p) =>
    awayBoxMap.set(p.id, emptyBoxScore(p.id, awayOnCourt.includes(p)))
  );

  return {
    homeScore: 0,
    awayScore: 0,
    homeOnCourt,
    awayOnCourt,
    homeBench: [...home.bench],
    awayBench: [...away.bench],
    homeBoxMap,
    awayBoxMap,
    home,
    away,
    possession: Math.random() > 0.5 ? "home" : "away",
    homeTimeouts: 7,
    awayTimeouts: 7,
    consecutiveHomeScoring: 0,
    consecutiveAwayScoring: 0,
  };
}

// ─── Quarter simulation ───────────────────────────────────────────────────────

function simulateQuarter(
  state: GameState,
  quarter: number,
  random: () => number,
  seconds: number = SECONDS_PER_QUARTER
): PlayEvent[] {
  const plays: PlayEvent[] = [];
  let secondsLeft = seconds;

  const homeMod = computeSchemeModifiers(
    state.home.tactics,
    state.away.tactics,
    "home"
  );
  const awayMod = computeSchemeModifiers(
    state.away.tactics,
    state.home.tactics,
    "away"
  );

  // Pace controls how many possessions this quarter has
  const avgTempo = (state.home.tactics.tempo + state.away.tactics.tempo) / 2;
  const possessionsThisQuarter = Math.round(
    (POSSESSIONS_PER_GAME / 4) * (0.8 + (avgTempo / 100) * 0.4)
  );

  for (let i = 0; i < possessionsThisQuarter && secondsLeft > 0; i++) {
    const isHome = state.possession === "home";
    const offTeam = isHome ? state.homeOnCourt : state.awayOnCourt;
    const defTeam = isHome ? state.awayOnCourt : state.homeOnCourt;
    const boxMap = isHome ? state.homeBoxMap : state.awayBoxMap;
    const defBoxMap = isHome ? state.awayBoxMap : state.homeBoxMap;
    const teamId = isHome ? state.home.id : state.away.id;
    const offMod = isHome ? homeMod : awayMod;
    const defMod = isHome ? awayMod : homeMod;

    const isClutch =
      secondsLeft <= 120 && Math.abs(state.homeScore - state.awayScore) <= 5;

    const possessionPlays = simulatePossession(
      offTeam,
      defTeam,
      state,
      teamId,
      quarter,
      secondsLeft,
      offMod,
      defMod,
      isClutch,
      boxMap,
      defBoxMap,
      random
    );
    plays.push(...possessionPlays);

    // Approximate shot clock consumption
    const shotClockUsed = 10 + random() * 14;
    secondsLeft -= shotClockUsed;

    // Momentum check — big runs trigger timeout
    trackMomentum(state, isHome, possessionPlays);
    if (shouldCallTimeout(state, isHome)) {
      if (isHome && state.homeTimeouts > 0) {
        state.homeTimeouts--;
        plays.push(makeTimeoutEvent(quarter, secondsLeft, teamId, state));
      } else if (!isHome && state.awayTimeouts > 0) {
        state.awayTimeouts--;
        plays.push(makeTimeoutEvent(quarter, secondsLeft, teamId, state));
      }
    }

    // Substitutions every ~10 possessions
    if (i > 0 && i % 10 === 0) {
      manageSubstitutions(state, isHome, quarter, random);
    }

    state.possession = state.possession === "home" ? "away" : "home";
  }

  return plays;
}

// ─── Possession simulation ────────────────────────────────────────────────────

function simulatePossession(
  offTeam: SimPlayer[],
  defTeam: SimPlayer[],
  state: GameState,
  teamId: string,
  quarter: number,
  secondsLeft: number,
  offMod: ReturnType<typeof computeSchemeModifiers>,
  defMod: ReturnType<typeof computeSchemeModifiers>,
  isClutch: boolean,
  boxMap: Map<string, PlayerBoxScore>,
  defBoxMap: Map<string, PlayerBoxScore>,
  random: () => number
): PlayEvent[] {
  const plays: PlayEvent[] = [];
  const isHome = teamId === state.home.id;

  // Pick ball handler weighted by ball-handling + offensiveIQ
  const ballHandler = pickPlayer(offTeam, (p) =>
    getEffectiveRating(p, "ballHandling") +
    getEffectiveRating(p, "offensiveIQ") * 0.5
  , random);

  // Turnover check
  const turnoverRate =
    0.12 -
    (getEffectiveRating(ballHandler, "offensiveIQ") / 100) * 0.06 +
    (defMod.stealBonus || 0) -
    offMod.turnoverReduction;

  if (random() < Math.max(0.04, Math.min(0.22, turnoverRate))) {
    const defender = pickPlayer(defTeam, (p) => getEffectiveRating(p, "stealing"), random);
    const box = boxMap.get(ballHandler.id)!;
    box.turnovers++;
    const defBox = defBoxMap.get(defender.id)!;

    if (random() < 0.6) {
      defBox.steals++;
      plays.push(makePlay("STEAL", teamId === state.home.id ? state.away.id : state.home.id, defender, ballHandler, quarter, secondsLeft, state, isClutch));
    } else {
      plays.push(makePlay("TURNOVER", teamId, ballHandler, undefined, quarter, secondsLeft, state, isClutch));
    }
    return plays;
  }

  // Shot selection
  const shooter = selectShooter(offTeam, offMod, isClutch, random);
  const shotResult = resolveShotAttempt(
    shooter,
    offTeam,
    defTeam,
    state,
    offMod,
    defMod,
    isClutch,
    boxMap,
    defBoxMap,
    quarter,
    secondsLeft,
    random
  );
  plays.push(...shotResult);

  return plays;
}

// ─── Shot resolution ──────────────────────────────────────────────────────────

function resolveShotAttempt(
  shooter: SimPlayer,
  offTeam: SimPlayer[],
  defTeam: SimPlayer[],
  state: GameState,
  offMod: ReturnType<typeof computeSchemeModifiers>,
  defMod: ReturnType<typeof computeSchemeModifiers>,
  isClutch: boolean,
  boxMap: Map<string, PlayerBoxScore>,
  defBoxMap: Map<string, PlayerBoxScore>,
  quarter: number,
  secondsLeft: number,
  random: () => number
): PlayEvent[] {
  const plays: PlayEvent[] = [];
  const isHome = boxMap === state.homeBoxMap;
  const teamId = isHome ? state.home.id : state.away.id;

  // Determine shot type based on scheme and player profile
  const threeProb = computeThreeProbability(shooter, offMod);
  const isThree = random() < threeProb;
  const isDunk = !isThree && random() < 0.18 && getEffectiveRating(shooter, "insideScoring") > 65 && getEffectiveRating(shooter, "verticalJump") > 60;

  const relevantAttr = isThree
    ? getEffectiveRating(shooter, "threePoint")
    : isDunk
    ? getEffectiveRating(shooter, "insideScoring")
    : random() < 0.4
    ? getEffectiveRating(shooter, "midRange")
    : getEffectiveRating(shooter, "insideScoring");

  // Defender selection
  const defender = pickPlayer(defTeam, (p) =>
    isThree ? getEffectiveRating(p, "perimeterDef") : getEffectiveRating(p, "interiorDef"),
    random
  );

  // Block check (only on non-3PT shots)
  if (!isThree && random() < blockProbability(shooter, defender, defMod)) {
    const defBox = defBoxMap.get(defender.id)!;
    defBox.blocks++;
    const offBox = boxMap.get(shooter.id)!;
    offBox.fga++;
    if (isThree) offBox.threePA++;

    plays.push(makePlay("BLOCK", isHome ? state.away.id : state.home.id, defender, shooter, quarter, secondsLeft, state, isClutch));

    // Blocked shot: either possession ends or offensive rebound
    if (random() < 0.3) {
      const rebounder = pickPlayer(offTeam, (p) => getEffectiveRating(p, "rebounding"), random);
      boxMap.get(rebounder.id)!.offRebounds++;
      boxMap.get(rebounder.id)!.rebounds++;
      plays.push(makePlay("REBOUND_OFF", teamId, rebounder, undefined, quarter, secondsLeft, state, isClutch));
    }
    return plays;
  }

  const clutchMod = isClutch ? (getEffectiveRating(shooter, "clutch") - 50) / 200 : 0;
  const defStrength = isThree
    ? getEffectiveRating(defender, "perimeterDef")
    : getEffectiveRating(defender, "interiorDef");

  const baseMakeRate =
    (relevantAttr / 100) * (isThree ? 0.48 : isDunk ? 0.72 : 0.6) +
    clutchMod -
    (defStrength / 100) * 0.12 +
    ((offMod.shootingBonus || 0) - (defMod.shootingPenalty || 0));

  const makeRate = Math.max(0.2, Math.min(0.85, baseMakeRate));
  const madeShot = random() < makeRate;

  const offBox = boxMap.get(shooter.id)!;
  offBox.fga++;
  if (isThree) offBox.threePA++;

  if (madeShot) {
    const points = isThree ? 3 : 2;
    offBox.fgm++;
    if (isThree) offBox.threePM++;
    offBox.points += points;
    offBox.plusMinus += points;
    defender && (defBoxMap.get(defender.id)!.plusMinus -= points);

    if (isHome) state.homeScore += points;
    else state.awayScore += points;

    // Assist check
    const assistRate = 0.55 + (offMod.assistBonus || 0);
    if (random() < assistRate) {
      const assister = pickPlayer(
        offTeam.filter((p) => p.id !== shooter.id),
        (p) => getEffectiveRating(p, "passing"),
        random
      );
      boxMap.get(assister.id)!.assists++;
    }

    const playType: PlayType = isThree ? "MADE_THREE" : isDunk ? "DUNK" : "MADE_TWO";
    plays.push(makePlay(playType, teamId, shooter, undefined, quarter, secondsLeft, state, isClutch));

    // And-one foul check
    if (!isThree && random() < 0.08 + (getEffectiveRating(shooter, "insideScoring") / 100) * 0.05) {
      const ftResult = resolveFreeThrows(shooter, 1, isHome, state, boxMap, defBoxMap, quarter, secondsLeft, isClutch, teamId, random);
      plays.push(...ftResult);
    }
  } else {
    const playType: PlayType = isThree ? "MISSED_THREE" : "MISSED_TWO";
    plays.push(makePlay(playType, teamId, shooter, defender, quarter, secondsLeft, state, isClutch));

    // Foul check on miss
    if (random() < 0.12) {
      const ftCount = isThree ? 3 : 2;
      const defBox = defBoxMap.get(defender.id)!;
      defBox.fouls++;
      plays.push(makePlay("FOUL", isHome ? state.away.id : state.home.id, defender, shooter, quarter, secondsLeft, state, isClutch));
      const ftResult = resolveFreeThrows(shooter, ftCount, isHome, state, boxMap, defBoxMap, quarter, secondsLeft, isClutch, teamId, random);
      plays.push(...ftResult);
    } else {
      // Rebound
      const offRebRate = 0.27 + (offMod.offRebBonus || 0) - (defMod.defRebBonus || 0);
      if (random() < offRebRate) {
        const rebounder = pickPlayer(offTeam, (p) => getEffectiveRating(p, "rebounding"), random);
        boxMap.get(rebounder.id)!.offRebounds++;
        boxMap.get(rebounder.id)!.rebounds++;
        plays.push(makePlay("REBOUND_OFF", teamId, rebounder, undefined, quarter, secondsLeft, state, isClutch));
      } else {
        const rebounder = pickPlayer(defTeam, (p) => getEffectiveRating(p, "rebounding"), random);
        defBoxMap.get(rebounder.id)!.defRebounds++;
        defBoxMap.get(rebounder.id)!.rebounds++;
        plays.push(makePlay("REBOUND_DEF", isHome ? state.away.id : state.home.id, rebounder, undefined, quarter, secondsLeft, state, isClutch));
      }
    }
  }

  return plays;
}

// ─── Free throws ──────────────────────────────────────────────────────────────

function resolveFreeThrows(
  shooter: SimPlayer,
  count: number,
  isHome: boolean,
  state: GameState,
  boxMap: Map<string, PlayerBoxScore>,
  defBoxMap: Map<string, PlayerBoxScore>,
  quarter: number,
  secondsLeft: number,
  isClutch: boolean,
  teamId: string,
  random: () => number
): PlayEvent[] {
  const plays: PlayEvent[] = [];
  const box = boxMap.get(shooter.id)!;
  const ftRate = getEffectiveRating(shooter, "freeThrow") / 100;
  const clutchMod = isClutch ? (getEffectiveRating(shooter, "clutch") - 50) / 300 : 0;

  for (let i = 0; i < count; i++) {
    box.fta++;
    if (random() < Math.max(0.4, Math.min(0.98, ftRate + clutchMod))) {
      box.ftm++;
      box.points++;
      if (isHome) state.homeScore++;
      else state.awayScore++;
      plays.push(makePlay("MADE_FREE_THROW", teamId, shooter, undefined, quarter, secondsLeft, state, isClutch));
    } else {
      plays.push(makePlay("MISSED_FREE_THROW", teamId, shooter, undefined, quarter, secondsLeft, state, isClutch));
    }
  }
  return plays;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeThreeProbability(
  shooter: SimPlayer,
  offMod: ReturnType<typeof computeSchemeModifiers>
): number {
  const baseRate = getEffectiveRating(shooter, "threePoint") / 100 * 0.5;
  return Math.max(0.1, Math.min(0.7, baseRate + (offMod.threePointRate || 0)));
}

function blockProbability(
  shooter: SimPlayer,
  defender: SimPlayer,
  defMod: ReturnType<typeof computeSchemeModifiers>
): number {
  const blockSkill = getEffectiveRating(defender, "shotBlocking");
  const finishSkill = getEffectiveRating(shooter, "insideScoring");
  return Math.max(0, (blockSkill - finishSkill) / 100 * 0.15 + (defMod.blockBonus || 0));
}

function selectShooter(
  team: SimPlayer[],
  offMod: ReturnType<typeof computeSchemeModifiers>,
  isClutch: boolean,
  random: () => number
): SimPlayer {
  return pickPlayer(team, (p) => {
    const usage = getEffectiveRating(p, "offensiveIQ") * 0.3 +
      getEffectiveRating(p, "ballHandling") * 0.3 +
      getEffectiveRating(p, "threePoint") * (offMod.threePointRate > 0 ? 0.4 : 0.2) +
      getEffectiveRating(p, "insideScoring") * 0.2 +
      (isClutch ? getEffectiveRating(p, "clutch") * 0.5 : 0);
    return usage;
  }, random);
}

function pickPlayer(
  players: SimPlayer[],
  weight: (p: SimPlayer) => number,
  random: () => number
): SimPlayer {
  if (players.length === 0) throw new Error("Cannot pick from empty array");
  const weights = players.map(weight);
  const total = weights.reduce((a, b) => a + Math.max(0, b), 0);
  if (total === 0) return players[Math.floor(random() * players.length)];
  let r = random() * total;
  for (let i = 0; i < players.length; i++) {
    r -= Math.max(0, weights[i]);
    if (r <= 0) return players[i];
  }
  return players[players.length - 1];
}

function makePlay(
  type: PlayType,
  teamId: string,
  primary: SimPlayer,
  secondary: SimPlayer | undefined,
  quarter: number,
  secondsLeft: number,
  state: GameState,
  isClutch: boolean
): PlayEvent {
  const minutes = Math.floor(secondsLeft / 60);
  const secs = Math.floor(secondsLeft % 60);
  return {
    clock: `Q${quarter} ${minutes}:${secs.toString().padStart(2, "0")}`,
    quarter,
    secondsLeft,
    type,
    teamId,
    primaryPlayerId: primary.id,
    secondaryPlayerId: secondary?.id,
    description: buildDescription(type, primary, secondary, state),
    homeScore: state.homeScore,
    awayScore: state.awayScore,
    isClutch,
  };
}

function buildDescription(
  type: PlayType,
  primary: SimPlayer,
  secondary: SimPlayer | undefined,
  state: GameState
): string {
  const name = primary.name;
  const def = secondary?.name ?? "defender";
  const descriptions: Record<PlayType, string> = {
    MADE_THREE: `${name} drains the three${secondary ? ` (assist: ${def})` : ""}`,
    MISSED_THREE: `${name} misses from deep, ${def} contests well`,
    MADE_TWO: `${name} converts the mid-range${secondary ? ` off the ${def} assist` : ""}`,
    MISSED_TWO: `${name} misses the jumper`,
    DUNK: `${name} with the powerful dunk!`,
    LAYUP: `${name} finishes at the rim`,
    MADE_FREE_THROW: `${name} makes the free throw`,
    MISSED_FREE_THROW: `${name} misses the free throw`,
    REBOUND_OFF: `${name} crashes the glass for the offensive board`,
    REBOUND_DEF: `${name} secures the defensive rebound`,
    ASSIST: `${name} finds ${def} for the easy bucket`,
    STEAL: `${name} picks the pocket of ${def}!`,
    BLOCK: `${name} swats ${def}'s shot away!`,
    TURNOVER: `${name} turns it over`,
    FOUL: `${name} fouls ${def}`,
    SUBSTITUTION: `${name} checks in for ${def}`,
    TIMEOUT: `${name} timeout called`,
    FAST_BREAK: `${name} pushes in transition`,
    SHOT_CLOCK_VIOLATION: `Shot clock violation`,
  };
  return descriptions[type] ?? `${name} - ${type}`;
}

function makeTimeoutEvent(
  quarter: number,
  secondsLeft: number,
  teamId: string,
  state: GameState
): PlayEvent {
  const dummy = { id: teamId, name: "Timeout", position: "PG", secondPos: null, age: 30, attrs: {} as any, potential: "STARTER", morale: 75, form: 75, fatigue: 0, isInjured: false, salary: 0 } as SimPlayer;
  return makePlay("TIMEOUT", teamId, dummy, undefined, quarter, secondsLeft, state, false);
}

function trackMomentum(state: GameState, lastPossessionWasHome: boolean, plays: PlayEvent[]) {
  const scored = plays.some(p => ["MADE_TWO", "MADE_THREE", "DUNK", "LAYUP", "MADE_FREE_THROW"].includes(p.type));
  if (lastPossessionWasHome && scored) {
    state.consecutiveHomeScoring++;
    state.consecutiveAwayScoring = 0;
  } else if (!lastPossessionWasHome && scored) {
    state.consecutiveAwayScoring++;
    state.consecutiveHomeScoring = 0;
  } else {
    if (lastPossessionWasHome) state.consecutiveHomeScoring = 0;
    else state.consecutiveAwayScoring = 0;
  }
}

function shouldCallTimeout(state: GameState, lastPossWasHome: boolean): boolean {
  // Call timeout after opponent goes on a 6+ point run
  if (!lastPossWasHome && state.consecutiveHomeScoring >= 3) return true;
  if (lastPossWasHome && state.consecutiveAwayScoring >= 3) return true;
  return false;
}

function manageSubstitutions(state: GameState, _isHome: boolean, _quarter: number, random: () => number) {
  // Rotate bench players based on fatigue
  const rotateSide = (onCourt: SimPlayer[], bench: SimPlayer[]) => {
    if (bench.length === 0) return;
    const mostFatiguedIdx = onCourt.reduce((best, p, i) =>
      p.fatigue > onCourt[best].fatigue ? i : best, 0);
    const mostFatiguedBenchIdx = bench.reduce((best, p, i) =>
      p.fatigue < bench[best].fatigue ? i : best, 0);
    if (onCourt[mostFatiguedIdx].fatigue > 60 && bench[mostFatiguedBenchIdx].fatigue < 40) {
      const out = onCourt[mostFatiguedIdx];
      const inn = bench[mostFatiguedBenchIdx];
      onCourt[mostFatiguedIdx] = inn;
      bench[mostFatiguedBenchIdx] = out;
    }
  };

  rotateSide(state.homeOnCourt, state.homeBench);
  rotateSide(state.awayOnCourt, state.awayBench);
}

function applyFatigue(state: GameState, quarter: number) {
  const applyToSide = (players: SimPlayer[], tactics: TeamTactics) => {
    const tempoFatigue = tactics.tempo / 100 * 15;
    players.forEach((p) => {
      p.fatigue = Math.min(100, p.fatigue + tempoFatigue - (getEffectiveRating(p, "stamina") / 100) * 8);
    });
  };
  applyToSide(state.homeOnCourt, state.home.tactics);
  applyToSide(state.awayOnCourt, state.away.tactics);
}

// ─── Post-game ────────────────────────────────────────────────────────────────

function buildBoxScores(
  starters: SimPlayer[],
  boxMap: Map<string, PlayerBoxScore>,
  _isStarter: boolean
): PlayerBoxScore[] {
  return Array.from(boxMap.values()).map((b) => ({
    ...b,
    minutes: Number((b.fga * 1.5 + b.fta * 0.5 + b.rebounds * 0.8).toFixed(1)),
  }));
}

function determineMvp(allBox: PlayerBoxScore[]): string {
  return allBox.reduce((best, b) => {
    const score = b.points * 1 + b.assists * 1.5 + b.rebounds * 1.2 + b.steals * 2 + b.blocks * 2 - b.turnovers * 1.5;
    const bestScore = best.points + best.assists * 1.5 + best.rebounds * 1.2;
    return score > bestScore ? b : best;
  }, allBox[0]).playerId;
}

function generateNarrative(
  home: SimTeam,
  away: SimTeam,
  state: GameState,
  plays: PlayEvent[],
  mvpId: string
): string {
  const winner = state.homeScore > state.awayScore ? home.name : away.name;
  const loser = state.homeScore > state.awayScore ? away.name : home.name;
  const margin = Math.abs(state.homeScore - state.awayScore);
  const overtimes = plays.filter(p => p.quarter > 4).length > 0 ? " in overtime" : "";
  const threes = plays.filter(p => p.type === "MADE_THREE").length;
  const dunks = plays.filter(p => p.type === "DUNK").length;
  const clutchPlays = plays.filter(p => p.isClutch && ["MADE_THREE", "MADE_TWO", "DUNK"].includes(p.type)).length;

  let tone = margin > 20 ? "dominant" : margin > 10 ? "comfortable" : margin > 5 ? "hard-fought" : "thrilling";
  let story = `${winner} secured a ${tone} ${state.homeScore > state.awayScore ? state.homeScore : state.awayScore}-${state.homeScore > state.awayScore ? state.awayScore : state.homeScore} victory over ${loser}${overtimes}. `;

  if (threes > 15) story += `It was a shooting spectacle with ${threes} three-pointers made across both teams. `;
  if (dunks > 5) story += `The arena erupted for ${dunks} thunderous dunks. `;
  if (clutchPlays > 3) story += `The fourth quarter was edge-of-your-seat basketball with ${clutchPlays} clutch baskets. `;

  return story.trim();
}

function emptyBoxScore(playerId: string, isStarter: boolean): PlayerBoxScore {
  return {
    playerId,
    isStarter,
    minutes: 0,
    points: 0,
    rebounds: 0,
    offRebounds: 0,
    defRebounds: 0,
    assists: 0,
    steals: 0,
    blocks: 0,
    turnovers: 0,
    fouls: 0,
    fgm: 0,
    fga: 0,
    threePM: 0,
    threePA: 0,
    ftm: 0,
    fta: 0,
    plusMinus: 0,
  };
}
