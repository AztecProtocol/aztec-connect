import { EthAddress } from '@aztec/barretenberg/address';
import { toBigIntBE } from '@aztec/barretenberg/bigint_buffer';
import { virtualAssetIdFlag } from '@aztec/barretenberg/bridge_call_data';
import { ProofId } from '@aztec/barretenberg/client_proofs';
import { Grumpkin } from '@aztec/barretenberg/ecc';
import { createDebugLogger } from '@aztec/barretenberg/log';
import { deriveNoteSecret, NoteAlgorithms, TreeNote } from '@aztec/barretenberg/note_algorithms';
import {
  OffchainAccountData,
  OffchainDefiDepositData,
  OffchainJoinSplitData,
} from '@aztec/barretenberg/offchain_tx_data';
import { InnerProofData, RollupProofData } from '@aztec/barretenberg/rollup_proof';
import { Timer } from '@aztec/barretenberg/timer';
import { TxId } from '@aztec/barretenberg/tx_id';
import { BlockContext } from '../block_context/block_context.js';
import { CoreAccountTx, CoreDefiTx, CorePaymentTx, CoreUserTx, PaymentProofId } from '../core_tx/index.js';
import { BulkUserStateUpdateData, Database, SpendingKey } from '../database/index.js';
import { Note } from '../note/index.js';
import { UserData } from '../user/index.js';

const debug = createDebugLogger('bb:db_ops');

interface Input {
  blockContexts: BlockContext[];
  rollupProofData: RollupProofData[];
  offchainJoinSplitData: OffchainJoinSplitData[];
  offchainAccountData: OffchainAccountData[];
  offchainDefiDepositData: OffchainDefiDepositData[];
  treeNotes: (TreeNote | undefined)[];
}

/**
 * This class computes the various db updates that need to occur as an effect of processing a batch of rollups.
 * The write operations are collected together in a single bulk update structure, that is then passed to the database
 * to process within a single transaction. This means either the full update occurs or not at all. The atomicity here
 * is probably not hugely important as the db updates are idempotent, however the performance gained by doing a single
 * operation is desirable, especially with indexeddb.
 * This approach encourages a design whereby we minimise reads from the database in order to perform the writes.
 * The bulk update will always perform all insertion operations first, followed by any update operations. This
 * guarantees that updates that need to key on an entity that's expected to exist, will succeed.
 *
 * PaymentTx:
 *   Adds up to two new notes and nullifies up to two notes. Upserts a settled payment tx.
 *   The payment tx records the privateInput, which requires knowledge of the input notes.
 *
 * AccountTx:
 *   Adds up to two spending keys. Upserts a settled account tx.
 *
 * DefiTx:
 *   Adds a single change note and nullifies up to two notes. Upserts a settled defi tx.
 *   At this point we learn the interaction nonce, claim note nullifier, and if async.
 *
 * DefiInteractionResult:
 *   Updates a DefiTx with the output values, depends on access to the DefiTx state.
 *
 * ClaimTx:
 *   Adds up to two notes that depend on access to the DefiTx state. Updates a DefiTx to mark it as claimed.
 *
 * In order to support the processing of DefiInteractionResults and ClaimTxs that require access to the prior DefiTx
 * state, we preload all unclaimed DefiTxs in `unclaimedDefiTxs`.
 * As we process blocks we maintain these unclaimed DefiTxs accordingly so we can produce the appropriate db writes.
 *
 * In order to support the processing of PaymentTxs that record the privateInput, we track new Notes in `unspentNotes`,
 * and when nullifying Notes as part of a PaymentTx we look there first, and if not found perform a db read to load
 * the note.
 */
export class DbOps {
  private writeData = new BulkUserStateUpdateData();
  private unspentNotes: Note[] = [];
  private pendingUserTxs: CoreUserTx[] = [];
  private unclaimedDefiTxs: CoreDefiTx[] = [];

  constructor(
    private userData: UserData,
    private noteAlgos: NoteAlgorithms,
    private db: Database,
    private grumpkin: Grumpkin,
  ) {}

  public async handleTxs({
    blockContexts,
    rollupProofData,
    offchainJoinSplitData,
    offchainAccountData,
    offchainDefiDepositData,
    treeNotes,
  }: Input) {
    this.debug(
      `preparing db write ops for rollups ${blockContexts[0].rollup.rollupId} to ${
        blockContexts[blockContexts.length - 1].rollup.rollupId
      }...`,
    );

    const timer = new Timer();
    let treeNoteStartIndex = 0;
    let offchainJoinSplitIndex = 0;
    let offchainAccountIndex = 0;
    let offchainDefiIndex = 0;
    this.pendingUserTxs = await this.db.getPendingUserTxs(this.userData.accountPublicKey);
    this.unclaimedDefiTxs = await this.db.getUnclaimedDefiTxs(this.userData.accountPublicKey);

    for (let blockIndex = 0; blockIndex < blockContexts.length; ++blockIndex) {
      const blockContext = blockContexts[blockIndex];
      const proofData = rollupProofData[blockIndex];

      for (let i = 0; i < proofData.innerProofData.length; ++i) {
        const proof = proofData.innerProofData[i];
        if (proof.isPadding()) {
          continue;
        }

        const noteStartIndex = proofData.dataStartIndex + i * 2;
        switch (proof.proofId) {
          case ProofId.DEPOSIT:
          case ProofId.WITHDRAW:
          case ProofId.SEND: {
            const offchainTxData = offchainJoinSplitData[offchainJoinSplitIndex++];
            const note1 = treeNotes[treeNoteStartIndex++];
            const note2 = treeNotes[treeNoteStartIndex++];
            await this.handlePaymentTx(blockContext, proof, offchainTxData, noteStartIndex, note1, note2);
            break;
          }
          case ProofId.ACCOUNT: {
            const offchainTxData = offchainAccountData[offchainAccountIndex++];
            await this.handleAccountTx(blockContext, proof, offchainTxData, noteStartIndex);
            break;
          }
          case ProofId.DEFI_DEPOSIT: {
            const note2 = treeNotes[treeNoteStartIndex++];
            const offchainTxData = offchainDefiDepositData[offchainDefiIndex++];
            await this.handleDefiDepositTx(blockContext, proofData, proof, offchainTxData, noteStartIndex, note2);
            break;
          }
          case ProofId.DEFI_CLAIM: {
            await this.handleClaimTx(proof, blockContext, noteStartIndex);
            break;
          }
        }
      }

      this.userData.syncedToRollup = proofData.rollupId;

      this.processDefiInteractionResults(blockContext);
    }

    this.writeData.updateUserArgs.push([this.userData]);

    this.debug(
      `executing db write ops for rollups ${blockContexts[0].rollup.rollupId} to ${
        blockContexts[blockContexts.length - 1].rollup.rollupId
      }...`,
    );
    this.deDupeWriteDataUpserts();
    const writeTimer = new Timer();
    await this.db.bulkUserStateUpdate(this.writeData);

    this.debug(`write done in ${writeTimer.ms()}ms, total ${timer.ms()}ms.`);
  }

  // ---------------
  // PRIVATE METHODS
  // ---------------

  private async handleAccountTx(
    blockContext: BlockContext,
    proof: InnerProofData,
    offchainTxData: OffchainAccountData,
    noteStartIndex: number,
  ) {
    if (!offchainTxData.accountPublicKey.equals(this.userData.accountPublicKey)) {
      // Not our account tx.
      return;
    }
    this.debug('handling account...');

    const tx = this.createAccountTx(proof, offchainTxData, blockContext.block.mined);
    const { txId, userId, newSpendingPublicKey1, newSpendingPublicKey2 } = tx;

    if (newSpendingPublicKey1) {
      this.debug(`added spending key ${newSpendingPublicKey1.toString('hex')}.`);
      const hashPath = await blockContext.getBlockSubtreeHashPath(noteStartIndex);
      this.writeData.addSpendingKeyArgs.push([
        new SpendingKey(userId, newSpendingPublicKey1, noteStartIndex, hashPath.toBuffer()),
      ]);
    }

    if (newSpendingPublicKey2) {
      this.debug(`added spending key ${newSpendingPublicKey2.toString('hex')}.`);
      const hashPath = await blockContext.getBlockSubtreeHashPath(noteStartIndex + 1);
      this.writeData.addSpendingKeyArgs.push([
        new SpendingKey(userId, newSpendingPublicKey2, noteStartIndex + 1, hashPath.toBuffer()),
      ]);
    }

    this.writeData.upsertAccountTxArgs.push([tx]);

    this.debug(`settled account tx: ${txId.toString()}`);
  }

  private createAccountTx(proof: InnerProofData, offchainTxData: OffchainAccountData, blockCreated: Date) {
    const { accountPublicKey, aliasHash, spendingPublicKey1, spendingPublicKey2, txRefNo } = offchainTxData;
    const txId = new TxId(proof.txId);
    const { nullifier1, nullifier2 } = proof;
    // A tx is for account migration when it nullifies the accountPublicKey (nullifier2) but not the aliasHash (nullifier1).
    const migrated = !toBigIntBE(nullifier1) && !!toBigIntBE(nullifier2);
    const created = this.pendingUserTxs.find(tx => tx.txId.equals(txId))?.created || new Date();

    return new CoreAccountTx(
      txId,
      accountPublicKey,
      aliasHash,
      toBigIntBE(spendingPublicKey1) ? spendingPublicKey1 : undefined,
      toBigIntBE(spendingPublicKey2) ? spendingPublicKey2 : undefined,
      migrated,
      txRefNo,
      created,
      blockCreated,
    );
  }

  private async handlePaymentTx(
    blockContext: BlockContext,
    proof: InnerProofData,
    offchainTxData: OffchainJoinSplitData,
    noteStartIndex: number,
    note1?: TreeNote,
    note2?: TreeNote,
  ) {
    if (!note1 && !note2) {
      // Not our payment tx.
      return;
    }
    this.debug('handling payment...');

    const { mined: created } = blockContext.block;
    const { noteCommitment1, noteCommitment2, nullifier1, nullifier2 } = proof;
    const newNote = note1 ? await this.addNote(noteStartIndex, note1, noteCommitment1, blockContext) : undefined;
    const changeNote = note2 ? await this.addNote(noteStartIndex + 1, note2, noteCommitment2, blockContext) : undefined;

    const destroyedNote1 = await this.nullifyNote(nullifier1);
    const destroyedNote2 = await this.nullifyNote(nullifier2);

    const tx = this.createPaymentTx(
      proof,
      offchainTxData,
      created,
      newNote,
      changeNote,
      destroyedNote1,
      destroyedNote2,
    );
    this.writeData.upsertPaymentTxArgs.push([tx]);

    this.debug(`settled payment tx: ${tx.txId}`);
  }

  private createPaymentTx(
    proof: InnerProofData,
    offchainTxData: OffchainJoinSplitData,
    blockCreated: Date,
    valueNote: Note | undefined,
    changeNote: Note | undefined,
    destroyedNote1: Note | undefined,
    destroyedNote2: Note | undefined,
  ) {
    const txId = new TxId(proof.txId);
    const pendingTx = this.pendingUserTxs.find(tx => tx.txId.equals(txId)) as CorePaymentTx | undefined;
    const proofId = proof.proofId as PaymentProofId;
    const assetId = (valueNote || changeNote)!.assetId;
    const publicValue = toBigIntBE(proof.publicValue);
    const publicOwner = publicValue ? new EthAddress(proof.publicOwner) : undefined;
    const noteValue = (note?: Note) => (note ? note.value : BigInt(0));
    const privateInput = noteValue(destroyedNote1) + noteValue(destroyedNote2);
    const recipientPrivateOutput = pendingTx?.recipientPrivateOutput || noteValue(valueNote);
    const senderPrivateOutput = noteValue(changeNote);
    const isRecipient = !!valueNote;
    const isSender = !!changeNote;
    const { txRefNo } = offchainTxData;
    const created = pendingTx?.created || new Date();

    return new CorePaymentTx(
      txId,
      this.userData.accountPublicKey,
      proofId,
      assetId,
      publicValue,
      publicOwner,
      privateInput,
      recipientPrivateOutput,
      senderPrivateOutput,
      isRecipient,
      isSender,
      txRefNo,
      created,
      blockCreated,
    );
  }

  private async handleDefiDepositTx(
    blockContext: BlockContext,
    rollupProofData: RollupProofData,
    proof: InnerProofData,
    offchainTxData: OffchainDefiDepositData,
    noteStartIndex: number,
    treeNote2?: TreeNote,
  ) {
    if (!treeNote2) {
      // Both notes are owned by the same user, thus not our defi deposit.
      return;
    }
    this.debug('handling defi deposit...');

    const { noteCommitment2, nullifier1, nullifier2 } = proof;

    // Add the change note.
    await this.addNote(noteStartIndex + 1, treeNote2, noteCommitment2, blockContext);

    // Mark input notes as nullified.
    await this.nullifyNote(nullifier1);
    await this.nullifyNote(nullifier2);

    const { rollupId, bridgeCallDatas } = rollupProofData;
    const { bridgeCallData, depositValue, txFee, txRefNo, partialState, partialStateSecretEphPubKey } = offchainTxData;
    const partialStateSecret = deriveNoteSecret(
      partialStateSecretEphPubKey,
      this.userData.accountPrivateKey,
      this.grumpkin,
    );

    // Build CoreDefiTx.
    const txId = new TxId(proof.txId);
    const interactionNonce =
      RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK * rollupId +
      bridgeCallDatas.findIndex(bridge => bridge.equals(offchainTxData.bridgeCallData.toBuffer()));
    const { interactionResult, mined } = blockContext.block;
    const isAsync = interactionResult.every(n => n.nonce !== interactionNonce);
    const nullifier = this.noteAlgos.claimNoteNullifier(proof.noteCommitment1);
    const created = this.pendingUserTxs.find(tx => tx.txId.equals(txId))?.created || new Date();
    const tx = new CoreDefiTx(
      txId,
      this.userData.accountPublicKey,
      bridgeCallData,
      depositValue,
      txFee,
      txRefNo,
      created,
      partialState,
      partialStateSecret,
      nullifier,
      mined,
      interactionNonce,
      isAsync,
    );

    this.unclaimedDefiTxs.push(tx);
    this.writeData.upsertDefiTxArgs.push([tx]);

    this.debug(`settled defi tx, awaiting claim for l2 settlement: ${txId}`);
  }

  private processDefiInteractionResults(blockContext: BlockContext) {
    const { interactionResult, mined } = blockContext.block;
    for (const event of interactionResult) {
      this.unclaimedDefiTxs
        .filter(tx => tx.interactionNonce === event.nonce && tx.finalised === undefined)
        .forEach(tx => {
          tx.outputValueA = !event.result
            ? BigInt(0)
            : (event.totalOutputValueA * tx.depositValue) / event.totalInputValue;
          tx.outputValueB = !event.result
            ? BigInt(0)
            : (event.totalOutputValueB * tx.depositValue) / event.totalInputValue;
          tx.finalised = mined;
          tx.success = event.result;
          this.debug(`finalised defi tx: ${tx.txId} success: ${tx.success}`);
          this.writeData.upsertDefiTxArgs.push([tx]);
        });
    }
  }

  private async handleClaimTx(proof: InnerProofData, blockContext: BlockContext, noteStartIndex: number) {
    const defiTx = this.unclaimedDefiTxs.find(tx => tx.nullifier?.equals(proof.nullifier1));
    if (!defiTx) {
      return;
    }
    this.debug('handling claim...');

    const {
      userId,
      partialState,
      partialStateSecret,
      interactionNonce,
      bridgeCallData,
      depositValue,
      outputValueA,
      outputValueB,
      success,
    } = defiTx;
    const { txId, noteCommitment1, noteCommitment2, nullifier1, nullifier2 } = proof;

    const accountRequired = this.noteAlgos
      .valueNotePartialCommitment(
        partialStateSecret,
        userId,
        true, // accountRequired
      )
      .equals(partialState);

    // When generating output notes, set creatorPubKey to 0 (it's a DeFi txn, recipient of note is same as creator of claim note)
    if (!success) {
      {
        const treeNote = new TreeNote(
          userId,
          depositValue,
          bridgeCallData.inputAssetIdA,
          accountRequired,
          partialStateSecret,
          Buffer.alloc(32),
          nullifier1,
        );
        await this.addNote(noteStartIndex, treeNote, noteCommitment1, blockContext);
      }

      if (bridgeCallData.numInputAssets === 2) {
        const treeNote = new TreeNote(
          userId,
          depositValue,
          bridgeCallData.inputAssetIdB!,
          accountRequired,
          partialStateSecret,
          Buffer.alloc(32),
          nullifier2,
        );
        await this.addNote(noteStartIndex + 1, treeNote, noteCommitment2, blockContext);
      }
    }

    if (outputValueA) {
      const treeNote = new TreeNote(
        userId,
        outputValueA,
        bridgeCallData.firstOutputVirtual ? virtualAssetIdFlag + interactionNonce! : bridgeCallData.outputAssetIdA,
        accountRequired,
        partialStateSecret,
        Buffer.alloc(32),
        nullifier1,
      );
      await this.addNote(noteStartIndex, treeNote, noteCommitment1, blockContext);
    }
    if (outputValueB) {
      const treeNote = new TreeNote(
        userId,
        outputValueB,
        bridgeCallData.secondOutputVirtual ? virtualAssetIdFlag + interactionNonce! : bridgeCallData.outputAssetIdB!,
        accountRequired,
        partialStateSecret,
        Buffer.alloc(32),
        nullifier2,
      );
      await this.addNote(noteStartIndex + 1, treeNote, noteCommitment2, blockContext);
    }

    defiTx.claimSettled = blockContext.block.mined;
    defiTx.claimTxId = new TxId(txId);
    this.writeData.upsertDefiTxArgs.push([defiTx]);

    this.debug(`claim settled defi tx on l2: ${defiTx.txId}`);
  }

  private async addNote(index: number, treeNote: TreeNote, commitment: Buffer, blockContext: BlockContext) {
    const { value } = treeNote;
    const hashPath = await blockContext.getBlockSubtreeHashPath(index);
    const nullifier = this.noteAlgos.valueNoteNullifier(commitment, this.userData.accountPrivateKey);
    const note = new Note(
      treeNote,
      commitment,
      nullifier,
      false, // allowChain
      false, // nullified
      index,
      hashPath.toBuffer(),
    );

    if (value) {
      this.unspentNotes.push(note);
      this.writeData.addNoteArgs.push([note]);
      this.debug(`new note at index: ${index} value: ${value} asset: ${treeNote.assetId}.`);
    }

    return note;
  }

  private async nullifyNote(nullifier: Buffer) {
    const note =
      this.unspentNotes.find(n => n.nullifier.equals(nullifier)) || (await this.db.getNoteByNullifier(nullifier));
    if (!note || !note.owner.equals(this.userData.accountPublicKey)) {
      return;
    }

    this.writeData.nullifyNoteArgs.push([nullifier]);
    this.debug(`nullified note at index ${note.index} with value ${note.value}.`);
    return note;
  }

  /**
   * We only need to upsert a modified DefiTx once. Also if we want to perform upserts concurrently, we don't want
   * duplicates. Keeps only the last recorded upsert for DefiTxs.
   */
  private deDupeWriteDataUpserts() {
    const mySet = new Set();
    this.writeData.upsertDefiTxArgs = this.writeData.upsertDefiTxArgs.reverse().reduce((acc, args) => {
      const id = args[0].txId.toString();
      if (!mySet.has(id)) {
        mySet.add(id);
        acc.push(args);
      }
      return acc;
    }, [] as typeof this.writeData.upsertDefiTxArgs);
  }

  private debug(...args: any[]) {
    const [first, ...rest] = args;
    debug(`${this.userData.accountPublicKey.toShortString()}: ${first}`, ...rest);
  }
}
