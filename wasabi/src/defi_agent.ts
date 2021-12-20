import {
  WalletSdk,
  WalletProvider,
  AssetId,
  EthAddress,
  toBaseUnits,
  MemoryFifo,
  TxType,
  BridgeId,
  BitConfig,
} from '@aztec/sdk';
import { Agent } from './agent';
import { Stats } from './stats';

const BASE_GAS = 10000; // configured on falafel
const ETH_GAS_PRICE = 200000000000n;
const DAI_GAS_PRICE = 500000000000000n;

const formatNumber = (x: bigint) => {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

interface BridgeSpec {
  inputAsset: AssetId;
  outputAsset: AssetId;
  addressId: number;
  numTxs: number;
  gas: bigint;
  gasCost: bigint;
  rollupFrequency: number;
}

const bridgeConfigs: BridgeSpec[] = [
  {
    //bridgeId: '0x0000000000000000000000000000000000000000000000004000000000000001',
    inputAsset: AssetId.ETH,
    outputAsset: AssetId.DAI,
    addressId: 1,
    numTxs: 10,
    gas: 100000n,
    rollupFrequency: 2,
    gasCost: ETH_GAS_PRICE,
  },
  {
    //bridgeId: '0x0000000000000000000000000000000000000000000000000000000100000003',
    inputAsset: AssetId.DAI,
    outputAsset: AssetId.ETH,
    addressId: 3,
    numTxs: 10,
    gas: 100000n,
    rollupFrequency: 2,
    gasCost: DAI_GAS_PRICE,
  },
];

const getBridgeTxCost = (bridgeSpec: BridgeSpec) => {
  // the fee for a defi deposit isn't well defined over the sdk at the moment. we need to construct it ourselves
  const txGas = BigInt(BASE_GAS) + bridgeSpec.gas / BigInt(bridgeSpec.numTxs);
  const txFee = txGas * bridgeSpec.gasCost;
  return txFee;
};

export class DefiAgent extends Agent {
  constructor(
    fundsSourceAddress: EthAddress,
    sdk: WalletSdk,
    provider: WalletProvider,
    id: number,
    queue: MemoryFifo<() => Promise<void>>,
    private numTransferPairs: number,
  ) {
    super('Defi', fundsSourceAddress, sdk, id, provider, queue);
  }

  public async run(stats: Stats) {
    try {
      await this.serializeTx(this.completePendingDeposit);
      stats.numDeposits++;
      for (let i = 0; i < this.numTransferPairs; i++) {
        console.log(`${this.agentId()} swapping ETH for DAI iteration: ${i}`);
        await this.serializeTx(() => this.singleDefiSwap(bridgeConfigs[0], i));
        stats.numDefi++;
        console.log(`${this.agentId()} swapping DAI for ETH iteration: ${i}`);
        await this.serializeTx(() => this.singleDefiSwap(bridgeConfigs[1], i));
        stats.numDefi++;
      }
      await this.serializeTx(this.withdraw);
      stats.numWithdrawals++;
    } catch (err: any) {
      console.log(`ERROR: `, err);
    }
  }

  protected getInitialDeposit() {
    return this.calcDeposit();
  }

  private async calcDeposit() {
    // Nothing to do if we have a balance.
    if (this.sdk.getBalance(AssetId.ETH, this.user.id)) {
      return;
    }
    const depositFee = this.depositFee ?? await this.userAsset.getFee(TxType.DEPOSIT);
    const withdrawFee = await this.userAsset.getFee(TxType.WITHDRAW_TO_WALLET);

    const ethToDeposit = 1n;
    let weiToDeposit = toBaseUnits(ethToDeposit.toString(), 18) + depositFee + withdrawFee + this.payoutFee;
    weiToDeposit +=
      BigInt(this.numTransferPairs) * (getBridgeTxCost(bridgeConfigs[0]) + getBridgeTxCost(bridgeConfigs[1]));

    console.log(`${this.agentId()} depositing ${formatNumber(weiToDeposit)} wei into account`);

    return weiToDeposit;
  }

  private singleDefiSwap = async (spec: BridgeSpec, iteration: number) => {
    const outputAssetIdB = 0;
    const bridgeId = new BridgeId(
      spec.addressId,
      spec.inputAsset,
      spec.outputAsset,
      outputAssetIdB,
      0,
      new BitConfig(false, false, false, false, false, false),  
      0,
    );
    const currentBalanceInputAsset = this.sdk.getBalance(spec.inputAsset, this.user.id);
    const currentBalanceOutputAsset = this.sdk.getBalance(spec.outputAsset, this.user.id);
    console.log(
      `${this.agentId()} balances, input: ${formatNumber(currentBalanceInputAsset)}, output: ${formatNumber(
        currentBalanceOutputAsset,
      )}`,
    );
    const txFee = getBridgeTxCost(spec);
    console.log(`${this.agentId()} defi fee: ${formatNumber(txFee)}`);
    const jsTxFee = await this.sdk.getFee(spec.inputAsset, TxType.TRANSFER);
    console.log(`${this.agentId()} JS fee: ${jsTxFee}`);
    const depositValue = this.sdk.toBaseUnits(spec.inputAsset, '1');
    console.log(
      `${this.agentId()} swapping ${formatNumber(depositValue)} units of asset ${spec.inputAsset} for asset ${
        spec.outputAsset
      }`,
    );
    console.log(`${this.agentId()} building Defi proof`);
    const proofOutput = await this.sdk.createDefiProof(
      bridgeId,
      this.user.id,
      depositValue,
      txFee + jsTxFee,
      this.signer,
    );
    console.log(`${this.agentId()} sending Defi proof, defi hash: ${proofOutput.tx.txHash}`);
    return await this.sdk.sendProof(proofOutput);
  };
}
