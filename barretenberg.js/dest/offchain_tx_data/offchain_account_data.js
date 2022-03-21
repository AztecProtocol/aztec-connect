"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OffchainAccountData = void 0;
const account_id_1 = require("../account_id");
const address_1 = require("../address");
const serialize_1 = require("../serialize");
class OffchainAccountData {
    constructor(accountPublicKey, accountAliasId, spendingPublicKey1 = Buffer.alloc(32), spendingPublicKey2 = Buffer.alloc(32), txRefNo = 0) {
        this.accountPublicKey = accountPublicKey;
        this.accountAliasId = accountAliasId;
        this.spendingPublicKey1 = spendingPublicKey1;
        this.spendingPublicKey2 = spendingPublicKey2;
        this.txRefNo = txRefNo;
        if (spendingPublicKey1.length !== 32) {
            throw new Error('Expect spendingPublicKey1 to be 32 bytes.');
        }
        if (spendingPublicKey2.length !== 32) {
            throw new Error('Expect spendingPublicKey2 to be 32 bytes.');
        }
    }
    static fromBuffer(buf) {
        let dataStart = 0;
        const accountPublicKey = new address_1.GrumpkinAddress(buf.slice(dataStart, dataStart + 64));
        dataStart += 64;
        const accountAliasId = account_id_1.AccountAliasId.fromBuffer(buf.slice(dataStart, dataStart + 32));
        dataStart += 32;
        const spendingPublicKey1 = buf.slice(dataStart, dataStart + 32);
        dataStart += 32;
        const spendingPublicKey2 = buf.slice(dataStart, dataStart + 32);
        dataStart += 32;
        const txRefNo = buf.readUInt32BE(dataStart);
        return new OffchainAccountData(accountPublicKey, accountAliasId, spendingPublicKey1, spendingPublicKey2, txRefNo);
    }
    toBuffer() {
        return Buffer.concat([
            this.accountPublicKey.toBuffer(),
            this.accountAliasId.toBuffer(),
            this.spendingPublicKey1,
            this.spendingPublicKey2,
            (0, serialize_1.numToUInt32BE)(this.txRefNo),
        ]);
    }
}
exports.OffchainAccountData = OffchainAccountData;
OffchainAccountData.EMPTY = new OffchainAccountData(address_1.GrumpkinAddress.ZERO, account_id_1.AccountAliasId.ZERO);
OffchainAccountData.SIZE = OffchainAccountData.EMPTY.toBuffer().length;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2ZmY2hhaW5fYWNjb3VudF9kYXRhLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL29mZmNoYWluX3R4X2RhdGEvb2ZmY2hhaW5fYWNjb3VudF9kYXRhLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDhDQUErQztBQUMvQyx3Q0FBNkM7QUFDN0MsNENBQTZDO0FBRTdDLE1BQWEsbUJBQW1CO0lBSTlCLFlBQ2tCLGdCQUFpQyxFQUNqQyxjQUE4QixFQUM5QixxQkFBcUIsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsRUFDckMscUJBQXFCLE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQ3JDLFVBQVUsQ0FBQztRQUpYLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBaUI7UUFDakMsbUJBQWMsR0FBZCxjQUFjLENBQWdCO1FBQzlCLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBbUI7UUFDckMsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFtQjtRQUNyQyxZQUFPLEdBQVAsT0FBTyxDQUFJO1FBRTNCLElBQUksa0JBQWtCLENBQUMsTUFBTSxLQUFLLEVBQUUsRUFBRTtZQUNwQyxNQUFNLElBQUksS0FBSyxDQUFDLDJDQUEyQyxDQUFDLENBQUM7U0FDOUQ7UUFDRCxJQUFJLGtCQUFrQixDQUFDLE1BQU0sS0FBSyxFQUFFLEVBQUU7WUFDcEMsTUFBTSxJQUFJLEtBQUssQ0FBQywyQ0FBMkMsQ0FBQyxDQUFDO1NBQzlEO0lBQ0gsQ0FBQztJQUVELE1BQU0sQ0FBQyxVQUFVLENBQUMsR0FBVztRQUMzQixJQUFJLFNBQVMsR0FBRyxDQUFDLENBQUM7UUFDbEIsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLHlCQUFlLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsU0FBUyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDbkYsU0FBUyxJQUFJLEVBQUUsQ0FBQztRQUNoQixNQUFNLGNBQWMsR0FBRywyQkFBYyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxTQUFTLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN2RixTQUFTLElBQUksRUFBRSxDQUFDO1FBQ2hCLE1BQU0sa0JBQWtCLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsU0FBUyxHQUFHLEVBQUUsQ0FBQyxDQUFDO1FBQ2hFLFNBQVMsSUFBSSxFQUFFLENBQUM7UUFDaEIsTUFBTSxrQkFBa0IsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxTQUFTLEdBQUcsRUFBRSxDQUFDLENBQUM7UUFDaEUsU0FBUyxJQUFJLEVBQUUsQ0FBQztRQUNoQixNQUFNLE9BQU8sR0FBRyxHQUFHLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzVDLE9BQU8sSUFBSSxtQkFBbUIsQ0FBQyxnQkFBZ0IsRUFBRSxjQUFjLEVBQUUsa0JBQWtCLEVBQUUsa0JBQWtCLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDcEgsQ0FBQztJQUVELFFBQVE7UUFDTixPQUFPLE1BQU0sQ0FBQyxNQUFNLENBQUM7WUFDbkIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsRUFBRTtZQUNoQyxJQUFJLENBQUMsY0FBYyxDQUFDLFFBQVEsRUFBRTtZQUM5QixJQUFJLENBQUMsa0JBQWtCO1lBQ3ZCLElBQUksQ0FBQyxrQkFBa0I7WUFDdkIsSUFBQSx5QkFBYSxFQUFDLElBQUksQ0FBQyxPQUFPLENBQUM7U0FDNUIsQ0FBQyxDQUFDO0lBQ0wsQ0FBQzs7QUF6Q0gsa0RBMENDO0FBekNRLHlCQUFLLEdBQUcsSUFBSSxtQkFBbUIsQ0FBQyx5QkFBZSxDQUFDLElBQUksRUFBRSwyQkFBYyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQzNFLHdCQUFJLEdBQUcsbUJBQW1CLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDLE1BQU0sQ0FBQyJ9