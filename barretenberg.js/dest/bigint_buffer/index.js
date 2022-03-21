"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toBufferBE = exports.toBufferLE = exports.toBigIntBE = exports.toBigIntLE = void 0;
/**
 * Convert a little-endian buffer into a BigInt.
 * @param buf The little-endian buffer to convert
 * @returns A BigInt with the little-endian representation of buf.
 */
function toBigIntLE(buf) {
    const reversed = Buffer.from(buf);
    reversed.reverse();
    const hex = reversed.toString('hex');
    if (hex.length === 0) {
        return BigInt(0);
    }
    return BigInt(`0x${hex}`);
}
exports.toBigIntLE = toBigIntLE;
/**
 * Convert a big-endian buffer into a BigInt
 * @param buf The big-endian buffer to convert.
 * @returns A BigInt with the big-endian representation of buf.
 */
function toBigIntBE(buf) {
    const hex = buf.toString('hex');
    if (hex.length === 0) {
        return BigInt(0);
    }
    return BigInt(`0x${hex}`);
}
exports.toBigIntBE = toBigIntBE;
/**
 * Convert a BigInt to a little-endian buffer.
 * @param num   The BigInt to convert.
 * @param width The number of bytes that the resulting buffer should be.
 * @returns A little-endian buffer representation of num.
 */
function toBufferLE(num, width) {
    const hex = num.toString(16);
    const buffer = Buffer.from(hex.padStart(width * 2, '0').slice(0, width * 2), 'hex');
    buffer.reverse();
    return buffer;
}
exports.toBufferLE = toBufferLE;
/**
 * Convert a BigInt to a big-endian buffer.
 * @param num   The BigInt to convert.
 * @param width The number of bytes that the resulting buffer should be.
 * @returns A big-endian buffer representation of num.
 */
function toBufferBE(num, width) {
    const hex = num.toString(16);
    return Buffer.from(hex.padStart(width * 2, '0').slice(0, width * 2), 'hex');
}
exports.toBufferBE = toBufferBE;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvYmlnaW50X2J1ZmZlci9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQTs7OztHQUlHO0FBQ0gsU0FBZ0IsVUFBVSxDQUFDLEdBQVc7SUFDcEMsTUFBTSxRQUFRLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNsQyxRQUFRLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDbkIsTUFBTSxHQUFHLEdBQUcsUUFBUSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNyQyxJQUFJLEdBQUcsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO1FBQ3BCLE9BQU8sTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ2xCO0lBQ0QsT0FBTyxNQUFNLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQyxDQUFDO0FBQzVCLENBQUM7QUFSRCxnQ0FRQztBQUVEOzs7O0dBSUc7QUFDSCxTQUFnQixVQUFVLENBQUMsR0FBVztJQUNwQyxNQUFNLEdBQUcsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ2hDLElBQUksR0FBRyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7UUFDcEIsT0FBTyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDbEI7SUFDRCxPQUFPLE1BQU0sQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDLENBQUM7QUFDNUIsQ0FBQztBQU5ELGdDQU1DO0FBRUQ7Ozs7O0dBS0c7QUFDSCxTQUFnQixVQUFVLENBQUMsR0FBVyxFQUFFLEtBQWE7SUFDbkQsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUM3QixNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsS0FBSyxHQUFHLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLEtBQUssR0FBRyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUNwRixNQUFNLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDakIsT0FBTyxNQUFNLENBQUM7QUFDaEIsQ0FBQztBQUxELGdDQUtDO0FBRUQ7Ozs7O0dBS0c7QUFDSCxTQUFnQixVQUFVLENBQUMsR0FBVyxFQUFFLEtBQWE7SUFDbkQsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUM3QixPQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsS0FBSyxHQUFHLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQzlFLENBQUM7QUFIRCxnQ0FHQyJ9