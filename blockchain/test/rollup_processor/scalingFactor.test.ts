import { ethers } from '@nomiclabs/buidler';
import { expect, use } from 'chai';
import { randomBytes } from 'crypto';
import { solidity } from 'ethereum-waffle';
import { Contract, Signer } from 'ethers';

import { createDepositProof, createWithdrawProof } from '../fixtures/create_mock_proof';
import { solidityFormatSignatures } from '../signingUtils/solidityFormatSigs';

use(solidity);

describe('rollup_processor: scaling factor', () => {
  let rollupProcessor: Contract;
  let erc20: Contract;
  let userA: Signer;
  let userAAddress: string;

  const depositAmount = 60;
  const withdrawalAmount = 50;
  const scalingFactor = 10000000000000000n;
  const mintAmount = 100n * scalingFactor;

  const viewingKeys = [Buffer.alloc(32, 1), Buffer.alloc(32, 2)];
  const rollupSize = 2;

  beforeEach(async () => {
    [userA] = await ethers.getSigners();
    userAAddress = await userA.getAddress();

    const ERC20 = await ethers.getContractFactory('ERC20Mintable');
    erc20 = await ERC20.deploy();

    const RollupProcessor = await ethers.getContractFactory('RollupProcessor');
    rollupProcessor = await RollupProcessor.deploy(erc20.address, scalingFactor);

    await erc20.mint(userAAddress, mintAmount);
  });

  it('should deposit correct num tokens multiplied by scaling factor', async () => {
    const initialUserBalance = await erc20.balanceOf(userAAddress);
    expect(initialUserBalance).to.equal(BigInt(mintAmount));

    const { proofData, signatures, sigIndexes } = await createDepositProof(depositAmount, userAAddress, userA);
    await erc20.approve(rollupProcessor.address, BigInt(depositAmount) * scalingFactor);
    await rollupProcessor.processRollup(
      proofData,
      solidityFormatSignatures(signatures),
      sigIndexes,
      viewingKeys,
      rollupSize,
    );

    const finalContractBalance = await erc20.balanceOf(rollupProcessor.address);
    expect(finalContractBalance).to.equal(BigInt(depositAmount) * scalingFactor);
    const finalUserBalance = await erc20.balanceOf(userAAddress);
    expect(finalUserBalance).to.equal(mintAmount - BigInt(depositAmount) * scalingFactor);
  });

  it('should withdraw correct num tokens multiplied by scaling factor', async () => {
    const {
      proofData: depositProof,
      signatures: depositSigs,
      sigIndexes: depositSigIndexes,
    } = await createDepositProof(depositAmount, userAAddress, userA);
    await erc20.approve(rollupProcessor.address, BigInt(depositAmount) * scalingFactor);
    await rollupProcessor.processRollup(
      depositProof,
      solidityFormatSignatures(depositSigs),
      depositSigIndexes,
      viewingKeys,
      rollupSize,
    );

    const {
      proofData: withdrawProof,
      signatures: withdrawSigs,
      sigIndexes: withdrawSigIndexes,
    } = await createWithdrawProof(withdrawalAmount, userAAddress);
    await rollupProcessor.processRollup(
      withdrawProof,
      solidityFormatSignatures(withdrawSigs),
      withdrawSigIndexes,
      viewingKeys,
      rollupSize,
    );

    const finalContractBalance = await erc20.balanceOf(rollupProcessor.address);
    expect(finalContractBalance).to.equal(
      BigInt(depositAmount) * scalingFactor - BigInt(withdrawalAmount) * scalingFactor,
    );

    const finalUserBalance = await erc20.balanceOf(userAAddress);
    expect(finalUserBalance).to.equal(
      mintAmount - BigInt(depositAmount) * scalingFactor + BigInt(withdrawalAmount) * scalingFactor,
    );
  });
});
