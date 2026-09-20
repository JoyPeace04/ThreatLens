import React from 'react';
import { ShieldCheck, FileDown, CheckCircle2, XCircle, AlertTriangle, Loader2 } from 'lucide-react';

export default function RiskScoreCard({ email, onExport, onVerifyChain, isVerifying, isExporting }) {
  if (!email) return null;

  const score = email.risk_score;
  const level = email.risk_level;

  let colorClass = 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300';
  let barColor = 'bg-[var(--tl-accent)]';
  let scoreClass = 'text-[var(--tl-accent)]';
  let badgeText = 'LOW RISK';

  if (level === 'Critical') {
    colorClass = 'border-red-400/30 bg-red-400/10 text-red-300';
    barColor = 'bg-[var(--tl-critical)]';
    scoreClass = 'text-red-300';
    badgeText = 'CRITICAL THREAT';
  } else if (level === 'High') {
    colorClass = 'border-orange-400/30 bg-orange-400/10 text-orange-300';
    barColor = 'bg-[var(--tl-high)]';
    scoreClass = 'text-orange-300';
    badgeText = 'HIGH RISK';
  } else if (level === 'Medium') {
    colorClass = 'border-amber-400/30 bg-amber-400/10 text-amber-300';
    barColor = 'bg-[var(--tl-caution)]';
    scoreClass = 'text-amber-300';
    badgeText = 'SUSPICIOUS';
  }

  let authSummary = { spf: 'neutral', dkim: 'neutral', dmarc: 'neutral' };
  try {
    if (email.auth_results) authSummary = JSON.parse(email.auth_results);
  } catch {
    // Keep neutral fallbacks when an existing response contains malformed JSON.
  }

  const renderAuthPill = (name, status) => {
    const isPass = status === 'pass';
    const isFail = status === 'fail';
    return (
      <div className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-mono ${
        isPass
          ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
          : isFail
          ? 'border-red-400/30 bg-red-400/10 font-bold text-red-300'
          : 'border-[var(--tl-border)] bg-[var(--tl-surface-inset)] text-[var(--tl-text-muted)]'
      }`}>
        {isPass ? <CheckCircle2 className="h-3.5 w-3.5" /> : isFail ? <XCircle className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
        <span>{name.toUpperCase()}: {status.toUpperCase()}</span>
      </div>
    );
  };

  return (
    <div className={`tl-risk-surface tl-risk-${String(level).toLowerCase()} flex flex-col justify-between p-5 sm:p-6`} aria-label="Overall email risk result">
      <div>
        <div className="flex items-center justify-between gap-3">
          <span className="tl-eyebrow">Risk assessment</span>
          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-wide ${colorClass}`}>{badgeText}</span>
        </div>

        <div className="mt-5 flex items-baseline gap-2">
          <span className={`tl-risk-score text-5xl font-semibold tracking-tight ${scoreClass}`}>{score}</span>
          <span className="text-sm font-semibold text-[var(--tl-text-muted)]">/ 100</span>
        </div>
        <p className="mt-1 text-xs text-[var(--tl-text-secondary)]">Current response classification: <span className="font-semibold text-[var(--tl-text)]">{level}</span></p>

        <div className="mt-3 h-2 w-full overflow-hidden rounded-full border border-[var(--tl-border)] bg-[var(--tl-surface-inset)]" role="progressbar" aria-label="Risk score" aria-valuemin="0" aria-valuemax="100" aria-valuenow={score}>
          <div className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`} style={{ width: `${score}%` }} />
        </div>

        <div className="mt-5 border-t border-[var(--tl-border)] pt-4">
          <span className="tl-eyebrow mb-2 block">Authentication findings · RFC 7601</span>
          <div className="flex flex-wrap gap-2">
            {renderAuthPill('spf', authSummary.spf || 'neutral')}
            {renderAuthPill('dkim', authSummary.dkim || 'neutral')}
            {renderAuthPill('dmarc', authSummary.dmarc || 'neutral')}
          </div>
        </div>

        <div className="mt-4 space-y-1.5 border-t border-[var(--tl-border)] pt-3 text-xs text-[var(--tl-text-secondary)]">
          <div className="flex justify-between gap-4"><span className="text-[var(--tl-text-muted)]">Origin IP:</span><span className="font-mono font-semibold text-[var(--tl-text)]">{email.origin_ip || 'Internal / N/A'}</span></div>
          <div className="flex justify-between gap-4"><span className="text-[var(--tl-text-muted)]">Raw SHA-256:</span><span className="max-w-[170px] truncate font-mono text-[11px] text-[var(--tl-text-secondary)]" title={email.raw_hash}>{email.raw_hash}</span></div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-2 border-t border-[var(--tl-border)] pt-4">
        <button onClick={onVerifyChain} disabled={isVerifying} className="tl-button-secondary inline-flex items-center justify-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-[var(--tl-accent)]" />
          <span>Verify chain</span>
        </button>
        <button onClick={onExport} disabled={isExporting} className="tl-button-primary inline-flex items-center justify-center gap-1.5">
          {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
          <span>{isExporting ? 'Preparing PDF...' : 'Export PDF'}</span>
        </button>
      </div>
    </div>
  );
}
