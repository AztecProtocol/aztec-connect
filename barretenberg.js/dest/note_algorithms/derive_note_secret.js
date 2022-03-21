"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deriveNoteSecret = void 0;
const crypto_1 = require("crypto");
const serialize_1 = require("../serialize");
function deriveNoteSecret(ecdhPubKey, ecdhPrivKey, grumpkin, version = 1) {
    if (version == 1) {
        const sharedSecret = grumpkin.mul(ecdhPubKey.toBuffer(), ecdhPrivKey);
        const secretBufferA = Buffer.concat([sharedSecret, (0, serialize_1.numToUInt8)(2)]);
        const secretBufferB = Buffer.concat([sharedSecret, (0, serialize_1.numToUInt8)(3)]);
        const hashA = (0, crypto_1.createHash)('sha256').update(secretBufferA).digest();
        const hashB = (0, crypto_1.createHash)('sha256').update(secretBufferB).digest();
        const hash = Buffer.concat([hashA, hashB]);
        // Note: to get close to uniformly-distributed field elements, we need to start with 512-bits before modulo
        // reduction (not 256) - hence why we hash _twice_ and concatenate above.
        return grumpkin.reduce512BufferToFr(hash);
    }
    const sharedSecret = grumpkin.mul(ecdhPubKey.toBuffer(), ecdhPrivKey);
    const secretBuffer = Buffer.concat([sharedSecret, (0, serialize_1.numToUInt8)(0)]);
    const hash = (0, crypto_1.createHash)('sha256').update(secretBuffer).digest();
    hash[0] &= 0x03;
    return hash;
}
exports.deriveNoteSecret = deriveNoteSecret;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVyaXZlX25vdGVfc2VjcmV0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL25vdGVfYWxnb3JpdGhtcy9kZXJpdmVfbm90ZV9zZWNyZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbUNBQW9DO0FBR3BDLDRDQUEwQztBQUUxQyxTQUFnQixnQkFBZ0IsQ0FBQyxVQUEyQixFQUFFLFdBQW1CLEVBQUUsUUFBa0IsRUFBRSxPQUFPLEdBQUcsQ0FBQztJQUNoSCxJQUFJLE9BQU8sSUFBSSxDQUFDLEVBQUU7UUFDaEIsTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsUUFBUSxFQUFFLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDdEUsTUFBTSxhQUFhLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFlBQVksRUFBRSxJQUFBLHNCQUFVLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ25FLE1BQU0sYUFBYSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxZQUFZLEVBQUUsSUFBQSxzQkFBVSxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuRSxNQUFNLEtBQUssR0FBRyxJQUFBLG1CQUFVLEVBQUMsUUFBUSxDQUFDLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ2xFLE1BQU0sS0FBSyxHQUFHLElBQUEsbUJBQVUsRUFBQyxRQUFRLENBQUMsQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDbEUsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQzNDLDJHQUEyRztRQUMzRyx5RUFBeUU7UUFDekUsT0FBTyxRQUFRLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLENBQUM7S0FDM0M7SUFFRCxNQUFNLFlBQVksR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUUsRUFBRSxXQUFXLENBQUMsQ0FBQztJQUN0RSxNQUFNLFlBQVksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsWUFBWSxFQUFFLElBQUEsc0JBQVUsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbEUsTUFBTSxJQUFJLEdBQUcsSUFBQSxtQkFBVSxFQUFDLFFBQVEsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUNoRSxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDO0lBQ2hCLE9BQU8sSUFBSSxDQUFDO0FBQ2QsQ0FBQztBQWxCRCw0Q0FrQkMifQ==