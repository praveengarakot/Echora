import { useEffect, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { Compass, LogOut, Menu, Moon, Shield, Sun, X, Zap } from 'lucide-react';
import { useWallet } from './contexts/WalletContext';
import { getContractNetwork } from './config';
import LandingPage from './pages/LandingPage';
import GatePage from './pages/GatePage';
import AdminPage from './pages/AdminPage';
import ObservatoryPage from './pages/ObservatoryPage';
import PhilosophyPage from './pages/PhilosophyPage';

function RouteFallback() {
  return <div className="page page-header"><p className="eyebrow">404 / outside the field</p><h1>This threshold<br /><em>isn’t marked.</em></h1><p>The page you requested does not exist. Return to the Echora home page or choose a destination from the navigation.</p><div className="actions"><Link className="button primary" to="/">Return home</Link><Link className="button" to="/field">Open public field</Link></div></div>;
}

export default function App() {
  const { address, isConnected, connect, disconnect, isConnecting, walletStatus, walletName, error, clearError } = useWallet();
  const [theme, setTheme] = useState<'night' | 'day'>(() => {
    const saved = localStorage.getItem('ECHORA_THEME');
    if (saved === 'day' || saved === 'night') return saved;
    return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'day' : 'night';
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('ECHORA_THEME', theme); }, [theme]);
  useEffect(() => {
    setMobileOpen(false);
    document.getElementById('main-content')?.focus({ preventScroll: true });
  }, [location.pathname]);
  const shortAddress = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : '';

  return <div className="site-shell">
    <a className="skip-link" href="#main-content">Skip to main content</a>
    {error && <div className="alert-bar" role="alert" aria-live="assertive"><span><Zap size={15} aria-hidden="true" />{error}</span><button onClick={clearError} aria-label="Dismiss error"><X size={15} aria-hidden="true" /></button></div>}
    <header className="topbar">
      <Link className="brand" to="/"><span className="brand-mark"><span /></span><span>ECHORA</span></Link>
      <button className="mobile-menu" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle navigation" aria-expanded={mobileOpen} aria-controls="primary-navigation">{mobileOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}</button>
      <nav id="primary-navigation" className={`main-nav ${mobileOpen ? 'open' : ''}`} aria-label="Primary navigation">
        <NavLink to="/gate">Signal gate</NavLink>
        <NavLink to="/field">Public field</NavLink>
        <NavLink to="/privacy">Privacy model</NavLink>
        <NavLink to="/admin">Operator console</NavLink>
      </nav>
      <div className="topbar-actions">
        <button className="icon-button" onClick={() => setTheme(theme === 'night' ? 'day' : 'night')} aria-label={`Switch to ${theme === 'night' ? 'day' : 'night'} theme`} title="Toggle day / night">{theme === 'night' ? <Sun size={17} /> : <Moon size={17} />}</button>
        {isConnected ? <button className="wallet-chip" onClick={disconnect} title="Disconnect wallet"><span className="online-dot" /><span>{walletName || 'Wallet'} · {shortAddress}</span><LogOut size={14} /></button> : <button className="connect-button" onClick={() => void connect(getContractNetwork())} disabled={isConnecting || walletStatus === 'not-found'}><Shield size={15} />{isConnecting ? 'Opening…' : walletStatus === 'not-found' ? 'Wallet needed' : 'Connect wallet'}</button>}
      </div>
    </header>
    <main id="main-content" tabIndex={-1}><Routes><Route path="/" element={<LandingPage />} /><Route path="/gate" element={<GatePage />} /><Route path="/admin" element={<AdminPage />} /><Route path="/steward" element={<AdminPage />} /><Route path="/field" element={<ObservatoryPage />} /><Route path="/observatory" element={<ObservatoryPage />} /><Route path="/privacy" element={<PhilosophyPage />} /><Route path="/philosophy" element={<PhilosophyPage />} /><Route path="*" element={<RouteFallback />} /></Routes></main>
    <footer className="footer"><span><Compass size={14} aria-hidden="true" /> A private signal can still make a public promise.</span><span className="mono">ECHORA / MIDNIGHT / PREPROD</span></footer>
  </div>;
}
