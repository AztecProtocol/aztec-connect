"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountId = void 0;
const address_1 = require("../address");
class AccountId {
    constructor(publicKey, accountNonce) {
        this.publicKey = publicKey;
        this.accountNonce = accountNonce;
    }
    static fromBuffer(id) {
        if (id.length !== 68) {
            throw new Error('Invalid id buffer.');
        }
        const publicKey = new address_1.GrumpkinAddress(id.slice(0, 64));
        const accountNonce = id.readUInt32BE(64);
        return new AccountId(publicKey, accountNonce);
    }
    static fromString(idStr) {
        const [match, publicKeyStr, accountNonceStr] = idStr.match(/^0x([0-9a-f]{128}) \(([0-9]+)\)$/i) || [];
        if (!match) {
            throw new Error('Invalid id string.');
        }
        const publicKey = address_1.GrumpkinAddress.fromString(publicKeyStr);
        return new AccountId(publicKey, +accountNonceStr);
    }
    static random() {
        const randomNonce = Math.floor(Math.random() * 2 ** 32);
        return new AccountId(address_1.GrumpkinAddress.randomAddress(), randomNonce);
    }
    equals(rhs) {
        return this.toBuffer().equals(rhs.toBuffer());
    }
    toBuffer() {
        const accountNonceBuf = Buffer.alloc(4);
        accountNonceBuf.writeUInt32BE(this.accountNonce);
        return Buffer.concat([this.publicKey.toBuffer(), accountNonceBuf]);
    }
    toString() {
        return `${this.publicKey.toString()} (${this.accountNonce})`;
    }
}
exports.AccountId = AccountId;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNjb3VudF9pZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9hY2NvdW50X2lkL2FjY291bnRfaWQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsd0NBQTZDO0FBRTdDLE1BQWEsU0FBUztJQUNwQixZQUFtQixTQUEwQixFQUFTLFlBQW9CO1FBQXZELGNBQVMsR0FBVCxTQUFTLENBQWlCO1FBQVMsaUJBQVksR0FBWixZQUFZLENBQVE7SUFBRyxDQUFDO0lBRXZFLE1BQU0sQ0FBQyxVQUFVLENBQUMsRUFBVTtRQUNqQyxJQUFJLEVBQUUsQ0FBQyxNQUFNLEtBQUssRUFBRSxFQUFFO1lBQ3BCLE1BQU0sSUFBSSxLQUFLLENBQUMsb0JBQW9CLENBQUMsQ0FBQztTQUN2QztRQUVELE1BQU0sU0FBUyxHQUFHLElBQUkseUJBQWUsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3ZELE1BQU0sWUFBWSxHQUFHLEVBQUUsQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDekMsT0FBTyxJQUFJLFNBQVMsQ0FBQyxTQUFTLEVBQUUsWUFBWSxDQUFDLENBQUM7SUFDaEQsQ0FBQztJQUVNLE1BQU0sQ0FBQyxVQUFVLENBQUMsS0FBYTtRQUNwQyxNQUFNLENBQUMsS0FBSyxFQUFFLFlBQVksRUFBRSxlQUFlLENBQUMsR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLG1DQUFtQyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ3RHLElBQUksQ0FBQyxLQUFLLEVBQUU7WUFDVixNQUFNLElBQUksS0FBSyxDQUFDLG9CQUFvQixDQUFDLENBQUM7U0FDdkM7UUFFRCxNQUFNLFNBQVMsR0FBRyx5QkFBZSxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUMzRCxPQUFPLElBQUksU0FBUyxDQUFDLFNBQVMsRUFBRSxDQUFDLGVBQWUsQ0FBQyxDQUFDO0lBQ3BELENBQUM7SUFFTSxNQUFNLENBQUMsTUFBTTtRQUNsQixNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7UUFDeEQsT0FBTyxJQUFJLFNBQVMsQ0FBQyx5QkFBZSxDQUFDLGFBQWEsRUFBRSxFQUFFLFdBQVcsQ0FBQyxDQUFDO0lBQ3JFLENBQUM7SUFFRCxNQUFNLENBQUMsR0FBYztRQUNuQixPQUFPLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7SUFDaEQsQ0FBQztJQUVELFFBQVE7UUFDTixNQUFNLGVBQWUsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3hDLGVBQWUsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ2pELE9BQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLEVBQUUsZUFBZSxDQUFDLENBQUMsQ0FBQztJQUNyRSxDQUFDO0lBRUQsUUFBUTtRQUNOLE9BQU8sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxLQUFLLElBQUksQ0FBQyxZQUFZLEdBQUcsQ0FBQztJQUMvRCxDQUFDO0NBQ0Y7QUF6Q0QsOEJBeUNDIn0=