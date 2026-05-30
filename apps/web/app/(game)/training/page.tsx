"use client";
import { useState } from "react";

type Focus = "SHOOTING" | "ATHLETICISM" | "BALL_SKILLS" | "DEFENSE" | "STRENGTH" | "PLAYMAKING" | "FINISHING" | "MENTAL";

const FOCUS_CONFIG: Record<Focus, { label: string; icon: string; attrs: string[]; description: string }> = {
  SHOOTING:    { label: "Shooting",    icon: "🎯", attrs: ["3PT", "Mid-Range", "Free Throw"],           description: "Sharpen all shooting attributes" },
  ATHLETICISM: { label: "Athleticism", icon: "⚡", attrs: ["Speed", "Vertical", "Stamina"],             description: "Boost physical capabilities" },
  BALL_SKILLS: { label: "Ball Skills", icon: "🏀", attrs: ["Ball Handling", "Passing"],                 description: "Handle pressure and create for others" },
  DEFENSE:     { label: "Defense",     icon: "🛡️", attrs: ["Perimeter D", "Interior D", "Def IQ"],      description: "Lockdown on both ends" },
  STRENGTH:    { label: "Strength",    icon: "💪", attrs: ["Strength", "Interior D", "Rebounding"],     description: "Dominate physically" },
  PLAYMAKING:  { label: "Playmaking",  icon: "🧠", attrs: ["Off IQ", "Passing", "Off Movement"],        description: "Read the game faster" },
  FINISHING:   { label: "Finishing",   icon: "🔥", attrs: ["Inside Scoring", "Post Game"],              description: "Convert at the rim and in the post" },
  MENTAL:      { label: "Mental",      icon: "🎭", attrs: ["Leadership", "Clutch", "Consistency"],      description: "Perform when it matters most" },
};

export default function TrainingPage() {
  const [focus, setFocus] = useState<Focus>("SHOOTING");
  const [intensity, setIntensity] = useState(50);

  const injuryRisk = Math.max(0, Math.round((intensity - 40) * 0.3));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Weekly Training</h1>
        <p className="text-slate-400 text-sm mt-1">Set this week's focus. Results apply before next week's games.</p>
      </div>

      {/* Focus selector */}
      <div>
        <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">Training Focus</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(Object.entries(FOCUS_CONFIG) as [Focus, typeof FOCUS_CONFIG[Focus]][]).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setFocus(key)}
              className={`p-4 rounded-xl border text-left transition-all ${
                focus === key
                  ? "border-court-500 bg-court-500/10 text-white"
                  : "border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-600"
              }`}
            >
              <div className="text-2xl mb-2">{cfg.icon}</div>
              <div className="font-semibold text-sm">{cfg.label}</div>
              <div className="text-xs text-slate-500 mt-1">{cfg.attrs.join(" · ")}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Intensity slider */}
      <div className="stat-card">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm font-semibold text-white">Training Intensity</div>
            <div className="text-xs text-slate-400 mt-0.5">Higher intensity = more gains, but higher injury risk</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-court-400">{intensity}</div>
            <div className="text-xs text-slate-500">/ 100</div>
          </div>
        </div>
        <input
          type="range"
          min={10}
          max={100}
          value={intensity}
          onChange={(e) => setIntensity(Number(e.target.value))}
          className="w-full accent-court-500"
        />
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>Light</span>
          <span>Moderate</span>
          <span>Brutal</span>
        </div>
        <div className="mt-4 flex items-center gap-4 text-sm">
          <div className={`flex items-center gap-2 ${injuryRisk > 15 ? "text-red-400" : injuryRisk > 8 ? "text-amber-400" : "text-emerald-400"}`}>
            <span>⚠️</span>
            <span>Injury risk: <strong>{injuryRisk}%</strong> per player</span>
          </div>
          <div className="text-slate-400">
            Expected gain: <strong className="text-white">+{Math.round(intensity / 20)} attr pts</strong> avg
          </div>
        </div>
      </div>

      {/* Player training assignments */}
      <div className="stat-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Player Assignments</h2>
          <div className="text-xs text-slate-500">{FOCUS_CONFIG[focus].description}</div>
        </div>
        <div className="space-y-3">
          {TRAINING_PLAYERS.map((p) => (
            <div key={p.name} className="flex items-center gap-4 py-2 border-b border-slate-800/50 last:border-0">
              <div className="w-6 text-xs text-slate-500 font-mono">{p.pos}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white font-medium">{p.name}</div>
                <div className="text-xs text-slate-500">Coachability {p.coachability} · Fatigue {p.fatigue}%</div>
              </div>
              {/* Projected gains */}
              <div className="flex gap-3 text-xs">
                {FOCUS_CONFIG[focus].attrs.map((attr) => {
                  const gain = Math.round((intensity / 100) * (p.coachability / 100) * (1 - p.fatigue / 200) * 2.5 * 10) / 10;
                  return (
                    <div key={attr} className="text-center">
                      <div className="text-slate-500">{attr.split(" ")[0]}</div>
                      <div className="text-emerald-400 font-semibold">+{gain}</div>
                    </div>
                  );
                })}
              </div>
              <div className={`w-16 text-xs text-center py-1 rounded ${p.fatigue > 70 ? "bg-red-500/20 text-red-400" : "bg-slate-800 text-slate-400"}`}>
                {p.fatigue > 70 ? "Resting" : "Training"}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-400">
          Changes take effect next week. You can update until game week starts.
        </div>
        <button className="bg-court-500 hover:bg-court-400 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors">
          Save Training Plan
        </button>
      </div>
    </div>
  );
}

const TRAINING_PLAYERS = [
  { pos: "PG", name: "Jaylen Cross",   coachability: 82, fatigue: 35 },
  { pos: "SG", name: "Kai Nakamura",  coachability: 75, fatigue: 28 },
  { pos: "SF", name: "Amir Hassan",   coachability: 68, fatigue: 42 },
  { pos: "PF", name: "Darius Stone",  coachability: 78, fatigue: 55 },
  { pos: "C",  name: "Kwame Asante",  coachability: 72, fatigue: 30 },
  { pos: "PG", name: "Devon Clarke",  coachability: 88, fatigue: 20 },
  { pos: "SG", name: "Mateo Rivera",  coachability: 65, fatigue: 38 },
  { pos: "PF", name: "Jonas Weber",   coachability: 80, fatigue: 15 },
  { pos: "C",  name: "Tomás Vidal",  coachability: 60, fatigue: 75 },
];
