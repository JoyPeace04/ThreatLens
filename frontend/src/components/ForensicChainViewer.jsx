import React, { useState } from 'react';
import { Link, RefreshCw, Bug, CheckCircle2, XCircle } from 'lucide-react';
import { verifyChain, simulateTamper } from '../api/client';

export default function ForensicChainViewer({ emailId, onChainVerified }) {
  const [verifying, setVerifying] = useState(false);
  const [auditResult, setAuditResult] = useState(null);
  const [tampering, setTampering] = useState(false);

  const handleVerify = async () => {
    if (!emailId) return;
    setVerifying(true);
    try {
      const result = await verifyChain(emailId);
      setAuditResult(result);
      if (onChainVerified) onChainVerified(result);
    } catch (err) {
      setAuditResult({ is_valid: false, message: err.message || 'Audit verification request failed', entries: [] });
    } finally {
      setVerifying(false);
    }
  };

  const handleSimulateTamper = async () => {
    let result = auditResult;
    if (!result?.entries?.length) {
      result = await verifyChain(emailId);
      setAuditResult(result);
      if (!result.entries?.length) return;
    }

    setTampering(true);
    try {
      await simulateTamper(result.entries[0].id, 'unauthorized_intruder');
      setAuditResult(await verifyChain(emailId));
    } catch (err) {
      alert('Tampering simulation failed: ' + err.message);
    } finally {
      setTampering(false);
    }
  };

  return (
    <div className="tl-evidence-surface space-y-4 p-5 sm:p-6" aria-label="Forensic evidence demonstration">
      <div className="flex flex-col justify-between gap-3 border-b border-[var(--tl-border)] pb-3 sm:flex-row sm:items-center">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--tl-text)]">
            <Link className="h-4 w-4 text-[var(--tl-accent)]" />
            Evidence Vault demonstration
          </h3>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-[var(--tl-text-muted)]">
            Simulated SHA-256 chain exercise using the existing forensic log data. This is a demonstration, not a production security guarantee.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button onClick={handleSimulateTamper} disabled={tampering || !emailId} className="tl-button-danger inline-flex items-center gap-1.5" title="Deliberately alter a log entry for the existing demonstration">
            <Bug className="h-3.5 w-3.5" />
            <span>{tampering ? 'Simulating...' : 'Simulate tampering'}</span>
          </button>
          <button onClick={handleVerify} disabled={verifying || !emailId} className="tl-button-secondary inline-flex items-center gap-1.5 border-emerald-400/30 text-[var(--tl-accent)] hover:border-emerald-400/50">
            <RefreshCw className={`h-3.5 w-3.5 ${verifying ? 'animate-spin' : ''}`} />
            <span>{verifying ? 'Checking...' : 'Run demonstration check'}</span>
          </button>
        </div>
      </div>

      {auditResult && (
        <div className={`flex items-start gap-3 rounded-lg border p-4 ${auditResult.is_valid ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : 'border-red-400/40 bg-red-400/10 text-red-300'}`} role="status" aria-live="polite">
          <div className="mt-0.5 shrink-0">
            {auditResult.is_valid ? <CheckCircle2 className="h-5 w-5 text-[var(--tl-accent)]" /> : <XCircle className="h-5 w-5 animate-pulse text-[var(--tl-critical)]" />}
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider">{auditResult.is_valid ? 'Demonstration check passed' : 'Demonstration alert: simulated chain mismatch'}</div>
            <p className="mt-1 text-xs leading-relaxed">{auditResult.message}</p>
            {!auditResult.is_valid && auditResult.broken_entry_id && (
              <div className="mt-2 rounded border border-red-400/30 bg-red-950/40 p-2 font-mono text-[11px] text-red-200">
                Altered Record ID: <span className="font-bold text-white">{auditResult.broken_entry_id}</span>
                <br />
                Broken Index: #{auditResult.broken_index + 1}
              </div>
            )}
          </div>
        </div>
      )}

      {auditResult?.entries?.length ? (
        <div className="space-y-3 pt-2">
          {auditResult.entries.map((entry, index) => {
            const isBroken = !auditResult.is_valid && auditResult.broken_entry_id === entry.id;
            return (
              <div key={entry.id} className={`rounded-lg border p-4 ${isBroken ? 'border-red-400/50 bg-red-400/10' : 'border-[var(--tl-border)] bg-[var(--tl-surface-inset)]'}`}>
                <div className="mb-2 flex flex-col gap-2 border-b border-[var(--tl-border)] pb-2 text-xs sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded border border-emerald-400/25 bg-emerald-400/10 px-2 py-0.5 font-mono font-bold text-emerald-300">BLOCK #{index + 1}</span>
                    <span className="font-semibold uppercase text-[var(--tl-text)]">{entry.action}</span>
                  </div>
                  <div className="flex items-center gap-3 font-mono text-[11px] text-[var(--tl-text-muted)]">
                    <span>Actor: <b className="text-[var(--tl-text-secondary)]">{entry.actor}</b></span>
                    <span>{new Date(entry.timestamp).toLocaleTimeString()} UTC</span>
                  </div>
                </div>
                <div className="space-y-1.5 font-mono text-xs">
                  <div className="flex flex-col text-[var(--tl-text-muted)] sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-[11px]">Previous Hash Pointer (prev_hash):</span>
                    <span className="max-w-[320px] truncate text-[11px] text-[var(--tl-text-secondary)]" title={entry.prev_hash}>{entry.prev_hash}</span>
                  </div>
                  <div className="flex flex-col text-[var(--tl-text-muted)] sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-[11px]">Computed Entry Digest (entry_hash):</span>
                    <span className={`max-w-[320px] truncate text-[11px] font-bold ${isBroken ? 'text-red-300' : 'text-emerald-300'}`} title={entry.entry_hash}>{entry.entry_hash}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="tl-panel-inset p-6 text-center text-xs text-[var(--tl-text-muted)]">
          Click <span className="font-semibold text-[var(--tl-accent)]">“Run demonstration check”</span> to inspect the existing log for this email.
        </div>
      )}
    </div>
  );
}
