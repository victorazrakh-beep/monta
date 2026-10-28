import "server-only";
import { admin } from "@/lib/supabase/admin";
import { isConfigured } from "@/lib/env";
import type { Lang } from "@/lib/i18n";

export const VENUE_KINDS = [
  "salon", "hotel", "rooftop", "bar", "restaurante", "club", "centro_convenciones",
  "teatro", "museo", "estadio", "playa", "naturaleza", "otro",
] as const;
export type VenueKind = (typeof VENUE_KINDS)[number];

const KIND_LABELS: Record<VenueKind, { es: string; en: string }> = {
  salon: { es: "Salón de eventos", en: "Event hall" },
  hotel: { es: "Hotel", en: "Hotel" },
  rooftop: { es: "Rooftop", en: "Rooftop" },
  bar: { es: "Bar", en: "Bar" },
  restaurante: { es: "Restaurante", en: "Restaurant" },
  club: { es: "Club", en: "Club" },
  centro_convenciones: { es: "Centro de convenciones", en: "Convention center" },
  teatro: { es: "Teatro", en: "Theater" },
  museo: { es: "Museo", en: "Museum" },
  estadio: { es: "Estadio o arena", en: "Stadium or arena" },
  playa: { es: "Playa", en: "Beach" },
  naturaleza: { es: "Naturaleza", en: "Nature" },
  otro: { es: "Otro", en: "Other" },
};
export const kindLabel = (k: VenueKind, lang: Lang) => KIND_LABELS[k]?.[lang] ?? k;

export interface Venue {
  id: string;
  slug: string;
  owner_id: string | null;
  name: string;
  kind: VenueKind;
  zone: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  description: string;
  capacity_min: number | null;
  capacity_max: number | null;
  price_from: number | null;
  amenities: string[];
  cover_url: string | null;
  gallery_urls: string[];
  website: string | null;
  instagram: string | null;
  phone: string | null;
  status: "live" | "pending_review" | "hidden";
  featured: boolean;
  source: "monta" | "google";
  category: string | null;
  rating: number | null;
  reviews_count: number;
}

// What the list, cards and map need.
export type VenuePin = Pick<Venue, "id" | "slug" | "name" | "kind" | "zone" | "lat" | "lng" | "capacity_max" | "price_from" | "cover_url" | "rating" | "reviews_count">;
const PIN_COLS = "id, slug, name, kind, zone, lat, lng, capacity_max, price_from, cover_url, rating, reviews_count";

export async function listVenues(opts: { q?: string; kind?: string; zone?: string; guests?: number } = {}) {
  if (!isConfigured()) return [];
  let query = admin().from("venues").select(PIN_COLS).eq("status", "live")
    .order("featured", { ascending: false }).order("reviews_count", { ascending: false }).order("name");
  if (opts.kind && (VENUE_KINDS as readonly string[]).includes(opts.kind)) query = query.eq("kind", opts.kind);
  if (opts.zone) query = query.eq("zone", opts.zone);
  // Venues with no capacity on file stay in the results: they may still fit.
  if (opts.guests) query = query.or(`capacity_max.gte.${opts.guests},capacity_max.is.null`);
  if (opts.q) {
    const q = opts.q.replace(/[%,()]/g, " ").trim();
    if (q) query = query.or(`name.ilike.%${q}%,zone.ilike.%${q}%,address.ilike.%${q}%`);
  }
  const { data, error } = await query.limit(2000).returns<VenuePin[]>();
  if (error) console.error(error);
  return data ?? [];
}

export async function listVenueZones() {
  if (!isConfigured()) return [];
  const { data } = await admin().from("venues").select("zone").eq("status", "live").returns<{ zone: string }[]>();
  return [...new Set((data ?? []).map((v) => v.zone).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
}

export async function getVenueBySlug(slug: string) {
  if (!isConfigured()) return null;
  const { data } = await admin().from("venues").select("*").eq("slug", slug).maybeSingle<Venue>();
  return data;
}

export const capacityText = (v: Pick<Venue, "capacity_min" | "capacity_max">, lang: Lang) => {
  const people = lang === "es" ? "personas" : "guests";
  if (v.capacity_min && v.capacity_max) return `${v.capacity_min}–${v.capacity_max} ${people}`;
  if (v.capacity_max) return `${lang === "es" ? "Hasta" : "Up to"} ${v.capacity_max} ${people}`;
  return null;
};

export const mapsUrl = (v: Pick<Venue, "name" | "address" | "lat" | "lng">) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    v.lat != null && v.lng != null ? `${v.name} ${v.lat},${v.lng}` : `${v.name} ${v.address ?? ""} Panamá`)}`;
