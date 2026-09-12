import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import type { NetworkConfig } from './config.js';

export type EchoraProviders = {
  privateStateProvider: any;
  publicDataProvider: any;
  zkConfigProvider: any;
  proofProvider: any;
  walletProvider: any;
  midnightProvider: any;
};

export function buildProviders(wallet: any, zkConfigPath: string, config: NetworkConfig): EchoraProviders {
  const zkConfigProvider = new NodeZkConfigProvider(zkConfigPath);
  return {
    privateStateProvider: levelPrivateStateProvider({
      midnightDbName: 'echora-private-state',
      accountId: 'echora-local-account',
      privateStoragePasswordProvider: async () => 'Echora-local-private-state-2026!',
    }),
    publicDataProvider: indexerPublicDataProvider(config.indexer, config.indexerWS),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(config.proofServer, zkConfigProvider),
    walletProvider: wallet.wallet.walletProvider,
    midnightProvider: wallet.wallet.midnightProvider,
  };
}
