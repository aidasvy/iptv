import { requireSession } from "@/lib/session";
import { getTeamForUser, getCurrentSeason } from "@/lib/queries";
import { db } from "@hoopmanager/db";
import { redirect } from "next/navigation";
import Link from "next/link";

type SeriesData = {
  matchupIndex: number;
  round: number;
  teamA: { id: string; name: string; city: string; abbreviation: string; primaryColor: string } | null;
  teamB: { id: string; name: string; city: string; abbreviation: string; primaryColor: string } | null;
  winsA: number;
  winsB: number;
  games: { id: string; homeScore: number | null; awayScore: number | null; isPlayed: boolean; homeTeamId: string; awayTeamId: string }[];
  winnerId: string | null;
};

export default async function PlayoffsPage() {
  const session = await requireSession();
  const team = await getTeamForUser(session.user.id);
  if (!team) redirect("/setup");

  const seasonBase = await getCurrentSeason(team.leagueId);
  const season = seasonBase
    ? await db.season.findUnique({
        where: { id: seasonBase.id },
        select: { id: true, seasonNumber: true, champion: true },
      })
    : null;

  const isPlayoffPhase =
    team.league.currentPhase === "PLAYOFFS" ||
    team.league.currentPhase === "OFFSEASON_DRAFT" ||
    team.league.currentPhase === "OFFSEASON_FREE_AGENCY";

  if (!season || !isPlayoffPhase) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-2">Playoffs</h1>
        <div className="stat-card text-center py-16">
          <div className="text-4xl mb-4">🏆</div>
          <h3 className="text-white font-semibold mb-2">Playoffs haven&apos;t started yet</h3>
          <p className="text-slate-400 text-sm">
            The playoff bracket will appear here once the regular season concludes.
          </p>
        </div>
      </div>
    );
  }

  // Fetch all playoff games (week >= 100)
  const playoffGames = await db.game.findMany({
    where: {
      seasonId: season.id,
      week: { gte: 100 },
    },
    include: {
      homeTeam: { select: { id: true, name: true, city: true, abbreviation: true, primaryColor: true } },
      awayTeam: { select: { id: true, name: true, city: true, abbreviation: true, primaryColor: true } },
    },
    orderBy: { week: "asc" },
  });

  if (playoffGames.length === 0) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-2">Playoffs</h1>
        <div className="stat-card text-center py-16">
          <div className="text-4xl mb-4">🏆</div>
          <h3 className="text-white font-semibold mb-2">Bracket loading…</h3>
          <p className="text-slate-400 text-sm">Playoff games are being scheduled.</p>
        </div>
      </div>
    );
  }

  // Decode week encoding: week = 100 + (round-1)*40 + matchupIndex*10 + gameNum
  // round = floor((week - 100) / 40) + 1
  // matchupIndex = floor(((week - 100) % 40) / 10)
  // gameNum = (week - 100) % 10

  type RawGame = typeof playoffGames[0];
  const seriesMap = new Map<string, SeriesData>();

  for (const g of playoffGames) {
    const offset = g.week - 100;
    const round = Math.floor(offset / 40) + 1;
    const matchupIndex = Math.floor((offset % 40) / 10);
    const key = `${round}-${matchupIndex}`;

    if (!seriesMap.has(key)) {
      seriesMap.set(key, {
        matchupIndex,
        round,
        teamA: g.homeTeam, // first game: homeTeam = high seed
        teamB: g.awayTeam,
        winsA: 0,
        winsB: 0,
        games: [],
        winnerId: null,
      });
    }

    const series = seriesMap.get(key)!;
    series.games.push({
      id: g.id,
      homeScore: g.homeScore,
      awayScore: g.awayScore,
      isPlayed: g.isPlayed,
      homeTeamId: g.homeTeamId,
      awayTeamId: g.awayTeamId,
    });

    if (g.isPlayed && (g.homeScore ?? 0) + (g.awayScore ?? 0) > 0) {
      // Count wins (skip 0-0 bye games)
      if ((g.homeScore ?? 0) > (g.awayScore ?? 0)) {
        if (g.homeTeamId === series.teamA?.id) series.winsA++;
        else series.winsB++;
      } else {
        if (g.awayTeamId === series.teamA?.id) series.winsA++;
        else series.winsB++;
      }
    }
  }

  // Detect winners (first to 3 wins in best-of-5)
  const SERIES_LENGTH = 3;
  for (const series of seriesMap.values()) {
    if (series.winsA >= SERIES_LENGTH) series.winnerId = series.teamA?.id ?? null;
    else if (series.winsB >= SERIES_LENGTH) series.winnerId = series.teamB?.id ?? null;
  }

  // Group by round
  const maxRound = Math.max(...[...seriesMap.values()].map((s) => s.round));
  const roundLabels: Record<number, string> = {
    1: "First Round",
    2: "Semifinals",
    3: "Finals",
  };

  const champion = season.champion
    ? await db.team.findUnique({
        where: { id: season.champion },
        select: { id: true, name: true, city: true, primaryColor: true },
      })
    : null;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Playoffs</h1>
        <p className="text-slate-400 text-sm mt-0.5">Season {season.seasonNumber} · Best of 5</p>
      </div>

      {/* Champion banner */}
      {champion && (
        <div
          className="stat-card text-center py-8 border"
          style={{ borderColor: `${champion.primaryColor}40`, backgroundColor: `${champion.primaryColor}10` }}
        >
          <div className="text-4xl mb-2">🏆</div>
          <div className="text-xl font-bold text-white">{champion.city} {champion.name}</div>
          <div className="text-sm text-slate-400 mt-1">Season {season.seasonNumber} Champions</div>
        </div>
      )}

      {/* Bracket rounds */}
      {Array.from({ length: maxRound }, (_, i) => i + 1).map((round) => {
        const roundSeries = [...seriesMap.values()]
          .filter((s) => s.round === round)
          .sort((a, b) => a.matchupIndex - b.matchupIndex);

        if (roundSeries.length === 0) return null;

        return (
          <section key={round}>
            <h2 className="text-xs text-slate-500 uppercase tracking-wider mb-4">
              {roundLabels[round] ?? `Round ${round}`}
            </h2>
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(roundSeries.length, 2)}, 1fr)` }}>
              {roundSeries.map((series) => (
                <SeriesCard
                  key={`${series.round}-${series.matchupIndex}`}
                  series={series}
                  myTeamId={team.id}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function SeriesCard({ series, myTeamId }: { series: SeriesData; myTeamId: string }) {
  const { teamA, teamB, winsA, winsB, games, winnerId } = series;
  const SERIES_LENGTH = 3;
  const isOver = winnerId !== null;
  const playedGames = games.filter((g) => g.isPlayed && (g.homeScore ?? 0) + (g.awayScore ?? 0) > 0);

  const teamAIsMe = teamA?.id === myTeamId;
  const teamBIsMe = teamB?.id === myTeamId;

  return (
    <div className={`stat-card ${isOver ? "opacity-90" : ""}`}>
      {/* Teams */}
      <div className="space-y-3">
        {[
          { t: teamA, wins: winsA, oWins: winsB, isMe: teamAIsMe },
          { t: teamB, wins: winsB, oWins: winsA, isMe: teamBIsMe },
        ].map(({ t, wins, oWins, isMe }) => {
          if (!t) return null;
          const isWinner = t.id === winnerId;
          const isEliminated = isOver && !isWinner;
          return (
            <div
              key={t.id}
              className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                isWinner ? "bg-emerald-500/10 border border-emerald-500/20" : ""
              } ${isEliminated ? "opacity-50" : ""}`}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                style={{ backgroundColor: t.primaryColor }}
              >
                {t.abbreviation}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium truncate ${isMe ? "text-court-400" : "text-white"}`}>
                  {t.city} {t.name}
                  {isMe && <span className="ml-1 text-xs text-slate-500">(You)</span>}
                </div>
              </div>
              <div className="flex gap-1.5 items-center">
                {Array.from({ length: SERIES_LENGTH }, (_, i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full border ${
                      i < wins
                        ? "bg-emerald-400 border-emerald-400"
                        : "bg-transparent border-slate-700"
                    }`}
                  />
                ))}
                <span className={`ml-2 text-sm font-bold ${isWinner ? "text-emerald-400" : "text-slate-300"}`}>
                  {wins}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Individual game results */}
      {playedGames.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-800">
          <div className="flex gap-2 flex-wrap">
            {playedGames.map((g, i) => {
              const awayWon = (g.awayScore ?? 0) > (g.homeScore ?? 0);
              const aWon = awayWon
                ? g.awayTeamId === teamA?.id
                : g.homeTeamId === teamA?.id;

              return (
                <Link
                  key={g.id}
                  href={`/games/${g.id}`}
                  className="group flex items-center gap-1.5 bg-slate-800/60 hover:bg-slate-800 px-2 py-1 rounded text-xs transition-colors"
                >
                  <span className="text-slate-500">G{i + 1}</span>
                  <span className={aWon ? "text-emerald-400" : "text-slate-400"}>
                    {g.awayScore}
                  </span>
                  <span className="text-slate-600">–</span>
                  <span className={!aWon ? "text-emerald-400" : "text-slate-400"}>
                    {g.homeScore}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Status */}
      <div className="mt-3 text-xs text-slate-500">
        {isOver
          ? `Series over · ${winsA}-${winsB}`
          : playedGames.length === 0
          ? "Series not started"
          : `Game ${playedGames.length + 1} of up to ${SERIES_LENGTH * 2 - 1}`}
      </div>
    </div>
  );
}
