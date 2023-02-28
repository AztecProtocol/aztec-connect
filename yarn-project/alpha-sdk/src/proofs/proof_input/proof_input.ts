import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { AccountTx } from '@aztec/barretenberg/client_proofs';
import { ViewingKey } from '@aztec/barretenberg/viewing_key';
import {
  JoinSplitTxInput,
  joinSplitTxInputFromJson,
  JoinSplitTxInputJson,
  joinSplitTxInputToJson,
} from './join_split_tx_input.js';
import { ProofInputType } from './proof_input_type.js';

export { AccountTx } from '@aztec/barretenberg/client_proofs';

export interface AccountProofInput {
  type: ProofInputType.AccountProofInput;
  tx: AccountTx;
  signingData: Buffer;
}

export interface AccountProofInputJson {
  type: ProofInputType.AccountProofInput;
  tx: string;
  signingData: string;
}

export const accountProofInputToJson = ({ type, tx, signingData }: AccountProofInput): AccountProofInputJson => ({
  type,
  tx: tx.toBuffer().toString('base64'),
  signingData: signingData.toString('base64'),
});

export const accountProofInputFromJson = ({ type, tx, signingData }: AccountProofInputJson): AccountProofInput => ({
  type,
  tx: AccountTx.fromBuffer(Buffer.from(tx, 'base64')),
  signingData: Buffer.from(signingData, 'base64'),
});

export interface PaymentProofInput {
  type: ProofInputType.PaymentProofInput;
  tx: JoinSplitTxInput;
  viewingKeys: ViewingKey[];
  signingData: Buffer;
}

export interface PaymentProofInputJson {
  type: ProofInputType.PaymentProofInput;
  tx: JoinSplitTxInputJson;
  viewingKeys: string[];
  signingData: string;
}

export const paymentProofInputToJson = ({
  type,
  tx,
  viewingKeys,
  signingData,
}: PaymentProofInput): PaymentProofInputJson => ({
  type,
  tx: joinSplitTxInputToJson(tx),
  viewingKeys: viewingKeys.map(vk => vk.toString()),
  signingData: signingData.toString('base64'),
});

export const paymentProofInputFromJson = ({
  type,
  tx,
  viewingKeys,
  signingData,
}: PaymentProofInputJson): PaymentProofInput => ({
  type,
  tx: joinSplitTxInputFromJson(tx),
  viewingKeys: viewingKeys.map(vk => ViewingKey.fromString(vk)),
  signingData: Buffer.from(signingData, 'base64'),
});

export interface DefiProofInput {
  type: ProofInputType.DefiProofInput;
  tx: JoinSplitTxInput;
  viewingKey: ViewingKey;
  partialStateSecretEphPubKey: GrumpkinAddress;
  signingData: Buffer;
}

export interface DefiProofInputJson {
  type: ProofInputType.DefiProofInput;
  tx: JoinSplitTxInputJson;
  viewingKey: string;
  partialStateSecretEphPubKey: string;
  signingData: string;
}

export const defiProofInputToJson = ({
  type,
  tx,
  viewingKey,
  partialStateSecretEphPubKey,
  signingData,
}: DefiProofInput): DefiProofInputJson => ({
  type,
  tx: joinSplitTxInputToJson(tx),
  viewingKey: viewingKey.toString(),
  partialStateSecretEphPubKey: partialStateSecretEphPubKey.toString(),
  signingData: signingData.toString('base64'),
});

export const defiProofInputFromJson = ({
  type,
  tx,
  viewingKey,
  partialStateSecretEphPubKey,
  signingData,
}: DefiProofInputJson): DefiProofInput => ({
  type,
  tx: joinSplitTxInputFromJson(tx),
  viewingKey: ViewingKey.fromString(viewingKey),
  partialStateSecretEphPubKey: GrumpkinAddress.fromString(partialStateSecretEphPubKey),
  signingData: Buffer.from(signingData, 'base64'),
});

export type ProofInput = AccountProofInput | PaymentProofInput | DefiProofInput;
export type ProofInputJson = AccountProofInputJson | PaymentProofInputJson | DefiProofInputJson;

// For endpoints that take any ProofInput
export const proofInputToJson = (proofInput: ProofInput) => {
  if (proofInput.type === ProofInputType.DefiProofInput) {
    return defiProofInputToJson(proofInput);
  } else if (proofInput.type === ProofInputType.AccountProofInput) {
    return accountProofInputToJson(proofInput);
  } else {
    return paymentProofInputToJson(proofInput);
  }
};

// For endpoints that take any ProofInput
export const proofInputFromJson = (proofInput: ProofInputJson) => {
  if (proofInput.type === ProofInputType.DefiProofInput) {
    return defiProofInputFromJson(proofInput);
  } else if (proofInput.type === ProofInputType.AccountProofInput) {
    return accountProofInputFromJson(proofInput);
  } else {
    return paymentProofInputFromJson(proofInput);
  }
};
