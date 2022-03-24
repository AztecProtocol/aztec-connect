import { AccountId, AztecSdk, createAztecSdk, EthAddress, JsonRpcProvider, SdkEvent } from '@aztec/sdk';
import React, { useState } from 'react';
import ReactDOM from 'react-dom';

function randomBytes(length: number) {
  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array);
  return Buffer.from(array);
}

function log(str: string) {
  document.getElementById('logs')!.innerHTML += `${str}<br>`;
}

interface MinFormProps {
  grumpkinPrivKey: Buffer;
}

function MinForm({ grumpkinPrivKey }: MinFormProps) {
  const [sdk, setSdk] = useState<AztecSdk>();
  const [busy, setBusy] = useState(false);

  return (
    <>
      Minimal Demo
      <form>
        <input
          type="button"
          value="init"
          disabled={!!sdk || busy}
          onClick={async () => {
            setBusy(true);
            log('initing');
            const provider = new JsonRpcProvider('https://goerli.infura.io/v3/6a04b7c89c5b421faefde663f787aa35');
            const sdk = await createAztecSdk(provider, {
              serverUrl: 'https://api.aztec.network/falafel',
              debug: true,
            });
            sdk.on(SdkEvent.LOG, log);
            await sdk.run();
            const grumpkinPubKey = await sdk.derivePublicKey(grumpkinPrivKey);
            const accountId = new AccountId(grumpkinPubKey, 0);
            if (!(await sdk.userExists(accountId))) {
              await sdk.addUser(grumpkinPrivKey);
            }
            log('init complete');
            setSdk(sdk);
            setBusy(false);
          }}
        ></input>
        <input
          type="button"
          value="create js proof"
          disabled={!sdk || busy}
          onClick={async () => {
            setBusy(true);
            const signer = await sdk!.createSchnorrSigner(grumpkinPrivKey);
            const accountId = new AccountId(signer.getPublicKey(), 0);
            const start = new Date().getTime();
            log(`creating js proof...`);
            const controller = sdk!.createTransferController(
              accountId,
              signer,
              { assetId: 0, value: BigInt(0) },
              { assetId: 0, value: BigInt(0) },
              accountId,
            );
            await controller.createProof();
            log(`${new Date().getTime() - start}ms`);
            setBusy(false);
          }}
        ></input>
        <input
          type="button"
          value="create account proof"
          disabled={!sdk || busy}
          onClick={async () => {
            setBusy(true);
            const signer = await sdk!.createSchnorrSigner(grumpkinPrivKey);
            const accountId = new AccountId(signer.getPublicKey(), 0);
            const start = new Date().getTime();
            log(`creating account proof...`);
            const controller = sdk!.createRegisterController(
              accountId,
              signer,
              'blah',
              accountId.publicKey,
              undefined,
              {
                assetId: 0,
                value: BigInt(0),
              },
              {
                assetId: 0,
                value: BigInt(0),
              },
              EthAddress.ZERO,
            );
            await controller.createProof();
            log(`${new Date().getTime() - start}ms`);
            setBusy(false);
          }}
        ></input>
        <p id="logs" />
      </form>
    </>
  );
}

function getKey() {
  const key = window.localStorage.getItem('key');
  if (key) {
    return Buffer.from(key, 'hex');
  } else {
    const key = randomBytes(32);
    window.localStorage.setItem('key', key.toString('hex'));
    return key;
  }
}

export async function minDemo() {
  ReactDOM.render(<MinForm grumpkinPrivKey={getKey()} />, document.getElementById('root'));
}
