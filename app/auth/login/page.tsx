"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Cpu, Mail, Lock, ArrowRight, AlertTriangle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center p-4 text-slate-100">
      <div className="w-full max-w-md glass rounded-2xl p-8 flex flex-col gap-6 glass-glow-indigo">
        {/* Brand */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="p-3 rounded-xl bg-primary/20 text-primary border border-primary/30 shadow-[0_0_20px_rgba(99,102,241,0.3)] mb-2">
            <Cpu className="w-8 h-8 animate-pulse" />
          </div>
          <h1 className="font-extrabold text-2xl tracking-wider text-white">
            Welcome to Signal AI
          </h1>
          <p className="text-xs text-slate-400">
            Explainable AI decision support system for financial and sports analysis.
          </p>
        </div>

        {/* Error notification */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400">Email Address</label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@signalai.local"
                className="w-full text-sm bg-slate-950 border border-border focus:border-primary/50 outline-none pl-10 pr-3.5 py-2.5 rounded-lg text-slate-200"
              />
              <Mail className="w-4.5 h-4.5 text-slate-500 absolute left-3 top-3" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400">Password</label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full text-sm bg-slate-950 border border-border focus:border-primary/50 outline-none pl-10 pr-3.5 py-2.5 rounded-lg text-slate-200"
              />
              <Lock className="w-4.5 h-4.5 text-slate-500 absolute left-3 top-3" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 w-full mt-2 py-2.5 bg-primary text-white font-semibold text-sm rounded-lg hover:bg-primary/95 transition-all duration-200 hover:shadow-[0_0_15px_rgba(99,102,241,0.25)]"
          >
            {loading ? "Authenticating..." : "Access Dashboard"}
            {!loading && <ArrowRight className="w-4.5 h-4.5" />}
          </button>
        </form>

        {/* Redirect */}
        <div className="text-center text-xs text-slate-400 border-t border-border/40 pt-4">
          Don&apos;t have an account?{" "}
          <Link href="/auth/register" className="text-primary hover:underline font-semibold">
            Create Register Token
          </Link>
        </div>
      </div>
    </div>
  );
}
