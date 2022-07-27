#!/usr/bin/env node
import { toBigIntBE } from '@aztec/barretenberg/bigint_buffer';
import { TxType } from '@aztec/barretenberg/blockchain';
import { ProofData } from '@aztec/barretenberg/client_proofs';
import { WorldStateDb } from '@aztec/barretenberg/world_state_db';
import { Command } from 'commander';
import { createConnection } from 'typeorm';
import { getOrmConfig } from '../config';
import { Configurator } from '../configurator';
import { initEntities } from '../entity/init_entities';
import { TypeOrmRollupDb } from '../rollup_db';
import { SyncRollupDb } from '../rollup_db/sync_rollup_db';
import { checkDuplicateNullifiers, checkNullifiersAgainstWorldState, findNearbyTxs } from './diagnostics';

const configurator = new Configurator();
initEntities(configurator.getConfVars().dbUrl);

const getOrmDbConfig = () => {
  const confVars = configurator.getConfVars();
  const { typeOrmLogging, dbUrl } = confVars;
  return getOrmConfig(dbUrl, typeOrmLogging);
};

const createRollupDb = async () => {
  const dbConfig = getOrmDbConfig();
  const connection = await createConnection(dbConfig);
  const rollupDb = new SyncRollupDb(new TypeOrmRollupDb(connection));
  return rollupDb;
};

const checkPendingNullifiers = async () => {
  const rollupDb = await createRollupDb();
  const pendingTxs = await rollupDb.getPendingTxs();
  const pendingPoolNullifierResults = checkDuplicateNullifiers(pendingTxs);
  const txsWithDuplicateNullifiers = Object.keys(pendingPoolNullifierResults);
  if (!txsWithDuplicateNullifiers.length) {
    console.log('No duplicate nullifiers found within pending tx pool');
  } else {
    for (const key of txsWithDuplicateNullifiers) {
      const tx = pendingTxs.find(x => x.id.toString('hex') === key)!;
      const otherTx = pendingTxs.find(x => x.id.toString('hex') === pendingPoolNullifierResults[key])!;
      console.log(
        `Pending ${TxType[tx.txType]} tx ${key} shares a nullifier with pending ${TxType[otherTx.txType]} tx ${
          pendingPoolNullifierResults[key]
        }`,
      );
    }
  }

  const worldStateDb = new WorldStateDb();
  const worldStateResults = await checkNullifiersAgainstWorldState(pendingTxs, worldStateDb);
  if (!worldStateResults.length) {
    console.log('No pending txs found with nullifiers already in world state');
  } else {
    for (const result of worldStateResults) {
      const tx = pendingTxs.find(x => x.id.toString('hex') === result?.id)!;
      console.log(
        `Pending ${TxType[tx.txType]} tx ${result?.id} nullifiers ${result?.nullifiers} are already in world state`,
      );
    }
  }
};

const findNearby = async (txId: Buffer, window: number) => {
  const rollupDb = await createRollupDb();
  const pendingTxs = await rollupDb.getPendingTxs();
  const nearbyTxs = findNearbyTxs(pendingTxs, txId, window);
  for (const tx of nearbyTxs) {
    const end = tx.id.toString('hex') === txId.toString('hex') ? ' *' : '';
    console.log(`Tx ${tx.id.toString('hex')}, time: ${tx.created.toISOString()}, type: ${TxType[tx.txType]}${end}`);
  }
};

const getTxs = async (txIds: Buffer[]) => {
  const rollupDb = await createRollupDb();
  for (const txId of txIds) {
    const tx = await rollupDb.getTx(txId);
    if (!tx) {
      console.log(`Tx ${txId.toString('hex')} not found`);
      continue;
    }
    const proofData = new ProofData(tx.proofData);
    console.log(`Tx ${txId.toString('hex')}, type: ${TxType[tx?.txType]}, time: ${tx.created.toISOString()}`);
    console.log(` Commitment 1 ${proofData.noteCommitment1.toString('hex')}`);
    console.log(` Commitment 2 ${proofData.noteCommitment2.toString('hex')}`);
    console.log(` Nullifier 1 ${proofData.nullifier1.toString('hex')}`);
    console.log(` Nullifier 2 ${proofData.nullifier2.toString('hex')}`);
    console.log(` Public Value ${toBigIntBE(proofData.publicValue)}`);
    console.log(` Public Owner ${proofData.publicOwner.toString('hex')}`);
    console.log(` Public Asset ${proofData.publicAssetId.readUInt32BE(28)}`);
    console.log(` Note Tree Root ${proofData.noteTreeRoot.toString('hex')}`);
    console.log(` Tx Fee ${toBigIntBE(proofData.txFee)}`);
    console.log(` Tx Fee Asset ${proofData.feeAssetId}`);
    console.log(` Bridge Call Data ${proofData.bridgeCallData.toString('hex')}`);
    console.log(` Defi Deposit Value ${toBigIntBE(proofData.defiDepositValue)}`);
    console.log(` Defi Root ${proofData.defiRoot.toString('hex')}`);
    console.log(` Backward Link ${proofData.backwardLink.toString('hex')}`);
    console.log(` Allow Chain Note 1 ${proofData.allowChainFromNote1}`);
    console.log(` Allow Chain Note 2 ${proofData.allowChainFromNote2}`);
    if (tx.txType === TxType.DEPOSIT) {
      const r = tx.signature!.slice(0, 32);
      const s = tx.signature!.slice(32, 64);
      const v = Buffer.concat([Buffer.alloc(31), tx.signature!.slice(64)]);
      console.log(` Sig r ${r.toString('hex')}`);
      console.log(` Sig s ${s.toString('hex')}`);
      console.log(` Sig v ${v.toString('hex')}`);
    }
  }
};

const txIdsToBuffers = (ids: string[]) => {
  return ids.map(id => {
    return Buffer.from(id, 'hex');
  });
};

const deleteTxById = async (id: Buffer) => {
  const rollupDb = await createRollupDb();
  await rollupDb.deleteTxsById([id]);
};

const program = new Command();

async function main() {
  program
    .command('checkPendingNullifiers')
    .description('check nullifiers in the tx pool and against world state')
    .action(checkPendingNullifiers);
  program
    .command('findNearbyPendingTxs')
    .description('find pending txs within a given number of seconds of the provided tx id')
    .argument('<txId>', 'transaction id, as a hex string to be converted by Buffer.from()')
    .argument('<window>', 'number of seconds to search either side of provided tx')
    .action(async (txId: string, window: number) => {
      await findNearby(txIdsToBuffers([txId])[0], window);
    });
  program
    .command('deleteTx')
    .description('delete a tx by id')
    .argument('<txId>', 'transaction id, as a hex string to be converted by Buffer.from()')
    .action(async (txId: string) => {
      await deleteTxById(txIdsToBuffers([txId])[0]);
    });
  program
    .command('getTxs')
    .description('print details of given txs')
    .argument('<txIds>', 'transaction ids, as a comma seperated hex string to be converted by Buffer.from()')
    .action(async (txIdStrings: string) => {
      const ids = txIdStrings.split(',');
      await getTxs(txIdsToBuffers(ids));
    });

  await program.parseAsync(process.argv);
}

main().catch(err => {
  console.log(`Error thrown: ${err}`);
  process.exit(1);
});
