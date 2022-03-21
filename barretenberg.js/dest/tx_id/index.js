"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TxId = void 0;
const crypto_1 = require("crypto");
class TxId {
    constructor(buffer) {
        this.buffer = buffer;
        if (buffer.length !== 32) {
            throw new Error('Invalid hash buffer.');
        }
    }
    static deserialize(buffer, offset) {
        return { elem: new TxId(buffer.slice(offset, offset + 32)), adv: 32 };
    }
    static fromString(hash) {
        return new TxId(Buffer.from(hash.replace(/^0x/i, ''), 'hex'));
    }
    static random() {
        return new TxId((0, crypto_1.randomBytes)(32));
    }
    equals(rhs) {
        return this.toBuffer().equals(rhs.toBuffer());
    }
    toBuffer() {
        return this.buffer;
    }
    toString() {
        return `0x${this.toBuffer().toString('hex')}`;
    }
    toDepositSigningData() {
        const digest = this.toString();
        return Buffer.concat([
            Buffer.from('Signing this message will allow your pending funds to be spent in Aztec transaction:\n\n'),
            Buffer.from(digest),
            Buffer.from('\n\nIMPORTANT: Only sign the message if you trust the client'),
        ]);
    }
}
exports.TxId = TxId;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvdHhfaWQvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbUNBQXFDO0FBRXJDLE1BQWEsSUFBSTtJQUNmLFlBQW9CLE1BQWM7UUFBZCxXQUFNLEdBQU4sTUFBTSxDQUFRO1FBQ2hDLElBQUksTUFBTSxDQUFDLE1BQU0sS0FBSyxFQUFFLEVBQUU7WUFDeEIsTUFBTSxJQUFJLEtBQUssQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1NBQ3pDO0lBQ0gsQ0FBQztJQUVELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBYyxFQUFFLE1BQWM7UUFDL0MsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxNQUFNLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLENBQUM7SUFDeEUsQ0FBQztJQUVNLE1BQU0sQ0FBQyxVQUFVLENBQUMsSUFBWTtRQUNuQyxPQUFPLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUNoRSxDQUFDO0lBRU0sTUFBTSxDQUFDLE1BQU07UUFDbEIsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFBLG9CQUFXLEVBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNuQyxDQUFDO0lBRUQsTUFBTSxDQUFDLEdBQVM7UUFDZCxPQUFPLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7SUFDaEQsQ0FBQztJQUVELFFBQVE7UUFDTixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUM7SUFDckIsQ0FBQztJQUVELFFBQVE7UUFDTixPQUFPLEtBQUssSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO0lBQ2hELENBQUM7SUFFRCxvQkFBb0I7UUFDbEIsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQy9CLE9BQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQztZQUNuQixNQUFNLENBQUMsSUFBSSxDQUFDLDBGQUEwRixDQUFDO1lBQ3ZHLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDO1lBQ25CLE1BQU0sQ0FBQyxJQUFJLENBQUMsOERBQThELENBQUM7U0FDNUUsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBdkNELG9CQXVDQyJ9