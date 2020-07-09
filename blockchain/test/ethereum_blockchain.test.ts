import { ethers } from '@nomiclabs/buidler';
import { expect, use } from 'chai';
import { solidity } from 'ethereum-waffle';
import { Contract, Signer } from 'ethers';
import sinon from 'sinon';
import { Blockchain } from '../src/blockchain';
import { EthereumBlockchain } from '../src/ethereum_blockchain';
import { createDepositProof, createSendProof, createWithdrawProof } from './fixtures/create_mock_proof';

use(solidity);

async function createWaitOnBlockProcessed(blockchain: Blockchain) {
  return new Promise(resolve => {
    blockchain.on('block', resolve);
  });
}

describe('ethereum_blockchain', () => {
  let rollupProcessor: Contract;
  let erc20: Contract;
  let ethereumBlockchain!: EthereumBlockchain;
  let userA: Signer;
  let userB: Signer;
  let userAAddress: string;
  let userBAddress: string;

  const mintAmount = 100;
  const scalingFactor = 1;
  const depositAmount = 30;
  const withdrawalAmount = 10;
  const viewingKeys = [Buffer.alloc(176, 1), Buffer.alloc(176, 2)];
  let waitOnBlockProcessed: any;

  const rollupSize = 2;

  beforeEach(async () => {
    [userA, userB] = await ethers.getSigners();
    userAAddress = await userA.getAddress();
    userBAddress = await userB.getAddress();

    const ERC20 = await ethers.getContractFactory('ERC20Mintable');
    erc20 = await ERC20.deploy();

    const RollupProcessor = await ethers.getContractFactory('RollupProcessor');
    rollupProcessor = await RollupProcessor.deploy(erc20.address, scalingFactor);
    await erc20.mint(userAAddress, mintAmount);

    ethereumBlockchain = new EthereumBlockchain(userA, rollupProcessor.address);
    await ethereumBlockchain.start();
    waitOnBlockProcessed = createWaitOnBlockProcessed(ethereumBlockchain);
  });

  afterEach(async () => {
    ethereumBlockchain.stop();
  });

  it('should process a deposit proof', async () => {
    const { proofData, signatures, sigIndexes } = await createDepositProof(depositAmount, userAAddress, userA);
    await erc20.approve(rollupProcessor.address, depositAmount);
    const txHash = await ethereumBlockchain.sendProof(proofData, signatures, sigIndexes, viewingKeys, rollupSize);
    expect(txHash).to.have.lengthOf(32);
    const receipt = await ethereumBlockchain.getTransactionReceipt(txHash);
    expect(receipt.blockNum).to.be.above(0);
  });

  it('should process send proof', async () => {
    const { proofData } = await createSendProof();
    const txHash = await ethereumBlockchain.sendProof(proofData, [], [], viewingKeys, rollupSize);
    expect(txHash).to.have.lengthOf(32);
    const receipt = await ethereumBlockchain.getTransactionReceipt(txHash);
    expect(receipt.blockNum).to.be.above(0);
  });

  it('should process withdraw proof', async () => {
    const {
      proofData: depositProofData,
      signatures: depositSignatures,
      sigIndexes: depositSigIndexes,
    } = await createDepositProof(depositAmount, userAAddress, userA);
    await erc20.approve(rollupProcessor.address, depositAmount);
    const depositTxHash = await ethereumBlockchain.sendProof(
      depositProofData,
      depositSignatures,
      depositSigIndexes,
      viewingKeys,
      rollupSize,
    );
    await waitOnBlockProcessed;

    expect(depositTxHash).to.have.lengthOf(32);
    const depositReceipt = await ethereumBlockchain.getTransactionReceipt(depositTxHash);
    expect(depositReceipt.blockNum).to.be.above(0);

    const {
      proofData: withdrawProofData,
      signatures: withdrawalSignatures,
      sigIndexes: withdrawSigIndexes,
    } = await createWithdrawProof(withdrawalAmount, userAAddress);
    await erc20.approve(rollupProcessor.address, depositAmount);
    const withdrawTxHash = await ethereumBlockchain.sendProof(
      withdrawProofData,
      withdrawalSignatures,
      withdrawSigIndexes,
      viewingKeys,
      rollupSize,
    );
    await waitOnBlockProcessed;
    expect(withdrawTxHash).to.have.lengthOf(32);
    const withdrawReceipt = await ethereumBlockchain.getTransactionReceipt(withdrawTxHash);
    expect(withdrawReceipt.blockNum).to.be.above(0);
  });

  it('should emit new blocks as events', async () => {
    const spy = sinon.spy();
    const { proofData, signatures, sigIndexes } = await createDepositProof(depositAmount, userAAddress, userA);
    ethereumBlockchain.on('block', spy);

    await erc20.approve(rollupProcessor.address, depositAmount);
    await ethereumBlockchain.sendProof(proofData, signatures, sigIndexes, viewingKeys, rollupSize);
    await waitOnBlockProcessed;

    const numBlockEvents = spy.callCount;
    expect(numBlockEvents).to.equal(1);

    const blockEvent = spy.getCall(0);
    expect(blockEvent.args[0].rollupId).to.equal(0);
    expect(blockEvent.args[0].blockNum).to.be.above(0);
    expect(blockEvent.args[0].txHash).to.have.lengthOf(32);
    expect(blockEvent.args[0].dataStartIndex).to.equal(0);
    expect(blockEvent.args[0].numDataEntries).to.equal(4);
    expect(blockEvent.args[0].dataEntries).to.have.lengthOf(2);
    expect(blockEvent.args[0].nullifiers).to.have.lengthOf(2);
    expect(blockEvent.args[0].viewingKeys).to.deep.equal(viewingKeys);
    ethereumBlockchain.off('block', spy);
  });

  it('should get specified blocks', async () => {
    const {
      proofData: depositProofData,
      signatures: depositSignatures,
      sigIndexes: depositSigIndexes,
    } = await createDepositProof(depositAmount, userAAddress, userA);
    await erc20.approve(rollupProcessor.address, depositAmount);
    await ethereumBlockchain.sendProof(depositProofData, depositSignatures, depositSigIndexes, viewingKeys, rollupSize);
    await waitOnBlockProcessed;

    const {
      proofData: withdrawProofData,
      signatures: withdrawalSignatures,
      sigIndexes: withdrawSigIndexes,
    } = await createWithdrawProof(withdrawalAmount, userAAddress);
    await erc20.approve(rollupProcessor.address, depositAmount);
    await ethereumBlockchain.sendProof(
      withdrawProofData,
      withdrawalSignatures,
      withdrawSigIndexes,
      viewingKeys,
      rollupSize,
    );
    await waitOnBlockProcessed;

    const blockNumStart = 0;
    const blocks = await ethereumBlockchain.getBlocks(blockNumStart);

    const dataStart = 288 + 64;
    const nullifierStart = dataStart + 64 * 2 + 16;
    expect(blocks[0].rollupId).to.equal(0);
    expect(blocks[0].blockNum).to.be.above(0);
    expect(blocks[0].txHash).to.have.lengthOf(32);
    expect(blocks[0].dataStartIndex).to.equal(0);
    expect(blocks[0].numDataEntries).to.equal(4);
    expect(blocks[0].dataEntries).to.deep.equal([
      depositProofData.slice(dataStart, dataStart + 64),
      depositProofData.slice(dataStart + 64, dataStart + 64 * 2),
    ]);
    expect(blocks[0].nullifiers).to.deep.equal([
      depositProofData.slice(nullifierStart, nullifierStart + 16),
      depositProofData.slice(nullifierStart + 32, nullifierStart + 32 + 16),
    ]);
    expect(blocks[0].viewingKeys).to.deep.equal(viewingKeys);

    expect(blocks[1].rollupId).to.equal(1);
    expect(blocks[1].blockNum).to.be.above(0);
    expect(blocks[1].txHash).to.have.lengthOf(32);
    expect(blocks[1].dataStartIndex).to.equal(4);
    expect(blocks[1].numDataEntries).to.equal(4);
    expect(blocks[1].dataEntries).to.deep.equal([
      withdrawProofData.slice(dataStart, dataStart + 64),
      withdrawProofData.slice(dataStart + 64, dataStart + 64 * 2),
    ]);
    expect(blocks[1].nullifiers).to.deep.equal([
      withdrawProofData.slice(nullifierStart, nullifierStart + 16),
      withdrawProofData.slice(nullifierStart + 32, nullifierStart + 32 + 16),
    ]);
    expect(blocks[1].viewingKeys).to.deep.equal(viewingKeys);
  });

  it('should reject sending proof if depositor has insufficient approval ', async () => {
    const { proofData, signatures, sigIndexes } = await createDepositProof(depositAmount, userAAddress, userA);

    // no erc20 approval
    await expect(
      ethereumBlockchain.sendProof(proofData, signatures, sigIndexes, viewingKeys, rollupSize),
    ).to.be.revertedWith('Rollup Processor: INSUFFICIENT_TOKEN_APPROVAL');
  });
});
