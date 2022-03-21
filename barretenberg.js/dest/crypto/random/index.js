"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRandomBytes = void 0;
/**
 * Obtain require(crypto) in Node.js environment.
 * @return {undefined|Object} - Node.js crypto object
 */
const getNodeCrypto = () => {
    const isNode = typeof process !== 'undefined' && process.versions != null && process.versions.node != null;
    if (!isNode) {
        return undefined;
    }
    else {
        return require('crypto');
    }
};
/**
 * Obtain window.crypto object in browser environments.
 * @return {undefined|Object} - WebCrypto API object
 */
const getRootWebCrypto = () => {
    if (typeof window !== 'undefined' && window.crypto)
        return window.crypto;
    if (typeof self !== 'undefined' && self.crypto)
        return self.crypto;
    return undefined;
};
/**
 * Secure random generator that returns a byte array filled with cryptographically secure random bytes
 * @param {Number} len - Byte length of random sequence.
 * @return {Uint8Array} - Generated random sequence.
 * @throws {Error} - Throws if UnsupportedEnvironment.
 */
const getRandomBytes = (len) => {
    const webCrypto = getRootWebCrypto(); // web crypto api
    const nodeCrypto = getNodeCrypto(); // implementation on node.js
    if (typeof webCrypto !== 'undefined' && typeof webCrypto.getRandomValues === 'function') {
        const array = new Uint8Array(len);
        webCrypto.getRandomValues(array); // for modern browsers
        return array;
    }
    else if (typeof nodeCrypto !== 'undefined') {
        // for node
        return new Uint8Array(nodeCrypto.randomBytes(len));
    }
    else {
        throw new Error('getRandomBytes UnsupportedEnvironment');
    }
};
exports.getRandomBytes = getRandomBytes;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvY3J5cHRvL3JhbmRvbS9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQTs7O0dBR0c7QUFDSCxNQUFNLGFBQWEsR0FBRyxHQUFvQixFQUFFO0lBQzFDLE1BQU0sTUFBTSxHQUFHLE9BQU8sT0FBTyxLQUFLLFdBQVcsSUFBSSxPQUFPLENBQUMsUUFBUSxJQUFJLElBQUksSUFBSSxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksSUFBSSxJQUFJLENBQUM7SUFFM0csSUFBSSxDQUFDLE1BQU0sRUFBRTtRQUNYLE9BQU8sU0FBUyxDQUFDO0tBQ2xCO1NBQU07UUFDTCxPQUFPLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztLQUMxQjtBQUNILENBQUMsQ0FBQztBQUVGOzs7R0FHRztBQUNILE1BQU0sZ0JBQWdCLEdBQUcsR0FBb0IsRUFBRTtJQUM3QyxJQUFJLE9BQU8sTUFBTSxLQUFLLFdBQVcsSUFBSSxNQUFNLENBQUMsTUFBTTtRQUFFLE9BQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQztJQUN6RSxJQUFJLE9BQU8sSUFBSSxLQUFLLFdBQVcsSUFBSSxJQUFJLENBQUMsTUFBTTtRQUFFLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQztJQUNuRSxPQUFPLFNBQVMsQ0FBQztBQUNuQixDQUFDLENBQUM7QUFFRjs7Ozs7R0FLRztBQUNJLE1BQU0sY0FBYyxHQUFHLENBQUMsR0FBVyxFQUFjLEVBQUU7SUFDeEQsTUFBTSxTQUFTLEdBQUcsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDLGlCQUFpQjtJQUN2RCxNQUFNLFVBQVUsR0FBRyxhQUFhLEVBQUUsQ0FBQyxDQUFDLDRCQUE0QjtJQUNoRSxJQUFJLE9BQU8sU0FBUyxLQUFLLFdBQVcsSUFBSSxPQUFPLFNBQVMsQ0FBQyxlQUFlLEtBQUssVUFBVSxFQUFFO1FBQ3ZGLE1BQU0sS0FBSyxHQUFHLElBQUksVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ2xDLFNBQVMsQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxzQkFBc0I7UUFDeEQsT0FBTyxLQUFLLENBQUM7S0FDZDtTQUFNLElBQUksT0FBTyxVQUFVLEtBQUssV0FBVyxFQUFFO1FBQzVDLFdBQVc7UUFDWCxPQUFPLElBQUksVUFBVSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztLQUNwRDtTQUFNO1FBQ0wsTUFBTSxJQUFJLEtBQUssQ0FBQyx1Q0FBdUMsQ0FBQyxDQUFDO0tBQzFEO0FBQ0gsQ0FBQyxDQUFDO0FBYlcsUUFBQSxjQUFjLGtCQWF6QiJ9