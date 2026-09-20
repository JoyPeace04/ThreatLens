import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, FolderKanban, Globe, Mail, RefreshCw, Server } from 'lucide-react';
import { listCases, getCaseDetail } from '../api/client';

const riskClass = (level) => {
  if (level === 'Critical') return 'border-red-400/30 bg-red-400/10 text-red-300';
  if (level === 'High') return 'border-orange-400/30 bg-orange-400/10 text-orange-300';
  if (level === 'Medium') return 'border-amber-400/30 bg-amber-400/10 text-amber-300';
  return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300';
};

export default function CasesView({ onSelectEmail, onBackToScanner }) {
  const [cases, setCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');

  const loadCaseDetails = async (caseId) => {
    try {
      setError('');
      setDetailLoading(true);
      const detail = await getCaseDetail(caseId);
      setSelectedCase(detail);
    } catch (err) {
      setError(err.message || 'Unable to load case details.');
    } finally {
      setDetailLoading(false);
    }
  };

  const fetchCases = async () => {
    try {
      setError('');
      setLoading(true);
      const data = await listCases();
      setCases(data);
      if (data.length > 0) await loadCaseDetails(data[0].id);
      else setSelectedCase(null);
    } catch (err) {
      setError(err.message || 'Unable to load cases.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="tl-eyebrow">Case workspace</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--tl-text)]">Case linker</h1>
          <p className="mt-1 text-sm text-[var(--tl-text-secondary)]">Review existing incident clusters and return to an investigation when needed.</p>
        </div>
        {onBackToScanner && (
          <button type="button" onClick={onBackToScanner} className="tl-button-secondary inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to investigation</span>
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-red-400/35 bg-red-400/10 p-3 text-xs text-red-300" role="alert" aria-live="assertive">
          <span>{error}</span>
          <button type="button" onClick={fetchCases} className="font-semibold underline underline-offset-2">Retry</button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <section className="tl-panel space-y-4 p-5" aria-labelledby="case-list-heading">
          <div className="flex items-center justify-between border-b border-[var(--tl-border)] pb-3">
            <h2 id="case-list-heading" className="flex items-center gap-2 text-sm font-semibold text-[var(--tl-text)]">
              <FolderKanban className="h-4 w-4 text-[var(--tl-accent)]" />
              Active threat cases
            </h2>
            <span className="font-mono text-xs text-[var(--tl-text-muted)]">{cases.length}</span>
          </div>

          {loading && cases.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg border border-[var(--tl-border)] bg-[var(--tl-surface-inset)] p-4 text-xs text-[var(--tl-text-muted)]" role="status">
              <RefreshCw className="h-4 w-4 animate-spin text-[var(--tl-accent)]" /> Loading cases…
            </div>
          ) : cases.length === 0 ? (
            <div className="tl-panel-inset p-6 text-center text-xs text-[var(--tl-text-muted)]">No cases are available yet.</div>
          ) : (
            <div className="space-y-2.5">
              {cases.map((item) => {
                const isSelected = selectedCase?.id === item.id;
                return (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => loadCaseDetails(item.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        loadCaseDetails(item.id);
                      }
                    }}
                    className={`cursor-pointer rounded-lg border p-3.5 transition-colors ${isSelected ? 'border-emerald-400/50 bg-emerald-400/10' : 'border-[var(--tl-border)] bg-[var(--tl-surface-inset)] hover:border-[var(--tl-border-strong)]'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-1.5">
                        {item.indicator_type === 'IP' ? <Server className="h-3.5 w-3.5 shrink-0 text-red-300" /> : <Globe className="h-3.5 w-3.5 shrink-0 text-amber-300" />}
                        <span className="truncate text-xs font-semibold text-[var(--tl-text)]">{item.title}</span>
                      </div>
                      <span className="shrink-0 rounded border border-[var(--tl-border-strong)] px-2 py-0.5 font-mono text-[10px] text-[var(--tl-text-secondary)]">{item.status}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2 font-mono text-xs text-[var(--tl-text-muted)]">
                      <span className="truncate">Shared {item.indicator_type}: <b className="text-[var(--tl-text-secondary)]">{item.shared_indicator}</b></span>
                      <span className="shrink-0 text-[var(--tl-accent)]">{item.email_count} emails</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="tl-panel space-y-5 p-5 sm:p-6 lg:col-span-2" aria-labelledby="case-detail-heading">
          {detailLoading ? (
            <div className="flex min-h-[280px] items-center justify-center gap-2 text-xs text-[var(--tl-text-muted)]" role="status">
              <RefreshCw className="h-4 w-4 animate-spin text-[var(--tl-accent)]" /> Loading case details…
            </div>
          ) : selectedCase ? (
            <>
              <div className="border-b border-[var(--tl-border)] pb-4">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div>
                    <span className="rounded border border-emerald-400/25 bg-emerald-400/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-emerald-300">Case cluster</span>
                    <h2 id="case-detail-heading" className="mt-2 text-xl font-semibold text-[var(--tl-text)]">{selectedCase.title}</h2>
                    <p className="mt-1 text-xs text-[var(--tl-text-secondary)]">{selectedCase.notes || 'No notes available.'}</p>
                  </div>
                  <div className="sm:text-right">
                    <div className="text-xs text-[var(--tl-text-muted)]">Max threat score</div>
                    <div className="mt-1 text-2xl font-semibold text-[var(--tl-critical)]">{selectedCase.highest_risk_score} / 100</div>
                  </div>
                </div>

                <div className="tl-panel-inset mt-4 flex flex-col gap-2 p-3 text-xs sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-[var(--tl-text-muted)]">Correlated {selectedCase.indicator_type} indicator</span>
                  <span className="break-all rounded border border-red-400/25 bg-red-400/10 px-2.5 py-1 font-mono text-sm font-bold text-red-300">{selectedCase.shared_indicator}</span>
                </div>
              </div>

              <div>
                <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--tl-text-muted)]">
                  <Mail className="h-3.5 w-3.5 text-[var(--tl-accent)]" /> Linked incidents ({selectedCase.emails.length})
                </h3>
                {selectedCase.emails.length === 0 ? (
                  <div className="tl-panel-inset p-8 text-center text-xs text-[var(--tl-text-muted)]">No emails are currently linked to this case.</div>
                ) : (
                  <div className="space-y-2">
                    {selectedCase.emails.map((email) => (
                      <div
                        key={email.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => onSelectEmail(email.id)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            onSelectEmail(email.id);
                          }
                        }}
                        className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-[var(--tl-border)] bg-[var(--tl-surface-inset)] p-3.5 transition-colors hover:border-emerald-400/40 hover:bg-[var(--tl-surface-hover)]"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded border px-2 py-0.5 font-mono text-[10px] font-bold ${riskClass(email.risk_level)}`}>{email.risk_level.toUpperCase()} ({email.risk_score})</span>
                            <span className="truncate text-xs font-semibold text-[var(--tl-text)]">{email.subject || '(No Subject)'}</span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-[var(--tl-text-muted)]">
                            <span>From: {email.sender}</span>
                            <span>Origin IP: {email.origin_ip || 'N/A'}</span>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1 text-xs font-semibold text-[var(--tl-accent)]">
                          <span>Investigate</span><ArrowRight className="h-3.5 w-3.5" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex min-h-[280px] items-center justify-center text-center text-xs text-[var(--tl-text-muted)]">Select a case to view linked incidents.</div>
          )}
        </section>
      </div>
    </div>
  );
}
