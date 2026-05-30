import { requireSession } from "@/lib/session";
import { getTeamForUser } from "@/lib/queries";
import Link from "next/link";
import { signOut } from "@/lib/auth";
import { db } from "@hoopmanager/db";

const NAV_ITEMS = [
  { href: "/dashboard",  label: "Dashboard",  icon: "⬡" },
  { href: "/team",       label: "My Team",    icon: "👥" },
  { href: "/training",   label: "Training",   icon: "🏋️" },
  { href: "/league",     label: "League",     icon: "🏆" },
  { href: "/transfers",  label: "Transfers",  icon: "🔄" },
  { href: "/draft",      label: "Draft",      icon: "🎓" },
  { href: "/finances",   label: "Finances",   icon: "💰" },
  { href: "/analytics",  label: "Analytics",  icon: "📊" },
  { href: "/inbox",      label: "Inbox",      icon: "📬" },
];

export default async function GameLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const team = await getTeamForUser(session.user.id);

  const unreadCount = team
    ? await db.notification.count({ where: { userId: session.user.id, isRead: false } })
    : 0;

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
          {team ? (
            <>
              <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Your Team</div>
              <div className="text-sm font-semibold text-white">{team.city} {team.name}</div>
              <div className="text-xs text-slate-400 mt-0.5">
                Week {team.league.currentWeek} · {team.standings[0]?.wins ?? 0}–{team.standings[0]?.losses ?? 0}
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <div className="h-1.5 flex-1 rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${team.teamChemistry}%` }}
                  />
                </div>
                <span className="text-xs text-slate-400">Chem {team.teamChemistry}</span>
              </div>
            </>
          ) : (
            <div className="text-xs text-slate-500">No team yet</div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-3">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors rounded-lg mx-2 mb-0.5"
            >
              <span className="text-base">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.href === "/inbox" && unreadCount > 0 && (
                <span className="bg-court-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
          ))}
        </nav>

        {/* User + season phase */}
        <div className="border-t border-slate-800">
          {team && (
            <div className="px-4 py-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-emerald-400 font-medium">
                  {team.league.currentPhase.replace(/_/g, " ")}
                </span>
              </div>
            </div>
          )}
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-xs text-white font-medium truncate">{session.user.name}</div>
              <div className="text-xs text-slate-500 truncate">{session.user.email}</div>
            </div>
            <form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}>
              <button type="submit" className="text-slate-500 hover:text-slate-300 transition-colors text-xs ml-2">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
