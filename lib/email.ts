import "server-only";
import { Resend } from "resend";
import { env } from "@/lib/env";
import { admin } from "@/lib/supabase/admin";
import { qrPng } from "@/lib/qr";
import { ics } from "@/lib/ics";
import { CONTACT_EMAIL } from "@/lib/contact";
import { eventDate, eventTime, money } from "@/lib/format";
import type { EventRow, Order, Ticket } from "@/lib/types";

async function send(payload: Parameters<Resend["emails"]["send"]>[0]) {
  if (!env.resendKey) {
    console.log("[email] RESEND_API_KEY missing, skipped:", payload.subject, "→", payload.to);
    return;
  }
  const { error } = await new Resend(env.resendKey).emails.send(payload);
  if (error) console.error("[email] failed", error);
}

const wrap = (body: string) => `<!doctype html><html><body style="margin:0;background:#eceef0;font-family:Inter,Arial,sans-serif;color:#14161a">
<div style="max-width:560px;margin:0 auto;padding:24px">
<div style="font-weight:800;font-size:22px;letter-spacing:-0.5px;margin-bottom:16px">monta<span style="color:#9fb000">.</span></div>
<div style="background:#fff;border-radius:16px;padding:24px">${body}</div>
<p style="font-size:12px;color:#5b616b;margin-top:16px">Monta · Panamá</p></div></body></html>`;

export async function sendOrderConfirmation(orderId: string) {
  const db = admin();
  const { data: order } = await db.from("ticket_orders").select("*").eq("id", orderId).single<Order>();
  if (!order) return;
  const { data: ev } = await db.from("events").select("*").eq("id", order.event_id).single<EventRow>();
  const { data: tickets } = await db.from("tickets").select("*, ticket_tiers(name)").eq("order_id", orderId)
    .returns<(Ticket & { ticket_tiers: { name: string } })[]>();
  if (!ev || !tickets) return;

  const url = (p: string) => env.siteUrl + p;
  const attachments: { filename: string; content: Buffer; contentId?: string }[] = [];
  const rows = await Promise.all(tickets.map(async (tk, i) => {
    attachments.push({ filename: `entrada-${i + 1}.png`, content: await qrPng(tk.token), contentId: `qr${i}` });
    return `<div style="border:1px solid #e1e3e7;border-radius:12px;padding:16px;margin:12px 0;text-align:center">
      <div style="font-size:13px;color:#5b616b">Entrada ${i + 1} de ${tickets.length} · ${tk.ticket_tiers.name}</div>
      <img src="cid:qr${i}" width="200" height="200" alt="QR" style="margin:8px auto;display:block"/>
      <div style="font-family:monospace;font-size:18px;font-weight:700;letter-spacing:4px">${tk.short_code}</div>
      <a href="${url(`/t/${tk.token}`)}" style="font-size:13px;color:#14161a">Abrir entrada</a></div>`;
  }));
  if (ev.starts_at) {
    attachments.push({
      filename: "evento.ics",
      content: Buffer.from(ics({ ...ev, starts_at: ev.starts_at, location: ev.address || ev.location, url: url(`/e/${ev.slug}`) })),
    });
  }

  await send({
    from: env.emailFrom,
    to: order.email,
    subject: `Tus entradas para ${ev.name}`,
    attachments,
    html: wrap(`<h1 style="font-size:22px;margin:0 0 4px">${ev.name}</h1>
      <p style="margin:0;color:#5b616b">${eventDate(ev.starts_at, "es", { tbd: ev.date_tbd })} · ${eventTime(ev.starts_at, "es", { tbd: ev.time_tbd })} · ${ev.location}</p>
      <p>Hola ${order.name.split(" ")[0]}, tu pedido <b>${order.code}</b> está confirmado. Total: <b>${money(order.total)}</b>.</p>
      ${rows.join("")}
      <p style="font-size:13px;color:#5b616b">Muestra el código QR en la entrada. También puedes ver tus entradas en
      <a href="${url("/tickets")}">${url("/tickets")}</a> con tu correo y el código ${order.code}.</p>`),
  });
}

export async function sendReviewResult(eventId: string, approved: boolean, note?: string) {
  const db = admin();
  const { data: ev } = await db.from("events").select("name, slug, organizer_id").eq("id", eventId).single<Pick<EventRow, "name" | "slug" | "organizer_id">>();
  if (!ev?.organizer_id) return;
  const { data: p } = await db.from("profiles").select("email").eq("id", ev.organizer_id).single<{ email: string }>();
  if (!p?.email) return;
  await send({
    from: env.emailFrom,
    to: p.email,
    subject: approved ? `Tu evento ${ev.name} ya está publicado` : `Tu evento ${ev.name} necesita cambios`,
    html: wrap(approved
      ? `<p>¡Buenas noticias! <b>${ev.name}</b> fue aprobado y ya está a la venta.</p><p><a href="${env.siteUrl}/e/${ev.slug}">Ver evento</a></p>`
      : `<p>Revisamos <b>${ev.name}</b> y necesita algunos cambios antes de publicarse:</p><p>${note ?? ""}</p><p><a href="${env.siteUrl}/mis-eventos">Editar evento</a></p>`),
  });
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

// A venue quote request goes to Monta (and the venue's owner, if it has one); the requester gets a receipt.
export async function sendVenueRequest(requestId: string) {
  const db = admin();
  const { data: r } = await db.from("venue_requests").select("*, venues(name, slug, owner_id)").eq("id", requestId)
    .single<{ name: string; email: string; phone: string | null; event_type: string | null; event_date: string | null;
      guests: number | null; budget: string | null; message: string;
      venues: { name: string; slug: string; owner_id: string | null } | null }>();
  if (!r) return;
  const venue = r.venues?.name ?? "Monta (ayuda para encontrar espacio)";
  const to = [CONTACT_EMAIL];
  if (r.venues?.owner_id) {
    const { data: o } = await db.from("profiles").select("email").eq("id", r.venues.owner_id).single<{ email: string | null }>();
    if (o?.email) to.push(o.email);
  }
  const rows = ([["Nombre", r.name], ["Correo", r.email], ["Teléfono", r.phone], ["Tipo de evento", r.event_type],
    ["Fecha", r.event_date], ["Invitados", r.guests], ["Presupuesto", r.budget]] as const)
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#5b616b">${k}</td><td style="padding:4px 0"><b>${esc(String(v))}</b></td></tr>`).join("");

  await send({
    from: env.emailFrom,
    to,
    replyTo: r.email,
    subject: `Solicitud de cotización: ${venue}`,
    html: wrap(`<h1 style="font-size:20px;margin:0 0 12px">Nueva solicitud para ${esc(venue)}</h1>
      <table style="font-size:14px;border-collapse:collapse">${rows}</table>
      ${r.message ? `<p style="white-space:pre-line;border-top:1px solid #e1e3e7;padding-top:12px">${esc(r.message)}</p>` : ""}
      ${r.venues ? `<p><a href="${env.siteUrl}/espacios/${r.venues.slug}">Ver espacio</a></p>` : ""}
      <p style="font-size:13px;color:#5b616b">Responde a este correo para escribirle directamente a ${esc(r.name.split(" ")[0])}.</p>`),
  });
  await send({
    from: env.emailFrom,
    to: r.email,
    replyTo: CONTACT_EMAIL,
    subject: `Recibimos tu solicitud para ${venue}`,
    html: wrap(`<p>Hola ${esc(r.name.split(" ")[0])}, recibimos tu solicitud de cotización para <b>${esc(venue)}</b>.</p>
      <p>Te escribimos pronto con disponibilidad y precios. Si quieres agregar algo, responde a este correo.</p>`),
  });
}
