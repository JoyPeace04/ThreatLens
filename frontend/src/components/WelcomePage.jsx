import React from 'react';
import { ArrowUpRight, LockKeyhole, ScanSearch, ShieldCheck, UserPlus } from 'lucide-react';

export default function WelcomePage({ onEnter, onOpenAuth }) {
  return (
    <main className="tl-welcome">
      <div className="tl-welcome-grid" />
      <header className="tl-welcome-topline">
        <div className="tl-brand-mark"><ShieldCheck size={17} /></div>
        <span>THREATLENS <b>2.0</b></span>
        <span className="tl-welcome-status"><i /> Evidence intake open</span>
      </header>

      <section className="tl-welcome-content">
        <div className="tl-welcome-kicker tl-simple-hover"><span>FIELD NOTE 001</span><span className="tl-welcome-kicker-rule" /><span>EMAIL FORENSICS</span></div>
        <h1 className="tl-simple-hover">Tracing every threat<br /><em>back to its source.</em></h1>
        <p className="tl-welcome-copy tl-simple-hover">Read the headers. Follow the route. Preserve what happened.</p>
        <div className="tl-welcome-actions">
          <button type="button" className="tl-button-secondary tl-welcome-enter" onClick={onEnter}>
            Open investigation console <ArrowUpRight size={16} />
          </button>
          <div className="tl-welcome-auth-actions">
            <button type="button" className="tl-welcome-signin" onClick={() => onOpenAuth('login')}>Sign in</button>
            <button type="button" className="tl-welcome-signup" onClick={() => onOpenAuth('signup')}><UserPlus size={14} /> Create account</button>
          </div>
        </div>
      </section>

      <aside className="tl-welcome-aside">
        <div className="tl-welcome-aside-label tl-simple-hover">Start with one message</div>
        <p className="tl-simple-hover">ThreatLens turns suspicious mail into a traceable incident record.</p>
        <div className="tl-welcome-metrics">
          <span><ScanSearch size={15} /> Parse / score / explain</span>
          <span><LockKeyhole size={15} /> Preserve the evidence chain</span>
        </div>
      </aside>

      <footer className="tl-welcome-footer"><span>DETECT / TRACE / PROVE</span><span>WHYCODE HACKATHON · GUEST ACCESS: ANALYSIS ONLY</span></footer>
    </main>
  );
}
