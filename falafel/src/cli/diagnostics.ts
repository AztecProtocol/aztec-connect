import { toBigIntBE } from '@aztec/barretenberg/bigint_buffer';
import { RollupTreeId, WorldStateDb } from '@aztec/barretenberg/world_state_db';
import { TxDao } from '../entity';

export const checkDuplicateNullifiers = (txs: TxDao[]) => {
  const nullifiers: { [key: string]: string } = {};
  const duplicateResults: { [key: string]: string } = {};
  for (const tx of txs) {
    const nullifier1Index = tx.nullifier1 ? toBigIntBE(tx.nullifier1) : 0n;
    const nullifier2Index = tx.nullifier2 ? toBigIntBE(tx.nullifier2) : 0n;
    const nullifierIndices = [nullifier1Index, nullifier2Index];
    for (let i = 0; i < nullifierIndices.length; i++) {
      if (!nullifierIndices[i]) {
        continue;
      }
      const stringIndex = nullifierIndices[i].toString();
      if (!nullifiers[stringIndex]) {
        nullifiers[stringIndex] = tx.id.toString('hex');
        continue;
      }
      duplicateResults[tx.id.toString('hex')] = nullifiers[stringIndex];
    }
  }
  return duplicateResults;
};

export const checkNullifiersAgainstWorldState = async (txs: TxDao[], worldStateDb: WorldStateDb) => {
  const txsWithDuplicateNullifiers = await Promise.all(
    txs.map(async tx => {
      const nullifierValues = await Promise.all(
        [tx.nullifier1, tx.nullifier2].map(async (nullifier, i) => {
          const nullifierIndex = nullifier ? toBigIntBE(nullifier) : 0n;
          if (!nullifierIndex) {
            return undefined;
          }
          const nullifierValueBuffer = await worldStateDb.get(RollupTreeId.NULL, nullifierIndex);
          const nullifierValue = toBigIntBE(nullifierValueBuffer);
          return nullifierValue === 1n ? i + 1 : undefined;
        }),
      );
      const dupeNullifiers = nullifierValues.filter(x => x);
      if (!dupeNullifiers.length) {
        return undefined;
      }
      return {
        id: tx.id.toString('hex'),
        nullifiers: dupeNullifiers,
      };
    }),
  );
  return txsWithDuplicateNullifiers.filter(x => x);
};

export const findNearbyTxs = (txs: TxDao[], txId: Buffer, windowInSeconds: number) => {
  const tx = txs.find(tx => tx.id.equals(txId));
  if (!tx) {
    return [];
  }
  const upperLimit = tx.created.getTime() + windowInSeconds * 1000;
  const lowerLimit = tx.created.getTime() - windowInSeconds * 1000;
  return txs.filter(x => x.created.getTime() >= lowerLimit && x.created.getTime() <= upperLimit);
};
