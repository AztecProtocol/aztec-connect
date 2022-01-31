import { AccountAliasId } from '../../account_id';
import { EthAddress, GrumpkinAddress } from '../../address';
import { toBufferBE } from '../../bigint_buffer';
import { HashPath } from '../../merkle_tree';
import { ClaimNoteTxData, TreeNote } from '../../note_algorithms';
import { numToUInt32BE } from '../../serialize';

export class JoinSplitTx {
  constructor(
    public proofId: number,
    public publicValue: bigint,
    public publicOwner: EthAddress,
    public publicAssetId: number,
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
    public backwardLink: Buffer,
    public allowChain: number,
  ) {}

  toBuffer() {
    return Buffer.concat([
      numToUInt32BE(this.proofId),
      toBufferBE(this.publicValue, 32),
      this.publicOwner.toBuffer32(),
      numToUInt32BE(this.publicAssetId),
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

      this.backwardLink,
      numToUInt32BE(this.allowChain),
    ]);
  }
}
