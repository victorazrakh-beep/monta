import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { VenueMap } from "@/components/venues/VenueMap";
import { VenuePlaceholder } from "@/components/venues/VenueCard";
import { RequestForm } from "@/components/venues/RequestForm";
import { getDict } from "@/lib/i18n-server";
import { getProfile } from "@/lib/auth";
import { env } from "@/lib/env";
import { moneyShort } from "@/lib/format";
import { CONTACT_EMAIL } from "@/lib/contact";
import { capacityText, getVenueBySlug, kindLabel, mapsUrl } from "@/lib/venues";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const v = await getVenueBySlug((await params).slug);
  if (!v) return {};
  const where = [v.zone, "Panamá"].filter(Boolean).join(", ");
  return {
    title: `${v.name} · Espacio para eventos`,
    description: v.description || `${kindLabel(v.kind, "es")} para eventos en ${where}. Pide una cotización gratis en Monta.`,
    openGraph: v.cover_url ? { images: [v.cover_url] } : undefined,
  };
}

export default async function VenuePage({ params }: Params) {
  const v = await getVenueBySlug((await params).slug);
  if (!v) notFound();
  const [{ lang, t }, profile] = await Promise.all([getDict(), getProfile()]);
  if (v.status !== "live" && profile?.role !== "admin" && profile?.id !== v.owner_id) notFound();

  const capacity = capacityText(v, lang);
  const hasDetails = !!(capacity || v.price_from != null || v.description);
  const jsonLd = {
    "@context": "https://schema.org", "@type": "EventVenue", name: v.name, url: `${env.siteUrl}/espacios/${v.slug}`,
    address: v.address || v.zone, image: v.cover_url ? [v.cover_url] : undefined,
    geo: v.lat != null && v.lng != null ? { "@type": "GeoCoordinates", latitude: v.lat, longitude: v.lng } : undefined,
    maximumAttendeeCapacity: v.capacity_max ?? undefined, telephone: v.phone ?? undefined,
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Link href="/espacios" className="text-sm text-sub hover:text-main">← {t.nav_venues}</Link>
      <div className="mt-4 grid gap-8 md:grid-cols-[1fr_400px]">
        <div className="min-w-0">
          <div className="overflow-hidden rounded-2xl border border-line bg-surface aspect-[16/10]">
            {v.cover_url ? <img src={v.cover_url} alt="" className="h-full w-full object-cover" /> : <VenuePlaceholder name={v.name} />}
          </div>
          {v.gallery_urls.length > 0 && (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {v.gallery_urls.map((u) => <img key={u} src={u} alt="" className="h-24 w-32 shrink-0 rounded-xl object-cover border border-line" />)}
            </div>
          )}

          <p className="mt-6 text-sm font-semibold text-lime-text">{v.category || kindLabel(v.kind, lang)}{v.zone && ` · ${v.zone}`}</p>
          <h1 className="mt-1 font-display font-extrabold text-3xl md:text-5xl tracking-tight">{v.name}</h1>
          {v.rating != null && (
            <p className="mt-2 text-sub"><span className="text-main font-semibold">★ {Number(v.rating).toFixed(1)}</span> · {v.reviews_count} {t.venue_reviews}</p>
          )}

          <dl className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-line p-4">
              <dt className="text-xs text-sub">{t.venue_capacity}</dt>
              <dd className="mt-1 font-semibold">{capacity ?? (lang === "es" ? "A consultar" : "On request")}</dd>
            </div>
            <div className="rounded-xl border border-line p-4">
              <dt className="text-xs text-sub">{t.venue_price}</dt>
              <dd className="mt-1 font-semibold">{v.price_from != null ? `${t.from} ${moneyShort(v.price_from)}` : t.venue_ask_price}</dd>
            </div>
            <div className="rounded-xl border border-line p-4">
              <dt className="text-xs text-sub">{t.venue_address}</dt>
              <dd className="mt-1 font-semibold">{v.address || v.zone}</dd>
            </div>
          </dl>

          {!hasDetails && <p className="mt-4 rounded-xl bg-surface border border-line p-4 text-sm text-sub">{t.venue_pending_info}</p>}

          {v.description && (
            <section className="mt-8">
              <h2 className="font-display font-bold text-xl">{t.venue_about}</h2>
              <p className="mt-3 whitespace-pre-line text-sub leading-relaxed">{v.description}</p>
            </section>
          )}
          {v.amenities.length > 0 && (
            <section className="mt-8">
              <h2 className="font-display font-bold text-xl">{t.venue_amenities}</h2>
              <ul className="mt-3 flex flex-wrap gap-2">{v.amenities.map((a) => <li key={a} className="chip">{a}</li>)}</ul>
            </section>
          )}

          <section className="mt-8">
            <h2 className="font-display font-bold text-xl">{t.location}</h2>
            {v.lat != null && v.lng != null && (
              <VenueMap pins={[{ slug: v.slug, name: v.name, lat: v.lat, lng: v.lng, label: v.zone }]} zoom={16} className="mt-3 h-72" />
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <a className="chip" target="_blank" rel="noopener" href={mapsUrl(v)}>{t.open_map}</a>
              {v.instagram && <a className="chip" target="_blank" rel="noopener" href={`https://www.instagram.com/${v.instagram.replace(/^@/, "")}/`}>Instagram</a>}
              {v.website && <a className="chip" target="_blank" rel="noopener" href={v.website}>Web</a>}
              {v.phone && <a className="chip" href={`tel:${v.phone.replace(/[^\d+]/g, "")}`}>{v.phone}</a>}
            </div>
          </section>

          {v.source === "google" && !v.owner_id && (
            <p className="mt-8 text-xs text-muted">
              {t.venue_google_note}{" "}
              <a className="underline underline-offset-2 hover:text-main"
                href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`Reclamar ${v.name} en Monta`)}`}>{t.venue_claim}</a>
            </p>
          )}
        </div>

        <aside className="md:sticky md:top-24 self-start card p-5">
          <h2 className="font-display font-extrabold text-xl">{t.venue_req_title}</h2>
          <p className="mt-1 mb-4 text-sm text-sub">{t.venue_req_sub}</p>
          <RequestForm venueId={v.id} t={t} />
        </aside>
      </div>
    </div>
  );
}
