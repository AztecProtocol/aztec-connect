import { toBigIntBE, toBufferBE } from '@aztec/barretenberg/bigint_buffer';
import { ProofData, ProofId } from '@aztec/barretenberg/client_proofs';
import { InterruptError } from '@aztec/barretenberg/errors';
import { createDebugLogger, createLogger } from '@aztec/barretenberg/log';
import { HashPath } from '@aztec/barretenberg/merkle_tree';
import { NoteAlgorithms } from '@aztec/barretenberg/note_algorithms';
import { RollupProofData } from '@aztec/barretenberg/rollup_proof';
import { numToUInt32BE } from '@aztec/barretenberg/serialize';
import { RollupTreeId, WorldStateDb } from '@aztec/barretenberg/world_state_db';
import { ProofGenerator, TxRollup, TxRollupProofRequest } from '@aztec/halloumi/proof_generator';
import { RollupProofDao, TxDao } from './entity/index.js';
import { Metrics } from './metrics/index.js';
import { RollupDb } from './rollup_db/index.js';
import { TxFeeResolver } from './tx_fee_resolver/index.js';

export class RollupCreator {
  private interrupted = false;

  constructor(
    private rollupDb: RollupDb,
    private worldStateDb: WorldStateDb,
    private proofGenerator: ProofGenerator,
    private noteAlgo: NoteAlgorithms,
    private numInnerRollupTxs: number,
    private innerRollupSize: number,
    private outerRollupSize: number,
    private metrics: Metrics,
    private feeResolver: TxFeeResolver,
    private log = createLogger('RollupCreator'),
    private debug = createDebugLogger('rollup_creator'),
  ) {}

  /**
   * Creates a rollup from the given txs and publishes it.
   * @returns true if successfully published, otherwise false.
   */

  public async create(txs: TxDao[], rollup: TxRollup) {
    if (!txs.length) {
      throw new Error('Txs empty.');
    }

    this.log(`Creating proof for tx rollup ${rollup.rollupHash.toString('hex')} with ${txs.length} txs...`);
    const end = this.metrics.txRollupTimer();
    const txRollupRequest = new TxRollupProofRequest(rollup);
    this.checkpoint();
    const proof = await this.proofGenerator.createProof(txRollupRequest.toBuffer());
    this.log(`Tx rollup proof received: ${proof.length} bytes`);
    end();

    // Although we don't actually write this to the database we will use the DAO object
    const rollupProofDao = new RollupProofDao({
      id: rollup.rollupHash,
      txs,
      // store the proof data here in the encoded proof data member
      encodedProofData: proof,
      rollupSize: this.innerRollupSize,
      dataStartIndex: rollup.dataStartIndex,
      created: new Date(),
    });

    return rollupProofDao;
  }

  public async interrupt() {
    this.interrupted = true;
    await this.proofGenerator.interrupt();
  }

  private checkpoint() {
    if (this.interrupted) {
      throw new InterruptError('Interrupted.');
    }
  }

  public async createRollup(
    txs: TxDao[],
    rootRollupBridgeCallDatas: bigint[],
    rootRollupAssetIds: Set<number>,
    firstInner: boolean,
  ) {
    const rollupId = await this.rollupDb.getNextRollupId();

    // To find the correct data start index, we need to position ourselves on:
    // - an outer rollup size boundary for the first inner proof.
    // - an inner rollup size boundary for any other proofs.

    const worldStateDb = this.worldStateDb;
    const dataSize = worldStateDb.getSize(RollupTreeId.DATA);
    const subtreeSize = BigInt(firstInner ? this.outerRollupSize * 2 : this.innerRollupSize * 2);
    const dataStartIndex = dataSize % subtreeSize === 0n ? dataSize : dataSize + subtreeSize - (dataSize % subtreeSize);

    // Get old data.
    const oldDataRoot = worldStateDb.getRoot(RollupTreeId.DATA);
    const oldDataPath = await worldStateDb.getHashPath(RollupTreeId.DATA, dataStartIndex);
    const oldNullRoot = worldStateDb.getRoot(RollupTreeId.NULL);

    // Insert each txs elements into the db.
    let nextDataIndex = dataStartIndex;
    const newNullRoots: Buffer[] = [];
    const oldNullPaths: HashPath[] = [];
    const newNullPaths: HashPath[] = [];
    const dataRootsPaths: HashPath[] = [];
    const dataRootsIndicies: number[] = [];
    const localAssetIds: Set<number> = new Set();

    const proofs = txs.map(tx => new ProofData(tx.proofData));
    this.debug('getting linked commitments...');
    const { linkedCommitmentPaths, linkedCommitmentIndices } = await this.getLinkedCommitments(proofs);
    this.debug('linked commitments retrieval completed');

    for (let i = 0; i < proofs.length; ++i) {
      const proof = proofs[i];
      const tx = txs[i];
      // check for an interrupt request with each loop
      // for large rollups this loop can take some time
      this.checkpoint();

      if (proof.proofId !== ProofId.ACCOUNT) {
        const assetId = proof.feeAssetId;
        if (this.feeResolver.isFeePayingAsset(assetId)) {
          localAssetIds.add(assetId);
          rootRollupAssetIds.add(assetId);
        }
      }

      this.debug(`inserting commitments at index ${nextDataIndex}`);
      if (proof.proofId !== ProofId.DEFI_DEPOSIT) {
        await worldStateDb.put(RollupTreeId.DATA, nextDataIndex++, proof.noteCommitment1);
      } else {
        const proofBridgeCallData = toBigIntBE(proof.bridgeCallData);
        let rootBridgeIndex = rootRollupBridgeCallDatas.findIndex(id => id === proofBridgeCallData);
        if (rootBridgeIndex === -1) {
          rootBridgeIndex = rootRollupBridgeCallDatas.length;
          rootRollupBridgeCallDatas.push(proofBridgeCallData);
        }
        const interactionNonce = rollupId * RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK + rootBridgeIndex;
        const txFee = toBigIntBE(proof.txFee);
        const claimFee = txFee - (txFee >> BigInt(1));
        const encNote = this.noteAlgo.claimNoteCompletePartialCommitment(
          proof.noteCommitment1,
          interactionNonce,
          claimFee,
        );
        await worldStateDb.put(RollupTreeId.DATA, nextDataIndex++, encNote);
      }
      await worldStateDb.put(RollupTreeId.DATA, nextDataIndex++, proof.noteCommitment2);
      this.debug(`inserting nullifiers and retrieving hash paths...`);
      for (const nullifierBuf of [proof.nullifier1, proof.nullifier2]) {
        const nullifier = toBigIntBE(nullifierBuf);
        oldNullPaths.push(await worldStateDb.getHashPath(RollupTreeId.NULL, nullifier));
        if (nullifier) {
          await worldStateDb.put(RollupTreeId.NULL, nullifier, toBufferBE(1n, 32));
        }
        newNullRoots.push(worldStateDb.getRoot(RollupTreeId.NULL));
        newNullPaths.push(await worldStateDb.getHashPath(RollupTreeId.NULL, nullifier));
      }

      dataRootsPaths.push(await worldStateDb.getHashPath(RollupTreeId.ROOT, BigInt(tx.dataRootsIndex!)));
      dataRootsIndicies.push(tx.dataRootsIndex!);
      this.debug(`completed merkle tree updates for tx ${i + 1}/${proofs.length}`);
    }

    if (txs.length < this.numInnerRollupTxs) {
      // Grows the data tree by inserting 0 at last subtree position.
      await worldStateDb.put(
        RollupTreeId.DATA,
        dataStartIndex + BigInt(this.innerRollupSize) * 2n - 1n,
        Buffer.alloc(32, 0),
      );

      // Add padding data. The vectors that are shorter than their expected size, will be grown to their full circuit
      // size using the last element in the vector as the value. Padding transactions will use nullifier index 0, and
      // expect the value at index 0 to be unchanged.
      const zeroNullPath = await worldStateDb.getHashPath(RollupTreeId.NULL, BigInt(0));
      oldNullPaths.push(zeroNullPath);
      newNullPaths.push(zeroNullPath);
    }

    // Get new data.
    const newDataRoot = worldStateDb.getRoot(RollupTreeId.DATA);
    const dataRootsRoot = worldStateDb.getRoot(RollupTreeId.ROOT);
    const newDefiRoot = worldStateDb.getRoot(RollupTreeId.DEFI);

    return new TxRollup(
      rollupId,
      Number(dataStartIndex),
      txs.map(tx => tx.proofData),

      oldDataRoot,
      newDataRoot,
      oldDataPath,
      linkedCommitmentPaths,
      linkedCommitmentIndices,

      oldNullRoot,
      newNullRoots,
      oldNullPaths,

      dataRootsRoot,
      dataRootsPaths,
      dataRootsIndicies,

      newDefiRoot,
      rootRollupBridgeCallDatas.map(bridge => toBufferBE(bridge, 32)),

      [...localAssetIds].map(id => numToUInt32BE(id, 32)),
    );
  }

  // This function determines the data tree indices and hash paths of commitments that precede commitments within this rollup
  // i.e. if a commitment in this rollup is chained from a commitment that is already in the data tree, we need it's index and hash path
  // if a commitment is chained from another commitment in this rollup then we return empty indices/paths
  private async getLinkedCommitments(proofs: ProofData[]) {
    const commitmentsInCurrentRollup: Set<string> = new Set<string>();
    const linkedCommitmentPaths: HashPath[] = [];
    const linkedCommitmentIndices: number[] = [];
    const emptyBuffer = Buffer.alloc(32);
    const dataSize = this.worldStateDb.getSize(RollupTreeId.DATA);
    const emptyPath = await this.worldStateDb.getHashPath(RollupTreeId.DATA, dataSize);
    const dataTreeValues: Buffer[] = [];
    for (const { backwardLink, noteCommitment1, noteCommitment2 } of proofs) {
      if (backwardLink.equals(emptyBuffer) || commitmentsInCurrentRollup.has(backwardLink.toString('hex'))) {
        linkedCommitmentPaths.push(emptyPath);
        linkedCommitmentIndices.push(0);
      } else {
        // the cache is built up so that it contains commitments in reverse order to that of the tree
        // e.g. commitment at dataTree[dataSize - 1] == dataTreeValues[0]
        const indexIntoCache = dataTreeValues.findIndex(c => c.equals(backwardLink));
        if (indexIntoCache !== -1) {
          // our referenced commitment exists in the cache.
          const indexIntoTree = dataSize - BigInt(indexIntoCache + 1);
          linkedCommitmentPaths.push(await this.worldStateDb.getHashPath(RollupTreeId.DATA, indexIntoTree));
          linkedCommitmentIndices.push(Number(indexIntoTree));
        } else {
          // our reference commitment is not in the cache, we need to scan further back through the tree to find it
          // of course we will increase our cache along the way
          let indexIntoTree = dataSize - BigInt(dataTreeValues.length + 1);
          while (indexIntoTree >= 0) {
            const valueFromTree = await this.worldStateDb.get(RollupTreeId.DATA, indexIntoTree);
            dataTreeValues.push(valueFromTree);
            if (valueFromTree.equals(backwardLink)) {
              // we found our link
              linkedCommitmentPaths.push(await this.worldStateDb.getHashPath(RollupTreeId.DATA, indexIntoTree));
              linkedCommitmentIndices.push(Number(indexIntoTree));
              break;
            }
            indexIntoTree--;
          }
          if (indexIntoTree < 0) {
            //we couldn't find the commitment. shouldn't get here, use the empty path but this will likely be rejected
            this.log(`Could not find commitment that we are linked from: ${backwardLink.toString('hex')}`);
            linkedCommitmentPaths.push(emptyPath);
            linkedCommitmentIndices.push(0);
          }
        }
      }
      const commitmentStrings = [noteCommitment1, noteCommitment2]
        .filter(c => !c.equals(emptyBuffer))
        .map(c => c.toString('hex'));
      for (const str of commitmentStrings) {
        commitmentsInCurrentRollup.add(str);
      }
    }
    return { linkedCommitmentPaths, linkedCommitmentIndices };
  }
}
