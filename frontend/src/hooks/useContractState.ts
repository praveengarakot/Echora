import { useCallback, useEffect, useMemo, useState } from 'react';
import { ledger } from '../managed/contract/index.js';
import { getContractAddress, getContractNetwork, getIndexerUrls, type MidnightNetwork } from '../config';
import { createPatchedPublicDataProvider } from '../lib/midnight';

export function useContractState(
  interval = 5000,
  requestedAddress?: string,
  requestedProvider?: ReturnType<typeof createPatchedPublicDataProvider>,
  requestedNetwork: MidnightNetwork = getContractNetwork(),
) {
  const [ledgerState, setLedgerState] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const address = requestedAddress || getContractAddress(requestedNetwork);
  const provider = useMemo(() => {
    if (requestedProvider) return requestedProvider;
    const urls = getIndexerUrls(requestedNetwork);
    return createPatchedPublicDataProvider(urls.http, urls.ws);
  }, [requestedNetwork, requestedProvider]);

  const refetch = useCallback(async () => {
    if (!address) { setIsLoading(false); setLedgerState(null); setError(null); return; }
    try {
      setIsLoading(true);
      const state = await provider.queryContractState(address);
      setLedgerState(state?.data ? ledger(state.data) : null);
      setError(null); setLastUpdate(new Date());
    } catch (cause: any) {
      setError(cause?.message || 'Unable to read the Midnight indexer.');
    } finally { setIsLoading(false); }
  }, [address, provider]);

  useEffect(() => {
    void refetch();
    const timer = window.setInterval(() => void refetch(), interval);
    return () => window.clearInterval(timer);
  }, [refetch, interval]);
  return { ledgerState, isLoading, error, lastUpdate, refetch };
}
