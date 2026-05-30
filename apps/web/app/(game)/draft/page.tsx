import { requireSession } from "@/lib/session";
import { getTeamForUser } from "@/lib/queries";
import { db } from "@hoopmanager/db";
import { redirect } from "next/navigation";
import DraftClient from "./draft-client";

export default async function DraftPage() {
  const session = await requireSession();
  const team = await getTeamForUser(session.user.id);
  if (!team) redirect("/setup");

  // Get the active draft class for this league
  const draftClass = await db.draftClass.findFirst({
    where: { leagueId: team.leagueId },
    orderBy: { season: "desc" },
    include: {
      prospects: {
        orderBy: [{ potential: "asc" }, { position: "asc" }],
      },
      picks: {
        include: {
          team: { select: { id: true, name: true, city: true, abbreviation: true, managerId: true } },
        },
        orderBy: [{ round: "asc" }, { pickNumber: "asc" }],
      },
    },
  });

  // My available picks
  const myPicks = draftClass?.picks.filter(
    (p) => p.team.managerId === session.user.id && !p.isUsed
  ) ?? [];

  return (
    <DraftClient
      draftClass={draftClass as any}
      myPicks={myPicks as any}
      myTeamId={team.id}
      myBudget={team.budget}
    />
  );
}
