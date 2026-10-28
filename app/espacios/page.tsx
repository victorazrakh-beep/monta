import Link from "next/link";
import type { Metadata } from "next";
import { VenueCard } from "@/components/venues/VenueCard";
import { VenueMap } from "@/components/venues/VenueMap";
import { RequestForm } from "@/components/venues/RequestForm";
import { getDict } from "@/lib/i18n-server";
import { fill } from "@/lib/i18n";
import { CONTACT_EMAIL } from "@/lib/contact";
import { VENUE_KINDS, kindLabel, listVenueZones, listVenues } from "@/lib/venues";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Espacios para eventos en Panamá",
  description: "Salones, rooftops, hoteles y lugares únicos para tu evento en Panamá. Compara en el mapa y pide una cotización gratis.",
};

type Search = { q?: string; tipo?: string; zona?: string; invitados?: string };

export default async function Venues({ searchParams }: { searchParams: Promise<Search> }) {
  const { q, tipo, zona, invitados } = await searchParams;
  const guests = Number(invitados) > 0 ? Math.floor(Number(invitados)) : undefined;
  const [{ lang, t }, venues, zones] = await Promise.all([
    getDict(), listVenues({ q, kind: tipo, zone: zona, guests }), listVenueZones(),
  ]);
  const pins = venues.filter((v) => v.lat != null && v.lng != null)
    .map((v) => ({ slug: v.slug, name: v.name, lat: v.lat!, lng: v.lng!, label: `${kindLabel(v.kind, lang)} · ${v.zone}` }));
  const filtered = !!(q || tipo || zona || guests);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display font-extrabold text-3xl md:text-4xl">{t.venues_title}</h1>
      <p className="mt-2 text-sub max-w-2xl">{t.venues_sub}</p>

      <form action="/espacios" className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_120px_auto]">
        <input name="q" defaultValue={q} placeholder={t.venues_search_ph} className="input" aria-label={t.venues_search_ph} />
        <select name="tipo" defaultValue={tipo ?? ""} className="input" aria-label={t.venues_any_kind}>
          <option value="">{t.venues_any_kind}</option>
          {VENUE_KINDS.map((k) => <option key={k} value={k}>{kindLabel(k, lang)}</option>)}
        </select>
        <select name="zona" defaultValue={zona ?? ""} className="input" aria-label={t.venues_any_zone}>
          <option value="">{t.venues_any_zone}</option>
          {zones.map((z) => <option key={z} value={z}>{z}</option>)}
        </select>
        <input name="invitados" type="number" min={1} inputMode="numeric" defaultValue={guests} placeholder={t.venues_guests} className="input" aria-label={t.venues_guests} />
        <button className="btn-cta">{t.find}</button>
      </form>
      <div className="mt-3 flex items-center gap-3 text-sm text-sub">
        <span>{fill(t.venues_count, { n: venues.length })}</span>
        {filtered && <Link href="/espacios" className="underline underline-offset-4 hover:text-main">{t.search_all}</Link>}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_440px] lg:items-start">
        <div className="lg:order-2 lg:sticky lg:top-24">
          <VenueMap pins={pins} className="h-64 sm:h-80 lg:h-[calc(100vh-8rem)]" />
        </div>
        <div className="lg:order-1 min-w-0">
          {venues.length ? (
            <div className="grid gap-6 grid-cols-2 xl:grid-cols-3">
              {venues.map((v) => <VenueCard key={v.id} v={v} lang={lang} t={t} />)}
            </div>
          ) : (
            <p className="text-sub">{t.venues_none}</p>
          )}
        </div>
      </div>

      <section id="ayuda" className="mt-16 grid gap-8 md:grid-cols-[1fr_420px] card p-6 md:p-8">
        <div>
          <h2 className="font-display font-extrabold text-2xl">{t.venues_help_title}</h2>
          <p className="mt-2 text-sub max-w-md">{t.venues_help_body}</p>
          <div className="mt-8 rounded-xl border border-line p-4 max-w-md">
            <p className="font-semibold">{t.venues_owner_title}</p>
            <p className="mt-1 text-sm text-sub">{t.venues_owner_body}</p>
            <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Quiero publicar mi espacio en Monta")}`}
              className="mt-3 inline-block text-sm font-semibold text-lime-text underline underline-offset-4">{CONTACT_EMAIL}</a>
          </div>
        </div>
        <RequestForm t={t} />
      </section>
    </div>
  );
}
