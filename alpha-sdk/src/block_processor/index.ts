import { EthAddress, GrumpkinAddress } from '@aztec/barretenberg/address';
import { toBigIntBE } from '@aztec/barretenberg/bigint_buffer';
import { virtualAssetIdFlag } from '@aztec/barretenberg/bridge_call_data';
import { ProofId } from '@aztec/barretenberg/client_proofs';
import { NoteAlgorithms, TreeNote } from '@aztec/barretenberg/note_algorithms';
import {
  OffchainAccountData,
  OffchainDefiDepositData,
  OffchainJoinSplitData,
} from '@aztec/barretenberg/offchain_tx_data';
import { InnerProofData, RollupProofData } from '@aztec/barretenberg/rollup_proof';
import { TxId } from '@aztec/barretenberg/tx_id';
import { BlockContext } from '../block_context/index.js';
import { DecryptedData } from '../block_decryptor/index.js';
import { CoreAccountTx, CoreClaimTx, CoreDefiTx, CorePaymentTx, PaymentProofId } from '../core_tx/index.js';
import { Database, SpendingKey } from '../database/index.js';
import { Note } from '../note/index.js';
import { ProcessedTxData } from './processed_tx_data.js';

const isNote = (n: Note | undefined): n is Note => !!n;

export class BlockProcessor {
  constructor(private noteAlgos: NoteAlgorithms, private db: Database) {}

  public async processBlocks(
    accountPublicKey: GrumpkinAddress,
    blockContexts: BlockContext[],
    { treeNotes, treeNoteNullifiers, claimOutputNoteNullifiers, partialStateSecrets }: DecryptedData,
  ) {
    let treeNoteStartIndex = 0;
    let treeNoteNullifierStartIndex = 0;
    let partialStateSecretStartIndex = 0;
    let claimOutputNoteStartIndex = 0;
    const processedTxData: ProcessedTxData[] = [];
    for (const blockContext of blockContexts) {
      const proofData = blockContext.rollup;
      const offchainTxDataBuffers = blockContext.offchainTxData;
      let offchainTxDataStartIndex = -1;

      for (let i = 0; i < proofData.innerProofData.length; ++i) {
        const proof = proofData.innerProofData[i];
        if (proof.isPadding()) {
          continue;
        }

        const noteStartIndex = proofData.dataStartIndex + i * 2;
        offchainTxDataStartIndex++;
        switch (proof.proofId) {
          case ProofId.DEPOSIT:
          case ProofId.WITHDRAW:
          case ProofId.SEND: {
            const [note1, note2] = treeNotes.slice(treeNoteStartIndex, treeNoteStartIndex + 2);
            treeNoteStartIndex += 2;
            if (!note1 && !note2) {
              // Neither note was decrypted (change note should always belong to us for txs we created).
              continue;
            }

            const offchainTxData = OffchainJoinSplitData.fromBuffer(offchainTxDataBuffers[offchainTxDataStartIndex]);
            const [note1Nullifier, note2Nullifier] = [
              note1 ? treeNoteNullifiers[treeNoteNullifierStartIndex++] : undefined,
              note2 ? treeNoteNullifiers[treeNoteNullifierStartIndex++] : undefined,
            ];
            processedTxData.push(
              await this.processPaymentTx(
                accountPublicKey,
                blockContext,
                proof,
                offchainTxData,
                noteStartIndex,
                note1,
                note1Nullifier,
                note2,
                note2Nullifier,
                processedTxData,
              ),
            );
            break;
          }
          case ProofId.ACCOUNT: {
            const offchainTxData = OffchainAccountData.fromBuffer(offchainTxDataBuffers[offchainTxDataStartIndex]);
            if (!offchainTxData.accountPublicKey.equals(accountPublicKey)) {
              continue;
            }

            processedTxData.push(
              await this.processAccountTx(accountPublicKey, blockContext, proof, offchainTxData, noteStartIndex),
            );
            break;
          }
          case ProofId.DEFI_DEPOSIT: {
            const note2 = treeNotes[treeNoteStartIndex++];
            if (!note2) {
              // Both notes should be owned by the same user.
              continue;
            }

            const offchainTxData = OffchainDefiDepositData.fromBuffer(offchainTxDataBuffers[offchainTxDataStartIndex]);
            const note2Nullifier = treeNoteNullifiers[treeNoteNullifierStartIndex++];
            const partialStateSecret = partialStateSecrets[partialStateSecretStartIndex++];
            processedTxData.push(
              await this.processDefiDepositTx(
                accountPublicKey,
                blockContext,
                proofData,
                proof,
                offchainTxData,
                noteStartIndex,
                note2,
                note2Nullifier,
                partialStateSecret,
                processedTxData,
              ),
            );
            break;
          }
          case ProofId.DEFI_CLAIM: {
            const [note1Nullifier, note2Nullifier] = claimOutputNoteNullifiers.slice(
              claimOutputNoteStartIndex,
              claimOutputNoteStartIndex + 2,
            );
            claimOutputNoteStartIndex += 2;
            const claimTx = await this.db.getClaimTx(proof.nullifier1);
            if (!claimTx?.accountPublicKey.equals(accountPublicKey)) {
              continue;
            }

            processedTxData.push(
              await this.processDefiClaimTx(
                blockContext,
                proof,
                noteStartIndex,
                claimTx,
                note1Nullifier,
                note2Nullifier,
              ),
            );
            break;
          }
        }
      }

      {
        const finalisedTxData = await this.processDefiInteractionResults(
          accountPublicKey,
          blockContext,
          processedTxData,
        );
        processedTxData.push(...finalisedTxData);
      }
    }

    return processedTxData;
  }

  // ---------------
  // PRIVATE METHODS
  // ---------------
  private async processPaymentTx(
    accountPublicKey: GrumpkinAddress,
    blockContext: BlockContext,
    proof: InnerProofData,
    offchainTxData: OffchainJoinSplitData,
    noteStartIndex: number,
    note1: TreeNote | undefined,
    note1Nullifier: Buffer | undefined,
    note2: TreeNote | undefined,
    note2Nullifier: Buffer | undefined,
    processedTxData: ProcessedTxData[],
  ) {
    const { proofId, noteCommitment1, noteCommitment2, nullifier1, nullifier2 } = proof;
    const txId = new TxId(proof.txId);
    const savedTx = await this.db.getPaymentTx(accountPublicKey, txId);

    const newNote = note1
      ? await this.recoverSettledNote(noteStartIndex, note1, noteCommitment1, note1Nullifier!, blockContext)
      : undefined;
    const changeNote = note2
      ? await this.recoverSettledNote(noteStartIndex + 1, note2, noteCommitment2, note2Nullifier!, blockContext)
      : undefined;
    const outputNotes = [newNote, changeNote].filter(isNote);

    const destroyedNote1 = await this.getUserNote(accountPublicKey, nullifier1, processedTxData);
    const destroyedNote2 = await this.getUserNote(accountPublicKey, nullifier2, processedTxData);
    const nullifiers = [destroyedNote1, destroyedNote2].filter(isNote).map(n => n.nullifier);

    const assetId = (newNote || changeNote)!.assetId;

    const publicValue = toBigIntBE(proof.publicValue);
    const publicOwner = publicValue ? new EthAddress(proof.publicOwner) : undefined;

    const noteValue = (note?: Note) => (note ? note.value : BigInt(0));
    const privateInput = noteValue(destroyedNote1) + noteValue(destroyedNote2);
    const recipientPrivateOutput = savedTx?.recipientPrivateOutput || noteValue(newNote);
    const senderPrivateOutput = noteValue(changeNote);
    const isRecipient = !!newNote;
    const isSender = !!changeNote;

    const { txRefNo } = offchainTxData;
    const createdAt = savedTx?.created || new Date();
    const settledAt = blockContext.mined;

    const tx = new CorePaymentTx(
      txId,
      accountPublicKey,
      proofId as PaymentProofId,
      assetId,
      publicValue,
      publicOwner,
      privateInput,
      recipientPrivateOutput,
      senderPrivateOutput,
      isRecipient,
      isSender,
      txRefNo,
      createdAt,
      settledAt,
    );

    return new ProcessedTxData(tx, { nullifiers, outputNotes });
  }

  private async processAccountTx(
    accountPublicKey: GrumpkinAddress,
    blockContext: BlockContext,
    proof: InnerProofData,
    offchainTxData: OffchainAccountData,
    noteStartIndex: number,
  ) {
    const { nullifier1, nullifier2 } = proof;
    const { aliasHash, spendingPublicKey1, spendingPublicKey2, txRefNo } = offchainTxData;

    // A tx is for account migration when it nullifies the accountPublicKey (nullifier2) but not the aliasHash (nullifier1).
    const migrated = !toBigIntBE(nullifier1) && !!toBigIntBE(nullifier2);
    const settledAt = blockContext.mined;

    const tx = new CoreAccountTx(
      new TxId(proof.txId),
      accountPublicKey,
      aliasHash,
      toBigIntBE(spendingPublicKey1) ? spendingPublicKey1 : undefined,
      toBigIntBE(spendingPublicKey2) ? spendingPublicKey2 : undefined,
      migrated,
      txRefNo,
      new Date(),
      settledAt,
    );

    const { newSpendingPublicKey1, newSpendingPublicKey2 } = tx;
    const spendingKeys: SpendingKey[] = [];
    if (newSpendingPublicKey1) {
      const hashPath = await blockContext.getBlockSubtreeHashPath(noteStartIndex);
      spendingKeys.push({
        accountPublicKey,
        key: newSpendingPublicKey1,
        treeIndex: noteStartIndex,
        hashPath: hashPath.toBuffer(),
      });
    }
    if (newSpendingPublicKey2) {
      const hashPath = await blockContext.getBlockSubtreeHashPath(noteStartIndex + 1);
      spendingKeys.push({
        accountPublicKey,
        key: newSpendingPublicKey2,
        treeIndex: noteStartIndex + 1,
        hashPath: hashPath.toBuffer(),
      });
    }

    return new ProcessedTxData(tx, { spendingKeys });
  }

  private async processDefiDepositTx(
    accountPublicKey: GrumpkinAddress,
    blockContext: BlockContext,
    rollupProofData: RollupProofData,
    proof: InnerProofData,
    offchainTxData: OffchainDefiDepositData,
    noteStartIndex: number,
    note2: TreeNote,
    note2Nullifier: Buffer,
    partialStateSecret: Buffer,
    processedTxData: ProcessedTxData[],
  ) {
    const { interactionResult } = blockContext;
    const { rollupId, bridgeCallDatas } = rollupProofData;
    const { noteCommitment1, noteCommitment2, nullifier1, nullifier2 } = proof;
    const { bridgeCallData, partialState, depositValue, txFee, txRefNo } = offchainTxData;
    const txId = new TxId(proof.txId);
    const savedTx = await this.db.getDefiTx(txId);

    const outputNotes = [
      await this.recoverSettledNote(noteStartIndex + 1, note2, noteCommitment2, note2Nullifier, blockContext),
    ];

    const destroyedNote1 = await this.getUserNote(accountPublicKey, nullifier1, processedTxData);
    const destroyedNote2 = await this.getUserNote(accountPublicKey, nullifier2, processedTxData);
    const nullifiers = [destroyedNote1, destroyedNote2].filter(isNote).map(n => n.nullifier);

    const createdAt = savedTx?.created || new Date();
    const settledAt = blockContext.mined;
    const interactionNonce =
      RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK * rollupId +
      bridgeCallDatas.findIndex(bridge => bridge.equals(bridgeCallData.toBuffer()));
    const isAsync = interactionResult.every(n => n.nonce !== interactionNonce);

    const tx = new CoreDefiTx(
      txId,
      accountPublicKey,
      bridgeCallData,
      depositValue,
      txFee,
      txRefNo,
      createdAt,
      settledAt,
      interactionNonce,
      isAsync,
    );

    const claimNoteNullifier = this.noteAlgos.claimNoteNullifier(noteCommitment1);
    const claimTx = {
      defiTxId: txId,
      accountPublicKey,
      partialState,
      secret: partialStateSecret,
      nullifier: claimNoteNullifier,
      interactionNonce,
    };

    return new ProcessedTxData(tx, { nullifiers, outputNotes, claimTx });
  }

  private async processDefiClaimTx(
    blockContext: BlockContext,
    proof: InnerProofData,
    noteStartIndex: number,
    claimTx: CoreClaimTx,
    note1Nullifier: Buffer,
    note2Nullifier: Buffer,
  ) {
    const { defiTxId, accountPublicKey, partialState, secret, interactionNonce } = claimTx;
    const { noteCommitment1, noteCommitment2, nullifier1, nullifier2 } = proof;
    const defiTx = (await this.db.getDefiTx(defiTxId))!;
    const { bridgeCallData, depositValue, outputValueA, outputValueB, success } = defiTx;
    const accountRequired = this.noteAlgos
      .valueNotePartialCommitment(
        secret,
        accountPublicKey,
        true, // accountRequired
      )
      .equals(partialState);

    const outputNotes: Note[] = [];
    // When generating output notes, set creatorPubKey to 0 (it's a DeFi txn, recipient of note is same as creator of claim note)
    if (!success) {
      {
        const treeNote = new TreeNote(
          accountPublicKey,
          depositValue,
          bridgeCallData.inputAssetIdA,
          accountRequired,
          secret,
          Buffer.alloc(32),
          nullifier1,
        );
        outputNotes.push(
          await this.recoverSettledNote(noteStartIndex, treeNote, noteCommitment1, note1Nullifier, blockContext),
        );
      }

      if (bridgeCallData.numInputAssets === 2) {
        const treeNote = new TreeNote(
          accountPublicKey,
          depositValue,
          bridgeCallData.inputAssetIdB!,
          accountRequired,
          secret,
          Buffer.alloc(32),
          nullifier2,
        );
        outputNotes.push(
          await this.recoverSettledNote(noteStartIndex + 1, treeNote, noteCommitment2, note2Nullifier, blockContext),
        );
      }
    }
    if (outputValueA) {
      const treeNote = new TreeNote(
        accountPublicKey,
        outputValueA,
        bridgeCallData.firstOutputVirtual ? virtualAssetIdFlag + interactionNonce : bridgeCallData.outputAssetIdA,
        accountRequired,
        secret,
        Buffer.alloc(32),
        nullifier1,
      );
      outputNotes.push(
        await this.recoverSettledNote(noteStartIndex, treeNote, noteCommitment1, note1Nullifier, blockContext),
      );
    }
    if (outputValueB) {
      const treeNote = new TreeNote(
        accountPublicKey,
        outputValueB,
        bridgeCallData.secondOutputVirtual ? virtualAssetIdFlag + interactionNonce : bridgeCallData.outputAssetIdB!,
        accountRequired,
        secret,
        Buffer.alloc(32),
        nullifier2,
      );
      outputNotes.push(
        await this.recoverSettledNote(noteStartIndex + 1, treeNote, noteCommitment2, note2Nullifier, blockContext),
      );
    }

    const settledDefiTx = {
      ...defiTx,
      claimSettled: blockContext.mined,
      claimTxId: new TxId(proof.txId),
    };

    return new ProcessedTxData(settledDefiTx, { outputNotes });
  }

  private async processDefiInteractionResults(
    accountPublicKey: GrumpkinAddress,
    blockContext: BlockContext,
    processedTxData: ProcessedTxData[],
  ) {
    const { interactionResult, mined } = blockContext;
    const finalisedTxData: ProcessedTxData[] = [];
    for (const event of interactionResult) {
      const curDefiTxs = processedTxData
        .filter(
          (txData: ProcessedTxData) =>
            txData.tx.proofId === ProofId.DEFI_DEPOSIT && txData.tx.interactionNonce === event.nonce,
        )
        .map(txData => txData.tx) as CoreDefiTx[];
      // Txs with the same nonce should all be included in the same block.
      // They are either in a block that's being processed or have been saved to db.
      const defiTxs = curDefiTxs.length ? curDefiTxs : await this.db.getDefiTxsByNonce(accountPublicKey, event.nonce);
      for (const tx of defiTxs) {
        const outputValueA = !event.result
          ? BigInt(0)
          : (event.totalOutputValueA * tx.depositValue) / event.totalInputValue;
        const outputValueB = !event.result
          ? BigInt(0)
          : (event.totalOutputValueB * tx.depositValue) / event.totalInputValue;
        const finalisedDefiTx = { ...tx, success: event.result, outputValueA, outputValueB, finalised: mined };
        finalisedTxData.push(new ProcessedTxData(finalisedDefiTx));
      }
    }
    return finalisedTxData;
  }

  private async recoverSettledNote(
    index: number,
    treeNote: TreeNote,
    commitment: Buffer,
    nullifier: Buffer,
    blockContext: BlockContext,
  ) {
    const hashPath = await blockContext.getBlockSubtreeHashPath(index);
    return new Note(
      treeNote,
      commitment,
      nullifier,
      false, // allowChain
      false, // nullified
      index,
      hashPath.toBuffer(),
    );
  }

  private async getUserNote(accountPublicKey: GrumpkinAddress, nullifier: Buffer, processedTxData: ProcessedTxData[]) {
    for (const { outputNotes } of processedTxData) {
      const note = outputNotes.find(n => n.nullifier.equals(nullifier));
      if (note?.value) {
        return note;
      }
    }

    const note = await this.db.getNoteByNullifier(nullifier);
    return note?.owner.equals(accountPublicKey) ? note : undefined;
  }
}
