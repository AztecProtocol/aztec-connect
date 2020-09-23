import { GrumpkinAddress } from 'barretenberg/address';
import { AccountProver, AccountTx } from 'barretenberg/client_proofs/account_proof';
import { Blake2s } from 'barretenberg/crypto/blake2s';
import { WorldState } from 'barretenberg/world_state';
import { randomBytes } from 'crypto';
import createDebug from 'debug';
import { Signer } from '../../signer';

const debug = createDebug('bb:account_proof');

export class AccountProofCreator {
  constructor(private accountProver: AccountProver, private worldState: WorldState, private blake2s: Blake2s) {}

  public async createAccountTx(
    signer: Signer,
    ownerPublicKey: GrumpkinAddress,
    newSigningPubKey1?: GrumpkinAddress,
    newSigningPubKey2?: GrumpkinAddress,
    nullifiedKey?: GrumpkinAddress,
    alias?: string,
  ) {
    const merkleRoot = this.worldState.getRoot();
    const numNewKeys = [newSigningPubKey1, newSigningPubKey2].filter(k => !!k).length;

    // For now, we will use the account key as the signing key (no account note required).
    const accountIndex = 0;
    const accountPath = await this.worldState.getHashPath(0);
    const signingPubKey = ownerPublicKey;

    const aliasField = alias ? this.blake2s.hashToField(Buffer.from(alias)) : randomBytes(32);

    const sigMsg = this.accountProver.getSignatureMessage(
      ownerPublicKey,
      newSigningPubKey1 || GrumpkinAddress.ZERO,
      newSigningPubKey2 || GrumpkinAddress.ZERO,
      aliasField,
      nullifiedKey || GrumpkinAddress.ZERO,
    );
    const signature = await signer.signMessage(sigMsg);

    return new AccountTx(
      merkleRoot,
      ownerPublicKey,
      numNewKeys,
      newSigningPubKey1 || GrumpkinAddress.ZERO,
      newSigningPubKey2 || GrumpkinAddress.ZERO,
      !!alias,
      aliasField,
      !!nullifiedKey,
      nullifiedKey || GrumpkinAddress.ZERO,
      accountIndex,
      signingPubKey,
      accountPath,
      signature,
    );
  }

  public async createProof(
    signer: Signer,
    ownerPublicKey: GrumpkinAddress,
    newSigningPubKey1?: GrumpkinAddress,
    newSigningPubKey2?: GrumpkinAddress,
    nullifiedKey?: GrumpkinAddress,
    alias?: string,
  ) {
    const tx = await this.createAccountTx(
      signer,
      ownerPublicKey,
      newSigningPubKey1,
      newSigningPubKey2,
      nullifiedKey,
      alias,
    );

    debug('creating proof...');
    const start = new Date().getTime();
    const proofData = await this.accountProver.createAccountProof(tx);
    debug(`created proof: ${new Date().getTime() - start}ms`);
    debug(`proof size: ${proofData.length}`);

    return proofData;
  }
}
