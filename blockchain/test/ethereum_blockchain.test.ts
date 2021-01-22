import { EthAddress } from 'barretenberg/address';
import { AssetId } from 'barretenberg/client_proofs';
import { RollupProofData } from 'barretenberg/rollup_proof';
import { expect, use } from 'chai';
import { randomBytes } from 'crypto';
import { solidity } from 'ethereum-waffle';
import { Contract, Signer, Wallet } from 'ethers';
import { ethers, network } from 'hardhat';
import sinon from 'sinon';
import { Blockchain } from '../src/blockchain';
import { EthereumBlockchain } from '../src/ethereum_blockchain';
import { EthersAdapter, WalletProvider } from '../src/provider';
import {
  createDepositProof,
  createRollupProof,
  createSendProof,
  createWithdrawProof,
} from './rollup_processor/fixtures/create_mock_proof';
import { createLowLevelPermitSig, signPermit } from './rollup_processor/fixtures/create_permit_signature';
import { setupRollupProcessor } from './rollup_processor/fixtures/setup_rollup_processor';

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
  let rollupProvider: Signer;
  let rollupProviderAddress: EthAddress;
  let feeDistributorAddress: EthAddress;
  let userA: Signer;
  let userB: Signer;
  let userAAddress: EthAddress;
  let localUser: Wallet;
  let viewingKeys: Buffer[];
  let erc20AssetId: AssetId;
  let ethAssetId: AssetId;

  const mintAmount = 100;
  const depositAmount = 30;
  const withdrawalAmount = 10;
  const permitAssetId = 2;
  let waitOnBlockProcessed: any;

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
    ({ erc20, rollupProcessor, feeDistributor, viewingKeys, erc20AssetId, ethAssetId } = await setupRollupProcessor(
      rollupProvider,
      [userA, userB],
      mintAmount,
    ));
    erc20UserA = erc20.connect(userA);
    feeDistributorAddress = EthAddress.fromString(feeDistributor.address);

    ethereumBlockchain = await EthereumBlockchain.new(
      {
        networkOrHost: '',
        gasLimit: 5000000,
        console: false,
      },
      EthAddress.fromString(rollupProcessor.address),
      provider,
    );
    await ethereumBlockchain.start();
    waitOnBlockProcessed = createWaitOnBlockProcessed(ethereumBlockchain);

    const ERC20Permit = await ethers.getContractFactory('ERC20Permit');
    erc20Permit = await ERC20Permit.deploy();
    await erc20Permit.mint(localUser.address.toString(), 100);
    await ethereumBlockchain.setSupportedAsset(EthAddress.fromString(erc20Permit.address), true, rollupProviderAddress);
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
    await ethereumBlockchain.setSupportedAsset(EthAddress.fromString(newErc20.address), true, rollupProviderAddress);

    const supportedAssets = ethereumBlockchain.getTokenContractAddresses();
    expect(supportedAssets.length).to.equal(3);
    expect(supportedAssets[0].toString()).to.equal(erc20.address);
    expect(supportedAssets[1].toString()).to.equal(erc20Permit.address);
    expect(supportedAssets[2].toString()).to.equal(newErc20.address);

    const assetSupportsPermit = await ethereumBlockchain.getAssetPermitSupport(2);
    expect(assetSupportsPermit).to.equal(true);
  });

  it('should get user pending deposit', async () => {
    await erc20UserA.approve(rollupProcessor.address, 50);
    await ethereumBlockchain.depositPendingFunds(erc20AssetId, BigInt(50), userAAddress);
    const pendingDeposit = await ethereumBlockchain.getUserPendingDeposit(erc20AssetId, userAAddress);
    expect(pendingDeposit).to.equal(BigInt(50));
  });

  it('should validate user has deposited sufficient funds', async () => {
    await erc20UserA.approve(rollupProcessor.address, depositAmount);
    await ethereumBlockchain.depositPendingFunds(erc20AssetId, BigInt(depositAmount), userAAddress);
    const sufficientDeposit = await ethereumBlockchain.validateDepositFunds(
      userAAddress,
      BigInt(depositAmount),
      erc20AssetId,
    );
    expect(sufficientDeposit).to.equal(true);
  });

  it('should get user nonce', async () => {
    const nonce = await ethereumBlockchain.getUserNonce(permitAssetId, userAAddress);
    expect(nonce).to.equal(BigInt(0));
  });

  it('should deposit funds via permit flow', async () => {
    const deadline = BigInt('0xffffffff');
    const localAddress = EthAddress.fromString(localUser.address);
    const nonce = await erc20Permit.nonces(localUser.address);
    const name = await erc20Permit.name();
    const { v, r, s } = await signPermit(
      localUser,
      name,
      localAddress,
      EthAddress.fromString(rollupProcessor.address),
      BigInt(depositAmount),
      nonce,
      deadline,
      31337,
      EthAddress.fromString(erc20Permit.address),
    );

    const permitArgs = { deadline, approvalAmount: BigInt(depositAmount), signature: { v, r, s } };
    await ethereumBlockchain.depositPendingFunds(permitAssetId, BigInt(depositAmount), localAddress, permitArgs);
    const sufficientDeposit = await ethereumBlockchain.validateDepositFunds(
      localAddress,
      BigInt(depositAmount),
      permitAssetId,
    );
    expect(sufficientDeposit).to.equal(true);

    const newNonce = await ethereumBlockchain.getUserNonce(permitAssetId, localAddress);
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

    await ethereumBlockchain.depositPendingFunds(permitAssetId, BigInt(depositAmount), localAddress, permitArgs);
    const sufficientDeposit = await ethereumBlockchain.validateDepositFunds(
      localAddress,
      BigInt(depositAmount),
      permitAssetId,
    );
    expect(sufficientDeposit).to.equal(true);

    const newNonce = await ethereumBlockchain.getUserNonce(permitAssetId, localAddress);
    expect(parseInt(newNonce.toString(), 10)).to.equal(1);
  });

  it('should process a deposit proof', async () => {
    const { proofData, signatures } = await createRollupProof(
      rollupProvider,
      await createDepositProof(depositAmount, userAAddress, userA),
    );

    await erc20UserA.approve(rollupProcessor.address, depositAmount);

    const depositTxHash = await ethereumBlockchain.depositPendingFunds(
      erc20AssetId,
      BigInt(depositAmount),
      userAAddress,
    );
    const depositReceipt = await ethereumBlockchain.getTransactionReceipt(depositTxHash);
    expect(depositReceipt.blockNum).to.be.above(0);

    const txHash = await ethereumBlockchain.sendProof({ proofData, viewingKeys, depositSignature: signatures[0] });
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

    const depositTxHash = await ethereumBlockchain.depositPendingFunds(ethAssetId, BigInt(publicInput), userAAddress);
    const depositReceipt = await ethereumBlockchain.getTransactionReceipt(depositTxHash);
    expect(depositReceipt.blockNum).to.be.above(0);

    const providerAddress = EthAddress.fromString(await rollupProvider.getAddress());
    const txHash = await ethereumBlockchain.sendRollupProof(
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
    const txHash = await ethereumBlockchain.sendProof({ proofData, viewingKeys });
    const receipt = await ethereumBlockchain.getTransactionReceipt(txHash);
    expect(receipt.blockNum).to.be.above(0);
  });

  it('should process withdraw proof', async () => {
    const { proofData: depositProofData, signatures: depositSignatures } = await createRollupProof(
      rollupProvider,
      await createDepositProof(depositAmount, userAAddress, userA),
    );
    await erc20UserA.approve(rollupProcessor.address, depositAmount);
    await ethereumBlockchain.depositPendingFunds(erc20AssetId, BigInt(depositAmount), userAAddress);
    const depositTxHash = await ethereumBlockchain.sendProof({
      proofData: depositProofData,
      depositSignature: depositSignatures[0],
      viewingKeys,
    });
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
    const withdrawTxHash = await ethereumBlockchain.sendProof({ proofData: withdrawProofData, viewingKeys });
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
    await ethereumBlockchain.depositPendingFunds(erc20AssetId, BigInt(depositAmount), userAAddress);
    await ethereumBlockchain.sendProof({ proofData, viewingKeys, depositSignature: signatures[0] });
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
    await ethereumBlockchain.depositPendingFunds(1, BigInt(depositAmount), userAAddress);
    await ethereumBlockchain.sendProof({
      proofData: depositProofData,
      depositSignature: depositSignatures[0],
      viewingKeys,
    });
    await waitOnBlockProcessed;

    const { proofData: withdrawProofData } = await createRollupProof(
      rollupProvider,
      await createWithdrawProof(withdrawalAmount, userAAddress),
      {
        rollupId: 1,
      },
    );
    await erc20UserA.approve(rollupProcessor.address, depositAmount);
    await ethereumBlockchain.sendProof({ proofData: withdrawProofData, viewingKeys });
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
    await expect(
      ethereumBlockchain.sendProof({ proofData, viewingKeys, depositSignature: signatures[0] }),
    ).to.be.revertedWith('Rollup Processor: INSUFFICIENT_DEPOSIT');
  });
});
