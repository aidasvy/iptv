// Dashboard — GM overview: standings, upcoming game, injury report, recent results

export default function DashboardPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Chicago Bulls</h1>
          <p className="text-slate-400 text-sm mt-0.5">Season 1 · Week 12 of 30 · Regular Season</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-display tracking-wide text-white">18–6</div>
          <div className="text-sm text-emerald-400">3rd in East · W5</div>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {KPI_CARDS.map((k) => (
          <div key={k.label} className="stat-card">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">{k.label}</div>
            <div className={`text-2xl font-bold ${k.color}`}>{k.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Upcoming game */}
        <div className="stat-card lg:col-span-1">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Next Game</h2>
          <div className="flex items-center justify-between mb-6">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center text-white font-bold mb-1">CHI</div>
              <div className="text-xs text-slate-400">Home</div>
            </div>
            <div className="text-center">
              <div className="text-slate-500 text-xs mb-1">Tuesday</div>
              <div className="text-2xl font-display text-slate-300">VS</div>
              <div className="text-slate-500 text-xs mt-1">7:30 PM</div>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-purple-700 flex items-center justify-center text-white font-bold mb-1">LAL</div>
              <div className="text-xs text-slate-400">Away</div>
            </div>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Their record</span>
              <span className="text-white font-medium">21–3 (1st West)</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>H2H this season</span>
              <span className="text-white font-medium">0–1</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Win probability</span>
              <span className="text-amber-400 font-medium">38%</span>
            </div>
          </div>
        </div>

        {/* Recent results */}
        <div className="stat-card lg:col-span-1">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Last 5 Games</h2>
          <div className="space-y-3">
            {RECENT_GAMES.map((g, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold flex-shrink-0 ${g.win ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                  {g.win ? "W" : "L"}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">{g.opponent}</div>
                  <div className="text-xs text-slate-500">{g.location}</div>
                </div>
                <div className={`text-sm font-mono font-medium ${g.win ? "text-emerald-400" : "text-red-400"}`}>
                  {g.score}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Injury report */}
        <div className="stat-card lg:col-span-1">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
            Injury Report
            <span className="ml-2 text-xs text-red-400 normal-case font-normal">2 out</span>
          </h2>
          <div className="space-y-3">
            {INJURIES.map((inj, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${inj.weeks > 3 ? "bg-red-500" : "bg-amber-500"}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white">{inj.name}</div>
                  <div className="text-xs text-slate-400">{inj.injury}</div>
                </div>
                <div className="text-xs text-slate-400 flex-shrink-0">{inj.weeks}w</div>
              </div>
            ))}
            {INJURIES.length === 0 && (
              <div className="text-sm text-slate-500 text-center py-4">All players healthy ✓</div>
            )}
          </div>
        </div>
      </div>

      {/* Roster quick view */}
      <div className="stat-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Starting Lineup</h2>
          <a href="/team" className="text-xs text-court-400 hover:text-court-300 transition-colors">
            Full Roster →
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-slate-800">
                <th className="pb-2 text-xs text-slate-500 font-medium">Pos</th>
                <th className="pb-2 text-xs text-slate-500 font-medium">Player</th>
                <th className="pb-2 text-xs text-slate-500 font-medium text-right">OVR</th>
                <th className="pb-2 text-xs text-slate-500 font-medium text-right">PPG</th>
                <th className="pb-2 text-xs text-slate-500 font-medium text-right">RPG</th>
                <th className="pb-2 text-xs text-slate-500 font-medium text-right">APG</th>
                <th className="pb-2 text-xs text-slate-500 font-medium text-right">TS%</th>
                <th className="pb-2 text-xs text-slate-500 font-medium text-right">PER</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {STARTERS.map((p) => (
                <tr key={p.name} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 text-slate-500 font-mono text-xs">{p.pos}</td>
                  <td className="py-3">
                    <div className="text-white font-medium">{p.name}</div>
                    <div className="text-xs text-slate-500">{p.nationality} · {p.age}y</div>
                  </td>
                  <td className="py-3 text-right">
                    <span className={`text-sm font-bold ${p.ovr >= 80 ? "text-yellow-400" : p.ovr >= 70 ? "text-sky-400" : "text-emerald-400"}`}>
                      {p.ovr}
                    </span>
                  </td>
                  <td className="py-3 text-right text-slate-300">{p.ppg}</td>
                  <td className="py-3 text-right text-slate-300">{p.rpg}</td>
                  <td className="py-3 text-right text-slate-300">{p.apg}</td>
                  <td className="py-3 text-right text-slate-300">{p.ts}%</td>
                  <td className="py-3 text-right text-slate-300">{p.per}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Mock data (replace with real DB queries) ─────────────────────────────────

const KPI_CARDS = [
  { label: "Offense Rtg",  value: "114.2", sub: "7th in league",   color: "text-emerald-400" },
  { label: "Defense Rtg",  value: "108.6", sub: "4th in league",   color: "text-sky-400" },
  { label: "Net Rating",   value: "+5.6",  sub: "3rd in league",   color: "text-emerald-400" },
  { label: "Cap Used",     value: "$118M", sub: "$18M under cap",  color: "text-court-400" },
];

const RECENT_GAMES = [
  { win: true,  opponent: "Boston Celtics",  location: "Home", score: "114–99" },
  { win: true,  opponent: "Miami Heat",      location: "Away", score: "108–103" },
  { win: true,  opponent: "Toronto Raptors", location: "Home", score: "121–110" },
  { win: false, opponent: "Milwaukee Bucks", location: "Away", score: "95–112" },
  { win: true,  opponent: "Detroit Pistons", location: "Home", score: "130–98" },
];

const INJURIES = [
  { name: "Marcus Thompson",  injury: "Ankle sprain",     weeks: 2 },
  { name: "DeShawn Williams", injury: "Hamstring strain", weeks: 5 },
];

const STARTERS = [
  { pos: "PG", name: "Jaylen Cross",    nationality: "🇺🇸", age: 26, ovr: 82, ppg: 22.4, rpg: 4.1, apg: 8.7, ts: 61, per: 21.3 },
  { pos: "SG", name: "Kai Nakamura",   nationality: "🇯🇵", age: 24, ovr: 76, ppg: 18.2, rpg: 3.8, apg: 3.1, ts: 58, per: 17.6 },
  { pos: "SF", name: "Amir Hassan",    nationality: "🇩🇿", age: 28, ovr: 79, ppg: 17.6, rpg: 7.2, apg: 2.8, ts: 57, per: 18.9 },
  { pos: "PF", name: "Darius Stone",   nationality: "🇺🇸", age: 25, ovr: 74, ppg: 12.1, rpg: 9.4, apg: 1.2, ts: 55, per: 15.4 },
  { pos: "C",  name: "Kwame Asante",   nationality: "🇬🇭", age: 27, ovr: 78, ppg: 14.3, rpg: 11.8, apg: 2.4, ts: 64, per: 19.7 },
];
