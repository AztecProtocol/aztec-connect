import { EthAddress } from 'barretenberg/address';
import { expect, use } from 'chai';
import { solidity } from 'ethereum-waffle';
import { Contract, Signer } from 'ethers';
import { ethers } from 'hardhat';
import {
  createDepositProof,
  createRollupProof,
  createTwoDepositsProof,
  createWithdrawProof,
  numToBuffer,
} from '../fixtures/create_mock_proof';
import { setupRollupProcessor } from '../fixtures/setup_rollup_processor';
import { solidityFormatSignatures } from '../signing/solidity_format_sigs';

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

  const mintAmount = 100;
  const userADepositAmount = 60;
  const userBDepositAmount = 15;

  beforeEach(async () => {
    [userA, userB, rollupProvider] = await ethers.getSigners();
    userAAddress = EthAddress.fromString(await userA.getAddress());
    userBAddress = EthAddress.fromString(await userB.getAddress());
    ({ erc20: erc20A, rollupProcessor } = await setupRollupProcessor(rollupProvider, [userA, userB], mintAmount));

    // set new erc20
    const ERC20B = await ethers.getContractFactory('ERC20Mintable');
    erc20B = await ERC20B.deploy();
    await erc20B.mint(userBAddress.toString(), mintAmount);
  });

  it('should initialise state variables', async () => {
    const originalNumSupportedAssets = await rollupProcessor.getNumSupportedAssets();
    expect(originalNumSupportedAssets).to.equal(2);

    const supportedAssetAAddress = await rollupProcessor.getSupportedAssetAddress(1);
    expect(supportedAssetAAddress).to.equal(erc20A.address);

    // set new supported asset
    const tx = await rollupProcessor.setSupportedAsset(erc20B.address, false);
    const receipt = await tx.wait();

    const assetBId = rollupProcessor.interface.parseLog(receipt.logs[receipt.logs.length - 1]).args.assetId;
    const assetBAddress = rollupProcessor.interface.parseLog(receipt.logs[receipt.logs.length - 1]).args.assetAddress;
    expect(assetBId).to.equal(2);
    expect(assetBAddress).to.equal(erc20B.address);

    const supportedAssetBAddress = await rollupProcessor.getSupportedAssetAddress(2);
    expect(supportedAssetBAddress).to.equal(erc20B.address);

    const newNumSupportedAssets = await rollupProcessor.getNumSupportedAssets();
    expect(newNumSupportedAssets).to.equal(3);
  });

  it('should process asset A deposit tx and assetB deposit tx in one rollup', async () => {
    // set new supported asset
    await rollupProcessor.setSupportedAsset(erc20B.address, false);

    const fourViewingKeys = [Buffer.alloc(32, 1), Buffer.alloc(32, 2), Buffer.alloc(32, 3), Buffer.alloc(32, 4)];

    // deposit funds from userA and userB, from assetA and assetB respectively
    const assetAId = 1;
    const assetBId = 2;
    const { proofData, signatures, sigIndexes } = await createRollupProof(
      rollupProvider,
      await createTwoDepositsProof(
        userADepositAmount,
        userAAddress,
        userA,
        numToBuffer(assetAId),
        userBDepositAmount,
        userBAddress,
        userB,
        numToBuffer(assetBId),
      ),
    );

    await erc20A.approve(rollupProcessor.address, userADepositAmount);
    await erc20B.connect(userB).approve(rollupProcessor.address, userBDepositAmount);
    await rollupProcessor.connect(userA).depositPendingFunds(assetAId, userADepositAmount, userAAddress.toString());
    await rollupProcessor.connect(userB).depositPendingFunds(assetBId, userBDepositAmount, userBAddress.toString());

    await rollupProcessor.escapeHatch(
      proofData,
      solidityFormatSignatures(signatures),
      sigIndexes,
      Buffer.concat(fourViewingKeys),
    );

    const postDepositUserABalance = await erc20A.balanceOf(userAAddress.toString());
    expect(postDepositUserABalance).to.equal(mintAmount - userADepositAmount);

    const postDepositUserBBalance = await erc20B.balanceOf(userBAddress.toString());
    expect(postDepositUserBBalance).to.equal(mintAmount - userBDepositAmount);

    const postDepositContractBalanceA = await erc20A.balanceOf(rollupProcessor.address);
    expect(postDepositContractBalanceA).to.equal(userADepositAmount);

    const postDepositContractBalanceB = await erc20B.balanceOf(rollupProcessor.address);
    expect(postDepositContractBalanceB).to.equal(userBDepositAmount);
  });

  it('should not revert if withdraw() fails due to faulty ERC20 contract', async () => {
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
    const { proofData, signatures, sigIndexes } = await createRollupProof(
      rollupProvider,
      await createDepositProof(userBDepositAmount, userBAddress, userB, faultyERC20Id),
    );

    await faultyERC20.approve(rollupProcessor.address, userBDepositAmount);
    await faultyERC20.connect(userB).approve(rollupProcessor.address, userBDepositAmount);
    await rollupProcessor
      .connect(userB)
      .depositPendingFunds(faultyERC20Id, userBDepositAmount, userBAddress.toString());
    await rollupProcessor.escapeHatch(
      proofData,
      solidityFormatSignatures(signatures),
      sigIndexes,
      Buffer.concat(fourViewingKeys),
    );

    // withdraw funds to userB - this is not expected to perform a transfer (as the ERC20 is faulty)
    // so we don't expect the withdraw funds to be transferred, and expect an error event emission
    const withdrawAmount = 5;
    const { proofData: withdrawProofData } = await createRollupProof(
      rollupProvider,
      await createWithdrawProof(withdrawAmount, userBAddress, faultyERC20Id),
      {
        rollupId: 1,
      },
    );
    const withdrawTx = await rollupProcessor.escapeHatch(withdrawProofData, [], [], Buffer.concat(fourViewingKeys));

    const rollupReceipt = await withdrawTx.wait();
    expect(receipt.status).to.equal(1);

    const errorReason = rollupProcessor.interface.parseLog(rollupReceipt.logs[rollupReceipt.logs.length - 1]).args
      .errorReason;
    expect(errorReason.length).to.be.greaterThan(0);

    const userBFinalBalance = await faultyERC20.balanceOf(userBAddress.toString());
    // not expecting withdraw to have transferred funds
    expect(userBFinalBalance).to.equal(mintAmount - userBDepositAmount);

    const rollupFinalBalance = await faultyERC20.balanceOf(rollupProcessor.address);
    expect(rollupFinalBalance).to.equal(userBDepositAmount);
  });
});
