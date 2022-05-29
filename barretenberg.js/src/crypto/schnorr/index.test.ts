import { Schnorr } from './index';
import { TextEncoder } from 'util';
import { BarretenbergWasm } from '../../wasm';
import { Grumpkin } from '../../ecc/grumpkin';

describe('schnorr', () => {
  let barretenberg!: BarretenbergWasm;
  let schnorr!: Schnorr;
  let grumpkin!: Grumpkin;

  beforeAll(async () => {
    barretenberg = new BarretenbergWasm();
    await barretenberg.init();
    schnorr = new Schnorr(barretenberg);
    grumpkin = new Grumpkin(barretenberg);
  });

  it('should verify signature', () => {
    // prettier-ignore
    const pk = Buffer.from([
      0x0b, 0x9b, 0x3a, 0xde, 0xe6, 0xb3, 0xd8, 0x1b, 0x28, 0xa0, 0x88, 0x6b, 0x2a, 0x84, 0x15, 0xc7, 0xda, 0x31, 0x29,
      0x1a, 0x5e, 0x96, 0xbb, 0x7a, 0x56, 0x63, 0x9e, 0x17, 0x7d, 0x30, 0x1b, 0xeb,
    ]);
    const pubKey = schnorr.computePublicKey(pk);
    const msg = new TextEncoder().encode('The quick brown dog jumped over the lazy fox.');
    const signature = schnorr.constructSignature(msg, pk);
    const verified = schnorr.verifySignature(msg, pubKey, signature);

    expect(verified).toBe(true);
  });

  it('should create + verify multi signature', () => {
    const pks: Buffer[] = [];
    const pubKeys: Buffer[] = [];
    const roundOnePublicOutputs: Buffer[] = [];
    const roundOnePrivateOutputs: Buffer[] = [];
    const roundTwoOutputs: Buffer[] = [];
    const numSigners = 7;
    const msg = new TextEncoder().encode('The quick brown dog jumped over the lazy fox.');

    // set up multisig accounts
    for (let i = 0; i < numSigners; ++i) {
      const pk = grumpkin.getRandomFr();
      pks.push(pk);
      pubKeys.push(schnorr.multiSigComputePublicKey(pk));
    }

    // round one
    for (let i = 0; i < numSigners; ++i) {
      const { publicOutput, privateOutput } = schnorr.multiSigRoundOne();
      roundOnePublicOutputs.push(publicOutput);
      roundOnePrivateOutputs.push(privateOutput);
    }

    // round two
    for (let i = 0; i < numSigners; ++i) {
      roundTwoOutputs.push(
        schnorr.multiSigRoundTwo(msg, pks[i], roundOnePrivateOutputs[i], pubKeys, roundOnePublicOutputs),
      );
    }

    // generate signature
    const signature = schnorr.multiSigCombineSignatures(msg, pubKeys, roundOnePublicOutputs, roundTwoOutputs);

    const verified = schnorr.verifySignature(msg, schnorr.multiSigValidateAndCombinePublicKeys(pubKeys), signature);

    expect(verified).toBe(true);
  });
});
