"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountAliasId = void 0;
const alias_hash_1 = require("./alias_hash");
class AccountAliasId {
    constructor(aliasHash, accountNonce) {
        this.aliasHash = aliasHash;
        this.accountNonce = accountNonce;
    }
    static fromAlias(alias, accountNonce, blake2s) {
        return new AccountAliasId(alias_hash_1.AliasHash.fromAlias(alias, blake2s), accountNonce);
    }
    static random() {
        return new AccountAliasId(alias_hash_1.AliasHash.random(), 0);
    }
    static fromBuffer(id) {
        if (id.length !== 32) {
            throw new Error('Invalid id buffer.');
        }
        const aliasHash = new alias_hash_1.AliasHash(id.slice(4, 32));
        const accountNonce = id.readUInt32BE(0);
        return new AccountAliasId(aliasHash, accountNonce);
    }
    toBuffer() {
        const accountNonceBuf = Buffer.alloc(4);
        accountNonceBuf.writeUInt32BE(this.accountNonce);
        return Buffer.concat([accountNonceBuf, this.aliasHash.toBuffer()]);
    }
    toString() {
        return `0x${this.toBuffer().toString('hex')}`;
    }
    equals(rhs) {
        return this.aliasHash.equals(rhs.aliasHash) && this.accountNonce === rhs.accountNonce;
    }
}
exports.AccountAliasId = AccountAliasId;
AccountAliasId.ZERO = AccountAliasId.fromBuffer(Buffer.alloc(32));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNjb3VudF9hbGlhc19pZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9hY2NvdW50X2lkL2FjY291bnRfYWxpYXNfaWQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0EsNkNBQXlDO0FBRXpDLE1BQWEsY0FBYztJQUd6QixZQUFtQixTQUFvQixFQUFTLFlBQW9CO1FBQWpELGNBQVMsR0FBVCxTQUFTLENBQVc7UUFBUyxpQkFBWSxHQUFaLFlBQVksQ0FBUTtJQUFHLENBQUM7SUFFeEUsTUFBTSxDQUFDLFNBQVMsQ0FBQyxLQUFhLEVBQUUsWUFBb0IsRUFBRSxPQUFnQjtRQUNwRSxPQUFPLElBQUksY0FBYyxDQUFDLHNCQUFTLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsRUFBRSxZQUFZLENBQUMsQ0FBQztJQUMvRSxDQUFDO0lBRUQsTUFBTSxDQUFDLE1BQU07UUFDWCxPQUFPLElBQUksY0FBYyxDQUFDLHNCQUFTLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDbkQsQ0FBQztJQUVNLE1BQU0sQ0FBQyxVQUFVLENBQUMsRUFBVTtRQUNqQyxJQUFJLEVBQUUsQ0FBQyxNQUFNLEtBQUssRUFBRSxFQUFFO1lBQ3BCLE1BQU0sSUFBSSxLQUFLLENBQUMsb0JBQW9CLENBQUMsQ0FBQztTQUN2QztRQUVELE1BQU0sU0FBUyxHQUFHLElBQUksc0JBQVMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2pELE1BQU0sWUFBWSxHQUFHLEVBQUUsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEMsT0FBTyxJQUFJLGNBQWMsQ0FBQyxTQUFTLEVBQUUsWUFBWSxDQUFDLENBQUM7SUFDckQsQ0FBQztJQUVELFFBQVE7UUFDTixNQUFNLGVBQWUsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3hDLGVBQWUsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ2pELE9BQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNyRSxDQUFDO0lBRUQsUUFBUTtRQUNOLE9BQU8sS0FBSyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7SUFDaEQsQ0FBQztJQUVELE1BQU0sQ0FBQyxHQUFtQjtRQUN4QixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxJQUFJLENBQUMsWUFBWSxLQUFLLEdBQUcsQ0FBQyxZQUFZLENBQUM7SUFDeEYsQ0FBQzs7QUFuQ0gsd0NBb0NDO0FBbkNRLG1CQUFJLEdBQUcsY0FBYyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMifQ==