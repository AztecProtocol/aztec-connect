import { ethers } from '@nomiclabs/buidler';
import { expect, use } from 'chai';
import { solidity } from 'ethereum-waffle';
import { Contract } from 'ethers';
import sinon from 'sinon';
import { EthereumBlockchain } from '../src/ethereum_blockchain';
import { createDepositProof, createWithdrawProof } from './fixtures/create_proof';

import { Blockchain } from '../src/blockchain';

use(solidity);

async function wait(ms: number) {
  return new Promise(placeHolder => setTimeout(placeHolder, ms));
}

async function createWaitOnBlockProcessed(blockchain: Blockchain) {
  return new Promise((resolve, reject) => {
    blockchain.on('block', resolve);
  });
}

describe('ethereum_blockchain', () => {
  let rollupProcessor!: Contract;
  let erc20!: Contract;
  let ethereumBlockchain!: EthereumBlockchain;
  let userAAddress!: string;
  let userBAddress!: string;

  const mintAmount = 100;
  const scalingFactor = 1;
  const depositAmount = 30;
  const withdrawalAmount = 10;
  const viewingKeys = [Buffer.alloc(176, 1), Buffer.alloc(176, 2)];
  let waitOnBlockProcessed: any;

  const rollupSize = 2;

  beforeEach(async () => {
    const [userA, userB] = await ethers.getSigners();
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

  describe('Success states', async () => {
    it.only('should emit new blocks as events', async () => {
      const proofData = createDepositProof(depositAmount, userAAddress);
      const spy = sinon.spy();
      ethereumBlockchain.on('block', spy);

      await erc20.approve(rollupProcessor.address, depositAmount);
      await ethereumBlockchain.sendProof(proofData, viewingKeys, rollupSize);
      await waitOnBlockProcessed;

      const numBlockEvents = spy.callCount;
      expect(numBlockEvents).to.equal(1);
      const blockEvent = spy.getCall(0);

      expect(blockEvent.args[0].rollupId).to.equal(0);
      expect(blockEvent.args[0].dataStartIndex).to.equal(0);
      expect(blockEvent.args[0].numDataEntries).to.equal(4);
      expect(blockEvent.args[0].viewingKeys).to.deep.equal(viewingKeys);

      ethereumBlockchain.off('block', spy);
    });

    it.only('should get specified blocks', async () => {
      const proofData1 = createDepositProof(depositAmount, userAAddress);
      const proofData2 = createWithdrawProof(withdrawalAmount, userAAddress);

      await erc20.approve(rollupProcessor.address, depositAmount);
      await ethereumBlockchain.sendProof(proofData1, viewingKeys, rollupSize);
      await wait(1000);

      await erc20.approve(rollupProcessor.address, depositAmount);
      await ethereumBlockchain.sendProof(proofData2, viewingKeys, rollupSize);
      await wait(1000);

      const blockNumStart = 0;
      const blocks = await ethereumBlockchain.getBlocks(blockNumStart);

      const dataStart = 288 + 64;
      const nullifierStart = dataStart + 64 * 2 + 16;
      expect(blocks[0].rollupId).to.equal(0);
      expect(blocks[0].dataStartIndex).to.equal(0);
      expect(blocks[0].numDataEntries).to.equal(4);
      expect(blocks[0].dataEntries).to.deep.equal([
        proofData1.slice(dataStart, dataStart + 64),
        proofData1.slice(dataStart + 64, dataStart + 64 * 2),
      ]);
      expect(blocks[0].nullifiers).to.deep.equal([
        proofData1.slice(nullifierStart, nullifierStart + 16),
        proofData1.slice(nullifierStart + 32, nullifierStart + 32 + 16),
      ]);
      expect(blocks[0].viewingKeys).to.deep.equal(viewingKeys);

      expect(blocks[1].rollupId).to.equal(1);
      expect(blocks[1].dataStartIndex).to.equal(4);
      expect(blocks[1].numDataEntries).to.equal(4);
      expect(blocks[1].dataEntries).to.deep.equal([
        proofData2.slice(dataStart, dataStart + 64),
        proofData2.slice(dataStart + 64, dataStart + 64 * 2),
      ]);
      expect(blocks[1].nullifiers).to.deep.equal([
        proofData2.slice(nullifierStart, nullifierStart + 16),
        proofData2.slice(nullifierStart + 32, nullifierStart + 32 + 16),
      ]);
      expect(blocks[1].viewingKeys).to.deep.equal(viewingKeys);
    });

    it('should send a proof on-chain', async () => {
      const proofData = createDepositProof(depositAmount, userAAddress);
      await erc20.approve(rollupProcessor.address, depositAmount);

      const txHash = await ethereumBlockchain.sendProof(proofData, viewingKeys, rollupSize);
      expect(txHash).to.not.equal(undefined);
    });

    it('should getTransactionReceipt()', async () => {
      const proofData = createDepositProof(depositAmount, userAAddress);
      await erc20.approve(rollupProcessor.address, depositAmount);
      const txHash = await ethereumBlockchain.sendProof(proofData, viewingKeys, rollupSize);
      const receipt = await ethereumBlockchain.getTransactionReceipt(txHash);
      expect(receipt).to.not.equal(undefined);
    });
  });
});
