import { EthAddress } from '@aztec/barretenberg/address';
import { virtualAssetIdFlag, virtualAssetIdPlaceholder } from '@aztec/barretenberg/bridge_id';
import { Signer } from 'ethers';
import { ethers } from 'hardhat';
import { createRollupProof, createSendProof, DefiInteractionData } from './fixtures/create_mock_proof';
import { deployMockBridge, MockBridgeParams } from './fixtures/setup_defi_bridges';
import { setupTestRollupProcessor } from './fixtures/setup_test_rollup_processor';
import { RollupProcessor } from './rollup_processor';

describe('rollup_processor: defi bridge', () => {
  let rollupProcessor: RollupProcessor;
  let signers: Signer[];
  let rollupProvider: Signer;
  let assetAddresses: EthAddress[];

  const dummyProof = () => createSendProof(0);

  const mockBridge = async (params: MockBridgeParams = {}) =>
    deployMockBridge(rollupProvider, rollupProcessor, assetAddresses, params);

  beforeEach(async () => {
    signers = await ethers.getSigners();
    rollupProvider = signers[0];
    ({ rollupProcessor, assetAddresses } = await setupTestRollupProcessor(signers));
  });

  it('revert if two real output assets are the same', async () => {
    const bridgeId = await mockBridge({
      outputAssetIdA: 2,
      outputAssetIdB: 2,
    });
    const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [new DefiInteractionData(bridgeId, 1n)],
    });
    const tx = await rollupProcessor.createRollupProofTx(proofData, [], []);
    await expect(rollupProcessor.sendTx(tx)).rejects.toThrow('BRIDGE_WITH_IDENTICAL_OUTPUT_ASSETS');
  });

  it('will not revert if two virtual output assets are the same', async () => {
    const bridgeId = await mockBridge({
      outputAssetIdA: virtualAssetIdPlaceholder,
      outputAssetIdB: virtualAssetIdPlaceholder,
    });
    const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [new DefiInteractionData(bridgeId, 1n)],
    });
    const tx = await rollupProcessor.createRollupProofTx(proofData, [], []);
    const result = await rollupProcessor.sendTx(tx);
    expect(result).toBeTruthy();
  });

  it('revert if two real input assets are the same', async () => {
    const bridgeId = await mockBridge({
      inputAssetIdA: 2,
      inputAssetIdB: 2,
    });
    const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [new DefiInteractionData(bridgeId, 1n)],
    });
    const tx = await rollupProcessor.createRollupProofTx(proofData, [], []);
    await expect(rollupProcessor.sendTx(tx)).rejects.toThrow('BRIDGE_WITH_IDENTICAL_INPUT_ASSETS');
  });

  it('revert if two virtual input assets are the same', async () => {
    const bridgeId = await mockBridge({
      inputAssetIdA: 2 + virtualAssetIdFlag,
      inputAssetIdB: 2 + virtualAssetIdFlag,
    });
    const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [new DefiInteractionData(bridgeId, 1n)],
    });
    const tx = await rollupProcessor.createRollupProofTx(proofData, [], []);
    await expect(rollupProcessor.sendTx(tx)).rejects.toThrow('BRIDGE_WITH_IDENTICAL_INPUT_ASSETS');
  });
});
