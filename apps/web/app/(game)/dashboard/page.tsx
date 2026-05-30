import { requireSession } from "@/lib/session";
import { getTeamForUser, getNextGame, getInjuredPlayers, computePlayerOverall } from "@/lib/queries";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatSalary } from "@hoopmanager/shared";

export default async function DashboardPage() {
  const session = await requireSession();
  const team = await getTeamForUser(session.user.id);

  if (!team) redirect("/setup");

  const [nextGame, injured] = await Promise.all([
    getNextGame(team.id),
    getInjuredPlayers(team.id),
  ]);

  const standing = team.standings[0];
  const wins = standing?.wins ?? 0;
  const losses = standing?.losses ?? 0;
  const starters = team.players
    .filter((p) => [team.starterPG, team.starterSG, team.starterSF, team.starterPF, team.starterC].includes(p.id))
    .map((p) => ({ ...p, ovr: computePlayerOverall(p) }));

  // Combine recent games from both sides into a sorted list
  const recentGames = [
    ...team.homeGames.map((g) => ({
      opponent: g.awayTeam.name,
      location: "Home",
      homeScore: g.homeScore,
      awayScore: g.awayScore,
      win: (g.homeScore ?? 0) > (g.awayScore ?? 0),
    })),
    ...team.awayGames.map((g) => ({
      opponent: g.homeTeam.name,
      location: "Away",
      homeScore: g.homeScore,
      awayScore: g.awayScore,
      win: (g.awayScore ?? 0) > (g.homeScore ?? 0),
    })),
  ].slice(0, 5);

  const totalSalary = team.players.reduce((s, p) => s + p.salary, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{team.city} {team.name}</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Season {team.league.currentPhase.replace(/_/g, " ")} · Week {team.league.currentWeek}
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-display tracking-wide text-white">{wins}–{losses}</div>
          <div className="text-sm text-slate-400">
            {standing ? `${standing.streak > 0 ? `W${standing.streak}` : `L${Math.abs(standing.streak)}`}` : "No games yet"}
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Record</div>
          <div className="text-2xl font-bold text-white">{wins}–{losses}</div>
          <div className="text-xs text-slate-500 mt-0.5">Season record</div>
        </div>
        <div className="stat-card">
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Roster</div>
          <div className="text-2xl font-bold text-white">{team.players.length}</div>
          <div className="text-xs text-slate-500 mt-0.5">Players signed</div>
        </div>
        <div className="stat-card">
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Salary</div>
          <div className="text-2xl font-bold text-court-400">{formatSalary(totalSalary)}</div>
          <div className="text-xs text-slate-500 mt-0.5">/ {formatSalary(team.league.salaryCap ?? 136000)} cap</div>
        </div>
        <div className="stat-card">
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Chemistry</div>
          <div className="text-2xl font-bold text-emerald-400">{team.teamChemistry}</div>
          <div className="text-xs text-slate-500 mt-0.5">Team cohesion</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Next game */}
        <div className="stat-card">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Next Game</h2>
          {nextGame ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold mb-1 text-sm"
                    style={{ backgroundColor: nextGame.homeTeam.primaryColor }}>
                    {nextGame.homeTeam.abbreviation}
                  </div>
                  <div className="text-xs text-slate-400">{nextGame.homeTeamId === team.id ? "Home" : "Away"}</div>
                </div>
                <div className="text-center">
                  <div className="text-slate-500 text-xs mb-1">
                    {new Date(nextGame.scheduledAt).toLocaleDateString("en-US", { weekday: "short" })}
                  </div>
                  <div className="text-2xl font-display text-slate-300">VS</div>
                  <div className="text-slate-500 text-xs mt-1">
                    {new Date(nextGame.scheduledAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                  </div>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold mb-1 text-sm"
                    style={{ backgroundColor: nextGame.awayTeam.primaryColor }}>
                    {nextGame.awayTeam.abbreviation}
                  </div>
                  <div className="text-xs text-slate-400">{nextGame.awayTeamId === team.id ? "Home" : "Away"}</div>
                </div>
              </div>
              <div className="text-center text-xs text-slate-500">
                vs {nextGame.homeTeamId === team.id ? nextGame.awayTeam.name : nextGame.homeTeam.name}
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-slate-500 text-sm">No upcoming games scheduled</div>
          )}
        </div>

        {/* Recent results */}
        <div className="stat-card">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Last 5 Games</h2>
          {recentGames.length > 0 ? (
            <div className="space-y-3">
              {recentGames.map((g, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold flex-shrink-0 ${g.win ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                    {g.win ? "W" : "L"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{g.opponent}</div>
                    <div className="text-xs text-slate-500">{g.location}</div>
                  </div>
                  <div className={`text-sm font-mono font-medium ${g.win ? "text-emerald-400" : "text-red-400"}`}>
                    {g.homeScore}–{g.awayScore}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500 text-sm">No games played yet</div>
          )}
        </div>

        {/* Injury report */}
        <div className="stat-card">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
            Injury Report
            {injured.length > 0 && (
              <span className="ml-2 text-xs text-red-400 normal-case font-normal">{injured.length} out</span>
            )}
          </h2>
          {injured.length > 0 ? (
            <div className="space-y-3">
              {injured.map((p) => (
                <div key={p.id} className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${(p.injuryWeeks ?? 0) > 3 ? "bg-red-500" : "bg-amber-500"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white">{p.firstName} {p.lastName}</div>
                    <div className="text-xs text-slate-400">{p.injuryType?.replace(/_/g, " ")}</div>
                  </div>
                  <div className="text-xs text-slate-400 flex-shrink-0">{p.injuryWeeks}w</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-slate-500 text-center py-4">All players healthy ✓</div>
          )}
        </div>
      </div>

      {/* Starting lineup */}
      {starters.length > 0 && (
        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Starting Lineup</h2>
            <Link href="/team" className="text-xs text-court-400 hover:text-court-300 transition-colors">
              Full Roster →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-slate-800">
                  {["Pos", "Player", "Age", "OVR", "Salary", "Morale"].map((h) => (
                    <th key={h} className="pb-2 text-xs text-slate-500 font-medium pr-6">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {starters.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="py-3 pr-6 text-slate-500 font-mono text-xs">{p.position}</td>
                    <td className="py-3 pr-6">
                      <div className="text-white font-medium">{p.firstName} {p.lastName}</div>
                      <div className="text-xs text-slate-500">{p.nationality}</div>
                    </td>
                    <td className="py-3 pr-6 text-slate-400">{p.age}</td>
                    <td className="py-3 pr-6">
                      <span className={`text-sm font-bold ${p.ovr >= 80 ? "text-yellow-400" : p.ovr >= 70 ? "text-sky-400" : "text-emerald-400"}`}>
                        {p.ovr}
                      </span>
                    </td>
                    <td className="py-3 pr-6 text-slate-300 font-mono text-xs">{formatSalary(p.salary)}</td>
                    <td className="py-3 pr-6">
                      <div className={`text-xs ${p.morale >= 75 ? "text-emerald-400" : p.morale >= 50 ? "text-amber-400" : "text-red-400"}`}>
                        {p.morale >= 75 ? "Happy" : p.morale >= 50 ? "Content" : "Unhappy"}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {starters.length === 0 && (
        <div className="stat-card text-center py-12">
          <div className="text-4xl mb-4">🏀</div>
          <h3 className="text-white font-semibold mb-2">Set your starting lineup</h3>
          <p className="text-slate-400 text-sm mb-6">Head to Team management to configure your starters and rotation.</p>
          <Link href="/team" className="inline-block bg-court-500 hover:bg-court-400 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors">
            Manage Team
          </Link>
        </div>
      )}
    </div>
  );
}
