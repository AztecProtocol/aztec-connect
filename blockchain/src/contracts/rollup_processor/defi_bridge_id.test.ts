import { EthAddress } from '@aztec/barretenberg/address';
import { toBufferBE } from '@aztec/barretenberg/bigint_buffer';
import { BridgeId, virtualAssetIdFlag, virtualAssetIdPlaceholder } from '@aztec/barretenberg/bridge_id';
import { BitConfig } from '@aztec/barretenberg/bridge_id/bit_config';
import { Signer } from 'ethers';
import { ethers } from 'hardhat';
import { evmSnapshot, evmRevert } from '../../ganache/hardhat_chain_manipulation';
import { createRollupProof, createSendProof, DefiInteractionData } from './fixtures/create_mock_proof';
import { deployMockBridge, MockBridgeParams } from './fixtures/setup_defi_bridges';
import { setupTestRollupProcessor } from './fixtures/setup_upgradeable_test_rollup_processor';
import { RollupProcessor } from './rollup_processor';

describe('rollup_processor: defi bridge', () => {
  let rollupProcessor: RollupProcessor;
  let signers: Signer[];
  let rollupProvider: Signer;
  let assetAddresses: EthAddress[];

  let snapshot: string;

  const dummyProof = () => createSendProof(0);

  const mockBridge = (params: MockBridgeParams = {}) =>
    deployMockBridge(rollupProvider, rollupProcessor, assetAddresses, params);

  beforeAll(async () => {
    signers = await ethers.getSigners();
    rollupProvider = signers[0];
    ({ rollupProcessor, assetAddresses } = await setupTestRollupProcessor(signers));
  });

  beforeEach(async () => {
    snapshot = await evmSnapshot();
  });

  afterEach(async () => {
    await evmRevert(snapshot);
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
    expect(await rollupProcessor.sendTx(tx));
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

  it('inconsistent id, second input not in use, but inputAssetIdB > 0', async () => {
    const bridgeAssetId = await rollupProcessor.getSupportedBridgesLength();
    const bridgeId = new BridgeId(bridgeAssetId, 1, 1, 2, undefined, undefined);
    const bitConfig = new BitConfig(false, false);

    const buffer = bridgeId.toBuffer();
    toBufferBE(bitConfig.toBigInt(), 4).copy(buffer, (256 - 184) / 8, 0, 4);

    const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [new DefiInteractionData(bridgeId, 1n)],
    });

    buffer.copy(proofData, 32 * 11, 0, 32);

    const tx = await rollupProcessor.createRollupProofTx(proofData, [], []);
    await expect(rollupProcessor.sendTx(tx)).rejects.toThrow('BRIDGE_ID_IS_INCONSISTENT()');
  });

  it.skip('inconsistent id, second input not in use, but outputAssetIdB == eth', async () => {
    const bridgeAssetId = await rollupProcessor.getSupportedBridgesLength();
    const bridgeId = new BridgeId(bridgeAssetId, 1, 1, 0, 0, undefined);
    const bitConfig = new BitConfig(false, false);

    const buffer = bridgeId.toBuffer();
    toBufferBE(bitConfig.toBigInt(), 4).copy(buffer, (256 - 184) / 8, 0, 4);

    const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [new DefiInteractionData(bridgeId, 1n)],
    });

    buffer.copy(proofData, 32 * 11, 0, 32);

    const tx = await rollupProcessor.createRollupProofTx(proofData, [], []);
    await expect(rollupProcessor.sendTx(tx)).rejects.toThrow('BRIDGE_ID_IS_INCONSISTENT()');
  });

  it('inconsistent id, second output not in use, but outputAssetIdB > 0', async () => {
    const bridgeAssetId = await rollupProcessor.getSupportedBridgesLength();
    const bridgeId = new BridgeId(bridgeAssetId, 1, 1, undefined, 2, undefined);
    const bitConfig = new BitConfig(false, false);

    const buffer = bridgeId.toBuffer();
    toBufferBE(bitConfig.toBigInt(), 4).copy(buffer, (256 - 184) / 8, 0, 4);

    const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [new DefiInteractionData(bridgeId, 1n)],
    });

    buffer.copy(proofData, 32 * 11, 0, 32);

    const tx = await rollupProcessor.createRollupProofTx(proofData, [], []);
    await expect(rollupProcessor.sendTx(tx)).rejects.toThrow('BRIDGE_ID_IS_INCONSISTENT()');
  });

  it.skip('inconsistent id, second output not in use, but outputAssetIdB == eth', async () => {
    const bridgeAssetId = await rollupProcessor.getSupportedBridgesLength();
    const bridgeId = new BridgeId(bridgeAssetId, 1, 1, 0, 0, undefined);
    const bitConfig = new BitConfig(false, false);

    const buffer = bridgeId.toBuffer();
    toBufferBE(bitConfig.toBigInt(), 4).copy(buffer, (256 - 184) / 8, 0, 4);

    const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [new DefiInteractionData(bridgeId, 1n)],
    });

    buffer.copy(proofData, 32 * 11, 0, 32);

    const tx = await rollupProcessor.createRollupProofTx(proofData, [], []);
    await expect(rollupProcessor.sendTx(tx)).rejects.toThrow('BRIDGE_ID_IS_INCONSISTENT()');
  });
});
