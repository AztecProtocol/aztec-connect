import { Contract, Signer } from 'ethers';
import { ethers } from 'hardhat';
import { EthAddress } from '@aztec/barretenberg/address';
import { Asset } from '@aztec/barretenberg/blockchain';
import { setupAssets } from '../asset/fixtures/setup_assets';
import { setupFeeDistributor } from './fixtures/setup_fee_distributor';
import { setupUniswap } from './fixtures/setup_uniswap';
import { FeeDistributor } from './fee_distributor';

describe('fee_distributor', () => {
  let feeDistributor: FeeDistributor;
  let uniswapRouter: Contract;
  let assets: Asset[];
  let signers: Signer[];
  let addresses: EthAddress[];
  let createPair: (asset: Asset, initialTotalSupply: bigint) => Promise<Contract>;

  const initialUserTokenBalance = 10n ** 18n;
  const initialTotalSupply = 10n * 10n ** 18n;
  const reimburseConstant = 16n * 51781n;
  const gasPrice = 10n;

  beforeEach(async () => {
    signers = await ethers.getSigners();
    addresses = await Promise.all(signers.map(async u => EthAddress.fromString(await u.getAddress())));

    ({ uniswapRouter, createPair } = await setupUniswap(signers[0]));
    ({ feeDistributor } = await setupFeeDistributor(
      signers[0],
      addresses[0],
      EthAddress.fromString(uniswapRouter.address),
    ));

    assets = await setupAssets(signers[0], signers, initialUserTokenBalance);
    await Promise.all(assets.slice(1).map(a => createPair(a, initialTotalSupply)));
  });

  it('deposit eth to fee distributor', async () => {
    await feeDistributor.deposit(EthAddress.ZERO, 100n);
    expect(BigInt(await feeDistributor.txFeeBalance(EthAddress.ZERO))).toBe(100n);
  });

  it('revert if eth value is different to deposit amount', async () => {
    await expect(
      feeDistributor.contract.connect(signers[0]).deposit(EthAddress.ZERO.toString(), 100n, { value: 99n }),
    ).rejects.toThrow('WRONG_AMOUNT');
    await expect(
      feeDistributor.contract.connect(signers[0]).deposit(EthAddress.ZERO.toString(), 99n, { value: 100n }),
    ).rejects.toThrow('WRONG_AMOUNT');
  });

  it('deposit token asset to fee distributor', async () => {
    const asset = assets[1];
    const assetAddress = asset.getStaticInfo().address;
    const amount = 100n;
    await expect(feeDistributor.deposit(asset.getStaticInfo().address, amount)).rejects.toThrow(
      'ERC20: transfer amount exceeds allowance',
    );

    await asset.approve(amount, addresses[0], feeDistributor.address);
    await feeDistributor.deposit(assetAddress, amount);
    expect(await feeDistributor.txFeeBalance(assetAddress)).toBe(amount);
  });

  it('revert if deposit to token asset with non empty value', async () => {
    const asset = assets[1];
    const amount = 100n;
    await asset.approve(amount, addresses[0], feeDistributor.address);
    await expect(
      feeDistributor.contract
        .connect(signers[0])
        .deposit(asset.getStaticInfo().address.toString(), amount, { value: amount }),
    ).rejects.toThrow('WRONG_PAYMENT_TYPE');
  });

  it('convert on deposit if balance exceeds threshold', async () => {
    const asset = assets[1];
    const assetAddr = asset.getStaticInfo().address;
    const weth = await feeDistributor.WETH();
    const minOutputEth = (await feeDistributor.convertConstant()) * gasPrice;
    const amountsIn = await uniswapRouter.getAmountsIn(minOutputEth, [assetAddr.toString(), weth.toString()]);
    const convertThreshold = BigInt(amountsIn[0]);

    {
      const amount = convertThreshold - 1n;
      await asset.approve(amount, addresses[0], feeDistributor.address);
      await feeDistributor.deposit(assetAddr, amount);
      expect(await feeDistributor.txFeeBalance(assetAddr)).toBe(amount);
      expect(await feeDistributor.txFeeBalance(EthAddress.ZERO)).toBe(0n);
    }

    {
      const amount = 1n;
      await asset.approve(amount, addresses[0], feeDistributor.address);

      await feeDistributor.deposit(assetAddr, amount);
      expect(await feeDistributor.txFeeBalance(assetAddr)).toBe(0n);
      expect(await feeDistributor.txFeeBalance(EthAddress.ZERO)).toBe(minOutputEth);
    }
  });

  it('only owner can change convertConstant', async () => {
    const convertConstant = 100n;
    expect(await feeDistributor.convertConstant()).not.toBe(convertConstant);
    await expect(feeDistributor.setConvertConstant(convertConstant, { signingAddress: addresses[1] })).rejects.toThrow(
      'Ownable: caller is not the owner',
    );
    await feeDistributor.setConvertConstant(convertConstant);
    expect(BigInt(await feeDistributor.convertConstant())).toBe(convertConstant);
  });

  it('reimburse eth to recipient', async () => {
    const ethAsset = assets[0];
    const assetAddr = EthAddress.ZERO;
    const userAddress = addresses[1];
    const initialFeeDistributorBalance = 10n ** 18n;

    await feeDistributor.deposit(assetAddr, initialFeeDistributorBalance);

    const initialUserBalance = await ethAsset.balanceOf(userAddress);
    const gasUsed = 123n;
    const expected = (gasUsed + reimburseConstant) * gasPrice;

    await feeDistributor.reimburseGas(gasUsed, expected, userAddress);

    expect(await feeDistributor.txFeeBalance(assetAddr)).toBe(initialFeeDistributorBalance - expected);
    expect(await ethAsset.balanceOf(userAddress)).toBe(initialUserBalance + expected);
  });

  it('cannot be called by anyone other than the rollup processor', async () => {
    const userAddress = addresses[1];
    await expect(feeDistributor.reimburseGas(1n, 1n, userAddress, { signingAddress: addresses[1] })).rejects.toThrow(
      'INVALID_CALLER',
    );
  });

  it('cannot cost more gas than fee limit', async () => {
    await feeDistributor.deposit(EthAddress.ZERO, 10n ** 18n);

    const gasUsed = 123n;
    const expected = (gasUsed + reimburseConstant) * gasPrice;
    const feeLimit = expected - 1n;

    await expect(feeDistributor.reimburseGas(gasUsed, feeLimit, addresses[1])).rejects.toThrow('FEE_LIMIT_EXCEEDED');
  });

  it('cannot reimburse more than the current balance', async () => {
    const assetAddr = EthAddress.ZERO;
    const userAddress = addresses[1];
    const gasUsed = 123n;
    const expected = (gasUsed + reimburseConstant) * gasPrice;

    await feeDistributor.deposit(assetAddr, expected - 1n);

    await expect(feeDistributor.reimburseGas(gasUsed, expected, userAddress)).rejects.toThrow('REIMBURSE_GAS_FAILED');
  });

  it('only owner can change reimburseConstant', async () => {
    const reimburseConstant = 100n;
    expect(await feeDistributor.reimburseConstant()).not.toBe(reimburseConstant);
    await expect(
      feeDistributor.setReimburseConstant(reimburseConstant, { signingAddress: addresses[1] }),
    ).rejects.toThrow('Ownable: caller is not the owner');
    await feeDistributor.setReimburseConstant(reimburseConstant);
    expect(await feeDistributor.reimburseConstant()).toBe(reimburseConstant);
  });

  it('convert asset balance to eth', async () => {
    const asset = assets[1];
    const assetAddr = asset.getStaticInfo().address;

    expect(await feeDistributor.txFeeBalance(assetAddr)).toBe(0n);
    expect(await feeDistributor.txFeeBalance(EthAddress.ZERO)).toBe(0n);

    const balance = 10n;

    await asset.approve(balance, addresses[0], feeDistributor.address);
    await feeDistributor.deposit(assetAddr, balance);

    const fee = 1n;
    const minOutputValue = 9n;
    expect(await feeDistributor.txFeeBalance(assetAddr)).toBe(balance);
    expect(await feeDistributor.txFeeBalance(EthAddress.ZERO)).toBe(0n);

    await feeDistributor.convert(assetAddr, minOutputValue);

    expect(await feeDistributor.txFeeBalance(assetAddr)).toBe(0n);
    expect(await feeDistributor.txFeeBalance(EthAddress.ZERO)).toBe(balance - fee);
  });

  it('cannot be called by anyone other than the owner', async () => {
    await expect(feeDistributor.convert(EthAddress.ZERO, 0n, { signingAddress: addresses[1] })).rejects.toThrow(
      'Ownable: caller is not the owner',
    );
  });

  it('revert if output will be less than minOutputValue', async () => {
    const asset = assets[1];
    const assetAddr = assets[1].getStaticInfo().address;
    const balance = 10n;

    await asset.approve(balance, addresses[0], feeDistributor.address);
    await feeDistributor.deposit(assetAddr, balance);

    const minOutputValue = balance;
    await expect(feeDistributor.convert(assetAddr, minOutputValue)).rejects.toThrow('INSUFFICIENT_OUTPUT_AMOUNT');
  });

  it('cannot convert eth to eth', async () => {
    await expect(feeDistributor.convert(EthAddress.ZERO, 0n)).rejects.toThrow('NOT_A_TOKEN_ASSET');
  });

  it('revert if asset balance is empty', async () => {
    const assetAddr = assets[1].getStaticInfo().address;
    await expect(feeDistributor.convert(assetAddr, 1n)).rejects.toThrow('EMPTY_BALANCE');
  });
});
