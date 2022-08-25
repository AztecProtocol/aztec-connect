// eslint-disable-next-line @typescript-eslint/no-var-requires
const { solidity } = require('ethereum-waffle');
import chai from 'chai';

import { expect } from 'chai';
chai.use(solidity);

import { EthAddress } from '@aztec/barretenberg/address';
import { toBufferBE } from '@aztec/barretenberg/bigint_buffer';
import { BridgeCallData, virtualAssetIdFlag, virtualAssetIdPlaceholder } from '@aztec/barretenberg/bridge_call_data';
import { BitConfig } from '@aztec/barretenberg/bridge_call_data/bit_config';
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

  before(async () => {
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
    const bridgeCallData = await mockBridge({
      outputAssetIdA: 2,
      outputAssetIdB: 2,
    });
    const { encodedProofData } = createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [new DefiInteractionData(bridgeCallData, 1n)],
    });
    const tx = await rollupProcessor.createRollupProofTx(encodedProofData, [], []);
    await expect(rollupProcessor.sendTx(tx)).to.be.revertedWith('BRIDGE_WITH_IDENTICAL_OUTPUT_ASSETS');
  });

  it('will not revert if two virtual output assets are the same', async () => {
    const bridgeCallData = await mockBridge({
      outputAssetIdA: virtualAssetIdPlaceholder,
      outputAssetIdB: virtualAssetIdPlaceholder,
    });
    const { encodedProofData } = createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [new DefiInteractionData(bridgeCallData, 1n)],
    });
    const tx = await rollupProcessor.createRollupProofTx(encodedProofData, [], []);
    expect(await rollupProcessor.sendTx(tx));
  });

  it('revert if two real input assets are the same', async () => {
    const bridgeCallData = await mockBridge({
      inputAssetIdA: 2,
      inputAssetIdB: 2,
    });
    const { encodedProofData } = createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [new DefiInteractionData(bridgeCallData, 1n)],
    });
    const tx = await rollupProcessor.createRollupProofTx(encodedProofData, [], []);
    await expect(rollupProcessor.sendTx(tx)).to.be.revertedWith('BRIDGE_WITH_IDENTICAL_INPUT_ASSETS');
  });

  it('revert if two virtual input assets are the same', async () => {
    const bridgeCallData = await mockBridge({
      inputAssetIdA: 2 + virtualAssetIdFlag,
      inputAssetIdB: 2 + virtualAssetIdFlag,
    });
    const { encodedProofData } = createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [new DefiInteractionData(bridgeCallData, 1n)],
    });
    const tx = await rollupProcessor.createRollupProofTx(encodedProofData, [], []);
    await expect(rollupProcessor.sendTx(tx)).to.be.revertedWith('BRIDGE_WITH_IDENTICAL_INPUT_ASSETS');
  });

  it('inconsistent id, second input not in use, but inputAssetIdB > 0', async () => {
    const bridgeAssetId = await rollupProcessor.getSupportedBridgesLength();
    const bridgeCallData = new BridgeCallData(bridgeAssetId, 1, 1, 2, undefined, undefined);
    const bitConfig = new BitConfig(false, false);

    const buffer = bridgeCallData.toBuffer();
    toBufferBE(bitConfig.toBigInt(), 4).copy(buffer, (256 - 184) / 8, 0, 4);

    const { encodedProofData } = createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [new DefiInteractionData(bridgeCallData, 1n)],
    });

    buffer.copy(encodedProofData, 32 * 11, 0, 32);

    const tx = await rollupProcessor.createRollupProofTx(encodedProofData, [], []);
    await expect(rollupProcessor.sendTx(tx)).to.be.revertedWith('INCONSISTENT_BRIDGE_CALL_DATA()');
  });

  it('inconsistent id, second output not in use, but outputAssetIdB > 0', async () => {
    const bridgeAssetId = await rollupProcessor.getSupportedBridgesLength();
    const bridgeCallData = new BridgeCallData(bridgeAssetId, 1, 1, undefined, 2, undefined);
    const bitConfig = new BitConfig(false, false);

    const buffer = bridgeCallData.toBuffer();
    toBufferBE(bitConfig.toBigInt(), 4).copy(buffer, (256 - 184) / 8, 0, 4);

    const { encodedProofData } = createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [new DefiInteractionData(bridgeCallData, 1n)],
    });

    buffer.copy(encodedProofData, 32 * 11, 0, 32);

    const tx = await rollupProcessor.createRollupProofTx(encodedProofData, [], []);
    await expect(rollupProcessor.sendTx(tx)).to.be.revertedWith('INCONSISTENT_BRIDGE_CALL_DATA()');
  });
});
