import createDebug from 'debug';
import { AccountProver, AccountTx } from 'barretenberg/client_proofs/account_proof';
import { WorldState } from 'barretenberg/world_state';
import { UserState } from '../user_state';
import { GrumpkinAddress } from 'barretenberg/address';
import { Blake2s } from 'barretenberg/crypto/blake2s';
import { randomBytes } from 'crypto';

const debug = createDebug('bb:account_proof');

export class AccountProofCreator {
  constructor(private accountProver: AccountProver, private worldState: WorldState, private blake2s: Blake2s) {}

  public async createProof(
    userState: UserState,
    newSigningPubKey1?: GrumpkinAddress,
    newSigningPubKey2?: GrumpkinAddress,
    nullifiedKey?: GrumpkinAddress,
    alias?: string,
  ) {
    const merkleRoot = this.worldState.getRoot();
    const ownerPublicKey = userState.getUser().publicKey;
    const numNewKeys = [newSigningPubKey1, newSigningPubKey2].filter(k => !!k).length;

    // For now, we will use the account key as the signing key (no account note required).
    const accountIndex = 0;
    const accountPath = await this.worldState.getHashPath(0);
    const signingPubKey = ownerPublicKey;

    const tx = new AccountTx(
      merkleRoot,
      ownerPublicKey,
      numNewKeys,
      newSigningPubKey1 || GrumpkinAddress.ZERO,
      newSigningPubKey2 || GrumpkinAddress.ZERO,
      !!alias,
      alias ? this.blake2s.hashToField(Buffer.from(alias)) : randomBytes(32),
      !!nullifiedKey,
      nullifiedKey || GrumpkinAddress.ZERO,
      accountIndex,
      signingPubKey,
      accountPath,
    );

    debug('creating proof...');
    const start = new Date().getTime();
    const proofData = await this.accountProver.createAccountProof(tx, userState.getUser().privateKey);
    debug(`created proof: ${new Date().getTime() - start}ms`);
    debug(`proof size: ${proofData.length}`);

    return proofData;
  }
}
