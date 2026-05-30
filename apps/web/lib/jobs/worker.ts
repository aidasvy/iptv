// BullMQ worker — run this as a standalone process alongside the Next.js app.
// Start with: node --require tsx/cjs apps/web/lib/jobs/worker.ts
// Or add to package.json: "worker": "tsx lib/jobs/worker.ts"

import { Worker } from "bullmq";
import { connection } from "./queue";
import { runGameSimulation } from "./simulate-game";
import { runWeeklyDevelopment } from "./development";
import { db } from "@hoopmanager/db";

console.log("🏀 HoopManager simulation worker starting…");

// ─── Simulation worker ────────────────────────────────────────────────────────

const simulationWorker = new Worker(
  "simulation",
  async (job) => {
    if (job.name === "simulate-week") {
      const { leagueId, week } = job.data;
      console.log(`[sim] Simulating week ${week} for league ${leagueId}`);

      const games = await db.game.findMany({
        where: { season: { leagueId }, week, isPlayed: false },
        select: { id: true },
      });

      console.log(`[sim] Found ${games.length} games to simulate`);

      for (const game of games) {
        await runGameSimulation(game.id);
        console.log(`[sim] ✓ Game ${game.id} complete`);
      }

      // After all games: run development
      await runWeeklyDevelopment(leagueId, week);
      console.log(`[sim] ✓ Development complete for week ${week}`);

      return { gamesSimulated: games.length };
    }

    if (job.name === "simulate-game") {
      const { gameId } = job.data;
      console.log(`[sim] Simulating single game ${gameId}`);
      await runGameSimulation(gameId);
      return { gameId };
    }

    throw new Error(`Unknown job name: ${job.name}`);
  },
  {
    connection,
    concurrency: 4, // simulate up to 4 games in parallel
  }
);

// ─── Development worker ───────────────────────────────────────────────────────

const developmentWorker = new Worker(
  "development",
  async (job) => {
    if (job.name === "run-development") {
      const { leagueId, week } = job.data;
      console.log(`[dev] Running development for week ${week}`);
      await runWeeklyDevelopment(leagueId, week);
      return { done: true };
    }
  },
  { connection, concurrency: 2 }
);

// ─── Event logging ────────────────────────────────────────────────────────────

simulationWorker.on("completed", (job) => {
  console.log(`[sim] Job ${job.id} (${job.name}) completed`);
});

simulationWorker.on("failed", (job, err) => {
  console.error(`[sim] Job ${job?.id} (${job?.name}) failed:`, err.message);
});

developmentWorker.on("completed", (job) => {
  console.log(`[dev] Job ${job.id} (${job.name}) completed`);
});

developmentWorker.on("failed", (job, err) => {
  console.error(`[dev] Job ${job?.id} failed:`, err.message);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("Shutting down workers…");
  await simulationWorker.close();
  await developmentWorker.close();
  process.exit(0);
});
