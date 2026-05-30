"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const fd = new FormData(e.currentTarget);

    const res = await fetch("/api/auth/register", { method: "POST", body: fd });
    const data = await res.json();

    if (data.error) {
      setError(data.error);
      setLoading(false);
      return;
    }

    // Auto sign-in after registration
    await signIn("credentials", {
      email: fd.get("email"),
      password: fd.get("password"),
      redirect: false,
    });

    router.push("/setup"); // onboarding — pick a league and team name
    router.refresh();
  }

  return (
    <div className="stat-card">
      <h1 className="text-xl font-bold text-white mb-2">Create your franchise</h1>
      <p className="text-sm text-slate-400 mb-6">Free to play. Join an open league and start building.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">Display Name</label>
            <input
              name="displayName"
              type="text"
              required
              minLength={2}
              maxLength={40}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-court-500 transition-colors"
              placeholder="Phil Jackson"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">Username</label>
            <input
              name="username"
              type="text"
              required
              minLength={3}
              maxLength={20}
              pattern="^[a-zA-Z0-9_]+$"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-court-500 transition-colors"
              placeholder="coach_phil"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">Email</label>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-court-500 transition-colors"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">Password</label>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-court-500 transition-colors"
            placeholder="Min. 8 characters"
          />
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-court-500 hover:bg-court-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl transition-colors"
        >
          {loading ? "Creating franchise…" : "Create Franchise"}
        </button>
      </form>

      <p className="text-center text-sm text-slate-500 mt-6">
        Already have an account?{" "}
        <Link href="/login" className="text-court-400 hover:text-court-300 transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  );
}
