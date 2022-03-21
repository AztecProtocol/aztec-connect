"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EthAddress = void 0;
const sha3_1 = require("sha3");
const crypto_1 = require("crypto");
const hash = new sha3_1.Keccak(256);
/**
 * Takes a string hex input e.g. `deadbeef` and returns the same.
 */
function sha3(input) {
    hash.reset();
    hash.update(input);
    return hash.digest('hex');
}
class EthAddress {
    constructor(buffer) {
        this.buffer = buffer;
        if (buffer.length === 32) {
            if (!buffer.slice(0, 12).equals(Buffer.alloc(12))) {
                throw new Error('Invalid address buffer.');
            }
            else {
                this.buffer = buffer.slice(12);
            }
        }
        else if (buffer.length !== 20) {
            throw new Error('Invalid address buffer.');
        }
    }
    static fromString(address) {
        if (!EthAddress.isAddress(address)) {
            throw new Error(`Invalid address string: ${address}`);
        }
        return new EthAddress(Buffer.from(address.replace(/^0x/i, ''), 'hex'));
    }
    static randomAddress() {
        return new EthAddress((0, crypto_1.randomBytes)(20));
    }
    static isAddress(address) {
        if (!/^(0x)?[0-9a-f]{40}$/i.test(address)) {
            // Does not have the basic requirements of an address.
            return false;
        }
        else if (/^(0x|0X)?[0-9a-f]{40}$/.test(address) || /^(0x|0X)?[0-9A-F]{40}$/.test(address)) {
            // It's ALL lowercase or ALL upppercase.
            return true;
        }
        else {
            return EthAddress.checkAddressChecksum(address);
        }
    }
    isZero() {
        return this.equals(EthAddress.ZERO);
    }
    static checkAddressChecksum(address) {
        address = address.replace(/^0x/i, '');
        const addressHash = sha3(address.toLowerCase());
        for (let i = 0; i < 40; i++) {
            // The nth letter should be uppercase if the nth digit of casemap is 1.
            if ((parseInt(addressHash[i], 16) > 7 && address[i].toUpperCase() !== address[i]) ||
                (parseInt(addressHash[i], 16) <= 7 && address[i].toLowerCase() !== address[i])) {
                return false;
            }
        }
        return true;
    }
    static toChecksumAddress(address) {
        if (!EthAddress.isAddress(address)) {
            throw new Error('Invalid address string.');
        }
        address = address.toLowerCase().replace(/^0x/i, '');
        const addressHash = sha3(address);
        let checksumAddress = '0x';
        for (let i = 0; i < address.length; i++) {
            // If ith character is 9 to f then make it uppercase.
            if (parseInt(addressHash[i], 16) > 7) {
                checksumAddress += address[i].toUpperCase();
            }
            else {
                checksumAddress += address[i];
            }
        }
        return checksumAddress;
    }
    equals(rhs) {
        return this.buffer.equals(rhs.toBuffer());
    }
    toString() {
        return EthAddress.toChecksumAddress(this.buffer.toString('hex'));
    }
    toBuffer() {
        return this.buffer;
    }
    toBuffer32() {
        const buffer = Buffer.alloc(32);
        this.buffer.copy(buffer, 12);
        return buffer;
    }
}
exports.EthAddress = EthAddress;
EthAddress.ZERO = new EthAddress(Buffer.alloc(20));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXRoX2FkZHJlc3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvYWRkcmVzcy9ldGhfYWRkcmVzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSwrQkFBOEI7QUFDOUIsbUNBQXFDO0FBRXJDLE1BQU0sSUFBSSxHQUFHLElBQUksYUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBRTdCOztHQUVHO0FBQ0gsU0FBUyxJQUFJLENBQUMsS0FBYTtJQUN6QixJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDYixJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ25CLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUM1QixDQUFDO0FBRUQsTUFBYSxVQUFVO0lBR3JCLFlBQW9CLE1BQWM7UUFBZCxXQUFNLEdBQU4sTUFBTSxDQUFRO1FBQ2hDLElBQUksTUFBTSxDQUFDLE1BQU0sS0FBSyxFQUFFLEVBQUU7WUFDeEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUU7Z0JBQ2pELE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQzthQUM1QztpQkFBTTtnQkFDTCxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUM7YUFDaEM7U0FDRjthQUFNLElBQUksTUFBTSxDQUFDLE1BQU0sS0FBSyxFQUFFLEVBQUU7WUFDL0IsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO1NBQzVDO0lBQ0gsQ0FBQztJQUVNLE1BQU0sQ0FBQyxVQUFVLENBQUMsT0FBZTtRQUN0QyxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsRUFBRTtZQUNsQyxNQUFNLElBQUks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