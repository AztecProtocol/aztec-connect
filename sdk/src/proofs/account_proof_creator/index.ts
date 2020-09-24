import { GrumpkinAddress } from 'barretenberg/address';
import { AccountProver, AccountTx, computeSigningData } from 'barretenberg/client_proofs/account_proof';
import { Blake2s } from 'barretenberg/crypto/blake2s';
import { Pedersen } from 'barretenberg/crypto/pedersen';
import { WorldState } from 'barretenberg/world_state';
import { randomBytes } from 'crypto';
import createDebug from 'debug';
import { Signer } from '../../signer';

const debug = createDebug('bb:account_proof');

export class AccountProofCreator {
  constructor(
    private accountProver: AccountProver,
    private worldState: WorldState,
    private blake2s: Blake2s,
    private pedersen: Pedersen,
  ) {}

  public async createAccountTx(
    signer: Signer,
    ownerPublicKey: GrumpkinAddress,
    newSigningPubKey1?: GrumpkinAddress,
    newSigningPubKey2?: GrumpkinAddress,
    nullifiedKey?: GrumpkinAddress,
    alias?: string,
    isDummyAlias?: boolean,
    accountIndex = 0,
  ) {
    const merkleRoot = this.worldState.getRoot();
    const numNewKeys = [newSigningPubKey1, newSigningPubKey2].filter(k => !!k).length;

    const signingPubKey = signer.getPublicKey();
    const accountPath = await this.worldState.getHashPath(accountIndex);

    const aliasField = alias
      ? !isDummyAlias
        ? this.blake2s.hashToField(Buffer.from(alias))
        : Buffer.from(alias, 'hex')
      : randomBytes(32);
    const nullifiedPubKey = nullifiedKey || GrumpkinAddress.randomAddress();

    const sigMsg = computeSigningData(
      ownerPublicKey,
      newSigningPubKey1 || GrumpkinAddress.ZERO,
      newSigningPubKey2 || GrumpkinAddress.ZERO,
      aliasField,
      nullifiedPubKey,
      this.pedersen,
    );
    const signature = await signer.signMessage(sigMsg);

    return new AccountTx(
      merkleRoot,
      ownerPublicKey,
      numNewKeys,
      newSigningPubKey1 || GrumpkinAddress.ZERO,
      newSigningPubKey2 || GrumpkinAddress.ZERO,
      !!alias && !isDummyAlias,
      aliasField,
      !!nullifiedKey,
      nullifiedPubKey,
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
    isDummyAlias?: boolean,
    accountIndex?: number,
  ) {
    const tx = await this.createAccountTx(
      signer,
      ownerPublicKey,
      newSigningPubKey1,
      newSigningPubKey2,
      nullifiedKey,
      alias,
      isDummyAlias,
      accountIndex,
    );

    debug('creating proof...');
    const start = new Date().getTime();
    const proofData = await this.accountProver.createAccountProof(tx);
    debug(`created proof: ${new Date().getTime() - start}ms`);
    debug(`proof size: ${proofData.length}`);

    return proofData;
  }
}
