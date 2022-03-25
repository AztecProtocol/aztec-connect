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
import { deployMockBridge, mockAsyncBridge, MockBridgeParams } from './fixtures/setup_defi_bridges';
import {
  setupTestRollupProcessor,
  upgradeTestRollupProcessor,
} from './fixtures/setup_upgradeable_test_rollup_processor';
import { TestRollupProcessor } from './fixtures/test_rollup_processor';
import { BridgeId } from '@aztec/barretenberg/bridge_id';

describe('rollup_processor', () => {
  let feeDistributor: FeeDistributor;
  let rollupProcessor: TestRollupProcessor;
  let signers: Signer[];
  let addresses: EthAddress[];
  let assets: Asset[];
  let assetAddresses: EthAddress[];

  const escapeBlockLowerBound = 80;
  const escapeBlockUpperBound = 100;

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

  it('owner should be able to set the allowThirdParty contract flag', async () => {
    const statusBefore = await rollupProcessor.getThirdPartyContractStatus();
    expect(statusBefore).toBe(false);

    await expect(
      rollupProcessor.setThirdPartyContractStatus(true, {
        signingAddress: EthAddress.fromString(await signers[1].getAddress()),
      }),
    ).rejects.toThrow('Ownable: caller is not the owner');

    await rollupProcessor.setThirdPartyContractStatus(true, {
      signingAddress: EthAddress.fromString(await signers[0].getAddress()),
    });

    const statusAfter = await rollupProcessor.getThirdPartyContractStatus();
    expect(statusAfter).toBe(true);
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

  it('should set new supported asset if not owner when the THIRD_PARTY_CONTRACTS flag is set', async () => {
    const assetAddr = EthAddress.randomAddress();
    const nonOwner = EthAddress.fromString(await signers[1].getAddress());
    await expect(rollupProcessor.setSupportedAsset(assetAddr, false, 0, { signingAddress: nonOwner })).rejects.toThrow(
      'THIRD_PARTY_CONTRACTS_FLAG_NOT_SET',
    );

    await rollupProcessor.setThirdPartyContractStatus(true, {
      signingAddress: EthAddress.fromString(await signers[0].getAddress()),
    });

    await expect(
      rollupProcessor.setSupportedAsset(assetAddr, false, 0, { signingAddress: nonOwner }),
    ).resolves.toBeTruthy();
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

  it('should set new supported bridge if not owner when the THIRD_PARTY_CONTRACTS flag is set', async () => {
    const bridgeAddr = EthAddress.randomAddress();
    const gasLimit = 15000000;
    const nonOwner = EthAddress.fromString(await signers[1].getAddress());
    await expect(
      rollupProcessor.setSupportedBridge(bridgeAddr, gasLimit, { signingAddress: nonOwner }),
    ).rejects.toThrow('THIRD_PARTY_CONTRACTS_FLAG_NOT_SET');

    await rollupProcessor.setThirdPartyContractStatus(true, {
      signingAddress: EthAddress.fromString(await signers[0].getAddress()),
    });

    await expect(
      rollupProcessor.setSupportedBridge(bridgeAddr, gasLimit, { signingAddress: nonOwner }),
    ).resolves.toBeTruthy();
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

  it('should extract defi notes from blocks between rollups', async () => {
    const inputAssetIdA = 1;
    const outputValueA = 7n;
    const { bridgeId } = await mockAsyncBridge(signers[0], rollupProcessor, assetAddresses, {
      inputAssetIdA,
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
      await createDepositProof(depositAmount, userAAddress, userA, inputAssetIdA),
      mergeInnerProofs([createAccountProof(), createSendProof(inputAssetIdA, sendAmount)]),
      mergeInnerProofs([
        createDefiDepositProof(bridgeId, defiDepositAmount0),
        createDefiDepositProof(bridgeId, defiDepositAmount1),
      ]),
      createWithdrawProof(withdrawalAmount, userAAddress, inputAssetIdA),
      createDefiClaimProof(bridgeId),
    ];

    const expectedInteractionResult = [
      new DefiInteractionNote(bridgeId, numberOfBridgeCalls * 2, 12n, outputValueA, 0n, true),
      new DefiInteractionNote(bridgeId, numberOfBridgeCalls * 2 + 1, 8n, outputValueA, 0n, true),
    ];
    const previousDefiInteractionHash = packInteractionNotes(expectedInteractionResult, numberOfBridgeCalls);

    // Deposit to contract.
    await assets[inputAssetIdA].approve(depositAmount, userAAddress, rollupProcessor.address);
    await rollupProcessor.depositPendingFunds(inputAssetIdA, depositAmount, undefined, undefined, {
      signingAddress: userAAddress,
    });

    const txProofs = [];
    for (let i = 0; i < innerProofOutputs.length; ++i) {
      const proof = await createRollupProof(signers[0], innerProofOutputs[i], {
        rollupId: i,
        defiInteractionData:
          i === 2
            ? [
                new DefiInteractionData(bridgeId, defiDepositAmount0),
                new DefiInteractionData(bridgeId, defiDepositAmount1),
              ]
            : [],
        previousDefiInteractionHash: i === 4 ? previousDefiInteractionHash : undefined,
      });
      txProofs.push(proof);
    }

    // send the first 3 txs, this will take us beyond the defi deposits
    for (let i = 0; i < 3; i++) {
      const tx = await rollupProcessor.createRollupProofTx(
        txProofs[i].proofData,
        txProofs[i].signatures,
        txProofs[i].offchainTxData,
      );
      await rollupProcessor.sendTx(tx);
    }

    // now finalise the 2 defi deposits
    await rollupProcessor.processAsyncDefiInteraction(expectedInteractionResult[0].nonce);
    await rollupProcessor.processAsyncDefiInteraction(expectedInteractionResult[1].nonce);

    // now send the last 2 tx rollups
    for (let i = 3; i < txProofs.length; i++) {
      const tx = await rollupProcessor.createRollupProofTx(
        txProofs[i].proofData,
        txProofs[i].signatures,
        txProofs[i].offchainTxData,
      );
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
        interactionResult: expectedInteractionResult,
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

  it('should correctly extract sync and async defi notes', async () => {
    const inputAssetIdA = 1;
    const outputValueA = 7n;
    const { bridgeId: asyncBridgeId } = await mockAsyncBridge(signers[0], rollupProcessor, assetAddresses, {
      inputAssetIdA,
      outputAssetIdA: 0,
      outputValueA,
    });
    const syncBridgeId = await mockBridge({
      inputAssetIdA,
      outputAssetIdA: 0,
      outputValueA,
    });
    const numberOfBridgeCalls = RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK;

    const userAAddress = addresses[1];
    const userA = signers[1];

    const depositAmount = 3000n;
    const sendAmount = 6n;
    const defiDepositAmount0 = 12n;
    const withdrawalAmount = 2n;
    const asyncBatchSize = numberOfBridgeCalls;
    const syncBatchSize = numberOfBridgeCalls / 2;

    const getDefiDeposits = (count: number, bridgeId: BridgeId) => {
      return [...Array(count).fill(createDefiDepositProof(bridgeId, defiDepositAmount0))];
    };

    const innerProofOutputs = [
      await createDepositProof(depositAmount, userAAddress, userA, inputAssetIdA),
      mergeInnerProofs([createAccountProof(), createSendProof(inputAssetIdA, sendAmount)]),
      mergeInnerProofs(getDefiDeposits(asyncBatchSize, asyncBridgeId)),
      mergeInnerProofs(getDefiDeposits(asyncBatchSize, asyncBridgeId)),
      mergeInnerProofs(getDefiDeposits(asyncBatchSize, asyncBridgeId)),
      mergeInnerProofs(getDefiDeposits(syncBatchSize, syncBridgeId)),
      createWithdrawProof(withdrawalAmount, userAAddress, inputAssetIdA),
      createWithdrawProof(withdrawalAmount, userAAddress, inputAssetIdA),
      createWithdrawProof(withdrawalAmount, userAAddress, inputAssetIdA),
    ];

    // Deposit to contract.
    await assets[inputAssetIdA].approve(depositAmount, userAAddress, rollupProcessor.address);
    await rollupProcessor.depositPendingFunds(inputAssetIdA, depositAmount, undefined, undefined, {
      signingAddress: userAAddress,
    });

    const createDefiInteractionData = (count: number, bridgeId: BridgeId) => {
      return [...Array(count).fill(new DefiInteractionData(bridgeId, defiDepositAmount0))];
    };

    const txProofs = [];
    txProofs.push(
      await createRollupProof(signers[0], innerProofOutputs[0], {
        rollupId: 0,
        rollupSize: 32,
        defiInteractionData: [],
        previousDefiInteractionHash: undefined,
      }),
    );
    txProofs.push(
      await createRollupProof(signers[0], innerProofOutputs[1], {
        rollupId: 1,
        rollupSize: 32,
        defiInteractionData: [],
        previousDefiInteractionHash: undefined,
      }),
    );
    txProofs.push(
      await createRollupProof(signers[0], innerProofOutputs[2], {
        rollupId: 2,
        rollupSize: 32,
        defiInteractionData: createDefiInteractionData(asyncBatchSize, asyncBridgeId),
        previousDefiInteractionHash: undefined,
      }),
    );
    txProofs.push(
      await createRollupProof(signers[0], innerProofOutputs[3], {
        rollupId: 3,
        rollupSize: 32,
        defiInteractionData: createDefiInteractionData(asyncBatchSize, asyncBridgeId),
        previousDefiInteractionHash: undefined,
      }),
    );
    txProofs.push(
      await createRollupProof(signers[0], innerProofOutputs[4], {
        rollupId: 4,
        rollupSize: 32,
        defiInteractionData: createDefiInteractionData(asyncBatchSize, asyncBridgeId),
        previousDefiInteractionHash: undefined,
      }),
    );
    txProofs.push(
      await createRollupProof(signers[0], innerProofOutputs[5], {
        rollupId: 5,
        rollupSize: 32,
        defiInteractionData: createDefiInteractionData(syncBatchSize, syncBridgeId),
        previousDefiInteractionHash: undefined,
      }),
    );

    try {
      // send the first 5 txs
      for (let i = 0; i < 5; i++) {
        const tx = await rollupProcessor.createRollupProofTx(
          txProofs[i].proofData,
          txProofs[i].signatures,
          txProofs[i].offchainTxData,
        );
        await rollupProcessor.sendTx(tx);
      }
    } catch (error) {
      console.log(error);
    }

    // now finalise the first 50 async defi deposits
    for (let i = 0; i < 50; i++) {
      await rollupProcessor.processAsyncDefiInteraction(i + numberOfBridgeCalls * 2);
    }

    // now send the block of sync defi deposits
    const syncDefiTx = await rollupProcessor.createRollupProofTx(
      txProofs[5].proofData,
      txProofs[5].signatures,
      txProofs[5].offchainTxData,
    );
    await rollupProcessor.sendTx(syncDefiTx);

    // the async interactions hashes are 64 to 160, the sync defi interactions are 160 to 175
    // the hashes array on the contract should now equal nonces [160 ... 175, 64 ... 114]
    // the first set of hashes selected are the last 32. e.g. [82 ... 114]
    // the next set will be [162 ... 175, 64 ... 81]
    // the final set will be [160, 161]
    const firstBatchOfNotes = Array.from(
      { length: numberOfBridgeCalls },
      (_, index) => new DefiInteractionNote(asyncBridgeId, 82 + index, defiDepositAmount0, outputValueA, 0n, true),
    );
    const previousDefiInteractionHash1 = packInteractionNotes(firstBatchOfNotes, numberOfBridgeCalls);
    txProofs.push(
      await createRollupProof(signers[6], innerProofOutputs[6], {
        rollupId: 6,
        rollupSize: 32,
        defiInteractionData: [],
        previousDefiInteractionHash: previousDefiInteractionHash1,
      }),
    );
    const secondBatchOfNotes = [
      ...Array.from(
        { length: 14 },
        (_, index) => new DefiInteractionNote(syncBridgeId, 162 + index, defiDepositAmount0, outputValueA, 0n, true),
      ),
      ...Array.from(
        { length: 18 },
        (_, index) => new DefiInteractionNote(asyncBridgeId, 64 + index, defiDepositAmount0, outputValueA, 0n, true),
      ),
    ];
    const previousDefiInteractionHash2 = packInteractionNotes(secondBatchOfNotes, numberOfBridgeCalls);
    txProofs.push(
      await createRollupProof(signers[7], innerProofOutputs[7], {
        rollupId: 7,
        rollupSize: 32,
        defiInteractionData: [],
        previousDefiInteractionHash: previousDefiInteractionHash2,
      }),
    );
    const thirdBatchOfNotes = [
      ...Array.from(
        { length: 2 },
        (_, index) => new DefiInteractionNote(syncBridgeId, 160 + index, defiDepositAmount0, outputValueA, 0n, true),
      ),
    ];
    const previousDefiInteractionHash3 = packInteractionNotes(thirdBatchOfNotes, numberOfBridgeCalls);
    txProofs.push(
      await createRollupProof(signers[8], innerProofOutputs[8], {
        rollupId: 8,
        rollupSize: 32,
        defiInteractionData: [],
        previousDefiInteractionHash: previousDefiInteractionHash3,
      }),
    );

    try {
      // now send the last 2 withdraw proofs rollups
      for (let i = 6; i < txProofs.length; i++) {
        const tx = await rollupProcessor.createRollupProofTx(
          txProofs[i].proofData,
          txProofs[i].signatures,
          txProofs[i].offchainTxData,
        );
        await rollupProcessor.sendTx(tx);
      }
    } catch (error) {
      console.log(error);
    }

    const createPaddingProofs = (numProofs: number) => {
      return [...Array(numProofs).fill(InnerProofData.PADDING)];
    };

    const blocks = await rollupProcessor.getRollupBlocksFrom(0, 1);
    expect(blocks.length).toBe(9);
    // rollup 0 was the deposit
    {
      const block = blocks[0];
      const rollup = RollupProofData.fromBuffer(block.rollupProofData);
      const { innerProofs, offchainTxData } = innerProofOutputs[0];
      expect(block).toMatchObject({
        rollupId: 0,
        rollupSize: 32,
        interactionResult: [],
        offchainTxData,
      });
      expect(rollup).toMatchObject({
        rollupId: 0,
        dataStartIndex: 0,
        innerProofData: [innerProofs[0], ...createPaddingProofs(31)],
      });
    }

    const numRealTxsInRollup = 32;
    // rollup 1 was the new account and payment
    {
      const block = blocks[1];
      const rollup = RollupProofData.fromBuffer(block.rollupProofData);
      const { innerProofs, offchainTxData } = innerProofOutputs[1];
      expect(block).toMatchObject({
        rollupId: 1,
        rollupSize: 32,
        interactionResult: [],
        offchainTxData,
      });
      expect(rollup).toMatchObject({
        rollupId: 1,
        dataStartIndex: 2 * numRealTxsInRollup,
        innerProofData: [...innerProofs, ...createPaddingProofs(30)],
      });
    }
    // rollup 2 was the first batch of async defi deposits
    {
      const block = blocks[2];
      const rollup = RollupProofData.fromBuffer(block.rollupProofData);
      const { innerProofs, offchainTxData } = innerProofOutputs[2];
      expect(block).toMatchObject({
        rollupId: 2,
        rollupSize: 32,
        offchainTxData,
      });
      expect(rollup).toMatchObject({
        rollupId: 2,
        dataStartIndex: 4 * numRealTxsInRollup,
        innerProofData: innerProofs,
      });
    }
    // rollup 3 was the second batch of async defi deposits
    {
      const block = blocks[3];
      const rollup = RollupProofData.fromBuffer(block.rollupProofData);
      const { innerProofs, offchainTxData } = innerProofOutputs[3];
      expect(block).toMatchObject({
        rollupId: 3,
        rollupSize: 32,
        offchainTxData,
      });
      expect(rollup).toMatchObject({
        rollupId: 3,
        dataStartIndex: 6 * numRealTxsInRollup,
        innerProofData: innerProofs,
      });
    }
    // rollup 4 was the third batch of async defi deposits
    {
      const block = blocks[4];
      const rollup = RollupProofData.fromBuffer(block.rollupProofData);
      const { innerProofs, offchainTxData } = innerProofOutputs[4];
      expect(block).toMatchObject({
        rollupId: 4,
        rollupSize: 32,
        offchainTxData,
        interactionResult: [],
      });
      expect(rollup).toMatchObject({
        rollupId: 4,
        dataStartIndex: 8 * numRealTxsInRollup,
        innerProofData: innerProofs,
      });
    }
    // rollup 5 was the batch of sync defi deposits
    {
      const block = blocks[5];
      const rollup = RollupProofData.fromBuffer(block.rollupProofData);
      const { innerProofs, offchainTxData } = innerProofOutputs[5];
      expect(block).toMatchObject({
        rollupId: 5,
        rollupSize: 32,
        offchainTxData,
        interactionResult: firstBatchOfNotes,
      });
      expect(rollup).toMatchObject({
        rollupId: 5,
        dataStartIndex: 10 * numRealTxsInRollup,
        innerProofData: [...innerProofs, ...createPaddingProofs(16)],
      });
    }
    // rollup 6 was the first withdraw
    {
      const block = blocks[6];
      const rollup = RollupProofData.fromBuffer(block.rollupProofData);
      const { innerProofs, offchainTxData } = innerProofOutputs[6];
      expect(block).toMatchObject({
        rollupId: 6,
        rollupSize: 32,
        offchainTxData,
        interactionResult: secondBatchOfNotes,
      });
      expect(rollup).toMatchObject({
        rollupId: 6,
        dataStartIndex: 12 * numRealTxsInRollup,
        innerProofData: [...innerProofs, ...createPaddingProofs(31)],
      });
    }
    // rollup 7 was the first withdraw
    {
      const block = blocks[7];
      const rollup = RollupProofData.fromBuffer(block.rollupProofData);
      const { innerProofs, offchainTxData } = innerProofOutputs[7];
      expect(block).toMatchObject({
        rollupId: 7,
        rollupSize: 32,
        offchainTxData,
        interactionResult: thirdBatchOfNotes,
      });
      expect(rollup).toMatchObject({
        rollupId: 7,
        dataStartIndex: 14 * numRealTxsInRollup,
        innerProofData: [...innerProofs, ...createPaddingProofs(31)],
      });
    }
    // rollup 8 was the first withdraw
    {
      const block = blocks[8];
      const rollup = RollupProofData.fromBuffer(block.rollupProofData);
      const { innerProofs, offchainTxData } = innerProofOutputs[8];
      expect(block).toMatchObject({
        rollupId: 8,
        rollupSize: 32,
        offchainTxData,
        interactionResult: [],
      });
      expect(rollup).toMatchObject({
        rollupId: 8,
        dataStartIndex: 16 * numRealTxsInRollup,
        innerProofData: [...innerProofs, ...createPaddingProofs(31)],
      });
    }
  });
});
