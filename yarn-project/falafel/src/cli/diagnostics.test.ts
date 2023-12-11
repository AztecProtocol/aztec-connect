import { toBufferBE } from '@aztec/barretenberg/bigint_buffer';
import { TxType } from '@aztec/barretenberg/blockchain';
import { randomBytes } from '@aztec/barretenberg/crypto';
import { numToUInt32BE } from '@aztec/barretenberg/serialize';
import { RollupTreeId, WorldStateDb } from '@aztec/barretenberg/world_state_db';
import { TxDao } from '../entity/index.js';
import { checkDuplicateNullifiers, checkNullifiersAgainstWorldState, findNearbyTxs } from './diagnostics.js';
import { jest } from '@jest/globals';

jest.useFakeTimers({ doNotFake: ['performance'] });

type Mockify<T> = {
  [P in keyof T]: jest.Mock;
};

const txTypeToProofId = (txType: TxType) => (txType < TxType.WITHDRAW_HIGH_GAS ? txType + 1 : txType);

const mockTx = (
  id: number,
  {
    txType = TxType.TRANSFER,
    txFeeAssetId = 0,
    txFee = 0n,
    creationTime = new Date(new Date('2021-06-20T11:43:00+01:00').getTime()), // ensures txs are ordered by id
    noteCommitment1 = randomBytes(32),
    noteCommitment2 = randomBytes(32),
    backwardLink = Buffer.alloc(32),
    allowChain = numToUInt32BE(2, 32),
    nullifier1 = randomBytes(32),
    nullifier2 = randomBytes(32),
  } = {},
) =>
  ({
    id: Buffer.from([id]),
    txType,
    created: creationTime,
    dataRootsIndex: 0,
    nullifier1,
    nullifier2,
    proofData: Buffer.concat([
      numToUInt32BE(txTypeToProofId(txType), 32),
      noteCommitment1,
      noteCommitment2,
      nullifier1,
      nullifier2,
      randomBytes(4 * 32),
      toBufferBE(txFee, 32),
      numToUInt32BE(txFeeAssetId, 32),
      randomBytes(3 * 32),
      backwardLink,
      allowChain,
    ]),
  } as any as TxDao);

describe('diagnostics', () => {
  let worldStateDb: Mockify<WorldStateDb>;

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});

    worldStateDb = {
      get: jest.fn(),
    } as any;
  });

  describe('duplicate nullifiers', () => {
    it('should correctly detect duplicate pending nullifiers', () => {
      const nullifiers = [randomBytes(32), randomBytes(32), randomBytes(32)];
      const tx1 = mockTx(1, { nullifier1: nullifiers[0] });
      const tx2 = mockTx(2);
      const tx3 = mockTx(3, { nullifier1: nullifiers[0] });
      const tx4 = mockTx(4);
      const tx5 = mockTx(5, { nullifier1: nullifiers[1] });
      const tx6 = mockTx(6, { nullifier2: nullifiers[0] });
      const tx7 = mockTx(7, { nullifier2: nullifiers[1] });
      const tx8 = mockTx(8, { nullifier1: nullifiers[1] });
      const tx9 = mockTx(9, { nullifier2: nullifiers[1] });

      const pendingTxs = [tx1, tx2, tx3, tx4, tx5, tx6, tx7, tx8, tx9];
      const result = checkDuplicateNullifiers(pendingTxs);
      expect(result[tx1.id.toString('hex')]).toBeUndefined();
      expect(result[tx2.id.toString('hex')]).toBeUndefined();
      expect(result[tx3.id.toString('hex')]).toEqual(tx1.id.toString('hex'));
      expect(result[tx4.id.toString('hex')]).toBeUndefined();
      expect(result[tx5.id.toString('hex')]).toBeUndefined();
      expect(result[tx6.id.toString('hex')]).toEqual(tx1.id.toString('hex'));
      expect(result[tx7.id.toString('hex')]).toEqual(tx5.id.toString('hex'));
      expect(result[tx8.id.toString('hex')]).toEqual(tx5.id.toString('hex'));
      expect(result[tx9.id.toString('hex')]).toEqual(tx5.id.toString('hex'));
    });

    it('should correctly detect duplicate world state nullifiers', async () => {
      const nullifiers = [randomBytes(32), randomBytes(32), randomBytes(32)];
      worldStateDb.get.mockImplementation((treeId: RollupTreeId, index: bigint) => {
        if (nullifiers.find(n => n.equals(toBufferBE(index, 32)))) {
          return toBufferBE(1n, 32);
        }
        return toBufferBE(0n, 32);
      });
      const tx1 = mockTx(1, { nullifier1: nullifiers[0] });
      const tx2 = mockTx(2);
      const tx3 = mockTx(3, { nullifier2: nullifiers[0] });
      const tx4 = mockTx(4);
      const tx5 = mockTx(5, { nullifier1: nullifiers[1] });
      const tx6 = mockTx(6, { nullifier2: nullifiers[0] });
      const tx7 = mockTx(7, { nullifier2: nullifiers[0], nullifier1: nullifiers[1] });

      const pendingTxs = [tx1, tx2, tx3, tx4, tx5, tx6, tx7];
      const result = await checkNullifiersAgainstWorldState(pendingTxs, worldStateDb as any);
      expect(result).toEqual([
        {
          id: tx1.id.toString('hex'),
          nullifiers: [1],
        },
        {
          id: tx3.id.toString('hex'),
          nullifiers: [2],
        },
        {
          id: tx5.id.toString('hex'),
          nullifiers: [1],
        },
        {
          id: tx6.id.toString('hex'),
          nullifiers: [2],
        },
        {
          id: tx7.id.toString('hex'),
          nullifiers: [1, 2],
        },
      ]);
    });

    it('should correctly return nearby txs', () => {
      const tx1 = mockTx(1, { creationTime: new Date('2021-06-20T11:43:20+01:00') });
      const tx2 = mockTx(2, { creationTime: new Date('2021-06-20T11:43:23+01:00') });
      const tx3 = mockTx(3, { creationTime: new Date('2021-06-20T11:43:25+01:00') });
      const tx4 = mockTx(4, { creationTime: new Date('2021-06-20T11:43:27+01:00') });
      const tx5 = mockTx(5, { creationTime: new Date('2021-06-20T11:43:30+01:00') });
      const tx6 = mockTx(6, { creationTime: new Date('2021-06-20T11:43:31+01:00') });
      const tx7 = mockTx(7, { creationTime: new Date('2021-06-20T11:43:34+01:00') });
      const tx8 = mockTx(8, { creationTime: new Date('2021-06-20T11:43:36+01:00') });
      const tx9 = mockTx(9, { creationTime: new Date('2021-06-20T11:43:38+01:00') });

      const pendingTxs = [tx1, tx2, tx3, tx4, tx5, tx6, tx7, tx8, tx9];
      expect(findNearbyTxs(pendingTxs, tx5.id, 5).map(tx => tx.id.toString('hex'))).toEqual(
        [tx3, tx4, tx5, tx6, tx7].map(tx => tx.id.toString('hex')),
      );
      expect(findNearbyTxs(pendingTxs, tx6.id, 3).map(tx => tx.id.toString('hex'))).toEqual(
        [tx5, tx6, tx7].map(tx => tx.id.toString('hex')),
      );
      expect(findNearbyTxs(pendingTxs, tx7.id, 1).map(tx => tx.id.toString('hex'))).toEqual(
        [tx7].map(tx => tx.id.toString('hex')),
      );
      expect(findNearbyTxs(pendingTxs, randomBytes(32), 5).map(tx => tx.id.toString('hex'))).toEqual([]);
    });
  });
});
