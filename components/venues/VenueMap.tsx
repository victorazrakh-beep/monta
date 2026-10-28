"use client";
import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";

export interface MapPin { slug: string; name: string; lat: number; lng: number; label: string }

// OpenStreetMap tiles through Leaflet: free, no API key. Loaded only in the browser.
export function VenueMap({ pins, className = "", zoom = 12 }: { pins: MapPin[]; className?: string; zoom?: number }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !el.current) return;
      map.current?.remove();
      const m = L.map(el.current, { scrollWheelZoom: false, attributionControl: true });
      map.current = m;
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(m);
      const icon = L.divIcon({ className: "venue-pin", html: "<span></span>", iconSize: [22, 22], iconAnchor: [11, 11] });
      const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
      const markers = pins.map((p) =>
        L.marker([p.lat, p.lng], { icon, title: p.name, alt: p.name })
          .bindPopup(`<a class="venue-pop" href="/espacios/${encodeURIComponent(p.slug)}"><b>${esc(p.name)}</b><span>${esc(p.label)}</span></a>`)
          .addTo(m));
      if (markers.length > 1) m.fitBounds(L.featureGroup(markers).getBounds(), { padding: [32, 32], maxZoom: 15 });
      else if (markers.length === 1) m.setView([pins[0].lat, pins[0].lng], zoom);
      else m.setView([8.98, -79.52], 12); // Panama City
    })();
    return () => { cancelled = true; map.current?.remove(); map.current = null; };
  }, [pins, zoom]);

  return <div ref={el} className={`venue-map rounded-2xl border border-line overflow-hidden bg-surface ${className}`} />;
}
