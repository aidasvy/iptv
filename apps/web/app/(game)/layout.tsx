import Link from "next/link";

const NAV_ITEMS = [
  { href: "/dashboard",  label: "Dashboard",  icon: "⬡" },
  { href: "/team",       label: "My Team",    icon: "👥" },
  { href: "/training",   label: "Training",   icon: "🏋️" },
  { href: "/tactics",    label: "Tactics",    icon: "🎯" },
  { href: "/league",     label: "League",     icon: "🏆" },
  { href: "/transfers",  label: "Transfers",  icon: "🔄" },
  { href: "/draft",      label: "Draft",      icon: "🎓" },
  { href: "/finances",   label: "Finances",   icon: "💰" },
  { href: "/analytics",  label: "Analytics",  icon: "📊" },
  { href: "/inbox",      label: "Inbox",      icon: "📬" },
];

export default function GameLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col border-r border-slate-800 bg-slate-900">
        <div className="px-4 py-5 border-b border-slate-800">
          <span className="font-display text-xl tracking-widest text-court-400">HOOP</span>
          <span className="font-display text-xl tracking-widest text-slate-400">MGR</span>
        </div>

        {/* Team summary */}
        <div className="px-4 py-4 border-b border-slate-800">
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Your Team</div>
          <div className="text-sm font-semibold text-white">Chicago Bulls</div>
          <div className="text-xs text-slate-400 mt-0.5">Week 12 · 18–6</div>
          <div className="mt-2 flex items-center gap-1.5">
            <div className="h-1.5 flex-1 rounded-full bg-slate-800">
              <div className="h-full w-[60%] rounded-full bg-emerald-500" />
            </div>
            <span className="text-xs text-slate-400">3rd seed</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-3">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors rounded-lg mx-2 mb-0.5"
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Season phase indicator */}
        <div className="px-4 py-4 border-t border-slate-800">
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-1.5">Season Phase</div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-emerald-400 font-medium">Regular Season</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">Next game: Tue</div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
