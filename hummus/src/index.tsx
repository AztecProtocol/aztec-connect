/*
  Copyright (c) 2019 Spilsbury Holdings

  This file is part of web3x and is released under the MIT License.
  https://opensource.org/licenses/MIT
*/

import React from 'react';
import ReactDOM from 'react-dom';
import { BarretenbergWasm } from 'barretenberg/wasm';
import { Schnorr } from 'barretenberg/crypto/schnorr';
require('barretenberg/wasm/barretenberg.wasm');

async function main() {
  const barretenberg = new BarretenbergWasm();
  await barretenberg.init();
  const schnorr = new Schnorr(barretenberg);

  const pk = Buffer.from([
    0x0b, 0x9b, 0x3a, 0xde, 0xe6, 0xb3, 0xd8, 0x1b, 0x28, 0xa0, 0x88, 0x6b, 0x2a, 0x84, 0x15, 0xc7,
    0xda, 0x31, 0x29, 0x1a, 0x5e, 0x96, 0xbb, 0x7a, 0x56, 0x63, 0x9e, 0x17, 0x7d, 0x30, 0x1b, 0xeb ]);

  const pubKey = schnorr.computePublicKey(pk);
  const msg = new TextEncoder().encode('The quick brown dog jumped over the lazy fox.');
  const signature = schnorr.constructSignature(msg, pk);
  const verified = schnorr.verifySignature(msg, pubKey, signature);

  console.log(verified);

  ReactDOM.render(<p/>, document.getElementById('root'));
}

// tslint:disable-next-line:no-console
main().catch(console.error);
