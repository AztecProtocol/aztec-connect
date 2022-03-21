"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ViewingKey = void 0;
const crypto_1 = require("crypto");
const grumpkin_1 = require("../ecc/grumpkin");
const serialize_1 = require("../serialize");
function deriveAESSecret(ecdhPubKey, ecdhPrivKey, grumpkin) {
    const sharedSecret = grumpkin.mul(ecdhPubKey.toBuffer(), ecdhPrivKey);
    const secretBuffer = Buffer.concat([sharedSecret, (0, serialize_1.numToUInt8)(1)]);
    const hash = (0, crypto_1.createHash)('sha256').update(secretBuffer).digest();
    return hash;
}
class ViewingKey {
    constructor(buffer) {
        if (buffer && buffer.length > 0) {
            if (buffer.length !== ViewingKey.SIZE) {
                throw new Error('Invalid hash buffer.');
            }
            this.buffer = buffer;
        }
        else {
            this.buffer = Buffer.alloc(0);
        }
    }
    static fromString(str) {
        return new ViewingKey(Buffer.from(str, 'hex'));
    }
    static random() {
        return new ViewingKey((0, crypto_1.randomBytes)(ViewingKey.SIZE));
    }
    /**
     * Returns the AES encrypted "viewing key".
     * [AES: [32 bytes value][4 bytes assetId][4 bytes nonce][32 bytes creatorPubKey]] [64 bytes ephPubKey]
     * @param noteBuf = Buffer.concat([value, assetId, nonce, creatorPubKey]);
     * @param ownerPubKey - the public key contained within a value note
     * @param ephPrivKey - a random field element (also used alongside the ownerPubKey in deriving a value note's secret)
     */
    static createFromEphPriv(noteBuf, ownerPubKey, ephPrivKey, grumpkin) {
        if (noteBuf.length !== 72) {
            throw new Error('Invalid note buffer.');
        }
        const ephPubKey = grumpkin.mul(grumpkin_1.Grumpkin.one, ephPrivKey);
        const aesSecret = deriveAESSecret(ownerPubKey, ephPrivKey, grumpkin);
        const aesKey = aesSecret.slice(0, 16);
        const iv = aesSecret.slice(16, 32);
        const cipher = (0, crypto_1.createCipheriv)('aes-128-cbc', aesKey, iv);
        cipher.setAutoPadding(false); // plaintext is already a multiple of 16 bytes
        const plaintext = Buffer.concat([iv.slice(0, 8), noteBuf]);
        return new ViewingKey(Buffer.concat([cipher.update(plaintext), cipher.final(), ephPubKey]));
    }
    isEmpty() {
        return this.buffer.length === 0;
    }
    equals(rhs) {
        return this.buffer.equals(rhs.buffer);
    }
    toBuffer() {
        return this.buffer;
    }
    toString() {
        return this.toBuffer().toString('hex');
    }
}
exports.ViewingKey = ViewingKey;
ViewingKey.SIZE = 144;
ViewingKey.EMPTY = new ViewingKey();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvdmlld2luZ19rZXkvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbUNBQWlFO0FBRWpFLDhDQUEyQztBQUMzQyw0Q0FBMEM7QUFFMUMsU0FBUyxlQUFlLENBQUMsVUFBMkIsRUFBRSxXQUFtQixFQUFFLFFBQWtCO0lBQzNGLE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLFFBQVEsRUFBRSxFQUFFLFdBQVcsQ0FBQyxDQUFDO0lBQ3RFLE1BQU0sWUFBWSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxZQUFZLEVBQUUsSUFBQSxzQkFBVSxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNsRSxNQUFNLElBQUksR0FBRyxJQUFBLG1CQUFVLEVBQUMsUUFBUSxDQUFDLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQ2hFLE9BQU8sSUFBSSxDQUFDO0FBQ2QsQ0FBQztBQUVELE1BQWEsVUFBVTtJQUtyQixZQUFZLE1BQWU7UUFDekIsSUFBSSxNQUFNLElBQUksTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7WUFDL0IsSUFBSSxNQUFNLENBQUMsTUFBTSxLQUFLLFVBQVUsQ0FBQyxJQUFJLEVBQUU7Z0JBQ3JDLE1BQU0sSUFBSSxLQUFLLENBQUMsc0JBQXNCLENBQUMsQ0FBQzthQUN6QztZQUNELElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO1NBQ3RCO2FBQU07WUFDTCxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDL0I7SUFDSCxDQUFDO0lBRUQsTUFBTSxDQUFDLFVBQVUsQ0FBQyxHQUFXO1FBQzNCLE9BQU8sSUFBSSxVQUFVLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUNqRCxDQUFDO0lBRUQsTUFBTSxDQUFDLE1BQU07UUFDWCxPQUFPLElBQUksVUFBVSxDQUFDLElBQUEsb0JBQVcsRUFBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUN0RCxDQUFDO0lBRUQ7Ozs7OztPQU1HO0lBQ0gsTUFBTSxDQUFDLGlCQUFpQixDQUFDLE9BQWUsRUFBRSxXQUE0QixFQUFFLFVBQWtCLEVBQUUsUUFBa0I7UUFDNUcsSUFBSSxPQUFPLENBQUMsTUFBTSxLQUFLLEVBQUUsRUFBRTtZQUN6QixNQUFNLElBQUksS0FBSyxDQUFDLHNCQUFzQixDQUFDLENBQUM7U0FDekM7UUFFRCxNQUFNLFNBQVMsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLG1CQUFRLENBQUMsR0FBRyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQ3pELE1BQU0sU0FBUyxHQUFHLGVBQWUsQ0FBQyxXQUFXLEVBQUUsVUFBVSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ3JFLE1BQU0sTUFBTSxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3RDLE1BQU0sRUFBRSxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ25DLE1BQU0sTUFBTSxHQUFHLElBQUEsdUJBQWMsRUFBQyxhQUFhLEVBQUUsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3pELE1BQU0sQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyw4Q0FBOEM7UUFDNUUsTUFBTSxTQUFTLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDM0QsT0FBTyxJQUFJLFVBQVUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsRUFBRSxNQUFNLENBQUMsS0FBSyxFQUFFLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzlGLENBQUM7SUFFRCxPQUFPO1FBQ0wsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUM7SUFDbEMsQ0FBQztJQUVELE1BQU0sQ0FBQyxHQUFlO1FBQ3BCLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3hDLENBQUM7SUFFRCxRQUFRO1FBQ04sT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDO0lBQ3JCLENBQUM7SUFFRCxRQUFRO1FBQ04sT0FBTyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3pDLENBQUM7O0FBNURILGdDQTZEQztBQTVEUSxlQUFJLEdBQUcsR0FBRyxDQUFDO0FBQ1gsZ0JBQUssR0FBRyxJQUFJLFVBQVUsRUFBRSxDQUFDIn0=