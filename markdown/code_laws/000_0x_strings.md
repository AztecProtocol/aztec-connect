# 0x strings

Never, ever, in any of the code base, should the letters `0x` appear inside quotes.
The Ethereum development ecosystem has been damaged by the lazy approach of throwing binary data into strings.
In the infancy of JavaScript, options were limited. That's no longer the case with `Buffer` types and TypeScript.

There is one exception to where quoted `0x` strings are permitted in our codebase, and that is at an interface to a third party library that uses such strings.
Any such library must be encapsulated with extreme prejudice within a single manageable layer to prevent the interface permeating our codebase.

The only time it's acceptable to write such code, is in the slicing off of the `0x` before converting it into a typed binary data structure.

Note that the `0x` is sliced off **before** being sent to our `TxHash` class. Our code **never** deals with `0x` strings.

### Example

```typescript
// tx_hash.ts
class TxHash {
  constructor(private data: Buffer) {
    if (data.length !== 32) {
      throw new Error(`Bad TxHash buffer length ${data.length}.`);
    }

    static fromString(str: string) {
      return new TxHash(Buffer.fromString(str, 'hex'));
    }

    toString() {
      return this.data.toString('hex');
    }
  }

}

// lib.ts
async function interfaceToLibrary() {
  const txHash = functionReturning0xStringRepresentingTxHash();
  return TxHash.fromString(txHash.slice(2));
}
```
