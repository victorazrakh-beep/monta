import Link from "next/link";
import { Logo } from "@/components/Logo";
import { getDict } from "@/lib/i18n-server";
import { CONTACT_EMAIL, INSTAGRAM_HANDLE, INSTAGRAM_URL } from "@/lib/contact";

export async function Footer() {
  const { t } = await getDict();
  const col = "flex flex-col gap-2 text-sm text-sub";
  return (
    <footer className="border-t border-line mt-20">
      <div className="mx-auto max-w-6xl px-4 py-12 grid gap-8 grid-cols-2 md:grid-cols-5">
        <div className="col-span-2">
          <Logo />
          <p className="mt-3 text-sm text-sub max-w-xs">{t.footer_tagline}</p>
          <div className="mt-4 flex flex-col gap-2 text-sm text-sub">
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-main">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg>
              @{INSTAGRAM_HANDLE}
            </a>
            <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-main">{CONTACT_EMAIL}</a>
          </div>
        </div>
        <div className={col}>
          <span className="text-main font-semibold">{t.footer_events}</span>
          <Link href="/busqueda">{t.nav_explore}</Link>
          <Link href="/espacios">{t.nav_venues}</Link>
          <Link href="/tickets">{t.nav_tickets}</Link>
          <Link href="/blog">{t.footer_blog}</Link>
        </div>
        <div className={col}>
          <span className="text-main font-semibold">{t.footer_organizers}</span>
          <Link href="/crear">{t.nav_create}</Link>
          <Link href="/mis-eventos">{t.nav_my_events}</Link>
          <Link href="/scan">{t.footer_scan}</Link>
        </div>
        <div className={col}>
          <span className="text-main font-semibold">{t.footer_legal}</span>
          <Link href="/legal/terminos">{t.footer_terms}</Link>
          <Link href="/legal/privacidad">{t.footer_privacy}</Link>
          <Link href="/legal/cookies">{t.footer_cookies}</Link>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 pb-8 text-xs text-muted">© {new Date().getFullYear()} Monta</div>
    </footer>
  );
}
