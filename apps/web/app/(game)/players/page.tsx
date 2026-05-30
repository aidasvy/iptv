import { requireSession } from "@/lib/session";
import { getTeamForUser, computePlayerOverall } from "@/lib/queries";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatSalary } from "@hoopmanager/shared";

export default async function PlayersPage() {
  const session = await requireSession();
  const team = await getTeamForUser(session.user.id);
  if (!team) redirect("/setup");

  const players = team.players.map((p) => ({
    ...p,
    ovr: computePlayerOverall(p),
  })).sort((a, b) => b.ovr - a.ovr);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Roster</h1>
          <p className="text-slate-400 text-sm mt-0.5">{players.length} players · Click any player for full detail</p>
        </div>
      </div>

      <div className="stat-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-slate-800">
              {["Pos", "Player", "Age", "Nat", "OVR", "POT", "Salary", "Yrs", "Morale", "Fatigue", "Status"].map((h) => (
                <th key={h} className="pb-3 text-xs text-slate-500 font-medium pr-4 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {players.map((p) => (
              <tr key={p.id} className="hover:bg-slate-800/20 transition-colors group">
                <td className="py-3 pr-4 text-slate-500 font-mono text-xs">{p.position}</td>
                <td className="py-3 pr-4">
                  <Link href={`/players/${p.id}`} className="text-white font-medium group-hover:text-court-400 transition-colors">
                    {p.firstName} {p.lastName}
                  </Link>
                </td>
                <td className="py-3 pr-4 text-slate-400">{p.age}</td>
                <td className="py-3 pr-4">{p.nationality}</td>
                <td className="py-3 pr-4">
                  <span className={`text-sm font-bold ${p.ovr >= 80 ? "text-yellow-400" : p.ovr >= 70 ? "text-sky-400" : "text-emerald-400"}`}>
                    {p.ovr}
                  </span>
                </td>
                <td className="py-3 pr-4">
                  <PotBadge potential={p.potential} known={p.potentialKnown} />
                </td>
                <td className="py-3 pr-4 text-slate-300 font-mono text-xs">{formatSalary(p.salary)}</td>
                <td className="py-3 pr-4 text-slate-400">{p.contractYears}y</td>
                <td className="py-3 pr-4">
                  <span className={`text-xs ${p.morale >= 75 ? "text-emerald-400" : p.morale >= 50 ? "text-amber-400" : "text-red-400"}`}>
                    {p.morale}/100
                  </span>
                </td>
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-1.5">
                    <div className="w-12 h-1 rounded-full bg-slate-800">
                      <div
                        className={`h-full rounded-full ${p.fatigue > 70 ? "bg-red-500" : p.fatigue > 40 ? "bg-amber-500" : "bg-emerald-500"}`}
                        style={{ width: `${p.fatigue}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500">{Math.round(p.fatigue)}%</span>
                  </div>
                </td>
                <td className="py-3 pr-4">
                  {p.isInjured ? (
                    <span className="text-xs text-red-400 font-medium">Out {p.injuryWeeks}w</span>
                  ) : p.isSuspended ? (
                    <span className="text-xs text-amber-400 font-medium">Susp.</span>
                  ) : (
                    <span className="text-xs text-emerald-400">Active</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PotBadge({ potential, known }: { potential: string; known: boolean }) {
  if (!known) return <span className="text-slate-600 text-xs">?</span>;
  const map: Record<string, { short: string; cls: string }> = {
    ELITE:    { short: "A+", cls: "rating-elite" },
    STAR:     { short: "A",  cls: "rating-star" },
    STARTER:  { short: "B",  cls: "rating-starter" },
    ROTATION: { short: "C",  cls: "rating-rotation" },
    FRINGE:   { short: "D",  cls: "rating-fringe" },
  };
  const m = map[potential] ?? map.ROTATION;
  return <span className={`text-xs px-2 py-0.5 rounded font-bold ${m.cls}`}>{m.short}</span>;
}
