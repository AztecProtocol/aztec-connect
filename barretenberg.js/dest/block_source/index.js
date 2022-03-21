"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Block = void 0;
const tslib_1 = require("tslib");
const serialize_1 = require("../serialize");
const note_algorithms_1 = require("../note_algorithms");
const blockchain_1 = require("../blockchain");
class Block {
    constructor(txHash, created, rollupId, rollupSize, rollupProofData, offchainTxData, interactionResult, gasUsed, gasPrice) {
        this.txHash = txHash;
        this.created = created;
        this.rollupId = rollupId;
        this.rollupSize = rollupSize;
        this.rollupProofData = rollupProofData;
        this.offchainTxData = offchainTxData;
        this.interactionResult = interactionResult;
        this.gasUsed = gasUsed;
        this.gasPrice = gasPrice;
    }
    static deserialize(buf, offset = 0) {
        const des = new serialize_1.Deserializer(buf, offset);
        const txHash = des.exec(blockchain_1.TxHash.deserialize);
        const created = des.date();
        const rollupId = des.uInt32();
        const rollupSize = des.uInt32();
        const rollupProofData = des.buffer();
        const offchainTxData = des.deserializeArray(serialize_1.deserializeBufferFromVector);
        const interactionResult = des.deserializeArray(note_algorithms_1.DefiInteractionNote.deserialize);
        const gasUsed = des.uInt32();
        const gasPrice = des.bigInt();
        return {
            elem: new Block(txHash, created, rollupId, rollupSize, rollupProofData, offchainTxData, interactionResult, gasUsed, gasPrice),
            adv: des.getOffset() - offset,
        };
    }
    static fromBuffer(buf) {
        return Block.deserialize(buf).elem;
    }
    toBuffer() {
        return Buffer.concat([
            this.txHash.toBuffer(),
            (0, serialize_1.serializeDate)(this.created),
            (0, serialize_1.numToUInt32BE)(this.rollupId),
            (0, serialize_1.numToUInt32BE)(this.rollupSize),
            (0, serialize_1.serializeBufferToVector)(this.rollupProofData),
            (0, serialize_1.serializeBufferArrayToVector)(this.offchainTxData.map(b => (0, serialize_1.serializeBufferToVector)(b))),
            (0, serialize_1.serializeBufferArrayToVector)(this.interactionResult.map(b => b.toBuffer())),
            (0, serialize_1.numToUInt32BE)(this.gasUsed),
            (0, serialize_1.serializeBigInt)(this.gasPrice),
        ]);
    }
}
exports.Block = Block;
(0, tslib_1.__exportStar)(require("./server_block_source"), exports);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvYmxvY2tfc291cmNlL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7QUFBQSw0Q0FRc0I7QUFDdEIsd0RBQXlEO0FBQ3pELDhDQUF1QztBQUV2QyxNQUFhLEtBQUs7SUFDaEIsWUFDUyxNQUFjLEVBQ2QsT0FBYSxFQUNiLFFBQWdCLEVBQ2hCLFVBQWtCLEVBQ2xCLGVBQXVCLEVBQ3ZCLGNBQXdCLEVBQ3hCLGlCQUF3QyxFQUN4QyxPQUFlLEVBQ2YsUUFBZ0I7UUFSaEIsV0FBTSxHQUFOLE1BQU0sQ0FBUTtRQUNkLFlBQU8sR0FBUCxPQUFPLENBQU07UUFDYixhQUFRLEdBQVIsUUFBUSxDQUFRO1FBQ2hCLGVBQVUsR0FBVixVQUFVLENBQVE7UUFDbEIsb0JBQWUsR0FBZixlQUFlLENBQVE7UUFDdkIsbUJBQWMsR0FBZCxjQUFjLENBQVU7UUFDeEIsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUF1QjtRQUN4QyxZQUFPLEdBQVAsT0FBTyxDQUFRO1FBQ2YsYUFBUSxHQUFSLFFBQVEsQ0FBUTtJQUN0QixDQUFDO0lBRUosTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFXLEVBQUUsTUFBTSxHQUFHLENBQUM7UUFDeEMsTUFBTSxHQUFHLEdBQUcsSUFBSSx3QkFBWSxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUMxQyxNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLG1CQUFNLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDNUMsTUFBTSxPQUFPLEdBQUcsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQzNCLE1BQU0sUUFBUSxHQUFHLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUM5QixNQUFNLFVBQVUsR0FBRyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDaEMsTUFBTSxlQUFlLEdBQUcsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ3JDLE1BQU0sY0FBYyxHQUFHLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyx1Q0FBMkIsQ0FBQyxDQUFDO1FBQ3pFLE1BQU0saUJBQWlCLEdBQUcsR0FBRyxDQUFDLGdCQUFnQixDQUFDLHFDQUFtQixDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ2hGLE1BQU0sT0FBTyxHQUFHLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUM3QixNQUFNLFFBQVEsR0FBRyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDOUIsT0FBTztZQUNMLElBQUksRUFBRSxJQUFJLEtBQUssQ0FDYixNQUFNLEVBQ04sT0FBTyxFQUNQLFFBQVEsRUFDUixVQUFVLEVBQ1YsZUFBZSxFQUNmLGNBQWMsRUFDZCxpQkFBaUIsRUFDakIsT0FBTyxFQUNQLFFBQVEsQ0FDVDtZQUNELEdBQUcsRUFBRSxHQUFHLENBQUMsU0FBUyxFQUFFLEdBQUcsTUFBTTtTQUM5QixDQUFDO0lBQ0osQ0FBQztJQUVELE1BQU0sQ0FBQyxVQUFVLENBQUMsR0FBVztRQUMzQixPQUFPLEtBQUssQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO0lBQ3JDLENBQUM7SUFFRCxRQUFRO1FBQ04sT0FBTyxNQUFNLENBQUMsTUFBTSxDQUFDO1lBQ25CLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFO1lBQ3RCLElBQUEseUJBQWEsRUFBQyxJQUFJLENBQUMsT0FBTyxDQUFDO1lBQzNCLElBQUEseUJBQWEsRUFBQyxJQUFJLENBQUMsUUFBUSxDQUFDO1lBQzVCLElBQUEseUJBQWEsRUFBQyxJQUFJLENBQUMsVUFBVSxDQUFDO1lBQzlCLElBQUEsbUNBQXVCLEVBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQztZQUM3QyxJQUFBLHdDQUE0QixFQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBQSxtQ0FBdUIsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3RGLElBQUEsd0NBQTRCLEVBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1lBQzNFLElBQUEseUJBQWEsRUFBQyxJQUFJLENBQUMsT0FBTyxDQUFDO1lBQzNCLElBQUEsMkJBQWUsRUFBQyxJQUFJLENBQUMsUUFBUSxDQUFDO1NBQy9CLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQXpERCxzQkF5REM7QUF5QkQscUVBQXNDIn0=