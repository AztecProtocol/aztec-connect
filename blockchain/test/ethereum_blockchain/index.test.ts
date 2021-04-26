import { EthAddress } from 'barretenberg/address';
import { AssetId } from 'barretenberg/asset';
import { RollupProofData } from 'barretenberg/rollup_proof';
import { expect, use } from 'chai';
import { randomBytes } from 'crypto';
import { solidity } from 'ethereum-waffle';
import { Contract, Signer, Wallet } from 'ethers';
import { ethers, network } from 'hardhat';
import sinon from 'sinon';
import { Blockchain } from 'barretenberg/blockchain';
import { ClientEthereumBlockchain } from '../../src';
import { EthereumBlockchain } from '../../src/ethereum_blockchain';
import { EthersAdapter, WalletProvider } from '../../src/provider';
import {
  createDepositProof,
  createRollupProof,
  createSendProof,
  createWithdrawProof,
} from '../rollup_processor/fixtures/create_mock_proof';
import { createLowLevelPermitSig, signPermit } from '../rollup_processor/fixtures/create_permit_signature';
import { setupRollupProcessor } from '../rollup_processor/fixtures/setup_rollup_processor';
import { createPermitData } from '../../src/create_permit_data';
import { setupPriceFeeds } from './setup_price_feeds';

use(solidity);

async function createWaitOnBlockProcessed(blockchain: Blockchain) {
  return new Promise(resolve => {
    blockchain.on('block', resolve);
  });
}

describe('ethereum_blockchain', () => {
  let rollupProcessor: Contract;
  let feeDistributor: Contract;
  let erc20: Contract;
  let erc20UserA: Contract;
  let erc20Permit: Contract;
  let ethereumBlockchain!: EthereumBlockchain;
  let clientBlockchain!: ClientEthereumBlockchain;
  let rollupProvider: Signer;
  let rollupProviderAddress: EthAddress;
  let feeDistributorAddress: EthAddress;
  let priceFeedContracts: Contract[];
  let userA: Signer;
  let userB: Signer;
  let userAAddress: EthAddress;
  let userBAddress: EthAddress;
  let localUser: Wallet;
  let viewingKeys: Buffer[];
  let erc20AssetId: AssetId;
  let ethAssetId: AssetId;

  const mintAmount = 100;
  const depositAmount = 30;
  const withdrawalAmount = 10;
  const permitAssetId = 2;
  const initialPrices = [100n, 250n, 360n];
  let waitOnBlockProcessed: any;

  const sendRollupProof = async (
    proofData: Buffer,
    signatures: Buffer[],
    viewingKeys: Buffer[],
    providerSignature: Buffer,
    feeReceiver: EthAddress,
    feeLimit: bigint,
    providerAddress: EthAddress,
  ) => {
    const tx = await ethereumBlockchain.createRollupProofTx(
      proofData,
      signatures,
      viewingKeys,
      providerSignature,
      providerAddress,
      feeReceiver,
      feeLimit,
    );
    return ethereumBlockchain.sendTx(tx);
  };

  const sendEscapeHatchProof = async (
    proofData: Buffer,
    viewingKeys: Buffer[],
    depositSignature?: Buffer,
    signingAddress?: EthAddress,
  ) => {
    const tx = await ethereumBlockchain.createEscapeHatchProofTx(
      proofData,
      viewingKeys,
      depositSignature,
      signingAddress,
    );
    return ethereumBlockchain.sendTx(tx);
  };

  beforeEach(async () => {
    localUser = new Wallet(randomBytes(32));
    const provider = new WalletProvider(new EthersAdapter(network.provider));
    provider.addAccount(Buffer.from(localUser.privateKey.slice(2), 'hex'));

    [rollupProvider, userA, userB] = await ethers.getSigners();
    rollupProviderAddress = EthAddress.fromString(await rollupProvider.getAddress());

    await userA.sendTransaction({
      to: localUser.address,
      value: ethers.utils.parseEther('1'),
    });

    userAAddress = EthAddress.fromString(await userA.getAddress());
    userBAddress = EthAddress.fromString(await userB.getAddress());
    ({ erc20, rollupProcessor, feeDistributor, viewingKeys, erc20AssetId, ethAssetId } = await setupRollupProcessor(
      rollupProvider,
      [userA, userB],
      mintAmount,
    ));
    erc20UserA = erc20.connect(userA);
    feeDistributorAddress = EthAddress.fromString(feeDistributor.address);

    priceFeedContracts = await setupPriceFeeds(rollupProvider, initialPrices);

    ethereumBlockchain = await EthereumBlockchain.new(
      {
        gasLimit: 5000000,
        minConfirmation: 1,
        minConfirmationEHW: 1,
        console: false,
      },
      EthAddress.fromString(rollupProcessor.address),
      priceFeedContracts.map(contract => EthAddress.fromString(contract.address)),
      provider,
    );
    await ethereumBlockchain.start();
    waitOnBlockProcessed = createWaitOnBlockProcessed(ethereumBlockchain);

    const ERC20Permit = await ethers.getContractFactory('ERC20Permit');
    erc20Permit = await ERC20Permit.deploy();
    await erc20Permit.mint(localUser.address.toString(), 100);
    await ethereumBlockchain.setSupportedAsset(EthAddress.fromString(erc20Permit.address), true, rollupProviderAddress);

    const { assets } = await ethereumBlockchain.getBlockchainStatus();
    clientBlockchain = new ClientEthereumBlockchain(EthAddress.fromString(rollupProcessor.address), assets, provider);
  });

  afterEach(async () => {
    ethereumBlockchain.stop();
  });

  it('should get status', async () => {
    const { rollupContractAddress, assets } = await ethereumBlockchain.getBlockchainStatus();
    expect(rollupContractAddress.toString().length).to.be.greaterThan(0);
    expect(assets.length).to.be.greaterThan(0);
  });

  it('should set new supported asset', async () => {
    const newERC20 = await ethers.getContractFactory('ERC20Mintable');
    const newErc20 = await newERC20.deploy();
    const txHash = await ethereumBlockchain.setSupportedAsset(
      EthAddress.fromString(newErc20.address),
      true,
      rollupProviderAddress,
    );
    await ethereumBlockchain.getTransactionReceipt(txHash);

    const { assets } = await ethereumBlockchain.getBlockchainStatus(true);
    expect(assets.length).to.equal(4);
    expect(assets[1].address.toString()).to.equal(erc20.address);
    expect(assets[2].address.toString()).to.equal(erc20Permit.address);
    expect(assets[3].address.toString()).to.equal(newErc20.address);
    expect(assets[3].permitSupport).to.equal(true);
  });

  it('should get user pending deposit', async () => {
    expect(await ethereumBlockchain.getUserPendingDeposit(erc20AssetId, userAAddress)).to.equal(BigInt(0));

    const amount = BigInt(50);
    await erc20UserA.approve(rollupProcessor.address, amount);
    await clientBlockchain.depositPendingFunds(erc20AssetId, amount, userAAddress);
    expect(await ethereumBlockchain.getUserPendingDeposit(erc20AssetId, userAAddress)).to.equal(amount);

    const amount2 = BigInt(30);
    await erc20UserA.approve(rollupProcessor.address, amount2);
    await clientBlockchain.depositPendingFunds(erc20AssetId, amount2, userAAddress);
    expect(await ethereumBlockchain.getUserPendingDeposit(erc20AssetId, userAAddress)).to.equal(amount + amount2);
  });

  it('should approve a proof', async () => {
    const signingData = randomBytes(100);
    expect(await ethereumBlockchain.getUserProofApprovalStatus(userAAddress, signingData)).to.equal(false);
    expect(await ethereumBlockchain.getUserProofApprovalStatus(userBAddress, signingData)).to.equal(false);
    await clientBlockchain.approveProof(userBAddress, signingData);
    expect(await ethereumBlockchain.getUserProofApprovalStatus(userAAddress, signingData)).to.equal(false);
    expect(await ethereumBlockchain.getUserProofApprovalStatus(userBAddress, signingData)).to.equal(true);
  });

  it('should get user nonce', async () => {
    const nonce = await ethereumBlockchain.getAsset(permitAssetId).getUserNonce(userAAddress);
    expect(nonce).to.equal(BigInt(0));
  });

  it('should deposit funds via permit flow', async () => {
    const deadline = BigInt('0xffffffff');
    const localAddress = EthAddress.fromString(localUser.address);
    const nonce = await erc20Permit.nonces(localUser.address);
    const name = await erc20Permit.name();
    const permitData = createPermitData(
      name,
      localAddress,
      EthAddress.fromString(rollupProcessor.address),
      BigInt(depositAmount),
      nonce,
      deadline,
      31337,
      EthAddress.fromString(erc20Permit.address),
    );
    const signature = await signPermit(localUser, permitData);
    const permitArgs = { deadline, approvalAmount: BigInt(depositAmount), signature };
    await clientBlockchain.depositPendingFunds(permitAssetId, BigInt(depositAmount), localAddress, permitArgs);
    const deposited = await ethereumBlockchain.getUserPendingDeposit(permitAssetId, localAddress);
    expect(deposited).to.equal(BigInt(depositAmount));

    const newNonce = await ethereumBlockchain.getAsset(permitAssetId).getUserNonce(localAddress);
    expect(newNonce).to.equal(BigInt(1));
  });

  it('should deposit via low level signature permit flow', async () => {
    const deadline = BigInt('0xffffffff');
    const nonce = await erc20Permit.nonces(localUser.address.toString());
    const name = await erc20Permit.name();
    const localAddress = EthAddress.fromString(localUser.address);
    const { v, r, s } = await createLowLevelPermitSig(
      Buffer.from(localUser.privateKey.slice(2), 'hex'),
      localAddress,
      name,
      EthAddress.fromString(rollupProcessor.address),
      BigInt(depositAmount),
      nonce,
      deadline,
      31337,
      EthAddress.fromString(erc20Permit.address),
    );

    const permitArgs = { deadline, approvalAmount: BigInt(depositAmount), signature: { v, r, s } };

    await clientBlockchain.depositPendingFunds(permitAssetId, BigInt(depositAmount), localAddress, permitArgs);
    const deposited = await ethereumBlockchain.getUserPendingDeposit(permitAssetId, localAddress);
    expect(deposited).to.equal(BigInt(depositAmount));

    const newNonce = await ethereumBlockchain.getAsset(permitAssetId).getUserNonce(localAddress);
    expect(parseInt(newNonce.toString(), 10)).to.equal(1);
  });

  it('should process a deposit proof', async () => {
    const { proofData, signatures } = await createRollupProof(
      rollupProvider,
      await createDepositProof(depositAmount, userAAddress, userA),
    );

    await erc20UserA.approve(rollupProcessor.address, depositAmount);

    const depositTxHash = await clientBlockchain.depositPendingFunds(erc20AssetId, BigInt(depositAmount), userAAddress);
    const depositReceipt = await ethereumBlockchain.getTransactionReceipt(depositTxHash);
    expect(depositReceipt.blockNum).to.be.above(0);

    const txHash = await sendEscapeHatchProof(proofData, viewingKeys, signatures[0]);
    const receipt = await ethereumBlockchain.getTransactionReceipt(txHash);
    expect(receipt.blockNum).to.be.above(depositReceipt.blockNum);
  });

  it('should process a deposit proof with signature', async () => {
    const txFee = 10;
    const publicInput = depositAmount + txFee;
    const feeLimit = BigInt(10) ** BigInt(18);
    const prepaidFee = feeLimit;

    await feeDistributor.deposit(ethAssetId, prepaidFee, { value: prepaidFee });

    const { proofData, signatures, providerSignature } = await createRollupProof(
      rollupProvider,
      await createDepositProof(depositAmount, userAAddress, userA, ethAssetId, txFee),
      {
        feeLimit,
        feeDistributorAddress,
      },
    );

    const depositTxHash = await clientBlockchain.depositPendingFunds(ethAssetId, BigInt(publicInput), userAAddress);
    const depositReceipt = await ethereumBlockchain.getTransactionReceipt(depositTxHash);
    expect(depositReceipt.blockNum).to.be.above(0);

    const providerAddress = EthAddress.fromString(await rollupProvider.getAddress());
    const txHash = await sendRollupProof(
      proofData,
      signatures,
      viewingKeys,
      providerSignature,
      providerAddress,
      feeLimit,
      providerAddress,
    );
    const receipt = await ethereumBlockchain.getTransactionReceipt(txHash);
    expect(receipt.blockNum).to.be.above(depositReceipt.blockNum);
  });

  it('should process send proof', async () => {
    const { proofData } = await createRollupProof(rollupProvider, await createSendProof());
    const txHash = await sendEscapeHatchProof(proofData, viewingKeys);
    const receipt = await ethereumBlockchain.getTransactionReceipt(txHash);
    expect(receipt.blockNum).to.be.above(0);
  });

  it('should process withdraw proof', async () => {
    const { proofData: depositProofData, signatures: depositSignatures } = await createRollupProof(
      rollupProvider,
      await createDepositProof(depositAmount, userAAddress, userA),
    );
    await erc20UserA.approve(rollupProcessor.address, depositAmount);
    await clientBlockchain.depositPendingFunds(erc20AssetId, BigInt(depositAmount), userAAddress);
    const depositTxHash = await sendEscapeHatchProof(depositProofData, viewingKeys, depositSignatures[0]);
    await waitOnBlockProcessed;

    const depositReceipt = await ethereumBlockchain.getTransactionReceipt(depositTxHash);
    expect(depositReceipt.blockNum).to.be.above(0);

    const { proofData: withdrawProofData } = await createRollupProof(
      rollupProvider,
      await createWithdrawProof(withdrawalAmount, userAAddress),
      {
        rollupId: 1,
      },
    );
    await erc20UserA.approve(rollupProcessor.address, depositAmount);
    const withdrawTxHash = await sendEscapeHatchProof(withdrawProofData, viewingKeys);
    await waitOnBlockProcessed;
    const withdrawReceipt = await ethereumBlockchain.getTransactionReceipt(withdrawTxHash);
    expect(withdrawReceipt.blockNum).to.be.above(0);
  });

  it('should emit new blocks as events', async () => {
    const spy = sinon.spy();
    const { proofData, signatures } = await createRollupProof(
      rollupProvider,
      await createDepositProof(depositAmount, userAAddress, userA),
    );
    ethereumBlockchain.on('block', spy);

    await erc20UserA.approve(rollupProcessor.address, depositAmount);
    await clientBlockchain.depositPendingFunds(erc20AssetId, BigInt(depositAmount), userAAddress);
    await sendEscapeHatchProof(proofData, viewingKeys, signatures[0]);
    await waitOnBlockProcessed;

    const numBlockEvents = spy.callCount;
    expect(numBlockEvents).to.equal(1);

    const blockEvent = spy.getCall(0);
    expect(blockEvent.args[0].rollupSize).to.equal(2);
    expect(blockEvent.args[0].rollupProofData).to.deep.equal(proofData);
    expect(blockEvent.args[0].viewingKeysData).to.deep.equal(Buffer.concat(viewingKeys));
    ethereumBlockchain.off('block', spy);
  });

  it('should get specified blocks', async () => {
    const { proofData: depositProofData, signatures: depositSignatures } = await createRollupProof(
      rollupProvider,
      await createDepositProof(depositAmount, userAAddress, userA),
    );
    await erc20UserA.approve(rollupProcessor.address, depositAmount);
    await clientBlockchain.depositPendingFunds(1, BigInt(depositAmount), userAAddress);
    await sendEscapeHatchProof(depositProofData, viewingKeys, depositSignatures[0]);
    await waitOnBlockProcessed;

    const { proofData: withdrawProofData } = await createRollupProof(
      rollupProvider,
      await createWithdrawProof(withdrawalAmount, userAAddress),
      {
        rollupId: 1,
      },
    );
    await erc20UserA.approve(rollupProcessor.address, depositAmount);
    await sendEscapeHatchProof(withdrawProofData, viewingKeys);
    await waitOnBlockProcessed;

    const rollupIdStart = 0;
    const blocks = await ethereumBlockchain.getBlocks(rollupIdStart);

    const rollup0 = RollupProofData.fromBuffer(blocks[0].rollupProofData, blocks[0].viewingKeysData);
    expect(blocks[0].rollupSize).to.equal(2);
    expect(rollup0.rollupId).to.equal(0);
    expect(rollup0.dataStartIndex).to.equal(0);
    expect(rollup0.innerProofData[0].publicInput.readInt32BE(28)).to.equal(depositAmount);
    expect(rollup0.innerProofData[0].publicOutput.readInt32BE(28)).to.equal(0);
    expect(rollup0.innerProofData[0].inputOwner.toString('hex')).to.equal(userAAddress.toBuffer32().toString('hex'));

    const rollup1 = RollupProofData.fromBuffer(blocks[1].rollupProofData, blocks[1].viewingKeysData);
    expect(blocks[1].rollupSize).to.equal(2);
    expect(rollup1.rollupId).to.equal(1);
    expect(rollup1.dataStartIndex).to.equal(4);
    expect(rollup1.innerProofData[0].publicInput.readInt32BE(28)).to.equal(0);
    expect(rollup1.innerProofData[0].publicOutput.readInt32BE(28)).to.equal(withdrawalAmount);
    expect(rollup1.innerProofData[0].outputOwner.toString('hex')).to.equal(userAAddress.toBuffer32().toString('hex'));
  });

  it('should reject sending proof if depositor has insufficient approval ', async () => {
    const { proofData, signatures } = await createRollupProof(
      rollupProvider,
      await createDepositProof(depositAmount, userAAddress, userA),
    );

    // no erc20 approval
    await expect(sendEscapeHatchProof(proofData, viewingKeys, signatures[0])).to.be.revertedWith(
      'Rollup Processor: INSUFFICIENT_DEPOSIT',
    );
  });

  it('should get gas price feed', async () => {
    const gasPriceFeed = ethereumBlockchain.getGasPriceFeed();
    expect(await gasPriceFeed.price()).to.equal(100n);
  });

  it('should get asset price feed', async () => {
    expect(await ethereumBlockchain.getPriceFeed(0).price()).to.equal(10n ** 18n);
    expect(await ethereumBlockchain.getPriceFeed(1).price()).to.equal(250n);
    expect(await ethereumBlockchain.getPriceFeed(2).price()).to.equal(360n);
  });

  it('should get asset prices', async () => {
    expect(await ethereumBlockchain.getAssetPrice(0)).to.equal(10n ** 18n);
    expect(await ethereumBlockchain.getAssetPrice(1)).to.equal(250n);
    expect(await ethereumBlockchain.getAssetPrice(2)).to.equal(360n);
  });
});
