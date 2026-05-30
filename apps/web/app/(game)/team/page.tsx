"use client";
import { useState } from "react";

type Tab = "roster" | "lineup" | "depth";

export default function TeamPage() {
  const [tab, setTab] = useState<Tab>("roster");

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Squad Management</h1>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-400">Salary:</span>
          <span className="text-court-400 font-semibold">$118.4M</span>
          <span className="text-slate-600">/</span>
          <span className="text-slate-400">$136M cap</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900 p-1 rounded-xl w-fit">
        {(["roster", "lineup", "depth"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
              tab === t ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            {t === "lineup" ? "Starting Lineup" : t === "depth" ? "Depth Chart" : "Full Roster"}
          </button>
        ))}
      </div>

      {tab === "roster" && <RosterTable />}
      {tab === "lineup" && <LineupEditor />}
      {tab === "depth" && <DepthChart />}
    </div>
  );
}

function RosterTable() {
  return (
    <div className="stat-card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b border-slate-800">
            {["Pos", "Player", "Age", "OVR", "POT", "3PT", "DEF", "IQ", "Clutch", "Salary", "Yrs", "Morale"].map((h) => (
              <th key={h} className="pb-3 text-xs text-slate-500 font-medium pr-4 whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/40">
          {ROSTER.map((p) => (
            <tr key={p.name} className="hover:bg-slate-800/20 cursor-pointer transition-colors group">
              <td className="py-3 pr-4 text-slate-500 font-mono text-xs">{p.pos}</td>
              <td className="py-3 pr-4">
                <div className="text-white font-medium group-hover:text-court-400 transition-colors">{p.name}</div>
                <div className="text-xs text-slate-500">{p.nat}</div>
              </td>
              <td className="py-3 pr-4 text-slate-400">{p.age}</td>
              <td className="py-3 pr-4">
                <span className={`text-sm font-bold ${p.ovr >= 80 ? "text-yellow-400" : p.ovr >= 70 ? "text-sky-400" : "text-emerald-400"}`}>
                  {p.ovr}
                </span>
              </td>
              <td className="py-3 pr-4">
                <PotentialBadge potential={p.pot} />
              </td>
              <td className="py-3 pr-4"><AttrBar value={p.threePoint} /></td>
              <td className="py-3 pr-4"><AttrBar value={p.defense} /></td>
              <td className="py-3 pr-4"><AttrBar value={p.iq} /></td>
              <td className="py-3 pr-4"><AttrBar value={p.clutch} /></td>
              <td className="py-3 pr-4 text-slate-300 font-mono text-xs whitespace-nowrap">${p.salary}M</td>
              <td className="py-3 pr-4 text-slate-400">{p.years}y</td>
              <td className="py-3 pr-4">
                <MoraleDot morale={p.morale} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AttrBar({ value }: { value: number }) {
  const color = value >= 80 ? "bg-yellow-500" : value >= 65 ? "bg-sky-500" : value >= 50 ? "bg-emerald-500" : "bg-slate-600";
  return (
    <div className="flex items-center gap-2">
      <div className="attr-bar w-16">
        <div className={`attr-bar-fill ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs text-slate-400 w-5">{value}</span>
    </div>
  );
}

function PotentialBadge({ potential }: { potential: string }) {
  const cls: Record<string, string> = {
    ELITE: "rating-elite", STAR: "rating-star", STARTER: "rating-starter",
    ROTATION: "rating-rotation", FRINGE: "rating-fringe",
  };
  const label: Record<string, string> = {
    ELITE: "A+", STAR: "A", STARTER: "B", ROTATION: "C", FRINGE: "D",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded font-bold ${cls[potential] ?? ""}`}>
      {label[potential] ?? potential}
    </span>
  );
}

function MoraleDot({ morale }: { morale: number }) {
  const color = morale >= 75 ? "bg-emerald-400" : morale >= 50 ? "bg-amber-400" : "bg-red-400";
  const label = morale >= 75 ? "Happy" : morale >= 50 ? "Content" : "Unhappy";
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-1.5 h-1.5 rounded-full ${color}`} />
      <span className="text-xs text-slate-400">{label}</span>
    </div>
  );
}

function LineupEditor() {
  return (
    <div className="stat-card">
      <p className="text-slate-400 text-sm mb-6">Drag players to set your starting five and bench rotation.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">Starting Five</div>
          <div className="space-y-2">
            {["PG", "SG", "SF", "PF", "C"].map((pos) => {
              const player = ROSTER.find(p => p.pos === pos && p.isStarter);
              return (
                <div key={pos} className="flex items-center gap-3 bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3">
                  <span className="text-xs text-slate-500 font-mono w-6">{pos}</span>
                  {player ? (
                    <>
                      <div className="flex-1">
                        <div className="text-sm text-white font-medium">{player.name}</div>
                        <div className="text-xs text-slate-500">OVR {player.ovr}</div>
                      </div>
                      <PotentialBadge potential={player.pot} />
                    </>
                  ) : (
                    <div className="flex-1 text-sm text-slate-600">— Empty slot —</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">Bench Rotation</div>
          <div className="space-y-2">
            {ROSTER.filter(p => !p.isStarter).map((p) => (
              <div key={p.name} className="flex items-center gap-3 bg-slate-800/30 border border-slate-800 rounded-lg px-4 py-3">
                <span className="text-xs text-slate-500 font-mono w-6">{p.pos}</span>
                <div className="flex-1">
                  <div className="text-sm text-slate-300">{p.name}</div>
                  <div className="text-xs text-slate-600">OVR {p.ovr}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DepthChart() {
  const positions = ["PG", "SG", "SF", "PF", "C"];
  return (
    <div className="grid grid-cols-5 gap-3">
      {positions.map((pos) => (
        <div key={pos} className="stat-card">
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-3 text-center">{pos}</div>
          <div className="space-y-2">
            {ROSTER.filter(p => p.pos === pos || p.pos2 === pos).sort((a, b) => b.ovr - a.ovr).map((p, i) => (
              <div key={p.name} className={`p-2 rounded-lg border text-center ${i === 0 ? "border-slate-600 bg-slate-800/60" : "border-slate-800 bg-transparent"}`}>
                <div className="text-xs text-slate-300 font-medium truncate">{p.name.split(" ")[1]}</div>
                <div className={`text-lg font-bold ${p.ovr >= 80 ? "text-yellow-400" : p.ovr >= 70 ? "text-sky-400" : "text-emerald-400"}`}>{p.ovr}</div>
                <div className="text-xs text-slate-600">{i === 0 ? "Starter" : `#${i + 1} bench`}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const ROSTER = [
  { pos: "PG", pos2: null, name: "Jaylen Cross",    nat: "🇺🇸", age: 26, ovr: 82, pot: "STAR",     threePoint: 78, defense: 72, iq: 85, clutch: 80, salary: 28.4, years: 3, morale: 85, isStarter: true },
  { pos: "SG", pos2: null, name: "Kai Nakamura",   nat: "🇯🇵", age: 24, ovr: 76, pot: "STAR",     threePoint: 84, defense: 65, iq: 74, clutch: 70, salary: 18.2, years: 2, morale: 80, isStarter: true },
  { pos: "SF", pos2: null, name: "Amir Hassan",    nat: "🇩🇿", age: 28, ovr: 79, pot: "STARTER",  threePoint: 70, defense: 76, iq: 78, clutch: 74, salary: 22.0, years: 4, morale: 78, isStarter: true },
  { pos: "PF", pos2: "C",  name: "Darius Stone",   nat: "🇺🇸", age: 25, ovr: 74, pot: "STARTER",  threePoint: 62, defense: 70, iq: 68, clutch: 65, salary: 14.5, years: 3, morale: 75, isStarter: true },
  { pos: "C",  pos2: null, name: "Kwame Asante",   nat: "🇬🇭", age: 27, ovr: 78, pot: "STARTER",  threePoint: 40, defense: 82, iq: 72, clutch: 70, salary: 16.8, years: 2, morale: 82, isStarter: true },
  { pos: "PG", pos2: "SG", name: "Devon Clarke",   nat: "🇬🇧", age: 22, ovr: 68, pot: "STAR",     threePoint: 72, defense: 60, iq: 70, clutch: 62, salary: 4.2,  years: 2, morale: 88, isStarter: false },
  { pos: "SG", pos2: "SF", name: "Mateo Rivera",   nat: "🇪🇸", age: 30, ovr: 71, pot: "ROTATION", threePoint: 76, defense: 64, iq: 76, clutch: 72, salary: 7.6,  years: 1, morale: 72, isStarter: false },
  { pos: "PF", pos2: null, name: "Jonas Weber",    nat: "🇩🇪", age: 23, ovr: 65, pot: "STARTER",  threePoint: 58, defense: 68, iq: 64, clutch: 58, salary: 3.2,  years: 3, morale: 80, isStarter: false },
  { pos: "C",  pos2: "PF", name: "Tomás Vidal",   nat: "🇦🇷", age: 32, ovr: 63, pot: "ROTATION", threePoint: 35, defense: 72, iq: 74, clutch: 68, salary: 3.5,  years: 1, morale: 70, isStarter: false },
];
