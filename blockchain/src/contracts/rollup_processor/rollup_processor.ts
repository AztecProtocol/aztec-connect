import { EthAddress } from '@aztec/barretenberg/address';
import { EthereumProvider, EthereumSignature, SendTxOptions, TxHash } from '@aztec/barretenberg/blockchain';
import { Block } from '@aztec/barretenberg/block_source';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { DefiInteractionNote, computeInteractionHashes } from '@aztec/barretenberg/note_algorithms';
import { sliceOffchainTxData } from '@aztec/barretenberg/offchain_tx_data';
import { RollupProofData } from '@aztec/barretenberg/rollup_proof';
import { TransactionReceipt, TransactionResponse } from '@ethersproject/abstract-provider';
import { Web3Provider } from '@ethersproject/providers';
import createDebug from 'debug';
import { Contract, Event, utils } from 'ethers';
import { abi } from '../../artifacts/contracts/RollupProcessor.sol/RollupProcessor.json';
import { decodeErrorFromContractByTxHash } from '../decode_error';
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
  static DEFAULT_BRIDGE_GAS_LIMIT = 300000;
  static DEFAULT_ERC20_GAS_LIMIT = 55000;

  public rollupProcessor: Contract;
  private lastQueriedRollupId?: number;
  private lastQueriedRollupBlockNum?: number;
  protected provider: Web3Provider;
  private log = createDebug('bb:rollup_processor');
  // taken from the rollup contract
  static readonly DEFI_RESULT_ZERO_HASH = '0x2d25a1e3a51eb293004c4b56abe12ed0da6bca2b4a21936752a85d102593c1b4';

  constructor(
    protected rollupContractAddress: EthAddress,
    private ethereumProvider: EthereumProvider,
    private minConfirmations = 1,
  ) {
    this.provider = new Web3Provider(ethereumProvider);
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
    const [bridgeAddresses, gasLimits]: any[][] = await this.rollupProcessor.getSupportedBridges();
    return bridgeAddresses.map((a, i) => ({
      id: i + 1,
      address: EthAddress.fromString(a),
      gasLimit: +gasLimits[i],
    }));
  }

  async getBridgeGasLimit(bridgeAddressId: number) {
    return +(await this.rollupProcessor.getBridgeGasLimit(bridgeAddressId));
  }

  async getSupportedAsset(assetId: number) {
    return EthAddress.fromString(await this.rollupProcessor.getSupportedAsset(assetId));
  }

  async getSupportedAssets() {
    const [assetAddresses, gasLimits]: any[][] = await this.rollupProcessor.getSupportedAssets();
    return assetAddresses.map((a, i) => ({
      address: EthAddress.fromString(a),
      gasLimit: +gasLimits[i],
    }));
  }

  async setVerifier(address: EthAddress, options: SendTxOptions = {}) {
    const { gasLimit } = { ...options };
    const rollupProcessor = this.getContractWithSigner(options);
    const tx = await rollupProcessor.setVerifier(address.toString(), { gasLimit }).catch(fixEthersStackTrace);
    const receipt = await tx.wait(this.minConfirmations);
    return TxHash.fromString(receipt.transactionHash);
  }

  async setThirdPartyContractStatus(flag: boolean, options: SendTxOptions = {}) {
    const { gasLimit } = { ...options };
    const rollupProcessor = this.getContractWithSigner(options);
    const tx = await rollupProcessor.setAllowThirdPartyContracts(flag, { gasLimit });
    const receipt = await tx.wait(this.minConfirmations);
    return TxHash.fromString(receipt.transactionHash);
  }

  async setSupportedBridge(bridgeAddress: EthAddress, bridgeGasLimit = 0, options: SendTxOptions = {}) {
    const { gasLimit } = { ...options };
    const rollupProcessor = this.getContractWithSigner(options);
    const tx = await rollupProcessor.setSupportedBridge(bridgeAddress.toString(), bridgeGasLimit, { gasLimit });
    const receipt = await tx.wait(this.minConfirmations);
    return TxHash.fromString(receipt.transactionHash);
  }

  async setSupportedAsset(assetAddress: EthAddress, assetGasLimit = 0, options: SendTxOptions = {}) {
    const { gasLimit } = { ...options };
    const rollupProcessor = this.getContractWithSigner(options);
    const tx = await rollupProcessor.setSupportedAsset(assetAddress.toString(), assetGasLimit, {
      gasLimit,
    });
    const receipt = await tx.wait(this.minConfirmations);
    return TxHash.fromString(receipt.transactionHash);
  }

  async processAsyncDefiInteraction(interactionNonce: number, options: SendTxOptions = {}) {
    const { gasLimit } = { ...options };
    const rollupProcessor = this.getContractWithSigner(options);
    const tx = await rollupProcessor
      .processAsyncDefiInteraction(interactionNonce, { gasLimit })
      .catch(fixEthersStackTrace);
    const receipt = await tx.wait(this.minConfirmations);
    return TxHash.fromString(receipt.transactionHash);
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
    options: SendTxOptions = {},
  ) {
    const { gasLimit } = { ...options };
    const rollupProcessor = this.getContractWithSigner(options);
    const depositor = await rollupProcessor.signer.getAddress();
    const tx = await rollupProcessor
      .depositPendingFunds(assetId, amount, depositor, proofHash, {
        value: assetId === 0 ? amount : undefined,
        gasLimit,
      })
      .catch(fixEthersStackTrace);
    const receipt = await tx.wait(this.minConfirmations);
    return TxHash.fromString(receipt.transactionHash);
  }

  async depositPendingFundsPermit(
    assetId: number,
    amount: bigint,
    deadline: bigint,
    signature: EthereumSignature,
    proofHash: Buffer = Buffer.alloc(32),
    options: SendTxOptions = {},
  ) {
    const { gasLimit } = { ...options };
    const rollupProcessor = this.getContractWithSigner(options);
    const depositor = await rollupProcessor.signer.getAddress();
    const tx = await rollupProcessor
      .depositPendingFundsPermit(
        assetId,
        amount,
        depositor,
        proofHash,
        deadline,
        signature.v,
        signature.r,
        signature.s,
        { gasLimit },
      )
      .catch(fixEthersStackTrace);
    const receipt = await tx.wait(this.minConfirmations);
    return TxHash.fromString(receipt.transactionHash);
  }

  async depositPendingFundsPermitNonStandard(
    assetId: number,
    amount: bigint,
    nonce: bigint,
    deadline: bigint,
    signature: EthereumSignature,
    proofHash = Buffer.alloc(32),
    options: SendTxOptions = {},
  ) {
    const { gasLimit } = { ...options };
    const rollupProcessor = this.getContractWithSigner(options);
    const depositor = await rollupProcessor.signer.getAddress();
    const tx = await rollupProcessor
      .depositPendingFundsPermitNonStandard(
        assetId,
        amount,
        depositor,
        proofHash,
        nonce,
        deadline,
        signature.v,
        signature.r,
        signature.s,
        { gasLimit },
      )
      .catch(fixEthersStackTrace);
    const receipt = await tx.wait(this.minConfirmations);
    return TxHash.fromString(receipt.transactionHash);
  }

  async approveProof(proofHash: Buffer, options: SendTxOptions = {}) {
    const { gasLimit } = { ...options };
    const rollupProcessor = this.getContractWithSigner(options);
    const tx = await rollupProcessor.approveProof(proofHash, { gasLimit }).catch(fixEthersStackTrace);
    const receipt = await tx.wait(this.minConfirmations);
    return TxHash.fromString(receipt.transactionHash);
  }

  async getProofApprovalStatus(address: EthAddress, txId: Buffer): Promise<boolean> {
    return await this.rollupProcessor.depositProofApprovals(address.toString(), txId);
  }

  async getUserPendingDeposit(assetId: number, account: EthAddress) {
    return BigInt(await this.rollupProcessor.getUserPendingDeposit(assetId, account.toString()));
  }

  async getThirdPartyContractStatus(options: SendTxOptions = {}) {
    const { gasLimit } = { ...options };
    return await this.rollupProcessor.allowThirdPartyContracts({ gasLimit });
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

    const totalStartTime = new Date().getTime();
    while (end > earliestBlock) {
      const rollupFilter = this.rollupProcessor.filters.RollupProcessed();
      this.log(`Fetching rollup events between blocks ${start} and ${end}...`);
      const startTime = new Date().getTime();
      const rollupEvents = await this.rollupProcessor.queryFilter(rollupFilter, start, end);
      this.log(`${rollupEvents.length} fetched in ${(new Date().getTime() - startTime) / 1000}s`);

      events = [...rollupEvents, ...events];

      if (events.length && events[0].args!.rollupId.toNumber() <= rollupId) {
        this.lastQueriedRollupId = rollupId;
        this.lastQueriedRollupBlockNum = events[events.length - 1].blockNumber;
        break;
      }
      end = Math.max(start - 1, earliestBlock);
      start = Math.max(end - chunk, earliestBlock);
    }
    this.log(`Done: ${events.length} fetched in ${(new Date().getTime() - totalStartTime) / 1000}s`);

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
      this.log(`Fetching rollup events between blocks ${start} and ${end}...`);
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
    this.log(`Fetching data for ${rollupEvents.length} rollups...`);
    const startTime = new Date().getTime();

    const blocks: Block[] = [];
    while (rollupEvents.length) {
      const events = rollupEvents.splice(0, 10);
      // retrieve all of the defi notes for these rollup events
      const defiPromise = this.getDefiBridgeEventsForRollupEvents(events);
      const eventTxDetailsPromise = Promise.all(
        events.map(async event => {
          const meta = await Promise.all([event.getTransaction(), event.getBlock(), event.getTransactionReceipt()]);
          return {
            event,
            tx: meta[0],
            block: meta[1],
            receipt: meta[2],
          };
        }),
      );
      const [meta, allDefiNotes] = await Promise.all([eventTxDetailsPromise, defiPromise]);
      // we now have the tx details and defi notes for this batch of rollup events
      // we need to assign the defi notes to their specified rollup
      const newBlocks = meta
        .filter(m => m.tx.confirmations >= minConfirmations)
        .map(meta => {
          // assign the set of defi notes for this rollup and decode the block
          const hashesForThisRollup = this.extractDefiHashesFromRollupEvent(meta.event);
          const defiNotesForThisRollup: DefiInteractionNote[] = [];
          for (const hash of hashesForThisRollup) {
            if (!allDefiNotes[hash]) {
              console.log(`Unable to locate defi interaction note for hash ${hash}!`);
              continue;
            }
            defiNotesForThisRollup.push(allDefiNotes[hash]!);
          }
          return this.decodeBlock(
            { ...meta.tx, timestamp: meta.block.timestamp },
            meta.receipt,
            defiNotesForThisRollup,
          );
        });
      blocks.push(...newBlocks);
    }

    this.log(`Fetched in ${(new Date().getTime() - startTime) / 1000}s`);

    return blocks;
  }

  private extractDefiHashesFromRollupEvent(rollupEvent: Event) {
    // the rollup contract publishes a set of hash values with each rollup event
    const rollupLog = { blockNumber: rollupEvent.blockNumber, topics: rollupEvent.topics, data: rollupEvent.data };
    const {
      args: { nextExpectedDefiHashes, rollupId },
    } = this.contract.interface.parseLog(rollupLog);
    // this is the hash of a 'zeroed' defi interaction note as specified on the rollup contract
    // the rollup contract shouldn't publish hashes of zero notes but we will filter them if it does
    const zeroHash = RollupProcessor.DEFI_RESULT_ZERO_HASH;
    // filter 'zero' hashes and remove the '0x' from the front
    const nonZeroHashes: string[] = nextExpectedDefiHashes.filter((hash: string) => hash !== zeroHash);
    if (nonZeroHashes.length !== nextExpectedDefiHashes.length) {
      console.log(
        `Received 'zero' defi interaction note hashes in next expected defi hashes for rollup ${rollupId}, ignoring them!`,
      );
    }
    return nonZeroHashes.map((hash: string) => hash.slice(2));
  }

  private async getDefiBridgeEventsForRollupEvents(rollupEvents: Event[]) {
    // retrieve all defi interaction notes from the DefiBridgeProcessed stream for the set of rollup events given
    const rollupHashes = rollupEvents.flatMap(ev => this.extractDefiHashesFromRollupEvent(ev));
    const hashMapping: { [key: string]: DefiInteractionNote | undefined } = {};
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
      this.log(`Searching for defi notes from blocks ${startBlock} - ${endBlock}`);
      const filter = this.rollupProcessor.filters.DefiBridgeProcessed();
      const defiBridgeEvents = await this.rollupProcessor.queryFilter(filter, startBlock, endBlock);
      // decode the retrieved events into actual defi interaction notes
      const decodedNotes = defiBridgeEvents.map((log: { blockNumber: number; topics: string[]; data: string }) => {
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
      this.log(
        `Found ${decodedNotes.length} notes between blocks ${startBlock} - ${endBlock}, nonces: `,
        decodedNotes.map(note => note.nonce),
      );
      // compute the hash and store the notes against that hash in our mapping
      for (const decodedNote of decodedNotes) {
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

    return new Block(
      TxHash.fromString(tx.hash),
      new Date(tx.timestamp! * 1000),
      rollupProofData.rollupId,
      rollupProofData.rollupSize,
      rollupProofData.toBuffer(),
      offchainTxData,
      interactionResult,
      receipt.gasUsed.toNumber(),
      BigInt(tx.gasPrice!.toString()),
    );
  }

  protected getContractWithSigner(options: SendTxOptions) {
    const { signingAddress } = options;
    const provider = options.provider ? new Web3Provider(options.provider) : this.provider;
    const ethSigner = provider.getSigner(signingAddress ? signingAddress.toString() : 0);
    return new Contract(this.rollupContractAddress.toString(), abi, ethSigner);
  }

  public async getRevertError(txHash: TxHash) {
    return await decodeErrorFromContractByTxHash(this.contract, txHash, this.ethereumProvider);
  }
}
