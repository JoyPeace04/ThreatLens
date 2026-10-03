import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, Send, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { uploadEmail } from '../api/client';

const SAMPLES = {
  sample1: {
    name: 'Sample 1: Russian Relay (Spoofed Chase Alert)',
    desc: 'SPF/DKIM fail, mismatched Reply-To, origin IP in Moscow, Russia',
    content: `Received: from mail.attacker-relay.ru (mail.attacker-relay.ru [185.220.101.5])
	by mx.target-corp.com (Postfix) with ESMTP id 4X9Q01
	for <cfo@target-corp.com>; Wed, 02 Sep 2026 14:22:00 +0000
Received: from localhost (127.0.0.1)
	by mail.attacker-relay.ru (Postfix) with SMTP;
Authentication-Results: mx.target-corp.com;
	spf=fail smtp.mailfrom=support@chase-secure-verification.com;
	dkim=fail header.i=@chase-secure-verification.com;
	dmarc=fail action=none header.from=chase-secure-verification.com
From: "Chase Security Alert" <support@chase-secure-verification.com>
To: <cfo@target-corp.com>
Reply-To: <collector@unauthorized-phish.ru>
Return-Path: <bounce@unauthorized-phish.ru>
Subject: URGENT: Unauthorized Wire Transfer of $4,850.00 Detected
Date: Wed, 02 Sep 2026 14:21:40 +0000
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8

Dear Valued Customer,

Our 24/7 Fraud Prevention Monitoring team detected an unauthorized wire transfer attempt of $4,850.00 originating from an unrecognized IP in Moscow, Russia.

Your account access has been temporarily restricted to safeguard remaining assets.

Immediate action is required:
Please click the secure link below within 2 hours to confirm your identity, cancel the pending wire, and re-secure your banking credentials:
https://chase-secure-verification.com/login?token=892348

Failure to verify immediately will result in forfeiture of disputed funds and permanent account restriction.

Sincerely,
Chase Online Fraud Prevention & Asset Protection Division`
  },
  sample2: {
    name: 'Sample 2: Lookalike Domain (microsof1-online.net)',
    desc: 'Levenshtein edit-distance 1 lookalike brand domain + payroll exfiltration',
    content: `Received: from relay.internal.net [91.240.118.89]
	by mail.company.com (Postfix) with ESMTPS id A8912B;
Received: from postfix.spoofhost.org (postfix.spoofhost.org [194.135.25.10])
	by relay.internal.net with ESMTP id 55T11;
Authentication-Results: mail.company.com;
	spf=softfail smtp.mailfrom=payroll@microsof1-online.net;
	dkim=fail;
	dmarc=fail
From: "Microsoft Payroll Office" <payroll@microsof1-online.net>
To: <accounting@company.com>
Reply-To: <exfil-data@bulletproof.cc>
Subject: Action Required: Mandatory Year-End Direct Deposit Verification
Date: Wed, 02 Sep 2026 15:10:00 +0000
Content-Type: text/plain; charset=utf-8

All Corporate Employees,

During our mandatory annual tax compliance audit, errors were flagged in your direct deposit bank routing records.
To avoid salary deposit disruption on this Friday's payroll run, update your bank account information immediately.

Access the Corporate HR Portal:
http://microsof1-online.net/payroll-portal

All submissions must be confirmed prior to 5:00 PM today.

Human Resources and Benefits Administration
Microsoft Corporation`
  },
  sample3: {
    name: 'Sample 3: Legitimate Corporate Email (Priya Sharma)',
    desc: 'Google relay, passing SPF/DKIM/DMARC, clean progress notes',
    content: `Received: from mail-pj1-f42.google.com (mail-pj1-f42.google.com [209.85.216.42])
	by mx.enterprise.org (Postfix) with ESMTPS id 4ABC12
	for <lead@enterprise.org>; Wed, 02 Sep 2026 10:15:22 +0000
Authentication-Results: mx.enterprise.org;
	spf=pass smtp.mailfrom=priya.sharma@enterprise.org;
	dkim=pass header.i=@enterprise.org;
	dmarc=pass action=none header.from=enterprise.org
From: "Priya Sharma" <priya.sharma@enterprise.org>
To: <lead@enterprise.org>
Subject: ThreatLens Sprint 3 Progress & Code Review
Date: Wed, 02 Sep 2026 10:14:00 +0000
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8

Hi Lead,

Just wanted to share our update from today's sprint sync.
The origin tracer and the tamper-evident hash-chained evidence vault are both fully functional and tested.
All automated unit and regression tests are passing.

Please let me know if you have time for a quick 15-minute walkthrough before our Advisory Board presentation this afternoon.

Best regards,
Priya Sharma
Lead Cyber Forensic Engineer
WhyCode Hackathon 2026 — IIT Guwahati`
  }
};

export default function EmailUploader({ onScanComplete }) {
  const [activeMode, setActiveMode] = useState('upload'); // 'upload' | 'paste'
  const [rawText, setRawText] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scanStep, setScanStep] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setError('');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
      setError('');
    }
  };

  const handleSampleSelect = (sampleKey) => {
    const sample = SAMPLES[sampleKey];
    setRawText(sample.content);
    setSelectedFile(null);
    setActiveMode('paste');
    setError('');
  };

  const handleScan = async () => {
    setError('');
    if (activeMode === 'upload' && !selectedFile) {
      setError('Please select or drag-and-drop a .eml file to scan.');
      return;
    }
    if (activeMode === 'paste' && !rawText.trim()) {
      setError('Please paste raw email RFC 822 text or select a demo sample.');
      return;
    }

    setLoading(true);
    setScanStep('1/5 Parsing RFC 822 headers and MIME structure...');

    try {
      setTimeout(() => setScanStep('2/5 Evaluating SPF/DKIM & lookalike brand domains...'), 200);
      setTimeout(() => setScanStep('3/5 Running leak-free Scikit-Learn body classifier...'), 450);
      setTimeout(() => setScanStep('4/5 Tracing chronological Received: hop trail...'), 700);
      setTimeout(() => setScanStep('5/5 Appending to the Evidence Vault demonstration record...'), 950);

      let payload;
      if (activeMode === 'upload' && selectedFile) {
        payload = new FormData();
        payload.append('file', selectedFile);
      } else {
        payload = rawText;
      }

      const result = await uploadEmail(payload);
      setTimeout(() => {
        setLoading(false);
        onScanComplete(result);
      }, 1100);
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Analysis failed. Please check backend connection.');
    }
  };

  const hasInput = activeMode === 'upload' ? Boolean(selectedFile) : Boolean(rawText.trim());
  const activeStep = loading ? Number.parseInt(scanStep.split('/')[0], 10) || 1 : 0;
  const progressSteps = [
    'Parse email',
    'Evaluate headers',
    'Classify content',
    'Trace hop trail',
    'Preserve record',
  ];

  return (
    <div className="tl-intake-console p-5 sm:p-6" aria-busy={loading}>
      <div className="flex flex-col justify-between gap-4 border-b border-[var(--tl-border)] pb-5 md:flex-row md:items-center">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2">
            <span className="tl-eyebrow">Primary analysis action</span>
            <span className="rounded-full border border-[var(--tl-border)] px-2 py-0.5 font-mono text-[10px] text-[var(--tl-text-muted)]">RFC 822 / MIME</span>
          </div>
          <h2 className="tl-intake-title flex items-center gap-2 text-lg font-semibold text-[var(--tl-text)]">
            <UploadCloud className="h-5 w-5 text-[var(--tl-accent)]" />
            Scan & Analyze Incoming Email
          </h2>
          <p className="mt-1 w-full max-w-2xl break-words text-xs leading-5 text-[var(--tl-text-secondary)]">
            Choose one existing email source. ThreatLens will analyze its headers and body, then show the investigation below.
          </p>
        </div>

        {/* Input Mode Toggle */}
        <div className="flex items-center self-start rounded-lg border border-[var(--tl-border)] bg-[var(--tl-surface-inset)] p-1 text-xs md:self-auto" aria-label="Email source">
          <button
            type="button"
            onClick={() => {
              setError('');
              setActiveMode('upload');
            }}
            className={`rounded-md px-3 py-1.5 font-semibold transition-colors ${
              activeMode === 'upload' ? 'bg-[var(--tl-accent)] text-[#06150e]' : 'text-[var(--tl-text-muted)] hover:text-[var(--tl-text)]'
            }`}
          >
            File Upload (.eml)
          </button>
          <button
            type="button"
            onClick={() => {
              setError('');
              setActiveMode('paste');
            }}
            className={`rounded-md px-3 py-1.5 font-semibold transition-colors ${
              activeMode === 'paste' ? 'bg-[var(--tl-accent)] text-[#06150e]' : 'text-[var(--tl-text-muted)] hover:text-[var(--tl-text)]'
            }`}
          >
            Raw Text / Paste
          </button>
        </div>
      </div>

      {/* Quick Demo Preloads */}
      <div className="tl-intake-strip mt-4 p-3">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-[var(--tl-text-secondary)]">
          <Sparkles className="h-3.5 w-3.5 text-[var(--tl-caution)]" />
          <span className="font-mono text-[10px] uppercase tracking-[0.1em]">Hackathon quick samples</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {Object.entries(SAMPLES).map(([key, item]) => (
            <button
              key={key}
              type="button"
              onClick={() => handleSampleSelect(key)}
              className="group rounded-md border border-[var(--tl-border)] border-t border-t-[var(--tl-border-strong)] bg-[var(--tl-surface)] p-2.5 text-left transition-colors hover:border-t-[var(--tl-accent)] hover:bg-[var(--tl-surface-hover)]"
            >
              <div className="text-xs font-medium text-[var(--tl-text)] transition-colors group-hover:text-[var(--tl-accent)]">
                {item.name}
              </div>
              <div className="mt-0.5 line-clamp-1 text-[11px] text-[var(--tl-text-muted)]">
                {item.desc}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2" aria-live="polite">
        <div className="tl-intake-meta flex items-start gap-3 p-3">
          <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-[var(--tl-accent)]" />
          <div>
            <p className="tl-kpi-label">What am I analyzing?</p>
            <p className="mt-1 text-xs font-medium text-[var(--tl-text)]">
              {activeMode === 'upload'
                ? selectedFile
                  ? selectedFile.name
                  : 'No .eml file selected yet'
                : rawText.trim()
                ? 'Pasted RFC 822 email content'
                : 'No raw email content pasted yet'}
            </p>
          </div>
        </div>
        <div className="tl-intake-meta flex items-start gap-3 p-3">
          <div className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${loading ? 'animate-pulse bg-[var(--tl-caution)]' : hasInput ? 'bg-[var(--tl-accent)]' : 'bg-[var(--tl-text-muted)]'}`} />
          <div>
            <p className="tl-kpi-label">What happens next?</p>
            <p className="mt-1 text-xs text-[var(--tl-text-secondary)]">
              {loading ? 'The existing analysis pipeline is running.' : hasInput ? 'Start the scan to open the investigation.' : 'Choose a file or paste content to continue.'}
            </p>
          </div>
        </div>
      </div>

      {/* Input Form */}
      <div className="mt-4">
        {activeMode === 'upload' ? (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
            }}
            role="button"
            tabIndex={0}
            aria-label={selectedFile ? `Selected file ${selectedFile.name}. Activate to choose a different file.` : 'Choose an email file or drop one here.'}
            className={`tl-intake-dropzone cursor-pointer rounded-md border-2 border-dashed p-8 text-center transition-colors ${
              selectedFile
                ? 'border-emerald-400/70 bg-emerald-400/5'
                : 'border-[var(--tl-border-strong)] bg-[var(--tl-surface-inset)] hover:border-emerald-400/50'
            }`}
          >
            <input
              type="file"
              id="threatlens-email-file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".eml,message/rfc822,text/plain"
              aria-label="Email file"
              className="hidden"
            />
            <div className="flex flex-col items-center">
              <div className="mb-3 rounded-full border border-emerald-400/25 bg-emerald-400/10 p-3 text-[var(--tl-accent)]">
                <FileText className="h-8 w-8" />
              </div>
              {selectedFile ? (
                <div>
                  <p className="text-sm font-semibold text-[var(--tl-text)]">{selectedFile.name}</p>
                  <p className="mt-1 font-mono text-xs text-[var(--tl-text-secondary)]">
                    {(selectedFile.size / 1024).toFixed(1)} KB — Click to change file
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium text-[var(--tl-text-secondary)]">
                    Drop suspicious <span className="font-semibold text-[var(--tl-accent)]">.eml file</span> here or click to browse
                  </p>
                  <p className="mt-1 text-xs text-[var(--tl-text-muted)]">Supports RFC 822, MIME multipart emails</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div>
            <label htmlFor="threatlens-email-text" className="mb-2 block text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--tl-text-muted)]">
              Raw RFC 822 email content
            </label>
            <textarea
              id="threatlens-email-text"
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              aria-label="Raw RFC 822 email content"
              placeholder="Paste raw email RFC 822 text (including Received: headers, From:, Subject:, and Body)..."
              rows={8}
              className="tl-input w-full p-3 text-xs font-mono transition-colors"
            />
          </div>
        )}
      </div>

      {loading && (
        <div className="mt-4 rounded-lg border border-amber-400/25 bg-amber-400/5 p-3" role="status" aria-live="polite">
          <div className="flex items-center justify-between gap-3">
            <p className="tl-kpi-label text-[var(--tl-caution)]">What is happening?</p>
            <span className="font-mono text-[11px] text-[var(--tl-text-muted)]">Step {activeStep} of 5</span>
          </div>
          <ol className="mt-3 grid grid-cols-5 gap-1.5" aria-label="Email analysis progress">
            {progressSteps.map((step, index) => {
              const stepNumber = index + 1;
              const isActive = activeStep === stepNumber;
              const isComplete = activeStep > stepNumber;
              return (
                <li key={step} className="min-w-0">
                  <div className={`h-1 rounded-full ${isComplete ? 'bg-[var(--tl-accent)]' : isActive ? 'bg-[var(--tl-caution)]' : 'bg-[var(--tl-border)]'}`} />
                  <span className={`mt-1 block truncate text-[10px] ${isActive ? 'font-semibold text-[var(--tl-text)]' : isComplete ? 'text-[var(--tl-text-secondary)]' : 'text-[var(--tl-text-muted)]'}`}>{step}</span>
                </li>
              );
            })}
          </ol>
          <p className="mt-3 font-mono text-xs text-[var(--tl-text-secondary)]">{scanStep}</p>
          <p className="mt-1 text-[11px] text-[var(--tl-text-muted)]">Keep this window open. The completed investigation will appear below.</p>
        </div>
      )}

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-400/35 bg-red-400/10 p-3 text-xs text-red-300" role="alert" aria-live="assertive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Action Button */}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-[var(--tl-text-muted)]" aria-live="polite">
          {loading ? (
            <span className="flex items-center gap-2 font-mono text-[var(--tl-accent)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              {scanStep}
            </span>
          ) : hasInput ? (
            <span className="text-[var(--tl-text-secondary)]">Ready to analyze this email.</span>
          ) : (
            <span>{activeMode === 'upload' ? 'Select a .eml file to begin.' : 'Paste raw RFC 822 content to begin.'}</span>
          )}
        </div>

        <button
          onClick={handleScan}
          disabled={loading}
          aria-label={loading ? 'Email analysis in progress' : 'Start email analysis'}
          className="tl-button-primary inline-flex items-center justify-center gap-2 self-start px-5 sm:self-auto"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Scanning...</span>
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              <span>Scan Email</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

