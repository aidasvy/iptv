"use client";
import { useState } from "react";
import { formatSalary } from "@hoopmanager/shared";

type Tab = "overview" | "gamelog" | "development" | "contract";

const POTENTIAL_META: Record<string, { short: string; color: string; desc: string }> = {
  ELITE:    { short: "A+", color: "text-yellow-400", desc: "Franchise cornerstone" },
  STAR:     { short: "A",  color: "text-sky-400",    desc: "All-Star caliber ceiling" },
  STARTER:  { short: "B",  color: "text-emerald-400", desc: "Reliable starter" },
  ROTATION: { short: "C",  color: "text-slate-300",   desc: "Solid rotation player" },
  FRINGE:   { short: "D",  color: "text-slate-500",   desc: "End-of-bench" },
};

interface AttrGroup {
  label: string;
  attrs: Array<{ key: string; label: string }>;
}

const ATTR_GROUPS: AttrGroup[] = [
  { label: "Physical", attrs: [
    { key: "speed",        label: "Speed" },
    { key: "strength",     label: "Strength" },
    { key: "verticalJump", label: "Vertical Jump" },
    { key: "stamina",      label: "Stamina" },
    { key: "wingspan",     label: "Wingspan" },
  ]},
  { label: "Offense", attrs: [
    { key: "ballHandling",  label: "Ball Handling" },
    { key: "passing",       label: "Passing" },
    { key: "threePoint",    label: "3-Point Shot" },
    { key: "midRange",      label: "Mid-Range" },
    { key: "insideScoring", label: "Inside Scoring" },
    { key: "postGame",      label: "Post Game" },
    { key: "freeThrow",     label: "Free Throw" },
    { key: "offMovement",   label: "Off-Ball Movement" },
    { key: "offensiveIQ",   label: "Offensive IQ" },
  ]},
  { label: "Defense", attrs: [
    { key: "perimeterDef",  label: "Perimeter Defense" },
    { key: "interiorDef",   label: "Interior Defense" },
    { key: "rebounding",    label: "Rebounding" },
    { key: "shotBlocking",  label: "Shot Blocking" },
    { key: "stealing",      label: "Stealing" },
    { key: "defensiveIQ",   label: "Defensive IQ" },
  ]},
  { label: "Mental", attrs: [
    { key: "leadership",    label: "Leadership" },
    { key: "clutch",        label: "Clutch" },
    { key: "coachability",  label: "Coachability" },
    { key: "consistency",   label: "Consistency" },
  ]},
];

export default function PlayerDetailClient({ player, ovr, isMyPlayer, advancedStats }: {
  player: any;
  ovr: number;
  isMyPlayer: boolean;
  advancedStats: { bpm: number | null; vorp: number | null; ws: number | null };
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const pot = POTENTIAL_META[player.potential] ?? POTENTIAL_META.ROTATION;
  const latestSeason = player.seasonStats[0];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-6">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold text-white flex-shrink-0"
          style={{ backgroundColor: "#1D428A" }}
        >
          {player.firstName[0]}{player.lastName[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold text-white">{player.firstName} {player.lastName}</h1>
            <span className="text-slate-500">·</span>
            <span className="text-slate-400">{player.position}{player.secondPos ? `/${player.secondPos}` : ""}</span>
            {player.nationality && <span>{player.nationality}</span>}
          </div>
          <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
            {player.team && <span>{player.team.city} {player.team.name}</span>}
            <span>Age {player.age}</span>
            <span className={`font-bold text-base ${pot.color}`}>{pot.short} Potential</span>
            <span className="text-slate-600">({pot.desc})</span>
          </div>

          {/* Quick stats bar */}
          <div className="flex items-center gap-6 mt-3">
            <div className="text-center">
              <div className={`text-3xl font-display font-bold ${ovr >= 80 ? "text-yellow-400" : ovr >= 70 ? "text-sky-400" : "text-emerald-400"}`}>
                {ovr}
              </div>
              <div className="text-xs text-slate-500 uppercase tracking-wider">OVR</div>
            </div>
            {latestSeason && (
              <>
                <StatPill label="PPG" value={latestSeason.ppg.toFixed(1)} />
                <StatPill label="RPG" value={latestSeason.rpg.toFixed(1)} />
                <StatPill label="APG" value={latestSeason.apg.toFixed(1)} />
                <StatPill label="TS%" value={`${latestSeason.trueShootingPct.toFixed(1)}%`} />
                <StatPill label="PER" value={latestSeason.per.toFixed(1)} highlight={latestSeason.per > 20} />
              </>
            )}
            {!latestSeason && <span className="text-sm text-slate-600">No games played yet</span>}
          </div>
        </div>

        {/* Status badges */}
        <div className="flex flex-col gap-2 flex-shrink-0">
          {player.isInjured && (
            <div className="bg-red-500/20 border border-red-500/40 text-red-400 text-xs px-3 py-1.5 rounded-lg font-medium">
              🏥 Out {player.injuryWeeks}w — {player.injuryType?.replace(/_/g, " ")}
            </div>
          )}
          <div className={`text-xs px-3 py-1.5 rounded-lg font-medium ${player.morale >= 75 ? "bg-emerald-500/20 text-emerald-400" : player.morale >= 50 ? "bg-amber-500/20 text-amber-400" : "bg-red-500/20 text-red-400"}`}>
            Morale: {player.morale}/100
          </div>
          <div className="bg-slate-800 text-slate-400 text-xs px-3 py-1.5 rounded-lg">
            Form: {player.form}/100
          </div>
          <div className="bg-slate-800 text-slate-400 text-xs px-3 py-1.5 rounded-lg">
            Fatigue: {Math.round(player.fatigue)}%
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900 p-1 rounded-xl w-fit">
        {(["overview", "gamelog", "development", "contract"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${tab === t ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"}`}
          >
            {t === "gamelog" ? "Game Log" : t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "overview" && <OverviewTab player={player} advancedStats={advancedStats} latestSeason={latestSeason} />}
      {tab === "gamelog" && <GameLogTab player={player} />}
      {tab === "development" && <DevelopmentTab player={player} />}
      {tab === "contract" && <ContractTab player={player} isMyPlayer={isMyPlayer} />}
    </div>
  );
}

// ─── Overview: attributes + advanced stats ─────────────────────────────────

function OverviewTab({ player, advancedStats, latestSeason }: { player: any; advancedStats: any; latestSeason: any }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Attribute groups */}
      <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
        {ATTR_GROUPS.map((group) => (
          <div key={group.label} className="stat-card">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">{group.label}</div>
            <div className="space-y-2.5">
              {group.attrs.map(({ key, label }) => {
                const val: number = player[key] ?? 50;
                const color = val >= 85 ? "bg-yellow-500" : val >= 75 ? "bg-sky-500" : val >= 60 ? "bg-emerald-500" : val >= 45 ? "bg-slate-500" : "bg-red-500/60";
                return (
                  <div key={key} className="flex items-center gap-3">
                    <div className="w-28 text-xs text-slate-400 flex-shrink-0">{label}</div>
                    <div className="flex-1 attr-bar">
                      <div className={`attr-bar-fill ${color} transition-all duration-700`} style={{ width: `${val}%` }} />
                    </div>
                    <span className={`text-xs font-bold w-6 text-right ${val >= 85 ? "text-yellow-400" : val >= 75 ? "text-sky-400" : val >= 60 ? "text-emerald-400" : "text-slate-400"}`}>
                      {val}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Advanced stats + season totals */}
      <div className="space-y-4">
        {/* Advanced */}
        <div className="stat-card">
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">Advanced Stats</div>
          {latestSeason ? (
            <div className="space-y-3">
              {[
                { label: "PER", value: latestSeason.per?.toFixed(1), desc: "Avg = 15.0", good: 20 },
                { label: "TS%", value: latestSeason.trueShootingPct?.toFixed(1) + "%", desc: "Avg ≈ 56%", good: 57 },
                { label: "USG%", value: latestSeason.usageRate?.toFixed(1) + "%", desc: "% of possessions", good: null },
                { label: "BPM", value: advancedStats.bpm !== null ? (advancedStats.bpm > 0 ? "+" : "") + advancedStats.bpm?.toFixed(1) : "N/A", desc: "vs avg per 100 poss", good: 2 },
                { label: "VORP", value: advancedStats.vorp !== null ? advancedStats.vorp?.toFixed(1) : "N/A", desc: "vs replacement", good: 1 },
                { label: "Win Shares", value: advancedStats.ws !== null ? advancedStats.ws?.toFixed(1) : "N/A", desc: "Wins contributed", good: 3 },
              ].map((s) => (
                <div key={s.label} className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-300">{s.label}</div>
                    <div className="text-xs text-slate-600">{s.desc}</div>
                  </div>
                  <div className={`text-lg font-bold ${
                    s.good !== null && parseFloat(s.value ?? "0") >= s.good ? "text-emerald-400" : "text-slate-300"
                  }`}>
                    {s.value ?? "—"}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-slate-600 text-sm text-center py-4">No season data yet</div>
          )}
        </div>

        {/* Season history */}
        {player.seasonStats.length > 1 && (
          <div className="stat-card">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">Season History</div>
            <div className="space-y-2">
              {player.seasonStats.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Season {s.season.seasonNumber}</span>
                  <span className="text-slate-300 font-mono">
                    {s.ppg.toFixed(1)}/{s.rpg.toFixed(1)}/{s.apg.toFixed(1)}
                  </span>
                  <span className="text-slate-400">PER {s.per.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Game Log ──────────────────────────────────────────────────────────────

function GameLogTab({ player }: { player: any }) {
  return (
    <div className="stat-card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b border-slate-800">
            {["Wk", "Matchup", "Res", "Min", "Pts", "Reb", "Ast", "Stl", "Blk", "TO", "FG%", "3P%", "FT%", "+/-"].map((h) => (
              <th key={h} className="pb-3 text-xs text-slate-500 font-medium pr-3 whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/40">
          {player.gameStats.length === 0 && (
            <tr><td colSpan={14} className="py-10 text-center text-slate-500">No games played yet</td></tr>
          )}
          {player.gameStats.map((gs: any) => {
            const game = gs.game;
            const isHome = game.homeTeamId === player.teamId;
            const opponent = isHome ? game.awayTeam.abbreviation : game.homeTeam.abbreviation;
            const teamScore = isHome ? game.homeScore : game.awayScore;
            const oppScore = isHome ? game.awayScore : game.homeScore;
            const won = teamScore > oppScore;
            const fgPct = gs.fga > 0 ? ((gs.fgm / gs.fga) * 100).toFixed(0) : "—";
            const threePct = gs.threePA > 0 ? ((gs.threePM / gs.threePA) * 100).toFixed(0) : "—";
            const ftPct = gs.fta > 0 ? ((gs.ftm / gs.fta) * 100).toFixed(0) : "—";

            return (
              <tr key={gs.id} className="hover:bg-slate-800/20 transition-colors">
                <td className="py-3 pr-3 text-slate-500 text-xs">{game.week}</td>
                <td className="py-3 pr-3 text-slate-300 text-xs whitespace-nowrap">
                  {isHome ? "vs" : "@"} {opponent}
                </td>
                <td className="py-3 pr-3">
                  <span className={`text-xs font-bold ${won ? "text-emerald-400" : "text-red-400"}`}>
                    {won ? "W" : "L"} {teamScore}-{oppScore}
                  </span>
                </td>
                <td className="py-3 pr-3 text-slate-300 font-mono text-xs">{gs.minutes.toFixed(0)}</td>
                <td className={`py-3 pr-3 font-bold text-xs ${gs.points >= 30 ? "text-yellow-400" : gs.points >= 20 ? "text-white" : "text-slate-300"}`}>{gs.points}</td>
                <td className="py-3 pr-3 text-slate-300 text-xs">{gs.rebounds}</td>
                <td className="py-3 pr-3 text-slate-300 text-xs">{gs.assists}</td>
                <td className="py-3 pr-3 text-slate-300 text-xs">{gs.steals}</td>
                <td className="py-3 pr-3 text-slate-300 text-xs">{gs.blocks}</td>
                <td className="py-3 pr-3 text-slate-300 text-xs">{gs.turnovers}</td>
                <td className="py-3 pr-3 text-slate-400 font-mono text-xs">{fgPct}{fgPct !== "—" ? "%" : ""}</td>
                <td className="py-3 pr-3 text-slate-400 font-mono text-xs">{threePct}{threePct !== "—" ? "%" : ""}</td>
                <td className="py-3 pr-3 text-slate-400 font-mono text-xs">{ftPct}{ftPct !== "—" ? "%" : ""}</td>
                <td className={`py-3 pr-3 font-mono text-xs ${gs.plusMinus > 0 ? "text-emerald-400" : gs.plusMinus < 0 ? "text-red-400" : "text-slate-400"}`}>
                  {gs.plusMinus > 0 ? "+" : ""}{gs.plusMinus}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Development: training history + attribute changes ─────────────────────

function DevelopmentTab({ player }: { player: any }) {
  const FOCUS_ICONS: Record<string, string> = {
    SHOOTING: "🎯", ATHLETICISM: "⚡", BALL_SKILLS: "🏀", DEFENSE: "🛡️",
    STRENGTH: "💪", PLAYMAKING: "🧠", FINISHING: "🔥", MENTAL: "🎭",
  };

  return (
    <div className="space-y-4">
      <div className="stat-card">
        <div className="text-xs text-slate-500 uppercase tracking-wider mb-4">Training Sessions</div>
        {player.trainingSessions.length === 0 ? (
          <div className="text-slate-600 text-sm text-center py-8">No training recorded yet</div>
        ) : (
          <div className="space-y-3">
            {player.trainingSessions.map((ts: any) => {
              const gains = Object.entries(ts.gain as Record<string, number>)
                .filter(([, v]) => Math.abs(v) > 0.01)
                .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a));

              return (
                <div key={ts.id} className={`p-3 rounded-xl border ${ts.resultedInInjury ? "border-red-500/30 bg-red-500/5" : "border-slate-800 bg-slate-900/50"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span>{FOCUS_ICONS[ts.schedule.focus] ?? "🏋️"}</span>
                      <span className="text-sm font-medium text-white capitalize">
                        {ts.schedule.focus.replace(/_/g, " ").toLowerCase()}
                      </span>
                      <span className="text-xs text-slate-500">Week {ts.schedule.week}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">Intensity {ts.schedule.intensity}</span>
                      {ts.resultedInInjury && <span className="text-xs text-red-400">🏥 Injured</span>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {gains.map(([attr, gain]) => (
                      <span key={attr} className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                        {attr.replace(/([A-Z])/g, " $1").trim()} <span className={gain > 0 ? "text-emerald-400" : "text-red-400"}>{gain > 0 ? "+" : ""}{gain.toFixed(2)}</span>
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Age curve visualisation */}
      <div className="stat-card">
        <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">Development Trajectory</div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex-1">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Age {player.age}</span>
              <span>Peak ~27</span>
              <span>Decline 31+</span>
            </div>
            <div className="h-2 rounded-full bg-slate-800 overflow-hidden relative">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-500 via-emerald-500 to-amber-500"
                style={{ width: "100%" }}
              />
              <div
                className="absolute top-0 w-0.5 h-full bg-white"
                style={{ left: `${Math.min(98, Math.max(0, ((player.age - 18) / (38 - 18)) * 100))}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-600 mt-1">
              <span>18</span>
              <span>23</span>
              <span>27</span>
              <span>31</span>
              <span>38</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500">Training multiplier</div>
            <div className={`text-lg font-bold ${player.age < 28 ? "text-emerald-400" : player.age < 32 ? "text-amber-400" : "text-red-400"}`}>
              {player.age < 22 ? "1.2x" : player.age < 25 ? "1.1x" : player.age < 28 ? "1.0x" : player.age < 31 ? "0.9x" : player.age < 34 ? "0.7x" : "0.4x"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Contract ──────────────────────────────────────────────────────────────

function ContractTab({ player, isMyPlayer }: { player: any; isMyPlayer: boolean }) {
  const TYPE_LABELS: Record<string, string> = {
    ROOKIE: "Rookie Scale", VETERAN: "Veteran Contract",
    MAX: "Max Contract", SUPERMAX: "Supermax", MINIMUM: "Veteran Minimum", TWO_WAY: "Two-Way",
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="stat-card space-y-4">
        <div className="text-xs text-slate-500 uppercase tracking-wider">Contract Details</div>
        {[
          { label: "Annual Salary", value: formatSalary(player.salary), highlight: true },
          { label: "Years Remaining", value: `${player.contractYears} year${player.contractYears !== 1 ? "s" : ""}` },
          { label: "Contract Type", value: TYPE_LABELS[player.contractType] ?? player.contractType },
          { label: "Total Value", value: formatSalary(player.salary * player.contractYears) },
          { label: "No-Trade Clause", value: player.noTradeClause ? "Yes" : "No" },
        ].map((row) => (
          <div key={row.label} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
            <span className="text-sm text-slate-400">{row.label}</span>
            <span className={`text-sm font-semibold ${row.highlight ? "text-court-400" : "text-white"}`}>
              {row.value}
            </span>
          </div>
        ))}
      </div>

      <div className="stat-card space-y-4">
        <div className="text-xs text-slate-500 uppercase tracking-wider">Value Assessment</div>
        <div className="space-y-3">
          {[
            {
              label: "Value vs Salary",
              good: player.salary < 10000,
              text: player.salary < 5000 ? "Excellent value" : player.salary < 12000 ? "Fair deal" : player.salary < 22000 ? "Solid contract" : "Premium contract",
            },
            {
              label: "Years on contract",
              good: player.contractYears <= 2,
              text: player.contractYears <= 1 ? "Expiring — flexibility ahead" : player.contractYears <= 3 ? "Mid-term commitment" : "Long-term deal",
            },
            {
              label: "Trade value",
              good: !player.noTradeClause,
              text: player.noTradeClause ? "NTC — cannot be traded" : "Tradeable — moveable asset",
            },
          ].map((v) => (
            <div key={v.label} className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${v.good ? "bg-emerald-400" : "bg-amber-400"}`} />
              <div className="flex-1">
                <div className="text-xs text-slate-500">{v.label}</div>
                <div className="text-sm text-white">{v.text}</div>
              </div>
            </div>
          ))}
        </div>

        {isMyPlayer && player.contractYears <= 1 && (
          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-sm text-amber-400">
            ⚠️ Expiring contract — consider an extension before free agency.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function StatPill({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="text-center">
      <div className={`text-lg font-bold ${highlight ? "text-emerald-400" : "text-white"}`}>{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}
