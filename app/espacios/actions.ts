"use server";
import { z } from "zod";
import { admin } from "@/lib/supabase/admin";
import { sendVenueRequest } from "@/lib/email";

const schema = z.object({
  venue_id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(30).optional(),
  event_type: z.string().trim().max(80).optional(),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  guests: z.coerce.number().int().min(1).max(100000).optional(),
  budget: z.string().trim().max(80).optional(),
  message: z.string().trim().max(2000).default(""),
});

export type RequestState = { ok: boolean; error?: "invalid" | "failed" } | null;

const opt = (v: FormDataEntryValue | null) => (typeof v === "string" && v.trim() ? v : undefined);

export async function requestQuote(_prev: RequestState, fd: FormData): Promise<RequestState> {
  // Honeypot: real people never fill the hidden "website" field.
  if (opt(fd.get("website"))) return { ok: true };
  const parsed = schema.safeParse({
    venue_id: opt(fd.get("venue_id")), name: fd.get("name"), email: fd.get("email"), phone: opt(fd.get("phone")),
    event_type: opt(fd.get("event_type")), event_date: opt(fd.get("event_date")), guests: opt(fd.get("guests")),
    budget: opt(fd.get("budget")), message: fd.get("message") ?? "",
  });
  if (!parsed.success) return { ok: false, error: "invalid" };

  const { data, error } = await admin().from("venue_requests").insert(parsed.data).select("id").single<{ id: string }>();
  if (error || !data) {
    console.error("[venue_requests]", error);
    return { ok: false, error: "failed" };
  }
  try { await sendVenueRequest(data.id); } catch (e) { console.error("[email] venue request", e); }
  return { ok: true };
}
