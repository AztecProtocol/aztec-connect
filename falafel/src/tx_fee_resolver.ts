import { AssetId } from 'barretenberg/asset';
import { Blockchain, BlockchainAsset, PriceFeed, TxType } from 'barretenberg/blockchain';
import { JoinSplitProofData, ProofData } from 'barretenberg/client_proofs/proof_data';
import { AssetFeeQuote, SettlementTime } from 'barretenberg/rollup_provider';
import { TxDao } from './entity/tx';
import { RollupDb } from './rollup_db';

interface RollupPrice {
  rollupId: number;
  gasPrice: bigint;
  assetPrices: bigint[];
}

export class TxFeeResolver {
  private assets!: BlockchainAsset[];
  private rollupPrices: RollupPrice[] = [];
  private latestRollupId = 0;
  private running = false;
  private runningPromise!: Promise<void>;

  constructor(
    private blockchain: Blockchain,
    private rollupDb: RollupDb,
    private baseTxGas: number,
    private maxFeeGasPrice: bigint,
    private feeGasPriceMultiplier: number,
    private txsPerRollup: number,
    private publishInterval: number,
    private surplusRatios = [1, 0.9, 0.5, 0],
    private feeFreeAssets: AssetId[] = [],
  ) {}

  public async start() {
    const { assets } = await this.blockchain.getBlockchainStatus();
    this.assets = assets;

    await this.restorePrices();

    this.running = true;
    this.runningPromise = (async () => {
      while (this.running) {
        await this.recordRollupPrices();
        await new Promise(resolve => setTimeout(resolve, 1000 * +this.running));
      }
    })();
  }

  public async stop() {
    this.running = false;
    await this.runningPromise;
  }

  public getMinTxFee(assetId: number, txType: TxType, rollupId = this.latestRollupId) {
    if (txType === TxType.ACCOUNT) {
      return 0n;
    }
    return this.getFeeConstant(assetId, txType, rollupId) + this.getBaseFee(assetId, rollupId);
  }

  public getTxFee(assetId: number, txType: TxType, speed: SettlementTime, rollupId = this.latestRollupId) {
    if (txType === TxType.ACCOUNT) {
      return 0n;
    }
    const { feeConstants, baseFeeQuotes } = this.getFeeQuotes(assetId, rollupId);
    return feeConstants[txType] + baseFeeQuotes[speed].fee;
  }

  public getFeeQuotes(assetId: number, rollupId = this.latestRollupId): AssetFeeQuote {
    const baseFee = this.getBaseFee(assetId, rollupId);
    return {
      feeConstants: [
        TxType.DEPOSIT,
        TxType.TRANSFER,
        TxType.WITHDRAW_TO_WALLET,
        TxType.WITHDRAW_TO_CONTRACT,
      ].map(txType => this.getFeeConstant(assetId, txType, rollupId)),
      baseFeeQuotes: this.surplusRatios.map(ratio => ({
        fee: baseFee * (1n + BigInt(Math.round(this.txsPerRollup * (1 - ratio)))),
        time: Math.max(5 * 60, this.publishInterval * ratio),
      })),
    };
  }

  public computeSurplusRatio(txs: TxDao[], rollupId = this.latestRollupId) {
    const baseFee = this.getBaseFee(AssetId.ETH, rollupId);
    if (!baseFee) {
      return 1;
    }

    const feeSurplus = txs
      .map(tx => {
        const { assetId, txFee } = this.getFeeForTxDao(tx);
        const minFee = this.getMinTxFee(assetId, tx.txType, rollupId);
        return this.toEthPrice(assetId, txFee - minFee, rollupId);
      })
      .reduce((acc, surplus) => acc + surplus, 0n);
    const ratio = 1 - Number(feeSurplus / baseFee) / this.txsPerRollup;
    return Math.min(1, Math.max(0, ratio));
  }

  private getFeeForTxDao(tx: TxDao) {
    if (tx.txType === TxType.ACCOUNT) {
      return { assetId: AssetId.ETH, txFee: 0n };
    }

    const {
      assetId,
      proofData: { txFee },
    } = new JoinSplitProofData(new ProofData(tx.proofData));
    return { assetId, txFee };
  }

  private getBaseFee(assetId: AssetId, rollupId = this.latestRollupId) {
    return this.toAssetPrice(assetId, BigInt(this.baseTxGas), rollupId);
  }

  private getFeeConstant(assetId: AssetId, txType: TxType, rollupId = this.latestRollupId) {
    return this.toAssetPrice(assetId, BigInt(this.assets[assetId].gasConstants[txType]), rollupId);
  }

  private toAssetPrice(assetId: AssetId, gas: bigint, rollupId: number) {
    const { assetPrices } = this.rollupPrices.find(p => p.rollupId === rollupId) || this.rollupPrices[0];
    const decimals = this.assets[assetId].decimals;
    return !assetPrices[assetId]
      ? 0n
      : this.applyGasPrice(rollupId, gas * 10n ** BigInt(decimals)) / assetPrices[assetId];
  }

  private toEthPrice(assetId: AssetId, price: bigint, rollupId: number) {
    if (assetId === AssetId.ETH || !price) {
      return price;
    }

    const { assetPrices } = this.rollupPrices.find(p => p.rollupId === rollupId) || this.rollupPrices[0];
    return price * assetPrices[assetId];
  }

  private applyGasPrice(rollupId: number, value: bigint) {
    const { gasPrice } = this.rollupPrices.find(p => p.rollupId === rollupId) || this.rollupPrices[0];
    const expectedValue = (value * gasPrice * BigInt(this.feeGasPriceMultiplier * 100)) / 100n;
    const maxValue = this.maxFeeGasPrice ? value * this.maxFeeGasPrice : expectedValue;
    return expectedValue > maxValue ? maxValue : expectedValue;
  }

  private async restorePrices() {
    const [latestRollup] = await this.rollupDb.getRollups(1, 0, true);
    const rollupId = latestRollup ? latestRollup.id + 1 : 0;
    const latestTimestamp = Math.floor((latestRollup ? latestRollup.created.getTime() : Date.now()) / 1000);
    const [gasPrice, ...assetPrices] = await Promise.all(
      [
        this.blockchain.getGasPriceFeed(),
        ...this.assets.map((_, assetId) => this.blockchain.getPriceFeed(assetId)),
      ].map((priceFeed, i) =>
        this.feeFreeAssets.indexOf(i - 1) >= 0 ? 0n : this.restoreAssetPrices(priceFeed, latestTimestamp),
      ),
    );
    this.rollupPrices = [
      {
        rollupId,
        gasPrice,
        assetPrices,
      },
    ];
  }

  private async restoreAssetPrices(priceFeed: PriceFeed, latestTimestamp: number) {
    let data = await priceFeed.getRoundData(await priceFeed.latestRound());
    let prevPrice = 0n;
    while (data.timestamp > latestTimestamp && data.roundId >= 0) {
      prevPrice = data.price;
      data = await priceFeed.getRoundData(data.roundId - 1n);
    }
    return data.price || prevPrice;
  }

  private async recordRollupPrices() {
    const [latestRollup] = await this.rollupDb.getRollups(1, 0, true);
    const rollupId = latestRollup ? latestRollup.id + 1 : 0;
    if (!this.rollupPrices.find(r => r.rollupId === rollupId)) {
      const [gasPrice, ...assetPrices] = await Promise.all([
        this.blockchain.getGasPriceFeed().price(),
        ...this.assets.map((_, id) => (this.feeFreeAssets.indexOf(id) >= 0 ? 0n : this.blockchain.getAssetPrice(id))),
      ]);
      const rollupPrice = {
        rollupId,
        gasPrice,
        assetPrices,
      };
      this.rollupPrices = [rollupPrice, ...this.rollupPrices].slice(0, 10); // Keep prices for the latest 10 rollups.
      this.latestRollupId = rollupId;
    }
  }
}
