import { requireSession } from "@/lib/session";
import { getTeamForUser, getCurrentSeason } from "@/lib/queries";
import { db } from "@hoopmanager/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { format, isPast } from "date-fns";

export default async function SchedulePage() {
  const session = await requireSession();
  const team = await getTeamForUser(session.user.id);
  if (!team) redirect("/setup");

  const season = await getCurrentSeason(team.leagueId);

  const games = season
    ? await db.game.findMany({
        where: {
          seasonId: season.id,
          week: { lt: 100 }, // exclude playoff games
          OR: [{ homeTeamId: team.id }, { awayTeamId: team.id }],
        },
        include: {
          homeTeam: { select: { id: true, name: true, city: true, abbreviation: true, primaryColor: true } },
          awayTeam: { select: { id: true, name: true, city: true, abbreviation: true, primaryColor: true } },
        },
        orderBy: { scheduledAt: "asc" },
      })
    : [];

  const played   = games.filter((g) => g.isPlayed);
  const upcoming = games.filter((g) => !g.isPlayed);

  const wins   = played.filter((g) => {
    const isHome = g.homeTeamId === team.id;
    return isHome ? (g.homeScore ?? 0) > (g.awayScore ?? 0) : (g.awayScore ?? 0) > (g.homeScore ?? 0);
  }).length;
  const losses = played.length - wins;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Schedule</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Season {season?.seasonNumber ?? "—"} · {games.length} games
          </p>
        </div>
        <div className="flex gap-4 text-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-400">{wins}</div>
            <div className="text-xs text-slate-500">Wins</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-400">{losses}</div>
            <div className="text-xs text-slate-500">Losses</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-400">{upcoming.length}</div>
            <div className="text-xs text-slate-500">Remaining</div>
          </div>
        </div>
      </div>

      {/* Upcoming games */}
      {upcoming.length > 0 && (
        <section>
          <h2 className="text-xs text-slate-500 uppercase tracking-wider mb-3">Upcoming</h2>
          <div className="space-y-2">
            {upcoming.map((g) => {
              const isHome = g.homeTeamId === team.id;
              const opponent = isHome ? g.awayTeam : g.homeTeam;
              return (
                <div key={g.id} className="stat-card flex items-center gap-4">
                  <div className="text-center w-16 flex-shrink-0">
                    <div className="text-xs text-slate-500">
                      {format(new Date(g.scheduledAt), "MMM d")}
                    </div>
                    <div className="text-xs text-slate-600">
                      {format(new Date(g.scheduledAt), "EEE")}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">{isHome ? "vs" : "@"}</span>
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style={{ backgroundColor: opponent.primaryColor }}
                    >
                      {opponent.abbreviation[0]}
                    </div>
                    <span className="text-sm text-white font-medium">
                      {opponent.city} {opponent.name}
                    </span>
                  </div>
                  <div className="ml-auto text-xs text-slate-500">
                    {isHome ? "Home" : "Away"} · Week {g.week}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Results */}
      {played.length > 0 && (
        <section>
          <h2 className="text-xs text-slate-500 uppercase tracking-wider mb-3">Results</h2>
          <div className="stat-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-slate-800">
                  {["Wk", "Date", "H/A", "Opponent", "Score", "Result", ""].map((h) => (
                    <th key={h} className="pb-3 text-xs text-slate-500 font-medium pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {[...played].reverse().map((g) => {
                  const isHome = g.homeTeamId === team.id;
                  const opponent = isHome ? g.awayTeam : g.homeTeam;
                  const myScore   = isHome ? g.homeScore : g.awayScore;
                  const oppScore  = isHome ? g.awayScore : g.homeScore;
                  const won = (myScore ?? 0) > (oppScore ?? 0);

                  return (
                    <tr key={g.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="py-3 pr-4 text-slate-500 text-xs">{g.week}</td>
                      <td className="py-3 pr-4 text-slate-400 text-xs whitespace-nowrap">
                        {format(new Date(g.scheduledAt), "MMM d")}
                      </td>
                      <td className="py-3 pr-4 text-slate-500 text-xs">{isHome ? "H" : "A"}</td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-5 h-5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: opponent.primaryColor }}
                          />
                          <span className="text-white text-sm">{opponent.city} {opponent.name}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 font-mono text-sm font-medium text-white">
                        {myScore ?? "—"}–{oppScore ?? "—"}
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${won ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                          {won ? "W" : "L"}
                        </span>
                      </td>
                      <td className="py-3">
                        <Link
                          href={`/games/${g.id}`}
                          className="text-xs text-court-400 hover:text-court-300 transition-colors"
                        >
                          Box score →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {games.length === 0 && (
        <div className="stat-card text-center py-16">
          <div className="text-4xl mb-4">📅</div>
          <h3 className="text-white font-semibold mb-2">Season not started</h3>
          <p className="text-slate-400 text-sm">Games will appear here once the regular season begins.</p>
        </div>
      )}
    </div>
  );
}
