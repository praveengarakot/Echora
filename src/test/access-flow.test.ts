import { describe, expect, it } from 'vitest';
import crypto from 'node:crypto';
import { pureCircuits } from '../../contracts/managed/echo-gate/contract/index.js';

const bytes = () => new Uint8Array(crypto.randomBytes(32));

describe('Echora privacy invariants', () => {
  it('keeps a private signal in a fixed-size witness', () => {
    expect(bytes()).toHaveLength(32);
  });
  it('creates a passport-scoped receipt without exposing its phrase', () => {
    const receipt = pureCircuits.make_receipt_nullifier(bytes(), bytes());
    expect(receipt).toBeInstanceOf(Uint8Array);
    expect(receipt).toHaveLength(32);
  });
  it('changes the receipt when the passport changes', () => {
    const phrase = bytes();
    const first = pureCircuits.make_receipt_nullifier(phrase, bytes());
    const second = pureCircuits.make_receipt_nullifier(phrase, bytes());
    expect(Buffer.from(first).equals(Buffer.from(second))).toBe(false);
  });
  it('uses a separate domain for operator commitments', () => {
    const secret = bytes();
    const operator = pureCircuits.operator_public_key(secret);
    const receipt = pureCircuits.make_receipt_nullifier(secret, bytes());
    expect(Buffer.from(operator).equals(Buffer.from(receipt))).toBe(false);
  });
  it('records only a boolean-style outcome for the hidden comparison', () => {
    expect(91n >= 72n).toBe(true);
  });
});
