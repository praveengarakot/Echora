import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { ContractState } from '@midnight-ntwrk/compact-runtime';
import { LedgerParameters, ZswapChainState } from '@midnight-ntwrk/ledger-v8';
import type { MidnightProvider, WalletProvider } from '@midnight-ntwrk/midnight-js-types';

export function toHex(bytes: Uint8Array | number[] | string): string {
  if (typeof bytes === 'string') return bytes.replace(/^0x/i, '').toLowerCase();
  return Array.from(bytes, (b) => Number(b).toString(16).padStart(2, '0')).join('');
}

export function fromHex(hex: string): Uint8Array {
  const normalized = hex.replace(/^0x/i, '');
  if (normalized.length % 2 || !/^[0-9a-f]*$/i.test(normalized)) throw new Error('Invalid hexadecimal value.');
  const result = new Uint8Array(normalized.length / 2);
  for (let i = 0; i < result.length; i += 1) result[i] = Number.parseInt(normalized.slice(i * 2, i * 2 + 2), 16);
  return result;
}

export function createPrivateStateProvider() {
  let scope = '';
  const state = new Map<string, unknown>();
  const signingKeys = new Map<string, unknown>();
  const key = (id: string) => `${scope}:${id}`;
  return {
    setContractAddress(address: string) { scope = address; },
    async set(id: string, value: unknown) { state.set(key(id), value); },
    async get(id: string) { return state.get(key(id)) ?? null; },
    async remove(id: string) { state.delete(key(id)); },
    async clear() { state.clear(); },
    async setSigningKey(address: string, value: unknown) { signingKeys.set(address, value); },
    async getSigningKey(address: string) { return signingKeys.get(address) ?? null; },
    async removeSigningKey(address: string) { signingKeys.delete(address); },
    async clearSigningKeys() { signingKeys.clear(); },
    async exportPrivateStates() { throw new Error('Private state export is not enabled in this browser session.'); },
    async importPrivateStates() { throw new Error('Private state import is not enabled in this browser session.'); },
    async exportSigningKeys() { throw new Error('Signing key export is not enabled in this browser session.'); },
    async importSigningKeys() { throw new Error('Signing key import is not enabled in this browser session.'); },
  };
}

async function queryLatest(queryUrl: string, query: string, address: string): Promise<any | null> {
  const response = await fetch(queryUrl, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables: { address } }),
  });
  if (!response.ok) throw new Error(`Indexer request failed (${response.status}).`);
  const payload = await response.json();
  if (payload.errors?.length) throw new Error(payload.errors.map((error: any) => error.message).join('; '));
  return payload.data?.contractAction ?? null;
}

export function createPatchedPublicDataProvider(queryUrl: string, subscriptionUrl: string) {
  const base = indexerPublicDataProvider(queryUrl, subscriptionUrl);
  return {
    ...base,
    async queryContractState(contractAddress: string, config?: unknown) {
      // Passing no config to the stock provider emits offset: null on these
      // indexers. Query the latest action directly instead.
      if (config !== undefined) return base.queryContractState(contractAddress, config as any);
      const action = await queryLatest(queryUrl,
        'query ECHORA_STATE($address: HexEncoded!) { contractAction(address: $address) { state } }',
        contractAddress);
      return action?.state ? ContractState.deserialize(fromHex(action.state)) : null;
    },
    async queryZSwapAndContractState(contractAddress: string, config?: unknown) {
      if (config !== undefined) return base.queryZSwapAndContractState(contractAddress, config as any);
      const action = await queryLatest(queryUrl, `
        query ECHORA_BOTH_STATE($address: HexEncoded!) {
          contractAction(address: $address) {
            state zswapState transaction { block { ledgerParameters } }
          }
        }`, contractAddress);
      if (!action?.state || !action?.zswapState) return null;
      return [
        ZswapChainState.deserialize(fromHex(action.zswapState)),
        ContractState.deserialize(fromHex(action.state)),
        action.transaction?.block?.ledgerParameters
          ? LedgerParameters.deserialize(fromHex(action.transaction.block.ledgerParameters))
          : LedgerParameters.initialParameters(),
      ];
    },
  };
}

export type ConnectedSession = {
  api: any;
  config: any;
  unshieldedAddress: string;
  providers: {
    privateStateProvider: ReturnType<typeof createPrivateStateProvider>;
    publicDataProvider: ReturnType<typeof createPatchedPublicDataProvider>;
    zkConfigProvider: FetchZkConfigProvider<any>;
    proofProvider: any;
    walletProvider: WalletProvider;
    midnightProvider: MidnightProvider;
  };
};

function submittedTransactionId(result: unknown, tx: any): string | undefined {
  if (typeof result === 'string' && result.trim()) return result;
  if (result && typeof result === 'object') {
    const candidate = result as any;
    if (typeof candidate.txId === 'string' && candidate.txId) return candidate.txId;
    if (typeof candidate.transactionId === 'string' && candidate.transactionId) return candidate.transactionId;
    if (typeof candidate.id === 'string' && candidate.id) return candidate.id;
  }
  // The connector API is allowed to return void. identifiers() is supplied by
  // the installed Ledger transaction and is an actual transaction identifier;
  // never fabricate a hash from serialized bytes.
  try {
    const identifiers = tx?.identifiers?.();
    return Array.isArray(identifiers) && typeof identifiers[0] === 'string' ? identifiers[0] : undefined;
  } catch {
    return undefined;
  }
}

export async function createConnectedSession(api: any): Promise<ConnectedSession> {
  const [config, unshielded, shielded] = await Promise.all([
    api.getConfiguration(), api.getUnshieldedAddress(), api.getShieldedAddresses(),
  ]);
  if (config?.networkId !== 'preview' && config?.networkId !== 'preprod') {
    throw new Error(`Unsupported Midnight network: ${config?.networkId || 'unknown'}.`);
  }
  setNetworkId(config.networkId);
  const zkConfigProvider = new FetchZkConfigProvider(
    new URL('/managed', window.location.origin).toString(), window.fetch.bind(window),
  );
  const provingProvider = await api.getProvingProvider(zkConfigProvider);
  const proofProvider = {
    async proveTx(unprovenTx: any) {
      const { CostModel } = await import('@midnight-ntwrk/ledger-v8');
      return unprovenTx.prove(provingProvider, CostModel.initialCostModel());
    },
  };
  const walletProvider: WalletProvider = {
    getCoinPublicKey: () => shielded.shieldedCoinPublicKey,
    getEncryptionPublicKey: () => shielded.shieldedEncryptionPublicKey,
    balanceTx: async (tx: any) => {
      const balanced = await api.balanceUnsealedTransaction(toHex(tx.serialize()));
      if (!balanced?.tx) throw new Error('Wallet could not balance this transaction.');
      const { Transaction } = await import('@midnight-ntwrk/ledger-v8');
      return Transaction.deserialize('signature', 'proof', 'binding', fromHex(balanced.tx));
    },
  };
  const midnightProvider: MidnightProvider = {
    submitTx: (async (tx: any) => {
      const result = await api.submitTransaction(toHex(tx.serialize()));
      const id = submittedTransactionId(result, tx);
      // The connector API may legitimately return void. The async Midnight.js
      // path does not watch here, so callers can still poll state without a
      // fabricated identifier.
      return id;
    }) as any,
  };
  return {
    api, config,
    unshieldedAddress: typeof unshielded === 'string' ? unshielded : unshielded.unshieldedAddress,
    providers: {
      privateStateProvider: createPrivateStateProvider(),
      publicDataProvider: createPatchedPublicDataProvider(config.indexerUri, config.indexerWsUri),
      zkConfigProvider, proofProvider, walletProvider, midnightProvider,
    },
  };
}

export async function waitForContractDeployment(
  publicDataProvider: ReturnType<typeof createPatchedPublicDataProvider>,
  contractAddress: string,
  pollIntervalMs = 2000,
  maxAttempts = 30,
): Promise<void> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const state = await publicDataProvider.queryContractState(contractAddress);
    if (state?.data) return;
    if (attempt + 1 < maxAttempts) await new Promise((resolve) => window.setTimeout(resolve, pollIntervalMs));
  }
  throw new Error(`Contract is not indexed yet (waited ${Math.round((pollIntervalMs * maxAttempts) / 1000)} seconds).`);
}

export async function waitForStateAdvance(
  publicDataProvider: ReturnType<typeof createPatchedPublicDataProvider>,
  predicate: (provider: ReturnType<typeof createPatchedPublicDataProvider>) => Promise<boolean>,
  pollIntervalMs = 2000,
  maxAttempts = 30,
): Promise<void> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (await predicate(publicDataProvider)) return;
    if (attempt + 1 < maxAttempts) await new Promise((resolve) => window.setTimeout(resolve, pollIntervalMs));
  }
  throw new Error(`The transaction was submitted but state is not indexed yet (waited ${Math.round((pollIntervalMs * maxAttempts) / 1000)} seconds).`);
}
