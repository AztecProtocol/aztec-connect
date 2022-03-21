"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.packInteractionNotes = exports.computeInteractionHashes = exports.DefiInteractionNote = void 0;
const bigint_buffer_1 = require("../bigint_buffer");
const crypto_1 = require("crypto");
const serialize_1 = require("../serialize");
const bridge_id_1 = require("../bridge_id");
class DefiInteractionNote {
    constructor(bridgeId, nonce, totalInputValue, totalOutputValueA, totalOutputValueB, result) {
        this.bridgeId = bridgeId;
        this.nonce = nonce;
        this.totalInputValue = totalInputValue;
        this.totalOutputValueA = totalOutputValueA;
        this.totalOutputValueB = totalOutputValueB;
        this.result = result;
    }
    static deserialize(buffer, offset) {
        return {
            elem: DefiInteractionNote.fromBuffer(buffer.slice(offset, offset + DefiInteractionNote.LENGTH)),
            adv: DefiInteractionNote.LENGTH,
        };
    }
    static random() {
        return new DefiInteractionNote(bridge_id_1.BridgeId.random(), (0, crypto_1.randomBytes)(4).readUInt32BE(0), (0, bigint_buffer_1.toBigIntBE)((0, crypto_1.randomBytes)(32)), (0, bigint_buffer_1.toBigIntBE)((0, crypto_1.randomBytes)(32)), (0, bigint_buffer_1.toBigIntBE)((0, crypto_1.randomBytes)(32)), !!Math.round(Math.random()));
    }
    static fromBuffer(buf) {
        const bridgeId = bridge_id_1.BridgeId.fromBuffer(buf.slice(0, 32));
        let offset = 32;
        const totalInputValue = (0, bigint_buffer_1.toBigIntBE)(buf.slice(offset, offset + 32));
        offset += 32;
        const totalOutputValueA = (0, bigint_buffer_1.toBigIntBE)(buf.slice(offset, offset + 32));
        offset += 32;
        const totalOutputValueB = (0, bigint_buffer_1.toBigIntBE)(buf.slice(offset, offset + 32));
        offset += 32;
        const nonce = buf.readUInt32BE(offset);
        offset += 4;
        const result = !!buf[offset];
        return new DefiInteractionNote(bridgeId, nonce, totalInputValue, totalOutputValueA, totalOutputValueB, result);
    }
    toBuffer() {
        return Buffer.concat([
            this.bridgeId.toBuffer(),
            (0, bigint_buffer_1.toBufferBE)(this.totalInputValue, 32),
            (0, bigint_buffer_1.toBufferBE)(this.totalOutputValueA, 32),
            (0, bigint_buffer_1.toBufferBE)(this.totalOutputValueB, 32),
            (0, serialize_1.numToUInt32BE)(this.nonce),
            Buffer.from([+this.result]),
        ]);
    }
    equals(note) {
        return this.toBuffer().equals(note.toBuffer());
    }
}
exports.DefiInteractionNote = DefiInteractionNote;
DefiInteractionNote.EMPTY = new DefiInteractionNote(bridge_id_1.BridgeId.ZERO, 0, BigInt(0), BigInt(0), BigInt(0), false);
DefiInteractionNote.LENGTH = DefiInteractionNote.EMPTY.toBuffer().length;
DefiInteractionNote.groupModulus = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');
const computeInteractionHashes = (notes, padTo = notes.length) => {
    notes = [...notes, ...Array(padTo - notes.length).fill(DefiInteractionNote.EMPTY)];
    const hash = notes.map(note => (0, crypto_1.createHash)('sha256')
        .update(Buffer.concat([
        note.bridgeId.toBuffer(),
        (0, serialize_1.numToUInt32BE)(note.nonce, 32),
        (0, bigint_buffer_1.toBufferBE)(note.totalInputValue, 32),
        (0, bigint_buffer_1.toBufferBE)(note.totalOutputValueA, 32),
        (0, bigint_buffer_1.toBufferBE)(note.totalOutputValueB, 32),
        Buffer.alloc(31),
        Buffer.from([+note.result]),
    ]))
        .digest());
    return hash.map(h => (0, bigint_buffer_1.toBufferBE)(BigInt('0x' + h.toString('hex')) % DefiInteractionNote.groupModulus, 32));
};
exports.computeInteractionHashes = computeInteractionHashes;
const packInteractionNotes = (notes, padTo = notes.length) => {
    const hash = (0, crypto_1.createHash)('sha256')
        .update(Buffer.concat((0, exports.computeInteractionHashes)(notes, padTo)))
        .digest();
    return (0, bigint_buffer_1.toBufferBE)(BigInt('0x' + hash.toString('hex')) % DefiInteractionNote.groupModulus, 32);
};
exports.packInteractionNotes = packInteractionNotes;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVmaV9pbnRlcmFjdGlvbl9ub3RlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL25vdGVfYWxnb3JpdGhtcy9kZWZpX2ludGVyYWN0aW9uX25vdGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsb0RBQTBEO0FBQzFELG1DQUFpRDtBQUNqRCw0Q0FBNkM7QUFDN0MsNENBQXdDO0FBRXhDLE1BQWEsbUJBQW1CO0lBSzlCLFlBQ2tCLFFBQWtCLEVBQ2xCLEtBQWEsRUFDYixlQUF1QixFQUN2QixpQkFBeUIsRUFDekIsaUJBQXlCLEVBQ3pCLE1BQWU7UUFMZixhQUFRLEdBQVIsUUFBUSxDQUFVO1FBQ2xCLFVBQUssR0FBTCxLQUFLLENBQVE7UUFDYixvQkFBZSxHQUFmLGVBQWUsQ0FBUTtRQUN2QixzQkFBaUIsR0FBakIsaUJBQWlCLENBQVE7UUFDekIsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFRO1FBQ3pCLFdBQU0sR0FBTixNQUFNLENBQVM7SUFDOUIsQ0FBQztJQUVKLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBYyxFQUFFLE1BQWM7UUFDL0MsT0FBTztZQUNMLElBQUksRUFBRSxtQkFBbUIsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsTUFBTSxHQUFHLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQy9GLEdBQUcsRUFBRSxtQkFBbUIsQ0FBQyxNQUFNO1NBQ2hDLENBQUM7SUFDSixDQUFDO0lBRUQsTUFBTSxDQUFDLE1BQU07UUFDWCxPQUFPLElBQUksbUJBQW1CLENBQzVCLG9CQUFRLENBQUMsTUFBTSxFQUFFLEVBQ2pCLElBQUEsb0JBQVcsRUFBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLEVBQzlCLElBQUEsMEJBQVUsRUFBQyxJQUFBLG9CQUFXLEVBQUMsRUFBRSxDQUFDLENBQUMsRUFDM0IsSUFBQSwwQkFBVSxFQUFDLElBQUEsb0JBQVcsRUFB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