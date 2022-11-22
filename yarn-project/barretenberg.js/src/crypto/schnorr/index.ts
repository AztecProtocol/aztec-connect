import { BarretenbergWasm } from '../../wasm/index.js';
import { SchnorrSignature } from './signature.js';
import { GrumpkinAddress } from '../../address/index.js';
import { serializeBufferArrayToVector } from '../../serialize/index.js';

export * from './signature.js';

export class Schnorr {
  constructor(private wasm: BarretenbergWasm) {}

  public computePublicKey(pk: Uint8Array) {
    this.wasm.transferToHeap(pk, 0);
    this.wasm.call('compute_public_key', 0, 32);
    return Buffer.from(this.wasm.sliceMemory(32, 96));
  }

  // Negate the public key (effectively negating the y-coordinate of the public key) and return the resulting public key.
  public negatePublicKey(key: GrumpkinAddress) {
    const keyBuffer = key.toBuffer();
    this.wasm.transferToHeap(keyBuffer, 0);
    this.wasm.call('negate_public_key', 0, 0);
    const newKeyBuffer = Buffer.from(this.wasm.sliceMemory(0, keyBuffer.length));
    return new GrumpkinAddress(newKeyBuffer);
  }

  public constructSignature(msg: Uint8Array, pk: Uint8Array) {
    this.wasm.transferToHeap(pk, 64);
    this.wasm.transferToHeap(msg, 96);
    this.wasm.call('construct_signature', 96, msg.length, 64, 0, 32);
    return new SchnorrSignature(Buffer.from(this.wasm.sliceMemory(0, 64)));
  }

  public verifySignature(msg: Uint8Array, pubKey: Uint8Array, sig: SchnorrSignature) {
    this.wasm.transferToHeap(pubKey, 0);
    this.wasm.transferToHeap(sig.s(), 64);
    this.wasm.transferToHeap(sig.e(), 96);
    this.wasm.transferToHeap(msg, 128);
    return this.wasm.call('verify_signature', 128, msg.length, 0, 64, 96) ? true : false;
  }

  // upon input a private key pk, generate a 'multisig publickey' which is the same public key
  // augmented with a proof of possession
  public multiSigComputePublicKey(pk: Uint8Array) {
    this.wasm.transferToHeap(pk, 128);
    this.wasm.call('multisig_create_multisig_public_key', 128, 0);
    return Buffer.from(this.wasm.sliceMemory(0, 128));
  }

  // upon input an array of 'multisig publickey's, return the aggregated public key
  // that the group of signers can create a signature for.
  // If any of these keys are invalid, returns an invalid public key. The caller should
  // always check if this key is valid before proceeding.
  public multiSigValidateAndCombinePublicKeys(pubKeys: Buffer[]) {
    const buffer = serializeBufferArrayToVector(pubKeys);
    this.wasm.transferToHeap(buffer, 64);
    const success = this.wasm.call('multisig_validate_and_combine_signer_pubkeys', 64, 0);
    return success ? Buffer.from(this.wasm.sliceMemory(0, 64)) : Buffer.alloc(64);
  }

  // generate the nonces as a public/private pair ({R,S}, {r,s}). This round can be run in advance
  // as a form of preprocessing, as it does not depend on the message being signed.
  // the private output should be safely stored by the user, while the public inputs can be shared
  // with a coordinator who will be in charge of initiating round 2 with the desired message.
  public multiSigRoundOne() {
    this.wasm.call('multisig_construct_signature_round_1', 0, 128);

    return {
      publicOutput: Buffer.from(this.wasm.sliceMemory(0, 128)),
      privateOutput: Buffer.from(this.wasm.sliceMemory(128, 192)),
    };
  }

  // once all users have uploaded their public input from round 1, they are given the message
  // as well as all public outputs from the other participants in this session.
  // At the end of this round, each user returns their share of the final signature,
  // which can either be sent to all other participants to create the signature,
  // or to the coordinator.
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

    const success = this.wasm.call(
      'multisig_construct_signature_round_2',
      msgPtr,
      msg.length,
      pkPtr,
      roundOnePrivatePtr,
      pubKeysPtr,
      roundOnePtr,
      0,
    );
    return success ? Buffer.from(this.wasm.sliceMemory(0, 32)) : Buffer.alloc(32);
  }

  // given the outputs of both rounds, this party (either a signer or coordinator)
  // will validate all outputs and attempt to reconstruct a signature for the given message
  // which would be valid for the aggregated public key of the signers.
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

    const success = this.wasm.call(
      'multisig_combine_signatures',
      msgPtr,
      msg.length,
      pubKeysPtr,
      roundOnePtr,
      roundTwoPtr,
      0,
      32,
    );
    return success ? new SchnorrSignature(Buffer.from(this.wasm.sliceMemory(0, 64))) : undefined;
  }
}
