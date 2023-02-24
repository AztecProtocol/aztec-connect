import { Schnorr, SchnorrSignature } from './index.js';
import { TextEncoder } from 'util';
import { BarretenbergWasm } from '../../wasm/index.js';
import { Grumpkin } from '../../ecc/index.js';
import { GrumpkinAddress } from '../../address/index.js';

describe('schnorr', () => {
  let barretenberg!: BarretenbergWasm;
  let schnorr!: Schnorr;
  let grumpkin!: Grumpkin;
  const msg = new TextEncoder().encode('The quick brown dog jumped over the lazy fox.');

  beforeAll(async () => {
    barretenberg = await BarretenbergWasm.new();
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
    const signature = schnorr.constructSignature(msg, pk);
    const verified = schnorr.verifySignature(msg, pubKey, signature);

    expect(verified).toBe(true);
  });

  it('should create + verify multi signature', () => {
    // set up multisig accounts
    const numSigners = 7;
    const pks = [...Array(numSigners)].map(() => grumpkin.getRandomFr());
    const pubKeys = pks.map(pk => schnorr.multiSigComputePublicKey(pk));

    // round one
    const roundOnePublicOutputs: Buffer[] = [];
    const roundOnePrivateOutputs: Buffer[] = [];
    for (let i = 0; i < numSigners; ++i) {
      const { publicOutput, privateOutput } = schnorr.multiSigRoundOne();
      roundOnePublicOutputs.push(publicOutput);
      roundOnePrivateOutputs.push(privateOutput);
    }

    // round two
    const roundTwoOutputs = pks.map((pk, i) =>
      schnorr.multiSigRoundTwo(msg, pk, roundOnePrivateOutputs[i], pubKeys, roundOnePublicOutputs),
    );

    // generate signature
    const signature = schnorr.multiSigCombineSignatures(msg, pubKeys, roundOnePublicOutputs, roundTwoOutputs)!;
    const combinedKey = schnorr.multiSigValidateAndCombinePublicKeys(pubKeys);
    expect(combinedKey).not.toEqual(Buffer.alloc(64));
    const verified = schnorr.verifySignature(msg, combinedKey, signature);
    expect(verified).toBe(true);
  });

  it('should indentify invalid multi signature', () => {
    const pks = [...Array(3)].map(() => grumpkin.getRandomFr());
    const pubKeys = pks.map(pk => schnorr.multiSigComputePublicKey(pk));
    const combinedKey = schnorr.multiSigValidateAndCombinePublicKeys(pubKeys);

    const signature = SchnorrSignature.randomSignature();
    const verified = schnorr.verifySignature(msg, combinedKey, signature);
    expect(verified).toBe(false);
  });

  it('should not construct invalid multi signature', () => {
    // set up multisig accounts
    const numSigners = 7;
    const pks = [...Array(numSigners)].map(() => grumpkin.getRandomFr());
    const pubKeys = pks.map(pk => schnorr.multiSigComputePublicKey(pk));

    // round one
    const roundOnePublicOutputs: Buffer[] = [];
    const roundOnePrivateOutputs: Buffer[] = [];
    for (let i = 0; i < numSigners; ++i) {
      const { publicOutput, privateOutput } = schnorr.multiSigRoundOne();
      roundOnePublicOutputs.push(publicOutput);
      roundOnePrivateOutputs.push(privateOutput);
    }

    // round two
    const roundTwoOutputs = pks.map((pk, i) =>
      schnorr.multiSigRoundTwo(msg, pk, roundOnePrivateOutputs[i], pubKeys, roundOnePublicOutputs),
    );

    // wrong number of data
    {
      expect(
        schnorr.multiSigCombineSignatures(
          msg,
          pubKeys.slice(0, -1),
          roundOnePublicOutputs.slice(0, -1),
          roundTwoOutputs.slice(0, -1),
        ),
      ).toBe(undefined);
    }

    // invalid round two output
    {
      const invalidOutputs = [...roundTwoOutputs];
      invalidOutputs[1] = schnorr.multiSigRoundTwo(
        msg,
        pks[2], // <- Wrong private key.
        roundOnePrivateOutputs[1],
        pubKeys,
        roundOnePublicOutputs,
      );
      expect(schnorr.multiSigCombineSignatures(msg, pubKeys, roundOnePublicOutputs, invalidOutputs)).toBe(undefined);
    }

    // contains duplicates
    {
      const invalidOutputs = [...roundTwoOutputs];
      invalidOutputs[1] = roundTwoOutputs[2];
      expect(schnorr.multiSigCombineSignatures(msg, pubKeys, roundOnePublicOutputs, invalidOutputs)).toBe(undefined);
    }
  });

  it('should not create combined key from public keys containing invalid key', () => {
    const pks = [...Array(5)].map(() => grumpkin.getRandomFr());
    const pubKeys = pks.map(pk => schnorr.multiSigComputePublicKey(pk));
    const emptyCombinedKey = Buffer.alloc(64);

    // not a valid point
    {
      pubKeys[1] = Buffer.alloc(128);
      expect(schnorr.multiSigValidateAndCombinePublicKeys(pubKeys)).toEqual(emptyCombinedKey);
    }

    // contains duplicates
    {
      pubKeys[1] = pubKeys[2];
      expect(schnorr.multiSigValidateAndCombinePublicKeys(pubKeys)).toEqual(emptyCombinedKey);
    }
  });

  it('public key negation should work', () => {
    const publicKeyStr =
      '0x164f01b1011a1b292217acf53eef4d74f625f6e9bd5edfdb74c56fd81aafeebb21912735f9266a3719f61c1eb747ddee0cac9917f5c807485d356709b529b62c';
    const publicKey = GrumpkinAddress.fromString(publicKeyStr);
    // hardcoded expected negated public key
    const expectedInvertedStr =
      '0x164f01b1011a1b292217acf53eef4d74f625f6e9bd5edfdb74c56fd81aafeebb0ed3273ce80b35f29e5a2997ca397a6f1b874f3083f16948e6ac8e8a3ad649d5';
    const expectedInverted = GrumpkinAddress.fromString(expectedInvertedStr);

    // negate - should match expected negated key
    const negatedPublicKey = schnorr.negatePublicKey(publicKey);
    expect(negatedPublicKey.equals(expectedInverted)).toEqual(true);
    // negate again - should be original public key now
    expect(schnorr.negatePublicKey(negatedPublicKey).equals(publicKey)).toEqual(true);
  });
});
