"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface Prospect {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  nationality: string;
  position: string;
  potential: string;
  scoutingLevel: number;
  attributes: Record<string, number>;
  draftedByTeamId: string | null;
  draftedAtPick: number | null;
}

interface Pick {
  id: string;
  round: number;
  pickNumber: number | null;
  isUsed: boolean;
  team: { id: string; name: string; city: string; abbreviation: string; managerId: string };
}

interface DraftClass {
  id: string;
  season: number;
  prospects: Prospect[];
  picks: Pick[];
}

interface Props {
  draftClass: DraftClass | null;
  myPicks: Pick[];
  myTeamId: string;
  myBudget: number;
}

const POTENTIAL_LABEL: Record<string, { short: string; color: string }> = {
  ELITE:    { short: "A+", color: "text-yellow-400" },
  STAR:     { short: "A",  color: "text-sky-400" },
  STARTER:  { short: "B",  color: "text-emerald-400" },
  ROTATION: { short: "C",  color: "text-slate-300" },
  FRINGE:   { short: "D",  color: "text-slate-500" },
};

const SCOUTING_LEVEL_LABEL = ["Unknown", "Physical", "Basic Skills", "Core Skills", "Full Skills", "Fully Scouted"];

const ATTR_GROUPS = [
  { label: "Physical",  attrs: ["speed", "strength", "verticalJump", "stamina", "wingspan"] },
  { label: "Offense",   attrs: ["ballHandling", "passing", "threePoint", "midRange", "insideScoring", "postGame", "freeThrow"] },
  { label: "Defense",   attrs: ["perimeterDef", "interiorDef", "rebounding", "shotBlocking", "stealing"] },
  { label: "Mental",    attrs: ["offensiveIQ", "defensiveIQ", "leadership", "clutch", "coachability"] },
];

const ATTR_LABELS: Record<string, string> = {
  speed: "Speed", strength: "Strength", verticalJump: "Vertical", stamina: "Stamina", wingspan: "Wingspan",
  ballHandling: "Ball Handling", passing: "Passing", threePoint: "3-Point", midRange: "Mid-Range",
  insideScoring: "Inside", postGame: "Post", freeThrow: "Free Throw", offMovement: "Off Movement",
  perimeterDef: "Perimeter D", interiorDef: "Interior D", rebounding: "Rebounding",
  shotBlocking: "Blocking", stealing: "Stealing",
  offensiveIQ: "Off IQ", defensiveIQ: "Def IQ", leadership: "Leadership", clutch: "Clutch", coachability: "Coachability",
};

export default function DraftClient({ draftClass, myPicks, myTeamId, myBudget }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [selectedPickId, setSelectedPickId] = useState<string | null>(myPicks[0]?.id ?? null);
  const [filter, setFilter] = useState<string>("all");
  const [scoutLoading, setScoutLoading] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (!draftClass) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="stat-card text-center py-20">
          <div className="text-5xl mb-4">🎓</div>
          <h2 className="text-white font-semibold text-xl mb-2">Draft Not Yet Open</h2>
          <p className="text-slate-400 text-sm">The draft class will be generated at the end of the regular season.</p>
        </div>
      </div>
    );
  }

  const available = draftClass.prospects.filter((p) => !p.draftedByTeamId);
  const drafted   = draftClass.prospects.filter((p) => p.draftedByTeamId);

  const filtered = filter === "all"
    ? available
    : available.filter((p) => p.position === filter);

  async function handleScout(prospectId: string) {
    setScoutLoading(true);
    setMessage(null);
    const res = await fetch("/api/draft/scout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prospectId }),
    });
    const data = await res.json();
    setScoutLoading(false);

    if (data.error) {
      setMessage({ type: "error", text: data.error });
    } else {
      setMessage({ type: "success", text: `Scouting level upgraded! Cost: $${data.cost.toLocaleString()}K` });
      startTransition(() => router.refresh());
    }
  }

  async function handleDraftPick() {
    if (!selectedProspect || !selectedPickId) return;
    setDraftLoading(true);
    setMessage(null);

    const res = await fetch("/api/draft/pick", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draftPickId: selectedPickId, prospectId: selectedProspect.id }),
    });
    const data = await res.json();
    setDraftLoading(false);

    if (data.error) {
      setMessage({ type: "error", text: data.error });
    } else {
      setMessage({ type: "success", text: `${selectedProspect.firstName} ${selectedProspect.lastName} drafted!` });
      setSelectedProspect(null);
      startTransition(() => router.refresh());
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Draft — Season {draftClass.season}</h1>
          <p className="text-slate-400 text-sm mt-1">
            {available.length} prospects available · {drafted.length} drafted · Budget: ${myBudget.toLocaleString()}K
          </p>
        </div>
        {myPicks.length > 0 && (
          <div className="stat-card py-2 px-4 flex items-center gap-3">
            <div className="text-xs text-slate-500">Your pick</div>
            <div className="text-sm font-bold text-court-400">
              #{myPicks[0]?.pickNumber} · Round {myPicks[0]?.round}
            </div>
          </div>
        )}
      </div>

      {message && (
        <div className={`px-4 py-3 rounded-xl border text-sm ${message.type === "success" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-red-500/10 border-red-500/30 text-red-400"}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Prospect list */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            {["all", "PG", "SG", "SF", "PF", "C"].map((pos) => (
              <button
                key={pos}
                onClick={() => setFilter(pos)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === pos ? "bg-slate-700 text-white" : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"}`}
              >
                {pos === "all" ? "All" : pos}
              </button>
            ))}
          </div>

          <div className="stat-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-slate-800">
                  {["Pos", "Prospect", "Age", "Nat", "POT", "Scouting", ""].map((h) => (
                    <th key={h} className="pb-3 text-xs text-slate-500 font-medium pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="py-10 text-center text-slate-500">No available prospects</td></tr>
                )}
                {filtered.map((p) => {
                  const pot = POTENTIAL_LABEL[p.potential];
                  const isSelected = selectedProspect?.id === p.id;
                  return (
                    <tr
                      key={p.id}
                      onClick={() => setSelectedProspect(isSelected ? null : p)}
                      className={`cursor-pointer transition-colors ${isSelected ? "bg-court-500/10" : "hover:bg-slate-800/20"}`}
                    >
                      <td className="py-3 pr-4 text-slate-500 font-mono text-xs">{p.position}</td>
                      <td className="py-3 pr-4">
                        <div className="text-white font-medium">{p.firstName} {p.lastName}</div>
                        {p.scoutingLevel === 0 && <div className="text-xs text-slate-600">Unscouted</div>}
                      </td>
                      <td className="py-3 pr-4 text-slate-400">{p.age}</td>
                      <td className="py-3 pr-4">{p.nationality}</td>
                      <td className="py-3 pr-4">
                        {p.scoutingLevel >= 1 ? (
                          <span className={`text-sm font-bold ${pot.color}`}>{pot.short}</span>
                        ) : (
                          <span className="text-slate-600 text-sm">?</span>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="flex gap-0.5">
                            {[1,2,3,4,5].map((l) => (
                              <div key={l} className={`w-1.5 h-3 rounded-sm ${p.scoutingLevel >= l ? "bg-court-400" : "bg-slate-700"}`} />
                            ))}
                          </div>
                          <span className="text-xs text-slate-500">{SCOUTING_LEVEL_LABEL[p.scoutingLevel]}</span>
                        </div>
                      </td>
                      <td className="py-3">
                        {isSelected && (
                          <span className="text-xs text-court-400 font-medium">Selected ✓</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right panel: selected prospect detail + actions */}
        <div className="space-y-4">
          {selectedProspect ? (
            <>
              <div className="stat-card space-y-4">
                <div>
                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Selected Prospect</div>
                  <div className="text-xl font-bold text-white">{selectedProspect.firstName} {selectedProspect.lastName}</div>
                  <div className="flex items-center gap-3 mt-1 text-sm text-slate-400">
                    <span>{selectedProspect.nationality}</span>
                    <span>·</span>
                    <span>{selectedProspect.position}</span>
                    <span>·</span>
                    <span>Age {selectedProspect.age}</span>
                  </div>
                </div>

                {/* Potential */}
                <div className="flex items-center justify-between">
                  <div className="text-xs text-slate-500">Potential</div>
                  {selectedProspect.scoutingLevel >= 1 ? (
                    <span className={`text-lg font-bold ${POTENTIAL_LABEL[selectedProspect.potential].color}`}>
                      {POTENTIAL_LABEL[selectedProspect.potential].short} ({selectedProspect.potential})
                    </span>
                  ) : (
                    <span className="text-slate-600">Scout to reveal</span>
                  )}
                </div>

                {/* Attribute reveal */}
                {selectedProspect.scoutingLevel > 0 && (
                  <div className="space-y-3">
                    {ATTR_GROUPS.map((group) => {
                      const knownAttrs = group.attrs.filter((a) => selectedProspect.attributes[a] !== undefined);
                      if (knownAttrs.length === 0) return null;
                      return (
                        <div key={group.label}>
                          <div className="text-xs text-slate-600 uppercase tracking-wider mb-1.5">{group.label}</div>
                          <div className="space-y-1.5">
                            {knownAttrs.map((attr) => {
                              const val = selectedProspect.attributes[attr];
                              const color = val >= 80 ? "bg-yellow-500" : val >= 65 ? "bg-sky-500" : val >= 50 ? "bg-emerald-500" : "bg-slate-600";
                              return (
                                <div key={attr} className="flex items-center gap-2">
                                  <div className="w-20 text-xs text-slate-400 flex-shrink-0">{ATTR_LABELS[attr]}</div>
                                  <div className="flex-1 attr-bar">
                                    <div className={`attr-bar-fill ${color}`} style={{ width: `${val}%` }} />
                                  </div>
                                  <span className="text-xs text-slate-400 w-5 text-right">{val}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                    {selectedProspect.scoutingLevel < 5 && (
                      <div className="text-xs text-slate-600 italic">
                        +{25 - Object.keys(selectedProspect.attributes).length} attributes hidden — scout more to reveal
                      </div>
                    )}
                  </div>
                )}

                {/* Scout button */}
                {selectedProspect.scoutingLevel < 5 && (
                  <button
                    onClick={() => handleScout(selectedProspect.id)}
                    disabled={scoutLoading}
                    className="w-full border border-court-500/50 hover:bg-court-500/10 text-court-400 text-sm font-medium py-2 rounded-xl transition-colors disabled:opacity-50"
                  >
                    {scoutLoading ? "Scouting…" : `Scout (Level ${selectedProspect.scoutingLevel + 1}/5 — $${scoutingCostDisplay(selectedProspect.scoutingLevel)})`}
                  </button>
                )}
              </div>

              {/* Draft action */}
              {myPicks.length > 0 ? (
                <div className="stat-card space-y-3">
                  <div className="text-sm font-semibold text-white">Use Draft Pick</div>
                  <select
                    value={selectedPickId ?? ""}
                    onChange={(e) => setSelectedPickId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                  >
                    {myPicks.map((pick) => (
                      <option key={pick.id} value={pick.id}>
                        Round {pick.round}, Pick #{pick.pickNumber}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleDraftPick}
                    disabled={draftLoading || !selectedPickId}
                    className="w-full bg-court-500 hover:bg-court-400 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors"
                  >
                    {draftLoading ? "Drafting…" : `Draft ${selectedProspect.firstName} ${selectedProspect.lastName}`}
                  </button>
                </div>
              ) : (
                <div className="stat-card text-center py-6 text-slate-500 text-sm">
                  No draft picks remaining
                </div>
              )}
            </>
          ) : (
            <div className="stat-card text-center py-12 text-slate-500">
              <div className="text-3xl mb-3">👆</div>
              <div className="text-sm">Select a prospect to view their scouting report and draft them</div>
            </div>
          )}

          {/* Draft board — picks summary */}
          <div className="stat-card">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">Recent Picks</div>
            {drafted.length === 0 ? (
              <div className="text-xs text-slate-600 text-center py-4">No picks made yet</div>
            ) : (
              <div className="space-y-2">
                {drafted.slice(-6).reverse().map((p) => (
                  <div key={p.id} className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500 w-6 text-right">#{p.draftedAtPick}</span>
                    <span className="text-slate-500 font-mono">{p.position}</span>
                    <span className="text-slate-300 flex-1">{p.firstName} {p.lastName}</span>
                    <span className={POTENTIAL_LABEL[p.potential]?.color ?? ""}>{POTENTIAL_LABEL[p.potential]?.short}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function scoutingCostDisplay(currentLevel: number): string {
  const costs = [500, 800, 1200, 2000, 3500];
  return `${(costs[currentLevel] ?? 5000).toLocaleString()}K`;
}
