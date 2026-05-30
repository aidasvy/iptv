"use client";
import { useState } from "react";

type View = "team" | "players" | "opponent";

export default function AnalyticsPage() {
  const [view, setView] = useState<View>("players");

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-slate-400 text-sm mt-1">Advanced stats for every player and your team as a whole.</p>
        </div>
        <div className="flex gap-1 bg-slate-900 p-1 rounded-xl">
          {(["team", "players", "opponent"] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                view === v ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              {v === "opponent" ? "Scouting" : v === "team" ? "Team" : "Players"}
            </button>
          ))}
        </div>
      </div>

      {view === "players" && <PlayerAnalytics />}
      {view === "team" && <TeamAnalytics />}
      {view === "opponent" && <OpponentScouting />}
    </div>
  );
}

function PlayerAnalytics() {
  return (
    <div className="space-y-4">
      {/* Explanation row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {STAT_GLOSSARY.map((s) => (
          <div key={s.name} className="stat-card border-dashed">
            <div className="text-xs font-bold text-court-400 mb-1">{s.name}</div>
            <div className="text-xs text-slate-400 leading-relaxed">{s.desc}</div>
          </div>
        ))}
      </div>

      {/* Advanced stats table */}
      <div className="stat-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-slate-800">
              {ADV_HEADERS.map((h) => (
                <th key={h.key} className="pb-3 text-xs text-slate-500 font-medium pr-4 whitespace-nowrap">
                  <span title={h.desc}>{h.key}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {PLAYER_ADV_STATS.map((p) => (
              <tr key={p.name} className="hover:bg-slate-800/20 transition-colors">
                <td className="py-3 pr-4 text-slate-500 font-mono text-xs">{p.pos}</td>
                <td className="py-3 pr-4 text-white font-medium">{p.name}</td>
                <td className="py-3 pr-4 text-slate-300">{p.mpg}</td>
                <td className="py-3 pr-4">
                  <AdvStat value={p.per} good={20} great={25} format="x.x" />
                </td>
                <td className="py-3 pr-4">
                  <AdvStat value={p.ts} good={57} great={63} format="x.x%" />
                </td>
                <td className="py-3 pr-4">
                  <AdvStat value={p.usg} good={20} great={28} format="x.x%" neutral />
                </td>
                <td className="py-3 pr-4">
                  <AdvStat value={p.bpm} good={2} great={5} format="+x.x" signed />
                </td>
                <td className="py-3 pr-4">
                  <AdvStat value={p.vorp} good={1} great={3} format="+x.x" signed />
                </td>
                <td className="py-3 pr-4">
                  <AdvStat value={p.ws} good={3} great={7} format="x.x" />
                </td>
                <td className="py-3 pr-4">
                  <AdvStat value={p.offRtg} good={112} great={118} format="xxx.x" />
                </td>
                <td className="py-3 pr-4">
                  <AdvStat value={p.defRtg} good={108} great={104} lower format="xxx.x" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdvStat({ value, good, great, format, signed, neutral, lower }: {
  value: number; good: number; great: number; format: string;
  signed?: boolean; neutral?: boolean; lower?: boolean;
}) {
  const isGood = lower ? value <= good : value >= good;
  const isGreat = lower ? value <= great : value >= great;
  const color = neutral ? "text-slate-300" : isGreat ? "text-yellow-400" : isGood ? "text-emerald-400" : "text-slate-400";
  const prefix = signed && value > 0 ? "+" : "";
  const display = format.includes("xxx") ? value.toFixed(1) : format.includes("%") ? value.toFixed(1) + "%" : value.toFixed(1);
  return <span className={`font-mono text-xs ${color}`}>{prefix}{display}</span>;
}

function TeamAnalytics() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {TEAM_STATS.map((section) => (
        <div key={section.title} className="stat-card">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">{section.title}</h3>
          <div className="space-y-3">
            {section.stats.map((s) => (
              <div key={s.label} className="flex items-center justify-between">
                <span className="text-sm text-slate-400">{s.label}</span>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-1.5 rounded-full bg-slate-800">
                    <div
                      className={`h-full rounded-full ${s.color}`}
                      style={{ width: `${Math.min(100, (s.value / s.max) * 100)}%` }}
                    />
                  </div>
                  <span className={`text-sm font-semibold w-12 text-right ${s.rankColor}`}>
                    {s.display}
                  </span>
                  <span className="text-xs text-slate-600 w-8">#{s.rank}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function OpponentScouting() {
  return (
    <div className="stat-card">
      <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Next Opponent: LA Lakers</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">Their Strengths</div>
          <ul className="space-y-2 text-sm text-slate-300">
            <li className="flex gap-2"><span className="text-red-400">▲</span>Best offensive rebound rate (32.4%)</li>
            <li className="flex gap-2"><span className="text-red-400">▲</span>Elite rim protection (5.8 BPG as team)</li>
            <li className="flex gap-2"><span className="text-red-400">▲</span>Top-5 transition offense</li>
          </ul>
        </div>
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">Their Weaknesses</div>
          <ul className="space-y-2 text-sm text-slate-300">
            <li className="flex gap-2"><span className="text-emerald-400">▼</span>Below avg 3PT defense (38.2% allowed)</li>
            <li className="flex gap-2"><span className="text-emerald-400">▼</span>Poor FT shooting (68.4% team)</li>
            <li className="flex gap-2"><span className="text-emerald-400">▼</span>Slow rotation speed (zone-heavy)</li>
          </ul>
        </div>
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">Recommended Tactics</div>
          <ul className="space-y-2 text-sm text-slate-300">
            <li className="flex gap-2"><span className="text-court-400">→</span>Use Pace & Space — spread their zone</li>
            <li className="flex gap-2"><span className="text-court-400">→</span>Attack FT line late game</li>
            <li className="flex gap-2"><span className="text-court-400">→</span>Limit fast breaks with zone defense</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const ADV_HEADERS = [
  { key: "Pos",    desc: "Position" },
  { key: "Player", desc: "Player name" },
  { key: "MPG",    desc: "Minutes per game" },
  { key: "PER",    desc: "Player Efficiency Rating — league avg 15" },
  { key: "TS%",    desc: "True Shooting % — accounts for 3PT and FT value" },
  { key: "USG%",   desc: "Usage Rate — % of team possessions used" },
  { key: "BPM",    desc: "Box Plus/Minus — points above average per 100 poss" },
  { key: "VORP",   desc: "Value Over Replacement Player" },
  { key: "WS",     desc: "Win Shares — estimated wins contributed" },
  { key: "OffRtg", desc: "Offensive rating when on court" },
  { key: "DefRtg", desc: "Defensive rating when on court (lower is better)" },
];

const PLAYER_ADV_STATS = [
  { pos: "PG", name: "Jaylen Cross",   mpg: 34.2, per: 23.4, ts: 61.2, usg: 28.4, bpm: 4.8,  vorp: 2.4, ws: 7.2,  offRtg: 118.2, defRtg: 108.4 },
  { pos: "SG", name: "Kai Nakamura",  mpg: 31.8, per: 18.6, ts: 58.4, usg: 22.1, bpm: 2.2,  vorp: 1.2, ws: 5.1,  offRtg: 114.6, defRtg: 109.2 },
  { pos: "SF", name: "Amir Hassan",   mpg: 33.4, per: 19.8, ts: 57.8, usg: 21.6, bpm: 3.1,  vorp: 1.6, ws: 5.8,  offRtg: 116.1, defRtg: 107.8 },
  { pos: "PF", name: "Darius Stone",  mpg: 29.2, per: 15.4, ts: 54.6, usg: 16.2, bpm: 0.8,  vorp: 0.4, ws: 3.4,  offRtg: 113.2, defRtg: 108.6 },
  { pos: "C",  name: "Kwame Asante",  mpg: 28.8, per: 20.2, ts: 64.2, usg: 18.4, bpm: 3.4,  vorp: 1.8, ws: 6.1,  offRtg: 117.4, defRtg: 106.2 },
  { pos: "PG", name: "Devon Clarke",  mpg: 22.4, per: 14.8, ts: 55.2, usg: 17.8, bpm: 0.4,  vorp: 0.2, ws: 2.8,  offRtg: 112.8, defRtg: 111.4 },
  { pos: "SG", name: "Mateo Rivera",  mpg: 20.6, per: 13.2, ts: 52.4, usg: 15.4, bpm: -0.6, vorp: -0.1, ws: 1.4, offRtg: 110.4, defRtg: 112.2 },
];

const STAT_GLOSSARY = [
  { name: "PER",  desc: "Player Efficiency Rating. League average = 15. Star players typically 20+." },
  { name: "TS%",  desc: "True Shooting %. Weights 3PT and FT. Elite shooters hit 60%+." },
  { name: "VORP", desc: "Value Over Replacement. Positive = better than a replacement-level player." },
  { name: "BPM",  desc: "Box Plus/Minus. Points better than average per 100 possessions." },
];

const TEAM_STATS = [
  {
    title: "Offensive",
    stats: [
      { label: "Offensive Rating",  value: 114.2, max: 125, display: "114.2", rank: 7,  color: "bg-emerald-500", rankColor: "text-emerald-400" },
      { label: "Pace",              value: 102.4, max: 115, display: "102.4", rank: 9,  color: "bg-sky-500",     rankColor: "text-slate-300" },
      { label: "3PT Rate",          value: 38.2,  max: 50,  display: "38.2%", rank: 11, color: "bg-sky-500",     rankColor: "text-slate-300" },
      { label: "Assist Rate",       value: 62.4,  max: 80,  display: "62.4%", rank: 5,  color: "bg-emerald-500", rankColor: "text-emerald-400" },
      { label: "True Shooting %",   value: 58.6,  max: 68,  display: "58.6%", rank: 8,  color: "bg-emerald-500", rankColor: "text-slate-300" },
    ],
  },
  {
    title: "Defensive",
    stats: [
      { label: "Defensive Rating",  value: 108.6, max: 120, display: "108.6", rank: 4, color: "bg-sky-500",     rankColor: "text-sky-400" },
      { label: "Opp 3PT%",          value: 33.2,  max: 45,  display: "33.2%", rank: 3, color: "bg-emerald-500", rankColor: "text-emerald-400" },
      { label: "Steal Rate",        value: 8.4,   max: 15,  display: "8.4%",  rank: 6, color: "bg-sky-500",     rankColor: "text-slate-300" },
      { label: "Block Rate",        value: 6.2,   max: 12,  display: "6.2%",  rank: 8, color: "bg-slate-600",   rankColor: "text-slate-300" },
      { label: "Def Reb Rate",      value: 74.8,  max: 85,  display: "74.8%", rank: 7, color: "bg-sky-500",     rankColor: "text-slate-300" },
    ],
  },
];
