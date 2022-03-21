"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GrumpkinAddress = void 0;
const crypto_1 = require("crypto");
const grumpkin_1 = require("../ecc/grumpkin");
class GrumpkinAddress {
    constructor(buffer) {
        this.buffer = buffer;
        if (buffer.length !== 64) {
            throw new Error('Invalid address buffer.');
        }
    }
    static isAddress(address) {
        return /^(0x|0X)?[0-9a-fA-F]{128}$/.test(address);
    }
    static fromString(address) {
        if (!GrumpkinAddress.isAddress(address)) {
            throw new Error(`Invalid address string: ${address}`);
        }
        return new GrumpkinAddress(Buffer.from(address.replace(/^0x/i, ''), 'hex'));
    }
    /**
     * NOT a valid address! Do not use in proofs.
     */
    static randomAddress() {
        return new GrumpkinAddress((0, crypto_1.randomBytes)(64));
    }
    /**
     * A valid address (is a point on the curve).
     */
    static one() {
        return new GrumpkinAddress(grumpkin_1.Grumpkin.one);
    }
    equals(rhs) {
        return this.buffer.equals(rhs.toBuffer());
    }
    toBuffer() {
        return this.buffer;
    }
    x() {
        return this.buffer.slice(0, 32);
    }
    y() {
        return this.buffer.slice(32);
    }
    toString() {
        return `0x${this.buffer.toString('hex')}`;
    }
}
exports.GrumpkinAddress = GrumpkinAddress;
GrumpkinAddress.ZERO = new GrumpkinAddress(Buffer.alloc(64));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3J1bXBraW5fYWRkcmVzcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9hZGRyZXNzL2dydW1wa2luX2FkZHJlc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbUNBQXFDO0FBQ3JDLDhDQUEyQztBQUUzQyxNQUFhLGVBQWU7SUFHMUIsWUFBb0IsTUFBYztRQUFkLFdBQU0sR0FBTixNQUFNLENBQVE7UUFDaEMsSUFBSSxNQUFNLENBQUMsTUFBTSxLQUFLLEVBQUUsRUFBRTtZQUN4QixNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUM7U0FDNUM7SUFDSCxDQUFDO0lBRU0sTUFBTSxDQUFDLFNBQVMsQ0FBQyxPQUFlO1FBQ3JDLE9BQU8sNEJBQTRCLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ3BELENBQUM7SUFFTSxNQUFNLENBQUMsVUFBVSxDQUFDLE9BQWU7UUFDdEMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLEVBQUU7WUFDdkMsTUFBTSxJQUFJLEtBQUssQ0FBQywyQkFBMkIsT0FBTyxFQUFFLENBQUMsQ0FBQztTQUN2RDtRQUNELE9BQU8sSUFBSSxlQUFlLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQzlFLENBQUM7SUFFRDs7T0FFRztJQUNJLE1BQU0sQ0FBQyxhQUFhO1FBQ3pCLE9BQU8sSUFBSSxlQUFlLENBQUMsSUFBQSxvQkFBVyxFQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDOUMsQ0FBQztJQUVEOztPQUVHO0lBQ0ksTUFBTSxDQUFDLEdBQUc7UUFDZixPQUFPLElBQUksZUFBZSxDQUFDLG1CQUFRLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDM0MsQ0FBQztJQUVNLE1BQU0sQ0FBQyxHQUFvQjtRQUNoQyxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO0lBQzVDLENBQUM7SUFFRCxRQUFRO1FBQ04sT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDO0lBQ3JCLENBQUM7SUFFRCxDQUFDO1FBQ0MsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDbEMsQ0FBQztJQUVELENBQUM7UUFDQyxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQy9CLENBQUM7SUFFRCxRQUFRO1FBQ04sT0FBTyxLQUFLLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7SUFDNUMsQ0FBQzs7QUFwREgsMENBcURDO0FBcERlLG9CQUFJLEdBQUcsSUFBSSxlQUFlLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDIn0=