"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const TEAM_COLORS = [
  { primary: "#C8102E", secondary: "#00538C", name: "Chicago Red" },
  { primary: "#1D428A", secondary: "#FFC72C", name: "Royal Gold" },
  { primary: "#006BB6", secondary: "#F58426", name: "New York Blue" },
  { primary: "#007A33", secondary: "#BA9653", name: "Boston Green" },
  { primary: "#552583", secondary: "#FDB927", name: "Purple Gold" },
  { primary: "#CE1141", secondary: "#000000", name: "Miami Red" },
  { primary: "#00471B", secondary: "#EEE1C6", name: "Milwaukee Green" },
  { primary: "#E03A3E", secondary: "#1D1160", name: "Phoenix Crimson" },
];

const ARENAS = [
  "United Center", "Madison Square Garden", "Staples Center",
  "TD Garden", "Chase Center", "Kaseya Center",
];

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    city: "",
    teamName: "",
    abbreviation: "",
    primaryColor: TEAM_COLORS[0].primary,
    secondaryColor: TEAM_COLORS[0].secondary,
    arena: ARENAS[0],
    leagueId: "", // filled from open leagues API
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/team/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();

    setLoading(false);

    if (data.error) {
      setError(data.error);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl">
        <div className="text-center mb-8">
          <span className="font-display text-3xl tracking-widest text-court-400">HOOP</span>
          <span className="font-display text-3xl tracking-widest text-slate-400">MANAGER</span>
          <h1 className="text-xl font-bold text-white mt-4">Build Your Franchise</h1>
          <p className="text-slate-400 text-sm mt-1">Step {step} of 2</p>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-slate-800 rounded-full mb-8">
          <div
            className="h-full bg-court-500 rounded-full transition-all duration-500"
            style={{ width: `${(step / 2) * 100}%` }}
          />
        </div>

        <form onSubmit={step === 1 ? (e) => { e.preventDefault(); setStep(2); } : handleSubmit}>
          {step === 1 && (
            <div className="stat-card space-y-5">
              <h2 className="font-semibold text-white text-lg">Team Identity</h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">City</label>
                  <input
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    required
                    placeholder="e.g. Chicago"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-court-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">Team Name</label>
                  <input
                    value={form.teamName}
                    onChange={(e) => setForm({ ...form, teamName: e.target.value })}
                    required
                    placeholder="e.g. Bulls"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-court-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">Abbreviation (3 letters)</label>
                <input
                  value={form.abbreviation}
                  onChange={(e) => setForm({ ...form, abbreviation: e.target.value.toUpperCase().slice(0, 3) })}
                  required
                  maxLength={3}
                  placeholder="CHI"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-court-500 transition-colors font-mono"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-2 uppercase tracking-wider">Team Colors</label>
                <div className="grid grid-cols-4 gap-2">
                  {TEAM_COLORS.map((c) => (
                    <button
                      key={c.primary}
                      type="button"
                      onClick={() => setForm({ ...form, primaryColor: c.primary, secondaryColor: c.secondary })}
                      className={`p-2 rounded-lg border transition-all ${form.primaryColor === c.primary ? "border-white scale-105" : "border-slate-700"}`}
                    >
                      <div className="flex h-6 rounded overflow-hidden">
                        <div className="flex-1" style={{ backgroundColor: c.primary }} />
                        <div className="flex-1" style={{ backgroundColor: c.secondary }} />
                      </div>
                      <div className="text-xs text-slate-500 mt-1 truncate">{c.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-court-500 hover:bg-court-400 text-white font-semibold py-2.5 rounded-xl transition-colors"
              >
                Next →
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="stat-card space-y-5">
              <h2 className="font-semibold text-white text-lg">Home Arena & League</h2>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">Arena Name</label>
                <input
                  value={form.arena}
                  onChange={(e) => setForm({ ...form, arena: e.target.value })}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-court-500 transition-colors"
                />
                <div className="flex gap-2 mt-2 flex-wrap">
                  {ARENAS.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setForm({ ...form, arena: a })}
                      className="text-xs px-2.5 py-1 rounded-lg border border-slate-700 hover:border-slate-500 text-slate-400 hover:text-white transition-colors"
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="rounded-xl border border-slate-700 p-4 bg-slate-800/50">
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">Preview</div>
                <div className="flex items-center gap-4">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-sm"
                    style={{ backgroundColor: form.primaryColor }}
                  >
                    {form.abbreviation || "???"}
                  </div>
                  <div>
                    <div className="text-white font-bold text-lg">{form.city || "Your City"} {form.teamName || "Team Name"}</div>
                    <div className="text-slate-400 text-sm">{form.arena}</div>
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 border border-slate-700 hover:border-slate-500 text-slate-300 font-semibold py-2.5 rounded-xl transition-colors"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-court-500 hover:bg-court-400 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors"
                >
                  {loading ? "Creating franchise…" : "Start Managing!"}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
