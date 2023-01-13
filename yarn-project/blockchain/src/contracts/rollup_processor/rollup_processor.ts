import { EthAddress } from '@aztec/barretenberg/address';
import {
  EthereumProvider,
  EthereumSignature,
  SendTxOptions,
  TxHash,
  RollupTxs,
  EthereumRpc,
} from '@aztec/barretenberg/blockchain';
import { Block } from '@aztec/barretenberg/block_source';
import { BridgeCallData } from '@aztec/barretenberg/bridge_call_data';
import { computeInteractionHashes } from '@aztec/barretenberg/note_algorithms';
import { Timer } from '@aztec/barretenberg/timer';
import { sliceOffchainTxData } from '@aztec/barretenberg/offchain_tx_data';
import { RollupProofData } from '@aztec/barretenberg/rollup_proof';
import {
  TransactionReceipt,
  TransactionResponse,
  TransactionRequest,
  Block as EthBlock,
} from '@ethersproject/abstract-provider';
import { Web3Provider } from '@ethersproject/providers';
import createDebug from 'debug';
import { BytesLike, Contract, Event, utils } from 'ethers';
import { RollupProcessorV2 as RollupProcessorAbi, PermitHelper } from '../../abis.js';
import { decodeErrorFromContract, decodeErrorFromContractByTxHash } from '../decode_error.js';
import { DefiInteractionEvent } from '@aztec/barretenberg/block_source';
import { solidityFormatSignatures } from './solidity_format_signatures.js';
import { getEarliestBlock } from '../../earliest_block/index.js';
import { MemoryFifo, Semaphore } from '@aztec/barretenberg/fifo';

const fixEthersStackTrace = (err: Error) => {
  err.stack! += new Error().stack;
  throw err;
};

interface RollupMetadata {
  event: Event;
  tx: TransactionResponse;
  block: EthBlock;
  receipt: TransactionReceipt;
  offchainDataTxs: TransactionResponse[];
  offchainDataReceipts: TransactionReceipt[];
}

/**
 * Thin wrapper around the rollup processor contract. Provides a direct 1 to 1 interface for
 * querying contract state, creating and sending transactions, and querying for rollup blocks.
 */
export class RollupProcessor {
  static readonly DEFAULT_BRIDGE_GAS_LIMIT = 300000;
  static readonly DEFAULT_ERC20_GAS_LIMIT = 55000;

  private static DEPOSIT_GAS_LIMIT_MULTIPLIER = 1.1;

  public rollupProcessor: Contract;
  public permitHelper: Contract;
  private provider: Web3Provider;
  private debug = createDebug('bb:rollup_processor');

  constructor(
    protected rollupContractAddress: EthAddress,
    private ethereumProvider: EthereumProvider,
    protected permitHelperAddress: EthAddress = EthAddress.ZERO,
  ) {
    this.provider = new Web3Provider(ethereumProvider);
    this.rollupProcessor = new Contract(rollupContractAddress.toString(), RollupProcessorAbi.abi, this.provider);
    this.permitHelper = new Contract(permitHelperAddress.toString(), PermitHelper.abi, this.provider);
  }

  get address() {
    return this.rollupContractAddress;
  }

  get contract() {
    return this.rollupProcessor;
  }

  async getImplementationVersion() {
    return await this.rollupProcessor.getImplementationVersion();
  }

  async getDataSize() {
    return (await this.rollupProcessor.getDataSize()).toNumber();
  }

  async escapeBlockLowerBound() {
    return (await this.rollupProcessor.escapeBlockLowerBound()).toBigInt();
  }

  async escapeBlockUpperBound() {
    return (await this.rollupProcessor.escapeBlockUpperBound()).toBigInt();
  }

  async hasRole(role: BytesLike, address: EthAddress) {
    return await this.rollupProcessor.hasRole(role, address.toString());
  }

  async rollupProviders(providerAddress: EthAddress) {
    return await this.rollupProcessor.rollupProviders(providerAddress.toString());
  }

  async paused() {
    return await this.rollupProcessor.paused();
  }

  async verifier() {
    return EthAddress.fromString(await this.rollupProcessor.verifier());
  }

  async defiBridgeProxy() {
    return EthAddress.fromString(await this.rollupProcessor.defiBridgeProxy());
  }

  async dataSize() {
    return +(await this.rollupProcessor.getDataSize());
  }

  async getPendingDefiInteractionHashesLength() {
    return +(await this.rollupProcessor.getPendingDefiInteractionHashesLength());
  }

  async getDefiInteractionHashesLength() {
    return +(await this.rollupProcessor.getDefiInteractionHashesLength());
  }

  async defiInteractionHashes() {
    const length = await this.getDefiInteractionHashesLength();
    const res: string[] = [];
    for (let i = 0; i < length; i++) {
      res.push((await this.rollupProcessor.defiInteractionHashes(i)) as string);
    }
    return res.map(v => Buffer.from(v.slice(2), 'hex'));
  }

  async getAsyncDefiInteractionHashesLength() {
    return +(await this.rollupProcessor.getAsyncDefiInteractionHashesLength());
  }

  async asyncDefiInteractionHashes() {
    const length = await this.getAsyncDefiInteractionHashesLength();
    const res: string[] = [];
    for (let i = 0; i < length; i++) {
      res.push((await this.rollupProcessor.asyncDefiInteractionHashes(i)) as string);
    }
    return res.map(v => Buffer.from(v.slice(2), 'hex'));
  }

  async prevDefiInteractionsHash() {
    return Buffer.from((await this.rollupProcessor.prevDefiInteractionsHash()).slice(2), 'hex');
  }

  async stateHash() {
    return Buffer.from((await this.rollupProcessor.rollupStateHash()).slice(2), 'hex');
  }

  async getSupportedBridge(bridgeAddressId: number) {
    return EthAddress.fromString(await this.rollupProcessor.getSupportedBridge(bridgeAddressId));
  }

  async getSupportedBridgesLength() {
    return (await this.rollupProcessor.getSupportedBridgesLength()).toNumber();
  }

  async getSupportedBridges() {
    const length = await this.getSupportedBridgesLength();
    const bridges: any[] = [];

    for (let i = 1; i <= length; i++) {
      bridges.push({
        id: i,
        address: await this.getSupportedBridge(i),
        gasLimit: await this.getBridgeGasLimit(i),
      });
    }

    return bridges;
  }

  async getBridgeGasLimit(bridgeAddressId: number) {
    return +(await this.rollupProcessor.bridgeGasLimits(bridgeAddressId));
  }

  async getSupportedAsset(assetId: number) {
    return EthAddress.fromString(await this.rollupProcessor.getSupportedAsset(assetId));
  }

  async getSupportedAssetsLength() {
    return (await this.rollupProcessor.getSupportedAssetsLength()).toNumber();
  }

  async getAssetGasLimit(assetId: number) {
    return +(await this.rollupProcessor.assetGasLimits(assetId));
  }

  async getSupportedAssets() {
    const length = await this.getSupportedAssetsLength();
    const assets: any[] = [];

    for (let i = 1; i <= length; i++) {
      assets.push({
        address: await this.getSupportedAsset(i),
        gasLimit: await this.getAssetGasLimit(i),
      });
    }

    return assets;
  }

  async pause(options: SendTxOptions = {}) {
    const { gasLimit } = options;
    const rollupProcessor = this.getContractWithSigner(options);
    const tx = await rollupProcessor.pause({ gasLimit }).catch(fixEthersStackTrace);
    return TxHash.fromString(tx.hash);
  }

  async unpause(options: SendTxOptions = {}) {
    const { gasLimit } = options;
    const rollupProcessor = this.getContractWithSigner(options);
    const tx = await rollupProcessor.unpause({ gasLimit }).catch(fixEthersStackTrace);
    return TxHash.fromString(tx.hash);
  }

  async grantRole(role: BytesLike, address: EthAddress, options: SendTxOptions = {}) {
    const { gasLimit } = options;
    const rollupProcessor = this.getContractWithSigner(options);
    const tx = await rollupProcessor.grantRole(role, address.toString(), { gasLimit });
    return TxHash.fromString(tx.hash);
  }

  async revokeRole(role: BytesLike, address: EthAddress, options: SendTxOptions = {}) {
    const { gasLimit } = options;
    const rollupProcessor = this.getContractWithSigner(options);
    const tx = await rollupProcessor.revokeRole(role, address.toString(), { gasLimit });
    return TxHash.fromString(tx.hash);
  }

  async setRollupProvider(providerAddress: EthAddress, valid: boolean, options: SendTxOptions = {}) {
    const { gasLimit } = options;
    const rollupProcessor = this.getContractWithSigner(options);
    const tx = await rollupProcessor
      .setRollupProvider(providerAddress.toString(), valid, { gasLimit })
      .catch(fixEthersStackTrace);
    return TxHash.fromString(tx.hash);
  }

  async setDefiBridgeProxy(providerAddress: EthAddress, options: SendTxOptions = {}) {
    const { gasLimit } = options;
    const rollupProcessor = this.getContractWithSigner(options);
    const tx = await rollupProcessor
      .setDefiBridgeProxy(providerAddress.toString(), { gasLimit })
      .catch(fixEthersStackTrace);
    return TxHash.fromString(tx.hash);
  }

  async offchainData(
    rollupId: bigint,
    chunk: bigint,
    totalChunks: bigint,
    offchainTxData: BytesLike,
    options: SendTxOptions = {},
  ) {
    const { gasLimit } = options;
    const rollupProcessor = this.getContractWithSigner(options);
    const tx = await rollupProcessor
      .offchainData(rollupId, chunk, totalChunks, offchainTxData, { gasLimit })
      .catch(fixEthersStackTrace);
    return TxHash.fromString(tx.hash);
  }

  async processRollup(encodedProofData: BytesLike, signatures: BytesLike, options: SendTxOptions = {}) {
    const { gasLimit } = options;
    const rollupProcessor = this.getContractWithSigner(options);
    const tx = await rollupProcessor
      .processRollup(encodedProofData, signatures, { gasLimit })
      .catch(fixEthersStackTrace);
    return TxHash.fromString(tx.hash);
  }
  async setVerifier(address: EthAddress, options: SendTxOptions = {}) {
    const { gasLimit } = options;
    const rollupProcessor = this.getContractWithSigner(options);
    const tx = await rollupProcessor.setVerifier(address.toString(), { gasLimit }).catch(fixEthersStackTrace);
    return TxHash.fromString(tx.hash);
  }

  async setThirdPartyContractStatus(flag: boolean, options: SendTxOptions = {}) {
    const { gasLimit } = options;
    const rollupProcessor = this.getContractWithSigner(options);
    const tx = await rollupProcessor.setAllowThirdPartyContracts(flag, { gasLimit });
    return TxHash.fromString(tx.hash);
  }

  async setSupportedBridge(bridgeAddress: EthAddress, bridgeGasLimit = 0, options: SendTxOptions = {}) {
    const { gasLimit } = options;
    const rollupProcessor = this.getContractWithSigner(options);
    const tx = await rollupProcessor.setSupportedBridge(bridgeAddress.toString(), bridgeGasLimit, { gasLimit });
    return TxHash.fromString(tx.hash);
  }

  async setSupportedAsset(assetAddress: EthAddress, assetGasLimit = 0, options: SendTxOptions = {}) {
    const { gasLimit } = options;
    const rollupProcessor = this.getContractWithSigner(options);
    const tx = await rollupProcessor.setSupportedAsset(assetAddress.toString(), assetGasLimit, {
      gasLimit,
    });
    return TxHash.fromString(tx.hash);
  }

  async processAsyncDefiInteraction(interactionNonce: number, options: SendTxOptions = {}) {
    const { gasLimit } = options;
    const rollupProcessor = this.getContractWithSigner(options);
    const tx = await rollupProcessor
      .processAsyncDefiInteraction(interactionNonce, { gasLimit })
      .catch(fixEthersStackTrace);
    return TxHash.fromString(tx.hash);
  }

  async getEscapeHatchStatus() {
    const [escapeOpen, blocksRemaining]: [boolean, any] = await this.rollupProcessor.getEscapeHatchStatus();
    return { escapeOpen, blocksRemaining: +blocksRemaining };
  }

  // Deprecated: Used by lots of tests. We now use createRollupTxs() to produce two txs, one with broadcast data,
  // the other with the actual rollup proof.
  async createRollupProofTx(dataBuf: Buffer, signatures: Buffer[], offchainTxData: Buffer[]) {
    // setting the tx call data limit to 120kb as this function is only used by tests
    return (await this.createRollupTxs(dataBuf, signatures, offchainTxData, 120 * 1024)).rollupProofTx;
  }

  /**
   * The dataBuf argument should be formatted as the rollup broadcast data in encoded form
   * concatenated with the proof data as provided by the root verifier
   * The given offchainTxData is chunked into multiple offchainData txs.
   * Returns the txs to be published.
   */
  async createRollupTxs(dataBuf: Buffer, signatures: Buffer[], offchainTxData: Buffer[], txDataLimit: number) {
    const broadcastData = RollupProofData.decode(dataBuf);
    const formattedSignatures = solidityFormatSignatures(signatures);
    const rollupProofTxRaw = await this.rollupProcessor.populateTransaction
      .processRollup(dataBuf, formattedSignatures)
      .catch(fixEthersStackTrace);
    const rollupProofTx = Buffer.from(rollupProofTxRaw.data!.slice(2), 'hex');

    const ocData = Buffer.concat(offchainTxData);
    const chunks = Math.ceil(ocData.length / txDataLimit);
    // We should always publish at least 1 chunk, even if it's 0 length.
    // We want the log event to be emitted so we can can be sure things are working as intended.
    const ocdChunks = chunks
      ? Array.from({ length: chunks }).map((_, i) => ocData.slice(i * txDataLimit, (i + 1) * txDataLimit))
      : [Buffer.alloc(0)];

    const offchainDataTxsRaw = await Promise.all(
      ocdChunks.map((c, i) =>
        this.rollupProcessor.populateTransaction.offchainData(broadcastData.rollupId, i, ocdChunks.length, c),
      ),
    ).catch(fixEthersStackTrace);
    const offchainDataTxs = offchainDataTxsRaw.map(tx => Buffer.from(tx.data!.slice(2), 'hex'));

    const result: RollupTxs = {
      rollupProofTx,
      offchainDataTxs,
    };

    return result;
  }

  public async sendRollupTxs({ rollupProofTx, offchainDataTxs }: { rollupProofTx: Buffer; offchainDataTxs: Buffer[] }) {
    for (const tx of offchainDataTxs) {
      await this.sendTx(tx);
    }
    await this.sendTx(rollupProofTx);
  }

  public async sendTx(data: Buffer, options: SendTxOptions = {}) {
    const { signingAddress, gasLimit, nonce, maxFeePerGas, maxPriorityFeePerGas } = options;
    const signer = signingAddress ? this.provider.getSigner(signingAddress.toString()) : this.provider.getSigner(0);
    const from = await signer.getAddress();
    const txRequest: TransactionRequest = {
      to: this.rollupContractAddress.toString(),
      from,
      gasLimit,
      data,
      nonce,
      maxFeePerGas,
      maxPriorityFeePerGas,
    };
    const txResponse = await signer.sendTransaction(txRequest).catch(fixEthersStackTrace);
    return TxHash.fromString(txResponse.hash);
  }

  public async depositPendingFunds(
    assetId: number,
    amount: bigint,
    proofHash: Buffer = Buffer.alloc(32),
    options: SendTxOptions = {},
  ) {
    let { gasLimit } = options;
    const rollupProcessor = this.getContractWithSigner(options);
    const depositor = await rollupProcessor.signer.getAddress();

    const value = assetId === 0 ? amount : undefined;

    // note: Due to non deterministic gas estimations provided in depositPendingFunds, we add 10% to the total
    // transaction fee to cover the cost of all execution branches.
    // Non determinism is cause by user's individually calculating the new deposit limit, where the previous update
    // determines the path of the next user's execution.
    if (!gasLimit) {
      const estimation = await rollupProcessor.estimateGas
        .depositPendingFunds(assetId, amount, depositor, proofHash, {
          value,
        })
        .catch(fixEthersStackTrace);
      gasLimit = Math.ceil(estimation.toNumber() * RollupProcessor.DEPOSIT_GAS_LIMIT_MULTIPLIER);
    }

    const tx = await rollupProcessor
      .depositPendingFunds(assetId, amount, depositor, proofHash, {
        value,
        gasLimit,
      })
      .catch(fixEthersStackTrace);
    return TxHash.fromString(tx.hash);
  }

  async depositPendingFundsPermit(
    assetId: number,
    amount: bigint,
    deadline: bigint,
    signature: EthereumSignature,
    options: SendTxOptions = {},
  ) {
    let { gasLimit } = options;
    const permitHelper = this.getHelperContractWithSigner(options);
    const depositor = await permitHelper.signer.getAddress();

    // Deposit actions have non-deterministic gas consumption - see note in `depositPendingFunds`
    if (!gasLimit) {
      const estimation = await permitHelper.estimateGas
        .depositPendingFundsPermit(assetId, amount, depositor, deadline, signature.v, signature.r, signature.s)
        .catch(fixEthersStackTrace);
      gasLimit = Math.ceil(estimation.toNumber() * RollupProcessor.DEPOSIT_GAS_LIMIT_MULTIPLIER);
    }

    const tx = await permitHelper
      .depositPendingFundsPermit(assetId, amount, depositor, deadline, signature.v, signature.r, signature.s, {
        gasLimit,
      })
      .catch(fixEthersStackTrace);
    return TxHash.fromString(tx.hash);
  }

  async depositPendingFundsPermitNonStandard(
    assetId: number,
    amount: bigint,
    nonce: bigint,
    deadline: bigint,
    signature: EthereumSignature,
    options: SendTxOptions = {},
  ) {
    let { gasLimit } = options;
    const permitHelper = this.getHelperContractWithSigner(options);
    const depositor = await permitHelper.signer.getAddress();

    // Deposit actions have non-deterministic gas consumption - see note in `depositPendingFunds`
    if (!gasLimit) {
      const estimation = await permitHelper.estimateGas
        .depositPendingFundsPermitNonStandard(
          assetId,
          amount,
          depositor,
          nonce,
          deadline,
          signature.v,
          signature.r,
          signature.s,
        )
        .catch(fixEthersStackTrace);
      gasLimit = Math.ceil(estimation.toNumber() * RollupProcessor.DEPOSIT_GAS_LIMIT_MULTIPLIER);
    }

    const tx = await permitHelper
      .depositPendingFundsPermitNonStandard(
        assetId,
        amount,
        depositor,
        nonce,
        deadline,
        signature.v,
        signature.r,
        signature.s,
        { gasLimit },
      )
      .catch(fixEthersStackTrace);
    return TxHash.fromString(tx.hash);
  }

  async approveProof(proofHash: Buffer, options: SendTxOptions = {}) {
    const { gasLimit } = options;
    const rollupProcessor = this.getContractWithSigner(options);
    const tx = await rollupProcessor.approveProof(proofHash, { gasLimit }).catch(fixEthersStackTrace);
    return TxHash.fromString(tx.hash);
  }

  async getProofApprovalStatus(address: EthAddress, txId: Buffer): Promise<boolean> {
    return await this.rollupProcessor.depositProofApprovals(address.toString(), txId);
  }

  async getUserPendingDeposit(assetId: number, account: EthAddress) {
    return BigInt(await this.rollupProcessor.userPendingDeposits(assetId, account.toString()));
  }

  async getThirdPartyContractStatus(options: SendTxOptions = {}) {
    const { gasLimit } = options;
    return await this.rollupProcessor.allowThirdPartyContracts({ gasLimit });
  }

  private async getEarliestBlock() {
    const net = await this.provider.getNetwork();
    return getEarliestBlock(net.chainId);
  }

  private rollupRetrievalChunkSize = () => 100000;

  public async getRollupBlocksFrom(rollupId: number, minConfirmations: number) {
    const blocks: Block[] = [];
    await this.callbackRollupBlocksFrom(rollupId, minConfirmations, block => Promise.resolve(void blocks.push(block)));
    return blocks;
  }

  /**
   * Emits on the callback, all rollup blocks from (and including) the given rollupId, with >= minConfirmations.
   * This guarantees that all requested rollups have been sent to the callback before it returns.
   *
   * First we locate the desired eth block by querying for the specific given rollupId.
   * It assumes it's querying an eth node that handles queries efficiently (e.g. infura or kebab).
   * Second it queries for all rollups from that block onwards. It chunks requests so that it can start processing
   * rollup events ASAP, and to protect memory usage, but as the node is assumed to be indexed, these chunks can be very
   * large.
   *
   * Processes results on queues. Pipeline is:
   *   eth node rollup event -> event Q -> get rollup metadata from eth node -> metadata Q -> decode data and callback
   *
   * TODO: Introduce chunking and add event Q!
   */
  public async callbackRollupBlocksFrom(
    rollupId: number,
    minConfirmations: number,
    cb: (block: Block) => Promise<void>,
  ) {
    const specificRollupFilter = this.rollupProcessor.filters.RollupProcessed(rollupId);
    const e = await this.rollupProcessor.queryFilter(specificRollupFilter);
    if (!e.length) {
      this.debug(`no rollup with id ${rollupId} found. early out.`);
      return;
    }
    const start = e[0].blockNumber;

    this.debug(`fetching rollup events from block ${start}...`);
    const rollupFilter = this.rollupProcessor.filters.RollupProcessed();
    const timer = new Timer();
    const allEvents = await this.rollupProcessor.queryFilter(rollupFilter, start);
    this.debug(`${allEvents.length} fetched in ${timer.s()}s`);

    const currentBlockNumber = await new EthereumRpc(this.ethereumProvider).blockNumber();
    const events = allEvents
      .filter(e => currentBlockNumber - e.blockNumber + 1 >= minConfirmations)
      .filter(e => e.args!.rollupId.toNumber() >= rollupId);

    if (events.length) {
      const processStartTime = new Timer();
      await this.getRollupBlocksFromEvents(events, cb);
      this.debug(`processing complete in ${processStartTime.s()}s`);
    } else {
      this.debug(`no events of interest, doing nothing.`);
    }

    return events.length;
  }

  /**
   * The same as getRollupBlocksFrom, but just search for a specific rollup.
   * If `rollupId == -1` return the latest rollup.
   */
  public async getRollupBlock(rollupId: number, minConfirmations: number) {
    const currentBlockNumber = await new EthereumRpc(this.ethereumProvider).blockNumber();

    const findLatestBlock = async () => {
      const { earliestBlock } = await this.getEarliestBlock();
      const latestBlock = await this.provider.getBlockNumber();
      const rollupChunkSize = this.rollupRetrievalChunkSize();

      // look backwards to find the latest rollup, then stop
      let end = latestBlock;
      let start = Math.max(end - rollupChunkSize, earliestBlock);
      let block: Block | undefined;

      while (end > earliestBlock && !block) {
        this.debug(`fetching rollup events between blocks ${start} and ${end}...`);
        const rollupFilter = this.rollupProcessor.filters.RollupProcessed();
        const allEvents = await this.rollupProcessor.queryFilter(rollupFilter, start, end);
        const events = allEvents.filter(e => currentBlockNumber - e.blockNumber + 1 >= minConfirmations);
        for (let i = events.length - 1; i >= 0 && !block; i--) {
          await this.getRollupBlocksFromEvents([events[i]], b => Promise.resolve(void (block = b)));
        }

        end = Math.max(start - 1, earliestBlock);
        start = Math.max(end - rollupChunkSize, earliestBlock);
      }
      return block;
    };

    const findSpecificBlock = async () => {
      const specificRollupFilter = this.rollupProcessor.filters.RollupProcessed(rollupId);
      const allEvents = await this.rollupProcessor.queryFilter(specificRollupFilter);
      const events = allEvents.filter(e => currentBlockNumber - e.blockNumber + 1 >= minConfirmations);
      if (!events.length) {
        return;
      }
      let block: Block | undefined;
      await this.getRollupBlocksFromEvents(events, b => Promise.resolve(void (block = b)));
      return block;
    };

    if (rollupId == -1) {
      return await findLatestBlock();
    }
    return await findSpecificBlock();
  }

  /**
   * Given an array of rollup events, fetches all the necessary data for each event in order to return a Block.
   */
  private async getRollupBlocksFromEvents(rollupEvents: Event[], cb: (block: Block) => Promise<void>) {
    if (rollupEvents.length === 0) {
      return [];
    }

    this.debug(`fetching data for ${rollupEvents.length} rollups...`);

    const defiBridgeEventsTimer = new Timer();
    const allDefiNotes = await this.getDefiBridgeEventsForRollupEvents(rollupEvents);
    this.debug(`defi bridge events fetched in ${defiBridgeEventsTimer.s()}s.`);

    const offchainEventsTimer = new Timer();
    const allOffchainDataEvents = await this.getOffchainDataEvents(rollupEvents);
    this.debug(`offchain data events fetched in ${offchainEventsTimer.s()}s.`);

    // if any rollup's off-chain events are not present we need to exclude that rollup and any further rollups
    const firstInvalidOffchainDataIndex = allOffchainDataEvents.findIndex(x => !x.length);
    if (firstInvalidOffchainDataIndex != -1) {
      rollupEvents.splice(firstInvalidOffchainDataIndex);
    }

    // We want to concurrently perform network io and processing of results, but retain ordered output.
    // We create a tiny data pipeline to queue output of network IO for ordered processing.
    const processQueue = new MemoryFifo<any>();

    // We use use a semaphore to protect two resources:
    //   1. Geth (suckware), can handle around 20 rollups worth of metadata requests before "bad thinhs happen".
    //   2. Our own internal queue of network IO results.
    // TODO: Kebab should be indexing the requested data so we don't have to worry about the eth node!
    // We could then raise this number higher than 20, at which point it's only acting to protect against balooning
    // the processQueue and consuming lots of memory, when the consumer is slow.
    const queueSemaphore = new Semaphore(20);

    // If we encounter a block that does not have it's full compliment of defi notes then we will
    // need to stop the pipeline from publishing that block and any further blocks
    let stop = false;

    // Start processing results of IO.
    const processPromise = processQueue.process(async ({ event, metaPromise }) => {
      try {
        if (stop) {
          return;
        }
        const meta = await metaPromise;
        const rollupMetadata: RollupMetadata = {
          event,
          tx: meta[0],
          block: meta[1],
          receipt: meta[2],
          offchainDataTxs: meta[3],
          offchainDataReceipts: meta[4],
        };
        const defiNotesForRollup = this.defiNotesForBlock(rollupMetadata, allDefiNotes);
        await cb(this.rollupMetadataToBlock(rollupMetadata, defiNotesForRollup));
      } catch (err) {
        stop = true;
        console.log(err);
      } finally {
        queueSemaphore.release();
      }
    });

    // Kick off io.
    for (let i = 0; i < rollupEvents.length && !stop; ++i) {
      await queueSemaphore.acquire();
      const event = rollupEvents[i];
      const offchainData = allOffchainDataEvents[i];
      this.debug(`fetching metadata for rollup ${event.args?.rollupId}.`);
      const metaPromise = Promise.all([
        event.getTransaction(),
        event.getBlock(),
        event.getTransactionReceipt(),
        Promise.all(offchainData.map(e => e.getTransaction())),
        Promise.all(offchainData.map(e => e.getTransactionReceipt())),
      ]);
      processQueue.put({ event, metaPromise });
    }

    processQueue.end();
    await processPromise;
  }

  private defiNotesForBlock(meta: RollupMetadata, allDefiNotes: any) {
    // we now have the tx details and defi notes for this batch of rollup events
    // we need to assign the defi notes to their specified rollup
    // assign the set of defi notes for this rollup and decode the block
    const hashesForThisRollup = this.extractDefiHashesFromRollupEvent(meta.event);
    const defiNotesForThisRollup: DefiInteractionEvent[] = [];
    for (const hash of hashesForThisRollup) {
      if (!allDefiNotes[hash]) {
        throw new Error(
          `Unable to locate defi interaction note for hash ${hash} in rollup ${meta.event.args?.rollupId}!`,
        );
      }
      defiNotesForThisRollup.push(allDefiNotes[hash]!);
    }
    return defiNotesForThisRollup;
  }

  private rollupMetadataToBlock(meta: RollupMetadata, defiNotesForThisRollup: DefiInteractionEvent[]) {
    const block = this.decodeBlock(
      { ...meta.tx, timestamp: meta.block.timestamp },
      meta.receipt,
      defiNotesForThisRollup,
      meta.offchainDataTxs,
      meta.offchainDataReceipts,
    );
    return block;
  }

  private extractDefiHashesFromRollupEvent(rollupEvent: Event) {
    // the rollup contract publishes a set of hash values with each rollup event
    const rollupLog = { blockNumber: rollupEvent.blockNumber, topics: rollupEvent.topics, data: rollupEvent.data };
    const {
      args: { nextExpectedDefiHashes },
    } = this.contract.interface.parseLog(rollupLog);
    return nextExpectedDefiHashes.map((hash: string) => hash.slice(2));
  }

  private async getDefiBridgeEventsForRollupEvents(rollupEvents: Event[]) {
    // retrieve all defi interaction notes from the DefiBridgeProcessed stream for the set of rollup events given
    const rollupHashes = rollupEvents.flatMap(ev => this.extractDefiHashesFromRollupEvent(ev));
    const hashMapping: { [key: string]: DefiInteractionEvent | undefined } = {};
    for (const hash of rollupHashes) {
      hashMapping[hash] = undefined;
    }
    let numHashesToFind = rollupHashes.length;

    // hashMapping now contains all of the required note hashes in it's keys
    // we need to search back through the DefiBridgeProcessed stream and find all of the notes that correspond to that stream
    const { earliestBlock, chunk } = await this.getEarliestBlock();

    // the highest block number should be the event at the end, but calculate the max to be sure
    const highestBlockNumber = Math.max(...rollupEvents.map(ev => ev.blockNumber));
    let endBlock = Math.max(highestBlockNumber, earliestBlock);
    let startBlock = Math.max(endBlock - chunk, earliestBlock);

    // search back through the stream until all of our notes have been found or we have exhausted the blocks
    while (endBlock > earliestBlock && numHashesToFind > 0) {
      this.debug(`searching for defi notes from blocks ${startBlock} - ${endBlock}`);
      const filter = this.rollupProcessor.filters.DefiBridgeProcessed();
      const defiBridgeEvents = await this.rollupProcessor.queryFilter(filter, startBlock, endBlock);
      // decode the retrieved events into actual defi interaction notes
      const decodedEvents = defiBridgeEvents.map((log: { blockNumber: number; topics: string[]; data: string }) => {
        const {
          args: {
            encodedBridgeCallData,
            nonce,
            totalInputValue,
            totalOutputValueA,
            totalOutputValueB,
            result,
            errorReason,
          },
        } = this.contract.interface.parseLog(log);

        return new DefiInteractionEvent(
          BridgeCallData.fromBigInt(BigInt(encodedBridgeCallData)),
          +nonce,
          BigInt(totalInputValue),
          BigInt(totalOutputValueA),
          BigInt(totalOutputValueB),
          result,
          Buffer.from(errorReason.slice(2), 'hex'),
        );
      });
      this.debug(`found ${decodedEvents.length} notes between blocks ${startBlock} - ${endBlock}`);
      // compute the hash and store the notes against that hash in our mapping
      for (const decodedNote of decodedEvents) {
        const noteHash = computeInteractionHashes([decodedNote])[0].toString('hex');
        if (Object.prototype.hasOwnProperty.call(hashMapping, noteHash) && hashMapping[noteHash] === undefined) {
          hashMapping[noteHash] = decodedNote;
          --numHashesToFind;
        }
      }
      endBlock = Math.max(startBlock - 1, earliestBlock);
      startBlock = Math.max(endBlock - chunk, earliestBlock);
    }
    return hashMapping;
  }

  private async getOffchainDataEvents(rollupEvents: Event[]) {
    const rollupLogs = rollupEvents.map(e => this.contract.interface.parseLog(e));
    // If we only have one rollup event, use the rollup id as a filter.
    const filter = this.rollupProcessor.filters.OffchainData(
      rollupLogs.length === 1 ? rollupLogs[0].args.rollupId : undefined,
    );
    // Search from 1 days worth of blocks before, up to the last rollup block.
    const { offchainSearchLead } = await this.getEarliestBlock();
    const start = rollupEvents[0].blockNumber - offchainSearchLead;
    const end = rollupEvents[rollupEvents.length - 1].blockNumber;
    this.debug(`fetching offchain data events from blocks ${start} - ${end}...`);
    const offchainEvents = await this.rollupProcessor.queryFilter(
      filter,
      rollupEvents[0].blockNumber - offchainSearchLead,
      rollupEvents[rollupEvents.length - 1].blockNumber,
    );
    this.debug(`found ${offchainEvents.length} offchain events.`);
    // Key the offchain data event on the rollup id and sender.
    const offchainEventMap = offchainEvents.reduce<{ [key: string]: Event[] }>((a, e) => {
      const offChainLog = this.contract.interface.parseLog(e);
      const {
        args: { rollupId, chunk, totalChunks, sender },
      } = offChainLog;

      // if the rollup event occurs before the offchain event, then ignore the off chain event
      const rollupLogIndex = rollupLogs.findIndex(x => x.args.rollupId.toNumber() === rollupId.toNumber());
      if (rollupLogIndex !== -1) {
        const rollupEvent = rollupEvents[rollupLogIndex];
        if (rollupEvent.blockNumber < e.blockNumber) {
          this.debug(
            `ignoring offchain event at block ${e.blockNumber} for rollup ${rollupId} at block ${rollupEvent.blockNumber}`,
          );
          return a;
        }
      }

      const key = `${rollupId}:${sender}`;
      if (!a[key] || a[key].length != totalChunks) {
        a[key] = Array.from({ length: totalChunks });
      }
      // Store by chunk index. Copes with chunks being re-published.
      a[key][chunk] = e;
      this.debug(`parsed offchain event for rollup: ${rollupId} sender: ${sender} chunk: ${chunk}.`);
      return a;
    }, {});
    // Finally, for each rollup log, lookup the offchain events for the rollup id from the same sender.
    return rollupLogs.map(rollupLog => {
      const {
        args: { rollupId, sender },
      } = rollupLog;
      const key = `${rollupId}:${sender}`;
      const offchainEvents = offchainEventMap[key];
      if (!offchainEvents || offchainEvents.some(e => !e)) {
        console.log(`Missing offchain data chunks for rollup: ${rollupId}`);
        return [];
      }
      return offchainEvents;
    });
  }

  private decodeBlock(
    rollupTx: TransactionResponse,
    receipt: TransactionReceipt,
    interactionResult: DefiInteractionEvent[],
    offchainDataTxs: TransactionResponse[],
    offchainDataReceipts: TransactionReceipt[],
  ): Block {
    const rollupAbi = new utils.Interface(RollupProcessorAbi.abi);
    const parsedRollupTx = rollupAbi.parseTransaction({ data: rollupTx.data });
    const offchainTxDataBuf = Buffer.concat(
      offchainDataTxs
        .map(tx => rollupAbi.parseTransaction({ data: tx.data }))
        .map(parsed => Buffer.from(parsed.args[3].slice(2), 'hex')),
    );
    const [proofData] = parsedRollupTx.args;
    const encodedProofBuffer = Buffer.from(proofData.slice(2), 'hex');
    const rollupProofData = RollupProofData.decode(encodedProofBuffer);
    const validProofIds = rollupProofData.getNonPaddingProofIds();
    const offchainTxData = sliceOffchainTxData(validProofIds, offchainTxDataBuf);

    this.debug(`decoded rollup ${rollupProofData.rollupId}`);

    return new Block(
      TxHash.fromString(rollupTx.hash),
      new Date(rollupTx.timestamp! * 1000),
      rollupProofData.rollupId,
      rollupProofData.rollupSize,
      encodedProofBuffer,
      offchainTxData,
      interactionResult,
      receipt.gasUsed.toNumber() + offchainDataReceipts.reduce((a, r) => a + r.gasUsed.toNumber(), 0),
      BigInt(rollupTx.gasPrice!.toString()),
    );
  }

  public getContractWithSigner(options: SendTxOptions) {
    const { signingAddress } = options;
    const provider = options.provider ? new Web3Provider(options.provider) : this.provider;
    const ethSigner = provider.getSigner(signingAddress ? signingAddress.toString() : 0);
    return new Contract(this.rollupContractAddress.toString(), RollupProcessorAbi.abi, ethSigner);
  }

  public getHelperContractWithSigner(options: SendTxOptions) {
    const { signingAddress } = options;
    const provider = options.provider ? new Web3Provider(options.provider) : this.provider;
    const ethSigner = provider.getSigner(signingAddress ? signingAddress.toString() : 0);
    return new Contract(this.permitHelperAddress.toString(), PermitHelper.abi, ethSigner);
  }

  public async estimateGas(data: Buffer) {
    const signer = this.provider.getSigner(0);
    const from = await signer.getAddress();
    const txRequest = {
      to: this.address.toString(),
      from,
      data: `0x${data.toString('hex')}`,
    };
    try {
      const estimate = await this.provider.estimateGas(txRequest);
      return estimate.toNumber();
    } catch (err) {
      const rep = await this.ethereumProvider
        .request({ method: 'eth_call', params: [txRequest, 'latest'] })
        .catch(err => err);
      if (rep.data) {
        const revertError = decodeErrorFromContract(this.contract, rep.data);
        if (revertError) {
          const message = `${revertError.name}(${revertError.params.join(', ')})`;
          throw new Error(message);
        }
      }
      throw err;
    }
  }

  public async getRevertError(txHash: TxHash) {
    return await decodeErrorFromContractByTxHash(this.contract, txHash, this.ethereumProvider);
  }
}
