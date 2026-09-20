import React from 'react';
import { AlertCircle, ShieldAlert, Globe, Link2, Bot, CheckCircle } from 'lucide-react';

export default function ReasonList({ reasons = [] }) {
  const getCategoryIcon = (category) => {
    switch (category) {
      case 'HEADER_AUTH':
        return <ShieldAlert className="h-4 w-4 text-red-300" />;
      case 'DOMAIN_SPOOF':
        return <Globe className="h-4 w-4 text-orange-300" />;
      case 'URL_THREAT':
        return <Link2 className="h-4 w-4 text-red-300" />;
      case 'ML_CONTENT':
        return <Bot className="h-4 w-4 text-[var(--tl-text-secondary)]" />;
      default:
        return <CheckCircle className="h-4 w-4 text-emerald-300" />;
    }
  };

  const getCategoryBadge = (category) => {
    switch (category) {
      case 'HEADER_AUTH':
        return 'bg-red-400/10 text-red-300 border-red-400/25';
      case 'DOMAIN_SPOOF':
        return 'bg-orange-400/10 text-orange-300 border-orange-400/25';
      case 'URL_THREAT':
        return 'bg-red-400/10 text-red-300 border-red-400/25';
      case 'ML_CONTENT':
        return 'border-[var(--tl-border-strong)] bg-[var(--tl-surface-hover)] text-[var(--tl-text-secondary)]';
      default:
        return 'bg-emerald-400/10 text-emerald-300 border-emerald-400/25';
    }
  };

  return (
    <div className="tl-evidence-list min-w-0 p-5 sm:p-6" aria-label="Existing risk findings">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--tl-border)] pb-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--tl-text)]">
          <AlertCircle className="h-4 w-4 text-[var(--tl-accent)]" />
          Signal breakdown
        </h3>
        <span className="shrink-0 font-mono text-xs text-[var(--tl-text-muted)]">
          {reasons.length} {reasons.length === 1 ? 'finding' : 'findings'}
        </span>
      </div>

      <div className="mt-4 space-y-2.5" role="list" aria-label="Risk findings">
        {reasons.length === 0 ? (
          <div className="tl-panel-inset p-4 text-center text-xs text-[var(--tl-text-muted)]">
            No active threat indicators detected.
          </div>
        ) : (
          reasons.map((r, i) => (
            <div
              key={r.id || i}
              role="listitem"
              className="flex items-start justify-between gap-3 rounded-lg border border-[var(--tl-border)] bg-[var(--tl-surface-inset)] p-3 transition-colors hover:border-[var(--tl-border-strong)]"
            >
              <div className="flex min-w-0 items-start space-x-3">
                <div className="mt-0.5 shrink-0 rounded-md border border-[var(--tl-border)] bg-[var(--tl-surface)] p-1.5">
                  {getCategoryIcon(r.category)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`rounded border px-2 py-0.5 text-[10px] font-mono font-bold ${getCategoryBadge(
                        r.category
                      )}`}
                    >
                      {r.category}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-[var(--tl-text-secondary)] break-words">{r.reason}</p>
                </div>
              </div>

              <div className="shrink-0 rounded border border-red-400/25 bg-red-400/10 px-2 py-0.5 font-mono text-xs font-bold text-red-300">
                +{r.weight}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
