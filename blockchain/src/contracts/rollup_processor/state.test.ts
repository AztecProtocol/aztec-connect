import { RollupProofDataOffsets } from '@aztec/barretenberg/rollup_proof';
import { numToUInt32BE } from '@aztec/barretenberg/serialize';
import { Signer, utils } from 'ethers';
import { ethers } from 'hardhat';
import { evmSnapshot, evmRevert } from '../../ganache/hardhat_chain_manipulation';
import { createRollupProof, createSendProof } from './fixtures/create_mock_proof';
import { setupTestRollupProcessor } from './fixtures/setup_upgradeable_test_rollup_processor';
import { RollupProcessor } from './rollup_processor';

describe('rollup_processor: state', () => {
  let rollupProvider: Signer;
  let rollupProcessor: RollupProcessor;

  let snapshot: string;

  beforeAll(async () => {
    const signers = await ethers.getSigners();
    [rollupProvider] = signers;
    ({ rollupProcessor } = await setupTestRollupProcessor(signers));
  });

  beforeEach(async () => {
    snapshot = await evmSnapshot();
  });

  afterEach(async () => {
    await evmRevert(snapshot);
  });

  it('should update merkle tree state', async () => {
    const { proofData, signatures, rollupProofData } = await createRollupProof(rollupProvider, createSendProof());

    const tx = await rollupProcessor.createRollupProofTx(proofData, signatures, []);
    await rollupProcessor.sendTx(tx);

    const expectedStateHash = utils.keccak256(
      Buffer.concat([
        numToUInt32BE(rollupProofData.rollupId + 1, 32),
        rollupProofData.newDataRoot,
        rollupProofData.newNullRoot,
        rollupProofData.newDataRootsRoot,
        rollupProofData.newDefiRoot,
      ]),
    );
    const expected = Buffer.from(expectedStateHash.slice(2), 'hex');
    expect(await rollupProcessor.stateHash()).toEqual(expected);
  });

  it('should pass with 3 rollups where intermediate have odd size', async () => {
    {
      const { proofData, signatures } = await createRollupProof(rollupProvider, createSendProof(), { rollupSize: 28 });
      const tx = await rollupProcessor.createRollupProofTx(proofData, signatures, []);
      expect(await rollupProcessor.sendTx(tx));
    }

    {
      const datasize = await rollupProcessor.getDataSize();
      const rollupSize = 3;
      const numDataLeaves = rollupSize * 2;
      const expectedStart = datasize + numDataLeaves - (datasize % numDataLeaves);

      const { proofData, signatures } = await createRollupProof(rollupProvider, createSendProof(), {
        rollupId: 1,
        rollupSize: rollupSize,
        dataStartIndex: expectedStart,
      });
      const tx = await rollupProcessor.createRollupProofTx(proofData, signatures, []);
      expect(await rollupProcessor.sendTx(tx));
    }

    {
      const datasize = await rollupProcessor.getDataSize();
      const rollupSize = 28;
      const numDataLeaves = rollupSize * 2;
      const expectedStart = datasize + numDataLeaves - (datasize % numDataLeaves);

      const { proofData, signatures } = await createRollupProof(rollupProvider, createSendProof(), {
        rollupId: 2,
        dataStartIndex: expectedStart,
        rollupSize: rollupSize,
      });
      const tx = await rollupProcessor.createRollupProofTx(proofData, signatures, []);
      expect(await rollupProcessor.sendTx(tx));
    }
  });

  it('should reject for incorrect rollupId', async () => {
    const { proofData, signatures } = await createRollupProof(rollupProvider, createSendProof());
    proofData.writeUInt32BE(666, RollupProofDataOffsets.ROLLUP_ID);

    const tx = await rollupProcessor.createRollupProofTx(proofData, signatures, []);
    await expect(rollupProcessor.sendTx(tx)).rejects.toThrow('INCORRECT_STATE_HASH');
  });

  it('should reject for incorrect data start index', async () => {
    const { proofData, signatures } = await createRollupProof(rollupProvider, createSendProof());
    proofData.writeUInt32BE(666, RollupProofDataOffsets.DATA_START_INDEX);

    const tx = await rollupProcessor.createRollupProofTx(proofData, signatures, []);
    await expect(rollupProcessor.sendTx(tx)).rejects.toThrow('INCORRECT_DATA_START_INDEX(666, 0)');
  });

  it('should reject for incorrect data start index 2', async () => {
    {
      const { proofData, signatures } = await createRollupProof(rollupProvider, createSendProof());
      const tx = await rollupProcessor.createRollupProofTx(proofData, signatures, []);
      expect(await rollupProcessor.sendTx(tx));
    }

    const datasize = await rollupProcessor.getDataSize();
    const expectedStart = datasize + 6 - (datasize % 6);

    const { proofData, signatures } = await createRollupProof(rollupProvider, createSendProof(), {
      rollupId: 1,
      rollupSize: 3,
    });
    proofData.writeUInt32BE(665, RollupProofDataOffsets.DATA_START_INDEX);

    const tx = await rollupProcessor.createRollupProofTx(proofData, signatures, []);
    await expect(rollupProcessor.sendTx(tx)).rejects.toThrow(`INCORRECT_DATA_START_INDEX(665, ${expectedStart})`);
  });

  it('should reject for incorrect old data root', async () => {
    const { proofData, signatures } = await createRollupProof(rollupProvider, createSendProof());
    proofData.writeUInt32BE(666, RollupProofDataOffsets.OLD_DATA_ROOT);

    const tx = await rollupProcessor.createRollupProofTx(proofData, signatures, []);
    await expect(rollupProcessor.sendTx(tx)).rejects.toThrow('INCORRECT_STATE_HASH');
  });

  it('should reject for incorrect old nullifier root', async () => {
    const { proofData, signatures } = await createRollupProof(rollupProvider, createSendProof());
    proofData.writeUInt32BE(666, RollupProofDataOffsets.OLD_NULL_ROOT);

    const tx = await rollupProcessor.createRollupProofTx(proofData, signatures, []);
    await expect(rollupProcessor.sendTx(tx)).rejects.toThrow('INCORRECT_STATE_HASH');
  });

  it('should reject for malformed root root', async () => {
    const { proofData, signatures } = await createRollupProof(rollupProvider, createSendProof());
    proofData.writeUInt32BE(666, RollupProofDataOffsets.OLD_ROOT_ROOT);

    const tx = await rollupProcessor.createRollupProofTx(proofData, signatures, []);
    await expect(rollupProcessor.sendTx(tx)).rejects.toThrow('INCORRECT_STATE_HASH');
  });
});
