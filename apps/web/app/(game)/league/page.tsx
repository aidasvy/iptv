import { requireSession } from "@/lib/session";
import { getTeamForUser, getStandings } from "@/lib/queries";
import { redirect } from "next/navigation";

export default async function LeaguePage() {
  const session = await requireSession();
  const team = await getTeamForUser(session.user.id);
  if (!team) redirect("/setup");

  const standings = await getStandings(team.leagueId);

  const playoffLine = 8;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">{team.league.name} — Standings</h1>
        <p className="text-slate-400 text-sm mt-1">Week {team.league.currentWeek} · {team.league.currentPhase.replace(/_/g, " ")}</p>
      </div>

      <div className="stat-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-slate-800">
              {["#", "Team", "W", "L", "Pct", "GB", "Streak", "L10", "Pts For", "Pts Ag"].map((h) => (
                <th key={h} className="pb-3 text-xs text-slate-500 font-medium pr-4 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {standings.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-slate-500">
                  Season hasn't started yet — standings will appear after the first games are simulated.
                </td>
              </tr>
            ) : (
              standings.map((s, i) => {
                const isMyTeam = s.team.managerId === session.user.id;
                const isPlayoffBubble = i + 1 === playoffLine;
                const totalGames = s.wins + s.losses;
                const pct = totalGames > 0 ? (s.wins / totalGames).toFixed(3) : ".000";
                const leader = standings[0];
                const leaderGames = leader.wins + leader.losses > 0
                  ? leader.wins - leader.losses : 0;
                const myGames = s.wins - s.losses;
                const gb = i === 0 ? "—" : ((leaderGames - myGames) / 2).toFixed(1);

                return (
                  <>
                    {isPlayoffBubble && (
                      <tr key="bubble-line">
                        <td colSpan={10}>
                          <div className="border-t border-dashed border-amber-500/40 my-0.5" />
                        </td>
                      </tr>
                    )}
                    <tr
                      key={s.id}
                      className={`transition-colors ${isMyTeam ? "bg-court-500/5 border-court-500/20" : "hover:bg-slate-800/20"}`}
                    >
                      <td className="py-3 pr-4">
                        <span className={`text-sm font-bold ${i < playoffLine ? "text-emerald-400" : "text-slate-500"}`}>
                          {i + 1}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: s.team.primaryColor }}
                          />
                          <span className={`font-medium ${isMyTeam ? "text-court-400" : "text-white"}`}>
                            {s.team.name}
                          </span>
                          {isMyTeam && <span className="text-xs text-court-400 font-medium">(You)</span>}
                        </div>
                      </td>
                      <td className="py-3 pr-4 font-bold text-white">{s.wins}</td>
                      <td className="py-3 pr-4 text-slate-400">{s.losses}</td>
                      <td className="py-3 pr-4 font-mono text-slate-300 text-xs">{pct}</td>
                      <td className="py-3 pr-4 text-slate-400 font-mono text-xs">{gb}</td>
                      <td className="py-3 pr-4">
                        <span className={`text-xs font-semibold ${s.streak > 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {s.streak > 0 ? `W${s.streak}` : s.streak < 0 ? `L${Math.abs(s.streak)}` : "—"}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-slate-400 text-xs font-mono">{s.last10}</td>
                      <td className="py-3 pr-4 text-slate-300 font-mono text-xs">{s.pointsFor.toLocaleString()}</td>
                      <td className="py-3 pr-4 text-slate-300 font-mono text-xs">{s.pointsAgainst.toLocaleString()}</td>
                    </tr>
                  </>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {standings.length > 0 && (
        <div className="flex items-center gap-6 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-dashed border-t border-dashed border-amber-500/60" />
            <span>Playoff cutoff (top {playoffLine})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-court-500/50" />
            <span>Your team</span>
          </div>
        </div>
      )}
    </div>
  );
}
