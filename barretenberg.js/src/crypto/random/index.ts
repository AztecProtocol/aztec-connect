/**
 * Obtain require(crypto) in Node.js environment.
 * @return {undefined|Object} - Node.js crypto object
*/
const getNodeCrypto = (): undefined | any => {
    const isNode = typeof process !== 'undefined'
        && process.versions != null && process.versions.node != null;

    if (!isNode) {
        return undefined;
    } else {
        return require('crypto');
    }
};

/**
 * Obtain window.crypto object in browser environments.
 * @return {undefined|Object} - WebCrypto API object
 */
const getRootWebCrypto = (): undefined | any => {
    if (typeof window !== 'undefined' && window.crypto) return window.crypto;
    return undefined;
};

/**
 * Secure random generator that returns a byte array filled with cryptographically secure random bytes
 * @param {Number} len - Byte length of random sequence.
 * @return {Uint8Array} - Generated random sequence.
 * @throws {Error} - Throws if UnsupportedEnvironment.
 */
export const getRandomBytes = (len: number): Uint8Array => {
    const webCrypto = getRootWebCrypto(); // web crypto api
    const nodeCrypto = getNodeCrypto(); // implementation on node.js
    if (typeof webCrypto !== 'undefined' && typeof webCrypto.getRandomValues === 'function') {
        const array = new Uint8Array(len);
        webCrypto.getRandomValues(array); // for modern browsers
        return array;
    }
    else if (typeof nodeCrypto !== 'undefined') { // for node
        return new Uint8Array(nodeCrypto.randomBytes(len));
    } else {
        throw new Error('getRandomBytes UnsupportedEnvironment');
    }
};