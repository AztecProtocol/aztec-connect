"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TreeClaimNote = void 0;
const bigint_buffer_1 = require("../bigint_buffer");
const crypto_1 = require("crypto");
const bridge_id_1 = require("../bridge_id");
const serialize_1 = require("../serialize");
class TreeClaimNote {
    constructor(value, bridgeId, defiInteractionNonce, fee, partialState, inputNullifier) {
        this.value = value;
        this.bridgeId = bridgeId;
        this.defiInteractionNonce = defiInteractionNonce;
        this.fee = fee;
        this.partialState = partialState;
        this.inputNullifier = inputNullifier;
    }
    static random() {
        return new TreeClaimNote((0, bigint_buffer_1.toBigIntBE)((0, crypto_1.randomBytes)(32)), bridge_id_1.BridgeId.random(), (0, crypto_1.randomBytes)(4).readUInt32BE(0), (0, bigint_buffer_1.toBigIntBE)((0, crypto_1.randomBytes)(32)), (0, crypto_1.randomBytes)(32), (0, crypto_1.randomBytes)(32));
    }
    static fromBuffer(buf) {
        const value = (0, bigint_buffer_1.toBigIntBE)(buf.slice(0, 32));
        let offset = 32;
        const bridgeId = bridge_id_1.BridgeId.fromBuffer(buf.slice(offset, offset + bridge_id_1.BridgeId.ENCODED_LENGTH_IN_BYTES));
        offset += 32;
        const defiInteractionNonce = buf.readUInt32BE(offset);
        offset += 4;
        const fee = (0, bigint_buffer_1.toBigIntBE)(buf.slice(offset, offset + 32));
        offset += 32;
        const partialState = buf.slice(offset, offset + 32);
        offset += 32;
        const inputNullifier = buf.slice(offset, offset + 32);
        return new TreeClaimNote(value, bridgeId, defiInteractionNonce, fee, partialState, inputNullifier);
    }
    toBuffer() {
        return Buffer.concat([
            (0, bigint_buffer_1.toBufferBE)(this.value, 32),
            this.bridgeId.toBuffer(),
            (0, serialize_1.numToUInt32BE)(this.defiInteractionNonce),
            (0, bigint_buffer_1.toBufferBE)(this.fee, 32),
            this.partialState,
            this.inputNullifier,
        ]);
    }
    equals(note) {
        return this.toBuffer().equals(note.toBuffer());
    }
}
exports.TreeClaimNote = TreeClaimNote;
TreeClaimNote.EMPTY = new TreeClaimNote(BigInt(0), bridge_id_1.BridgeId.ZERO, 0, BigInt(0), Buffer.alloc(32), Buffer.alloc(32));
TreeClaimNote.LENGTH = TreeClaimNote.EMPTY.toBuffer().length;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJlZV9jbGFpbV9ub3RlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL25vdGVfYWxnb3JpdGhtcy90cmVlX2NsYWltX25vdGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsb0RBQTBEO0FBQzFELG1DQUFxQztBQUNyQyw0Q0FBd0M7QUFDeEMsNENBQTZDO0FBRTdDLE1BQWEsYUFBYTtJQUl4QixZQUNTLEtBQWEsRUFDYixRQUFrQixFQUNsQixvQkFBNEIsRUFDNUIsR0FBVyxFQUNYLFlBQW9CLEVBQ3BCLGNBQXNCO1FBTHRCLFVBQUssR0FBTCxLQUFLLENBQVE7UUFDYixhQUFRLEdBQVIsUUFBUSxDQUFVO1FBQ2xCLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBUTtRQUM1QixRQUFHLEdBQUgsR0FBRyxDQUFRO1FBQ1gsaUJBQVksR0FBWixZQUFZLENBQVE7UUFDcEIsbUJBQWMsR0FBZCxjQUFjLENBQVE7SUFDNUIsQ0FBQztJQUVKLE1BQU0sQ0FBQyxNQUFNO1FBQ1gsT0FBTyxJQUFJLGFBQWEsQ0FDdEIsSUFBQSwwQkFBVSxFQUFDLElBQUEsb0JBQVcsRUFBQyxFQUFFLENBQUMsQ0FBQyxFQUMzQixvQkFBUSxDQUFDLE1BQU0sRUFBRSxFQUNqQixJQUFBLG9CQUFXLEVBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxFQUM5QixJQUFBLDBCQUFVLEVBQUMsSUFBQSxvQkFBVyxFQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQzNCLElBQUEsb0JBQVcsRUFBQyxFQUFFLENBQUMsRUFDZixJQUFBLG9CQUFXLEVBQUMsRUFBRSxDQUFDLENBQ2hCLENBQUM7SUFDSixDQUFDO0lBRUQsTUFBTSxDQUFDLFVBQVUsQ0FBQyxHQUFXO1FBQzNCLE1BQU0sS0FBSyxHQUFHLElBQUEsMEJBQVUsRUFBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzNDLElBQUksTUFBTSxHQUFHLEVBQUUsQ0FBQztRQUNoQixNQUFNLFFBQVEsR0FBRyxvQkFBUSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxNQUFNLEdBQUcsb0JBQVEsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUM7UUFDbkcsTUFBTSxJQUFJLEVBQUUsQ0FBQztRQUNiLE1BQU0sb0JBQW9CLEdBQUcsR0FBRyxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN0RCxNQUFNLElBQUksQ0FBQyxDQUFDO1FBQ1osTUFBTSxHQUFHLEdBQUcsSUFBQSwwQkFBVSxFQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLE1BQU0sR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3ZELE1BQU0sSUFBSSxFQUFFLENBQUM7UUFDYixNQUFNLFlBQVksR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxNQUFNLEdBQUcsRUFBRSxDQUFDLENBQUM7UUFDcEQsTUFBTSxJQUFJLEVBQUUsQ0FBQztRQUNiLE1BQU0sY0FBYyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLE1BQU0sR0FBRyxFQUFFLENBQUMsQ0FBQztRQUN0RCxPQUFPLElBQUksYUFBYSxDQUFDLEtBQUssRUFBRSxRQUFRLEVBQUUsb0JBQW9CLEVBQUUsR0FBRyxFQUFFLFlBQVksRUFBRSxjQUFjLENBQUMsQ0FBQztJQUNyRyxDQUFDO0lBRUQsUUFBUTtRQUNOLE9BQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQztZQUNuQixJQUFBLDBCQUFVLEVBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUM7WUFDMUIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUU7WUFDeEIsSUFBQSx5QkFBYSxFQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQztZQUN4QyxJQUFBLDBCQUFVLEVBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUM7WUFDeEIsSUFBSSxDQUFDLFlBQVk7WUFDakIsSUFBSSxDQUFDLGNBQWM7U0FDcEIsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVELE1BQU0sQ0FBQyxJQUFtQjtRQUN4QixPQUFPLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7SUFDakQsQ0FBQzs7QUFwREgsc0NBcURDO0FBcERRLG1CQUFLLEdBQUcsSUFBSSxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLG9CQUFRLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDdEcsb0JBQU0sR0FBRyxhQUFhLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDLE1BQU0sQ0FBQyJ9