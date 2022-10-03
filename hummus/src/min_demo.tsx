import {
  AztecSdk,
  createAztecSdk,
  EthAddress,
  getRollupProviderStatus,
  GrumpkinAddress,
  JsonRpcProvider,
} from '@aztec/sdk';
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

function getRollupProviderUrl(deployTag: string) {
  if (deployTag) return `https://api.aztec.network/${deployTag}/falafel`;
  return `${window.location.protocol}//${window.location.hostname}:8081`;
}

function getEthereumHost(chainId: number) {
  switch (chainId) {
    case 5:
      return 'https://goerli.infura.io/v3/6a04b7c89c5b421faefde663f787aa35';
    case 1337:
      return 'http://localhost:8545';
    case 0xa57ec:
      return 'https://aztec-connect-testnet-mainnet-fork.aztec.network:8545';
    case 0xdef:
      return 'https://aztec-connect-dev-mainnet-fork.aztec.network:8545';
    default:
      return 'https://mainnet.infura.io/v3/6a04b7c89c5b421faefde663f787aa35';
  }
}

async function getDeployTag() {
  // If we haven't overridden our deploy tag, we discover it at runtime. All s3 deployments have a file
  // called DEPLOY_TAG in their root containing the deploy tag.
  if (process.env.NODE_ENV === 'production') {
    return await fetch('/DEPLOY_TAG').then(resp => (resp.ok ? resp.text() : ''));
  } else {
    return '';
  }
}

function MinForm({ grumpkinPrivKey }: MinFormProps) {
  const [sdk, setSdk] = useState<AztecSdk>();
  const [userId, setUserId] = useState(GrumpkinAddress.ZERO);
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
            const deployTag = await getDeployTag();
            const rollupProviderUrl = getRollupProviderUrl(deployTag);
            const initialRollupProviderStatus = await getRollupProviderStatus(rollupProviderUrl);
            const provider = new JsonRpcProvider(getEthereumHost(initialRollupProviderStatus.blockchainStatus.chainId));
            const serverUrl = deployTag ? `https://${deployTag}-sdk.aztec.network/` : 'http://localhost:1234';
            const sdk = await createAztecSdk(provider, {
              serverUrl,
              debug: 'bb:*',
            });
            await sdk.run();
            const accountPublicKey = await sdk.derivePublicKey(grumpkinPrivKey);
            if (!(await sdk.userExists(accountPublicKey))) {
              await sdk.addUser(grumpkinPrivKey);
            }
            log('init complete');
            setSdk(sdk);
            setUserId(accountPublicKey);
            setBusy(false);
          }}
        ></input>
        <input
          type="button"
          value="create js proof"
          disabled={!sdk || busy}
          onClick={async () => {
            setBusy(true);
            const start = new Date().getTime();
            log(`creating js proof...`);
            const controller = sdk!.createDepositController(
              EthAddress.random(),
              { assetId: 0, value: BigInt(0) },
              { assetId: 0, value: BigInt(0) },
              userId,
              false,
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
            const start = new Date().getTime();
            log(`creating account proof...`);
            const spendingKey = GrumpkinAddress.random();
            const controller = sdk!.createRegisterController(
              userId,
              'blah',
              grumpkinPrivKey,
              spendingKey,
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

export function minDemo() {
  ReactDOM.render(<MinForm grumpkinPrivKey={getKey()} />, document.getElementById('root'));
}
