import Link from "next/link";
import { moneyShort } from "@/lib/format";
import { kindLabel, type VenuePin } from "@/lib/venues";
import type { Dict, Lang } from "@/lib/i18n";

export function VenueCard({ v, lang, t }: { v: VenuePin; lang: Lang; t: Dict }) {
  return (
    <Link href={`/espacios/${v.slug}`} className="group block">
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-surface border border-line">
        {v.cover_url ? (
          <img src={v.cover_url} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
        ) : (
          <VenuePlaceholder name={v.name} />
        )}
        <span className="absolute left-3 top-3 rounded-full bg-bg/85 backdrop-blur px-2.5 py-1 text-[11px] font-semibold">{kindLabel(v.kind, lang)}</span>
      </div>
      <div className="mt-3">
        <h3 className="font-display font-bold leading-snug line-clamp-2 group-hover:underline underline-offset-4">{v.name}</h3>
        <p className="mt-1 text-sm text-sub line-clamp-1">
          {v.zone}{v.capacity_max ? ` · ${t.venue_up_to} ${v.capacity_max}` : ""}
        </p>
        <p className="mt-1 text-sm font-semibold text-lime-text">
          {v.price_from != null ? `${t.from} ${moneyShort(v.price_from)}` : t.venue_ask_price}
        </p>
      </div>
    </Link>
  );
}

// Venues without photos yet get their initials on a ticket-notch tile instead of an empty box.
export function VenuePlaceholder({ name }: { name: string }) {
  const initials = name.replace(/^(the|hotel|club|centro de|museo del?)\s+/i, "").split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return (
    <div className="h-full w-full grid place-items-center bg-[radial-gradient(circle_at_30%_20%,var(--surface),var(--bg))]">
      <span className="font-display font-extrabold text-4xl text-sub/60 tracking-tight">{initials}</span>
    </div>
  );
}
