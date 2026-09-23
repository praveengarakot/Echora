import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import '@midnight-ntwrk/dapp-connector-api';
import type { ConnectedAPI, InitialAPI } from '@midnight-ntwrk/dapp-connector-api';
import { createConnectedSession, type ConnectedSession } from '../lib/midnight';
import type { MidnightNetwork } from '../config';

export type WalletStatus = 'checking' | 'detected' | 'not-found';
export type WalletType = '1am' | 'lace' | 'other' | null;
export type WalletEntry = { id: string; name: string; api: InitialAPI };

type WalletContextValue = {
  address: string | null;
  isConnected: boolean;
  network: MidnightNetwork | null;
  walletType: WalletType;
  walletName: string | null;
  walletStatus: WalletStatus;
  isConnecting: boolean;
  session: ConnectedSession | null;
  availableWallets: WalletEntry[];
  error: string | null;
  clearError: () => void;
  connect: (network?: MidnightNetwork, walletId?: string) => Promise<ConnectedSession | undefined>;
  disconnect: () => void;
};
const WalletContext = createContext<WalletContextValue | null>(null);

export function listInjectedWallets(): WalletEntry[] {
  if (typeof window === 'undefined') return [];
  const midnight = (window as any).midnight;
  if (!midnight) return [];
  return Object.entries(midnight)
    .filter(([, api]) => api && typeof (api as any).connect === 'function')
    .map(([id, api]) => ({
      id, api: api as InitialAPI,
      name: (api as any).name || (id === '1am' ? '1AM Wallet' : id === 'mnLace' ? 'Lace Wallet' : id),
    }));
}

function typeForWallet(id: string): WalletType {
  return id === '1am' ? '1am' : id.toLowerCase().includes('lace') ? 'lace' : 'other';
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [walletStatus, setWalletStatus] = useState<WalletStatus>('checking');
  const [availableWallets, setAvailableWallets] = useState<WalletEntry[]>([]);
  const [walletType, setWalletType] = useState<WalletType>(null);
  const [walletName, setWalletName] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [network, setNetwork] = useState<MidnightNetwork | null>(null);
  const [session, setSession] = useState<ConnectedSession | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const connecting = useRef(false);

  const clearError = useCallback(() => setError(null), []);
  const detect = useCallback((timeout = 6000) => {
    const started = Date.now();
    const id = window.setInterval(() => {
      const wallets = listInjectedWallets();
      if (wallets.length) {
        setAvailableWallets(wallets); setWalletStatus('detected');
        if (!walletName) { setWalletName(wallets[0].name); setWalletType(typeForWallet(wallets[0].id)); }
        window.clearInterval(id);
      } else if (Date.now() - started > timeout) {
        setWalletStatus('not-found'); window.clearInterval(id);
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [walletName]);

  useEffect(() => detect(), [detect]);

  const connect = useCallback(async (wantedNetwork: MidnightNetwork = 'preview', walletId?: string) => {
    if (connecting.current) return;
    connecting.current = true; setIsConnecting(true); setError(null);
    try {
      const wallets = listInjectedWallets();
      if (!wallets.length) throw new Error('Install a Midnight-compatible wallet such as 1AM or Lace first.');
      const chosen = wallets.find((item) => item.id === walletId) || wallets.find((item) => item.id === '1am') || wallets[0];
      const api: ConnectedAPI = await chosen.api.connect(wantedNetwork);
      const connected = await createConnectedSession(api as any);
      if (connected.config.networkId !== wantedNetwork) {
        throw new Error(`Wallet is connected to ${connected.config.networkId}, but this session requires ${wantedNetwork}. Disconnect it in the wallet and try again.`);
      }
      setSession(connected); setAddress(connected.unshieldedAddress); setNetwork(wantedNetwork);
      setWalletName(chosen.name); setWalletType(typeForWallet(chosen.id)); setWalletStatus('detected');
      return connected;
    } catch (cause: any) {
      const msg = cause?.message || String(cause);
      setError(msg.toLowerCase().includes('syncing')
        ? 'The wallet is syncing with Midnight Network. Open the extension and wait for sync to complete.'
        : msg.toLowerCase().includes('rate limit')
          ? 'The wallet is rate limited. Wait 30 seconds before retrying.' : msg);
      setSession(null); setAddress(null); setNetwork(null);
    } finally {
      connecting.current = false; setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setSession(null); setAddress(null); setNetwork(null); setWalletName(null); setWalletType(null); setError(null); setWalletStatus('checking');
    detect(3000);
  }, [detect]);

  return <WalletContext.Provider value={{ address, isConnected: Boolean(session), network, walletType, walletName, walletStatus, isConnecting, session, availableWallets, error, clearError, connect, disconnect }}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) throw new Error('useWallet must be used inside WalletProvider');
  return context;
}
