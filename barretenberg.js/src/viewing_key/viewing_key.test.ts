import { randomBytes } from 'crypto';
import { GrumpkinAddress } from '../address';
import { NoteAlgorithms } from '../client_proofs/note_algorithms';
import { Grumpkin } from '../ecc/grumpkin';
import { BarretenbergWasm } from '../wasm';
import { batchDecryptNotes, ViewingKey } from './';

describe('viewing_key', () => {
  let grumpkin: Grumpkin;
  let noteAlgos!: NoteAlgorithms;

  const createKeyPair = () => {
    const privKey = grumpkin.getRandomFr();
    const pubKey = new GrumpkinAddress(grumpkin.mul(Grumpkin.one, privKey));
    return { privKey, pubKey };
  };

  beforeAll(async () => {
    const wasm = await BarretenbergWasm.new();
    grumpkin = new Grumpkin(wasm);
    noteAlgos = new NoteAlgorithms(wasm);
  });

  it('convert viewing key from and to buffer', () => {
    const buf = randomBytes(ViewingKey.SIZE);
    const key = new ViewingKey(buf);
    expect(key.toBuffer()).toEqual(buf);
  });

  it('convert viewing key from and to string', () => {
    const key = ViewingKey.random();
    const str = key.toString();
    const recovered = ViewingKey.fromString(str);
    expect(recovered).toEqual(key);
  });

  it('create from ephPrivKey and decrypt using user private key', () => {
    const owner = createKeyPair();
    const eph = createKeyPair();
    const noteBuf = randomBytes(40);
    const key = ViewingKey.createFromEphPriv(noteBuf, owner.pubKey, eph.privKey, grumpkin);
    const decrypted = key.decrypt(owner.privKey, grumpkin);
    expect(decrypted!.noteBuf).toEqual(noteBuf);
    expect(decrypted!.ephPubKey).toEqual(eph.pubKey);
  });

  it('throw if note buf has the wrong size', () => {
    const owner = createKeyPair();
    const eph = createKeyPair();
    expect(() => ViewingKey.createFromEphPriv(randomBytes(39), owner.pubKey, eph.privKey, grumpkin)).toThrow(
      'Invalid note buffer.',
    );
    expect(() => ViewingKey.createFromEphPriv(randomBytes(41), owner.pubKey, eph.privKey, grumpkin)).toThrow(
      'Invalid note buffer.',
    );
  });

  it('return undefined if decrypt with the wrong private key', () => {
    const owner = createKeyPair();
    const eph = createKeyPair();
    const noteBuf = randomBytes(40);
    const key = ViewingKey.createFromEphPriv(noteBuf, owner.pubKey, eph.privKey, grumpkin);
    const decrypted = key.decrypt(eph.privKey, grumpkin);
    expect(decrypted).toBe(undefined);
  });

  it('batch decrypt multiple viewing keys', async () => {
    const owner = createKeyPair();
    const eph = createKeyPair();
    const noteBufs = Array(4)
      .fill(0)
      .map(() => randomBytes(40));
    const keys = noteBufs.map(noteBuf => ViewingKey.createFromEphPriv(noteBuf, owner.pubKey, eph.privKey, grumpkin));
    const keysBuf = Buffer.concat(keys.map(k => k.toBuffer()));
    const decryptedNotes = await batchDecryptNotes(keysBuf, owner.privKey, noteAlgos, grumpkin);

    expect(decryptedNotes.length).toBe(noteBufs.length);
    decryptedNotes.forEach((decrypted, i) => {
      expect(decrypted!.noteBuf).toEqual(noteBufs[i]);
      expect(decrypted!.ephPubKey).toEqual(eph.pubKey);
    });
  });

  it('batch decrypt owned and unknown viewing keys', async () => {
    const owner = createKeyPair();
    const eph = createKeyPair();
    const noteBufs = Array(4)
      .fill(0)
      .map(() => randomBytes(40));
    const keys = noteBufs.map(noteBuf => ViewingKey.createFromEphPriv(noteBuf, owner.pubKey, eph.privKey, grumpkin));
    // Replace the thrid key with a random key.
    keys.splice(2, 1, ViewingKey.random());
    // Append an extra random key.
    keys.push(ViewingKey.random());
    const keysBuf = Buffer.concat(keys.map(k => k.toBuffer()));
    const decryptedNotes = await batchDecryptNotes(keysBuf, owner.privKey, noteAlgos, grumpkin);

    expect(decryptedNotes.length).toBe(noteBufs.length);
    decryptedNotes.forEach((decrypted, i) => {
      if (i === 2) {
        expect(decrypted).toBe(undefined);
      } else {
        expect(decrypted!.noteBuf).toEqual(noteBufs[i]);
        expect(decrypted!.ephPubKey).toEqual(eph.pubKey);
      }
    });
  });
});
