import { requireSession } from "@/lib/session";
import { db } from "@hoopmanager/db";
import { computePlayerOverall } from "@/lib/queries";
import { computeVORP, computeWinShares, estimateBPM } from "@hoopmanager/engine";
import { notFound } from "next/navigation";
import { formatSalary } from "@hoopmanager/shared";
import PlayerDetailClient from "./player-detail-client";

export default async function PlayerDetailPage({ params }: { params: { id: string } }) {
  const session = await requireSession();

  const player = await db.player.findUnique({
    where: { id: params.id },
    include: {
      team: { select: { id: true, name: true, city: true, managerId: true } },
      gameStats: {
        orderBy: { game: { scheduledAt: "desc" } },
        take: 20,
        include: {
          game: {
            select: {
              id: true, scheduledAt: true, week: true,
              homeScore: true, awayScore: true,
              homeTeamId: true, awayTeamId: true,
              homeTeam: { select: { abbreviation: true } },
              awayTeam: { select: { abbreviation: true } },
            },
          },
        },
      },
      seasonStats: {
        orderBy: { season: { seasonNumber: "desc" } },
        take: 5,
        include: { season: { select: { seasonNumber: true } } },
      },
      trainingSessions: {
        orderBy: { id: "desc" },
        take: 10,
        include: { schedule: { select: { week: true, focus: true, intensity: true } } },
      },
    },
  });

  if (!player) notFound();

  const isMyPlayer = player.team?.managerId === session.user.id;
  const ovr = computePlayerOverall(player);

  // Compute latest season advanced stats
  const latestSeason = player.seasonStats[0];
  const bpm = latestSeason
    ? estimateBPM(latestSeason.ppg, latestSeason.rpg, latestSeason.apg, latestSeason.spg, latestSeason.bpg, latestSeason.topg, latestSeason.usageRate)
    : null;
  const vorp = latestSeason && bpm !== null
    ? computeVORP(bpm, latestSeason.minutesPerGame * latestSeason.gamesPlayed, latestSeason.gamesPlayed)
    : null;
  const ws = latestSeason ? computeWinShares(latestSeason.per, latestSeason.minutesPerGame * latestSeason.gamesPlayed) : null;

  return (
    <PlayerDetailClient
      player={player as any}
      ovr={ovr}
      isMyPlayer={isMyPlayer}
      advancedStats={{ bpm, vorp, ws }}
    />
  );
}
