import { AccountId, AliasHash } from '@aztec/barretenberg/account_id';
import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { AccountProver, AccountTx, ClientProofData } from '@aztec/barretenberg/client_proofs';
import { OffchainAccountData } from '@aztec/barretenberg/offchain_tx_data';
import { TxHash } from '@aztec/barretenberg/tx_hash';
import { WorldState } from '@aztec/barretenberg/world_state';
import { randomBytes } from 'crypto';
import createDebug from 'debug';
import { Database } from '../../database';
import { Signer } from '../../signer';
import { AccountAliasId } from '../../user';
import { UserAccountTx } from '../../user_tx';
import { AccountProofOutput } from '../proof_output';

const debug = createDebug('bb:account_proof');

export class AccountProofCreator {
  constructor(private accountProver: AccountProver, private worldState: WorldState, private db: Database) {}

  public async createAccountTx(
    signingPubKey: GrumpkinAddress,
    aliasHash: AliasHash,
    nonce: number,
    migrate: boolean,
    accountPublicKey: GrumpkinAddress,
    newAccountPublicKey?: GrumpkinAddress,
    newSigningPubKey1?: GrumpkinAddress,
    newSigningPubKey2?: GrumpkinAddress,
    accountIndex = 0,
  ) {
    const merkleRoot = this.worldState.getRoot();
    const accountPath = await this.worldState.getHashPath(accountIndex);
    const accountAliasId = new AccountAliasId(aliasHash, nonce);
    const gibberish = randomBytes(32);

    return new AccountTx(
      merkleRoot,
      accountPublicKey,
      newAccountPublicKey || accountPublicKey,
      newSigningPubKey1 || GrumpkinAddress.ZERO,
      newSigningPubKey2 || GrumpkinAddress.ZERO,
      accountAliasId,
      migrate,
      gibberish,
      accountIndex,
      accountPath,
      signingPubKey,
    );
  }

  public async computeSigningData(tx: AccountTx) {
    return this.accountProver.computeSigningData(tx);
  }

  public async createProof(
    signer: Signer,
    aliasHash: AliasHash,
    nonce: number,
    migrate: boolean,
    accountPublicKey: GrumpkinAddress,
    newAccountPublicKey?: GrumpkinAddress,
    newSigningPubKey1?: GrumpkinAddress,
    newSigningPubKey2?: GrumpkinAddress,
  ) {
    const signingPubKey = signer.getPublicKey();
    const accountIndex =
      nonce !== 0 ? await this.db.getUserSigningKeyIndex(new AccountId(accountPublicKey, nonce), signingPubKey) : 0;
    if (accountIndex === undefined) {
      throw new Error('Unknown signing key.');
    }

    const tx = await this.createAccountTx(
      signingPubKey,
      aliasHash,
      nonce,
      migrate,
      accountPublicKey,
      newAccountPublicKey,
      newSigningPubKey1,
      newSigningPubKey2,
      accountIndex,
    );

    const signingData = await this.accountProver.computeSigningData(tx);
    const signature = await signer.signMessage(signingData);

    debug('creating proof...');
    const start = new Date().getTime();
    const proofData = await this.accountProver.createAccountProof(tx, signature);
    debug(`created proof: ${new Date().getTime() - start}ms`);
    debug(`proof size: ${proofData.length}`);

    const { txId } = new ClientProofData(proofData);
    const txHash = new TxHash(txId);
    const newNonce = nonce + +migrate;
    const accountOwner = new AccountId(newAccountPublicKey || accountPublicKey, newNonce);
    const accountAliasId = new AccountAliasId(aliasHash, newNonce);
    const userTx = new UserAccountTx(
      txHash,
      accountOwner,
      aliasHash,
      newSigningPubKey1?.x(),
      newSigningPubKey2?.x(),
      migrate,
      new Date(),
    );
    const offchainTxData = new OffchainAccountData(
      accountOwner.publicKey,
      accountAliasId,
      newSigningPubKey1?.x(),
      newSigningPubKey2?.x(),
    );

    return new AccountProofOutput(userTx, proofData, offchainTxData);
  }
}
