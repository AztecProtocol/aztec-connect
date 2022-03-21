"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JoinSplitTx = void 0;
const bigint_buffer_1 = require("../../bigint_buffer");
const serialize_1 = require("../../serialize");
class JoinSplitTx {
    constructor(proofId, publicValue, publicOwner, publicAssetId, numInputNotes, inputNoteIndices, merkleRoot, inputNotePaths, inputNotes, outputNotes, claimNote, accountPrivateKey, accountAliasId, accountIndex, accountPath, signingPubKey, backwardLink, allowChain) {
        this.proofId = proofId;
        this.publicValue = publicValue;
        this.publicOwner = publicOwner;
        this.publicAssetId = publicAssetId;
        this.numInputNotes = numInputNotes;
        this.inputNoteIndices = inputNoteIndices;
        this.merkleRoot = merkleRoot;
        this.inputNotePaths = inputNotePaths;
        this.inputNotes = inputNotes;
        this.outputNotes = outputNotes;
        this.claimNote = claimNote;
        this.accountPrivateKey = accountPrivateKey;
        this.accountAliasId = accountAliasId;
        this.accountIndex = accountIndex;
        this.accountPath = accountPath;
        this.signingPubKey = signingPubKey;
        this.backwardLink = backwardLink;
        this.allowChain = allowChain;
    }
    toBuffer() {
        return Buffer.concat([
            (0, serialize_1.numToUInt32BE)(this.proofId),
            (0, bigint_buffer_1.toBufferBE)(this.publicValue, 32),
            this.publicOwner.toBuffer32(),
            (0, serialize_1.numToUInt32BE)(this.publicAssetId),
            (0, serialize_1.numToUInt32BE)(this.numInputNotes),
            (0, serialize_1.numToUInt32BE)(this.inputNoteIndices[0]),
            (0, serialize_1.numToUInt32BE)(this.inputNoteIndices[1]),
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
            (0, serialize_1.numToUInt32BE)(this.accountAliasId.accountNonce),
            (0, serialize_1.numToUInt32BE)(this.accountIndex),
            this.accountPath.toBuffer(),
            this.signingPubKey.toBuffer(),
            this.backwardLink,
            (0, serialize_1.numToUInt32BE)(this.allowChain),
        ]);
    }
}
exports.JoinSplitTx = JoinSplitTx;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiam9pbl9zcGxpdF90eC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9jbGllbnRfcHJvb2ZzL2pvaW5fc3BsaXRfcHJvb2Yvam9pbl9zcGxpdF90eC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFFQSx1REFBaUQ7QUFHakQsK0NBQWdEO0FBRWhELE1BQWEsV0FBVztJQUN0QixZQUNTLE9BQWUsRUFDZixXQUFtQixFQUNuQixXQUF1QixFQUN2QixhQUFxQixFQUNyQixhQUFxQixFQUNyQixnQkFBMEIsRUFDMUIsVUFBa0IsRUFDbEIsY0FBMEIsRUFDMUIsVUFBc0IsRUFDdEIsV0FBdUIsRUFDdkIsU0FBMEIsRUFDMUIsaUJBQXlCLEVBQ3pCLGNBQThCLEVBQzlCLFlBQW9CLEVBQ3BCLFdBQXFCLEVBQ3JCLGFBQThCLEVBQzlCLFlBQW9CLEVBQ3BCLFVBQWtCO1FBakJsQixZQUFPLEdBQVAsT0FBTyxDQUFRO1FBQ2YsZ0JBQVcsR0FBWCxXQUFXLENBQVE7UUFDbkIsZ0JBQVcsR0FBWCxXQUFXLENBQVk7UUFDdkIsa0JBQWEsR0FBYixhQUFhLENBQVE7UUFDckIsa0JBQWEsR0FBYixhQUFhLENBQVE7UUFDckIscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFVO1FBQzFCLGVBQVUsR0FBVixVQUFVLENBQVE7UUFDbEIsbUJBQWMsR0FBZCxjQUFjLENBQVk7UUFDMUIsZUFBVSxHQUFWLFVBQVUsQ0FBWTtRQUN0QixnQkFBVyxHQUFYLFdBQVcsQ0FBWTtRQUN2QixjQUFTLEdBQVQsU0FBUyxDQUFpQjtRQUMxQixzQkFBaUIsR0FBakIsaUJBQWlCLENBQVE7UUFDekIsbUJBQWMsR0FBZCxjQUFjLENBQWdCO1FBQzlCLGlCQUFZLEdBQVosWUFBWSxDQUFRO1FBQ3BCLGdCQUFXLEdBQVgsV0FBVyxDQUFVO1FBQ3JCLGtCQUFhLEdBQWIsYUFBYSxDQUFpQjtRQUM5QixpQkFBWSxHQUFaLFlBQVksQ0FBUTtRQUNwQixlQUFVLEdBQVYsVUFBVSxDQUFRO0lBQ3hCLENBQUM7SUFFSixRQUFRO1FBQ04sT0FBTyxNQUFNLENBQUMsTUFBTSxDQUFDO1lBQ25CLElBQUEseUJBQWEsRUFBQyxJQUFJLENBQUMsT0FBTyxDQUFDO1lBQzNCLElBQUEsMEJBQVUsRUFBQyxJQUFJLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQztZQUNoQyxJQUFJLENBQUMsV0FBVyxDQUFDLFVBQVUsRUFBRTtZQUM3QixJQUFBLHlCQUFhLEVBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQztZQUNqQyxJQUFBLHlCQUFhLEVBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQztZQUNqQyxJQUFBLHlCQUFhLEVBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3ZDLElBQUEseUJBQWEsRUFBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDdkMsSUFBSSxDQUFDLFVBQVU7WUFFZixJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRTtZQUNqQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRTtZQUNqQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRTtZQUM3QixJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRTtZQUM3QixJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRTtZQUM5QixJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRTtZQUM5QixJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRTtZQUV6QixJQUFJLENBQUMsaUJBQWlCO1lBQ3RCLElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLFVBQVUsRUFBRTtZQUMxQyxJQUFBLHlCQUFhLEVBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUM7WUFDL0MsSUFBQSx5QkFBYSxFQUFDLElBQUksQ0FBQyxZQUFZLENBQUM7WUFDaEMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUU7WUFDM0IsSUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRLEVBQUU7WUFFN0IsSUFBSSxDQUFDLFlBQVk7WUFDakIsSUFBQSx5QkFBYSxFQUFDLElBQUksQ0FBQyxVQUFVLENBQUM7U0FDL0IsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBcERELGtDQW9EQyJ9