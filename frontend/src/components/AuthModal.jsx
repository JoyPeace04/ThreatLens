import React, { useEffect, useState } from 'react';
import { ShieldCheck, Mail, Lock, User, X, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { loginUser, signupUser } from '../api/client';

export default function AuthModal({ isOpen, onClose, onAuthSuccess, initialMode = 'login', fullPage = false }) {
  const [mode, setMode] = useState(initialMode); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('analyst');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return undefined;
    setMode(initialMode);
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, initialMode]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    setLoading(true);
    try {
      let data;
      if (mode === 'login') {
        data = await loginUser(email, password);
      } else {
        if (!fullName.trim()) {
          setError('Please provide your full name or callsign.');
          setLoading(false);
          return;
        }
        data = await signupUser(email, password, fullName, role);
      }
      onAuthSuccess(data);
      onClose();
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCreds = (demoType) => {
    if (demoType === 'analyst') {
      setEmail('analyst@threatlens.io');
      setPassword('threatlens2026');
      setMode('login');
      setError('');
    } else if (demoType === 'admin') {
      setEmail('admin@threatlens.io');
      setPassword('admin2026');
      setMode('login');
      setError('');
    }
  };

  return (
    <div className={fullPage ? 'tl-auth-page' : 'fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm'} role="presentation">
      <div className="tl-panel relative w-full max-w-md p-6 text-[var(--tl-text)]" role="dialog" aria-modal="true" aria-labelledby="auth-modal-heading">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close authentication dialog"
          className="absolute right-4 top-4 rounded-md p-1.5 text-[var(--tl-text-muted)] transition-colors hover:bg-[var(--tl-surface-hover)] hover:text-[var(--tl-text)]"
        >
          <X className="w-5 h-5" />
        </button>

        {fullPage && (
          <button type="button" onClick={onClose} className="mb-5 text-xs text-[var(--tl-text-muted)] hover:text-[var(--tl-text)]">
            Back to welcome
          </button>
        )}

        {/* Modal Header */}
        <div className="flex items-center space-x-3 mb-5">
          <div className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-2.5 text-[var(--tl-accent)]">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h3 id="auth-modal-heading" className="text-lg font-semibold text-[var(--tl-text)]">
              {mode === 'login' ? 'Analyst Authentication' : 'Create Investigator Account'}
            </h3>
            <p className="text-xs text-[var(--tl-text-secondary)]">
              {mode === 'login'
                ? 'Sign in to access forensic audits & evidence records.'
                : 'Register your identity in the Evidence Vault ledger.'}
            </p>
          </div>
        </div>

        {/* Quick Demo Logins Banner */}
        <div className="tl-panel-inset mb-4 p-2.5 text-xs">
          <div className="mb-1.5 flex items-center gap-1.5 font-semibold text-[var(--tl-text-secondary)]">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>QUICK DEMO CREDENTIALS:</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => fillDemoCreds('analyst')}
              className="rounded-md border border-[var(--tl-border)] bg-[var(--tl-surface-inset)] px-2 py-1.5 text-left font-mono text-[11px] transition-colors hover:bg-[var(--tl-surface-hover)]"
            >
              <div className="font-bold text-[var(--tl-info)]">Priya Sharma</div>
              <div className="text-[var(--tl-text-muted)]">analyst@threatlens.io</div>
            </button>
            <button
              type="button"
              onClick={() => fillDemoCreds('admin')}
              className="rounded-md border border-[var(--tl-border)] bg-[var(--tl-surface-inset)] px-2 py-1.5 text-left font-mono text-[11px] transition-colors hover:bg-[var(--tl-surface-hover)]"
            >
              <div className="font-bold text-[var(--tl-accent)]">Dr. Rajesh Kumar</div>
              <div className="text-[var(--tl-text-muted)]">admin@threatlens.io</div>
            </button>
          </div>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="mb-4 flex rounded-lg border border-[var(--tl-border)] bg-[var(--tl-surface-inset)] p-1 text-xs">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError('');
            }}
            className={`flex-1 py-2 rounded-lg font-semibold transition-all ${
              mode === 'login' ? 'bg-[var(--tl-accent)] text-[#06150e]' : 'text-[var(--tl-text-muted)] hover:text-[var(--tl-text)]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setError('');
            }}
            className={`flex-1 py-2 rounded-lg font-semibold transition-all ${
              mode === 'signup' ? 'bg-[var(--tl-accent)] text-[#06150e]' : 'text-[var(--tl-text-muted)] hover:text-[var(--tl-text)]'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'signup' && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--tl-text-secondary)]">
                Full Name / Investigator Title
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-[var(--tl-text-muted)]" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g., Inspector Ananya Roy"
                  className="tl-input w-full pl-9 pr-3 py-2.5 text-xs"
                />
              </div>
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--tl-text-secondary)]">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-[var(--tl-text-muted)]" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="analyst@threatlens.io"
                className="tl-input w-full pl-9 pr-3 py-2.5 text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--tl-text-secondary)]">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-[var(--tl-text-muted)]" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="tl-input w-full pl-9 pr-3 py-2.5 text-xs font-mono"
              />
            </div>
          </div>

          {mode === 'signup' && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--tl-text-secondary)]">
                Assigned Operational Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="tl-input w-full px-3 py-2.5 text-xs"
              >
                <option value="analyst">Cyber Cell Analyst (Scan & Tracing)</option>
                <option value="admin">Enterprise Lead / CERT-In Admin (Full Governance)</option>
              </select>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-400/35 bg-red-400/10 p-3 text-xs text-red-300" role="alert" aria-live="assertive">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="tl-button-primary mt-2 flex w-full items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <span>{mode === 'login' ? 'Sign In to Console' : 'Complete Registration'}</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

