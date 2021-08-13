import { EthAddress } from '@aztec/barretenberg/address';
import { AssetId } from '@aztec/barretenberg/asset';
import { EthereumProvider, PermitArgs, SendTxOptions } from '@aztec/barretenberg/blockchain';
import { Block } from '@aztec/barretenberg/block_source';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { DefiInteractionNote } from '@aztec/barretenberg/note_algorithms';
import { RollupProofData } from '@aztec/barretenberg/rollup_proof';
import { TxHash } from '@aztec/barretenberg/tx_hash';
import { TransactionReceipt, TransactionResponse } from '@ethersproject/abstract-provider';
import { Web3Provider } from '@ethersproject/providers';
import { Contract, utils, Event } from 'ethers';
import { ViewingKey } from '@aztec/barretenberg/viewing_key';
import { abi } from '../../artifacts/contracts/RollupProcessor.sol/RollupProcessor.json';
import { solidityFormatSignatures } from './solidity_format_signatures';

const fixEthersStackTrace = (err: Error) => {
  err.stack! += new Error().stack;
  throw err;
};

export class RollupProcessor {
  public rollupProcessor: Contract;
  private lastQueriedRollupId?: number;
  private lastQueriedRollupBlockNum?: number;
  private provider: Web3Provider;

  constructor(
    private rollupContractAddress: EthAddress,
    provider: EthereumProvider,
    private defaults: SendTxOptions = { gasLimit: 1000000 },
  ) {
    this.provider = new Web3Provider(provider);
    this.rollupProcessor = new Contract(rollupContractAddress.toString(), abi, this.provider);
  }

  get address() {
    return this.rollupContractAddress;
  }

  get contract() {
    return this.rollupProcessor;
  }

  async feeDistributor() {
    return EthAddress.fromString(await this.rollupProcessor.feeDistributor());
  }

  async setFeeDistributor(addr: EthAddress, options: SendTxOptions = {}) {
    const contract = this.getContractWithSigner(options);
    await contract.setFeeDistributor(addr.toString());
  }

  async numberOfAssets() {
    return +(await this.rollupProcessor.numberOfAssets());
  }

  async numberOfBridgeCalls() {
    return +(await this.rollupProcessor.numberOfBridgeCalls());
  }

  async nextRollupId() {
    return +(await this.rollupProcessor.nextRollupId());
  }

  async dataSize() {
    return +(await this.rollupProcessor.dataSize());
  }

  async dataRoot() {
    return Buffer.from((await this.rollupProcessor.dataRoot()).slice(2), 'hex');
  }

  async nullRoot() {
    return Buffer.from((await this.rollupProcessor.nullRoot()).slice(2), 'hex');
  }

  async rootRoot() {
    return Buffer.from((await this.rollupProcessor.rootRoot()).slice(2), 'hex');
  }

  async defiRoot() {
    return Buffer.from((await this.rollupProcessor.defiRoot()).slice(2), 'hex');
  }

  async defiInteractionHash() {
    return Buffer.from((await this.rollupProcessor.defiInteractionHash()).slice(2), 'hex');
  }

  async totalDeposited() {
    return ((await this.rollupProcessor.getTotalDeposited()) as string[]).map(v => BigInt(v));
  }

  async totalWithdrawn() {
    return ((await this.rollupProcessor.getTotalWithdrawn()) as string[]).map(v => BigInt(v));
  }

  async totalFees() {
    return ((await this.rollupProcessor.getTotalFees()) as string[]).map(v => BigInt(v));
  }

  async totalPendingDeposit() {
    return ((await this.rollupProcessor.getTotalPendingDeposit()) as string[]).map(v => BigInt(v));
  }

  async getSupportedAsset(assetId: AssetId) {
    return EthAddress.fromString(await this.rollupProcessor.getSupportedAsset(assetId));
  }

  async getSupportedAssets() {
    const assetAddresses: string[] = await this.rollupProcessor.getSupportedAssets();
    return [EthAddress.ZERO, ...assetAddresses.map((a: string) => EthAddress.fromString(a))];
  }

  async setVerifier(address: EthAddress, options: SendTxOptions = {}) {
    const { gasLimit, gasPrice } = { ...options, ...this.defaults };
    const rollupProcessor = this.getContractWithSigner(options);
    const tx = await rollupProcessor.setVerifier(address.toString(), { gasLimit, gasPrice }).catch(fixEthersStackTrace);
    return TxHash.fromString(tx.hash);
  }

  async setSupportedAsset(assetAddress: EthAddress, supportsPermit: boolean, options: SendTxOptions = {}) {
    const { gasLimit, gasPrice } = { ...options, ...this.defaults };
    const rollupProcessor = this.getContractWithSigner(options);
    const tx = await rollupProcessor
      .setSupportedAsset(assetAddress.toString(), supportsPermit, { gasLimit, gasPrice })
      .catch(fixEthersStackTrace);
    return TxHash.fromString(tx.hash);
  }

  async getAssetPermitSupport(assetId: AssetId): Promise<boolean> {
    return this.rollupProcessor.getAssetPermitSupport(assetId);
  }

  async getEscapeHatchStatus() {
    const [escapeOpen, blocksRemaining]: [boolean, any] = await this.rollupProcessor.getEscapeHatchStatus();
    return { escapeOpen, blocksRemaining: +blocksRemaining };
  }

  async createEscapeHatchProofTx(proofData: Buffer, viewingKeys: ViewingKey[], signatures: Buffer[]) {
    const formattedSignatures = solidityFormatSignatures(signatures);
    const tx = await this.rollupProcessor.populateTransaction
      .escapeHatch(
        `0x${proofData.toString('hex')}`,
        formattedSignatures,
        Buffer.concat(viewingKeys.map(vk => vk.toBuffer())),
      )
      .catch(fixEthersStackTrace);
    return Buffer.from(tx.data!.slice(2), 'hex');
  }

  async createRollupProofTx(
    proofData: Buffer,
    signatures: Buffer[],
    viewingKeys: ViewingKey[],
    providerSignature: Buffer,
    providerAddress: EthAddress,
    feeReceiver: EthAddress,
    feeLimit = BigInt(10) ** BigInt(18),
  ) {
    const formattedSignatures = solidityFormatSignatures(signatures);
    const tx = await this.rollupProcessor.populateTransaction
      .processRollup(
        `0x${proofData.toString('hex')}`,
        formattedSignatures,
        Buffer.concat(viewingKeys.map(vk => vk.toBuffer())),
        providerSignature,
        providerAddress.toString(),
        feeReceiver.toString(),
        feeLimit,
      )
      .catch(fixEthersStackTrace);
    return Buffer.from(tx.data!.slice(2), 'hex');
  }

  public async sendTx(data: Buffer, options: SendTxOptions = {}) {
    const { signingAddress, gasLimit } = { ...options, ...this.defaults };
    const signer = signingAddress ? this.provider.getSigner(signingAddress.toString()) : this.provider.getSigner(0);
    const from = await signer.getAddress();
    const providerGasPrice = BigInt((await this.provider.getGasPrice()).toString());
    const gasPrice = options.gasPrice || providerGasPrice;
    const txRequest = {
      to: this.rollupContractAddress.toString(),
      from,
      gasLimit,
      gasPrice: `0x${gasPrice.toString(16)}`,
      data,
    };
    const txResponse = await signer.sendTransaction(txRequest).catch(fixEthersStackTrace);
    return TxHash.fromString(txResponse.hash);
  }

  async depositPendingFunds(assetId: AssetId, amount: bigint, permitArgs?: PermitArgs, options: SendTxOptions = {}) {
    const { gasPrice, gasLimit } = { ...options, ...this.defaults };
    const rollupProcessor = this.getContractWithSigner(options);
    const depositorAddress = await rollupProcessor.signer.getAddress();
    if (permitArgs) {
      const tx = await rollupProcessor
        .depositPendingFundsPermit(
          assetId,
          amount,
          depositorAddress,
          this.rollupProcessor.address,
          permitArgs.approvalAmount,
          permitArgs.deadline,
          permitArgs.signature.v,
          permitArgs.signature.r,
          permitArgs.signature.s,
          { value: assetId === 0 ? amount : undefined, gasPrice, gasLimit },
        )
        .catch(fixEthersStackTrace);
      return TxHash.fromString(tx.hash);
    } else {
      const tx = await rollupProcessor
        .depositPendingFunds(assetId, amount, depositorAddress, {
          value: assetId === 0 ? amount : undefined,
          gasPrice,
          gasLimit,
        })
        .catch(fixEthersStackTrace);
      return TxHash.fromString(tx.hash);
    }
  }

  async approveProof(proofHash: Buffer, options: SendTxOptions = {}) {
    const { gasPrice, gasLimit } = { ...options, ...this.defaults };
    const rollupProcessor = this.getContractWithSigner(options);
    const tx = await rollupProcessor.approveProof(proofHash, { gasPrice, gasLimit }).catch(fixEthersStackTrace);
    return TxHash.fromString(tx.hash);
  }

  async getProofApprovalStatus(address: EthAddress, txId: Buffer): Promise<boolean> {
    return await this.rollupProcessor.depositProofApprovals(address.toString(), txId);
  }

  async getUserPendingDeposit(assetId: AssetId, account: EthAddress) {
    return BigInt(await this.rollupProcessor.getUserPendingDeposit(assetId, account.toString()));
  }

  private async getEarliestBlock() {
    const net = await this.provider.getNetwork();
    return net.chainId === 1 ? 11967192 : 0;
  }

  /**
   * Returns all rollup blocks from (and including) the given rollupId, with >= minConfirmations.
   *
   * A normal geth node has terrible performance when searching event logs. To ensure we are not dependent
   * on third party services such as Infura, we apply an algorithm to mitigate the poor performance.
   * The algorithm will search for rollup events from the end of the chain, in chunks of blocks.
   * If it finds a rollup <= to the given rollupId, we can stop searching.
   *
   * The worst case situation is when requesting all rollups from rollup 0, or when there are no events to find.
   * In this case, we will have ever degrading performance as we search from the end of the chain to the
   * block returned by getEarliestBlock() (hardcoded on mainnet). This is a rare case however.
   *
   * The more normal case is we're given a rollupId that is not 0. In this case we know an event must exist.
   * Further, the usage pattern is that anyone making the request will be doing so with an ever increasing rollupId.
   * This lends itself well to searching backwards from the end of the chain.
   *
   * The chunk size affects performance. If no previous query has been made, or the rollupId < the previous requested
   * rollupId, the chunk size is to 100,000. This is the case when the class is queried the first time.
   * 100,000 blocks is ~10 days of blocks, so assuming there's been a rollup in the last 10 days, or the client is not
   * over 10 days behind, a single query will suffice. Benchmarks suggest this will take ~2 seconds per chunk.
   *
   * If a previous query has been made and the rollupId >= previous query, the first chunk will be from the last result
   * rollups block to the end of the chain. This provides best performance for polling clients.
   */
  public async getRollupBlocksFrom(rollupId: number, minConfirmations: number) {
    const earliestBlock = await this.getEarliestBlock();
    let end = await this.provider.getBlockNumber();
    const chunk = 100000;
    let start =
      this.lastQueriedRollupId === undefined || rollupId < this.lastQueriedRollupId
        ? Math.max(end - chunk, 0)
        : this.lastQueriedRollupBlockNum!;
    let events: Event[] = [];

    while (end > earliestBlock) {
      const rollupFilter = this.rollupProcessor.filters.RollupProcessed();
      const rollupEvents = await this.rollupProcessor.queryFilter(rollupFilter, start, end);
      events = [...rollupEvents, ...events];
      if (events.length && events[0].args!.rollupId.toNumber() <= rollupId) {
        this.lastQueriedRollupId = rollupId;
        this.lastQueriedRollupBlockNum = events[events.length - 1].blockNumber;
        break;
      }
      end = Math.max(start - 1, 0);
      start = Math.max(end - chunk, 0);
    }

    return this.getRollupBlocksFromEvents(
      events.filter(e => e.args!.rollupId.toNumber() >= rollupId),
      minConfirmations,
    );
  }

  private async getRollupBlocksFromEvents(rollupEvents: Event[], minConfirmations: number) {
    const meta = (
      await Promise.all(
        rollupEvents.map(event =>
          Promise.all([
            event.getTransaction(),
            event.getBlock(),
            event.getTransactionReceipt(),
            this.getDefiBridgeEvents(event.blockNumber),
          ]),
        ),
      )
    ).filter(m => m[0].confirmations >= minConfirmations);

    return meta.map(meta => this.decodeBlock({ ...meta[0], timestamp: meta[1].timestamp }, meta[2], meta[3]));
  }

  private async getDefiBridgeEvents(blockNo: number) {
    const filter = this.rollupProcessor.filters.DefiBridgeProcessed();
    const defiBridgeEvents = await this.rollupProcessor.queryFilter(filter, blockNo, blockNo);
    return defiBridgeEvents.map((log: { blockNumber: number; topics: string[]; data: string }) => {
      const {
        args: { bridgeId, nonce, totalInputValue, totalOutputValueA, totalOutputValueB, result },
      } = this.contract.interface.parseLog(log);
      return new DefiInteractionNote(
        BridgeId.fromBigInt(BigInt(bridgeId)),
        +nonce,
        BigInt(totalInputValue),
        BigInt(totalOutputValueA),
        BigInt(totalOutputValueB),
        result,
      );
    });
  }

  private decodeBlock(
    tx: TransactionResponse,
    receipt: TransactionReceipt,
    interactionResult: DefiInteractionNote[],
  ): Block {
    const rollupAbi = new utils.Interface(abi);
    const result = rollupAbi.parseTransaction({ data: tx.data });
    const rollupProofData = Buffer.from(result.args.proofData.slice(2), 'hex');
    const viewingKeysData = Buffer.from(result.args.viewingKeys.slice(2), 'hex');

    return {
      created: new Date(tx.timestamp! * 1000),
      txHash: TxHash.fromString(tx.hash),
      rollupProofData,
      viewingKeysData,
      interactionResult,
      rollupId: RollupProofData.getRollupIdFromBuffer(rollupProofData),
      rollupSize: RollupProofData.getRollupSizeFromBuffer(rollupProofData),
      gasPrice: BigInt(tx.gasPrice!.toString()),
      gasUsed: receipt.gasUsed.toNumber(),
    };
  }

  private getContractWithSigner(options: SendTxOptions) {
    const { signingAddress } = options;
    const provider = options.provider ? new Web3Provider(options.provider) : this.provider;
    const ethSigner = provider.getSigner(signingAddress ? signingAddress.toString() : 0);
    return new Contract(this.rollupContractAddress.toString(), abi, ethSigner);
  }
}
