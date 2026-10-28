import "server-only";
import { admin } from "@/lib/supabase/admin";
import { slugify } from "@/lib/data";
import type { VenueKind } from "@/lib/venues";

// Google Maps listings through DataForSEO's live Maps endpoint (pay per search, no Google key needed).
const ENDPOINT = "https://api.dataforseo.com/v3/serp/google/maps/live/advanced";

export const dataForSeoConfigured = () => !!(process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD);

// Searches that together cover the kinds of places people rent for events around Panama City.
export const DEFAULT_QUERIES = [
  "salón de eventos", "salón de fiestas", "salón de banquetes", "terraza para eventos", "jardín para eventos",
  "centro de convenciones", "lugar para bodas", "event venue", "banquet hall", "salón para quinceañeras",
];

// Google searches also return hotels, restaurants, offices and so on near a match. Only keep places whose main
// Google category is an event space.
const EVENT_SPACE = /sal[oó]n de (eventos|fiestas|banquetes|recepciones|convenciones)|sala de (eventos|fiestas)|lugar (para|de) (eventos|bodas|celebraciones)|centro de (convenciones|eventos|conferencias)|event venue|banquet hall|wedding venue|convention cent|conference cent|party venue|reception hall/i;
export const isEventSpace = (category?: string | null) => !!category && EVENT_SPACE.test(category);
const PANAMA_CITY = "8.9824,-79.5199,12z";

interface MapsItem {
  type: string;
  title?: string;
  category?: string;
  additional_categories?: string[] | null;
  address?: string;
  phone?: string;
  url?: string;
  domain?: string;
  latitude?: number;
  longitude?: number;
  cid?: string;
  main_image?: string;
  rating?: { value?: number; votes_count?: number } | null;
  address_info?: { borough?: string; city?: string } | null;
}

// Neighbourhoods people search by. Google addresses usually name one; otherwise the venue keeps the city.
const ZONES: [RegExp, string][] = [
  [/casco (viejo|antiguo)|san felipe/i, "Casco Viejo"], [/punta pac[ií]fica/i, "Punta Pacífica"], [/paitilla/i, "Punta Paitilla"],
  [/costa del este/i, "Costa del Este"], [/obarrio/i, "Obarrio"], [/marbella/i, "Marbella"], [/bella vista/i, "Bella Vista"],
  [/el cangrejo/i, "El Cangrejo"], [/coco del mar/i, "Coco del Mar"], [/san francisco/i, "San Francisco"],
  [/amador|ancón|ancon|calzada/i, "Amador"], [/albrook/i, "Albrook"], [/clayton|ciudad del saber/i, "Clayton"],
  [/balboa/i, "Balboa"], [/carrasquilla/i, "Carrasquilla"], [/betania|bethania|el dorado|condado del rey/i, "Betania"],
  [/v[ií]a porras|altos del golf|chanis/i, "San Francisco"], [/juan d[ií]az|santa mar[ií]a/i, "Juan Díaz"],
  [/panam[aá] pac[ií]fico|howard/i, "Panamá Pacífico"], [/veracruz|playa bonita/i, "Playa Bonita"],
  [/arraij[aá]n/i, "Arraiján"], [/chorrera/i, "La Chorrera"], [/gamboa/i, "Gamboa"], [/tocumen|24 de diciembre/i, "Tocumen"],
  [/las cumbres|cerro viejo/i, "Las Cumbres"], [/coronado/i, "Coronado"], [/col[oó]n/i, "Colón"],
];
const zoneOf = (i: MapsItem) => {
  const text = [i.address, i.address_info?.borough].filter(Boolean).join(" ");
  const known = ZONES.find(([re]) => re.test(text))?.[1];
  if (known) return known;
  // Google's borough field is sometimes a floor, a km marker or the city itself; keep only real place names.
  const b = (i.address_info?.borough ?? "").trim();
  const usable = /^[\p{L} .'-]{4,}$/u.test(b) && !/^(panam[aá]|floor|rooftop|urbaniza\w*|pianobar|local|piso)$/i.test(b);
  return usable ? b : "Ciudad de Panamá";
};

// Map Google's category text to Monta's venue kinds.
function kindOf(cat: string): VenueKind {
  const c = cat.toLowerCase();
  if (/rooftop|azotea/.test(c)) return "rooftop";
  if (/convenci|convention|conference|congres/.test(c)) return "centro_convenciones";
  if (/hotel|resort/.test(c)) return "hotel";
  if (/teatro|theater|theatre|auditor/.test(c)) return "teatro";
  if (/museo|museum|galer/.test(c)) return "museo";
  if (/estadio|stadium|arena/.test(c)) return "estadio";
  if (/playa|beach/.test(c)) return "playa";
  if (/jard[ií]n|garden|parque|park|finca|rancho/.test(c)) return "naturaleza";
  if (/restaur/.test(c)) return "restaurante";
  if (/\bbar\b|pub|lounge|cantina/.test(c)) return "bar";
  if (/club|discoteca|night/.test(c)) return "club";
  if (/sal[oó]n|event|banquet|fiesta|boda|wedding|hall/.test(c)) return "salon";
  return "otro";
}

async function search(keyword: string): Promise<MapsItem[]> {
  const auth = Buffer.from(`${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`).toString("base64");
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify([{ keyword, location_coordinate: PANAMA_CITY, language_code: "es", depth: 100 }]),
  });
  const json = await res.json();
  const task = json?.tasks?.[0];
  if (!res.ok || task?.status_code !== 20000) throw new Error(`${keyword}: ${task?.status_message ?? json?.status_message ?? res.status}`);
  return (task.result?.[0]?.items ?? []).filter((i: MapsItem) => i.type === "maps_search");
}

export async function importGoogleVenues(queries = DEFAULT_QUERIES) {
  const results = await Promise.allSettled(queries.map(search));
  const errors = results.flatMap((r) => (r.status === "rejected" ? [String(r.reason?.message ?? r.reason)] : []));
  const byCid = new Map<string, MapsItem>();
  for (const r of results) if (r.status === "fulfilled") for (const i of r.value) {
    if (i.cid && i.title && i.latitude && i.longitude && isEventSpace(i.category)) byCid.set(i.cid, i);
  }

  const db = admin();
  const { data: existing } = await db.from("venues").select("id, google_cid, owner_id").not("google_cid", "is", null)
    .returns<{ id: string; google_cid: string; owner_id: string | null }[]>();
  const known = new Map((existing ?? []).map((v) => [v.google_cid, v]));
  const now = new Date().toISOString();
  let added = 0, updated = 0;

  for (const [cid, i] of byCid) {
    const fresh = { rating: i.rating?.value ?? null, reviews_count: i.rating?.votes_count ?? 0, imported_at: now };
    const prev = known.get(cid);
    if (prev) {
      // Claimed venues keep what their owner wrote; only Google's rating is refreshed.
      const patch = prev.owner_id ? fresh : {
        ...fresh, status: "live", kind: kindOf(i.category ?? ""), name: i.title, category: i.category ?? null, zone: zoneOf(i), address: i.address ?? null, lat: i.latitude, lng: i.longitude,
        phone: i.phone ?? null, website: i.url ?? null, ...(i.main_image ? { cover_url: i.main_image } : {}),
      };
      await db.from("venues").update(patch).eq("id", prev.id);
      updated++;
    } else {
      const { error } = await db.from("venues").insert({
        ...fresh, slug: slugify(i.title!), name: i.title, kind: kindOf(i.category ?? ""), category: i.category ?? null,
        zone: zoneOf(i), address: i.address ?? null,
        lat: i.latitude, lng: i.longitude, phone: i.phone ?? null, website: i.url ?? null, cover_url: i.main_image ?? null,
        source: "google", google_cid: cid, status: "live",
      });
      if (error) errors.push(`${i.title}: ${error.message}`); else added++;
    }
  }
  // Hide unclaimed venues that aren't event spaces: earlier imports and the hand-added starter list (hotels, stadiums…).
  const { data: live } = await db.from("venues").select("id, source, category").eq("status", "live").is("owner_id", null)
    .returns<{ id: string; source: string; category: string | null }[]>();
  const off = (live ?? []).filter((v) => v.source === "monta" || !isEventSpace(v.category)).map((v) => v.id);
  for (let k = 0; k < off.length; k += 200) await db.from("venues").update({ status: "hidden" }).in("id", off.slice(k, k + 200));

  return { found: byCid.size, added, updated, hidden: off.length, errors };
}
