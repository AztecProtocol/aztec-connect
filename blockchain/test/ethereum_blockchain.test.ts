import { ethers } from '@nomiclabs/buidler';
import { EthAddress } from 'barretenberg/address';
import { RollupProofData } from 'barretenberg/rollup_proof';
import { expect, use } from 'chai';
import { randomBytes } from 'crypto';
import { solidity } from 'ethereum-waffle';
import { Contract, Signer } from 'ethers';
import sinon from 'sinon';
import { Blockchain } from '../src/blockchain';
import { EthereumBlockchain } from '../src/ethereum_blockchain';
import { createDepositProof, createSendProof, createWithdrawProof } from './fixtures/create_mock_proof';
import { createLowLevelPermitSig, signPermit } from './fixtures/create_permit_signature';
import { setupRollupProcessor } from './fixtures/setup_rollup_processor';

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
  let userAAddress: EthAddress;
  let viewingKeys: Buffer[];

  const mintAmount = 100;
  const depositAmount = 30;
  const withdrawalAmount = 10;
  let waitOnBlockProcessed: any;

  beforeEach(async () => {
    [userA, userB] = await ethers.getSigners();
    userAAddress = EthAddress.fromString(await userA.getAddress());
    ({ erc20, rollupProcessor, viewingKeys } = await setupRollupProcessor([userA, userB], mintAmount));

    ethereumBlockchain = await EthereumBlockchain.new(
      { signer: userA, networkOrHost: '', provider: userA.provider!, gasLimit: 5000000, console: false },
      EthAddress.fromString(rollupProcessor.address),
    );
    await ethereumBlockchain.start();
    waitOnBlockProcessed = createWaitOnBlockProcessed(ethereumBlockchain);
  });

  afterEach(async () => {
    ethereumBlockchain.stop();
  });

  it('should get status', async () => {
    const { rollupContractAddress, tokenContractAddresses } = await ethereumBlockchain.getStatus();
    expect(rollupContractAddress.toString().length).to.be.greaterThan(0);
    expect(tokenContractAddresses.length).to.be.greaterThan(0);
  });

  it('should set new supported asset', async () => {
    const newERC20 = await ethers.getContractFactory('ERC20Mintable');
    const newErc20 = await newERC20.deploy();
    await ethereumBlockchain.setSupportedAsset(EthAddress.fromString(newErc20.address), true);

    const supportedAssets = ethereumBlockchain.getTokenContractAddresses();
    expect(supportedAssets.length).to.equal(2);
    expect(supportedAssets[0].toString()).to.equal(erc20.address);
    expect(supportedAssets[1].toString()).to.equal(newErc20.address);

    const assetSupportsPermit = await ethereumBlockchain.getAssetPermitSupport(1);
    expect(assetSupportsPermit).to.equal(true);
  });

  it('should get user pending deposit', async () => {
    await erc20.approve(rollupProcessor.address, 50);
    await ethereumBlockchain.depositPendingFunds(0, BigInt(50), userAAddress);
    const pendingDeposit = await ethereumBlockchain.getUserPendingDeposit(0, userAAddress);
    expect(pendingDeposit).to.equal(50);
  });

  it('should validate user has deposited sufficient funds', async () => {
    await erc20.approve(rollupProcessor.address, depositAmount);
    await ethereumBlockchain.depositPendingFunds(0, BigInt(depositAmount), userAAddress);
    const sufficientDeposit = await ethereumBlockchain.validateDepositFunds(userAAddress, BigInt(depositAmount), 0);
    expect(sufficientDeposit).to.equal(true);
  });

  it('should get user nonce', async () => {
    const ERC20Permit = await ethers.getContractFactory('ERC20Permit');
    const erc20Permit = await ERC20Permit.deploy();
    await ethereumBlockchain.setSupportedAsset(EthAddress.fromString(erc20Permit.address), true);

    const nonce = await ethereumBlockchain.getUserNonce(1, userAAddress);
    expect(nonce).to.equal(BigInt(0));
  });

  it('should deposit funds via permit flow', async () => {
    const ERC20Permit = await ethers.getContractFactory('ERC20Permit');
    const erc20Permit = await ERC20Permit.deploy();
    await ethereumBlockchain.setSupportedAsset(EthAddress.fromString(erc20Permit.address), true);

    const privKey = randomBytes(32);
    const newUser = new ethers.Wallet(privKey, ethers.provider);
    const newUserAddress = await newUser.getAddress();
    await erc20Permit.mint(newUserAddress.toString(), 100);

    const deadline = BigInt('0xffffffff');
    const nonce = await erc20Permit.nonces(newUserAddress.toString());
    const name = await erc20Permit.name();
    const { v, r, s } = await signPermit(
      newUser,
      name,
      EthAddress.fromString(await newUser.getAddress()),
      EthAddress.fromString(rollupProcessor.address),
      BigInt(depositAmount),
      nonce,
      deadline,
      31337,
      EthAddress.fromString(erc20Permit.address),
    );

    const permitArgs = { deadline, approvalAmount: BigInt(depositAmount), signature: { v, r, s } };
    await ethereumBlockchain.depositPendingFunds(
      1,
      BigInt(depositAmount),
      EthAddress.fromString(newUserAddress),
      permitArgs,
    );
    const sufficientDeposit = await ethereumBlockchain.validateDepositFunds(
      EthAddress.fromString(newUserAddress),
      BigInt(depositAmount),
      1,
    );
    expect(sufficientDeposit).to.equal(true);

    const newNonce = await ethereumBlockchain.getUserNonce(1, EthAddress.fromString(newUserAddress));
    expect(newNonce).to.equal(BigInt(1));
  });

  it('should deposit via low level signature permit flow', async () => {
    const ERC20Permit = await ethers.getContractFactory('ERC20Permit');
    const erc20Permit = await ERC20Permit.deploy();
    await ethereumBlockchain.setSupportedAsset(EthAddress.fromString(erc20Permit.address), true);

    const privKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
    const newUser = new ethers.Wallet(privKey, ethers.provider);
    const newUserAddress = await newUser.getAddress();
    await erc20Permit.mint(newUserAddress.toString(), 100);

    const deadline = BigInt('0xffffffff');
    const nonce = await erc20Permit.nonces(newUserAddress.toString());
    const name = await erc20Permit.name();
    const { v, r, s } = await createLowLevelPermitSig(
      Buffer.from(newUser.privateKey.slice(2), 'hex'),
      EthAddress.fromString(newUserAddress),
      name,
      EthAddress.fromString(rollupProcessor.address),
      BigInt(depositAmount),
      nonce,
      deadline,
      31337,
      EthAddress.fromString(erc20Permit.address),
    );

    const permitArgs = { deadline, approvalAmount: BigInt(depositAmount), signature: { v, r, s } };

    await ethereumBlockchain.depositPendingFunds(
      1,
      BigInt(depositAmount),
      EthAddress.fromString(newUserAddress),
      permitArgs,
    );
    const sufficientDeposit = await ethereumBlockchain.validateDepositFunds(
      EthAddress.fromString(newUserAddress),
      BigInt(depositAmount),
      1,
    );
    expect(sufficientDeposit).to.equal(true);

    const newNonce = await ethereumBlockchain.getUserNonce(1, EthAddress.fromString(newUserAddress));
    expect(newNonce).to.equal(BigInt(1));
  });

  it('should process a deposit proof', async () => {
    const { proofData, signatures, sigIndexes } = await createDepositProof(depositAmount, userAAddress, userA);
    await erc20.approve(rollupProcessor.address, depositAmount);

    const depositTxHash = await ethereumBlockchain.depositPendingFunds(0, BigInt(depositAmount), userAAddress);
    expect(depositTxHash).to.have.lengthOf(32);
    const depositReceipt = await ethereumBlockchain.getTransactionReceipt(depositTxHash);
    expect(depositReceipt.blockNum).to.be.above(0);

    const txHash = await ethereumBlockchain.sendRollupProof(proofData, signatures, sigIndexes, viewingKeys);
    expect(txHash).to.have.lengthOf(32);
    const receipt = await ethereumBlockchain.getTransactionReceipt(txHash);
    expect(receipt.blockNum).to.be.above(depositReceipt.blockNum);
  });

  it('should process send proof', async () => {
    const { proofData } = await createSendProof();
    const txHash = await ethereumBlockchain.sendRollupProof(proofData, [], [], viewingKeys);
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
    await ethereumBlockchain.depositPendingFunds(0, BigInt(depositAmount), userAAddress);
    const depositTxHash = await ethereumBlockchain.sendRollupProof(
      depositProofData,
      depositSignatures,
      depositSigIndexes,
      viewingKeys,
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
    const withdrawTxHash = await ethereumBlockchain.sendRollupProof(
      withdrawProofData,
      withdrawalSignatures,
      withdrawSigIndexes,
      viewingKeys,
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
    await ethereumBlockchain.depositPendingFunds(0, BigInt(depositAmount), userAAddress);
    await ethereumBlockchain.sendRollupProof(proofData, signatures, sigIndexes, viewingKeys);
    await waitOnBlockProcessed;

    const numBlockEvents = spy.callCount;
    expect(numBlockEvents).to.equal(1);

    const blockEvent = spy.getCall(0);
    expect(blockEvent.args[0].txHash).to.have.lengthOf(32);
    expect(blockEvent.args[0].rollupSize).to.equal(2);
    expect(blockEvent.args[0].rollupProofData).to.deep.equal(proofData);
    expect(blockEvent.args[0].viewingKeysData).to.deep.equal(Buffer.concat(viewingKeys));
    ethereumBlockchain.off('block', spy);
  });

  it('should get specified blocks', async () => {
    const {
      proofData: depositProofData,
      signatures: depositSignatures,
      sigIndexes: depositSigIndexes,
    } = await createDepositProof(depositAmount, userAAddress, userA);
    await erc20.approve(rollupProcessor.address, depositAmount);
    await ethereumBlockchain.depositPendingFunds(0, BigInt(depositAmount), userAAddress);
    await ethereumBlockchain.sendRollupProof(depositProofData, depositSignatures, depositSigIndexes, viewingKeys);
    await waitOnBlockProcessed;

    const {
      proofData: withdrawProofData,
      signatures: withdrawalSignatures,
      sigIndexes: withdrawSigIndexes,
    } = await createWithdrawProof(withdrawalAmount, userAAddress);
    await erc20.approve(rollupProcessor.address, depositAmount);
    await ethereumBlockchain.sendRollupProof(withdrawProofData, withdrawalSignatures, withdrawSigIndexes, viewingKeys);
    await waitOnBlockProcessed;

    const rollupIdStart = 0;
    const blocks = await ethereumBlockchain.getBlocks(rollupIdStart);

    const rollup0 = RollupProofData.fromBuffer(blocks[0].rollupProofData, blocks[0].viewingKeysData);
    expect(blocks[0].txHash).to.have.lengthOf(32);
    expect(blocks[0].rollupSize).to.equal(2);
    expect(rollup0.rollupId).to.equal(0);
    expect(rollup0.dataStartIndex).to.equal(0);
    expect(rollup0.innerProofData[0].publicInput.readInt32BE(28)).to.equal(depositAmount);
    expect(rollup0.innerProofData[0].publicOutput.readInt32BE(28)).to.equal(0);
    expect(rollup0.innerProofData[0].inputOwner.toString()).to.equal(userAAddress.toString());

    const rollup1 = RollupProofData.fromBuffer(blocks[1].rollupProofData, blocks[1].viewingKeysData);
    expect(blocks[1].txHash).to.have.lengthOf(32);
    expect(blocks[1].rollupSize).to.equal(2);
    expect(rollup1.rollupId).to.equal(1);
    expect(rollup1.dataStartIndex).to.equal(4);
    expect(rollup1.innerProofData[0].publicInput.readInt32BE(28)).to.equal(0);
    expect(rollup1.innerProofData[0].publicOutput.readInt32BE(28)).to.equal(withdrawalAmount);
    expect(rollup1.innerProofData[0].outputOwner.toString()).to.equal(userAAddress.toString());
  });

  it('should reject sending proof if depositor has insufficient approval ', async () => {
    const { proofData, signatures, sigIndexes } = await createDepositProof(depositAmount, userAAddress, userA);

    // no erc20 approval
    await expect(ethereumBlockchain.sendRollupProof(proofData, signatures, sigIndexes, viewingKeys)).to.be.revertedWith(
      'Rollup Processor: INSUFFICIENT_DEPOSIT',
    );
  });
});
