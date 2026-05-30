"use client";
import { useState } from "react";

type Tab = "market" | "trades" | "myoffers";

export default function TransfersPage() {
  const [tab, setTab] = useState<Tab>("market");

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Transfers & Trades</h1>
          <p className="text-slate-400 text-sm mt-1">Free agency market and peer-to-peer trade negotiation</p>
        </div>
        <div className="stat-card flex items-center gap-4 py-2 px-4">
          <div className="text-xs text-slate-500">Cap Space</div>
          <div className="text-sm font-bold text-emerald-400">$17.6M</div>
          <div className="w-px h-4 bg-slate-700" />
          <div className="text-xs text-slate-500">MLE</div>
          <div className="text-sm font-bold text-court-400">$12.4M</div>
        </div>
      </div>

      {/* Pending trades notification */}
      <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3">
        <span className="text-amber-400 text-lg">🔔</span>
        <div className="text-sm">
          <span className="text-amber-400 font-semibold">Trade offer received</span>
          <span className="text-slate-400"> from Denver Nuggets — </span>
          <button className="text-white underline hover:no-underline" onClick={() => setTab("myoffers")}>
            View offer
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900 p-1 rounded-xl w-fit">
        {([
          { key: "market", label: "Free Agents" },
          { key: "trades", label: "Propose Trade" },
          { key: "myoffers", label: "My Offers (2)" },
        ] as { key: Tab; label: string }[]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.key ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "market" && <FreeAgentMarket />}
      {tab === "trades" && <TradeMachine />}
      {tab === "myoffers" && <TradeOffers />}
    </div>
  );
}

function FreeAgentMarket() {
  return (
    <div className="stat-card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b border-slate-800">
            {["Pos", "Player", "Age", "OVR", "3PT", "DEF", "Asking ($M/yr)", "Yrs", "Interest", ""].map((h) => (
              <th key={h} className="pb-3 text-xs text-slate-500 font-medium pr-4 whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/40">
          {FREE_AGENTS.map((p) => (
            <tr key={p.name} className="hover:bg-slate-800/20 transition-colors">
              <td className="py-3 pr-4 text-slate-500 font-mono text-xs">{p.pos}</td>
              <td className="py-3 pr-4">
                <div className="text-white font-medium">{p.name}</div>
                <div className="text-xs text-slate-500">{p.nat} · {p.contractType}</div>
              </td>
              <td className="py-3 pr-4 text-slate-400">{p.age}</td>
              <td className="py-3 pr-4 font-bold text-emerald-400">{p.ovr}</td>
              <td className="py-3 pr-4 text-slate-300">{p.threePoint}</td>
              <td className="py-3 pr-4 text-slate-300">{p.defense}</td>
              <td className="py-3 pr-4">
                <span className={`font-semibold ${p.asking > 20 ? "text-red-400" : p.asking > 10 ? "text-amber-400" : "text-emerald-400"}`}>
                  ${p.asking}M
                </span>
              </td>
              <td className="py-3 pr-4 text-slate-400">{p.wantsYears}y</td>
              <td className="py-3 pr-4">
                <InterestBar interest={p.interest} />
              </td>
              <td className="py-3">
                <button className="text-xs bg-court-500/20 hover:bg-court-500/40 text-court-400 border border-court-500/30 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap">
                  Make Offer
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InterestBar({ interest }: { interest: number }) {
  const color = interest >= 70 ? "bg-emerald-500" : interest >= 40 ? "bg-amber-500" : "bg-red-500";
  const label = interest >= 70 ? "High" : interest >= 40 ? "Medium" : "Low";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full bg-slate-800">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${interest}%` }} />
      </div>
      <span className="text-xs text-slate-400">{label}</span>
    </div>
  );
}

function TradeMachine() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="stat-card">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Your Team — Offering</h3>
        <div className="space-y-2 mb-4">
          {TRADE_OFFERS_MY.map((p) => (
            <div key={p.name} className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              <span className="text-xs text-slate-500 font-mono">{p.pos}</span>
              <span className="flex-1 text-sm text-white">{p.name}</span>
              <span className="text-xs text-slate-400 font-mono">${p.salary}M</span>
              <button className="text-slate-600 hover:text-red-400 text-xs">✕</button>
            </div>
          ))}
          <button className="w-full border border-dashed border-slate-700 rounded-lg py-2 text-xs text-slate-500 hover:text-slate-400 hover:border-slate-600 transition-colors">
            + Add player or pick
          </button>
        </div>
        <div className="text-xs text-slate-500">Outgoing salary: <span className="text-white font-semibold">$18.2M</span></div>
      </div>

      <div className="stat-card">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Select Team — Requesting</h3>
        <select className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white mb-4">
          <option>Denver Nuggets</option>
          <option>Golden State Warriors</option>
          <option>Phoenix Suns</option>
        </select>
        <div className="space-y-2 mb-4">
          {TRADE_REQUESTS.map((p) => (
            <div key={p.name} className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
              <span className="text-xs text-slate-500 font-mono">{p.pos}</span>
              <span className="flex-1 text-sm text-white">{p.name}</span>
              <span className="text-xs text-slate-400 font-mono">${p.salary}M</span>
              <button className="text-slate-600 hover:text-red-400 text-xs">✕</button>
            </div>
          ))}
          <button className="w-full border border-dashed border-slate-700 rounded-lg py-2 text-xs text-slate-500 hover:text-slate-400 hover:border-slate-600 transition-colors">
            + Add player or pick
          </button>
        </div>
        <div className="text-xs text-slate-500">Incoming salary: <span className="text-white font-semibold">$19.1M</span></div>
      </div>

      {/* Validation */}
      <div className="md:col-span-2 stat-card bg-emerald-500/5 border-emerald-500/20">
        <div className="flex items-start gap-3">
          <span className="text-emerald-400 text-xl mt-0.5">✓</span>
          <div>
            <div className="text-sm font-semibold text-emerald-400 mb-1">Trade is cap-legal</div>
            <div className="text-xs text-slate-400">
              Outgoing $18.2M vs incoming $19.1M — within 125% matching rules. Your new salary: $119.3M (under luxury tax).
            </div>
          </div>
          <button className="ml-auto bg-court-500 hover:bg-court-400 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors flex-shrink-0">
            Send Proposal
          </button>
        </div>
      </div>
    </div>
  );
}

function TradeOffers() {
  return (
    <div className="space-y-4">
      <div className="stat-card border-amber-500/20 bg-amber-500/5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-sm font-semibold text-white">From: Denver Nuggets</div>
            <div className="text-xs text-slate-400 mt-0.5">Received 2h ago · Expires in 46h</div>
          </div>
          <div className="flex gap-2">
            <button className="text-xs bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-lg">Accept</button>
            <button className="text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 px-3 py-1.5 rounded-lg">Counter</button>
            <button className="text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-lg">Decline</button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">They send you</div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm py-1.5 px-3 bg-emerald-500/10 rounded border border-emerald-500/20">
                <span className="text-white">Nikola Petrić</span>
                <span className="text-emerald-400">$24.6M · SG · OVR 81</span>
              </div>
              <div className="flex justify-between text-sm py-1.5 px-3 bg-emerald-500/10 rounded border border-emerald-500/20">
                <span className="text-white">2026 1st Round Pick</span>
                <span className="text-slate-400">Top-8 protected</span>
              </div>
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">They want from you</div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm py-1.5 px-3 bg-red-500/10 rounded border border-red-500/20">
                <span className="text-white">Amir Hassan</span>
                <span className="text-red-400">$22.0M · SF · OVR 79</span>
              </div>
              <div className="flex justify-between text-sm py-1.5 px-3 bg-red-500/10 rounded border border-red-500/20">
                <span className="text-white">Jonas Weber</span>
                <span className="text-red-400">$3.2M · PF · OVR 65</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const FREE_AGENTS = [
  { pos: "SF", name: "Marcus Bell",    nat: "🇺🇸", age: 28, ovr: 77, threePoint: 74, defense: 72, asking: 18.5, wantsYears: 3, interest: 72, contractType: "VETERAN" },
  { pos: "PG", name: "Luca Ferretti",  nat: "🇮🇹", age: 25, ovr: 73, threePoint: 80, defense: 62, asking: 12.4, wantsYears: 3, interest: 55, contractType: "MLE" },
  { pos: "C",  name: "Amadou Diallo",  nat: "🇸🇳", age: 24, ovr: 70, threePoint: 30, defense: 80, asking: 9.8,  wantsYears: 2, interest: 80, contractType: "VETERAN" },
  { pos: "SG", name: "Jake Morrison",  nat: "🇦🇺", age: 32, ovr: 68, threePoint: 82, defense: 60, asking: 7.2,  wantsYears: 2, interest: 65, contractType: "VETERAN" },
  { pos: "PF", name: "Dmitri Volkov",  nat: "🇷🇺", age: 29, ovr: 72, threePoint: 60, defense: 76, asking: 11.0, wantsYears: 3, interest: 40, contractType: "VETERAN" },
  { pos: "PG", name: "Tyrese Parks",   nat: "🇺🇸", age: 22, ovr: 64, threePoint: 68, defense: 58, asking: 3.8,  wantsYears: 2, interest: 85, contractType: "ROOKIE" },
];

const TRADE_OFFERS_MY = [{ pos: "SG", name: "Kai Nakamura", salary: 18.2 }];
const TRADE_REQUESTS  = [{ pos: "SF", name: "Michael Porter III", salary: 19.1 }];
