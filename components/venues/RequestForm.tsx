"use client";
import { useActionState } from "react";
import { requestQuote, type RequestState } from "@/app/espacios/actions";
import type { Dict } from "@/lib/i18n";

export function RequestForm({ venueId, t }: { venueId?: string; t: Dict }) {
  const [state, action, pending] = useActionState<RequestState, FormData>(requestQuote, null);
  const today = new Date().toISOString().slice(0, 10);

  if (state?.ok) {
    return (
      <div className="rounded-xl bg-surface border border-line p-4" role="status">
        <p className="font-semibold">{t.venue_req_sent_title}</p>
        <p className="mt-1 text-sm text-sub">{t.venue_req_sent_body}</p>
      </div>
    );
  }

  return (
    <form action={action} className="grid gap-3">
      {venueId && <input type="hidden" name="venue_id" value={venueId} />}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      <div>
        <label className="label" htmlFor="vr-name">{t.venue_req_name}</label>
        <input id="vr-name" name="name" required minLength={2} className="input" autoComplete="name" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="vr-email">{t.email}</label>
          <input id="vr-email" name="email" type="email" required className="input" autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="vr-phone">{t.venue_req_phone}</label>
          <input id="vr-phone" name="phone" type="tel" className="input" autoComplete="tel" placeholder="+507" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="vr-type">{t.venue_req_type}</label>
          <input id="vr-type" name="event_type" className="input" placeholder={t.venue_req_type_ph} list="vr-types" />
          <datalist id="vr-types">
            {t.venue_req_type_options.split("|").map((o) => <option key={o} value={o} />)}
          </datalist>
        </div>
        <div>
          <label className="label" htmlFor="vr-date">{t.venue_req_date}</label>
          <input id="vr-date" name="event_date" type="date" min={today} className="input" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="vr-guests">{t.venue_req_guests}</label>
          <input id="vr-guests" name="guests" type="number" min={1} inputMode="numeric" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="vr-budget">{t.venue_req_budget}</label>
          <input id="vr-budget" name="budget" className="input" placeholder="$" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="vr-msg">{t.venue_req_message}</label>
        <textarea id="vr-msg" name="message" rows={3} maxLength={2000} className="input" placeholder={t.venue_req_message_ph} />
      </div>
      {state?.error && <p className="text-sm text-danger" role="alert">{state.error === "invalid" ? t.venue_req_invalid : t.venue_req_failed}</p>}
      <button className="btn-lime w-full" disabled={pending}>{pending ? "…" : t.venue_req_submit}</button>
      <p className="text-xs text-muted">{t.venue_req_note}</p>
    </form>
  );
}
