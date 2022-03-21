"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchnorrSignature = void 0;
const crypto_1 = require("crypto");
class SchnorrSignature {
    constructor(buffer) {
        this.buffer = buffer;
        if (buffer.length !== 64) {
            throw new Error('Invalid signature buffer.');
        }
    }
    static isSignature(signature) {
        return /^(0x)?[0-9a-f]{128}$/i.test(signature);
    }
    static fromString(signature) {
        if (!SchnorrSignature.isSignature(signature)) {
            throw new Error(`Invalid signature string: ${signature}`);
        }
        return new SchnorrSignature(Buffer.from(signature.replace(/^0x/i, ''), 'hex'));
    }
    static randomSignature() {
        return new SchnorrSignature((0, crypto_1.randomBytes)(64));
    }
    s() {
        return this.buffer.slice(0, 32);
    }
    e() {
        return this.buffer.slice(32);
    }
    toBuffer() {
        return this.buffer;
    }
    toString() {
        return `0x${this.buffer.toString('hex')}`;
    }
}
exports.SchnorrSignature = SchnorrSignature;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2lnbmF0dXJlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2NyeXB0by9zY2hub3JyL3NpZ25hdHVyZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtQ0FBcUM7QUFFckMsTUFBYSxnQkFBZ0I7SUFDM0IsWUFBb0IsTUFBYztRQUFkLFdBQU0sR0FBTixNQUFNLENBQVE7UUFDaEMsSUFBSSxNQUFNLENBQUMsTUFBTSxLQUFLLEVBQUUsRUFBRTtZQUN4QixNQUFNLElBQUksS0FBSyxDQUFDLDJCQUEyQixDQUFDLENBQUM7U0FDOUM7SUFDSCxDQUFDO0lBRU0sTUFBTSxDQUFDLFdBQVcsQ0FBQyxTQUFpQjtRQUN6QyxPQUFPLHVCQUF1QixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUNqRCxDQUFDO0lBRU0sTUFBTSxDQUFDLFVBQVUsQ0FBQyxTQUFpQjtRQUN4QyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxFQUFFO1lBQzVDLE1BQU0sSUFBSSxLQUFLLENBQUMsNkJBQTZCLFNBQVMsRUFBRSxDQUFDLENBQUM7U0FDM0Q7UUFDRCxPQUFPLElBQUksZ0JBQWdCLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQ2pGLENBQUM7SUFFTSxNQUFNLENBQUMsZUFBZTtRQUMzQixPQUFPLElBQUksZ0JBQWdCLENBQUMsSUFBQSxvQkFBVyxFQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDL0MsQ0FBQztJQUVELENBQUM7UUFDQyxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUNsQyxDQUFDO0lBRUQsQ0FBQztRQUNDLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDL0IsQ0FBQztJQUVELFFBQVE7UUFDTixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUM7SUFDckIsQ0FBQztJQUVELFFBQVE7UUFDTixPQUFPLEtBQUssSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztJQUM1QyxDQUFDO0NBQ0Y7QUFyQ0QsNENBcUNDIn0=