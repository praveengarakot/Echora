import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
  read_private_signal(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint];
  read_secret_phrase(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  operator_secret(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
}

export type ImpureCircuits<PS> = {
  mark_passed(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  rotate_window(context: __compactRuntime.CircuitContext<PS>,
                new_threshold_0: bigint,
                new_pass_0: Uint8Array,
                new_deadline_0: bigint,
                new_issuer_0: Uint8Array,
                new_limit_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  pause_window(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  resume_window(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  mark_passed(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  rotate_window(context: __compactRuntime.CircuitContext<PS>,
                new_threshold_0: bigint,
                new_pass_0: Uint8Array,
                new_deadline_0: bigint,
                new_issuer_0: Uint8Array,
                new_limit_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  pause_window(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  resume_window(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
  operator_public_key(secret_0: Uint8Array): Uint8Array;
  make_receipt_nullifier(phrase_0: Uint8Array, pass_0: Uint8Array): Uint8Array;
}

export type Circuits<PS> = {
  mark_passed(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  rotate_window(context: __compactRuntime.CircuitContext<PS>,
                new_threshold_0: bigint,
                new_pass_0: Uint8Array,
                new_deadline_0: bigint,
                new_issuer_0: Uint8Array,
                new_limit_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  pause_window(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  resume_window(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  operator_public_key(context: __compactRuntime.CircuitContext<PS>,
                      secret_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  make_receipt_nullifier(context: __compactRuntime.CircuitContext<PS>,
                         phrase_0: Uint8Array,
                         pass_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
}

export type Ledger = {
  readonly signal_threshold: bigint;
  readonly passport: Uint8Array;
  readonly window_end: bigint;
  readonly issuer_tag: Uint8Array;
  readonly operator_commitment: Uint8Array;
  readonly live: boolean;
  readonly accepted: bigint;
  readonly capacity: bigint;
  spent_receipts: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  receipt_index: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): Uint8Array;
    [Symbol.iterator](): Iterator<[Uint8Array, Uint8Array]>
  };
  readonly protocol: Uint8Array;
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>,
               threshold_0: bigint,
               pass_0: Uint8Array,
               deadline_0: bigint,
               issuer_0: Uint8Array,
               operator_hash_0: Uint8Array,
               limit_0: bigint): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
