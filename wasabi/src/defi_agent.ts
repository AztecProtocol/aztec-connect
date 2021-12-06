import { Signer, Wallet } from 'ethers';
import {
  WalletSdk,
  WalletProvider,
  SchnorrSigner,
  AssetId,
  EthAddress,
  toBaseUnits,
  WalletSdkUser,
  WalletSdkUserAsset,
  MemoryFifo,
  TxType,
  BridgeId,
} from '@aztec/sdk';
import { randomBytes } from 'crypto';
import { Agent } from './agent';

const BASE_GAS = 10000; // configured on falafel

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
    numTxs: 3,
    gas: 30000n,
    rollupFrequency: 2,
    gasCost: toBaseUnits('200', 12),
  },
  {
    //bridgeId: '0x0000000000000000000000000000000000000000000000000000000100000003',
    inputAsset: AssetId.DAI,
    outputAsset: AssetId.ETH,
    addressId: 3,
    numTxs: 3,
    gas: 30000n,
    rollupFrequency: 2,
    gasCost: toBaseUnits('500', 12),
  },
];

const getBridgeTxCost = (bridgeSpec: BridgeSpec) => {
  // the fee for a defi deposit isn't well defined over the sdk at the moment. we need to construct it ourselves
  let txGas = BigInt(BASE_GAS) + bridgeSpec.gas / BigInt(bridgeSpec.numTxs);
  // need to double the fee in order for the DEFI claim to be rolled up
  txGas *= 2n;
  const txFee = txGas * bridgeSpec.gasCost;
  return txFee;
};

export class DefiAgent extends Agent {
  private wallet: Wallet;
  private address: EthAddress;
  private signer!: SchnorrSigner;
  private user!: WalletSdkUser;
  private userAsset!: WalletSdkUserAsset;

  constructor(
    sdk: WalletSdk,
    provider: WalletProvider,
    private masterWallet: Signer,
    id: number,
    queue: MemoryFifo<() => Promise<void>>,
    private loop: boolean,
    private numTransferPairs: number,
  ) {
    super('Defi', sdk, id, queue);
    this.wallet = Wallet.createRandom();
    this.address = provider.addEthersWallet(this.wallet);
  }

  public async run() {
    const privateKey = randomBytes(32);
    this.user = await this.sdk.addUser(privateKey, undefined, true);
    this.userAsset = this.user.getAsset(AssetId.ETH);
    this.signer = this.user.getSigner();
    do {
      try {
        await this.serializeTx(() => this.fundAccount());

        for (let i = 0; i < this.numTransferPairs; i++) {
          console.log(`${this.agentId()} swapping ETH for DAI iteration: ${i}`);
          await this.serializeTx(() => this.singleDefiSwap(bridgeConfigs[0], i));
          console.log(`${this.agentId()} swapping DAI for ETH iteration: ${i}`);
          await this.serializeTx(() => this.singleDefiSwap(bridgeConfigs[1], i));
        }
        await this.serializeTx(this.withdraw);
      } catch (err: any) {
        console.log(err.message);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } while (this.loop);
  }

  private async fundAccount() {
    // Nothing to do if we have a balance.
    if (this.sdk.getBalance(AssetId.ETH, this.user.id)) {
      return;
    }
    const depositFee = await this.userAsset.getFee(TxType.DEPOSIT);
    const withdrawFee = await this.userAsset.getFee(TxType.WITHDRAW_TO_WALLET);

    const ethToDeposit = 1n;
    let weiToDeposit = toBaseUnits(ethToDeposit.toString(), 18) + depositFee + withdrawFee;
    weiToDeposit +=
      BigInt(this.numTransferPairs) * (getBridgeTxCost(bridgeConfigs[0]) + getBridgeTxCost(bridgeConfigs[1]));

    console.log(`${this.agentId()} depositing ${formatNumber(weiToDeposit)} wei into account`);

    await this.fundEthAddress(weiToDeposit);
    await this.depositToContract(weiToDeposit);
    return await this.deposit();
  }

  private async fundEthAddress(deposit: bigint) {
    // Fund enough to ensure we can pay tx fee to deposit to contract.
    const balance = await this.sdk.getPublicBalance(AssetId.ETH, this.address);
    const toFund = toBaseUnits('2', 16);
    const required = toFund + deposit;

    console.log(
      `${this.agentId()} balance: ${formatNumber(balance)}, to fund: ${formatNumber(toFund)}, required: ${formatNumber(
        required,
      )}`,
    );

    if (balance >= required) {
      return;
    }

    const value = required - balance;
    console.log(`${this.agentId()} funding ${this.address} with ${value} wei...`);

    const tx = {
      to: this.address.toString(),
      value: `0x${value.toString(16)}`,
    };
    const { hash } = await this.masterWallet.sendTransaction(tx);
    console.log(`${this.agentId()} transaction sent`);
    await this.masterWallet.provider!.waitForTransaction(hash);
    console.log(`${this.agentId()} transaction completed`);
  }

  private async depositToContract(deposit: bigint) {
    console.log(`${this.agentId()} depositing to contract...`);
    await this.sdk.depositFundsToContract(AssetId.ETH, this.address, deposit);
    console.log(`${this.agentId()} deposit completed`);
  }

  private deposit = async () => {
    console.log(`${this.agentId()} depositing...`);
    const fee = await this.userAsset.getFee(TxType.DEPOSIT);
    const pendingDeposit = await this.userAsset.pendingDeposit(this.address);
    console.log(`${this.agentId()} pending deposit: ${pendingDeposit}`);
    const proof = await this.userAsset.createDepositProof(pendingDeposit - fee, fee, this.signer, this.address);
    const signature = await this.sdk.signProof(proof, this.address);
    return await this.sdk.sendProof(proof, signature);
  };

  private singleDefiSwap = async (spec: BridgeSpec, iteration: number) => {
    const outputAssetIdB = 0;
    const bridgeId = new BridgeId(
      spec.addressId,
      spec.inputAsset,
      spec.outputAsset,
      outputAssetIdB,
      0,
      false,
      false,
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
    let depositValue = this.sdk.toBaseUnits(spec.inputAsset, '1');
    depositValue -= txFee + jsTxFee;
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

  private withdraw = async () => {
    console.log(`${this.agentId()} withdrawing...`);
    const masterAddress = await this.masterWallet.getAddress();
    const fee = await this.userAsset.getFee(TxType.WITHDRAW_TO_WALLET);
    const balance = this.userAsset.balance();
    console.log(`${this.agentId()} withdrawing ${balance} WEI to wallet`);
    const proof = await this.userAsset.createWithdrawProof(
      balance - fee,
      fee,
      this.signer,
      EthAddress.fromString(masterAddress),
    );
    return await this.sdk.sendProof(proof);
  };
}
