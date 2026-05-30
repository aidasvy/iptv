import { requireSession } from "@/lib/session";
import { db } from "@hoopmanager/db";
import { formatDistanceToNow } from "date-fns";
import { markNotificationRead } from "./actions";

export default async function InboxPage() {
  const session = await requireSession();

  const notifications = await db.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const unread = notifications.filter((n) => !n.isRead);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Inbox</h1>
          {unread.length > 0 && (
            <p className="text-sm text-slate-400 mt-0.5">{unread.length} unread notifications</p>
          )}
        </div>
        {unread.length > 0 && (
          <form action={async () => { "use server"; await db.notification.updateMany({ where: { userId: session.user.id, isRead: false }, data: { isRead: true } }); }}>
            <button type="submit" className="text-xs text-slate-400 hover:text-white transition-colors border border-slate-700 hover:border-slate-500 px-3 py-1.5 rounded-lg">
              Mark all read
            </button>
          </form>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="stat-card text-center py-16">
          <div className="text-4xl mb-3">📬</div>
          <div className="text-white font-medium">All caught up</div>
          <div className="text-slate-400 text-sm mt-1">No notifications yet</div>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`stat-card flex items-start gap-4 transition-colors ${!n.isRead ? "border-slate-700 bg-slate-900" : "border-slate-800/50 bg-slate-900/50"}`}
            >
              <div className="text-2xl mt-0.5">{NOTIFICATION_ICONS[n.type] ?? "🔔"}</div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-semibold ${n.isRead ? "text-slate-300" : "text-white"}`}>
                  {n.title}
                </div>
                <div className="text-sm text-slate-400 mt-0.5">{n.body}</div>
                <div className="text-xs text-slate-600 mt-1">
                  {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                </div>
              </div>
              {!n.isRead && (
                <div className="w-2 h-2 rounded-full bg-court-400 mt-1.5 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const NOTIFICATION_ICONS: Record<string, string> = {
  TRADE_RECEIVED: "🔄",
  TRADE_ACCEPTED: "✅",
  TRADE_REJECTED: "❌",
  GAME_RESULT: "🏀",
  INJURY: "🏥",
  PLAYER_UNHAPPY: "😤",
  DRAFT_PICK: "🎓",
  FREE_AGENT_SIGNED: "✍️",
  SEASON_START: "🏆",
  PLAYOFFS: "🥇",
};
