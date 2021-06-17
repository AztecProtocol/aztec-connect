import { EthAddress } from '@aztec/barretenberg/address';
import { expect, use } from 'chai';
import { solidity } from 'ethereum-waffle';
import { Contract, Signer } from 'ethers';
import { ethers } from 'hardhat';
import { solidityFormatSignatures } from '../../src/solidity_format_signatures';
import {
  createDepositProof,
  createRollupProof,
  createWithdrawProof,
  mergeInnerProofs,
} from '../fixtures/create_mock_proof';
import { setupRollupProcessor } from '../fixtures/setup_rollup_processor';

use(solidity);

describe('rollup_processor: multi assets', () => {
  let rollupProcessor: Contract;
  let erc20A: Contract;
  let erc20B: Contract;
  let rollupProvider: Signer;
  let userA: Signer;
  let userB: Signer;
  let userAAddress: EthAddress;
  let userBAddress: EthAddress;
  let erc20AssetId: number;
  let ethAssetId: number;

  const mintAmount = 100n;
  const userADepositAmount = 60n;
  const userBDepositAmount = 15n;

  beforeEach(async () => {
    [userA, userB, rollupProvider] = await ethers.getSigners();
    userAAddress = EthAddress.fromString(await userA.getAddress());
    userBAddress = EthAddress.fromString(await userB.getAddress());
    ({ erc20: erc20A, erc20AssetId, ethAssetId, rollupProcessor } = await setupRollupProcessor(
      rollupProvider,
      [userA, userB],
      mintAmount,
    ));

    // set new erc20
    const ERC20B = await ethers.getContractFactory('ERC20Mintable');
    erc20B = await ERC20B.deploy();
    await erc20B.mint(userBAddress.toString(), mintAmount);
  });

  it('should initialise state variables', async () => {
    const supportedAssetAAddress = await rollupProcessor.getSupportedAsset(1);
    expect(supportedAssetAAddress).to.equal(erc20A.address);

    // set new supported asset
    const tx = await rollupProcessor.setSupportedAsset(erc20B.address, false);
    const receipt = await tx.wait();

    const assetBId = rollupProcessor.interface.parseLog(receipt.logs[receipt.logs.length - 1]).args.assetId;
    const assetBAddress = rollupProcessor.interface.parseLog(receipt.logs[receipt.logs.length - 1]).args.assetAddress;
    expect(assetBId).to.equal(2);
    expect(assetBAddress).to.equal(erc20B.address);

    const supportedAssetBAddress = await rollupProcessor.getSupportedAsset(2);
    expect(supportedAssetBAddress).to.equal(erc20B.address);
  });

  it('should revert if trying to set more assets than it is allowed', async () => {
    const maxAssets = 4;
    const existingAssets = await rollupProcessor.getSupportedAssets();
    for (let i = existingAssets.length + 1; i < maxAssets; ++i) {
      await rollupProcessor.setSupportedAsset(erc20B.address, false);
    }
    await expect(rollupProcessor.setSupportedAsset(erc20B.address, false)).to.be.revertedWith(
      'Rollup Processor: MAX_ASSET_REACHED',
    );
  });

  it('should process asset A deposit tx and assetB deposit tx in one rollup', async () => {
    // set new supported asset
    await rollupProcessor.setSupportedAsset(erc20B.address, false);

    const fourViewingKeys = [Buffer.alloc(32, 1), Buffer.alloc(32, 2), Buffer.alloc(32, 3), Buffer.alloc(32, 4)];

    // deposit funds from userA and userB, from assetA and assetB respectively
    const assetAId = 1;
    const assetBId = 2;
    const { proofData, signatures } = await createRollupProof(
      rollupProvider,
      mergeInnerProofs([
        await createDepositProof(userADepositAmount, userAAddress, userA, assetAId),
        await createDepositProof(userBDepositAmount, userBAddress, userB, assetBId),
      ]),
    );

    await erc20A.approve(rollupProcessor.address, userADepositAmount);
    await erc20B.connect(userB).approve(rollupProcessor.address, userBDepositAmount);
    await rollupProcessor.connect(userA).depositPendingFunds(assetAId, userADepositAmount, userAAddress.toString());
    await rollupProcessor.connect(userB).depositPendingFunds(assetBId, userBDepositAmount, userBAddress.toString());

    await rollupProcessor.escapeHatch(proofData, solidityFormatSignatures(signatures), Buffer.concat(fourViewingKeys));

    const postDepositUserABalance = await erc20A.balanceOf(userAAddress.toString());
    expect(postDepositUserABalance).to.equal(mintAmount - userADepositAmount);

    const postDepositUserBBalance = await erc20B.balanceOf(userBAddress.toString());
    expect(postDepositUserBBalance).to.equal(mintAmount - userBDepositAmount);

    const postDepositContractBalanceA = await erc20A.balanceOf(rollupProcessor.address);
    expect(postDepositContractBalanceA).to.equal(userADepositAmount);

    const postDepositContractBalanceB = await erc20B.balanceOf(rollupProcessor.address);
    expect(postDepositContractBalanceB).to.equal(userBDepositAmount);
  });

  it('should revert if withdraw() fails due to faulty ERC20 transfer', async () => {
    const FaultyERC20 = await ethers.getContractFactory('ERC20FaultyTransfer');
    const faultyERC20 = await FaultyERC20.deploy();
    await faultyERC20.mint(userBAddress.toString(), mintAmount);

    const tx = await rollupProcessor.setSupportedAsset(faultyERC20.address, false);
    const receipt = await tx.wait();
    const faultyERC20Id = Number(
      rollupProcessor.interface.parseLog(receipt.logs[receipt.logs.length - 1]).args.assetId,
    );

    // deposit funds from assetB
    const fourViewingKeys = [Buffer.alloc(32, 1), Buffer.alloc(32, 2), Buffer.alloc(32, 3), Buffer.alloc(32, 4)];
    const { proofData, signatures } = await createRollupProof(
      rollupProvider,
      await createDepositProof(userBDepositAmount, userBAddress, userB, faultyERC20Id),
    );

    await faultyERC20.approve(rollupProcessor.address, userBDepositAmount);
    await faultyERC20.connect(userB).approve(rollupProcessor.address, userBDepositAmount);
    await rollupProcessor
      .connect(userB)
      .depositPendingFunds(faultyERC20Id, userBDepositAmount, userBAddress.toString());
    await rollupProcessor.escapeHatch(proofData, solidityFormatSignatures(signatures), Buffer.concat(fourViewingKeys));

    // withdraw funds to userB - this is not expected to perform a transfer (as the ERC20 is faulty)
    // so we don't expect the withdraw funds to be transferred, and expect an error event emission
    const withdrawAmount = 5n;
    const { proofData: withdrawProofData } = await createRollupProof(
      rollupProvider,
      await createWithdrawProof(withdrawAmount, userBAddress, faultyERC20Id),
      {
        rollupId: 1,
      },
    );
    await expect(rollupProcessor.escapeHatch(withdrawProofData, [], Buffer.concat(fourViewingKeys))).to.be.reverted;
  });

  it('should revert for depositing eth with inconsistent value', async () => {
    await expect(
      rollupProcessor.depositPendingFunds(ethAssetId, 2, userAAddress.toString(), { value: 1 }),
    ).to.be.revertedWith('Rollup Processor: WRONG_AMOUNT');
  });

  it('should revert for depositing fund for an erc20 asset with non-zero value', async () => {
    await erc20A.approve(rollupProcessor.address, 1);
    await expect(
      rollupProcessor.depositPendingFunds(erc20AssetId, 1, userAAddress.toString(), { value: 1 }),
    ).to.be.revertedWith('Rollup Processor: WRONG_PAYMENT_TYPE');
  });

  it('should revert for depositing fund for an unknown asset', async () => {
    const unknownAssetId = 3;
    await expect(rollupProcessor.getSupportedAsset(unknownAssetId)).to.be.reverted;
    await expect(rollupProcessor.depositPendingFunds(unknownAssetId, 1, userAAddress.toString())).to.be.reverted;
  });
});
