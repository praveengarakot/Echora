export type MidnightNetwork = 'preview' | 'preprod';

const NETWORK_KEY = 'ECHORA_SELECTED_NETWORK';
const ADDRESS_KEYS: Record<MidnightNetwork, string> = {
  preview: 'ECHORA_CONTRACT_ADDRESS_PREVIEW',
  preprod: 'ECHORA_CONTRACT_ADDRESS_PREPROD',
};

export function isMidnightNetwork(value: unknown): value is MidnightNetwork {
  return value === 'preview' || value === 'preprod';
}

export function isValidContractAddress(value: string): boolean {
  const normalized = value.trim();
  return /^(?:0x)?[0-9a-fA-F]{64}$/.test(normalized) || /^mn_addr_(?:preview|preprod|mainnet|undeployed)1[0-9a-z]+$/.test(normalized);
}

export function normalizeContractAddress(value: string): string {
  const normalized = value.trim().replace(/^0x/i, '');
  if (!/^[0-9a-fA-F]{64}$/.test(normalized) && !/^mn_addr_(?:preview|preprod|mainnet|undeployed)1[0-9a-z]+$/.test(normalized)) {
    throw new Error('Contract address must be a Midnight mn_addr_… address or 64 hexadecimal characters.');
  }
  return normalized.toLowerCase();
}

export const getContractNetwork = (): MidnightNetwork => {
  if (typeof window !== 'undefined') {
    const selected = localStorage.getItem(NETWORK_KEY);
    if (isMidnightNetwork(selected)) {
      if (import.meta.env.VITE_NETWORK_ID === 'preprod' && selected === 'preview') {
        localStorage.setItem(NETWORK_KEY, 'preprod');
        return 'preprod';
      }
      return selected;
    }
  }
  // Preprod is the intentional network default.
  return import.meta.env.VITE_NETWORK_ID === 'preview' ? 'preview' : 'preprod';
};

export const setContractNetwork = (value: MidnightNetwork) => {
  if (typeof window !== 'undefined') localStorage.setItem(NETWORK_KEY, value);
};

function envAddress(network: MidnightNetwork): string {
  const env = import.meta.env as Record<string, string | undefined>;
  const value = network === 'preview'
    ? env.VITE_PREVIEW_CONTRACT_ADDRESS || env.VITE_CONTRACT_ADDRESS_PREVIEW
    : env.VITE_PREPROD_CONTRACT_ADDRESS || env.VITE_CONTRACT_ADDRESS_PREPROD;
  const generic = env.VITE_CONTRACT_ADDRESS && env.VITE_NETWORK_ID === network ? env.VITE_CONTRACT_ADDRESS : value;
  return typeof generic === 'string' && isValidContractAddress(generic) ? normalizeContractAddress(generic) : '';
}

export const getContractAddress = (network: MidnightNetwork = getContractNetwork()): string => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(ADDRESS_KEYS[network]);
    if (stored && isValidContractAddress(stored)) return normalizeContractAddress(stored);
    const generic = localStorage.getItem('DEPLOYED_CONTRACT_ADDRESS');
    if (generic && isValidContractAddress(generic) && (generic.includes(`mn_addr_${network}1`) || /^[0-9a-f]{64}$/i.test(generic.replace(/^0x/i, '')))) return normalizeContractAddress(generic);
  }
  return envAddress(network);
};

export const setContractAddress = (address: string, network: MidnightNetwork = getContractNetwork()) => {
  const normalized = normalizeContractAddress(address);
  if (typeof window !== 'undefined') {
    localStorage.setItem(ADDRESS_KEYS[network], normalized);
    localStorage.setItem('DEPLOYED_CONTRACT_ADDRESS', normalized);
  }
};

export function getIndexerUrls(network: MidnightNetwork) {
  const configuredNetwork = network === 'preview' ? 'VITE_PREVIEW' : 'VITE_PREPROD';
  const defaultHttp = network === 'preview'
    ? 'https://indexer.preview.midnight.network/api/v4/graphql'
    : 'https://indexer.preprod.midnight.network/api/v4/graphql';
  const defaultWs = network === 'preview'
    ? 'wss://indexer.preview.midnight.network/api/v4/graphql/ws'
    : 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws';
  const env = import.meta.env as Record<string, string | undefined>;
  const genericMatchesNetwork = !env.VITE_NETWORK_ID || env.VITE_NETWORK_ID === network;
  return {
    http: env[`${configuredNetwork}_INDEXER_URL`] || (genericMatchesNetwork ? env.VITE_INDEXER_URL : undefined) || defaultHttp,
    ws: env[`${configuredNetwork}_INDEXER_WS`] || (genericMatchesNetwork ? env.VITE_INDEXER_WS : undefined) || defaultWs,
  };
}

// Kept for compatibility with consumers that only need the selected network.
export const INDEXER_URL = getIndexerUrls(getContractNetwork()).http;
export const INDEXER_WS = getIndexerUrls(getContractNetwork()).ws;

export const getExplorerContractUrl = (address = getContractAddress(), networkId: MidnightNetwork = getContractNetwork()) =>
  address ? `https://explorer.1am.xyz/contract/${address}?network=${networkId}` : 'https://explorer.1am.xyz';

export const getExplorerTxUrl = (txId: string, networkId: MidnightNetwork = getContractNetwork()) =>
  `https://explorer.1am.xyz/tx/${txId}?network=${networkId}`;

export const DEFAULT_SIGNAL_THRESHOLD = 72n;
export const DEFAULT_CAPACITY = 144n;
