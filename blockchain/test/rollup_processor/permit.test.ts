import { expect, use } from 'chai';
import { solidity } from 'ethereum-waffle';
import { Contract, Signer, Wallet } from 'ethers';
import { ethers } from 'hardhat';
import { setupRollupProcessor } from './fixtures/setup_rollup_processor';
import { signPermit, createLowLevelPermitSig } from './fixtures/create_permit_signature';
import { EthAddress } from 'barretenberg/address';
import { randomBytes } from 'crypto';
import { AssetId } from 'barretenberg/client_proofs';

use(solidity);

describe('rollup_processor: permit', () => {
  let rollupProcessor: Contract;
  let erc20Permit: Contract;
  let erc20PermitAssetId: number;
  let userA: Signer;
  let rollupProvider: Signer;

  const mintAmount = 100;
  const depositAmount = 60;

  beforeEach(async () => {
    [userA, rollupProvider] = await ethers.getSigners();

    ({ rollupProcessor } = await setupRollupProcessor(rollupProvider, [userA], mintAmount));

    const ERC20Permit = await ethers.getContractFactory('ERC20Permit');
    erc20Permit = await ERC20Permit.deploy();

    await rollupProcessor.setSupportedAsset(erc20Permit.address, true);
    erc20PermitAssetId = 2;
  });

  it('should return whether an asset supports the permit ERC-2612 approval flow', async () => {
    expect(await rollupProcessor.getAssetPermitSupport(AssetId.ETH)).to.equal(false);
    expect(await rollupProcessor.getAssetPermitSupport(AssetId.DAI)).to.equal(false);
    expect(await rollupProcessor.getAssetPermitSupport(erc20PermitAssetId)).to.equal(true);
  });

  it('should deposit funds into the rollup contract via permit call', async () => {
    const user = ethers.Wallet.createRandom();
    const userAddress = await user.getAddress();
    await erc20Permit.mint(userAddress.toString(), 100);

    const deadline = BigInt('0xffffffff');
    const nonce = await erc20Permit.nonces(userAddress.toString());
    const name = await erc20Permit.name();
    const { v, r, s } = await signPermit(
      user,
      name,
      EthAddress.fromString(await user.getAddress()),
      EthAddress.fromString(rollupProcessor.address),
      BigInt(depositAmount),
      nonce,
      deadline,
      31337,
      EthAddress.fromString(erc20Permit.address),
    );

    await rollupProcessor.depositPendingFundsPermit(
      erc20PermitAssetId,
      depositAmount,
      userAddress,
      rollupProcessor.address,
      depositAmount,
      deadline,
      v,
      r,
      s,
    );

    const depositedFunds = await rollupProcessor.getUserPendingDeposit(erc20PermitAssetId, userAddress);
    expect(depositedFunds).to.equal(depositAmount);
  });

  it('should deposit funds via permit using low level ecsign', async () => {
    const privateKey = randomBytes(32);
    const user = new Wallet(privateKey);
    await erc20Permit.mint(user.address, 100);

    const deadline = BigInt('0xffffffff');
    const nonce = await erc20Permit.nonces(user.address);
    const name = await erc20Permit.name();
    const { v, r, s } = await createLowLevelPermitSig(
      Buffer.from(user.privateKey.slice(2), 'hex'),
      EthAddress.fromString(user.address),
      name,
      EthAddress.fromString(rollupProcessor.address),
      BigInt(depositAmount),
      nonce,
      deadline,
      31337,
      EthAddress.fromString(erc20Permit.address),
    );

    await rollupProcessor.depositPendingFundsPermit(
      erc20PermitAssetId,
      depositAmount,
      user.address,
      rollupProcessor.address,
      depositAmount,
      deadline,
      v,
      r,
      s,
    );

    const depositedFunds = await rollupProcessor.getUserPendingDeposit(erc20PermitAssetId, user.address);
    expect(depositedFunds).to.equal(depositAmount);
  });
});
