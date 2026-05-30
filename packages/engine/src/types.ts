// Core runtime types for the simulation engine.
// These mirror Prisma models but are plain objects for simulation speed.

export type Position = "PG" | "SG" | "SF" | "PF" | "C";
export type Potential = "ELITE" | "STAR" | "STARTER" | "ROTATION" | "FRINGE";

export interface PlayerAttributes {
  // Physical
  speed: number;
  strength: number;
  verticalJump: number;
  stamina: number;
  wingspan: number;
  // Offense
  ballHandling: number;
  passing: number;
  threePoint: number;
  midRange: number;
  insideScoring: number;
  postGame: number;
  freeThrow: number;
  offMovement: number;
  // Defense
  perimeterDef: number;
  interiorDef: number;
  rebounding: number;
  shotBlocking: number;
  stealing: number;
  defensiveIQ: number;
  // Mental
  offensiveIQ: number;
  leadership: number;
  clutch: number;
  coachability: number;
  consistency: number;
}

export interface SimPlayer {
  id: string;
  name: string;
  position: Position;
  secondPos: Position | null;
  age: number;
  attrs: PlayerAttributes;
  potential: Potential;
  morale: number;   // 0-100
  form: number;     // 0-100; hot/cold streak modifier
  fatigue: number;  // 0-100; accumulated
  isInjured: boolean;
  salary: number;
}

export interface SimTeam {
  id: string;
  name: string;
  starters: [SimPlayer, SimPlayer, SimPlayer, SimPlayer, SimPlayer]; // PG SG SF PF C
  bench: SimPlayer[];
  tactics: TeamTactics;
  chemistry: number; // 0-100
  homeCourtAdvantage: number; // 0-20 bonus
}

export interface TeamTactics {
  offensiveScheme: OffensiveScheme;
  defensiveScheme: DefensiveScheme;
  tempo: number;         // 1-100: slow to fast
  aggression: number;    // 1-100
  threePointRate: number; // 1-100
  pressureLevel: number;  // 1-100: defensive pressure
}

export type OffensiveScheme =
  | "PACE_AND_SPACE"
  | "TRIANGLE"
  | "MOTION_OFFENSE"
  | "ISOLATION"
  | "PICK_AND_ROLL"
  | "PRINCETON"
  | "RUN_AND_GUN"
  | "HALF_COURT_GRIND";

export type DefensiveScheme =
  | "MAN_TO_MAN"
  | "ZONE_2_3"
  | "ZONE_3_2"
  | "PRESS_FULL"
  | "PRESS_HALF"
  | "SWITCHING_EVERYTHING"
  | "DROP_COVERAGE"
  | "AGGRESSIVE_HELP";

// ─── Simulation Output ────────────────────────────────────────────────────────

export interface PlayEvent {
  clock: string;        // "Q3 4:32"
  quarter: number;
  secondsLeft: number;
  type: PlayType;
  teamId: string;
  primaryPlayerId: string;
  secondaryPlayerId?: string;
  description: string;
  homeScore: number;
  awayScore: number;
  isClutch: boolean;    // final 2 min, margin ≤ 5
}

export type PlayType =
  | "MADE_THREE"
  | "MISSED_THREE"
  | "MADE_TWO"
  | "MISSED_TWO"
  | "MADE_FREE_THROW"
  | "MISSED_FREE_THROW"
  | "REBOUND_OFF"
  | "REBOUND_DEF"
  | "ASSIST"
  | "STEAL"
  | "BLOCK"
  | "TURNOVER"
  | "FOUL"
  | "SUBSTITUTION"
  | "TIMEOUT"
  | "FAST_BREAK"
  | "DUNK"
  | "LAYUP"
  | "SHOT_CLOCK_VIOLATION";

export interface PlayerBoxScore {
  playerId: string;
  isStarter: boolean;
  minutes: number;
  points: number;
  rebounds: number;
  offRebounds: number;
  defRebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fouls: number;
  fgm: number;
  fga: number;
  threePM: number;
  threePA: number;
  ftm: number;
  fta: number;
  plusMinus: number;
}

export interface GameResult {
  homeScore: number;
  awayScore: number;
  homeBoxScore: PlayerBoxScore[];
  awayBoxScore: PlayerBoxScore[];
  playByPlay: PlayEvent[];
  quarterScores: { home: number; away: number }[];
  narrative: string;
  clutchMoments: PlayEvent[];
  mvpPlayerId: string;
}
