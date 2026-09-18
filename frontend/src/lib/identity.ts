import { pureCircuits } from '../managed/contract/index.js';
import { fromHex, toHex } from './midnight';

export type PrivateIdentity = { secret: string; label: string; createdAt: number };
const STORAGE_KEY = 'ECHORA_PRIVATE_SIGNAL_V1';

function randomHex() { return toHex(crypto.getRandomValues(new Uint8Array(32))); }

export function getIdentity(): PrivateIdentity {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) try {
      const value = JSON.parse(saved);
      if (value.secret?.length === 64) return value;
    } catch { /* regenerate a local identity */ }
  }
  const identity = { secret: randomHex(), label: 'Local signal capsule', createdAt: Date.now() };
  if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
  return identity;
}

export function receiptFor(secret: string, passport: Uint8Array) {
  return (pureCircuits as any).make_receipt_nullifier(fromHex(secret), passport) as Uint8Array;
}

export function publicFingerprint(secret: string) {
  try { return toHex((pureCircuits as any).make_receipt_nullifier(fromHex(secret), new Uint8Array(32))); } catch { return ''; }
}

export function hasUsedPass(secret: string, state: any): boolean {
  if (!state?.passport) return false;
  const target = toHex(receiptFor(secret, state.passport));
  try {
    if (state.spent_receipts?.member?.(fromHex(target))) return true;
    if (state.spent_receipts?.[Symbol.iterator]) {
      for (const value of state.spent_receipts) if (toHex(value) === target) return true;
    }
  } catch { return false; }
  return false;
}
