import { useCallback, useEffect, useMemo, useState } from 'react';
import { CompiledContract } from '@midnight-ntwrk/compact-js';
import { createUnprovenCallTx, createUnprovenDeployTx, submitTxAsync } from '@midnight-ntwrk/midnight-js-contracts';
import { sampleSigningKey } from '@midnight-ntwrk/compact-runtime';
import { Check, Copy, ExternalLink, KeyRound, LoaderCircle, Pause, Play, RotateCcw, Settings2, WalletCards } from 'lucide-react';
import { Contract, pureCircuits } from '../managed/contract/index.js';
import { useWallet } from '../contexts/WalletContext';
import { DEFAULT_CAPACITY, DEFAULT_SIGNAL_THRESHOLD, getContractAddress, getContractNetwork, getExplorerContractUrl, normalizeContractAddress, setContractAddress, setContractNetwork, type MidnightNetwork } from '../config';
import { fromHex, toHex, waitForContractDeployment, waitForStateAdvance } from '../lib/midnight';
import { useContractState } from '../hooks/useContractState';

const randomHex = () => toHex(crypto.getRandomValues(new Uint8Array(32)));
const maxThreshold = 1_000_000;
const maxCapacity = 1_000_000;

function compiled(operatorSecret?: Uint8Array) {
  const witnesses = {
    read_private_signal: (ctx: any) => [ctx.privateState, 0n],
    read_secret_phrase: (ctx: any) => [ctx.privateState, new Uint8Array(32)],
    operator_secret: (ctx: any) => [ctx.privateState, operatorSecret || new Uint8Array(32)],
  };
  return CompiledContract.make('EchoraContract', Contract).pipe(CompiledContract.withWitnesses(witnesses), CompiledContract.withCompiledFileAssets(new URL('/managed', window.location.origin).toString())) as any;
}

function integer(value: string, min: number, max: number): bigint | null {
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= min && parsed <= max ? BigInt(value) : null;
}

export default function AdminPage() {
  const { session, isConnected, connect, disconnect, isConnecting, walletStatus, availableWallets, walletName, network: walletNetwork } = useWallet();
  const [network, setNetwork] = useState<MidnightNetwork>(getContractNetwork);
  const [walletId, setWalletId] = useState('');
  const [secret, setSecret] = useState(randomHex);
  const [backupConfirmed, setBackupConfirmed] = useState(false);
  const [threshold, setThreshold] = useState(DEFAULT_SIGNAL_THRESHOLD.toString());
  const [capacity, setCapacity] = useState(DEFAULT_CAPACITY.toString());
  const [deadline, setDeadline] = useState(() => String(Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60));
  const [existingAddress, setExistingAddress] = useState(() => getContractAddress(network));
  const [activeAddress, setActiveAddress] = useState(() => getContractAddress(network));
  const [pendingAddress, setPendingAddress] = useState('');
  const [status, setStatus] = useState('');
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const { ledgerState, isLoading, refetch } = useContractState(4000, activeAddress, session?.providers.publicDataProvider, network);
  const walletMatchesNetwork = Boolean(session && walletNetwork === network && session.config.networkId === network);
  const selectedWallet = availableWallets.find(wallet => wallet.id === walletId);
  const walletMatchesSelection = !walletId || !session || selectedWallet?.name === walletName;
  const walletReady = walletMatchesNetwork && walletMatchesSelection;
  const thresholdValue = integer(threshold, 0, maxThreshold);
  const capacityValue = integer(capacity, 1, maxCapacity);
  const deadlineValue = integer(deadline, Math.floor(Date.now() / 1000) + 1, 9_999_999_999);
  const secretValid = /^[0-9a-fA-F]{64}$/.test(secret.trim());
  const operatorHash = useMemo(() => {
    try { return secretValid ? (pureCircuits as any).operator_public_key(fromHex(secret.trim())) : null; } catch { return null; }
  }, [secret, secretValid]);

  useEffect(() => {
    const address = getContractAddress(network);
    setExistingAddress(address); setActiveAddress(address); setPendingAddress('');
    if (session && walletNetwork !== network) disconnect();
  }, [network]); // a network switch must not retain a different network's address/session

  const chooseNetwork = (next: MidnightNetwork) => {
    setContractNetwork(next); setNetwork(next); setStatus('');
  };

  const loadExisting = () => {
    try {
      const address = normalizeContractAddress(existingAddress);
      setContractAddress(address, network); setActiveAddress(address); setStatus(`Loading ${address} from ${network}.`);
    } catch (cause: any) { setStatus(cause?.message || 'Enter a valid 64-hex contract address.'); }
  };

  const deploy = useCallback(async () => {
    if (!walletReady || !session) return setStatus(`Connect the selected wallet on ${network} before deploying.`);
    if (!secretValid || !operatorHash) return setStatus('Enter a valid 64-hex operator secret.');
    if (!backupConfirmed) return setStatus('Confirm that you backed up the operator secret before deploying.');
    if (thresholdValue === null || capacityValue === null || deadlineValue === null) return setStatus('Use whole-number threshold/capacity values and a future Unix timestamp.');
    setBusy(true); setStatus('Preparing the browser deployment…'); setPendingAddress('');
    try {
      const passport = crypto.getRandomValues(new Uint8Array(32));
      const issuer = crypto.getRandomValues(new Uint8Array(32));
      const data = await createUnprovenDeployTx(session.providers as any, {
        compiledContract: compiled(fromHex(secret.trim())), privateStateId: 'EchoraOperatorState', initialPrivateState: {},
        args: [thresholdValue, passport, deadlineValue, issuer, operatorHash, capacityValue], signingKey: sampleSigningKey(),
      } as any);
      const address = normalizeContractAddress(data.public.contractAddress);
      setPendingAddress(address); setStatus('Proof prepared. Submitting deployment to the wallet…');
      const result = await submitTxAsync(session.providers as any, { unprovenTx: data.private.unprovenTx } as any);
      setStatus(`Deployment submitted${typeof result === 'string' && result ? ` (${result})` : ''}. Waiting for indexer confirmation…`);
      try {
        await waitForContractDeployment(session.providers.publicDataProvider, address);
        setContractAddress(address, network); setActiveAddress(address); setExistingAddress(address); setPendingAddress('');
        setStatus(`Deployment indexed on ${network} at ${address}.`); await refetch();
      } catch (cause: any) {
        setStatus(`Deployment pending at ${address}: ${cause?.message || 'indexer confirmation timed out'}`);
      }
    } catch (cause: any) { setStatus(`Deployment failed: ${cause?.message || cause}`); }
    finally { setBusy(false); }
  }, [backupConfirmed, capacityValue, deadlineValue, network, operatorHash, refetch, secret, secretValid, session, thresholdValue, walletReady]);

  const submitOperatorAction = useCallback(async (circuitId: 'pause_window' | 'resume_window' | 'rotate_window') => {
    if (!walletReady || !session) return setStatus(`Connect the selected wallet on ${network} before operating this window.`);
    if (!activeAddress || !ledgerState) return setStatus('Load an indexed contract before submitting an operator action.');
    if (!secretValid) return setStatus('Enter the 64-hex operator secret used by this deployment (recovery is manual).');
    if (circuitId === 'rotate_window' && (thresholdValue === null || capacityValue === null || deadlineValue === null)) return setStatus('Use valid whole-number rotation values and a future timestamp.');
    const before = ledgerState;
    setBusy(true); setStatus(`Preparing ${circuitId}…`);
    try {
      const args = circuitId === 'rotate_window'
        ? [thresholdValue, crypto.getRandomValues(new Uint8Array(32)), deadlineValue, crypto.getRandomValues(new Uint8Array(32)), capacityValue]
        : [];
      const data = await createUnprovenCallTx(session.providers as any, {
        compiledContract: compiled(fromHex(secret.trim())), contractAddress: activeAddress, circuitId, args,
        initialPrivateState: {}, witnesses: {},
      } as any);
      const result = await submitTxAsync(session.providers as any, { unprovenTx: data.private.unprovenTx, circuitId } as any);
      setStatus(`${circuitId} submitted${typeof result === 'string' && result ? ` (${result})` : ''}. Waiting for indexed state…`);
      await waitForStateAdvance(session.providers.publicDataProvider, async provider => {
        const next = await provider.queryContractState(activeAddress);
        if (!next?.data) return false;
        const value: any = (await import('../managed/contract/index.js')).ledger(next.data);
        return circuitId === 'pause_window' ? value.live === false
          : circuitId === 'resume_window' ? value.live === true
            : value.signal_threshold !== before.signal_threshold || value.capacity !== before.capacity || value.window_end !== before.window_end || toHex(value.passport) !== toHex(before.passport);
      });
      setStatus(`${circuitId} indexed on ${network}.`); await refetch();
    } catch (cause: any) {
      setStatus(cause?.message?.includes('not indexed yet') ? `Action pending: ${cause.message}` : `Operator action failed: ${cause?.message || cause}`);
    } finally { setBusy(false); }
  }, [activeAddress, capacityValue, deadlineValue, ledgerState, network, refetch, secret, secretValid, session, thresholdValue, walletReady]);

  const copyAddress = () => { if (!activeAddress) return; void navigator.clipboard.writeText(activeAddress); setCopied(true); window.setTimeout(() => setCopied(false), 1600); };
  const statusTone = status.toLowerCase().includes('failed') ? 'error' : status.toLowerCase().includes('indexed') ? 'success' : '';
  const displayedAddress = activeAddress || pendingAddress;

  return <div className="page"><div className="page-header"><div className="eyebrow">Operator console / deploy & operate</div><h1>Shape the window.<br /><em>Never touch the witness.</em></h1><p>Deploy and operate an Echora signal window. Proving and DUST balancing happen in the selected wallet; deployment is only successful after the selected network's indexer confirms it.</p></div><div className="two-col"><div className="panel"><div className="eyebrow">Network and wallet</div><div className="form-grid"><div className="field"><label htmlFor="admin-network">Network</label><select id="admin-network" className="input" value={network} onChange={event => chooseNetwork(event.target.value as MidnightNetwork)}><option value="preview">Preview (default)</option><option value="preprod">Preprod</option></select></div><div className="field"><label htmlFor="admin-wallet">Wallet</label><select id="admin-wallet" className="input" value={walletId} onChange={event => setWalletId(event.target.value)}><option value="">{walletName || 'Select wallet'}</option>{availableWallets.map(wallet => <option key={wallet.id} value={wallet.id}>{wallet.name}</option>)}</select></div></div>{isConnected && <div className="notice">Connected network: <strong>{walletNetwork}</strong> · {walletReady ? 'matches selection' : 'does not match selected network or wallet'}</div>}{!isConnected && <button className="button full-button" onClick={() => void connect(network, walletId || undefined)} disabled={isConnecting || walletStatus === 'not-found'}><WalletCards size={15} />{isConnecting ? 'Opening wallet…' : `Connect on ${network}`}</button>}{isConnected && !walletReady && <button className="button full-button" onClick={() => void connect(network, walletId || undefined)} disabled={isConnecting}>Reconnect selected wallet on {network}</button>}</div><div className="panel"><div className="eyebrow">Browser deployment</div><h2>New signal window</h2><p>The operator secret is held in memory only. Back it up manually; a reload intentionally requires recovery entry.</p><div className="field"><label htmlFor="operator-secret">Operator secret · memory only · 64 hex</label><input id="operator-secret" className="input mono" type="password" value={secret} onChange={event => setSecret(event.target.value)} autoComplete="off" /></div><label className="notice" style={{ cursor: 'pointer' }}><input type="checkbox" checked={backupConfirmed} onChange={event => setBackupConfirmed(event.target.checked)} /> <KeyRound size={14} />I have backed up this secret offline.</label><div className="form-grid"><div className="field"><label htmlFor="signal-threshold">Signal threshold (0–{maxThreshold})</label><input id="signal-threshold" className="input mono" type="number" min="0" max={maxThreshold} step="1" value={threshold} onChange={event => setThreshold(event.target.value)} /></div><div className="field"><label htmlFor="window-capacity">Capacity (1–{maxCapacity})</label><input id="window-capacity" className="input mono" type="number" min="1" max={maxCapacity} step="1" value={capacity} onChange={event => setCapacity(event.target.value)} /></div></div><div className="field"><label htmlFor="window-deadline">Expiry · Unix timestamp (future)</label><input id="window-deadline" className="input mono" type="number" min={Math.floor(Date.now() / 1000) + 1} max="9999999999" step="1" value={deadline} onChange={event => setDeadline(event.target.value)} /></div><div className="notice"><KeyRound size={14} />Only the commitment is public. This demo does not attest the signal's origin; replace the editable browser witness with a credential adapter in production.</div><button className="button primary full-button" onClick={() => void deploy()} disabled={!walletReady || busy}><Settings2 size={15} />{busy ? 'Working…' : 'Deploy new window'}</button>{status && <div className={`notice ${statusTone}`} style={{ marginTop: 16, wordBreak: 'break-word' }}>{status}</div>}</div><div className="panel"><div className="eyebrow">Load an existing window</div><div className="field"><label htmlFor="existing-address">{network} contract address · mn_addr_… or 64 hex</label><input id="existing-address" className="input mono" value={existingAddress} onChange={event => setExistingAddress(event.target.value)} placeholder="mn_addr_… or 64 hexadecimal characters" /></div><button className="button full-button" onClick={loadExisting} disabled={busy}>Load existing address</button>{displayedAddress && <div className="notice" style={{ marginTop: 16, wordBreak: 'break-all' }}><span className="label">Active/pending address</span><div className="copy-line"><span className="mono">{displayedAddress}</span>{activeAddress && <button className="tiny-button" onClick={copyAddress} aria-label="Copy deployed address">{copied ? <Check size={14} /> : <Copy size={14} />}</button>}<a className="tiny-button" href={getExplorerContractUrl(displayedAddress, network)} target="_blank" rel="noreferrer"><ExternalLink size={13} /> Explorer</a></div></div>}</div><div className="panel"><div className="panel-topline"><div className="eyebrow">Active window</div><button className="tiny-button" onClick={() => void refetch()} aria-label="Refresh active window"><RotateCcw size={14} /></button></div>{isLoading ? <div className="empty-state">Reading public state…</div> : !ledgerState ? <div className="empty-state">Nothing indexed at <span className="mono">{activeAddress || '—'}</span>.</div> : <><div className="data-list"><div className="data-row"><span className="label">Status</span><span className={`status ${ledgerState.live ? '' : 'closed'}`}>{ledgerState.live ? '● LIVE' : '● PAUSED'}</span></div><div className="data-row"><span className="label">Signal rule</span><strong>{ledgerState.signal_threshold?.toString()} points</strong></div><div className="data-row"><span className="label">Operator commitment</span><strong className="mono">{toHex(ledgerState.operator_commitment).slice(0, 14)}…</strong></div><div className="data-row"><span className="label">Accepted</span><strong>{ledgerState.accepted?.toString()} / {ledgerState.capacity?.toString()}</strong></div></div><div className="form-grid"><button className="button full-button" onClick={() => void submitOperatorAction(ledgerState.live ? 'pause_window' : 'resume_window')} disabled={!walletReady || busy}>{ledgerState.live ? <><Pause size={15} /> Pause window</> : <><Play size={15} /> Resume window</>}</button><button className="button full-button" onClick={() => void submitOperatorAction('rotate_window')} disabled={!walletReady || busy}>Rotate window</button></div><a className="button subtle full-button" href={getExplorerContractUrl(activeAddress, network)} target="_blank" rel="noreferrer"><ExternalLink size={15} /> View contract</a></>}</div></div><div className="panel admin-note"><LoaderCircle size={17} style={{ color: 'var(--accent)' }} /><span><strong>Confirmation is explicit.</strong> “Submitted” means the wallet accepted the transaction; “indexed” means the selected network's public state changed. Remote proving means this browser trusts the wallet/prover service for proof generation.</span></div></div>;
}
