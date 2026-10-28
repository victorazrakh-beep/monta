import Link from "next/link";
import { revalidatePath } from "next/cache";
import type { Metadata } from "next";
import { admin } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { sendReviewResult } from "@/lib/email";
import { redirect } from "next/navigation";
import { dataForSeoConfigured, importGoogleVenues } from "@/lib/dataforseo";
import { eventDate, money } from "@/lib/format";
import { STATUS } from "@/lib/status";
import type { EventRow } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const metadata: Metadata = { title: "Admin", robots: { index: false } };

async function review(eventId: string, approve: boolean, fd: FormData) {
  "use server";
  await requireAdmin();
  const note = String(fd.get("note") ?? "").trim() || null;
  await admin().from("events").update({ status: approve ? "live" : "rejected", review_note: approve ? null : note }).eq("id", eventId);
  await sendReviewResult(eventId, approve, note ?? undefined);
  revalidatePath("/admin");
}
async function setFeatured(eventId: string, featured: boolean) {
  "use server";
  await requireAdmin();
  await admin().from("events").update({ featured }).eq("id", eventId);
  revalidatePath("/admin");
}
async function setLive(eventId: string, status: "live" | "cancelled" | "closed") {
  "use server";
  await requireAdmin();
  await admin().from("events").update({ status }).eq("id", eventId);
  revalidatePath("/admin");
}
async function markPaid(payoutId: string, fd: FormData) {
  "use server";
  await requireAdmin();
  await admin().from("payouts").update({ status: "paid", paid_at: new Date().toISOString(), reference: String(fd.get("reference") ?? "").slice(0, 80) || null }).eq("id", payoutId);
  revalidatePath("/admin");
}

async function importVenues() {
  "use server";
  await requireAdmin();
  const r = await importGoogleVenues();
  revalidatePath("/espacios");
  redirect(`/admin?import=${encodeURIComponent(JSON.stringify({ found: r.found, added: r.added, updated: r.updated, errors: r.errors.slice(0, 5) }))}#espacios`);
}

async function setRequestStatus(id: string, status: "new" | "contacted" | "closed") {
  "use server";
  await requireAdmin();
  await admin().from("venue_requests").update({ status }).eq("id", id);
  revalidatePath("/admin");
}

type VenueRequest = {
  id: string; name: string; email: string; phone: string | null; event_type: string | null; event_date: string | null;
  guests: number | null; budget: string | null; message: string; status: "new" | "contacted" | "closed"; created_at: string;
  venues: { name: string; slug: string } | null;
};
const REQUEST_STATUS = { new: "Nueva", contacted: "Contactado", closed: "Cerrada" } as const;

type Ev = EventRow & { profiles: { email: string | null; name: string | null } | null };

export default async function Admin({ searchParams }: { searchParams: Promise<{ import?: string }> }) {
  await requireAdmin();
  const imported = await searchParams.then((s) => { try { return s.import ? JSON.parse(s.import) as { found: number; added: number; updated: number; errors: string[] } : null; } catch { return null; } });
  const db = admin();
  const [{ data: pending }, { data: live }, { data: payouts }, { data: requests }] = await Promise.all([
    db.from("events").select("*, profiles(email, name)").eq("status", "pending_review").order("created_at").returns<Ev[]>(),
    db.from("events").select("*, profiles(email, name)").in("status", ["live", "closed"]).order("starts_at").limit(100).returns<Ev[]>(),
    db.from("payouts").select("*, events(name)").eq("status", "requested").order("requested_at")
      .returns<{ id: string; amount: number; requested_at: string; events: { name: string } }[]>(),
    db.from("venue_requests").select("*, venues(name, slug)").neq("status", "closed").order("created_at", { ascending: false }).limit(50)
      .returns<VenueRequest[]>(),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 grid gap-10">
      <h1 className="font-display font-extrabold text-3xl">Admin</h1>

      <section>
        <h2 className="font-display font-bold text-xl">Por revisar ({pending?.length ?? 0})</h2>
        <ul className="mt-4 grid gap-4">
          {(pending ?? []).map((ev) => (
            <li key={ev.id} className="card p-4 grid gap-3">
              <div className="flex gap-4">
                <div className="h-20 w-20 shrink-0 rounded-xl bg-surface overflow-hidden">{ev.cover_url && <img src={ev.cover_url} alt="" className="h-full w-full object-cover" />}</div>
                <div className="min-w-0">
                  <Link href={`/e/${ev.slug}`} className="font-semibold hover:underline">{ev.name}</Link>
                  <p className="text-sm text-sub">{eventDate(ev.starts_at, "es", { tbd: ev.date_tbd })} · {ev.location}</p>
                  <p className="text-sm text-sub">{ev.profiles?.name} · {ev.profiles?.email}</p>
                  <p className="mt-1 text-sm text-sub line-clamp-2">{ev.description}</p>
                </div>
              </div>
              <form className="flex flex-wrap gap-2">
                <button formAction={review.bind(null, ev.id, true)} className="btn-lime h-9">Aprobar y publicar</button>
                <input name="note" className="input h-9 flex-1 min-w-48" placeholder="Motivo si se rechaza" />
                <button formAction={review.bind(null, ev.id, false)} className="btn-ghost h-9">Pedir cambios</button>
              </form>
            </li>
          ))}
          {!pending?.length && <p className="text-sub">Nada pendiente.</p>}
        </ul>
      </section>

      <section id="espacios" className="card p-4 grid gap-3">
        <h2 className="font-display font-bold text-xl">Espacios desde Google Maps</h2>
        <p className="text-sm text-sub">Busca salones, rooftops, hoteles y lugares para eventos en Ciudad de Panamá con DataForSEO y los agrega a /espacios. Los que ya existen se actualizan; los reclamados por su dueño solo actualizan la calificación. Cada importación cuesta unos centavos en DataForSEO.</p>
        {dataForSeoConfigured() ? (
          <form action={importVenues}><button className="btn-lime h-9">Importar desde Google Maps</button></form>
        ) : (
          <p className="text-sm text-danger">Faltan DATAFORSEO_LOGIN y DATAFORSEO_PASSWORD en Vercel.</p>
        )}
        {imported && (
          <p className="text-sm">Encontrados {imported.found} · nuevos {imported.added} · actualizados {imported.updated}
            {imported.errors.length > 0 && <span className="block text-danger">{imported.errors.join(" · ")}</span>}</p>
        )}
      </section>

      <section>
        <h2 className="font-display font-bold text-xl">Solicitudes de espacios ({requests?.length ?? 0})</h2>
        <ul className="mt-4 grid gap-3">
          {(requests ?? []).map((r) => (
            <li key={r.id} className="card p-4 grid gap-2 text-sm">
              <div className="flex flex-wrap items-baseline gap-x-3">
                <span className="font-semibold">{r.venues ? <Link href={`/espacios/${r.venues.slug}`} className="hover:underline">{r.venues.name}</Link> : "Ayuda para encontrar espacio"}</span>
                <span className="text-sub">{new Date(r.created_at).toLocaleDateString("es-PA")}</span>
                <span className={r.status === "new" ? "text-lime-text font-semibold" : "text-sub"}>{REQUEST_STATUS[r.status]}</span>
              </div>
              <p>{r.name} · <a className="underline" href={`mailto:${r.email}`}>{r.email}</a>{r.phone && <> · <a className="underline" href={`https://wa.me/${r.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener">{r.phone}</a></>}</p>
              <p className="text-sub">{[r.event_type, r.event_date, r.guests && `${r.guests} invitados`, r.budget && `Presupuesto ${r.budget}`].filter(Boolean).join(" · ")}</p>
              {r.message && <p className="text-sub whitespace-pre-line">{r.message}</p>}
              <form className="flex gap-2">
                {r.status === "new" && <button formAction={setRequestStatus.bind(null, r.id, "contacted")} className="btn-lime h-8">Marcar contactado</button>}
                <button formAction={setRequestStatus.bind(null, r.id, "closed")} className="btn-ghost h-8">Cerrar</button>
              </form>
            </li>
          ))}
          {!requests?.length && <p className="text-sub">Sin solicitudes abiertas.</p>}
        </ul>
      </section>

      <section>
        <h2 className="font-display font-bold text-xl">Pagos solicitados</h2>
        <ul className="mt-4 grid gap-2">
          {(payouts ?? []).map((p) => (
            <li key={p.id} className="card p-3 flex flex-wrap items-center gap-3 text-sm">
              <span className="flex-1">{p.events.name} · <b>{money(p.amount)}</b> · {new Date(p.requested_at).toLocaleDateString("es-PA")}</span>
              <form action={markPaid.bind(null, p.id)} className="flex gap-2">
                <input name="reference" className="input h-9 w-44" placeholder="Ref. transferencia" />
                <button className="btn-cta h-9">Marcar pagado</button>
              </form>
            </li>
          ))}
          {!payouts?.length && <p className="text-sub">Sin solicitudes.</p>}
        </ul>
      </section>

      <section>
        <h2 className="font-display font-bold text-xl">Eventos publicados</h2>
        <ul className="mt-4 divide-y divide-line card">
          {(live ?? []).map((ev) => (
            <li key={ev.id} className="p-3 flex flex-wrap items-center gap-3 text-sm">
              <Link href={`/manage/${ev.id}`} className="flex-1 min-w-0 truncate hover:underline">{ev.name}</Link>
              <span className="text-sub">{STATUS[ev.status].es}</span>
              <form action={setFeatured.bind(null, ev.id, !ev.featured)}><button className={ev.featured ? "text-lime-text" : "text-sub"}>{ev.featured ? "★ Destacado" : "☆ Destacar"}</button></form>
              <form action={setLive.bind(null, ev.id, "cancelled")}><button className="text-danger">Suspender</button></form>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
