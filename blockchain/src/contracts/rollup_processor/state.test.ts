import { RollupProofDataOffsets } from '@aztec/barretenberg/rollup_proof';
import { numToUInt32BE } from '@aztec/barretenberg/serialize';
import { Signer, utils } from 'ethers';
import { ethers } from 'hardhat';
import { createRollupProof, createSendProof } from './fixtures/create_mock_proof';
import { setupRollupProcessor } from './fixtures/setup_rollup_processor';
import { RollupProcessor } from './rollup_processor';

describe('rollup_processor: state', () => {
  let rollupProvider: Signer;
  let rollupProcessor: RollupProcessor;

  beforeEach(async () => {
    const signers = await ethers.getSigners();
    [rollupProvider] = signers;
    ({ rollupProcessor } = await setupRollupProcessor(signers, 1));
  });

  it('should update merkle tree state', async () => {
    const { proofData, signatures, rollupProofData } = await createRollupProof(rollupProvider, createSendProof());

    const tx = await rollupProcessor.createEscapeHatchProofTx(proofData, signatures, []);
    await rollupProcessor.sendTx(tx);

    const expectedStateHash = utils.keccak256(Buffer.concat([
      numToUInt32BE(rollupProofData.rollupId + 1, 32),
      rollupProofData.newDataRoot,
      rollupProofData.newNullRoot,
      rollupProofData.newDataRootsRoot,
      rollupProofData.newDefiRoot
    ]));
    expect(await rollupProcessor.stateHash()).toEqual(Buffer.from(expectedStateHash.slice(2), 'hex'));
  });

  it('should reject for incorrect rollupId', async () => {
    const { proofData, signatures } = await createRollupProof(rollupProvider, createSendProof());
    proofData.writeUInt32BE(666, RollupProofDataOffsets.ROLLUP_ID);

    const tx = await rollupProcessor.createEscapeHatchProofTx(proofData, signatures, []);
    await expect(rollupProcessor.sendTx(tx)).rejects.toThrow('Rollup Processor: INCORRECT_STATE_HASH');
  });

  it('should reject for incorrect data start index', async () => {
    const { proofData, signatures } = await createRollupProof(rollupProvider, createSendProof());
    proofData.writeUInt32BE(666, RollupProofDataOffsets.DATA_START_INDEX);

    const tx = await rollupProcessor.createEscapeHatchProofTx(proofData, signatures, []);
    await expect(rollupProcessor.sendTx(tx)).rejects.toThrow('Rollup Processor: INCORRECT_DATA_START_INDEX');
  });

  it('should reject for incorrect old data root', async () => {
    const { proofData, signatures } = await createRollupProof(rollupProvider, createSendProof());
    proofData.writeUInt32BE(666, RollupProofDataOffsets.OLD_DATA_ROOT);

    const tx = await rollupProcessor.createEscapeHatchProofTx(proofData, signatures, []);
    await expect(rollupProcessor.sendTx(tx)).rejects.toThrow('Rollup Processor: INCORRECT_STATE_HASH');
  });

  it('should reject for incorrect old nullifier root', async () => {
    const { proofData, signatures } = await createRollupProof(rollupProvider, createSendProof());
    proofData.writeUInt32BE(666, RollupProofDataOffsets.OLD_NULL_ROOT);

    const tx = await rollupProcessor.createEscapeHatchProofTx(proofData, signatures, []);
    await expect(rollupProcessor.sendTx(tx)).rejects.toThrow('Rollup Processor: INCORRECT_STATE_HASH');
  });

  it('should reject for malformed root root', async () => {
    const { proofData, signatures } = await createRollupProof(rollupProvider, createSendProof());
    proofData.writeUInt32BE(666, RollupProofDataOffsets.OLD_ROOT_ROOT);

    const tx = await rollupProcessor.createEscapeHatchProofTx(proofData, signatures, []);
    await expect(rollupProcessor.sendTx(tx)).rejects.toThrow('Rollup Processor: INCORRECT_STATE_HASH');
  });
});
