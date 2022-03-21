"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TreeNote = void 0;
const address_1 = require("../address");
const bigint_buffer_1 = require("../bigint_buffer");
const serialize_1 = require("../serialize");
const viewing_key_1 = require("../viewing_key");
const derive_note_secret_1 = require("./derive_note_secret");
class TreeNote {
    constructor(ownerPubKey, value, assetId, nonce, noteSecret, creatorPubKey, inputNullifier) {
        this.ownerPubKey = ownerPubKey;
        this.value = value;
        this.assetId = assetId;
        this.nonce = nonce;
        this.noteSecret = noteSecret;
        this.creatorPubKey = creatorPubKey;
        this.inputNullifier = inputNullifier;
    }
    toBuffer() {
        return Buffer.concat([
            (0, bigint_buffer_1.toBufferBE)(this.value, 32),
            (0, serialize_1.numToUInt32BE)(this.assetId),
            (0, serialize_1.numToUInt32BE)(this.nonce),
            this.ownerPubKey.toBuffer(),
            this.noteSecret,
            this.creatorPubKey,
            this.inputNullifier,
        ]);
    }
    createViewingKey(ephPrivKey, grumpkin) {
        const noteBuf = Buffer.concat([
            (0, bigint_buffer_1.toBufferBE)(this.value, 32),
            (0, serialize_1.numToUInt32BE)(this.assetId),
            (0, serialize_1.numToUInt32BE)(this.nonce),
            this.creatorPubKey,
        ]);
        return viewing_key_1.ViewingKey.createFromEphPriv(noteBuf, this.ownerPubKey, ephPrivKey, grumpkin);
    }
    /**
     * Note on how the noteSecret can be derived in two different ways (from ephPubKey or ephPrivKey):
     *
     * ownerPubKey := [ownerPrivKey] * G  (where G is a generator of the grumpkin curve, and `[scalar] * Point` is scalar multiplication).
     *                      ↑
     *         a.k.a. account private key
     *
     * ephPubKey := [ephPrivKey] * G    (where ephPrivKey is a random field element).
     *
     * sharedSecret := [ephPrivKey] * ownerPubKey = [ephPrivKey] * ([ownerPrivKey] * G) = [ownerPrivKey] * ([ephPrivKey] * G) = [ownerPrivKey] * ephPubKey
     *                  ^^^^^^^^^^                                                                                                               ^^^^^^^^^
     * noteSecret is then derivable from the sharedSecret.
     */
    static createFromEphPriv(ownerPubKey, value, assetId, nonce, inputNullifier, ephPrivKey, grumpkin, noteVersion = 1, creatorPubKey = Buffer.alloc(32)) {
        const noteSecret = (0, derive_note_secret_1.deriveNoteSecret)(ownerPubKey, ephPrivKey, grumpkin, noteVersion);
        return new TreeNote(ownerPubKey, value, assetId, nonce, noteSecret, creatorPubKey, inputNullifier);
    }
    static createFromEphPub(ownerPubKey, value, assetId, nonce, inputNullifier, ephPubKey, ownerPrivKey, grumpkin, noteVersion = 1, creatorPubKey = Buffer.alloc(32)) {
        const noteSecret = (0, derive_note_secret_1.deriveNoteSecret)(ephPubKey, ownerPrivKey, grumpkin, noteVersion);
        return new TreeNote(ownerPubKey, value, assetId, nonce, noteSecret, creatorPubKey, inputNullifier);
    }
    static recover({ noteBuf, noteSecret, inputNullifier }, ownerPubKey) {
        const value = (0, bigint_buffer_1.toBigIntBE)(noteBuf.slice(0, 32));
        const assetId = noteBuf.readUInt32BE(32);
        const nonce = noteBuf.readUInt32BE(36);
        const creatorPubKey = noteBuf.slice(40, 72);
        return new TreeNote(ownerPubKey, value, assetId, nonce, noteSecret, creatorPubKey, inputNullifier);
    }
}
exports.TreeNote = TreeNote;
TreeNote.EMPTY = new TreeNote(address_1.GrumpkinAddress.one(), BigInt(0), 0, 0, Buffer.alloc(32), Buffer.alloc(32), Buffer.alloc(32));
TreeNote.LATEST_VERSION = 1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJlZV9ub3RlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL25vdGVfYWxnb3JpdGhtcy90cmVlX25vdGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsd0NBQTZDO0FBQzdDLG9EQUEwRDtBQUUxRCw0Q0FBNkM7QUFDN0MsZ0RBQTRDO0FBRTVDLDZEQUF3RDtBQUV4RCxNQUFhLFFBQVE7SUFZbkIsWUFDUyxXQUE0QixFQUM1QixLQUFhLEVBQ2IsT0FBZSxFQUNmLEtBQWEsRUFDYixVQUFrQixFQUNsQixhQUFxQixFQUNyQixjQUFzQjtRQU50QixnQkFBVyxHQUFYLFdBQVcsQ0FBaUI7UUFDNUIsVUFBSyxHQUFMLEtBQUssQ0FBUTtRQUNiLFlBQU8sR0FBUCxPQUFPLENBQVE7UUFDZixVQUFLLEdBQUwsS0FBSyxDQUFRO1FBQ2IsZUFBVSxHQUFWLFVBQVUsQ0FBUTtRQUNsQixrQkFBYSxHQUFiLGFBQWEsQ0FBUTtRQUNyQixtQkFBYyxHQUFkLGNBQWMsQ0FBUTtJQUM1QixDQUFDO0lBRUosUUFBUTtRQUNOLE9BQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQztZQUNuQixJQUFBLDBCQUFVLEVBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUM7WUFDMUIsSUFBQSx5QkFBYSxFQUFDLElBQUksQ0FBQyxPQUFPLENBQUM7WUFDM0IsSUFBQSx5QkFBYSxFQUFDLElBQUksQ0FBQyxLQUFLLENBQUM7WUFDekIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUU7WUFDM0IsSUFBSSxDQUFDLFVBQVU7WUFDZixJQUFJLENBQUMsYUFBYTtZQUNsQixJQUFJLENBQUMsY0FBYztTQUNwQixDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsZ0JBQWdCLENBQUMsVUFBa0IsRUFBRSxRQUFrQjtRQUNyRCxNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDO1lBQzVCLElBQUEsMEJBQVUsRUFBQyxJQUFJLENBQUMsS0FBSyxF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