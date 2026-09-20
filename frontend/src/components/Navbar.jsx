import React from 'react';
import { ShieldAlert, FolderKanban, Sliders, FileText, LogIn, LogOut, Activity } from 'lucide-react';

const navItems = [
  { id: 'scanner', label: 'Scan & Investigate', icon: ShieldAlert },
  { id: 'cases', label: 'Case Linker', icon: FolderKanban },
  { id: 'report', label: 'Report Interface', icon: FileText },
  { id: 'settings', label: 'Governance & Vault', icon: Sliders },
];

export default function Navbar({
  activeTab,
  setActiveTab,
  backendOnline,
  user,
  onOpenAuthModal,
  onLogout,
}) {
  const displayName = user?.full_name || user?.email?.split('@')[0] || 'Guest analyst';
  const roleLabel = user?.role || 'Read-only session';

  const renderNavigation = (compact = false) => (
    <nav className={compact ? 'flex min-w-max items-center gap-1' : 'space-y-1'} aria-label="Primary navigation">
      {navItems.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => setActiveTab(id)}
          aria-current={activeTab === id ? 'page' : undefined}
          className={`flex items-center gap-3 rounded-lg border-l-2 text-left text-xs font-semibold transition-colors ${
            compact ? 'shrink-0 px-3 py-2' : 'w-full px-3 py-2.5'
          } ${
            activeTab === id
              ? 'border-[var(--tl-accent)] bg-[var(--tl-surface-raised)] text-[var(--tl-text)]'
              : 'border-transparent text-[var(--tl-text-muted)] hover:border-[var(--tl-border-strong)] hover:bg-[var(--tl-surface-hover)] hover:text-[var(--tl-text)]'
          }`}
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col border-r border-[var(--tl-border)] bg-[var(--tl-surface-inset)] lg:flex" aria-label="ThreatLens workspace navigation">
        <div className="border-b border-[var(--tl-border)] px-5 py-5">
          <div
            className="flex cursor-pointer items-center gap-3"
            role="button"
            tabIndex={0}
            aria-label="Return to Scan and Investigate"
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setActiveTab('scanner');
              }
            }}
            onClick={() => setActiveTab('scanner')}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-emerald-400/40 bg-emerald-400/10">
              <ShieldAlert className="h-5 w-5 text-[var(--tl-accent)]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-[var(--tl-text)]">ThreatLens</span>
                <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-1.5 py-0.5 text-[9px] font-semibold text-[var(--tl-accent)]">v2.0</span>
              </div>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--tl-text-muted)]">Detect · Trace · Prove</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6">
          <p className="mb-2 px-3 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--tl-text-muted)]">Workspace</p>
          {renderNavigation()}
        </div>

        <div className="border-t border-[var(--tl-border)] p-4">
          <div className="flex items-center gap-2 rounded-lg border border-[var(--tl-border)] bg-[var(--tl-surface)] p-3">
            <Activity className="h-4 w-4 shrink-0 text-[var(--tl-accent)]" />
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-[var(--tl-text)]">{displayName}</p>
              <p className="truncate font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--tl-text-muted)]">{roleLabel}</p>
            </div>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-40 border-b border-[var(--tl-border)] bg-[rgba(9,10,10,0.97)] backdrop-blur-md">
        <div className="mx-auto flex min-h-[76px] w-full max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--tl-text-muted)]">
              <span>ThreatLens</span>
              <span className="text-[var(--tl-border-strong)]">/</span>
              <span>{activeTab === 'scanner' ? 'Investigation workspace' : activeTab === 'cases' ? 'Case linker' : activeTab === 'report' ? 'Forensic report' : 'Governance controls'}</span>
            </div>
            <h1 className="mt-1 truncate text-lg font-semibold tracking-tight text-[var(--tl-text)] sm:text-xl">
              {activeTab === 'scanner' ? 'Scan & Investigate' : activeTab === 'cases' ? 'Case Linker' : activeTab === 'report' ? 'Report Interface' : 'Governance & Vault'}
            </h1>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden items-center gap-2 rounded-full border border-[var(--tl-border)] bg-[var(--tl-surface)] px-2.5 py-1.5 text-xs sm:flex">
              <span className={`h-1.5 w-1.5 rounded-full ${backendOnline ? 'bg-[var(--tl-accent)]' : 'bg-[var(--tl-critical)]'}`} />
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--tl-text-secondary)]">{backendOnline ? 'ONLINE' : 'OFFLINE'}</span>
            </div>

            {user ? (
              <div className="flex items-center gap-2 rounded-lg border border-[var(--tl-border)] bg-[var(--tl-surface)] p-1.5 pl-2.5">
                <div className="hidden flex-col text-right sm:flex">
                  <span className="text-xs font-bold leading-tight text-[var(--tl-text)]">{displayName}</span>
                  <span className="font-mono text-[10px] font-semibold uppercase text-[var(--tl-accent)]">{user.role}</span>
                </div>
                <button type="button" onClick={onLogout} title="Log Out" className="rounded-md p-1.5 text-[var(--tl-text-muted)] transition-colors hover:bg-[var(--tl-surface-hover)] hover:text-[var(--tl-critical)]">
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button type="button" onClick={onOpenAuthModal} aria-label="Sign in or create an account" title="Sign in or create an account" className="tl-button-primary flex items-center gap-1.5">
                <LogIn className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sign In / Sign Up</span>
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto border-t border-[var(--tl-border)] px-4 py-2 lg:hidden">
          {renderNavigation(true)}
        </div>
      </header>
    </>
  );
}
