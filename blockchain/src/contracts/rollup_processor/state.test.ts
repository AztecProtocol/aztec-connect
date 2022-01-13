import { RollupProofDataOffsets } from '@aztec/barretenberg/rollup_proof';
import { numToUInt32BE } from '@aztec/barretenberg/serialize';
import { Signer, utils } from 'ethers';
import { ethers } from 'hardhat';
import { createRollupProof, createSendProof } from './fixtures/create_mock_proof';
import { setupTestRollupProcessor } from './fixtures/setup_test_rollup_processor';
import { RollupProcessor } from './rollup_processor';

describe('rollup_processor: state', () => {
  let rollupProvider: Signer;
  let rollupProcessor: RollupProcessor;

  beforeEach(async () => {
    const signers = await ethers.getSigners();
    [rollupProvider] = signers;
    ({ rollupProcessor } = await setupTestRollupProcessor(signers));
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
    expected[0] = 0; // mask 54 bits to align with smart contract data format
    expected[1] = 0; // (54 bits of the relevant storage slot are used for other variables)
    expected[2] = 0;
    expected[3] = 0;
    expected[4] = 0;
    expected[5] = 0;
    expected[6] = expected[6] & 3;
    expect(await rollupProcessor.stateHash()).toEqual(expected);
  });

  it('should reject for incorrect rollupId', async () => {
    const { proofData, signatures } = await createRollupProof(rollupProvider, createSendProof());
    proofData.writeUInt32BE(666, RollupProofDataOffsets.ROLLUP_ID);

    const tx = await rollupProcessor.createRollupProofTx(proofData, signatures, []);
    await expect(rollupProcessor.sendTx(tx)).rejects.toThrow('Rollup Processor: INCORRECT_STATE_HASH');
  });

  it('should reject for incorrect data start index', async () => {
    const { proofData, signatures } = await createRollupProof(rollupProvider, createSendProof());
    proofData.writeUInt32BE(666, RollupProofDataOffsets.DATA_START_INDEX);

    const tx = await rollupProcessor.createRollupProofTx(proofData, signatures, []);
    await expect(rollupProcessor.sendTx(tx)).rejects.toThrow('Rollup Processor: INCORRECT_DATA_START_INDEX');
  });

  it('should reject for incorrect old data root', async () => {
    const { proofData, signatures } = await createRollupProof(rollupProvider, createSendProof());
    proofData.writeUInt32BE(666, RollupProofDataOffsets.OLD_DATA_ROOT);

    const tx = await rollupProcessor.createRollupProofTx(proofData, signatures, []);
    await expect(rollupProcessor.sendTx(tx)).rejects.toThrow('Rollup Processor: INCORRECT_STATE_HASH');
  });

  it('should reject for incorrect old nullifier root', async () => {
    const { proofData, signatures } = await createRollupProof(rollupProvider, createSendProof());
    proofData.writeUInt32BE(666, RollupProofDataOffsets.OLD_NULL_ROOT);

    const tx = await rollupProcessor.createRollupProofTx(proofData, signatures, []);
    await expect(rollupProcessor.sendTx(tx)).rejects.toThrow('Rollup Processor: INCORRECT_STATE_HASH');
  });

  it('should reject for malformed root root', async () => {
    const { proofData, signatures } = await createRollupProof(rollupProvider, createSendProof());
    proofData.writeUInt32BE(666, RollupProofDataOffsets.OLD_ROOT_ROOT);

    const tx = await rollupProcessor.createRollupProofTx(proofData, signatures, []);
    await expect(rollupProcessor.sendTx(tx)).rejects.toThrow('Rollup Processor: INCORRECT_STATE_HASH');
  });
});
