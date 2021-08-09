import { EthAddress } from '@aztec/barretenberg/address';
import { AssetId } from '@aztec/barretenberg/asset';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { Signer } from 'ethers';
import { ethers } from 'hardhat';
import { createRollupProof, createSendProof, DefiInteractionData } from './fixtures/create_mock_proof';
import { deployMockBridge } from './fixtures/setup_defi_bridges';
import { setupRollupProcessor } from './fixtures/setup_rollup_processor';
import { RollupProcessor } from './rollup_processor';

describe('rollup_processor: defi bridge', () => {
  let rollupProcessor: RollupProcessor;
  let uniswapBridgeIds: BridgeId[][];
  let signers: Signer[];
  let rollupProvider: Signer;
  let assetAddresses: EthAddress[];

  const dummyProof = () => createSendProof(AssetId.ETH);

  beforeEach(async () => {
    signers = await ethers.getSigners();
    rollupProvider = signers[0];
    ({ rollupProcessor, assetAddresses, uniswapBridgeIds } = await setupRollupProcessor(signers, 2));
  });

  const cloneId = (
    { address, numOutputAssets, inputAssetId, outputAssetIdA, outputAssetIdB }: Partial<BridgeId> = {},
    bridgeId = uniswapBridgeIds[AssetId.DAI][AssetId.ETH],
  ) => {
    return new BridgeId(
      address || bridgeId.address,
      numOutputAssets !== undefined ? numOutputAssets : bridgeId.numOutputAssets,
      inputAssetId !== undefined ? inputAssetId : bridgeId.inputAssetId,
      outputAssetIdA !== undefined ? outputAssetIdA : bridgeId.outputAssetIdA,
      outputAssetIdB !== undefined ? outputAssetIdB : bridgeId.outputAssetIdB,
    );
  };

  it('revert if bridge address does not exist', async () => {
    const bridgeId = cloneId({ address: EthAddress.randomAddress() });
    const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [new DefiInteractionData(bridgeId, 1n)],
    });
    const tx = await rollupProcessor.createEscapeHatchProofTx(proofData, [], []);
    await expect(rollupProcessor.sendTx(tx)).rejects.toThrow('Rollup Processor: INVALID_BRIDGE_ID');
  });

  it('revert if number of output assets do not match', async () => {
    const bridgeId = cloneId({ numOutputAssets: 2 });
    const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [new DefiInteractionData(bridgeId, 1n)],
    });
    const tx = await rollupProcessor.createEscapeHatchProofTx(proofData, [], []);
    await expect(rollupProcessor.sendTx(tx)).rejects.toThrow('Rollup Processor: INVALID_BRIDGE_ID');
  });

  it('revert if number of output assets is zero', async () => {
    const bridgeId = cloneId({ numOutputAssets: 0 });
    const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [new DefiInteractionData(bridgeId, 1n)],
    });
    const tx = await rollupProcessor.createEscapeHatchProofTx(proofData, [], []);
    await expect(rollupProcessor.sendTx(tx)).rejects.toThrow('Rollup Processor: ZERO_NUM_OUTPUT_ASSETS');
  });

  it('revert if input asset addresses do not match', async () => {
    const bridgeId = cloneId({ inputAssetId: AssetId.ETH });
    const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [new DefiInteractionData(bridgeId, 1n)],
    });
    const tx = await rollupProcessor.createEscapeHatchProofTx(proofData, [], []);
    await expect(rollupProcessor.sendTx(tx)).rejects.toThrow('Rollup Processor: INVALID_BRIDGE_ID');
  });

  it('revert if first output asset addresses do not match', async () => {
    const bridgeId = cloneId({ outputAssetIdA: AssetId.DAI });
    const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [new DefiInteractionData(bridgeId, 1n)],
    });
    const tx = await rollupProcessor.createEscapeHatchProofTx(proofData, [], []);
    await expect(rollupProcessor.sendTx(tx)).rejects.toThrow('Rollup Processor: INVALID_BRIDGE_ID');
  });

  it('revert if second output asset addresses do not match', async () => {
    const bridgeId = await deployMockBridge(rollupProvider, assetAddresses, {
      numOutputAssets: 2,
      outputAssetIdB: AssetId.ETH,
    });
    const invalidBridgeId = cloneId({ outputAssetIdB: AssetId.DAI }, bridgeId);
    const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [new DefiInteractionData(invalidBridgeId, 1n)],
    });
    const tx = await rollupProcessor.createEscapeHatchProofTx(proofData, [], []);
    await expect(rollupProcessor.sendTx(tx)).rejects.toThrow('Rollup Processor: INVALID_BRIDGE_ID');
  });

  it('revert if a bridge contract with one output asset returns a non zero second output asset address', async () => {
    const bridgeId = await deployMockBridge(rollupProvider, assetAddresses, {
      numOutputAssets: 1,
      inputAssetId: AssetId.ETH,
      outputAssetIdA: AssetId.DAI,
      outputAssetIdB: AssetId.DAI,
    });
    const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [new DefiInteractionData(bridgeId, 1n)],
    });
    const tx = await rollupProcessor.createEscapeHatchProofTx(proofData, [], []);
    await expect(rollupProcessor.sendTx(tx)).rejects.toThrow('Rollup Processor: INVALID_BRIDGE_ID');
  });
});
