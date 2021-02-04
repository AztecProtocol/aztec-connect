import { Mutex } from 'async-mutex';
import { EthAddress } from 'barretenberg/address';
import { AccountAliasId } from 'barretenberg/client_proofs/account_alias_id';
import { JoinSplitProofData, ProofData } from 'barretenberg/client_proofs/proof_data';
import { InnerProofData } from 'barretenberg/rollup_proof';
import { TxHash } from 'barretenberg/rollup_provider';
import { toBufferBE } from 'bigint-buffer';
import { Connection, In, IsNull, MoreThanOrEqual, Not, Repository } from 'typeorm';
import { AccountTxDao } from '../entity/account_tx';
import { JoinSplitTxDao } from '../entity/join_split_tx';
import { RollupDao } from '../entity/rollup';
import { RollupProofDao } from '../entity/rollup_proof';
import { TxDao } from '../entity/tx';

export class RollupDb {
  private txRep: Repository<TxDao>;
  private joinSplitTxRep: Repository<JoinSplitTxDao>;
  private accountTxRep: Repository<AccountTxDao>;
  private rollupProofRep: Repository<RollupProofDao>;
  private rollupRep: Repository<RollupDao>;
  private writeMutex = new Mutex();

  constructor(private connection: Connection) {
    this.txRep = this.connection.getRepository(TxDao);
    this.joinSplitTxRep = this.connection.getRepository(JoinSplitTxDao);
    this.accountTxRep = this.connection.getRepository(AccountTxDao);
    this.rollupProofRep = this.connection.getRepository(RollupProofDao);
    this.rollupRep = this.connection.getRepository(RollupDao);
  }

  public async addTx(txDao: TxDao) {
    const release = await this.writeMutex.acquire();
    try {
      await this.connection.transaction(async transactionalEntityManager => {
        await transactionalEntityManager.save(txDao);

        const proofData = InnerProofData.fromBuffer(txDao.proofData);

        if (proofData.proofId === 0) {
          const jsProofData = new JoinSplitProofData(new ProofData(txDao.proofData));
          const joinSplitDao = new JoinSplitTxDao({
            id: proofData.txId,
            publicInput: jsProofData.publicInput,
            publicOutput: jsProofData.publicOutput,
            assetId: jsProofData.assetId,
            inputOwner: jsProofData.inputOwner,
            outputOwner: jsProofData.outputOwner,
            created: txDao.created,
          });
          await transactionalEntityManager.save(joinSplitDao);
        } else if (proofData.proofId === 1) {
          const accountAliasId = AccountAliasId.fromBuffer(proofData.assetId);
          const accountTxDao = new AccountTxDao({
            id: proofData.txId,
            accountPubKey: Buffer.concat([proofData.publicInput, proofData.publicOutput]),
            aliasHash: accountAliasId.aliasHash.toBuffer(),
            nonce: accountAliasId.nonce,
            spendingKey1: proofData.nullifier1,
            spendingKey2: proofData.nullifier2,
            created: txDao.created,
          });
          await transactionalEntityManager.save(accountTxDao);
        }
      });
    } finally {
      release();
    }
  }

  public async getTx(txId: Buffer) {
    return this.txRep.findOne({ id: txId }, { relations: ['rollupProof'] });
  }

  public async getTxsByTxIds(txIds: Buffer[]) {
    return this.txRep.find({
      where: { txId: In(txIds) },
      relations: ['rollupProof', 'rollupProof.rollup'],
    });
  }

  public async getLatestTxs(take: number) {
    return this.txRep.find({
      order: { created: 'DESC' },
      relations: ['rollupProof', 'rollupProof.rollup'],
      take,
    });
  }

  public async getPendingTxCount() {
    return this.txRep.count({
      where: { rollupProof: null },
    });
  }

  public async deletePendingTxs() {
    const release = await this.writeMutex.acquire();
    try {
      return this.txRep.delete({ rollupProof: null });
    } finally {
      release();
    }
  }

  public async getTotalTxCount() {
    return this.txRep.count();
  }

  public async getJoinSplitTxCount() {
    return this.joinSplitTxRep.count();
  }

  public async getAccountTxCount() {
    return this.accountTxRep.count();
  }

  public async getRegistrationTxCount() {
    const result = await this.accountTxRep.query(
      `select count(distinct(accountPubKey)) as count from account_tx where nonce=1`,
    );
    return result[0] ? result[0].count : 0;
  }

  public async getTotalRollupsOfSize(rollupSize: number) {
    return await this.rollupProofRep
      .createQueryBuilder('rp')
      .leftJoin('rp.rollup', 'r')
      .where('rp.rollupSize = :rollupSize AND r.mined IS NOT NULL', { rollupSize })
      .getCount();
  }

  public async getUnsettledTxCount() {
    return await this.txRep
      .createQueryBuilder('tx')
      .leftJoin('tx.rollupProof', 'rp')
      .leftJoin('rp.rollup', 'r')
      .where('tx.rollupProof IS NULL OR rp.rollup IS NULL OR r.mined IS NULL')
      .getCount();
  }

  public async getUnsettledJoinSplitTxsForInputAddress(inputOwner: EthAddress) {
    return await this.joinSplitTxRep
      .createQueryBuilder('js_tx')
      .leftJoin('js_tx.internalId', 'tx')
      .leftJoin('tx.rollupProof', 'rp')
      .leftJoin('rp.rollup', 'r')
      .where('js_tx.inputOwner = :owner AND (tx.rollupProof IS NULL OR rp.rollup IS NULL OR r.mined IS NULL)', {
        owner: inputOwner.toBuffer(),
      })
      .getMany();
  }

  public async deleteUnsettledTxs() {
    const release = await this.writeMutex.acquire();
    try {
      return await this.txRep
        .createQueryBuilder('tx')
        .leftJoinAndSelect('tx.rollupProof', 'rp')
        .leftJoinAndSelect('rp.rollup', 'r')
        .where('tx.rollupProof IS NULL OR rp.rollup IS NULL OR r.mined IS NULL')
        .getCount();
    } finally {
      release();
    }
  }

  public async getPendingTxs(take?: number) {
    return this.txRep.find({
      where: { rollupProof: null },
      order: { created: 'ASC' },
      take,
    });
  }

  public async getPendingNoteNullifiers() {
    const unsettledTxs = await this.getPendingTxs();
    return unsettledTxs.map(tx => [tx.nullifier1, tx.nullifier2]).flat();
  }

  public async nullifiersExist(n1: Buffer, n2: Buffer) {
    const count = await this.txRep
      .createQueryBuilder('tx')
      .where('tx.nullifier1 IS :n1 OR tx.nullifier1 IS :n2 OR tx.nullifier2 IS :n1 OR tx.nullifier2 IS :n2', { n1, n2 })
      .getCount();
    return count > 0;
  }

  public async addRollupProof(rollupDao: RollupProofDao) {
    const release = await this.writeMutex.acquire();
    try {
      await this.rollupProofRep.save(rollupDao);
    } finally {
      release();
    }
  }

  public async getRollupProof(id: Buffer, includeTxs = false) {
    return this.rollupProofRep.findOne({ id }, { relations: includeTxs ? ['txs'] : undefined });
  }

  public async deleteRollupProof(id: Buffer) {
    const release = await this.writeMutex.acquire();
    try {
      return this.rollupProofRep.delete({ id });
    } finally {
      release();
    }
  }

  /**
   * If a rollup proof is replaced by a larger aggregate, it will become "orphaned" from it's transactions.
   * This removes any rollup proofs that are no longer referenced by transactions.
   */
  public async deleteTxlessRollupProofs() {
    const release = await this.writeMutex.acquire();
    try {
      const orphaned = await this.rollupProofRep
        .createQueryBuilder('rollup_proof')
        .select('rollup_proof.id')
        .leftJoin('rollup_proof.txs', 'tx')
        .where('tx.rollupProof IS NULL')
        .getMany();
      await this.rollupProofRep.delete({ id: In(orphaned.map(rp => rp.id)) });
    } finally {
      release();
    }
  }

  public async deleteOrphanedRollupProofs() {
    const release = await this.writeMutex.acquire();
    try {
      await this.rollupProofRep.delete({ rollup: IsNull() });
    } finally {
      release();
    }
  }

  public async getRollupProofsBySize(numTxs: number) {
    return await this.rollupProofRep.find({
      where: { rollupSize: numTxs, rollup: null },
      relations: ['txs'],
      order: { dataStartIndex: 'ASC' },
    });
  }

  public async getNextRollupId() {
    const latestRollup = await this.rollupRep.findOne({ mined: Not(IsNull()) }, { order: { id: 'DESC' } });
    return latestRollup ? latestRollup.id + 1 : 0;
  }

  public async getRollup(id: number) {
    return this.rollupRep.findOne({ id }, { relations: ['rollupProof', 'rollupProof.txs'] });
  }

  public async getRollups(take: number) {
    return this.rollupRep.find({
      order: { id: 'DESC' },
      relations: ['rollupProof', 'rollupProof.txs'],
      take,
    });
  }

  public async addRollup(rollup: RollupDao) {
    const release = await this.writeMutex.acquire();
    try {
      return await this.rollupRep.save(rollup);
    } finally {
      release();
    }
  }

  public async confirmSent(id: number, txHash: TxHash) {
    const release = await this.writeMutex.acquire();
    try {
      await this.rollupRep.update({ id }, { ethTxHash: txHash.toBuffer() });
    } finally {
      release();
    }
  }

  public async confirmMined(id: number, gasUsed: number, gasPrice: bigint, mined: Date) {
    const release = await this.writeMutex.acquire();
    try {
      await this.rollupRep.update({ id }, { mined, gasUsed, gasPrice: toBufferBE(gasPrice, 32) });
    } finally {
      release();
    }
  }

  public getSettledRollups(from = 0, descending = false, take?: number) {
    return this.rollupRep.find({
      where: { id: MoreThanOrEqual(from), mined: Not(IsNull()) },
      order: { id: descending ? 'DESC' : 'ASC' },
      relations: ['rollupProof'],
      take,
    });
  }

  public getUnsettledRollups() {
    return this.rollupRep.find({
      where: { mined: IsNull() },
      order: { id: 'ASC' },
    });
  }

  public async deleteUnsettledRollups() {
    const release = await this.writeMutex.acquire();
    try {
      await this.rollupRep.delete({ mined: IsNull() });
    } finally {
      release();
    }
  }

  public async getRollupByDataRoot(dataRoot: Buffer) {
    return this.rollupRep.findOne({ dataRoot });
  }

  public async getDataRootsIndex(root: Buffer) {
    // Lookup and save the proofs data root index (for old root support).
    const emptyDataRoot = Buffer.from('2708a627d38d74d478f645ec3b4e91afa325331acf1acebe9077891146b75e39', 'hex');
    if (root.equals(emptyDataRoot)) {
      return 0;
    }

    const rollup = await this.getRollupByDataRoot(root);
    if (!rollup) {
      throw new Error(`Rollup not found for merkle root: ${root.toString('hex')}`);
    }
    return rollup.id + 1;
  }
}
