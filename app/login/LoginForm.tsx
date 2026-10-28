"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Dict } from "@/lib/i18n";

export function LoginForm({ next, initialMode, t }: { next: string; initialMode: "login" | "signup"; t: Dict }) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup" | "reset">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const callback = () => `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const supabase = createClient();
    if (mode === "reset") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent("/login/nueva-clave")}`,
      });
      setMsg(error ? { ok: false, text: error.message } : { ok: true, text: t.reset_sent });
    } else if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: callback() } });
      if (error) setMsg({ ok: false, text: error.message });
      else if (!data.session) setMsg({ ok: true, text: t.check_email });
      else { router.push(next); router.refresh(); }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg({ ok: false, text: t.auth_error });
      else { router.push(next); router.refresh(); }
    }
    setBusy(false);
  }

  return (
    <div className="card p-6">
      <h1 className="font-display font-extrabold text-2xl">{mode === "reset" ? t.reset_title : mode === "login" ? t.login_title : t.signup_title}</h1>
      {mode !== "reset" && <button
        className="btn-ghost w-full mt-6"
        onClick={() => createClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo: callback() } })}
      >
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
        {t.with_google}
      </button>}
      <div className="my-5 h-px bg-line" />
      <form onSubmit={submit} className="grid gap-3">
        <input className="input" type="email" required placeholder={t.email} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        {mode !== "reset" && <input className="input" type="password" required minLength={8} placeholder={t.password} value={password} onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === "login" ? "current-password" : "new-password"} />}
        <button className="btn-lime" disabled={busy}>{busy ? "…" : mode === "reset" ? t.reset_send : mode === "login" ? t.login : t.signup}</button>
      </form>
      {msg && <p className={`mt-3 text-sm ${msg.ok ? "text-ok" : "text-danger"}`}>{msg.text}</p>}
      {mode === "login" && (
        <button className="mt-4 w-full text-sm text-sub hover:text-main" onClick={() => { setMode("reset"); setMsg(null); }}>{t.forgot_password}</button>
      )}
      <button className="mt-3 w-full text-sm text-sub hover:text-main" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMsg(null); }}>
        {mode === "login" ? `${t.no_account} ${t.signup}` : mode === "reset" ? `← ${t.login}` : `${t.have_account} ${t.login}`}
      </button>
    </div>
  );
}
