import React, { useEffect, useState } from 'react';
import Navbar from './components/Navbar';
import EmailUploader from './components/EmailUploader';
import RiskScoreCard from './components/RiskScoreCard';
import ReasonList from './components/ReasonList';
import HopMap from './components/HopMap';
import ForensicChainViewer from './components/ForensicChainViewer';
import CasesView from './components/CasesView';
import SettingsModal from './components/SettingsModal';
import AuthModal from './components/AuthModal';
import AiBriefingCard from './components/AiBriefingCard';
import ReportPreviewCard from './components/ReportPreviewCard';
import {
  listEmails,
  getEmailDetail,
  deleteEmail,
  clearAllEmails,
  exportReportPdf,
  checkBackendHealth,
  getStoredUser,
  logoutUser,
} from './api/client';
import { Clock, Inbox, ChevronRight, Trash2, MapPinned, ListChecks, FolderOpen } from 'lucide-react';

const riskDotClass = (riskLevel) => {
  if (riskLevel === 'Critical') return 'bg-[var(--tl-critical)]';
  if (riskLevel === 'High') return 'bg-[var(--tl-high)]';
  if (riskLevel === 'Medium') return 'bg-[var(--tl-caution)]';
  return 'bg-[var(--tl-accent)]';
};

export default function App() {
  const [activeTab, setActiveTab] = useState('scanner');
  const [backendOnline, setBackendOnline] = useState(false);
  const [emails, setEmails] = useState([]);
  const [currentEmail, setCurrentEmail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [exportingReport, setExportingReport] = useState(false);
  const [maskPii, setMaskPii] = useState(false);

  const [user, setUser] = useState(getStoredUser());
  const [authModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    checkHealthAndLoad();
  }, []);

  const checkHealthAndLoad = async () => {
    const isOnline = await checkBackendHealth();
    setBackendOnline(isOnline);

    try {
      const emailList = await listEmails();
      setEmails(emailList);
      if (emailList.length > 0) loadEmail(emailList[0].id);
    } catch (err) {
      console.error('Error fetching email queue:', err);
    }
  };

  const loadEmail = async (id) => {
    try {
      setDetailError('');
      setLoadingDetail(true);
      const detail = await getEmailDetail(id);
      setCurrentEmail(detail);
    } catch (err) {
      console.error(err);
      setDetailError(err.message || 'Unable to load this investigation.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleScanComplete = (newEmail) => {
    setCurrentEmail(newEmail);
    listEmails().then((list) => setEmails(list));
    setActiveTab('scanner');
  };

  const handleExportPdf = async () => {
    if (!currentEmail) return;
    setExportingReport(true);
    try {
      const blob = await exportReportPdf(currentEmail.id, maskPii);
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `ThreatLens_Forensic_Report_${currentEmail.id.slice(0, 8)}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to export PDF: ' + err.message);
    } finally {
      setExportingReport(false);
    }
  };

  const handleDeleteEmail = async (id, event) => {
    if (event) event.stopPropagation();
    if (!window.confirm('Delete this incident from the investigation queue?')) return;
    try {
      await deleteEmail(id);
      const updated = emails.filter((email) => email.id !== id);
      setEmails(updated);
      if (currentEmail?.id === id) {
        if (updated.length > 0) loadEmail(updated[0].id);
        else setCurrentEmail(null);
      }
    } catch (err) {
      alert('Failed to delete incident: ' + err.message);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to clear all incidents from the queue?')) return;
    try {
      await clearAllEmails();
      setEmails([]);
      setCurrentEmail(null);
    } catch (err) {
      alert('Failed to clear queue: ' + err.message);
    }
  };

  const handleAuthSuccess = (userData) => {
    setUser({ email: userData.email, role: userData.role, full_name: userData.full_name });
  };

  const handleLogout = () => {
    logoutUser();
    setUser(null);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[var(--tl-canvas)] text-[var(--tl-text)] selection:bg-emerald-400/30 selection:text-white lg:pl-64">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        backendOnline={backendOnline}
        user={user}
        onOpenAuthModal={() => setAuthModalOpen(true)}
        onLogout={handleLogout}
      />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      <main className="mx-auto w-full min-w-0 max-w-[1600px] flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {activeTab === 'scanner' && (
          <div key="scanner" className="tl-workspace tl-page-transition space-y-7">
            <section className="tl-section-heading flex w-full min-w-0 flex-col justify-between gap-4 md:flex-row md:items-end">
              <div className="min-w-0 w-full">
                <p className="tl-eyebrow">Investigation console</p>
                <h1 className="mt-2 max-w-full break-words text-2xl font-semibold tracking-tight text-[var(--tl-text)] sm:text-3xl">
                  Analyze an email. Trace the source.
                </h1>
                <p className="mt-2 w-full max-w-2xl break-words text-sm leading-6 text-[var(--tl-text-secondary)]">
                  Review the existing threat score, header evidence, hop trail, and investigation record from one focused workspace.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-[var(--tl-text-muted)]">
                <span className={`h-2 w-2 rounded-full ${backendOnline ? 'bg-[var(--tl-accent)]' : 'bg-[var(--tl-critical)]'}`} />
                <span>{backendOnline ? 'Analysis engine connected' : 'Analysis engine offline'}</span>
              </div>
            </section>

            <EmailUploader onScanComplete={handleScanComplete} />

            {currentEmail && (
              <section className="space-y-3" aria-labelledby="threat-overview-heading">
                <div className="tl-section-heading">
                  <p className="tl-eyebrow">Summary</p>
                  <h2 id="threat-overview-heading" className="mt-1 text-lg font-semibold text-[var(--tl-text)]">Overall threat result</h2>
                </div>
                <RiskScoreCard email={currentEmail} onExport={handleExportPdf} isExporting={exportingReport} onVerifyChain={() => {}} />
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="Current analysis snapshot">
                  <div className="tl-kpi"><div className="tl-kpi-label">Risk score</div><div className="mt-2 flex items-baseline gap-1"><span className="tl-kpi-value">{currentEmail.risk_score}</span><span className="text-xs text-[var(--tl-text-muted)]">/100</span></div></div>
                  <div className="tl-kpi"><div className="tl-kpi-label">Findings</div><div className="mt-2 flex items-center gap-2"><ListChecks className="h-4 w-4 text-[var(--tl-accent)]" /><span className="tl-kpi-value">{currentEmail.reasons?.length || 0}</span></div></div>
                  <div className="tl-kpi"><div className="tl-kpi-label">Header hops</div><div className="mt-2 flex items-center gap-2"><MapPinned className="h-4 w-4 text-[var(--tl-info)]" /><span className="tl-kpi-value">{currentEmail.hops?.length || 0}</span></div></div>
                  <div className="tl-kpi"><div className="tl-kpi-label">Case link</div><div className="mt-2 flex items-center gap-2"><FolderOpen className="h-4 w-4 text-[var(--tl-caution)]" /><span className="text-sm font-semibold text-[var(--tl-text)]">{currentEmail.case_id ? 'Linked' : 'Unlinked'}</span></div></div>
                </div>
              </section>
            )}

            {emails.length > 0 && (
              <section className="tl-queue-panel p-3 sm:p-4" aria-labelledby="recent-analyses-heading">
                <div className="flex flex-col gap-3 border-b border-[var(--tl-border)] pb-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <Inbox className="h-4 w-4 text-[var(--tl-accent)]" />
                    <div>
                      <h2 id="recent-analyses-heading" className="text-sm font-semibold text-[var(--tl-text)]">Recent analyses</h2>
                      <p className="text-xs text-[var(--tl-text-muted)]">Select an existing incident to reopen its investigation.</p>
                    </div>
                    <span className="rounded-full border border-[var(--tl-border)] px-2 py-0.5 font-mono text-[10px] text-[var(--tl-text-muted)]">{emails.length}</span>
                  </div>
                  <button type="button" onClick={handleClearAll} title="Clear all incidents from the queue" className="tl-button-danger inline-flex items-center justify-center gap-1.5 self-start sm:self-auto">
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Clear queue</span>
                  </button>
                </div>

                <div className="tl-queue-list mt-3 divide-y divide-[var(--tl-border)] border-y border-[var(--tl-border)]">
                  {emails.map((email) => {
                    const isSelected = currentEmail?.id === email.id;
                    return (
                      <div key={email.id} className={`tl-queue-row grid min-w-0 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 px-2 py-2.5 text-xs transition-colors sm:px-3 ${isSelected ? 'bg-emerald-400/10 text-[var(--tl-text)]' : 'text-[var(--tl-text-secondary)] hover:bg-[var(--tl-surface-hover)]'}`}>
                        <button type="button" onClick={() => loadEmail(email.id)} className="flex min-w-0 items-center gap-2 text-left">
                          <span className={`h-2 w-2 shrink-0 rounded-full ${riskDotClass(email.risk_level)}`} />
                          <span className="min-w-0 truncate font-medium">{email.subject || email.sender}</span>
                        </button>
                        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--tl-text-muted)]">{email.risk_level} · {email.risk_score}</span>
                        <button type="button" onClick={(event) => handleDeleteEmail(email.id, event)} title="Delete this incident from queue" className="rounded-md p-1 text-[var(--tl-text-muted)] hover:bg-[var(--tl-surface-hover)] hover:text-[var(--tl-critical)]">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {loadingDetail && (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-400/25 bg-emerald-400/5 p-3 text-xs text-[var(--tl-text-secondary)]" role="status" aria-live="polite">
                <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--tl-accent)]" /> Loading the selected investigation…
              </div>
            )}

            {detailError && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-red-400/35 bg-red-400/10 p-3 text-xs text-red-300" role="alert" aria-live="assertive">
                <span>{detailError}</span>
                <button type="button" onClick={() => currentEmail && loadEmail(currentEmail.id)} className="font-semibold underline underline-offset-2">Retry</button>
              </div>
            )}

            {currentEmail && (
              <div className="space-y-5">
                <section className="tl-investigation-header flex flex-col justify-between gap-5 p-5 sm:p-6 lg:flex-row lg:items-center" aria-labelledby="active-investigation-heading">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--tl-text-muted)]">
                      <span>Active investigation</span>
                      <span className="text-[var(--tl-border-strong)]">·</span>
                      <Clock className="h-3.5 w-3.5" />
                      <span>{new Date(currentEmail.created_at).toLocaleString()}</span>
                    </div>
                    <h2 id="active-investigation-heading" className="mt-2 text-xl font-semibold tracking-tight text-[var(--tl-text)] sm:text-2xl break-words">
                      {currentEmail.subject || '(No Subject)'}
                    </h2>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--tl-text-secondary)]">
                      <span>From: <b className="font-mono text-[var(--tl-text)] break-all">{currentEmail.sender}</b></span>
                      {currentEmail.reply_to && <span>Reply-To: <b className="font-mono text-[var(--tl-text)] break-all">{currentEmail.reply_to}</b></span>}
                      <span>Domain: <b className="font-mono text-[var(--tl-text-secondary)] break-all">{currentEmail.sender_domain}</b></span>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {currentEmail.case_id && (
                      <button onClick={() => setActiveTab('cases')} className="tl-button-secondary inline-flex items-center gap-2">
                        <span>Correlated with case</span>
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    )}
                    <button onClick={() => handleDeleteEmail(currentEmail.id)} title="Delete this incident and its forensic records" className="tl-button-danger inline-flex items-center gap-1.5">
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Delete incident</span>
                    </button>
                  </div>
                </section>

                <section className="space-y-3" aria-labelledby="technical-evidence-heading">
                  <div className="tl-section-heading">
                    <p className="tl-eyebrow">Technical evidence</p>
                    <h2 id="technical-evidence-heading" className="mt-1 text-lg font-semibold text-[var(--tl-text)]">Existing IP and geolocation trail</h2>
                  </div>
                  <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] xl:items-start">
                    <div className="min-w-0 w-full">
                      <HopMap hops={currentEmail.hops || []} />
                    </div>
                    <section className="min-w-0 w-full space-y-3" aria-labelledby="findings-heading">
                      <div>
                        <p className="tl-eyebrow">Key findings</p>
                        <h2 id="findings-heading" className="mt-1 text-lg font-semibold text-[var(--tl-text)]">Why this email was classified this way</h2>
                      </div>
                      <ReasonList reasons={currentEmail.reasons || []} />
                    </section>
                  </div>
                </section>

                <section className="space-y-3" aria-labelledby="briefing-heading">
                  <div className="tl-section-heading">
                    <p className="tl-eyebrow">Supporting analysis</p>
                    <h2 id="briefing-heading" className="mt-1 text-lg font-semibold text-[var(--tl-text)]">Existing AI briefing</h2>
                  </div>
                  <AiBriefingCard emailId={currentEmail.id} />
                </section>

                <section className="space-y-3" aria-labelledby="forensics-heading">
                  <div>
                    <p className="tl-eyebrow">Detailed forensics</p>
                    <h2 id="forensics-heading" className="mt-1 text-lg font-semibold text-[var(--tl-text)]">Evidence demonstration record</h2>
                  </div>
                  <ForensicChainViewer emailId={currentEmail.id} />
                </section>

              </div>
            )}
          </div>
        )}

        {activeTab === 'report' && (
          <div key="report" className="tl-page-transition space-y-5">
            <section className="border-b border-[var(--tl-border)] pb-4">
              <p className="tl-eyebrow">Report interface</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--tl-text)] sm:text-3xl">Preview and export the existing report</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--tl-text-secondary)]">A read-only preview of the sections produced by the existing PDF generator.</p>
            </section>
            {currentEmail ? (
              <ReportPreviewCard email={currentEmail} maskPii={maskPii} />
            ) : (
              <div className="tl-panel flex min-h-[260px] flex-col items-center justify-center gap-3 p-8 text-center">
                <p className="text-sm text-[var(--tl-text-secondary)]">Select an investigation first to preview its report.</p>
                <button type="button" onClick={() => setActiveTab('scanner')} className="tl-button-secondary">Open Scan & Investigate</button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'cases' && (
          <div key="cases" className="tl-page-transition">
            <CasesView onBackToScanner={() => setActiveTab('scanner')} onSelectEmail={(id) => { loadEmail(id); setActiveTab('scanner'); }} />
          </div>
        )}

        {activeTab === 'settings' && <div key="settings" className="tl-page-transition"><SettingsModal maskPii={maskPii} setMaskPii={setMaskPii} /></div>}
      </main>

      <footer className="border-t border-[var(--tl-border)] bg-[var(--tl-surface-inset)] py-4 text-center font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--tl-text-muted)]">
        ThreatLens Platform · Smart India Hackathon 2026 · AICTE Cyber Security Cell (PS ID: 26106)
      </footer>
    </div>
  );
}
