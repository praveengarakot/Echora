import { useCallback, useMemo, useState } from 'react';
import { CompiledContract } from '@midnight-ntwrk/compact-js';
import { createUnprovenCallTx, submitTxAsync } from '@midnight-ntwrk/midnight-js-contracts';
import { ArrowRight, Check, LockKeyhole, RefreshCw, ShieldCheck, WalletCards } from 'lucide-react';
import { Contract } from '../managed/contract/index.js';
import { useWallet } from '../contexts/WalletContext';
import { getContractAddress, getContractNetwork, getExplorerTxUrl } from '../config';
import { fromHex, toHex, waitForStateAdvance } from '../lib/midnight';
import { getIdentity, hasUsedPass, publicFingerprint, receiptFor } from '../lib/identity';
import { useContractState } from '../hooks/useContractState';

function compiled(signal: bigint, phrase: Uint8Array) {
  const witnesses = {
    read_private_signal: (ctx: any) => [ctx.privateState, signal],
    read_secret_phrase: (ctx: any) => [ctx.privateState, phrase],
    operator_secret: (ctx: any) => [ctx.privateState, new Uint8Array(32)],
  };
  return CompiledContract.make('EchoraContract', Contract).pipe(CompiledContract.withWitnesses(witnesses), CompiledContract.withCompiledFileAssets(new URL('/managed', window.location.origin).toString())) as any;
}

function wholeNumber(value: string, min: number, max: number): bigint | null {
  if (!/^\d+$/.test(value)) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= min && number <= max ? BigInt(value) : null;
}

export default function GatePage() {
  const { session, isConnected, connect, isConnecting, walletStatus, network: walletNetwork } = useWallet();
  const network = getContractNetwork();
  const address = getContractAddress(network);
  const { ledgerState, isLoading, error, refetch } = useContractState(4000, address, session?.providers.publicDataProvider, network);
  const [identity] = useState(getIdentity);
  const [signal, setSignal] = useState('88');
  const [status, setStatus] = useState<'ready' | 'proving' | 'success' | 'pending' | 'error'>('ready');
  const [message, setMessage] = useState('');
  const [txId, setTxId] = useState('');
  const threshold = ledgerState?.signal_threshold as bigint | undefined;
  const signalValue = wholeNumber(signal, 0, 1_000_000);
  const hasUsed = useMemo(() => hasUsedPass(identity.secret, ledgerState), [identity.secret, ledgerState]);
  const now = BigInt(Math.floor(Date.now() / 1000));
  const stateComplete = Boolean(ledgerState && threshold !== undefined && ledgerState.capacity !== undefined && ledgerState.window_end !== undefined && ledgerState.passport && ledgerState.accepted !== undefined);
  const isExpired = Boolean(ledgerState?.window_end !== undefined && ledgerState.window_end < now);
  const walletMatchesNetwork = Boolean(session && walletNetwork === network && session.config.networkId === network);
  const isReady = Boolean(stateComplete && !error && !isExpired && ledgerState.live && signalValue !== null && signalValue >= threshold! && !hasUsed && ledgerState.accepted < ledgerState.capacity && walletMatchesNetwork);

  const prove = useCallback(async () => {
    if (!address) return setMessage(`No ${network} contract address is configured. Ask an operator to deploy or load one in /admin.`);
    if (!stateComplete || !ledgerState) return setMessage('No complete signal window state is indexed. Ask an operator to deploy one first.');
    if (error) return setMessage('The public state could not be read; preflight is not available.');
    if (!walletMatchesNetwork || !session) return setMessage(`Connect a wallet on ${network} before creating a proof.`);
    if (isExpired) return setMessage('This signal window has expired.');
    if (!ledgerState.live) return setMessage('This signal window is paused.');
    if (ledgerState.accepted >= ledgerState.capacity) return setMessage('This signal window is full.');
    if (hasUsed) return setMessage('This private phrase has already been used for the current passport.');
    if (signalValue === null) return setMessage('Enter a whole-number signal between 0 and 1,000,000.');
    if (signalValue < threshold!) return setMessage(`The private signal must clear the public rule of ${threshold}.`);
    setStatus('proving'); setMessage('Building a proof. Your editable demo signal and phrase stay in this browser; the remote prover is trusted to return a valid proof.'); setTxId('');
    try {
      const expectedReceipt = receiptFor(identity.secret, ledgerState.passport);
      const call = await createUnprovenCallTx(session.providers as any, {
        compiledContract: compiled(signalValue, fromHex(identity.secret)), contractAddress: address, circuitId: 'mark_passed', args: [],
        initialPrivateState: {}, witnesses: {},
      } as any);
      const result = await submitTxAsync(session.providers as any, { unprovenTx: call.private.unprovenTx, circuitId: 'mark_passed' } as any);
      const submittedId = typeof result === 'string' && result.trim() ? result : '';
      setTxId(submittedId); setStatus('pending'); setMessage(`Proof submitted${submittedId ? ` (${submittedId})` : ''}. Waiting for the receipt to be indexed…`);
      await waitForStateAdvance(session.providers.publicDataProvider, async provider => {
        const next = await provider.queryContractState(address);
        if (!next?.data) return false;
        const nextLedger: any = (await import('../managed/contract/index.js')).ledger(next.data);
        try { return Boolean(nextLedger.spent_receipts?.member?.(expectedReceipt)); } catch { return false; }
      });
      setStatus('success'); setMessage('Proof accepted. A new anonymous receipt is now indexed.'); await refetch();
    } catch (cause: any) {
      const text = cause?.message || 'The proof could not be submitted.';
      if (text.includes('not indexed yet')) { setStatus('pending'); setMessage(`Proof remains pending: ${text}`); }
      else { setStatus('error'); setMessage(text); }
    }
  }, [address, error, hasUsed, identity.secret, isExpired, ledgerState, network, refetch, session, signalValue, stateComplete, threshold, walletMatchesNetwork]);

  return <div className="page"><div className="page-header"><div className="eyebrow">Signal gate / private witness</div><h1>Bring the signal.<br /><em>Leave the source behind.</em></h1><p>Use a local eligibility signal to enter the active Echora window. This honest demo lets you edit the witness; it does not attest the source of that signal.</p></div><div className="two-col"><div className="panel"><div className="panel-topline"><div className="eyebrow">Public window · {network}</div>{ledgerState?.live && !isExpired ? <span className="status">● LIVE</span> : <span className="status closed">● PAUSED / EXPIRED</span>}</div>{isLoading ? <div className="empty-state">Reading the public field…</div> : error ? <div className="notice error">{error}</div> : !address ? <div className="empty-state">No {network} contract address is configured.<br /><span className="mono">/admin</span> can deploy or load one.</div> : !ledgerState ? <div className="empty-state">No signal window is indexed at <span className="mono">{address}</span>.</div> : <div className="data-list"><div className="data-row"><span className="label">Rule</span><strong>{threshold?.toString()} points</strong></div><div className="data-row"><span className="label">Accepted</span><strong>{ledgerState.accepted?.toString()} / {ledgerState.capacity?.toString()}</strong></div><div className="data-row"><span className="label">Window ends</span><strong>{new Date(Number(ledgerState.window_end) * 1000).toLocaleString()}</strong></div><div className="data-row"><span className="label">Passport</span><strong className="mono">{toHex(ledgerState.passport).slice(0, 12)}…</strong></div></div>}<div className="notice" style={{ marginTop: 20 }}><ShieldCheck size={15} />Only the rule, count, expiry and receipt are public. A remote prover service is trusted for proof generation; it cannot learn the witness from the ZK proof.</div></div><div className="panel"><div className="eyebrow">Your private capsule</div><h2>One local signal.</h2><p>The editable value below is a demo witness, not an attestation. In production, replace it with a credential adapter without changing the public proof surface.</p>{!isConnected && <div className="notice" style={{ marginTop: 18 }}><WalletCards size={15} />Connect 1AM or Lace on {network} to submit a proof.</div>}{isConnected && !walletMatchesNetwork && <div className="notice error" style={{ marginTop: 18 }}>Wallet is on {walletNetwork}; this contract is on {network}. Select the matching network in /admin or reconnect.</div>}<div className="field"><label htmlFor="private-signal">Private signal · never disclosed</label><input id="private-signal" className="input mono" type="number" min="0" max="1000000" step="1" value={signal} onChange={(event) => setSignal(event.target.value)} /></div><div className="data-row"><span className="label">Local capsule fingerprint</span><strong className="mono">{publicFingerprint(identity.secret).slice(0, 14)}…</strong></div><div className="data-row"><span className="label">Replay protection</span><strong style={{ color: hasUsed ? 'var(--danger)' : 'var(--accent)' }}>{hasUsed ? 'Receipt spent' : stateComplete ? 'Ready for this window' : 'Waiting for complete state'}</strong></div>{message && <div className={`notice ${status === 'error' ? 'error' : status === 'success' ? 'success' : ''}`} style={{ marginTop: 18 }}>{message}</div>}{status === 'success' ? <div className="notice success" style={{ marginTop: 18 }}><Check size={15} />Anonymous receipt indexed.{txId && <><div className="mono tx-line">{txId}</div><a className="tiny-button" href={getExplorerTxUrl(txId, network)} target="_blank" rel="noreferrer">View transaction ↗</a></>}</div> : <button className="button primary full-button" disabled={!isReady || status === 'proving' || status === 'pending'} onClick={() => void prove()}>{status === 'proving' ? <><RefreshCw size={15} className="spin" /> Proving in wallet…</> : status === 'pending' ? 'Waiting for indexed receipt…' : <>Create private receipt <ArrowRight size={15} /></>}</button>}{!isConnected && <button className="button full-button" onClick={() => void connect(network)} disabled={isConnecting || walletStatus === 'not-found'}><LockKeyhole size={15} />{isConnecting ? 'Opening wallet…' : `Connect on ${network}`}</button>}</div></div></div>;
}
