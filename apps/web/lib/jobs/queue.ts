import { Queue, Worker, Job } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

// ─── Queue definitions ────────────────────────────────────────────────────────

export const simulationQueue = new Queue("simulation", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
});

export const developmentQueue = new Queue("development", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { count: 50 },
  },
});

// ─── Job types ────────────────────────────────────────────────────────────────

export interface SimulateWeekJob {
  leagueId: string;
  week: number;
}

export interface SimulateGameJob {
  gameId: string;
  leagueId: string;
}

export interface RunDevelopmentJob {
  leagueId: string;
  week: number;
}

// ─── Enqueue helpers ──────────────────────────────────────────────────────────

export async function enqueueWeekSimulation(leagueId: string, week: number) {
  await simulationQueue.add(
    "simulate-week",
    { leagueId, week } satisfies SimulateWeekJob,
    { jobId: `week-${leagueId}-${week}` } // deduplicate
  );
}

export async function enqueueGameSimulation(gameId: string, leagueId: string) {
  await simulationQueue.add(
    "simulate-game",
    { gameId, leagueId } satisfies SimulateGameJob
  );
}

export async function enqueueWeeklyDevelopment(leagueId: string, week: number) {
  await developmentQueue.add(
    "run-development",
    { leagueId, week } satisfies RunDevelopmentJob,
    { jobId: `dev-${leagueId}-${week}` }
  );
}

export { connection };
