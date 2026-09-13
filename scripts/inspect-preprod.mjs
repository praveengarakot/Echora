import { ledger } from '../contracts/managed/echo-gate/contract/index.js';
import { ContractState } from '@midnight-ntwrk/compact-runtime';

const [address] = process.argv.slice(2);
if (!address) throw new Error('Usage: node scripts/inspect-preprod.mjs <contract-address>');
const endpoint = process.env.MIDNIGHT_INDEXER_URL || 'https://indexer.preprod.midnight.network/api/v4/graphql';
const response = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query: 'query($address: HexEncoded!) { contractAction(address: $address) { state } }', variables: { address } }) });
const payload = await response.json();
if (payload.errors?.length) throw new Error(payload.errors[0].message);
const action = payload.data?.contractAction;
if (!action) throw new Error('No indexed state found.');
const state = ledger(ContractState.deserialize(Buffer.from(action.state.replace(/^0x/, ''), 'hex')).data);
console.log(JSON.stringify({ address, threshold: state.signal_threshold.toString(), accepted: state.accepted.toString(), live: state.live, capacity: state.capacity.toString() }, null, 2));
