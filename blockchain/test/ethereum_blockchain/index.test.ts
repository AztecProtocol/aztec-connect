import { EthAddress } from '@aztec/barretenberg/address';
import { AssetId } from '@aztec/barretenberg/asset';
import { Blockchain } from '@aztec/barretenberg/blockchain';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { DefiInteractionNote, packInteractionNotes } from '@aztec/barretenberg/note_algorithms';
import { RollupProofData } from '@aztec/barretenberg/rollup_proof';
import { toBigIntBE } from '@aztec/barretenberg/bigint_buffer';
import { expect, use } from 'chai';
import { randomBytes } from 'crypto';
import { solidity } from 'ethereum-waffle';
import { Contract, Signer, Wallet } from 'ethers';
import { ethers, network } from 'hardhat';
import sinon from 'sinon';
import { ClientEthereumBlockchain } from '../../src';
import { createPermitData } from '../../src/create_permit_data';
import { EthereumBlockchain } from '../../src/ethereum_blockchain';
import { EthersAdapter, WalletProvider } from '../../src/provider';
import {
  createDepositProof,
  createRollupProof,
  createSendProof,
  createWithdrawProof,
  DefiInteractionData,
} from '../fixtures/create_mock_proof';
import { createLowLevelPermitSig, signPermit } from '../fixtures/create_permit_signature';
import { DefiBridge, deployMockDefiBridge } from '../fixtures/setup_defi_bridges';
import { setupPriceFeeds } from '../fixtures/setup_price_feeds';
import { setupRollupProcessor } from '../fixtures/setup_rollup_processor';

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
  let assetAddresses: EthAddress[];
  let uniswapBridges: { [key: number]: DefiBridge }[];
  let userA: Signer;
  let userB: Signer;
  let userAAddress: EthAddress;
  let userBAddress: EthAddress;
  let localUser: Wallet;
  let viewingKeys: Buffer[];
  let erc20AssetId: AssetId;
  let ethAssetId: AssetId;

  const mintAmount = 100n;
  const depositAmount = 30n;
  const withdrawalAmount = 10n;
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
    ({
      erc20,
      rollupProcessor,
      feeDistributor,
      assetAddresses,
      uniswapBridges,
      viewingKeys,
      erc20AssetId,
      ethAssetId,
    } = await setupRollupProcessor(rollupProvider, [userA, userB], mintAmount));
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
    const status = await ethereumBlockchain.getBlockchainStatus();
    expect(status).to.deep.include({
      rollupContractAddress: EthAddress.fromString(rollupProcessor.address),
      feeDistributorContractAddress: feeDistributorAddress,
      nextRollupId: 0,
      dataSize: 0,
      dataRoot: Buffer.from('2708a627d38d74d478f645ec3b4e91afa325331acf1acebe9077891146b75e39', 'hex'),
      nullRoot: Buffer.from('2694dbe3c71a25d92213422d392479e7b8ef437add81e1e17244462e6edca9b1', 'hex'),
      rootRoot: Buffer.from('2d264e93dc455751a721aead9dba9ee2a9fef5460921aeede73f63f6210e6851', 'hex'),
      defiInteractionHash: Buffer.from('0f115a0e0c15cdc41958ca46b5b14b456115f4baec5e3ca68599d2a8f435e3b8', 'hex'),
      totalDeposited: [0n, 0n],
      totalWithdrawn: [0n, 0n],
      totalPendingDeposit: [0n, 0n],
      totalFees: [0n, 0n],
      feeDistributorBalance: [0n, 0n],
    });
    expect(status.assets.length).to.equals(2);
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
    expect(await ethereumBlockchain.getUserPendingDeposit(erc20AssetId, userAAddress)).to.equal(0n);

    const amount = 50n;
    await erc20UserA.approve(rollupProcessor.address, amount);
    await clientBlockchain.depositPendingFunds(erc20AssetId, amount, userAAddress);
    expect(await ethereumBlockchain.getUserPendingDeposit(erc20AssetId, userAAddress)).to.equal(amount);

    const amount2 = 30n;
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
    expect(nonce).to.equal(0n);
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
      depositAmount,
      nonce,
      deadline,
      31337,
      EthAddress.fromString(erc20Permit.address),
    );
    const signature = await signPermit(localUser, permitData);
    const permitArgs = { deadline, approvalAmount: depositAmount, signature };
    await clientBlockchain.depositPendingFunds(permitAssetId, depositAmount, localAddress, permitArgs);
    const deposited = await ethereumBlockchain.getUserPendingDeposit(permitAssetId, localAddress);
    expect(deposited).to.equal(depositAmount);

    const newNonce = await ethereumBlockchain.getAsset(permitAssetId).getUserNonce(localAddress);
    expect(newNonce).to.equal(1n);
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
      depositAmount,
      nonce,
      deadline,
      31337,
      EthAddress.fromString(erc20Permit.address),
    );

    const permitArgs = { deadline, approvalAmount: depositAmount, signature: { v, r, s } };

    await clientBlockchain.depositPendingFunds(permitAssetId, depositAmount, localAddress, permitArgs);
    const deposited = await ethereumBlockchain.getUserPendingDeposit(permitAssetId, localAddress);
    expect(deposited).to.equal(depositAmount);

    const newNonce = await ethereumBlockchain.getAsset(permitAssetId).getUserNonce(localAddress);
    expect(parseInt(newNonce.toString(), 10)).to.equal(1);
  });

  it('should process a deposit proof', async () => {
    const { proofData, signatures } = await createRollupProof(
      rollupProvider,
      await createDepositProof(depositAmount, userAAddress, userA),
    );

    await erc20UserA.approve(rollupProcessor.address, depositAmount);

    const depositTxHash = await clientBlockchain.depositPendingFunds(erc20AssetId, depositAmount, userAAddress);
    const depositReceipt = await ethereumBlockchain.getTransactionReceipt(depositTxHash);
    expect(depositReceipt.blockNum).to.be.above(0);

    const txHash = await sendEscapeHatchProof(proofData, viewingKeys, signatures[0]);
    const receipt = await ethereumBlockchain.getTransactionReceipt(txHash);
    expect(receipt.blockNum).to.be.above(depositReceipt.blockNum);
  });

  it('should process a deposit proof with signature', async () => {
    const txFee = 10n;
    const publicInput = depositAmount + txFee;
    const feeLimit = 10n ** 18n;
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

    const depositTxHash = await clientBlockchain.depositPendingFunds(ethAssetId, publicInput, userAAddress);
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
    await clientBlockchain.depositPendingFunds(erc20AssetId, depositAmount, userAAddress);
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
    await clientBlockchain.depositPendingFunds(erc20AssetId, depositAmount, userAAddress);
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
    const bridge = await deployMockDefiBridge(
      rollupProvider,
      1,
      assetAddresses[ethAssetId],
      assetAddresses[erc20AssetId],
      EthAddress.ZERO,
      0n,
      2n,
      0n,
      true,
      10n,
    );
    const bridgeId = new BridgeId(EthAddress.fromString(bridge.address), 1, ethAssetId, erc20AssetId, 0);
    const numberOfBridgeCalls = RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK;

    // Top up rollup processor to transfer eth to defi bridges.
    await rollupProvider.sendTransaction({ to: rollupProcessor.address, value: 10 });

    {
      const { proofData, signatures } = await createRollupProof(
        rollupProvider,
        await createDepositProof(depositAmount, userAAddress, userA),
      );
      await erc20UserA.approve(rollupProcessor.address, depositAmount);
      await clientBlockchain.depositPendingFunds(1, depositAmount, userAAddress);
      await sendEscapeHatchProof(proofData, viewingKeys, signatures[0]);
      await waitOnBlockProcessed;
    }

    {
      const { proofData } = await createRollupProof(
        rollupProvider,
        await createWithdrawProof(withdrawalAmount, userAAddress),
        {
          rollupId: 1,
          defiInteractionData: [new DefiInteractionData(bridgeId, 1n), new DefiInteractionData(bridgeId, 1n)],
        },
      );
      await sendEscapeHatchProof(proofData, []);
      await waitOnBlockProcessed;
    }
    const interactionResult0 = [...Array(2)].map(
      (_, i) => new DefiInteractionNote(bridgeId, i + numberOfBridgeCalls, 1n, 2n, 0n, true),
    );
    const previousDefiInteractionHash = packInteractionNotes([
      ...interactionResult0,
      ...[...Array(numberOfBridgeCalls - 2)].map(() => DefiInteractionNote.EMPTY),
    ]);

    {
      const { proofData } = await createRollupProof(rollupProvider, await createSendProof(AssetId.ETH), {
        rollupId: 2,
        previousDefiInteractionHash,
        defiInteractionData: [new DefiInteractionData(bridgeId, 1n)],
      });
      await sendEscapeHatchProof(proofData, []);
      await waitOnBlockProcessed;
    }
    const interactionResult1 = [new DefiInteractionNote(bridgeId, numberOfBridgeCalls * 2, 1n, 2n, 0n, true)];

    const rollupIdStart = 0;
    const blocks = await ethereumBlockchain.getBlocks(rollupIdStart);
    expect(blocks.length).to.equal(3);

    {
      const block = blocks[0];
      const rollup = RollupProofData.fromBuffer(block.rollupProofData, block.viewingKeysData);
      expect(block.rollupSize).to.equal(2);
      expect(block.interactionResult.length).to.equal(0);
      expect(rollup.rollupId).to.equal(0);
      expect(rollup.dataStartIndex).to.equal(0);
      expect(toBigIntBE(rollup.innerProofData[0].publicInput)).to.equal(depositAmount);
      expect(toBigIntBE(rollup.innerProofData[0].publicOutput)).to.equal(0n);
      expect(rollup.innerProofData[0].inputOwner.toString('hex')).to.equal(userAAddress.toBuffer32().toString('hex'));
    }

    {
      const block = blocks[1];
      const rollup = RollupProofData.fromBuffer(block.rollupProofData, block.viewingKeysData);
      expect(block.rollupSize).to.equal(2);
      expect(block.interactionResult.length).to.equal(2);
      expect(block.interactionResult[0].equals(interactionResult0[0])).to.equal(true);
      expect(block.interactionResult[1].equals(interactionResult0[1])).to.equal(true);
      expect(rollup.rollupId).to.equal(1);
      expect(rollup.dataStartIndex).to.equal(4);
      expect(toBigIntBE(rollup.innerProofData[0].publicInput)).to.equal(0n);
      expect(toBigIntBE(rollup.innerProofData[0].publicOutput)).to.equal(withdrawalAmount);
      expect(rollup.innerProofData[0].outputOwner.toString('hex')).to.equal(userAAddress.toBuffer32().toString('hex'));
    }

    {
      const block = blocks[2];
      const rollup = RollupProofData.fromBuffer(block.rollupProofData, block.viewingKeysData);
      expect(block.rollupSize).to.equal(2);
      expect(block.interactionResult.length).to.equal(1);
      expect(block.interactionResult[0].equals(interactionResult1[0])).to.equal(true);
      expect(rollup.rollupId).to.equal(2);
      expect(rollup.dataStartIndex).to.equal(8);
      expect(toBigIntBE(rollup.innerProofData[0].publicInput)).to.equal(0n);
      expect(toBigIntBE(rollup.innerProofData[0].publicOutput)).to.equal(0n);
    }
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

  it('should get bridge id from contract address', async () => {
    const bridge = uniswapBridges[AssetId.ETH][AssetId.DAI];
    const bridgeId = await ethereumBlockchain.getBridgeId(EthAddress.fromString(bridge.contract.address));
    expect(bridgeId).deep.equals(bridge.id);
  });

  it('should return zero bridge id if contract address does not exist', async () => {
    const bridgeId = await ethereumBlockchain.getBridgeId(EthAddress.randomAddress());
    expect(bridgeId).deep.equals(BridgeId.ZERO);
  });

  it('should return zero bridge id if asset does not defined in rollup processor', async () => {
    const invalidBridge = await deployMockDefiBridge(
      rollupProvider,
      1,
      assetAddresses[ethAssetId],
      EthAddress.randomAddress(),
      EthAddress.randomAddress(),
    );
    const bridgeId = await ethereumBlockchain.getBridgeId(EthAddress.fromString(invalidBridge.address));
    expect(bridgeId).deep.equals(BridgeId.ZERO);
  });
});
