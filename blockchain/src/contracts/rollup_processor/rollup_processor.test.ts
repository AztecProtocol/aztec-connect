import { EthAddress } from '@aztec/barretenberg/address';
import { Asset, TxHash } from '@aztec/barretenberg/blockchain';
import { DefiInteractionNote, packInteractionNotes } from '@aztec/barretenberg/note_algorithms';
import { InnerProofData, RollupProofData } from '@aztec/barretenberg/rollup_proof';
import { randomBytes } from 'crypto';
import { Signer } from 'ethers';
import { keccak256, Result, toUtf8Bytes } from 'ethers/lib/utils';
import { ethers } from 'hardhat';
import {
  evmSnapshot,
  evmRevert,
  advanceBlocksHardhat,
  blocksToAdvanceHardhat,
} from '../../ganache/hardhat_chain_manipulation';
import { FeeDistributor } from '../fee_distributor';
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
import { setupTestRollupProcessor } from './fixtures/setup_upgradeable_test_rollup_processor';
import { TestRollupProcessor } from './fixtures/test_rollup_processor';

describe('rollup_processor', () => {
  let feeDistributor: FeeDistributor;
  let rollupProcessor: TestRollupProcessor;
  let signers: Signer[];
  let addresses: EthAddress[];
  let assets: Asset[];
  let assetAddresses: EthAddress[];

  let snapshot: string;

  const OWNER_ROLE = keccak256(toUtf8Bytes('OWNER_ROLE'));
  const escapeBlockLowerBound = 80;
  const escapeBlockUpperBound = 100;

  const mockBridge = (params: MockBridgeParams = {}) =>
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

  beforeAll(async () => {
    signers = await ethers.getSigners();
    addresses = await Promise.all(signers.map(async u => EthAddress.fromString(await u.getAddress())));
    ({ rollupProcessor, feeDistributor, assets, assetAddresses } = await setupTestRollupProcessor(signers, {
      numberOfTokenAssets: 1,
      escapeBlockLowerBound,
      escapeBlockUpperBound,
    }));
    // Advance into block region where escapeHatch is active.
    const blocks = await blocksToAdvanceHardhat(escapeBlockLowerBound, escapeBlockUpperBound, ethers.provider);
    await advanceBlocksHardhat(blocks, ethers.provider);
  });

  beforeEach(async () => {
    snapshot = await evmSnapshot();
  });

  afterEach(async () => {
    await evmRevert(snapshot);
  });

  it('should get contract status', async () => {
    expect(rollupProcessor.address).toEqual(rollupProcessor.address);
    expect(await rollupProcessor.dataSize()).toBe(0);
    expect(await rollupProcessor.getSupportedAssets()).toEqual(
      assets
        .slice(1)
        .map(a => a.getStaticInfo())
        .map(({ address, gasLimit }) => ({ address, gasLimit })),
    );
    expect(await rollupProcessor.getEscapeHatchStatus()).toEqual({ escapeOpen: true, blocksRemaining: 20 });
  });

  it('owner should be able to set the allowThirdParty contract flag', async () => {
    const statusBefore = await rollupProcessor.getThirdPartyContractStatus();
    expect(statusBefore).toBe(false);

    await expect(
      rollupProcessor.setThirdPartyContractStatus(true, {
        signingAddress: EthAddress.fromString(await signers[1].getAddress()),
      }),
    ).rejects.toThrow(`AccessControl: account ${addresses[1].toString().toLowerCase()} is missing role ${OWNER_ROLE}`);

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

  it('should set new supported asset with default gas limit', async () => {
    const assetAddr = EthAddress.random();
    const txHash = await rollupProcessor.setSupportedAsset(assetAddr, 0);

    // Check event was emitted.
    const receipt = await ethers.provider.getTransactionReceipt(txHash.toString());
    const parsed = rollupProcessor.contract.interface.parseLog(receipt.logs[receipt.logs.length - 1]);
    const { assetId, assetAddress, assetGasLimit } = parsed.args;
    expect(assetGasLimit.toNumber()).toBe(TestRollupProcessor.DEFAULT_ERC20_GAS_LIMIT);

    expect(assetId.toNumber()).toBe(2);
    expect(assetAddress).toBe(assetAddr.toString());

    const supportedAssetBAddress = await rollupProcessor.getSupportedAsset(2);
    expect(supportedAssetBAddress).toEqual(assetAddr);
  });

  it('should set new supported asset if not owner when the THIRD_PARTY_CONTRACTS flag is set', async () => {
    const assetAddr = EthAddress.random();
    const nonOwner = EthAddress.fromString(await signers[1].getAddress());
    await expect(rollupProcessor.setSupportedAsset(assetAddr, 0, { signingAddress: nonOwner })).rejects.toThrow(
      'THIRD_PARTY_CONTRACTS_FLAG_NOT_SET',
    );

    await rollupProcessor.setThirdPartyContractStatus(true, {
      signingAddress: EthAddress.fromString(await signers[0].getAddress()),
    });

    expect(await rollupProcessor.setSupportedAsset(assetAddr, 0, { signingAddress: nonOwner }));
  });

  it('should set new supported asset with a custom gas limit within pre-defined contract limits', async () => {
    const assetAddr = EthAddress.random();
    const gasLimit = 800000;
    const txHash = await rollupProcessor.setSupportedAsset(assetAddr, gasLimit);

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

  it('should set new supported asset with a minimum gas limit', async () => {
    const assetAddr = EthAddress.random();
    const gasLimit = 10000;
    const minimumGasLimit = 55000;
    const txHash = await rollupProcessor.setSupportedAsset(assetAddr, gasLimit);

    // Check event was emitted.
    const receipt = await ethers.provider.getTransactionReceipt(txHash.toString());
    const assetBId = rollupProcessor.contract.interface.parseLog(receipt.logs[receipt.logs.length - 1]).args.assetId;
    const assetBAddress = rollupProcessor.contract.interface.parseLog(receipt.logs[receipt.logs.length - 1]).args
      .assetAddress;
    const assetBGasLimit = rollupProcessor.contract.interface.parseLog(receipt.logs[receipt.logs.length - 1]).args
      .assetGasLimit;
    expect(assetBGasLimit.toNumber()).toBe(minimumGasLimit);
    expect(assetBId.toNumber()).toBe(2);
    expect(assetBAddress).toBe(assetAddr.toString());

    const supportedAssetBAddress = await rollupProcessor.getSupportedAsset(2);
    expect(supportedAssetBAddress).toEqual(assetAddr);
  });

  it('should set new supported asset with a maximum gas limit', async () => {
    const assetAddr = EthAddress.random();
    const gasLimit = 1600000;
    const maximumGasLimit = 1500000;
    const txHash = await rollupProcessor.setSupportedAsset(assetAddr, gasLimit);

    // Check event was emitted.
    const receipt = await ethers.provider.getTransactionReceipt(txHash.toString());
    const assetBId = rollupProcessor.contract.interface.parseLog(receipt.logs[receipt.logs.length - 1]).args.assetId;
    const assetBAddress = rollupProcessor.contract.interface.parseLog(receipt.logs[receipt.logs.length - 1]).args
      .assetAddress;
    const assetBGasLimit = rollupProcessor.contract.interface.parseLog(receipt.logs[receipt.logs.length - 1]).args
      .assetGasLimit;
    expect(assetBGasLimit.toNumber()).toBe(maximumGasLimit);
    expect(assetBId.toNumber()).toBe(2);
    expect(assetBAddress).toBe(assetAddr.toString());

    const supportedAssetBAddress = await rollupProcessor.getSupportedAsset(2);
    expect(supportedAssetBAddress).toEqual(assetAddr);
  });

  it('should set new supported bridge with limit within pre-defined contract limits', async () => {
    const bridgeAddr = EthAddress.random();
    const gasLimit = 1500000;
    const bridgeAddressId = 2;
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
    expect(bridgeId.toNumber()).toBe(bridgeAddressId);
    expect(bridgeAddress).toBe(bridgeAddr.toString());

    const supportedAssetBAddress = await rollupProcessor.getSupportedBridge(bridgeAddressId);
    expect(supportedAssetBAddress).toEqual(bridgeAddr);
    expect(await rollupProcessor.getBridgeGasLimit(bridgeAddressId)).toBe(gasLimit);
  });

  it('should set new supported bridge with minimum gas limit', async () => {
    const bridgeAddr = EthAddress.random();
    const gasLimit = 20000;
    const minimumGasLimit = 35000;
    const txHash = await rollupProcessor.setSupportedBridge(bridgeAddr, gasLimit);

    // Check event was emitted.
    const receipt = await ethers.provider.getTransactionReceipt(txHash.toString());
    const bridgeId = rollupProcessor.contract.interface.parseLog(receipt.logs[receipt.logs.length - 1]).args
      .bridgeAddressId;
    const bridgeAddress = rollupProcessor.contract.interface.parseLog(receipt.logs[receipt.logs.length - 1]).args
      .bridgeAddress;
    const bridgeGasLimit = rollupProcessor.contract.interface.parseLog(receipt.logs[receipt.logs.length - 1]).args
      .bridgeGasLimit;
    expect(bridgeGasLimit.toNumber()).toBe(minimumGasLimit);
    expect(bridgeId.toNumber()).toBe(2);
    expect(bridgeAddress).toBe(bridgeAddr.toString());

    const supportedAssetBAddress = await rollupProcessor.getSupportedBridge(2);
    expect(supportedAssetBAddress).toEqual(bridgeAddr);
  });

  it('should set new supported bridge with maximum gas limit', async () => {
    const bridgeAddr = EthAddress.random();
    const gasLimit = 6000000;
    const maximumGasLimit = 5000000;
    const txHash = await rollupProcessor.setSupportedBridge(bridgeAddr, gasLimit);

    // Check event was emitted.
    const receipt = await ethers.provider.getTransactionReceipt(txHash.toString());
    const bridgeId = rollupProcessor.contract.interface.parseLog(receipt.logs[receipt.logs.length - 1]).args
      .bridgeAddressId;
    const bridgeAddress = rollupProcessor.contract.interface.parseLog(receipt.logs[receipt.logs.length - 1]).args
      .bridgeAddress;
    const bridgeGasLimit = rollupProcessor.contract.interface.parseLog(receipt.logs[receipt.logs.length - 1]).args
      .bridgeGasLimit;
    expect(bridgeGasLimit.toNumber()).toBe(maximumGasLimit);
    expect(bridgeId.toNumber()).toBe(2);
    expect(bridgeAddress).toBe(bridgeAddr.toString());

    const supportedAssetBAddress = await rollupProcessor.getSupportedBridge(2);
    expect(supportedAssetBAddress).toEqual(bridgeAddr);
  });

  it('should set new supported bridge if not owner when the THIRD_PARTY_CONTRACTS flag is set', async () => {
    const bridgeAddr = EthAddress.random();
    const gasLimit = 15000000;
    const nonOwner = EthAddress.fromString(await signers[1].getAddress());
    await expect(
      rollupProcessor.setSupportedBridge(bridgeAddr, gasLimit, { signingAddress: nonOwner }),
    ).rejects.toThrow('THIRD_PARTY_CONTRACTS_FLAG_NOT_SET');

    await rollupProcessor.setThirdPartyContractStatus(true, {
      signingAddress: EthAddress.fromString(await signers[0].getAddress()),
    });

    expect(await rollupProcessor.setSupportedBridge(bridgeAddr, gasLimit, { signingAddress: nonOwner }));
  });

  it('should approve a proof', async () => {
    const proofHash = randomBytes(32);
    expect(await rollupProcessor.getProofApprovalStatus(addresses[0], proofHash)).toBe(false);
    expect(await rollupProcessor.getProofApprovalStatus(addresses[1], proofHash)).toBe(false);
    await rollupProcessor.approveProof(proofHash, { signingAddress: addresses[1] });
    expect(await rollupProcessor.getProofApprovalStatus(addresses[0], proofHash)).toBe(false);
    expect(await rollupProcessor.getProofApprovalStatus(addresses[1], proofHash)).toBe(true);
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
    await advanceBlocksHardhat(50, ethers.provider);

    const { escapeOpen } = await rollupProcessor.getEscapeHatchStatus();
    expect(escapeOpen).toBe(false);
    const tx = await rollupProcessor.createRollupProofTx(proofData, signatures, []);

    await expect(
      rollupProcessor.sendTx(tx, { signingAddress: EthAddress.fromString(await signers[1].getAddress()) }),
    ).rejects.toThrow('INVALID_PROVIDER');
  });

  it('should allow the owner to change the verifier address', async () => {
    const random = EthAddress.random();
    const txHash = await rollupProcessor.setVerifier(random);
    const [{ verifierAddress }] = await fetchResults(txHash, 'VerifierUpdated');

    expect(verifierAddress.toString()).toBe(random.toString());
  });

  it('should not be able to set the verifier if not the owner', async () => {
    await expect(rollupProcessor.setVerifier(EthAddress.random(), { signingAddress: addresses[1] })).rejects.toThrow(
      `AccessControl: account ${addresses[1].toString().toLowerCase()} is missing role ${OWNER_ROLE}`,
    );
  });

  it('should get escape hatch open status', async () => {
    const nextEscapeBlock = await blocksToAdvanceHardhat(80, 100, ethers.provider);
    await advanceBlocksHardhat(nextEscapeBlock, ethers.provider);

    const { escapeOpen, blocksRemaining } = await rollupProcessor.getEscapeHatchStatus();
    expect(escapeOpen).toBe(true);
    expect(blocksRemaining).toBe(20);
  });

  it('should get escape hatch closed status', async () => {
    const nextEscapeBlock = await blocksToAdvanceHardhat(79, 100, ethers.provider);
    await advanceBlocksHardhat(nextEscapeBlock, ethers.provider);

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
    await rollupProcessor.depositPendingFunds(inputAssetId, depositAmount, undefined, {
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
      // Use a small chunk size to test offchain chunking.
      const txs = await rollupProcessor.createRollupTxs(proofData, signatures, offchainTxData, 300);
      await rollupProcessor.sendRollupTxs(txs);
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

  it('check getters', async () => {
    expect((await rollupProcessor.getSupportedAssets()).length).toBe(await rollupProcessor.getSupportedAssetsLength());

    expect((await rollupProcessor.getSupportedBridges()).length).toBe(
      await rollupProcessor.getSupportedBridgesLength(),
    );

    expect((await rollupProcessor.defiInteractionHashes()).length).toBe(
      await rollupProcessor.getDefiInteractionHashesLength(),
    );

    expect((await rollupProcessor.asyncDefiInteractionHashes()).length).toBe(
      await rollupProcessor.getAsyncDefiInteractionHashesLength(),
    );

    expect(await rollupProcessor.getPendingDefiInteractionHashesLength()).toBe(
      (await rollupProcessor.getAsyncDefiInteractionHashesLength()) +
        (await rollupProcessor.getDefiInteractionHashesLength()),
    );
  });
});
