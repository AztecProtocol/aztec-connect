"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountTx = void 0;
const serialize_1 = require("../../serialize");
class AccountTx {
    constructor(merkleRoot, accountPublicKey, newAccountPublicKey, newSigningPubKey1, newSigningPubKey2, accountAliasId, migrate, accountIndex, accountPath, signingPubKey) {
        this.merkleRoot = merkleRoot;
        this.accountPublicKey = accountPublicKey;
        this.newAccountPublicKey = newAccountPublicKey;
        this.newSigningPubKey1 = newSigningPubKey1;
        this.newSigningPubKey2 = newSigningPubKey2;
        this.accountAliasId = accountAliasId;
        this.migrate = migrate;
        this.accountIndex = accountIndex;
        this.accountPath = accountPath;
        this.signingPubKey = signingPubKey;
    }
    toBuffer() {
        return Buffer.concat([
            this.merkleRoot,
            this.accountPublicKey.toBuffer(),
            this.newAccountPublicKey.toBuffer(),
            this.newSigningPubKey1.toBuffer(),
            this.newSigningPubKey2.toBuffer(),
            this.accountAliasId.aliasHash.toBuffer32(),
            (0, serialize_1.numToUInt32BE)(this.accountAliasId.accountNonce),
            Buffer.from([this.migrate ? 1 : 0]),
            (0, serialize_1.numToUInt32BE)(this.accountIndex),
            this.accountPath.toBuffer(),
            this.signingPubKey.toBuffer(),
        ]);
    }
}
exports.AccountTx = AccountTx;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNjb3VudF90eC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9jbGllbnRfcHJvb2ZzL2FjY291bnRfcHJvb2YvYWNjb3VudF90eC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFHQSwrQ0FBZ0Q7QUFFaEQsTUFBYSxTQUFTO0lBQ3BCLFlBQ1MsVUFBa0IsRUFDbEIsZ0JBQWlDLEVBQ2pDLG1CQUFvQyxFQUNwQyxpQkFBa0MsRUFDbEMsaUJBQWtDLEVBQ2xDLGNBQThCLEVBQzlCLE9BQWdCLEVBQ2hCLFlBQW9CLEVBQ3BCLFdBQXFCLEVBQ3JCLGFBQThCO1FBVDlCLGVBQVUsR0FBVixVQUFVLENBQVE7UUFDbEIscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFpQjtRQUNqQyx3QkFBbUIsR0FBbkIsbUJBQW1CLENBQWlCO1FBQ3BDLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBaUI7UUFDbEMsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFpQjtRQUNsQyxtQkFBYyxHQUFkLGNBQWMsQ0FBZ0I7UUFDOUIsWUFBTyxHQUFQLE9BQU8sQ0FBUztRQUNoQixpQkFBWSxHQUFaLFlBQVksQ0FBUTtRQUNwQixnQkFBVyxHQUFYLFdBQVcsQ0FBVTtRQUNyQixrQkFBYSxHQUFiLGFBQWEsQ0FBaUI7SUFDcEMsQ0FBQztJQUVKLFFBQVE7UUFDTixPQUFPLE1BQU0sQ0FBQyxNQUFNLENBQUM7WUFDbkIsSUFBSSxDQUFDLFVBQVU7WUFDZixJQUFJLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxFQUFFO1lBQ2hDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxRQUFRLEVBQUU7WUFDbkMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsRUFBRTtZQUNqQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsUUFBUSxFQUFFO1lBQ2pDLElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLFVBQVUsRUFBRTtZQUMxQyxJQUFBLHlCQUFhLEVBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUM7WUFDL0MsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDbkMsSUFBQSx5QkFBYSxFQUFDLElBQUksQ0FBQyxZQUFZLENBQUM7WUFDaEMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUU7WUFDM0IsSUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRLEVBQUU7U0FDOUIsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBN0JELDhCQTZCQyJ9