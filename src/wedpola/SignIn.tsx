"use client";
import { useState, type FormEvent } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { signInMessage } from "./messages";
import { InstallButton } from "./InstallButton";

const field = "select-text min-h-11 w-full rounded-xl bg-white/[0.08] px-4 text-[1rem] text-white placeholder:text-white/30";

/** The sign-in screen. Email and password through Supabase; nothing else is asked for. */
export function SignIn({ supabase }: { supabase: SupabaseClient | null }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!supabase || busy) return;
    setBusy(true);
    setError("");
    const { error: failed } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (failed) {
      setError(signInMessage(failed));
      setPassword("");
    }
  };

  return (
    <main className="flex min-h-dvh flex-col justify-center bg-[#0a0a0a] px-4 py-10 text-white">
      <div className="mx-auto w-full max-w-sm min-w-0">
        <h1 className="text-[1.75rem] font-bold tracking-[-0.02em]">Wedding Pola</h1>
        <p className="pb-6 pt-2 text-[0.9375rem] leading-relaxed text-white/60">Sign in with the email and password your studio gave you.</p>

        {!supabase ? (
          <p role="alert" className="rounded-xl bg-red-500/15 p-4 text-sm leading-relaxed text-red-200">Sign-in isn&apos;t set up on this site yet. Ask your studio to check the site settings.</p>
        ) : (
          <form onSubmit={submit} noValidate className="space-y-4">
            <div>
              <label htmlFor="wp-email" className="block pb-1.5 text-sm text-white/70">Email</label>
              <input id="wp-email" name="email" type="email" inputMode="email" autoComplete="username" autoCapitalize="none" spellCheck={false} required value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
            </div>
            <div>
              <label htmlFor="wp-password" className="block pb-1.5 text-sm text-white/70">Password</label>
              <input id="wp-password" name="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={field} />
            </div>
            {error && <p role="alert" className="rounded-xl bg-red-500/15 p-3 text-sm leading-relaxed text-red-200">{error}</p>}
            <button type="submit" disabled={busy || !email.trim() || !password} className="min-h-11 w-full rounded-full bg-white px-5 text-[1rem] font-semibold text-[#0a0a0a] disabled:opacity-50">
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
        )}

        <div className="pt-8">
          <InstallButton className="w-full" />
        </div>
      </div>
    </main>
  );
}
