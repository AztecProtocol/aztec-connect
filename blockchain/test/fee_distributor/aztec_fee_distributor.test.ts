import { expect } from 'chai';
import { Contract, Signer } from 'ethers';
import { ethers } from 'hardhat';
import { createAssets, createWeth, TokenAsset } from '../fixtures/assets';
import { createFeeClaimer, setupFeeDistributor } from '../fixtures/setup_fee_distributor';
import { Pair, setupUniswap } from '../fixtures/setup_uniswap';

describe('aztec_fee_distributor', () => {
  let feeDistributor: Contract;
  let feeClaimer: Contract;
  let router: Contract;
  let pairs: Pair[];
  let tokenAssets: TokenAsset[];
  let users: Signer[];
  let createPair: (asset: TokenAsset, initialTotalSupply: bigint) => Promise<Pair>;

  const ethAssetId = 0;
  const initialUserTokenBalance = 10n ** 18n;
  const initialTotalSupply = 10n * 10n ** 18n;

  const reimburseConstant = 16n * 51781n;
  const gasPrice = 10n;

  const topup = async (assetId: number, amount: bigint) => {
    if (assetId !== ethAssetId) {
      const asset = tokenAssets.find(a => a.id === assetId)!.contract;
      await asset.approve(feeDistributor.address, amount);
    }
    await feeDistributor.deposit(assetId, amount, { value: amount * BigInt(assetId === ethAssetId) });
  };

  beforeEach(async () => {
    const [publisher, ...signers] = await ethers.getSigners();
    users = signers.slice(0, 2);
    const weth = await createWeth(publisher);
    const assets = await createAssets(publisher, users, initialUserTokenBalance);
    ({ feeClaimer, tokenAssets } = await createFeeClaimer(publisher, weth, assets));
    ({ router, createPair } = await setupUniswap(publisher, weth));
    ({ feeDistributor } = await setupFeeDistributor(publisher, feeClaimer, router));
    pairs = await Promise.all(tokenAssets.map(a => createPair(a, initialTotalSupply)));
  });

  describe('deposit', () => {
    it('deposit eth to fee distributor', async () => {
      await feeDistributor.deposit(ethAssetId, 100n, { value: 100n });
      expect(await feeDistributor.txFeeBalance(ethAssetId)).to.equal(100n);
    });

    it('revert if value is different to deposit amount', async () => {
      await expect(feeDistributor.deposit(ethAssetId, 100n, { value: 99n })).to.be.revertedWith('WRONG_AMOUNT');
      await expect(feeDistributor.deposit(ethAssetId, 99n, { value: 100n })).to.be.revertedWith('WRONG_AMOUNT');
    });

    it('deposit token asset to fee distributor', async () => {
      const asset = tokenAssets[0];
      const amount = 100n;
      await expect(feeDistributor.deposit(asset.id, amount)).to.be.revertedWith(
        'ERC20: transfer amount exceeds allowance',
      );

      await asset.contract.approve(feeDistributor.address, amount);
      await feeDistributor.deposit(asset.id, amount);
      expect(await feeDistributor.txFeeBalance(asset.id)).to.equal(amount);
    });

    it('revert if deposit to token asset with non empty value', async () => {
      const asset = tokenAssets[0];
      const amount = 100n;
      await asset.contract.approve(feeDistributor.address, amount);
      await expect(feeDistributor.deposit(asset.id, amount, { value: amount })).to.be.revertedWith(
        'WRONG_PAYMENT_TYPE',
      );
    });

    it('convert while deposit if balance exceeds threshold', async () => {
      const asset = tokenAssets[0];
      const weth = await feeDistributor.WETH();
      const minOutputEth = BigInt(await feeDistributor.convertConstant()) * gasPrice;
      const amountsIn = await router.getAmountsIn(minOutputEth, [asset.contract.address, weth]);
      const convertThreshold = BigInt(amountsIn[0]);

      const userAsset = asset.contract.connect(users[0]);
      const userFeeDistributor = feeDistributor.connect(users[0]);

      {
        const amount = convertThreshold - 1n;
        await userAsset.approve(feeDistributor.address, amount);
        await userFeeDistributor.deposit(asset.id, amount);
        expect(await feeDistributor.txFeeBalance(asset.id)).to.equal(amount);
        expect(await feeDistributor.txFeeBalance(ethAssetId)).to.equal(0n);
      }

      {
        const amount = 1n;
        await userAsset.approve(feeDistributor.address, amount);
        await userFeeDistributor.deposit(asset.id, amount);
        expect(await feeDistributor.txFeeBalance(asset.id)).to.equal(0n);
        expect(await feeDistributor.txFeeBalance(ethAssetId)).to.equal(minOutputEth);
      }
    });

    it('only owner can change convertConstant', async () => {
      const userFeeDistributor = feeDistributor.connect(users[0]);
      const convertConstant = 100n;
      expect(await feeDistributor.convertConstant()).not.to.equal(convertConstant);
      await expect(userFeeDistributor.setConvertConstant(convertConstant)).to.be.revertedWith(
        'Ownable: caller is not the owner',
      );
      await feeDistributor.setConvertConstant(convertConstant);
      expect(await feeDistributor.convertConstant()).to.equal(convertConstant);
    });

    it('use new convertConstant', async () => {
      const asset = tokenAssets[0];
      const convertConstant = 100n;
      await feeDistributor.setConvertConstant(convertConstant);
      expect(await feeDistributor.convertConstant()).to.equal(convertConstant);

      const minOutputEth = convertConstant * gasPrice;
      const weth = await feeDistributor.WETH();
      const amountsIn = await router.getAmountsIn(minOutputEth, [asset.contract.address, weth]);
      const amount = BigInt(amountsIn[0]);

      await asset.contract.connect(users[0]).approve(feeDistributor.address, amount);
      await feeDistributor.connect(users[0]).deposit(asset.id, amount);

      expect(await feeDistributor.txFeeBalance(asset.id)).to.equal(0);
      expect(await feeDistributor.txFeeBalance(ethAssetId)).to.equal(minOutputEth);
    });
  });

  describe('reimburseGas', () => {
    it('reimburse eth to recipient', async () => {
      const [user] = users;
      const userAddress = await user.getAddress();

      expect(await feeDistributor.txFeeBalance(ethAssetId)).to.equal(0n);

      const initialFeeDistributorBalance = 10n ** 18n;
      await topup(ethAssetId, initialFeeDistributorBalance);

      expect(await feeDistributor.txFeeBalance(ethAssetId)).to.equal(initialFeeDistributorBalance);

      const initialUserBalance = BigInt((await user.getBalance()).toString());
      const gasUsed = 123n;
      const expected = (gasUsed + reimburseConstant) * gasPrice;

      await feeClaimer.claimFee(gasUsed, expected, userAddress);

      expect(await feeDistributor.txFeeBalance(ethAssetId)).to.equal(initialFeeDistributorBalance - expected);
      expect(await user.getBalance()).to.equal(initialUserBalance + expected);
    });

    it('cannot be called by anyone other than the rollup processor', async () => {
      const [user] = users;
      const userAddress = await user.getAddress();

      await topup(ethAssetId, 10n ** 18n);

      await expect(feeDistributor.connect(user).reimburseGas(1n, 1n, userAddress)).to.be.revertedWith('INVALID_CALLER');
    });

    it('cannot cost more gas than fee limit', async () => {
      const [user] = users;
      const userAddress = await user.getAddress();

      await topup(ethAssetId, 10n ** 18n);

      const gasUsed = 123n;
      const expected = (gasUsed + reimburseConstant) * gasPrice;
      const feeLimit = expected - 1n;

      await expect(feeClaimer.claimFee(gasUsed, feeLimit, userAddress)).to.be.revertedWith('FEE_LIMIT_EXCEEDED');
    });

    it('cannot reimburse more than the current balance', async () => {
      const [user] = users;
      const userAddress = await user.getAddress();
      const gasUsed = 123n;
      const expected = (gasUsed + reimburseConstant) * gasPrice;

      await topup(ethAssetId, expected - 1n);

      await expect(feeClaimer.claimFee(gasUsed, expected, userAddress)).to.be.revertedWith('REIMBURSE_GAS_FAILED');
    });

    it('only owner can change reimburseConstant', async () => {
      const userFeeDistributor = feeDistributor.connect(users[0]);
      const reimburseConstant = 100n;
      expect(await feeDistributor.reimburseConstant()).not.to.equal(reimburseConstant);
      await expect(userFeeDistributor.setReimburseConstant(reimburseConstant)).to.be.revertedWith(
        'Ownable: caller is not the owner',
      );
      await feeDistributor.setReimburseConstant(reimburseConstant);
      expect(await feeDistributor.reimburseConstant()).to.equal(reimburseConstant);
    });
  });

  describe('convert', () => {
    it('convert asset balance to eth', async () => {
      const assetId = pairs[0].asset.id;

      expect(await feeDistributor.txFeeBalance(assetId)).to.equal(0n);
      expect(await feeDistributor.txFeeBalance(ethAssetId)).to.equal(0n);

      const balance = 10n;
      await topup(assetId, balance);

      const fee = 1n;
      const minOutputValue = 9n;
      expect(await feeDistributor.txFeeBalance(assetId)).to.equal(balance);
      expect(await feeDistributor.txFeeBalance(ethAssetId)).to.equal(0n);

      await feeDistributor.convert(assetId, minOutputValue);

      expect(await feeDistributor.txFeeBalance(assetId)).to.equal(0n);
      expect(await feeDistributor.txFeeBalance(ethAssetId)).to.equal(balance - fee);
    });

    it('cannot be called by anyone other than the owner', async () => {
      const userFeeDistributor = feeDistributor.connect(users[0]);
      await expect(userFeeDistributor.convert(0, 0n)).to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('revert if output will be less than minOutputValue', async () => {
      const assetId = pairs[0].asset.id;
      const balance = 10n;
      await topup(assetId, balance);

      const minOutputValue = balance;
      await expect(feeDistributor.convert(assetId, minOutputValue)).to.be.revertedWith('INSUFFICIENT_OUTPUT_AMOUNT');
    });

    it('cannot convert eth to eth', async () => {
      await expect(feeDistributor.convert(ethAssetId, 0n)).to.be.revertedWith('NOT_A_TOKEN_ASSET');
    });

    it('revert if asset balance is empty', async () => {
      const assetId = pairs[0].asset.id;
      await expect(feeDistributor.convert(assetId, 1n)).to.be.revertedWith('EMPTY_BALANCE');
    });
  });
});
