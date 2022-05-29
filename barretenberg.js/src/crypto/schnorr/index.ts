import { BarretenbergWasm } from '../../wasm';
import { SchnorrSignature } from './signature';

import { serializeBufferArrayToVector } from '../../serialize';

export * from './signature';

export class Schnorr {
  constructor(private wasm: BarretenbergWasm) {}

  public constructSignature(msg: Uint8Array, pk: Uint8Array) {
    this.wasm.transferToHeap(pk, 64);
    this.wasm.transferToHeap(msg, 96);
    this.wasm.call('construct_signature', 96, msg.length, 64, 0, 32);
    return new SchnorrSignature(Buffer.from(this.wasm.sliceMemory(0, 64)));
  }

  public computePublicKey(pk: Uint8Array) {
    this.wasm.transferToHeap(pk, 0);
    this.wasm.call('compute_public_key', 0, 32);
    return Buffer.from(this.wasm.sliceMemory(32, 96));
  }

  public verifySignature(msg: Uint8Array, pubKey: Uint8Array, sig: SchnorrSignature) {
    this.wasm.transferToHeap(pubKey, 0);
    this.wasm.transferToHeap(sig.s(), 64);
    this.wasm.transferToHeap(sig.e(), 96);
    this.wasm.transferToHeap(msg, 128);
    return this.wasm.call('verify_signature', 128, msg.length, 0, 64, 96) ? true : false;
  }

  public multiSigComputePublicKey(pk: Uint8Array) {
    this.wasm.transferToHeap(pk, 128);
    this.wasm.call('multisig_create_multisig_public_key', 128, 0);
    return Buffer.from(this.wasm.sliceMemory(0, 128));
  }

  public multiSigValidateAndCombinePublicKeys(pubKeys: Buffer[]) {
    const buffer = serializeBufferArrayToVector(pubKeys);
    this.wasm.transferToHeap(buffer, 64);
    this.wasm.call('multisig_validate_and_combine_signer_pubkeys', 64, 0);
    return Buffer.from(this.wasm.sliceMemory(0, 64));
  }

  public multiSigRoundOne() {
    this.wasm.call('multisig_construct_signature_round_1', 0, 128);

    return {
      publicOutput: Buffer.from(this.wasm.sliceMemory(0, 128)),
      privateOutput: Buffer.from(this.wasm.sliceMemory(128, 192)),
    };
  }

  public multiSigRoundTwo(
    msg: Uint8Array,
    pk: Uint8Array,
    signerrRoundOnePrivateOutput: Buffer,
    pubKeys: Buffer[],
    roundOnePublicOutputs: Buffer[],
  ) {
    const pubKeysBuffer = serializeBufferArrayToVector(pubKeys);
    const roundOneOutputsBuffer = serializeBufferArrayToVector(roundOnePublicOutputs);
    const msgPtr = 32;

    this.wasm.transferToHeap(msg, msgPtr);
    const pkPtr = msgPtr + msg.length;
    this.wasm.transferToHeap(pk, pkPtr);
    const roundOnePrivatePtr = pkPtr + 32;
    this.wasm.transferToHeap(signerrRoundOnePrivateOutput, roundOnePrivatePtr);
    const pubKeysPtr = roundOnePrivatePtr + 64;
    this.wasm.transferToHeap(pubKeysBuffer, pubKeysPtr);
    const roundOnePtr = pubKeysPtr + pubKeysBuffer.length;
    this.wasm.transferToHeap(roundOneOutputsBuffer, roundOnePtr);

    this.wasm.call(
      'multisig_construct_signature_round_2',
      msgPtr,
      msg.length,
      pkPtr,
      roundOnePrivatePtr,
      pubKeysPtr,
      roundOnePtr,
      0,
    );
    return Buffer.from(this.wasm.sliceMemory(0, 32));
  }

  public multiSigCombineSignatures(
    msg: Uint8Array,
    pubKeys: Buffer[],
    roundOneOutputs: Buffer[],
    roundTwoOutputs: Buffer[],
  ) {
    const pubKeysBuffer = serializeBufferArrayToVector(pubKeys);
    const roundOneOutputsBuffer = serializeBufferArrayToVector(roundOneOutputs);
    const roundTwoOutputsBuffer = serializeBufferArrayToVector(roundTwoOutputs);

    const msgPtr = 64;

    this.wasm.transferToHeap(msg, msgPtr);
    const pubKeysPtr = msgPtr + msg.length;
    this.wasm.transferToHeap(pubKeysBuffer, pubKeysPtr);
    const roundOnePtr = pubKeysPtr + pubKeysBuffer.length;
    this.wasm.transferToHeap(roundOneOutputsBuffer, roundOnePtr);
    const roundTwoPtr = roundOnePtr + roundOneOutputsBuffer.length;
    this.wasm.transferToHeap(roundTwoOutputsBuffer, roundTwoPtr);

    this.wasm.call('multisig_combine_signatures', msgPtr, msg.length, pubKeysPtr, roundOnePtr, roundTwoPtr, 0, 32);
    return new SchnorrSignature(Buffer.from(this.wasm.sliceMemory(0, 64)));
  }
}
