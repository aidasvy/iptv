import { requireSession } from "@/lib/session";
import { getTeamForUser } from "@/lib/queries";
import { db } from "@hoopmanager/db";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";

type PlayEvent = {
  clock: string;
  quarter: number;
  type: string;
  teamId: string;
  primaryPlayerId: string;
  secondaryPlayerId?: string;
  description: string;
  homeScore: number;
  awayScore: number;
  isClutch: boolean;
};

type QuarterScore = { home: number; away: number };

const PLAY_ICON: Record<string, string> = {
  MADE_THREE: "3",
  MISSED_THREE: "·",
  MADE_TWO: "2",
  MISSED_TWO: "·",
  DUNK: "⚡",
  LAYUP: "2",
  FAST_BREAK: "→",
  MADE_FREE_THROW: "1",
  MISSED_FREE_THROW: "·",
  ASSIST: "A",
  STEAL: "S",
  BLOCK: "B",
  TURNOVER: "T",
  REBOUND_OFF: "O",
  REBOUND_DEF: "D",
  FOUL: "F",
  TIMEOUT: "⏸",
  SUBSTITUTION: "↕",
  SHOT_CLOCK_VIOLATION: "T",
};

const SCORED_TYPES = new Set(["MADE_THREE", "MADE_TWO", "DUNK", "LAYUP", "MADE_FREE_THROW", "FAST_BREAK"]);
const NEGATIVE_TYPES = new Set(["TURNOVER", "FOUL", "SHOT_CLOCK_VIOLATION"]);

export default async function GameDetailPage({ params }: { params: { id: string } }) {
  const session = await requireSession();
  const team = await getTeamForUser(session.user.id);
  if (!team) redirect("/setup");

  const game = await db.game.findUnique({
    where: { id: params.id },
    include: {
      homeTeam: { select: { id: true, name: true, city: true, abbreviation: true, primaryColor: true } },
      awayTeam: { select: { id: true, name: true, city: true, abbreviation: true, primaryColor: true } },
      playerStats: {
        include: {
          player: { select: { id: true, firstName: true, lastName: true, position: true } },
        },
        orderBy: [{ teamId: "asc" }, { points: "desc" }],
      },
    },
  });

  if (!game) notFound();

  const isPlayed = game.isPlayed;
  const plays = (game.playByPlay as PlayEvent[] | null) ?? [];
  const quarters = (game.momentum as QuarterScore[] | null) ?? [];
  const clutchMoments = (game.clutchMoments as PlayEvent[] | null) ?? [];

  const homeStats = game.playerStats.filter((s) => s.teamId === game.homeTeamId);
  const awayStats = game.playerStats.filter((s) => s.teamId === game.awayTeamId);

  // Build player name map from playerStats
  const playerNames: Record<string, string> = {};
  for (const s of game.playerStats) {
    playerNames[s.playerId] = `${s.player.firstName} ${s.player.lastName}`;
  }

  const homeWon = isPlayed && (game.homeScore ?? 0) > (game.awayScore ?? 0);

  const isPlayoff = game.week >= 100;

  // Group plays by quarter
  const playsByQuarter: PlayEvent[][] = [[], [], [], [], []];
  for (const p of plays) {
    const q = Math.min(p.quarter - 1, 4);
    playsByQuarter[q].push(p);
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Back */}
      <Link href="/schedule" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
        ← Back to schedule
      </Link>

      {/* Scoreboard header */}
      <div className="stat-card">
        <div className="text-center mb-1">
          <span className="text-xs text-slate-500">
            {format(new Date(game.scheduledAt), "EEEE, MMMM d")}
            {isPlayoff ? " · Playoffs" : ` · Week ${game.week}`}
          </span>
        </div>

        <div className="flex items-center justify-center gap-8 py-4">
          {/* Away */}
          <div className="flex flex-col items-center gap-2 w-36">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white"
              style={{ backgroundColor: game.awayTeam.primaryColor }}
            >
              {game.awayTeam.abbreviation}
            </div>
            <div className="text-sm text-slate-300 text-center">
              {game.awayTeam.city} {game.awayTeam.name}
            </div>
            {isPlayed && !homeWon && (
              <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-bold">W</span>
            )}
          </div>

          {/* Score */}
          <div className="text-center">
            {isPlayed ? (
              <div className="flex items-baseline gap-3">
                <span className={`text-5xl font-bold font-mono ${!homeWon ? "text-white" : "text-slate-500"}`}>
                  {game.awayScore}
                </span>
                <span className="text-2xl text-slate-600">–</span>
                <span className={`text-5xl font-bold font-mono ${homeWon ? "text-white" : "text-slate-500"}`}>
                  {game.homeScore}
                </span>
              </div>
            ) : (
              <div className="text-2xl text-slate-500">vs</div>
            )}
            <div className="text-xs text-slate-500 mt-1">
              {isPlayed ? "Final" : format(new Date(game.scheduledAt), "h:mm a")}
            </div>
          </div>

          {/* Home */}
          <div className="flex flex-col items-center gap-2 w-36">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white"
              style={{ backgroundColor: game.homeTeam.primaryColor }}
            >
              {game.homeTeam.abbreviation}
            </div>
            <div className="text-sm text-slate-300 text-center">
              {game.homeTeam.city} {game.homeTeam.name}
            </div>
            {isPlayed && homeWon && (
              <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-bold">W</span>
            )}
          </div>
        </div>

        {/* Quarter breakdown */}
        {isPlayed && quarters.length > 0 && (
          <div className="mt-4 border-t border-slate-800 pt-4">
            <table className="w-full text-xs text-center">
              <thead>
                <tr className="text-slate-500">
                  <th className="text-left pl-2 pb-2">Team</th>
                  {quarters.map((_, i) => (
                    <th key={i} className="pb-2 w-12">Q{i + 1}</th>
                  ))}
                  <th className="pb-2 w-14 font-bold text-slate-300">TOT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                <tr>
                  <td className="text-left pl-2 py-2 text-slate-300 font-medium">{game.awayTeam.abbreviation}</td>
                  {quarters.map((q, i) => {
                    const prevAway = i === 0 ? 0 : quarters[i - 1].away;
                    return <td key={i} className="py-2 text-slate-400">{q.away - prevAway}</td>;
                  })}
                  <td className="py-2 font-bold text-white">{game.awayScore}</td>
                </tr>
                <tr>
                  <td className="text-left pl-2 py-2 text-slate-300 font-medium">{game.homeTeam.abbreviation}</td>
                  {quarters.map((q, i) => {
                    const prevHome = i === 0 ? 0 : quarters[i - 1].home;
                    return <td key={i} className="py-2 text-slate-400">{q.home - prevHome}</td>;
                  })}
                  <td className="py-2 font-bold text-white">{game.homeScore}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Game narrative */}
      {game.gameNarrative && (
        <div className="stat-card">
          <h2 className="text-xs text-slate-500 uppercase tracking-wider mb-3">Match Report</h2>
          <p className="text-slate-300 text-sm leading-relaxed">{game.gameNarrative}</p>
        </div>
      )}

      {/* Clutch moments */}
      {clutchMoments.length > 0 && (
        <div className="stat-card">
          <h2 className="text-xs text-slate-500 uppercase tracking-wider mb-3">
            Clutch Moments <span className="text-court-400">🔥</span>
          </h2>
          <div className="space-y-2">
            {clutchMoments.map((p, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <span className="text-xs text-slate-500 font-mono w-16 flex-shrink-0 pt-0.5">{p.clock}</span>
                <span className="text-slate-300">{p.description}</span>
                <span className="ml-auto font-mono text-xs text-slate-400 flex-shrink-0">
                  {p.awayScore}–{p.homeScore}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Box scores */}
      {isPlayed && (
        <>
          {[
            { label: `${game.awayTeam.city} ${game.awayTeam.name}`, stats: awayStats, color: game.awayTeam.primaryColor },
            { label: `${game.homeTeam.city} ${game.homeTeam.name}`, stats: homeStats, color: game.homeTeam.primaryColor },
          ].map(({ label, stats, color }) => (
            <section key={label} className="stat-card overflow-x-auto">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                <h2 className="text-sm font-semibold text-white">{label}</h2>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left border-b border-slate-800 text-slate-500">
                    {["Player", "Pos", "Min", "Pts", "Reb", "Ast", "Stl", "Blk", "TO", "FG", "3P", "FT", "+/-"].map((h) => (
                      <th key={h} className="pb-2 pr-3 font-medium last:pr-0">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/30">
                  {stats.map((s) => {
                    const fgPct = s.fga > 0 ? ((s.fgm / s.fga) * 100).toFixed(0) : "—";
                    const threePct = s.threePA > 0 ? ((s.threePM / s.threePA) * 100).toFixed(0) : "—";
                    const ftPct = s.fta > 0 ? ((s.ftm / s.fta) * 100).toFixed(0) : "—";
                    const isMyTeam = team.id === s.teamId;
                    return (
                      <tr key={s.playerId} className={`${s.isStarter ? "" : "opacity-75"} hover:bg-slate-800/20 transition-colors`}>
                        <td className="py-2 pr-3">
                          <Link
                            href={`/players/${s.playerId}`}
                            className={`font-medium hover:text-court-400 transition-colors ${isMyTeam ? "text-white" : "text-slate-300"}`}
                          >
                            {playerNames[s.playerId] ?? "—"}
                            {s.isStarter && <span className="ml-1 text-slate-600">·</span>}
                          </Link>
                        </td>
                        <td className="py-2 pr-3 text-slate-500">{s.player.position}</td>
                        <td className="py-2 pr-3 text-slate-400 font-mono">{s.minutes.toFixed(0)}</td>
                        <td className="py-2 pr-3 font-bold text-white font-mono">{s.points}</td>
                        <td className="py-2 pr-3 text-slate-300 font-mono">{s.rebounds}</td>
                        <td className="py-2 pr-3 text-slate-300 font-mono">{s.assists}</td>
                        <td className="py-2 pr-3 text-slate-400 font-mono">{s.steals}</td>
                        <td className="py-2 pr-3 text-slate-400 font-mono">{s.blocks}</td>
                        <td className="py-2 pr-3 text-slate-400 font-mono">{s.turnovers}</td>
                        <td className="py-2 pr-3 font-mono">
                          <span className="text-slate-300">{s.fgm}/{s.fga}</span>
                          <span className="text-slate-600 ml-1">({fgPct}%)</span>
                        </td>
                        <td className="py-2 pr-3 font-mono">
                          <span className="text-slate-300">{s.threePM}/{s.threePA}</span>
                          <span className="text-slate-600 ml-1">({threePct}%)</span>
                        </td>
                        <td className="py-2 pr-3 font-mono">
                          <span className="text-slate-300">{s.ftm}/{s.fta}</span>
                          <span className="text-slate-600 ml-1">({ftPct}%)</span>
                        </td>
                        <td className={`py-2 font-mono font-medium ${s.plusMinus > 0 ? "text-emerald-400" : s.plusMinus < 0 ? "text-red-400" : "text-slate-500"}`}>
                          {s.plusMinus > 0 ? "+" : ""}{s.plusMinus}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          ))}
        </>
      )}

      {/* Play-by-play */}
      {plays.length > 0 && (
        <section className="stat-card">
          <h2 className="text-xs text-slate-500 uppercase tracking-wider mb-4">Play by Play</h2>
          <div className="space-y-6">
            {playsByQuarter.map((qPlays, qi) => {
              if (qPlays.length === 0) return null;
              return (
                <div key={qi}>
                  <div className="text-xs font-semibold text-slate-500 uppercase mb-2">
                    {qi < 4 ? `Quarter ${qi + 1}` : "Overtime"}
                  </div>
                  <div className="space-y-1">
                    {qPlays.map((p, i) => {
                      const isHome = p.teamId === game.homeTeamId;
                      const scored = SCORED_TYPES.has(p.type);
                      const negative = NEGATIVE_TYPES.has(p.type);
                      const icon = PLAY_ICON[p.type] ?? "·";
                      return (
                        <div
                          key={i}
                          className={`flex items-start gap-3 text-xs py-1 px-2 rounded transition-colors ${
                            p.isClutch ? "bg-amber-500/10 border border-amber-500/20" : "hover:bg-slate-800/30"
                          }`}
                        >
                          <span className="text-slate-600 font-mono w-14 flex-shrink-0 pt-px">{p.clock}</span>
                          <span
                            className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center font-bold text-[10px] ${
                              scored
                                ? "bg-emerald-500/20 text-emerald-400"
                                : negative
                                ? "bg-red-500/20 text-red-400"
                                : "bg-slate-800 text-slate-500"
                            }`}
                          >
                            {icon}
                          </span>
                          <span className={`flex-1 ${isHome ? "text-right" : ""} ${p.isClutch ? "text-amber-300" : "text-slate-300"}`}>
                            {!isHome && p.description}
                          </span>
                          <span className="font-mono text-slate-500 w-14 text-center flex-shrink-0">
                            {p.awayScore}–{p.homeScore}
                          </span>
                          <span className={`flex-1 ${!isHome ? "text-right" : ""} ${p.isClutch ? "text-amber-300" : "text-slate-300"}`}>
                            {isHome && p.description}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {!isPlayed && (
        <div className="stat-card text-center py-12">
          <div className="text-3xl mb-3">🏀</div>
          <h3 className="text-white font-semibold mb-1">Game not yet played</h3>
          <p className="text-slate-400 text-sm">Check back after simulation runs.</p>
        </div>
      )}
    </div>
  );
}
