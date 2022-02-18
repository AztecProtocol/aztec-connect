import { EthAddress } from '@aztec/barretenberg/address';
import { EthereumProvider, PermitArgs, SendTxOptions, TxHash } from '@aztec/barretenberg/blockchain';
import { Block } from '@aztec/barretenberg/block_source';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { DefiInteractionNote } from '@aztec/barretenberg/note_algorithms';
import { sliceOffchainTxData } from '@aztec/barretenberg/offchain_tx_data';
import { RollupProofData } from '@aztec/barretenberg/rollup_proof';
import { TransactionReceipt, TransactionResponse } from '@ethersproject/abstract-provider';
import { Web3Provider } from '@ethersproject/providers';
import { Contract, Event, utils } from 'ethers';
import { abi } from '../../artifacts/contracts/RollupProcessor.sol/RollupProcessor.json';
import { solidityFormatSignatures } from './solidity_format_signatures';

const fixEthersStackTrace = (err: Error) => {
  err.stack! += new Error().stack;
  throw err;
};

/**
 * Thin wrapper around the rollup processor contract. Provides a direct 1 to 1 interface for
 * querying contract state, creating and sending transactions, and querying for rollup blocks.
 */
export class RollupProcessor {
  public rollupProcessor: Contract;
  private lastQueriedRollupId?: number;
  private lastQueriedRollupBlockNum?: number;
  protected provider: Web3Provider;

  constructor(protected rollupContractAddress: EthAddress, provider: EthereumProvider) {
    this.provider = new Web3Provider(provider);
    this.rollupProcessor = new Contract(rollupContractAddress.toString(), abi, this.provider);
  }

  get address() {
    return this.rollupContractAddress;
  }

  get contract() {
    return this.rollupProcessor;
  }

  async verifier() {
    return EthAddress.fromString(await this.rollupProcessor.verifier());
  }

  async dataSize() {
    return +(await this.rollupProcessor.getDataSize());
  }

  async defiInteractionHashes() {
    const res = (await this.rollupProcessor.getDefiInteractionHashes()) as string[];
    return res.map(v => Buffer.from(v.slice(2), 'hex'));
  }

  async asyncDefiInteractionHashes() {
    const res = (await this.rollupProcessor.getAsyncDefiInteractionHashes()) as string[];
    return res.map(v => Buffer.from(v.slice(2), 'hex'));
  }

  async stateHash() {
    return Buffer.from((await this.rollupProcessor.rollupStateHash()).slice(2), 'hex');
  }

  async getSupportedBridge(bridgeAddressId: number) {
    return EthAddress.fromString(await this.rollupProcessor.getSupportedBridge(bridgeAddressId));
  }

  async getSupportedBridges() {
    const bridgeAddresses: string[] = await this.rollupProcessor.getSupportedBridges();
    return bridgeAddresses.map(a => EthAddress.fromString(a));
  }

  async getBridgeGas(bridgeAddressId: number) {
    return BigInt(await this.rollupProcessor.getBridgeGasLimit(bridgeAddressId));
  }

  async getBridgeAddressId(address: EthAddress) {
    const bridgeAddresses = await this.getSupportedBridges();
    return bridgeAddresses.findIndex(a => a.equals(address)) + 1;
  }

  async getSupportedAsset(assetId: number) {
    return EthAddress.fromString(await this.rollupProcessor.getSupportedAsset(assetId));
  }

  async getSupportedAssets() {
    const assetAddresses: string[] = await this.rollupProcessor.getSupportedAssets();
    return [EthAddress.ZERO, ...assetAddresses.map((a: string) => EthAddress.fromString(a))];
  }

  async setVerifier(address: EthAddress, options: SendTxOptions = {}) {
    const { gasLimit } = { ...options };
    const rollupProcessor = this.getContractWithSigner(options);
    const tx = await rollupProcessor.setVerifier(address.toString(), { gasLimit }).catch(fixEthersStackTrace);
    return TxHash.fromString(tx.hash);
  }

  async setSupportedBridge(bridgeAddress: EthAddress, bridgeGasLimit: number, options: SendTxOptions = {}) {
    const { gasLimit } = { ...options };
    const rollupProcessor = this.getContractWithSigner(options);
    const tx = await rollupProcessor
      .setSupportedBridge(bridgeAddress.toString(), bridgeGasLimit, { gasLimit })
      .catch(fixEthersStackTrace);
    return TxHash.fromString(tx.hash);
  }

  async setSupportedAsset(
    assetAddress: EthAddress,
    supportsPermit: boolean,
    assetGasLimit: number,
    options: SendTxOptions = {},
  ) {
    const { gasLimit } = { ...options };
    const rollupProcessor = this.getContractWithSigner(options);
    const tx = await rollupProcessor
      .setSupportedAsset(assetAddress.toString(), supportsPermit, assetGasLimit, { gasLimit })
      .catch(fixEthersStackTrace);
    return TxHash.fromString(tx.hash);
  }

  async processAsyncDefiInteraction(interactionNonce: number, options: SendTxOptions = {}) {
    const { gasLimit } = { ...options };
    const rollupProcessor = this.getContractWithSigner(options);
    const tx = await rollupProcessor
      .processAsyncDefiInteraction(interactionNonce, { gasLimit })
      .catch(fixEthersStackTrace);
    return TxHash.fromString(tx.hash);
  }

  async getAssetPermitSupport(assetId: number): Promise<boolean> {
    return this.rollupProcessor.getAssetPermitSupport(assetId);
  }

  async getEscapeHatchStatus() {
    const [escapeOpen, blocksRemaining]: [boolean, any] = await this.rollupProcessor.getEscapeHatchStatus();
    return { escapeOpen, blocksRemaining: +blocksRemaining };
  }

  async createRollupProofTx(proofData: Buffer, signatures: Buffer[], offchainTxData: Buffer[]) {
    const rollupProofData = RollupProofData.fromBuffer(proofData);
    const trailingData = proofData.slice(rollupProofData.toBuffer().length);
    const encodedProof = Buffer.concat([rollupProofData.encode(), trailingData]);
    const formattedSignatures = solidityFormatSignatures(signatures);
    const tx = await this.rollupProcessor.populateTransaction
      .processRollup(
        `0x${encodedProof.toString('hex')}`,
        formattedSignatures,
        `0x${Buffer.concat(offchainTxData).toString('hex')}`,
      )
      .catch(fixEthersStackTrace);
    return Buffer.from(tx.data!.slice(2), 'hex');
  }

  public async sendTx(data: Buffer, options: SendTxOptions = {}) {
    const { signingAddress, gasLimit } = { ...options };
    const signer = signingAddress ? this.provider.getSigner(signingAddress.toString()) : this.provider.getSigner(0);
    const from = await signer.getAddress();
    const txRequest = {
      to: this.rollupContractAddress.toString(),
      from,
      gasLimit,
      data,
    };
    const txResponse = await signer.sendTransaction(txRequest).catch(fixEthersStackTrace);
    return TxHash.fromString(txResponse.hash);
  }

  async depositPendingFunds(
    assetId: number,
    amount: bigint,
    proofHash: Buffer = Buffer.alloc(32),
    permitArgs?: PermitArgs,
    options: SendTxOptions = {},
  ) {
    const { gasLimit } = { ...options };
    const rollupProcessor = this.getContractWithSigner(options);
    const depositorAddress = await rollupProcessor.signer.getAddress();
    if (permitArgs) {
      const tx = await rollupProcessor
        .depositPendingFundsPermit(
          assetId,
          amount,
          depositorAddress,
          proofHash,
          this.rollupProcessor.address,
          permitArgs.approvalAmount,
          permitArgs.deadline,
          permitArgs.signature.v,
          permitArgs.signature.r,
          permitArgs.signature.s,
          { value: assetId === 0 ? amount : undefined, gasLimit },
        )
        .catch(fixEthersStackTrace);
      return TxHash.fromString(tx.hash);
    } else {
      const tx = await rollupProcessor
        .depositPendingFunds(assetId, amount, depositorAddress, proofHash, {
          value: assetId === 0 ? amount : undefined,
          gasLimit,
        })
        .catch(fixEthersStackTrace);
      return TxHash.fromString(tx.hash);
    }
  }

  async approveProof(proofHash: Buffer, options: SendTxOptions = {}) {
    const { gasLimit } = { ...options };
    const rollupProcessor = this.getContractWithSigner(options);
    const tx = await rollupProcessor.approveProof(proofHash, { gasLimit }).catch(fixEthersStackTrace);
    return TxHash.fromString(tx.hash);
  }

  async getProofApprovalStatus(address: EthAddress, txId: Buffer): Promise<boolean> {
    return await this.rollupProcessor.depositProofApprovals(address.toString(), txId);
  }

  async getUserPendingDeposit(assetId: number, account: EthAddress) {
    return BigInt(await this.rollupProcessor.getUserPendingDeposit(assetId, account.toString()));
  }

  private async getEarliestBlock() {
    const net = await this.provider.getNetwork();
    switch (net.chainId) {
      case 1:
        return { earliestBlock: 11967192, chunk: 100000 };
      case 0xa57ec:
        return { earliestBlock: 14000000, chunk: 10 };
      default:
        return { earliestBlock: 0, chunk: 100000 };
    }
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
    const { earliestBlock, chunk } = await this.getEarliestBlock();
    let end = await this.provider.getBlockNumber();
    let start =
      this.lastQueriedRollupId === undefined || rollupId < this.lastQueriedRollupId
        ? Math.max(end - chunk, earliestBlock)
        : this.lastQueriedRollupBlockNum! + 1;
    let events: Event[] = [];

    // const totalStartTime = new Date().getTime();
    while (end > earliestBlock) {
      const rollupFilter = this.rollupProcessor.filters.RollupProcessed();
      // console.log(`Fetching rollup events between blocks ${start} and ${end}...`);
      // const startTime = new Date().getTime();
      const rollupEvents = await this.rollupProcessor.queryFilter(rollupFilter, start, end);
      // console.log(`${rollupEvents.length} fetched in ${(new Date().getTime() - startTime) / 1000}s`);
      events = [...rollupEvents, ...events];
      if (events.length && events[0].args!.rollupId.toNumber() <= rollupId) {
        this.lastQueriedRollupId = rollupId;
        this.lastQueriedRollupBlockNum = events[events.length - 1].blockNumber;
        break;
      }
      end = Math.max(start - 1, earliestBlock);
      start = Math.max(end - chunk, earliestBlock);
    }
    // console.log(`Done: ${events.length} fetched in ${(new Date().getTime() - totalStartTime) / 1000}s`);

    return this.getRollupBlocksFromEvents(
      events.filter(e => e.args!.rollupId.toNumber() >= rollupId),
      minConfirmations,
    );
  }

  /**
   * The same as getRollupBlocksFrom, but just search for a specific rollup.
   * If `rollupId == -1` return the latest rollup.
   */
  public async getRollupBlock(rollupId: number) {
    const { earliestBlock, chunk } = await this.getEarliestBlock();
    let end = await this.provider.getBlockNumber();
    let start = Math.max(end - chunk, earliestBlock);

    while (end > earliestBlock) {
      // console.log(`Fetching rollup events between blocks ${start} and ${end}...`);
      const rollupFilter = this.rollupProcessor.filters.RollupProcessed(rollupId == -1 ? undefined : rollupId);
      const events = await this.rollupProcessor.queryFilter(rollupFilter, start, end);
      if (events.length) {
        return (await this.getRollupBlocksFromEvents(events.slice(-1), 1))[0];
      }
      end = Math.max(start - 1, earliestBlock);
      start = Math.max(end - chunk, earliestBlock);
    }
  }

  /**
   * Given an array of rollup events, fetches all the necessary data for each event in order to return a Block.
   * This somewhat arbitrarily chunks the requests 10 at a time, as that ensures we don't overload the node by
   * hitting it with thousands of requests at once, while also enabling some degree of parallelism.
   * WARNING: `rollupEvents` is mutated.
   */
  private async getRollupBlocksFromEvents(rollupEvents: Event[], minConfirmations: number) {
    // console.log(`Fetching data for ${rollupEvents.length} rollups...`);
    // const startTime = new Date().getTime();

    const blocks: Block[] = [];
    while (rollupEvents.length) {
      const events = rollupEvents.splice(0, 10);
      const meta = (
        await Promise.all(
          events.map(event =>
            Promise.all([
              event.getTransaction(),
              event.getBlock(),
              event.getTransactionReceipt(),
              this.getDefiBridgeEvents(event.blockNumber),
            ]),
          ),
        )
      ).filter(m => m[0].confirmations >= minConfirmations);
      const newBlocks = meta.map(meta =>
        this.decodeBlock({ ...meta[0], timestamp: meta[1].timestamp }, meta[2], meta[3]),
      );
      blocks.push(...newBlocks);
    }

    // console.log(`Fetched in ${(new Date().getTime() - startTime) / 1000}s`);

    return blocks;
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

  getRollupStateFromBlock(block: Block) {
    const rollupProofData = RollupProofData.fromBuffer(block.rollupProofData);

    const nextRollupId = rollupProofData.rollupId + 1;
    const dataSize = rollupProofData.dataStartIndex + rollupProofData.rollupSize;
    const dataRoot = rollupProofData.newDataRoot;
    const nullRoot = rollupProofData.newNullRoot;
    const rootRoot = rollupProofData.newDataRootsRoot;
    const defiRoot = rollupProofData.newDefiRoot;

    return {
      nextRollupId,
      dataSize,
      dataRoot,
      nullRoot,
      rootRoot,
      defiRoot,
    };
  }

  private decodeBlock(
    tx: TransactionResponse,
    receipt: TransactionReceipt,
    interactionResult: DefiInteractionNote[],
  ): Block {
    const rollupAbi = new utils.Interface(abi);
    const result = rollupAbi.parseTransaction({ data: tx.data });
    const [proofData, , offchainTxDataBuf] = result.args;
    const rollupProofData = RollupProofData.decode(Buffer.from(proofData.slice(2), 'hex'));
    const proofIds = rollupProofData.innerProofData.filter(p => !p.isPadding()).map(p => p.proofId);
    const offchainTxData = sliceOffchainTxData(proofIds, Buffer.from(offchainTxDataBuf.slice(2), 'hex'));

    return {
      created: new Date(tx.timestamp! * 1000),
      txHash: TxHash.fromString(tx.hash),
      rollupProofData: rollupProofData.toBuffer(),
      offchainTxData,
      interactionResult,
      rollupId: rollupProofData.rollupId,
      rollupSize: rollupProofData.rollupSize,
      gasPrice: BigInt(tx.gasPrice!.toString()),
      gasUsed: receipt.gasUsed.toNumber(),
    };
  }

  protected getContractWithSigner(options: SendTxOptions) {
    const { signingAddress } = options;
    const provider = options.provider ? new Web3Provider(options.provider) : this.provider;
    const ethSigner = provider.getSigner(signingAddress ? signingAddress.toString() : 0);
    return new Contract(this.rollupContractAddress.toString(), abi, ethSigner);
  }
}
