import { Contract } from '@ethersproject/contracts';
import { EthAddress } from '@aztec/barretenberg/address';
import { AssetId } from '@aztec/barretenberg/asset';
import { Asset } from '@aztec/barretenberg/blockchain';
import { WorldStateConstants } from '@aztec/barretenberg/world_state';
import { ethers } from 'hardhat';
import { RollupProcessor } from './rollup_processor';
import { setupRollupProcessor } from './fixtures/setup_rollup_processor';
import { FeeDistributor } from '../fee_distributor';
import { Signer } from 'ethers';
import { randomBytes } from 'crypto';
import {
  createDepositProof,
  createRollupProof,
  createSendProof,
  createWithdrawProof,
  DefiInteractionData,
} from './fixtures/create_mock_proof';
import { Web3Signer } from '../../signer';
import { EthersAdapter } from '../../provider';
import { advanceBlocks, blocksToAdvance } from './fixtures/advance_block';
import { deployMockDefiBridge } from './fixtures/setup_defi_bridges';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { RollupProofData } from '@aztec/barretenberg/rollup_proof';
import { DefiInteractionNote, packInteractionNotes } from '@aztec/barretenberg/note_algorithms';
import { toBigIntBE } from '@aztec/barretenberg/bigint_buffer';

describe('rollup_processor', () => {
  const ethereumProvider = new EthersAdapter(ethers.provider);
  let feeDistributor: FeeDistributor;
  let rollupProcessor: RollupProcessor;
  let signers: Signer[];
  let addresses: EthAddress[];
  let weth: Contract;
  let assets: Asset[];

  beforeEach(async () => {
    signers = await ethers.getSigners();
    addresses = await Promise.all(signers.map(async u => EthAddress.fromString(await u.getAddress())));
    ({ rollupProcessor, feeDistributor, assets, weth } = await setupRollupProcessor(signers, 1));
  });

  it('should get contract status', async () => {
    expect(rollupProcessor.address).toEqual(rollupProcessor.address);
    expect(await rollupProcessor.feeDistributor()).toEqual(feeDistributor.address);
    expect(await rollupProcessor.numberOfAssets()).toBe(16);
    expect(await rollupProcessor.numberOfBridgeCalls()).toBe(4);
    expect(await rollupProcessor.nextRollupId()).toBe(0);
    expect(await rollupProcessor.dataSize()).toBe(0);
    expect(await rollupProcessor.dataRoot()).toEqual(WorldStateConstants.EMPTY_DATA_ROOT);
    expect(await rollupProcessor.nullRoot()).toEqual(WorldStateConstants.EMPTY_NULL_ROOT);
    expect(await rollupProcessor.rootRoot()).toEqual(WorldStateConstants.EMPTY_ROOT_ROOT);
    expect(await rollupProcessor.defiRoot()).toEqual(WorldStateConstants.EMPTY_DEFI_ROOT);
    expect(await rollupProcessor.defiInteractionHash()).toEqual(WorldStateConstants.INITIAL_INTERACTION_HASH);
    expect(await rollupProcessor.totalDeposited()).toEqual([0n, 0n]);
    expect(await rollupProcessor.totalWithdrawn()).toEqual([0n, 0n]);
    expect(await rollupProcessor.totalFees()).toEqual([0n, 0n]);
    expect(await rollupProcessor.totalPendingDeposit()).toEqual([0n, 0n]);
    expect(await rollupProcessor.weth()).toEqual(EthAddress.fromString(weth.address));
    expect(await rollupProcessor.getSupportedAssets()).toEqual(assets.map(a => a.getStaticInfo().address));
    expect(await rollupProcessor.getEscapeHatchStatus()).toEqual({ escapeOpen: true, blocksRemaining: 20 });
  });

  it('should get supported asset', async () => {
    const supportedAssetAAddress = await rollupProcessor.getSupportedAsset(1);
    expect(supportedAssetAAddress).toEqual(assets[1].getStaticInfo().address);
  });

  it('should set new supported asset', async () => {
    const assetAddr = EthAddress.randomAddress();
    const txHash = await rollupProcessor.setSupportedAsset(assetAddr, false);

    // Check event was emitted.
    const receipt = await ethers.provider.getTransactionReceipt(txHash.toString());
    const assetBId = rollupProcessor.contract.interface.parseLog(receipt.logs[receipt.logs.length - 1]).args.assetId;
    const assetBAddress = rollupProcessor.contract.interface.parseLog(receipt.logs[receipt.logs.length - 1]).args
      .assetAddress;
    expect(assetBId.toNumber()).toBe(2);
    expect(assetBAddress).toBe(assetAddr.toString());

    const supportedAssetBAddress = await rollupProcessor.getSupportedAsset(2);
    expect(supportedAssetBAddress).toEqual(assetAddr);
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
    expect(await rollupProcessor.getAssetPermitSupport(AssetId.ETH)).toBe(false);
    expect(await rollupProcessor.getAssetPermitSupport(AssetId.DAI)).toBe(true);
  });

  it('should allow any address to use escape hatch', async () => {
    const { proofData } = await createRollupProof(signers[0], createSendProof());
    const tx = await rollupProcessor.createEscapeHatchProofTx(proofData, [], []);
    await rollupProcessor.sendTx(tx);
  });

  it('should reject a rollup from an unknown provider', async () => {
    const { proofData, signatures, providerSignature, viewingKeys } = await createRollupProof(
      signers[0],
      createSendProof(),
      { feeDistributorAddress: feeDistributor.address },
    );
    const tx = await rollupProcessor.createRollupProofTx(
      proofData,
      signatures,
      viewingKeys,
      providerSignature,
      addresses[1],
      addresses[0],
    );
    await expect(rollupProcessor.sendTx(tx)).rejects.toThrow('UNKNOWN_PROVIDER');
  });

  it('should reject a rollup with a bad provider signature', async () => {
    const { proofData, signatures, viewingKeys, sigData } = await createRollupProof(signers[0], createSendProof(), {
      feeDistributorAddress: feeDistributor.address,
    });

    const providerSignature = await new Web3Signer(ethereumProvider).signMessage(sigData, addresses[1]);

    const tx = await rollupProcessor.createRollupProofTx(
      proofData,
      signatures,
      viewingKeys,
      providerSignature,
      addresses[0],
      addresses[0],
    );
    await expect(rollupProcessor.sendTx(tx)).rejects.toThrow('validateSignature: INVALID_SIGNATURE');
  });

  it('should allow the owner to change the verifier address', async () => {
    await rollupProcessor.setVerifier(EthAddress.randomAddress());
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

  it('should reject escape hatch outside valid block window', async () => {
    const { proofData, viewingKeys } = await createRollupProof(signers[1], createSendProof());
    const escapeBlock = await blocksToAdvance(0, 100, ethers.provider);
    await advanceBlocks(escapeBlock, ethers.provider);
    const tx = await rollupProcessor.createEscapeHatchProofTx(proofData, viewingKeys, []);
    await expect(rollupProcessor.sendTx(tx, { signingAddress: addresses[1] })).rejects.toThrow(
      'Rollup Processor: ESCAPE_BLOCK_RANGE_INCORRECT',
    );
  });

  it('should get specified blocks', async () => {
    const bridge = await deployMockDefiBridge(
      signers[0],
      1,
      await rollupProcessor.weth(),
      assets[AssetId.DAI].getStaticInfo().address,
      EthAddress.ZERO,
      0n,
      2n,
      0n,
      true,
      10n,
    );
    const bridgeId = new BridgeId(EthAddress.fromString(bridge.address), 1, AssetId.ETH, AssetId.DAI, 0);
    const numberOfBridgeCalls = RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK;

    // Top up rollup processor to transfer eth to defi bridges.
    await assets[0].transfer(10n, addresses[0], rollupProcessor.address);

    const depositAmount = 30n;
    const withdrawalAmount = 10n;
    const userAAddress = addresses[1];
    const userA = signers[1];

    // Rollup block 0.
    {
      const { proofData, signatures } = await createRollupProof(
        signers[0],
        await createDepositProof(depositAmount, userAAddress, userA, AssetId.DAI),
      );
      await assets[AssetId.DAI].approve(depositAmount, userAAddress, rollupProcessor.address);
      await rollupProcessor.depositPendingFunds(AssetId.DAI, depositAmount, undefined, {
        signingAddress: userAAddress,
      });
      const tx = await rollupProcessor.createEscapeHatchProofTx(proofData, [], signatures);
      await rollupProcessor.sendTx(tx);
    }

    // Rollup block 1.
    {
      const { proofData } = await createRollupProof(
        signers[0],
        createWithdrawProof(withdrawalAmount, userAAddress, AssetId.DAI),
        {
          rollupId: 1,
          defiInteractionData: [new DefiInteractionData(bridgeId, 1n), new DefiInteractionData(bridgeId, 1n)],
        },
      );
      const tx = await rollupProcessor.createEscapeHatchProofTx(proofData, [], []);
      await rollupProcessor.sendTx(tx);
    }

    const interactionResult0 = [
      new DefiInteractionNote(bridgeId, 4, 1n, 2n, 0n, true),
      new DefiInteractionNote(bridgeId, 5, 1n, 2n, 0n, true),
    ];

    // Rollup block 2.
    {
      const { proofData } = await createRollupProof(signers[0], createSendProof(AssetId.ETH), {
        rollupId: 2,
        previousDefiInteractionHash: packInteractionNotes(interactionResult0, numberOfBridgeCalls),
        defiInteractionData: [new DefiInteractionData(bridgeId, 1n)],
      });
      const tx = await rollupProcessor.createEscapeHatchProofTx(proofData, [], []);
      await rollupProcessor.sendTx(tx);
    }

    const rollupIdStart = 0;
    const blocks = await rollupProcessor.getRollupBlocksFrom(rollupIdStart, 1);
    expect(blocks.length).toBe(3);

    {
      const block = blocks[0];
      const rollup = RollupProofData.fromBuffer(block.rollupProofData, block.viewingKeysData);
      expect(block.rollupSize).toBe(2);
      expect(block.interactionResult.length).toBe(0);
      expect(rollup.rollupId).toBe(0);
      expect(rollup.dataStartIndex).toBe(0);
      expect(toBigIntBE(rollup.innerProofData[0].publicInput)).toBe(depositAmount);
      expect(toBigIntBE(rollup.innerProofData[0].publicOutput)).toBe(0n);
      expect(rollup.innerProofData[0].inputOwner.toString('hex')).toBe(userAAddress.toBuffer32().toString('hex'));
    }

    {
      const block = blocks[1];
      const rollup = RollupProofData.fromBuffer(block.rollupProofData, block.viewingKeysData);
      expect(block.rollupSize).toBe(2);
      expect(block.interactionResult.length).toBe(2);
      expect(block.interactionResult[0].equals(interactionResult0[0])).toBe(true);
      expect(block.interactionResult[1].equals(interactionResult0[1])).toBe(true);
      expect(rollup.rollupId).toBe(1);
      expect(rollup.dataStartIndex).toBe(4);
      expect(toBigIntBE(rollup.innerProofData[0].publicInput)).toBe(0n);
      expect(toBigIntBE(rollup.innerProofData[0].publicOutput)).toBe(withdrawalAmount);
      expect(rollup.innerProofData[0].outputOwner.toString('hex')).toBe(userAAddress.toBuffer32().toString('hex'));
    }

    {
      const interactionResult = new DefiInteractionNote(bridgeId, numberOfBridgeCalls * 2, 1n, 2n, 0n, true);
      const block = blocks[2];
      const rollup = RollupProofData.fromBuffer(block.rollupProofData, block.viewingKeysData);
      expect(block.rollupSize).toBe(2);
      expect(block.interactionResult.length).toBe(1);
      expect(block.interactionResult[0].equals(interactionResult)).toBe(true);
      expect(rollup.rollupId).toBe(2);
      expect(rollup.dataStartIndex).toBe(8);
      expect(toBigIntBE(rollup.innerProofData[0].publicInput)).toBe(0n);
      expect(toBigIntBE(rollup.innerProofData[0].publicOutput)).toBe(0n);
    }
  });
});
