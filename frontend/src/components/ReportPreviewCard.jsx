import React from 'react';
import { FileText, Hash, MapPinned, ShieldAlert, ClipboardCheck } from 'lucide-react';

const riskClass = (level) => {
  if (level === 'Critical') return 'border-red-400/30 bg-red-400/10 text-red-300';
  if (level === 'High') return 'border-orange-400/30 bg-orange-400/10 text-orange-300';
  if (level === 'Medium') return 'border-amber-400/30 bg-amber-400/10 text-amber-300';
  return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300';
};

export default function ReportPreviewCard({ email, maskPii }) {
  if (!email) return null;

  return (
    <div className="tl-evidence-surface overflow-hidden" aria-label="Forensic PDF report preview">
      <div className="flex flex-col justify-between gap-4 border-b border-[var(--tl-border)] p-5 sm:flex-row sm:items-center sm:p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-lg border border-emerald-400/25 bg-emerald-400/10 p-2 text-[var(--tl-accent)]">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <p className="tl-eyebrow">Report output</p>
            <h3 className="mt-1 text-base font-semibold text-[var(--tl-text)]">Forensic incident report preview</h3>
            <p className="mt-1 text-xs leading-5 text-[var(--tl-text-muted)]">A read-only preview of the sections produced by the existing PDF generator.</p>
          </div>
        </div>
        <div className="rounded-md border border-[var(--tl-border)] bg-[var(--tl-surface-inset)] px-3 py-2 text-right">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--tl-text-muted)]">Export format</p>
          <p className="mt-1 font-mono text-xs font-semibold text-[var(--tl-text-secondary)]">PDF · existing generator</p>
          <p className="mt-1 text-[10px] text-[var(--tl-text-muted)]">PII masking: {maskPii ? 'enabled' : 'disabled'}</p>
        </div>
      </div>

      <div className="space-y-4 p-5 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="tl-panel-inset p-3">
            <p className="tl-kpi-label">Incident</p>
            <p className="mt-1 truncate font-mono text-xs text-[var(--tl-text)]" title={email.id}>{email.id}</p>
          </div>
          <div className="tl-panel-inset p-3">
            <p className="tl-kpi-label">Risk result</p>
            <span className={`mt-1 inline-flex rounded-full border px-2 py-1 text-[10px] font-bold uppercase ${riskClass(email.risk_level)}`}>
              {email.risk_level} · {email.risk_score}/100
            </span>
          </div>
          <div className="tl-panel-inset p-3">
            <p className="tl-kpi-label">Origin IP</p>
            <p className="mt-1 font-mono text-xs text-[var(--tl-text)]">{email.origin_ip || 'N/A'}</p>
          </div>
          <div className="tl-panel-inset p-3">
            <p className="tl-kpi-label">Sender</p>
            <p className="mt-1 truncate text-xs text-[var(--tl-text)]" title={email.sender}>{email.sender}</p>
          </div>
          <div className="tl-panel-inset p-3 sm:col-span-2">
            <p className="tl-kpi-label">Subject</p>
            <p className="mt-1 truncate text-xs text-[var(--tl-text)]" title={email.subject || '(No Subject)'}>{email.subject || '(No Subject)'}</p>
          </div>
        </div>

        <div className="grid items-start gap-3 lg:grid-cols-2">
          <details open className="tl-panel-inset group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-sm font-semibold text-[var(--tl-text)]">
              <span className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-[var(--tl-accent)]" />Threat assessment</span>
              <span className="font-mono text-[11px] text-[var(--tl-text-muted)]">{email.reasons?.length || 0} findings</span>
            </summary>
            <div className="space-y-2 border-t border-[var(--tl-border)] p-4">
              {(email.reasons || []).length > 0 ? email.reasons.map((reason, index) => (
                <div key={reason.id || index} className="flex items-start justify-between gap-3 text-xs">
                  <div>
                    <span className="font-mono text-[10px] font-bold uppercase text-[var(--tl-accent)]">{reason.category}</span>
                    <p className="mt-1 leading-5 text-[var(--tl-text-secondary)]">{reason.reason}</p>
                  </div>
                  <span className="shrink-0 font-mono text-[11px] font-bold text-red-300">+{reason.weight}</span>
                </div>
              )) : <p className="text-xs text-[var(--tl-text-muted)]">No active threat indicators were returned.</p>}
            </div>
          </details>

          <details open className="tl-panel-inset group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-sm font-semibold text-[var(--tl-text)]">
              <span className="flex items-center gap-2"><MapPinned className="h-4 w-4 text-[var(--tl-info)]" />Origin hop sequence</span>
              <span className="font-mono text-[11px] text-[var(--tl-text-muted)]">{email.hops?.length || 0} hops</span>
            </summary>
            <div className="overflow-x-auto border-t border-[var(--tl-border)]">
              {(email.hops || []).length > 0 ? (
                <table className="w-full text-left text-xs">
                  <caption className="sr-only">Report preview of origin hop sequence</caption>
                  <thead className="bg-[var(--tl-surface-inset)] font-mono text-[10px] uppercase text-[var(--tl-text-muted)]">
                    <tr><th className="px-4 py-2">Hop</th><th className="px-4 py-2">IP</th><th className="px-4 py-2">Location</th><th className="px-4 py-2">Type</th></tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--tl-border)]">
                    {email.hops.map((hop, index) => (
                      <tr key={hop.id || index}>
                        <td className="px-4 py-2 font-mono text-[var(--tl-text-muted)]">{hop.hop_order + 1}</td>
                        <td className="px-4 py-2 font-mono text-[var(--tl-text)]">{hop.ip}</td>
                        <td className="px-4 py-2 text-[var(--tl-text-secondary)]">{hop.is_internal ? 'Local Network' : `${hop.city}, ${hop.country}`}</td>
                        <td className="px-4 py-2 text-[var(--tl-text-secondary)]">{hop.is_likely_origin ? 'Origin' : hop.is_internal ? 'Internal' : 'Relay'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p className="p-4 text-xs text-[var(--tl-text-muted)]">No hop records were returned.</p>}
            </div>
          </details>
        </div>

        <div className="tl-panel-inset flex items-start gap-3 p-4">
          <Hash className="mt-0.5 h-4 w-4 shrink-0 text-[var(--tl-accent)]" />
          <div>
            <p className="text-xs font-semibold text-[var(--tl-text)]">Integrity and metadata</p>
            <p className="mt-1 break-all font-mono text-[11px] text-[var(--tl-text-secondary)]">Raw SHA-256: {email.raw_hash}</p>
            <p className="mt-1 text-xs leading-5 text-[var(--tl-text-muted)]">The existing PDF also includes the Evidence Vault audit trail generated by the backend. The audit demonstration remains available in the detailed forensics section.</p>
          </div>
          <ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--tl-text-muted)]" />
        </div>
      </div>
    </div>
  );
}
