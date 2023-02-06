import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { AccountTx } from '@aztec/barretenberg/client_proofs';
import { ViewingKey } from '@aztec/barretenberg/viewing_key';
import {
  JoinSplitTxInput,
  joinSplitTxInputFromJson,
  JoinSplitTxInputJson,
  joinSplitTxInputToJson,
} from './join_split_tx_input.js';

export { AccountTx } from '@aztec/barretenberg/client_proofs';

export interface AccountProofInput {
  tx: AccountTx;
  signingData: Buffer;
}

export interface AccountProofInputJson {
  tx: Uint8Array;
  signingData: Uint8Array;
}

export const accountProofInputToJson = ({ tx, signingData }: AccountProofInput): AccountProofInputJson => ({
  tx: new Uint8Array(tx.toBuffer()),
  signingData: new Uint8Array(signingData),
});

export const accountProofInputFromJson = ({ tx, signingData }: AccountProofInputJson): AccountProofInput => ({
  tx: AccountTx.fromBuffer(Buffer.from(tx)),
  signingData: Buffer.from(signingData),
});

export interface PaymentProofInput {
  tx: JoinSplitTxInput;
  viewingKeys: ViewingKey[];
  signingData: Buffer;
}

export interface PaymentProofInputJson {
  tx: JoinSplitTxInputJson;
  viewingKeys: string[];
  signingData: Uint8Array;
}

export const paymentProofInputToJson = ({
  tx,
  viewingKeys,
  signingData,
}: PaymentProofInput): PaymentProofInputJson => ({
  tx: joinSplitTxInputToJson(tx),
  viewingKeys: viewingKeys.map(vk => vk.toString()),
  signingData: new Uint8Array(signingData),
});

export const paymentProofInputFromJson = ({
  tx,
  viewingKeys,
  signingData,
}: PaymentProofInputJson): PaymentProofInput => ({
  tx: joinSplitTxInputFromJson(tx),
  viewingKeys: viewingKeys.map(vk => ViewingKey.fromString(vk)),
  signingData: Buffer.from(signingData),
});

export interface DefiProofInput {
  tx: JoinSplitTxInput;
  viewingKey: ViewingKey;
  partialStateSecretEphPubKey: GrumpkinAddress;
  signingData: Buffer;
}

export interface DefiProofInputJson {
  tx: JoinSplitTxInputJson;
  viewingKey: string;
  partialStateSecretEphPubKey: string;
  signingData: Uint8Array;
}

export const defiProofInputToJson = ({
  tx,
  viewingKey,
  partialStateSecretEphPubKey,
  signingData,
}: DefiProofInput): DefiProofInputJson => ({
  tx: joinSplitTxInputToJson(tx),
  viewingKey: viewingKey.toString(),
  partialStateSecretEphPubKey: partialStateSecretEphPubKey.toString(),
  signingData: new Uint8Array(signingData),
});

export const defiProofInputFromJson = ({
  tx,
  viewingKey,
  partialStateSecretEphPubKey,
  signingData,
}: DefiProofInputJson): DefiProofInput => ({
  tx: joinSplitTxInputFromJson(tx),
  viewingKey: ViewingKey.fromString(viewingKey),
  partialStateSecretEphPubKey: GrumpkinAddress.fromString(partialStateSecretEphPubKey),
  signingData: Buffer.from(signingData),
});

export type ProofInput = AccountProofInput | PaymentProofInput | DefiProofInput;
