"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Dict } from "@/lib/i18n";

export function NewPasswordForm({ t }: { t: Dict }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await createClient().auth.updateUser({ password });
    setBusy(false);
    if (error) return setMsg(error.message.includes("session") ? t.new_password_expired : error.message);
    router.push("/perfil");
    router.refresh();
  }

  return (
    <div className="card p-6">
      <h1 className="font-display font-extrabold text-2xl">{t.new_password_title}</h1>
      <form onSubmit={submit} className="mt-6 grid gap-3">
        <input className="input" type="password" required minLength={8} placeholder={t.password} value={password}
          onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        <button className="btn-lime" disabled={busy}>{busy ? "…" : t.new_password_save}</button>
      </form>
      {msg && <p className="mt-3 text-sm text-danger">{msg}</p>}
    </div>
  );
}
