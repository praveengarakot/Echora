import { beforeAll, describe, expect, it } from 'vitest';
import crypto from 'node:crypto';
import { createCircuitContext, createConstructorContext, dummyContractAddress, sampleUserAddress } from '@midnight-ntwrk/compact-runtime';
import { Contract, ledger, pureCircuits } from '../../contracts/managed/echo-gate/contract/index.js';

const bytes = () => new Uint8Array(crypto.randomBytes(32));

describe('Echora Compact contract', () => {
  let contract: Contract;
  let state: any;
  const contractAddress = dummyContractAddress();
  const userAddress = sampleUserAddress();
  const passport = bytes();
  const issuer = bytes();
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 86_400);
  const operatorSecret = bytes();
  let memberPhrase: Uint8Array;

  beforeAll(() => {
    const operatorHash = pureCircuits.operator_public_key(operatorSecret);
    contract = new Contract({
      read_private_signal: () => [{}, 90n],
      read_secret_phrase: () => [{}, bytes()],
      operator_secret: () => [{}, operatorSecret],
    } as any);
    const result = contract.initialState(createConstructorContext({}, userAddress), 72n, passport, deadline, issuer, operatorHash, 10n);
    state = result.currentContractState.data;
    memberPhrase = bytes();
  });

  it('initializes the public window state', () => {
    const value = ledger(state);
    expect(value.signal_threshold).toBe(72n);
    expect(value.live).toBe(true);
    expect(value.accepted).toBe(0n);
    expect(value.capacity).toBe(10n);
    expect(value.protocol).toHaveLength(32);
  });

  it('accepts a qualifying private signal', () => {
    contract.witnesses = { read_private_signal: () => [{}, 90n], read_secret_phrase: () => [{}, memberPhrase], operator_secret: () => [{}, operatorSecret] } as any;
    const result = contract.circuits.mark_passed(createCircuitContext(contractAddress, userAddress, state, {}));
    state = result.context.currentQueryContext.state;
    expect(ledger(state).accepted).toBe(1n);
  });

  it('rejects a private signal below the public rule', () => {
    contract.witnesses = { read_private_signal: () => [{}, 20n], read_secret_phrase: () => [{}, bytes()], operator_secret: () => [{}, operatorSecret] } as any;
    expect(() => contract.circuits.mark_passed(createCircuitContext(contractAddress, userAddress, state, {}))).toThrow(/Private signal/);
  });

  it('prevents the same private phrase from being reused', () => {
    contract.witnesses = { read_private_signal: () => [{}, 90n], read_secret_phrase: () => [{}, memberPhrase], operator_secret: () => [{}, operatorSecret] } as any;
    expect(() => contract.circuits.mark_passed(createCircuitContext(contractAddress, userAddress, state, {}))).toThrow(/already been used/);
  });

  it('rejects an operator action with the wrong private secret', () => {
    contract.witnesses = { read_private_signal: () => [{}, 90n], read_secret_phrase: () => [{}, bytes()], operator_secret: () => [{}, bytes()] } as any;
    expect(() => contract.circuits.pause_window(createCircuitContext(contractAddress, userAddress, state, {}))).toThrow(/authorization/i);
  });

  it('allows only the operator to pause and resume the window', () => {
    contract.witnesses = { read_private_signal: () => [{}, 90n], read_secret_phrase: () => [{}, bytes()], operator_secret: () => [{}, operatorSecret] } as any;
    let result = contract.circuits.pause_window(createCircuitContext(contractAddress, userAddress, state, {}));
    state = result.context.currentQueryContext.state;
    expect(ledger(state).live).toBe(false);
    expect(() => contract.circuits.mark_passed(createCircuitContext(contractAddress, userAddress, state, {}))).toThrow(/paused/i);
    result = contract.circuits.resume_window(createCircuitContext(contractAddress, userAddress, state, {}));
    state = result.context.currentQueryContext.state;
    expect(ledger(state).live).toBe(true);
  });

  it('derives different receipts for different passports', () => {
    const first = pureCircuits.make_receipt_nullifier(bytes(), passport);
    const second = pureCircuits.make_receipt_nullifier(bytes(), passport);
    expect(first).toHaveLength(32);
    expect(Buffer.from(first).equals(Buffer.from(second))).toBe(false);
  });
});
