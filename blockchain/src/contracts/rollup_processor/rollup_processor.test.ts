import { EthAddress } from '@aztec/barretenberg/address';
import { Asset } from '@aztec/barretenberg/blockchain';
import { DefiInteractionNote, packInteractionNotes } from '@aztec/barretenberg/note_algorithms';
import { InnerProofData, RollupProofData } from '@aztec/barretenberg/rollup_proof';
import { TxHash } from '@aztec/barretenberg/blockchain';
import { randomBytes } from 'crypto';
import { Signer } from 'ethers';
import { Result } from 'ethers/lib/utils';
import { ethers } from 'hardhat';
import { FeeDistributor } from '../fee_distributor';
import { advanceBlocks, blocksToAdvance } from './fixtures/advance_block';
import {
  createAccountProof,
  createDefiClaimProof,
  createDefiDepositProof,
  createDepositProof,
  createRollupProof,
  createSendProof,
  createWithdrawProof,
  DefiInteractionData,
  mergeInnerProofs,
} from './fixtures/create_mock_proof';
import { deployMockBridge, MockBridgeParams } from './fixtures/setup_defi_bridges';
import {
  setupTestRollupProcessor,
  upgradeTestRollupProcessor,
} from './fixtures/setup_upgradeable_test_rollup_processor';
import { TestRollupProcessor } from './fixtures/test_rollup_processor';

describe('rollup_processor', () => {
  let feeDistributor: FeeDistributor;
  let rollupProcessor: TestRollupProcessor;
  let signers: Signer[];
  let addresses: EthAddress[];
  let assets: Asset[];
  let assetAddresses: EthAddress[];

  const escapeBlockLowerBound = 80;
  const escapeBlockUpperBound = 100;

  const numberOfBridgeCalls = RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK;

  const mockBridge = async (params: MockBridgeParams = {}) =>
    deployMockBridge(signers[0], rollupProcessor, assetAddresses, params);

  // Extracts the 'args' of each event emitted by the tx.
  const fetchResults = async (txHash: TxHash, eventName: string): Promise<Result> => {
    const receipt = await ethers.provider.getTransactionReceipt(txHash.toString());
    const eventArgs = receipt.logs
      .filter(l => l.address === rollupProcessor.address.toString())
      .map(l => rollupProcessor.contract.interface.parseLog(l))
      .filter(e => e.eventFragment.name === eventName)
      .map(e => e.args);
    return eventArgs;
  };

  beforeEach(async () => {
    signers = await ethers.getSigners();
    addresses = await Promise.all(signers.map(async u => EthAddress.fromString(await u.getAddress())));
    ({ rollupProcessor, feeDistributor, assets, assetAddresses } = await setupTestRollupProcessor(signers, {
      numberOfTokenAssets: 1,
      escapeBlockLowerBound,
      escapeBlockUpperBound,
    }));
    // Advance into block region where escapeHatch is active.
    const blocks = await blocksToAdvance(escapeBlockLowerBound, escapeBlockUpperBound, ethers.provider);
    await advanceBlocks(blocks, ethers.provider);
  });

  it('should be upgradeable', async () => {
    const currentAddress = rollupProcessor.address;
    expect(await rollupProcessor.foo()).toBe(1);

    const newProcessor = await upgradeTestRollupProcessor(signers[0], currentAddress);

    expect(newProcessor.address).toEqual(currentAddress);

    expect(await newProcessor.foo()).toBe(2);
  });

  it('should not be upgradeable by address other than owner', async () => {
    await expect(upgradeTestRollupProcessor(signers[1], rollupProcessor.address)).rejects.toThrow(
      'Ownable: caller is not the owner',
    );
  });

  it('should get contract status', async () => {
    expect(rollupProcessor.address).toEqual(rollupProcessor.address);
    expect(await rollupProcessor.dataSize()).toBe(0);
    expect(await rollupProcessor.getSupportedAssets()).toEqual(assets.map(a => a.getStaticInfo().address));
    expect(await rollupProcessor.getEscapeHatchStatus()).toEqual({ escapeOpen: true, blocksRemaining: 20 });
  });

  it('should get supported asset', async () => {
    const supportedAssetAAddress = await rollupProcessor.getSupportedAsset(1);
    expect(supportedAssetAAddress).toEqual(assets[1].getStaticInfo().address);
  });

  it('should throw for a virtual asset', async () => {
    const assetIdA = 1 << 29;
    await expect(rollupProcessor.getSupportedAsset(assetIdA)).rejects.toThrow('INVALID_ASSET_ID');
    const assetIdB = 0x2abbccdd;
    await expect(rollupProcessor.getSupportedAsset(assetIdB)).rejects.toThrow('INVALID_ASSET_ID');
  });

  it('should set new supported asset', async () => {
    const assetAddr = EthAddress.randomAddress();
    const txHash = await rollupProcessor.setSupportedAsset(assetAddr, false, 0);

    // Check event was emitted.
    const receipt = await ethers.provider.getTransactionReceipt(txHash.toString());
    const assetBId = rollupProcessor.contract.interface.parseLog(receipt.logs[receipt.logs.length - 1]).args.assetId;
    const assetBAddress = rollupProcessor.contract.interface.parseLog(receipt.logs[receipt.logs.length - 1]).args
      .assetAddress;
    const assetBGasLimit = rollupProcessor.contract.interface.parseLog(receipt.logs[receipt.logs.length - 1]).args
      .assetGasLimit;
    expect(assetBGasLimit.toNumber()).toBe(55000);

    expect(assetBId.toNumber()).toBe(2);
    expect(assetBAddress).toBe(assetAddr.toString());

    const supportedAssetBAddress = await rollupProcessor.getSupportedAsset(2);
    expect(supportedAssetBAddress).toEqual(assetAddr);
  });

  it('should set new supported asset with a custom gas limit', async () => {
    const assetAddr = EthAddress.randomAddress();
    const gasLimit = 1500000;
    const txHash = await rollupProcessor.setSupportedAsset(assetAddr, false, gasLimit);

    // Check event was emitted.
    const receipt = await ethers.provider.getTransactionReceipt(txHash.toString());
    const assetBId = rollupProcessor.contract.interface.parseLog(receipt.logs[receipt.logs.length - 1]).args.assetId;
    const assetBAddress = rollupProcessor.contract.interface.parseLog(receipt.logs[receipt.logs.length - 1]).args
      .assetAddress;
    const assetBGasLimit = rollupProcessor.contract.interface.parseLog(receipt.logs[receipt.logs.length - 1]).args
      .assetGasLimit;
    expect(assetBGasLimit.toNumber()).toBe(gasLimit);
    expect(assetBId.toNumber()).toBe(2);
    expect(assetBAddress).toBe(assetAddr.toString());

    const supportedAssetBAddress = await rollupProcessor.getSupportedAsset(2);
    expect(supportedAssetBAddress).toEqual(assetAddr);
  });

  it('should set new supported bridge with a custom gas limit', async () => {
    const bridgeAddr = EthAddress.randomAddress();
    const gasLimit = 15000000;
    const txHash = await rollupProcessor.setSupportedBridge(bridgeAddr, gasLimit);

    // Check event was emitted.
    const receipt = await ethers.provider.getTransactionReceipt(txHash.toString());
    const bridgeId = rollupProcessor.contract.interface.parseLog(receipt.logs[receipt.logs.length - 1]).args
      .bridgeAddressId;
    const bridgeAddress = rollupProcessor.contract.interface.parseLog(receipt.logs[receipt.logs.length - 1]).args
      .bridgeAddress;
    const bridgeGasLimit = rollupProcessor.contract.interface.parseLog(receipt.logs[receipt.logs.length - 1]).args
      .bridgeGasLimit;
    expect(bridgeGasLimit.toNumber()).toBe(gasLimit);
    expect(bridgeId.toNumber()).toBe(2);
    expect(bridgeAddress).toBe(bridgeAddr.toString());

    const supportedAssetBAddress = await rollupProcessor.getSupportedBridge(2);
    expect(supportedAssetBAddress).toEqual(bridgeAddr);
  });

  it('should approve a proof', async () => {
    const proofHash = randomBytes(32);
    expect(await rollupProcessor.getProofApprovalStatus(addresses[0], proofHash)).toBe(false);
    expect(await rollupProcessor.getProofApprovalStatus(addresses[1], proofHash)).toBe(false);
    await rollupProcessor.approveProof(proofHash, { signingAddress: addresses[1] });
    expect(await rollupProcessor.getProofApprovalStatus(addresses[0], proofHash)).toBe(false);
    expect(await rollupProcessor.getProofApprovalStatus(addresses[1], proofHash)).toBe(true);
  });

  it('should return whether an asset supports the permit ERC-2612 approval flow', async () => {
    expect(await rollupProcessor.getAssetPermitSupport(0)).toBe(false);
    expect(await rollupProcessor.getAssetPermitSupport(1)).toBe(true);
  });

  it('should allow any address to use escape hatch', async () => {
    const { proofData } = await createRollupProof(signers[0], createSendProof());
    const tx = await rollupProcessor.createRollupProofTx(proofData, [], []);
    await rollupProcessor.sendTx(tx, { signingAddress: EthAddress.fromString(await signers[1].getAddress()) });
  });

  it('should reject a rollup from an unknown provider outside escape hatch window', async () => {
    const { proofData, signatures } = await createRollupProof(signers[0], createSendProof(), {
      feeDistributorAddress: feeDistributor.address,
    });
    await advanceBlocks(50, ethers.provider);

    const { escapeOpen } = await rollupProcessor.getEscapeHatchStatus();
    expect(escapeOpen).toBe(false);
    const tx = await rollupProcessor.createRollupProofTx(proofData, signatures, []);

    await expect(
      rollupProcessor.sendTx(tx, { signingAddress: EthAddress.fromString(await signers[1].getAddress()) }),
    ).rejects.toThrow('INVALID_PROVIDER');
  });

  it('should allow the owner to change the verifier address', async () => {
    const randomAddress = EthAddress.randomAddress();
    const txHash = await rollupProcessor.setVerifier(randomAddress);
    const [{ verifierAddress }] = await fetchResults(txHash, 'VerifierUpdated');

    expect(verifierAddress.toString()).toBe(randomAddress.toString());
  });

  it('should not be able to set the verifier if not the owner', async () => {
    await expect(
      rollupProcessor.setVerifier(EthAddress.randomAddress(), { signingAddress: addresses[1] }),
    ).rejects.toThrow('Ownable: caller is not the owner');
  });

  it('should get escape hatch open status', async () => {
    const nextEscapeBlock = await blocksToAdvance(80, 100, ethers.provider);
    await advanceBlocks(nextEscapeBlock, ethers.provider);

    const { escapeOpen, blocksRemaining } = await rollupProcessor.getEscapeHatchStatus();
    expect(escapeOpen).toBe(true);
    expect(blocksRemaining).toBe(20);
  });

  it('should get escape hatch closed status', async () => {
    const nextEscapeBlock = await blocksToAdvance(79, 100, ethers.provider);
    await advanceBlocks(nextEscapeBlock, ethers.provider);

    const { escapeOpen, blocksRemaining } = await rollupProcessor.getEscapeHatchStatus();
    expect(escapeOpen).toBe(false);
    expect(blocksRemaining).toBe(1);
  });

  it('should process all proof types and get specified blocks', async () => {
    const inputAssetId = 1;
    const outputValueA = 7n;
    const bridgeId = await mockBridge({
      inputAssetIdA: inputAssetId,
      outputAssetIdA: 0,
      outputValueA,
    });
    const numberOfBridgeCalls = RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK;

    const userAAddress = addresses[1];
    const userA = signers[1];

    const depositAmount = 30n;
    const sendAmount = 6n;
    const defiDepositAmount0 = 12n;
    const defiDepositAmount1 = 8n;
    const withdrawalAmount = 10n;

    const innerProofOutputs = [
      await createDepositProof(depositAmount, userAAddress, userA, inputAssetId),
      mergeInnerProofs([createAccountProof(), createSendProof(inputAssetId, sendAmount)]),
      mergeInnerProofs([
        createDefiDepositProof(bridgeId, defiDepositAmount0),
        createDefiDepositProof(bridgeId, defiDepositAmount1),
      ]),
      createWithdrawProof(withdrawalAmount, userAAddress, inputAssetId),
      createDefiClaimProof(bridgeId),
    ];

    const expectedInteractionResult = [
      new DefiInteractionNote(bridgeId, numberOfBridgeCalls * 2, 12n, outputValueA, 0n, true),
      new DefiInteractionNote(bridgeId, numberOfBridgeCalls * 2 + 1, 8n, outputValueA, 0n, true),
    ];
    const previousDefiInteractionHash = packInteractionNotes(expectedInteractionResult, numberOfBridgeCalls);

    // Deposit to contract.
    await assets[inputAssetId].approve(depositAmount, userAAddress, rollupProcessor.address);
    await rollupProcessor.depositPendingFunds(inputAssetId, depositAmount, undefined, undefined, {
      signingAddress: userAAddress,
    });

    for (let i = 0; i < innerProofOutputs.length; ++i) {
      const { proofData, signatures, offchainTxData } = await createRollupProof(signers[0], innerProofOutputs[i], {
        rollupId: i,
        defiInteractionData:
          i === 2
            ? [
                new DefiInteractionData(bridgeId, defiDepositAmount0),
                new DefiInteractionData(bridgeId, defiDepositAmount1),
              ]
            : [],
        previousDefiInteractionHash: i === 3 ? previousDefiInteractionHash : undefined,
      });
      const tx = await rollupProcessor.createRollupProofTx(proofData, signatures, offchainTxData);
      await rollupProcessor.sendTx(tx);
    }

    const blocks = await rollupProcessor.getRollupBlocksFrom(0, 1);
    expect(blocks.length).toBe(5);

    {
      const block = blocks[0];
      const rollup = RollupProofData.fromBuffer(block.rollupProofData);
      const { innerProofs, offchainTxData } = innerProofOutputs[0];
      expect(block).toMatchObject({
        rollupId: 0,
        rollupSize: 2,
        interactionResult: [],
        offchainTxData,
      });
      expect(rollup).toMatchObject({
        rollupId: 0,
        dataStartIndex: 0,
        innerProofData: [innerProofs[0], InnerProofData.PADDING],
      });
    }

    const numRealTxsInRollup = 4;

    {
      const block = blocks[1];
      const rollup = RollupProofData.fromBuffer(block.rollupProofData);
      const { innerProofs, offchainTxData } = innerProofOutputs[1];
      expect(block).toMatchObject({
        rollupId: 1,
        rollupSize: 2,
        interactionResult: [],
        offchainTxData,
      });
      expect(rollup).toMatchObject({
        rollupId: 1,
        dataStartIndex: 1 * numRealTxsInRollup,
        innerProofData: innerProofs,
      });
    }

    {
      const block = blocks[2];
      const rollup = RollupProofData.fromBuffer(block.rollupProofData);
      const { innerProofs, offchainTxData } = innerProofOutputs[2];
      expect(block).toMatchObject({
        rollupId: 2,
        rollupSize: 2,
        offchainTxData,
        interactionResult: expectedInteractionResult,
      });
      expect(rollup).toMatchObject({
        rollupId: 2,
        dataStartIndex: 2 * numRealTxsInRollup,
        innerProofData: innerProofs,
      });
    }

    {
      const block = blocks[3];
      const rollup = RollupProofData.fromBuffer(block.rollupProofData);
      const { innerProofs, offchainTxData } = innerProofOutputs[3];
      expect(block).toMatchObject({
        rollupId: 3,
        rollupSize: 2,
        offchainTxData,
        interactionResult: [],
      });
      expect(rollup).toMatchObject({
        rollupId: 3,
        dataStartIndex: 3 * numRealTxsInRollup,
        innerProofData: [innerProofs[0], InnerProofData.PADDING],
      });
    }

    {
      const block = blocks[4];
      const rollup = RollupProofData.fromBuffer(block.rollupProofData);
      const { innerProofs, offchainTxData } = innerProofOutputs[4];
      expect(block).toMatchObject({
        rollupId: 4,
        rollupSize: 2,
        offchainTxData,
        interactionResult: [],
      });
      expect(rollup).toMatchObject({
        rollupId: 4,
        dataStartIndex: 4 * numRealTxsInRollup,
        innerProofData: [innerProofs[0], InnerProofData.PADDING],
      });
    }
  });
});
