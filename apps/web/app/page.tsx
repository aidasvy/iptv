import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <span className="font-display text-2xl tracking-widest text-court-400">
          HOOPMANAGER
        </span>
        <div className="flex gap-4">
          <Link href="/login" className="text-sm text-slate-400 hover:text-white transition-colors">
            Sign in
          </Link>
          <Link
            href="/register"
            className="text-sm bg-court-500 hover:bg-court-400 text-white px-4 py-1.5 rounded-lg transition-colors font-medium"
          >
            Play Free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24 court-bg">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-court-500/10 border border-court-500/30 text-court-400 text-xs font-medium px-3 py-1 rounded-full mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-court-400 animate-pulse" />
            Season 1 now open — 847 managers competing
          </div>

          <h1 className="text-5xl md:text-7xl font-display tracking-wide mb-6 leading-none">
            BUILD YOUR
            <br />
            <span className="text-court-400">DYNASTY</span>
          </h1>

          <p className="text-slate-400 text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
            The deepest basketball management game ever made. 25-attribute player system,
            NBA-style salary cap, advanced analytics, and play-by-play simulation —
            all in your browser.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link
              href="/register"
              className="bg-court-500 hover:bg-court-400 text-white font-semibold px-8 py-3.5 rounded-xl transition-all hover:scale-105 text-lg"
            >
              Start Your Franchise
            </Link>
            <Link
              href="#features"
              className="border border-slate-700 hover:border-slate-500 text-slate-300 font-semibold px-8 py-3.5 rounded-xl transition-colors text-lg"
            >
              See How It Works
            </Link>
          </div>
        </div>
      </section>

      {/* Feature highlights */}
      <section id="features" className="border-t border-slate-800 py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-display tracking-wide text-center mb-4">
            10X DEEPER THAN ANYTHING ELSE
          </h2>
          <p className="text-slate-400 text-center mb-14 max-w-xl mx-auto">
            Built by fans who were frustrated by shallow basketball management games.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="stat-card hover:border-slate-700 transition-colors">
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="border-t border-slate-800 py-20 px-6 bg-slate-900/50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-display tracking-wide text-center mb-12">
            VS THE COMPETITION
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-slate-800">
                  <th className="pb-3 text-slate-400 font-medium">Feature</th>
                  <th className="pb-3 text-slate-400 font-medium text-center">BuzzerBeater</th>
                  <th className="pb-3 text-court-400 font-semibold text-center">HoopManager</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {COMPARISON.map((row) => (
                  <tr key={row.feature}>
                    <td className="py-3 text-slate-300">{row.feature}</td>
                    <td className="py-3 text-center text-slate-500">{row.them}</td>
                    <td className="py-3 text-center text-emerald-400 font-medium">{row.us}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 px-6 text-center text-slate-500 text-sm">
        © 2026 HoopManager. All rights reserved.
      </footer>
    </main>
  );
}

const FEATURES = [
  {
    icon: "🏀",
    title: "25-Attribute Player System",
    description:
      "Speed, wingspan, clutch, coachability, off-ball movement — every attribute matters and is visible. No hidden black boxes.",
  },
  {
    icon: "📊",
    title: "NBA-Grade Analytics",
    description:
      "True Shooting %, PER, VORP, BPM, Win Shares, offensive and defensive ratings — all computed from your team's real game data.",
  },
  {
    icon: "🎯",
    title: "Deep Tactical System",
    description:
      "8 offensive schemes × 8 defensive schemes, tempo settings, aggression levels, and rotation management that actually affect outcomes.",
  },
  {
    icon: "💰",
    title: "NBA Salary Cap",
    description:
      "Real luxury tax brackets, max contracts, trade matching rules, MLE, bi-annual exception, and cap holds — the full front office experience.",
  },
  {
    icon: "🎓",
    title: "Draft & Development",
    description:
      "Scout prospects, reveal hidden potential, develop young players through training with age curves and coachability modifiers.",
  },
  {
    icon: "📝",
    title: "Play-by-Play Reports",
    description:
      "Every game generates a full play log with clutch moments, quarter scores, momentum swings, and a written match narrative.",
  },
  {
    icon: "🏥",
    title: "Realistic Injuries",
    description:
      "Fatigue accumulates across games. Overused players break down. Training intensity is a calculated risk.",
  },
  {
    icon: "🤝",
    title: "Trade Machine",
    description:
      "Propose multi-player, multi-pick trades. The cap engine validates every deal against NBA matching rules in real time.",
  },
  {
    icon: "⚗️",
    title: "Chemistry System",
    description:
      "Team chemistry affects on-court performance. Leadership attribute, morale management, and roster consistency all matter.",
  },
];

const COMPARISON = [
  { feature: "Player attributes", them: "6 skills", us: "25 attributes" },
  { feature: "Tactical schemes", them: "Offense %", us: "8×8 scheme matrix" },
  { feature: "Analytics", them: "Basic stats", us: "PER, VORP, BPM, TS%" },
  { feature: "Salary cap", them: "Simple budget", us: "Full NBA cap rules" },
  { feature: "Draft scouting", them: "None", us: "Progressive reveal" },
  { feature: "Game reports", them: "Score only", us: "Full play-by-play" },
  { feature: "UI / mobile", them: "2005 era", us: "Modern, responsive" },
  { feature: "Injury system", them: "Random", us: "Fatigue-driven" },
];
