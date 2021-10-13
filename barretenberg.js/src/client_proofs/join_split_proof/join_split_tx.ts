import { toBufferBE } from '../../bigint_buffer';
import { EthAddress, GrumpkinAddress } from '../../address';
import { AssetId } from '../../asset';
import { HashPath } from '../../merkle_tree';
import { numToUInt32BE } from '../../serialize';
import { AccountAliasId } from '../../account_id';
import { TreeNote, ClaimNoteTxData } from '../../note_algorithms';

export class JoinSplitTx {
  constructor(
    public publicInput: bigint,
    public publicOutput: bigint,
    public publicOwner: EthAddress,
    public assetId: AssetId,
    public numInputNotes: number,
    public inputNoteIndices: number[],
    public merkleRoot: Buffer,
    public inputNotePaths: HashPath[],
    public inputNotes: TreeNote[],
    public outputNotes: TreeNote[],
    public claimNote: ClaimNoteTxData,
    public accountPrivateKey: Buffer,
    public accountAliasId: AccountAliasId,
    public accountIndex: number,
    public accountPath: HashPath,
    public signingPubKey: GrumpkinAddress,
    public propagatedInputIndex: number,
    public backwardLink: Buffer,
    public allowChain: number,
  ) {}

  toBuffer() {
    return Buffer.concat([
      toBufferBE(this.publicInput, 32),
      toBufferBE(this.publicOutput, 32),
      this.publicOwner.toBuffer32(),
      numToUInt32BE(this.assetId),
      numToUInt32BE(this.numInputNotes),
      numToUInt32BE(this.inputNoteIndices[0]),
      numToUInt32BE(this.inputNoteIndices[1]),
      this.merkleRoot,

      this.inputNotePaths[0].toBuffer(),
      this.inputNotePaths[1].toBuffer(),
      this.inputNotes[0].toBuffer(),
      this.inputNotes[1].toBuffer(),
      this.outputNotes[0].toBuffer(),
      this.outputNotes[1].toBuffer(),
      this.claimNote.toBuffer(),

      this.accountPrivateKey,
      this.accountAliasId.aliasHash.toBuffer32(),
      numToUInt32BE(this.accountAliasId.nonce),
      numToUInt32BE(this.accountIndex),
      this.accountPath.toBuffer(),
      this.signingPubKey.toBuffer(),

      numToUInt32BE(this.propagatedInputIndex),
      this.backwardLink,
      numToUInt32BE(this.allowChain),
    ]);
  }
}
