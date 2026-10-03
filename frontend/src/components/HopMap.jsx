import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Server, Globe2, ShieldAlert, Lock, ArrowRight, ShieldCheck } from 'lucide-react';

export default function HopMap({ hops = [], isGuest = false, onOpenAuthModal }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const polylineRef = useRef(null);

  // Filter hops with valid coordinates
  const geoHops = hops.filter((h) => h.lat !== null && h.lon !== null && !h.is_internal);
  const internalHops = hops.filter((h) => h.is_internal);
  const originHop = hops.find((h) => h.is_likely_origin);

  useEffect(() => {
    if (isGuest || !mapContainerRef.current) return;

    // Initialize Leaflet map if not already created
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [25, 10],
        zoom: 2,
        minZoom: 2,
        maxZoom: 18,
        worldCopyJump: true,
      });

      // Dark modern CARTO Basemaps tile layer with provided API key
      const cartoKey = import.meta.env.VITE_CARTO_API_KEY || 'cb1_2v9z_1_a3b3ca71572e6462669d5f2d';
      const tileUrl = cartoKey
        ? `https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png?key=${cartoKey}`
        : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

      L.tileLayer(tileUrl, {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear existing markers & polyline
    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current = [];
    if (polylineRef.current) {
      map.removeLayer(polylineRef.current);
      polylineRef.current = null;
    }

    if (geoHops.length === 0) {
      map.setView([25, 10], 2);
      return;
    }

    const latLngs = [];

    // Custom Icon Creators
    const createOriginIcon = () =>
      L.divIcon({
        className: 'custom-origin-pin',
        html: `
          <div style="position: relative; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; width: 34px; height: 34px; border-radius: 50%; background: rgba(239, 68, 68, 0.4); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="width: 22px; height: 22px; border-radius: 50%; background: #ef4444; border: 3px solid #ffffff; box-shadow: 0 0 12px rgba(239, 68, 68, 0.8);"></div>
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

    const createRelayIcon = (order) =>
      L.divIcon({
        className: 'custom-relay-pin',
        html: `
            <div style="width: 22px; height: 22px; border-radius: 50%; background: #31d18a; border: 2px solid #06110d; display: flex; align-items: center; justify-content: center; color: #06150e; font-size: 10px; font-weight: bold; box-shadow: 0 0 8px rgba(49, 209, 138, 0.35);">
            ${order + 1}
          </div>
        `,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });

    // Add markers
    geoHops.forEach((h) => {
      const pt = [h.lat, h.lon];
      latLngs.push(pt);

      const icon = h.is_likely_origin ? createOriginIcon() : createRelayIcon(h.hop_order);
      const marker = L.marker(pt, { icon }).addTo(map);

      const popupContent = `
        <div style="font-family: ui-sans-serif, system-ui; font-size: 12px; line-height: 1.4; color: #f8fafc; min-width: 180px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-weight: bold; color: ${h.is_likely_origin ? '#ef4444' : '#38bdf8'};">
              ${h.is_likely_origin ? '⚠️ TRUE ORIGIN HOP' : `HOP #${h.hop_order + 1}`}
            </span>
            <span style="font-family: monospace; font-size: 10px; color: #94a3b8;">${h.ip}</span>
          </div>
          <div style="margin-bottom: 2px;"><b>Location:</b> ${h.city}, ${h.country}</div>
          <div style="margin-bottom: 2px;"><b>ISP:</b> ${h.isp || 'N/A'}</div>
          ${h.org ? `<div style="margin-bottom: 2px;"><b>Org:</b> ${h.org}</div>` : ''}
          ${h.reverse_dns ? `<div><b>DNS:</b> <span style="font-family: monospace; font-size: 11px;">${h.reverse_dns}</span></div>` : ''}
        </div>
      `;

      marker.bindPopup(popupContent);
      markersRef.current.push(marker);
    });

    // Draw route polyline
    if (latLngs.length > 1) {
      polylineRef.current = L.polyline(latLngs, {
        color: '#31d18a',
        weight: 3,
        opacity: 0.85,
        dashArray: '6, 8',
      }).addTo(map);
    }

    // Auto-fit bounds
    if (latLngs.length > 0) {
      const bounds = L.latLngBounds(latLngs);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 8 });
    }

    // Trigger map resize fix
    setTimeout(() => map.invalidateSize(), 200);
  }, [hops, isGuest]);

  return (
    <div className="tl-evidence-surface space-y-4 p-5 sm:p-6" aria-label="Existing IP and geolocation evidence">
      {/* Header */}
      <div className="flex flex-col justify-between gap-3 border-b border-[var(--tl-border)] pb-3 sm:flex-row sm:items-center">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--tl-text)]">
            <Globe2 className="h-4 w-4 text-[var(--tl-accent)]" />
            Origin Tracer: Received Header Geolocation Trail
          </h3>
          <p className="mt-1 text-xs text-[var(--tl-text-muted)]">
            Chronological reconstruction of MTA hops from origin to mailbox gateway.
          </p>
        </div>

        {originHop && (
          <div className="flex items-center gap-2 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-1.5 font-mono text-xs text-red-300">
            <ShieldAlert className="h-4 w-4" />
            <span>
              Origin: <b>{originHop.ip}</b> {isGuest ? <span className="text-red-400/80 font-normal">([Location Restricted · Sign in])</span> : `(${originHop.city}, ${originHop.country})`}
            </span>
          </div>
        )}
      </div>

      {/* Map Container or Guest Restriction Overlay */}
      {isGuest ? (
        <div className="relative flex h-[380px] w-full flex-col items-center justify-center overflow-hidden rounded-lg border border-emerald-400/20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#0d2218] via-[var(--tl-surface-inset)] to-[var(--tl-canvas)] p-6 text-center sm:h-[440px]">
          {/* Subtle grid pattern background */}
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#15291f_1px,transparent_1px),linear-gradient(to_bottom,#15291f_1px,transparent_1px)] bg-[size:28px_28px] opacity-25" />
          
          <div className="relative z-10 mx-auto max-w-md space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-400/10 shadow-[0_0_24px_rgba(53,217,143,0.15)]">
              <Lock className="h-7 w-7 text-[var(--tl-accent)]" />
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-amber-300">
                Governance Protocol · Guest Session
              </span>
              <h4 className="text-base font-semibold text-[var(--tl-text)] sm:text-lg">
                Origin Geolocation & Physical Hop Sequence Restricted
              </h4>
              <p className="text-xs leading-5 text-[var(--tl-text-muted)]">
                Under WhyCode Hackathon forensic intelligence protocols, hop coordinates and ISP routing vectors are restricted to authenticated Analyst and Admin accounts.
              </p>
            </div>

            {onOpenAuthModal && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={onOpenAuthModal}
                  className="tl-button-primary inline-flex items-center gap-2 text-xs font-semibold shadow-lg shadow-emerald-950/50 hover:shadow-emerald-500/20"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>Sign in as Analyst to unlock map</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="relative h-[420px] w-full overflow-hidden rounded-lg border border-[var(--tl-border)] sm:h-[480px]">
          <div ref={mapContainerRef} className="w-full h-full" />
        </div>
      )}

      {hops.length === 0 && (
        <div className="tl-panel-inset p-4 text-center text-xs text-[var(--tl-text-muted)]">
          No hop records were returned for this email.
        </div>
      )}

      {/* Internal Hops Badge Strip */}
      {internalHops.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--tl-border)] bg-[var(--tl-surface-inset)] p-2.5 text-xs">
          <span className="flex items-center gap-1.5 font-semibold text-[var(--tl-text-muted)]">
            <Server className="h-3.5 w-3.5 text-[var(--tl-text-muted)]" />
            Internal / Loopback Hops:
          </span>
          {internalHops.map((ih, idx) => (
            <span
              key={idx}
              className="rounded border border-[var(--tl-border-strong)] bg-[var(--tl-surface)] px-2 py-0.5 font-mono text-[11px] text-[var(--tl-text-secondary)]"
            >
              Hop {ih.hop_order + 1}: {ih.ip} ({ih.city})
            </span>
          ))}
        </div>
      )}

      {/* Chronological Hop Details Table */}
      <div className="overflow-x-auto rounded-lg border border-[var(--tl-border)]">
        <table className="w-full text-left text-xs text-[var(--tl-text-secondary)]">
          <caption className="sr-only">Chronological Received header hops</caption>
          <thead className="border-b border-[var(--tl-border)] bg-[var(--tl-surface-inset)] font-mono text-[11px] uppercase text-[var(--tl-text-muted)]">
            <tr>
              <th className="px-3 py-2.5">Hop #</th>
              <th className="px-3 py-2.5">Role</th>
              <th className="px-3 py-2.5">IP Address</th>
              <th className="px-3 py-2.5">Geolocation</th>
              <th className="px-3 py-2.5">ISP / ASN</th>
              <th className="px-3 py-2.5">Reverse DNS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--tl-border)] bg-[var(--tl-surface)] font-mono">
            {hops.map((h, i) => (
              <tr key={i} className={h.is_likely_origin ? 'bg-red-400/5' : ''}>
                <td className="px-3 py-2 font-bold text-[var(--tl-text-muted)]">{h.hop_order + 1}</td>
                <td className="px-3 py-2">
                  {h.is_likely_origin ? (
                    <span className="rounded border border-red-400/30 bg-red-400/10 px-2 py-0.5 font-bold text-red-300">
                      ORIGIN
                    </span>
                  ) : h.is_internal ? (
                    <span className="rounded border border-[var(--tl-border-strong)] bg-[var(--tl-surface-inset)] px-2 py-0.5 text-[var(--tl-text-muted)]">
                      INTERNAL
                    </span>
                  ) : (
                    <span className="rounded border border-emerald-400/25 bg-emerald-400/10 px-2 py-0.5 text-emerald-300">
                      RELAY
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 font-bold text-[var(--tl-text)]">{h.ip}</td>
                <td className="px-3 py-2 text-[var(--tl-text-secondary)]">
                  {h.is_internal ? (
                    'Local Network'
                  ) : isGuest ? (
                    <span className="text-[var(--tl-text-muted)] italic font-sans">[Restricted · Sign in]</span>
                  ) : (
                    `${h.city}, ${h.country}`
                  )}
                </td>
                <td className="max-w-[180px] truncate px-3 py-2 text-[var(--tl-text-secondary)]">
                  {isGuest && !h.is_internal ? (
                    <span className="text-[var(--tl-text-muted)] italic font-sans">[Restricted]</span>
                  ) : (
                    h.isp || 'N/A'
                  )}
                </td>
                <td className="max-w-[180px] truncate px-3 py-2 text-[var(--tl-text-secondary)]">
                  {isGuest && !h.is_internal ? (
                    <span className="text-[var(--tl-text-muted)] italic font-sans">[Restricted]</span>
                  ) : (
                    h.reverse_dns || '—'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

