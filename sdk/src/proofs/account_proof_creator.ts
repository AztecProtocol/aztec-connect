import { AccountAliasId, AccountId, AliasHash } from '@aztec/barretenberg/account_id';
import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { AccountProver, AccountTx, ProofData } from '@aztec/barretenberg/client_proofs';
import { OffchainAccountData } from '@aztec/barretenberg/offchain_tx_data';
import { TxId } from '@aztec/barretenberg/tx_id';
import { WorldState } from '@aztec/barretenberg/world_state';
import createDebug from 'debug';
import { CoreAccountTx } from '../core_tx';
import { Database } from '../database';
import { AccountProofInput } from './proof_input';
import { ProofOutput } from './proof_output';

const debug = createDebug('bb:account_proof');

export class AccountProofCreator {
  constructor(private prover: AccountProver, private worldState: WorldState, private db: Database) {}

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

    return new AccountTx(
      merkleRoot,
      accountPublicKey,
      newAccountPublicKey || accountPublicKey,
      newSigningPubKey1 || GrumpkinAddress.ZERO,
      newSigningPubKey2 || GrumpkinAddress.ZERO,
      accountAliasId,
      migrate,
      accountIndex,
      accountPath,
      signingPubKey,
    );
  }

  public async computeSigningData(tx: AccountTx) {
    return this.prover.computeSigningData(tx);
  }

  public async createProofInput(
    aliasHash: AliasHash,
    nonce: number,
    migrate: boolean,
    accountPublicKey: GrumpkinAddress,
    signingPubKey: GrumpkinAddress,
    newAccountPublicKey: GrumpkinAddress | undefined,
    newSigningPubKey1: GrumpkinAddress | undefined,
    newSigningPubKey2: GrumpkinAddress | undefined,
  ): Promise<AccountProofInput> {
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

    const signingData = await this.prover.computeSigningData(tx);

    return { tx, signingData };
  }

  public async createProof({ tx, signature }: AccountProofInput, txRefNo: number): Promise<ProofOutput> {
    debug('creating proof...');
    const start = new Date().getTime();
    const proof = await this.prover.createAccountProof(tx, signature!);
    debug(`created proof: ${new Date().getTime() - start}ms`);
    debug(`proof size: ${proof.length}`);

    const proofData = new ProofData(proof);
    const txId = new TxId(proofData.txId);
    const {
      accountAliasId: { aliasHash, accountNonce },
      newAccountPublicKey,
      newSigningPubKey1,
      newSigningPubKey2,
      migrate,
    } = tx;
    const newNonce = accountNonce + +migrate;
    const accountOwner = new AccountId(newAccountPublicKey, newNonce);
    const newAccountAliasId = new AccountAliasId(aliasHash, newNonce);
    const coreTx = new CoreAccountTx(
      txId,
      accountOwner,
      aliasHash,
      newSigningPubKey1?.x(),
      newSigningPubKey2?.x(),
      migrate,
      txRefNo,
      new Date(),
    );
    const offchainTxData = new OffchainAccountData(
      newAccountPublicKey,
      newAccountAliasId,
      newSigningPubKey1?.x(),
      newSigningPubKey2?.x(),
      txRefNo,
    );

    return { tx: coreTx, proofData, offchainTxData, outputNotes: [] };
  }
}
