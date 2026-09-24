import { ArrowUpRight, EyeOff, Fingerprint, Radio, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
  return <div className="page landing-page">
    <section className="hero-editorial">
      <div className="hero-copy">
        <p className="eyebrow">Private signal infrastructure</p>
        <h1 className="display">A quieter way<br /><em>to say yes.</em></h1>
        <p className="lede">Echora lets a person prove that a private signal meets a public rule, without turning the reason into a public record.</p>
        <div className="actions"><Link className="button primary" to="/gate">Enter the signal gate <ArrowUpRight size={16} aria-hidden="true" /></Link><Link className="button subtle" to="/privacy">Read the privacy model</Link></div>
        <p className="hero-note"><span className="note-mark" aria-hidden="true">↳</span> A proof can answer a question without retelling a life.</p>
      </div>
      <figure className="threshold-figure">
        <img src="/imagery/threshold.svg" alt="An architectural threshold opening onto a quiet coral horizon" />
        <figcaption><span>ECHORA / 01</span><span>Threshold study</span></figcaption>
      </figure>
    </section>

    <section className="section intro-section"><div className="section-head"><div><p className="eyebrow">The useful boundary</p><h2>Bring the signal.<br />Leave the story.</h2></div><p>For private rooms, credentialed drops and research circles where “eligible” is enough information to share.</p></div>
      <div className="feature-grid"><article className="feature-card"><Fingerprint size={21} aria-hidden="true" /><div><h3>Scoped receipts</h3><p>A pass-scoped nullifier helps prevent replay. It is a protocol guard, not a promise that every use is un-linkable.</p></div></article><article className="feature-card"><EyeOff size={21} aria-hidden="true" /><div><h3>Private inputs</h3><p>The signal and phrase are supplied as private witness data while the public rule stays inspectable.</p></div></article><article className="feature-card"><Radio size={21} aria-hidden="true" /><div><h3>A small public field</h3><p>Anyone can inspect the rule, capacity and accepted count without receiving a directory of participants.</p></div></article></div>
    </section>
    <div className="metric-band"><div className="metric"><strong>1×</strong><small>receipt per passport</small></div><div className="metric"><strong>0</strong><small>signal values disclosed</small></div><div className="metric"><strong>32B</strong><small>nullifier space</small></div><div className="metric"><strong>24/7</strong><small>publicly inspectable</small></div></div>
    <section className="section process-section"><div className="section-head"><div><p className="eyebrow">The handoff</p><h2>From hush to proof.</h2></div><ShieldCheck size={35} aria-hidden="true" style={{ color: 'var(--accent)' }} /></div><div className="step-list"><div className="step-item"><div className="step-number">01</div><div><h3>An operator opens a window</h3><p>The public ledger receives the threshold, expiry, capacity and a domain-scoped passport.</p></div></div><div className="step-item"><div className="step-number">02</div><div><h3>A member brings a private signal</h3><p>The browser holds the signal and phrase locally. Neither becomes a public circuit argument.</p></div></div><div className="step-item"><div className="step-number">03</div><div><h3>Compact checks the relationship</h3><p>A zero-knowledge proof establishes that the hidden signal clears the visible rule.</p></div></div><div className="step-item"><div className="step-number">04</div><div><h3>The field records a receipt</h3><p>The accepted count and a one-time nullifier change. The source remains outside the public state.</p></div></div></div></section>
    <section className="panel feature-callout"><div><p className="eyebrow">Selective disclosure, by design</p><h2>Not more data.<br />Better evidence.</h2><p>Explore the current public field or connect a Midnight wallet to create a proof. A self-reported signal is not the same as credential authenticity, and public metadata still exists.</p></div><div className="actions"><Link className="button" to="/field">Open public field</Link><Link className="button" to="/admin">Operator console</Link></div></section>
  </div>;
}
