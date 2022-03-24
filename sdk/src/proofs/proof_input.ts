import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { AccountTx, JoinSplitTx } from '@aztec/barretenberg/client_proofs';
import { SchnorrSignature } from '@aztec/barretenberg/crypto';
import { ViewingKey } from '@aztec/barretenberg/viewing_key';

export interface AccountProofInput {
  tx: AccountTx;
  signingData: Buffer;
  signature?: SchnorrSignature;
}

export interface AccountProofInputJson {
  tx: Uint8Array;
  signingData: Uint8Array;
  signature?: string;
}

export const accountProofInputToJson = ({ tx, signingData, signature }: AccountProofInput): AccountProofInputJson => ({
  tx: new Uint8Array(tx.toBuffer()),
  signingData: new Uint8Array(signingData),
  signature: signature ? signature.toString() : undefined,
});

export const accountProofInputFromJson = ({
  tx,
  signingData,
  signature,
}: AccountProofInputJson): AccountProofInput => ({
  tx: AccountTx.fromBuffer(Buffer.from(tx)),
  signingData: Buffer.from(signingData),
  signature: signature ? SchnorrSignature.fromString(signature) : undefined,
});

export interface JoinSplitProofInput {
  tx: JoinSplitTx;
  viewingKeys: ViewingKey[];
  partialStateSecretEphPubKey?: GrumpkinAddress;
  signingData: Buffer;
  signature?: SchnorrSignature;
}

export interface JoinSplitProofInputJson {
  tx: Uint8Array;
  viewingKeys: string[];
  partialStateSecretEphPubKey?: string;
  signingData: Uint8Array;
  signature?: string;
}

export const joinSplitProofInputToJson = ({
  tx,
  viewingKeys,
  partialStateSecretEphPubKey,
  signingData,
  signature,
}: JoinSplitProofInput): JoinSplitProofInputJson => ({
  tx: new Uint8Array(tx.toBuffer()),
  viewingKeys: viewingKeys.map(vk => vk.toString()),
  partialStateSecretEphPubKey: partialStateSecretEphPubKey ? partialStateSecretEphPubKey.toString() : undefined,
  signingData: new Uint8Array(signingData),
  signature: signature ? signature.toString() : undefined,
});

export const joinSplitProofInputFromJson = ({
  tx,
  viewingKeys,
  partialStateSecretEphPubKey,
  signingData,
  signature,
}: JoinSplitProofInputJson): JoinSplitProofInput => ({
  tx: JoinSplitTx.fromBuffer(Buffer.from(tx)),
  viewingKeys: viewingKeys.map(vk => ViewingKey.fromString(vk)),
  partialStateSecretEphPubKey: partialStateSecretEphPubKey
    ? GrumpkinAddress.fromString(partialStateSecretEphPubKey)
    : undefined,
  signingData: Buffer.from(signingData),
  signature: signature ? SchnorrSignature.fromString(signature) : undefined,
});
