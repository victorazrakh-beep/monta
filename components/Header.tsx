import Link from "next/link";
import { Logo } from "@/components/Logo";
import { LangToggle, ThemeToggle } from "@/components/Toggles";
import { getDict } from "@/lib/i18n-server";
import { getProfile } from "@/lib/auth";

export async function Header() {
  const [{ t }, profile] = await Promise.all([getDict(), getProfile()]);
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 h-16 flex items-center gap-4">
        <Link href="/"><Logo /></Link>
        <nav className="hidden md:flex items-center gap-1 ml-4 text-sm text-sub">
          <Link className="px-3 py-2 hover:text-main" href="/busqueda">{t.nav_explore}</Link>
          <Link className="px-3 py-2 hover:text-main" href="/espacios">{t.nav_venues}</Link>
          <Link className="px-3 py-2 hover:text-main" href="/tickets">{t.nav_tickets}</Link>
          {profile && <Link className="px-3 py-2 hover:text-main" href="/mis-eventos">{t.nav_my_events}</Link>}
          {profile?.role === "admin" && <Link className="px-3 py-2 hover:text-main" href="/admin">{t.nav_admin}</Link>}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <LangToggle label={t.lang_switch} />
          <ThemeToggle />
          <Link href="/crear" className="btn-lime h-9 px-4 hidden sm:inline-flex">{t.nav_create}</Link>
          {profile ? (
            <Link href="/perfil" className="h-9 w-9 rounded-full bg-surface border border-line grid place-items-center text-sm font-bold overflow-hidden">
              {profile.avatar_url
                ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                : (profile.name || profile.email || "?").slice(0, 1).toUpperCase()}
            </Link>
          ) : (
            <Link href="/login" className="btn-ghost h-9 px-4">{t.nav_login}</Link>
          )}
        </div>
      </div>
      <nav className="md:hidden flex gap-1 px-4 pb-2 text-sm text-sub overflow-x-auto">
        <Link className="chip h-8 shrink-0" href="/busqueda">{t.nav_explore}</Link>
        <Link className="chip h-8 shrink-0" href="/espacios">{t.nav_venues}</Link>
        <Link className="chip h-8 shrink-0" href="/tickets">{t.nav_tickets}</Link>
        <Link className="chip h-8 shrink-0" href="/crear">{t.nav_create}</Link>
        {profile && <Link className="chip h-8 shrink-0" href="/mis-eventos">{t.nav_my_events}</Link>}
      </nav>
    </header>
  );
}
