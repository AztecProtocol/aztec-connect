# 0x strings

Avoid `0x` prefixed hex strings to represent binary data.

Favour slicing off the `0x` as soon as the string is consumed and converting the hex to a `Buffer`. Only serialize a `Buffer` back to a string if it must be represented as a string (e.g. in JSON), and only prefix it with a `0x` if a wider standard expects it as such. Examples would Ethereum addresses and transaction hashes.

### Example

```typescript
// tx_hash.ts
class TxHash {
  constructor(private data: Buffer) {
    if (data.length !== 32) {
      throw new Error(`Bad TxHash buffer length ${data.length}.`);
    }

    static fromString(str: string) {
      return new TxHash(Buffer.fromString(str.replace('0x', ''), 'hex'));
    }

    toString() {
      return '0x' + this.data.toString('hex');
    }
  }

}

// lib.ts
async function interfaceToLibrary() {
  const txHash = functionReturning0xStringRepresentingTxHash();
  return TxHash.fromString(txHash.slice(2));
}
```
