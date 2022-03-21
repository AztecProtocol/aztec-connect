"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TxHash = void 0;
const crypto_1 = require("crypto");
class TxHash {
    constructor(buffer) {
        this.buffer = buffer;
        if (buffer.length !== 32) {
            throw new Error('Invalid hash buffer.');
        }
    }
    static fromBuffer(buffer) {
        return new TxHash(buffer);
    }
    static deserialize(buffer, offset) {
        return { elem: new TxHash(buffer.slice(offset, offset + 32)), adv: 32 };
    }
    static fromString(hash) {
        return new TxHash(Buffer.from(hash.replace(/^0x/i, ''), 'hex'));
    }
    static random() {
        return new TxHash((0, crypto_1.randomBytes)(32));
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
}
exports.TxHash = TxHash;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHhfaGFzaC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9ibG9ja2NoYWluL3R4X2hhc2gudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbUNBQXFDO0FBRXJDLE1BQWEsTUFBTTtJQUNqQixZQUFvQixNQUFjO1FBQWQsV0FBTSxHQUFOLE1BQU0sQ0FBUTtRQUNoQyxJQUFJLE1BQU0sQ0FBQyxNQUFNLEtBQUssRUFBRSxFQUFFO1lBQ3hCLE1BQU0sSUFBSSxLQUFLLENBQUMsc0JBQXNCLENBQUMsQ0FBQztTQUN6QztJQUNILENBQUM7SUFFRCxNQUFNLENBQUMsVUFBVSxDQUFDLE1BQWM7UUFDOUIsT0FBTyxJQUFJLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUM1QixDQUFDO0lBRUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFjLEVBQUUsTUFBYztRQUMvQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLE1BQU0sR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsQ0FBQztJQUMxRSxDQUFDO0lBRU0sTUFBTSxDQUFDLFVBQVUsQ0FBQyxJQUFZO1FBQ25DLE9BQU8sSUFBSSxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQ2xFLENBQUM7SUFFTSxNQUFNLENBQUMsTUFBTTtRQUNsQixPQUFPLElBQUksTUFBTSxDQUFDLElBQUEsb0JBQVcsRUFBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ3JDLENBQUM7SUFFRCxNQUFNLENBQUMsR0FBVztRQUNoQixPQUFPLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7SUFDaEQsQ0FBQztJQUVELFFBQVE7UUFDTixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUM7SUFDckIsQ0FBQztJQUVELFFBQVE7UUFDTixPQUFPLEtBQUssSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO0lBQ2hELENBQUM7Q0FDRjtBQWxDRCx3QkFrQ0MifQ==