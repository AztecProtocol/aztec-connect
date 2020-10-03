The emergency withdraw is a last resort, escape-hatch that can be used to withdraw funds from the L2 system back to L1 in the unlikely event that all rollup providers go offline.

## How it works

The SDK is initialised in emergency mode. This then allows the SDK to perform all standard SDK methods, including the withdraw() method, without the need for a rollup provider to be online.

In emergency mode, the proofs are constructed in browser and sent directly to the RollupProcessor smart contract. These proofs and their associated proving keys are intensive to construct. In order to construct the proof, various pieces of on-chain data need to be fetched and supplied to the proof construction.

This data querying role is performed by a stand-alone server, Sriracha. Sriracha is open source and is intended to be run by the user locally themselves.

The Aztec L2 system reserves the last 20 blocks of every 100 Ethereum blocks for use by the escape hatch system. During this time, no standard Rollups can be processed.

For the purposes of the demo code below, the SDK is using a Sriracha instance that we have deployed on cloud computing resources. However, for real use, Sriracha is distributed as a docker container from the official Aztec docker repository. To replicate the setting up of the server, follow the setup steps:

## Setup

1. Install docker
2. Pull the Aztec Sriracha Docker image: docker pull aztecprotocol/sriracha:latest
3. Prepare environment variables that are required by the image:
   - `INFURA_API_KEY`: used to send Ethereum data queries via Infura nodes
   - `NETWORK`: Ethereum network you are withdrawing to. Aztec is currently deployed on the ropsten testnet
   - `ROLLUP_CONTRACT_ADDRESS`: address of the RollupProcessor.sol deployed Rollup contract

Alternatively, instead of an `INFURA_API_KEY` and `NETWORK` you can pass an `ETHEREUM_HOST` - a URL to your local node.

4. Start up the server:

```bash static
docker run -ti -e INFURA_API_KEY=01234 -e NETWORK=ropsten -e ROLLUP_CONTRACT_ADDRESS=0x1234 -p 8082:8082 aztecprotocol/sriracha:latest
```

<br/>

## Activate the emergency withdraw

```js
import { AssetId, EthAddress, createWalletSdk, Web3Signer } from '@aztec/sdk';
import { ethers } from 'ethers';

// First we do a deposit, followed by a withdraw
async function demoEmergencyWithdraw(userId, signer) {
  const srirachaURL = 'SRIRACHA_URL';
  const aztecSdkEmergency = await createWalletSdk(window.ethereum, srirachaURL);
  console.info('Is escape hatch mode?', aztecSdkEmergency.isEscapeHatchMode());

  console.info('initialising sdk and constructing escape proving key');
  await aztecSdkEmergency.init();

  // Deposit
  const assetId = AssetId.DAI;
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const value = aztecSdkEmergency.toErc20Units(assetId, '10');

  const senderEthereumAddress = EthAddress.fromString(window.ethereum.selectedAddress);
  const ethSigner = new Web3Signer(provider, senderEthereumAddress);

  const allowance = await aztecSdkEmergency.getPublicAllowance(assetId, senderEthereumAddress);

  if (allowance < value) {
    console.info('Approve rollup contract to spend your token...');
    await aztecSdkEmergency.approve(assetId, userId, value, senderEthereumAddress);
    console.info('Approved!');
  }

  console.info('Creating deposit proof...');
  const userData = await aztecSdkEmergency.getUserData(userId);
  const depositTxHash = await aztecSdkEmergency.deposit(assetId, userId, value, signer, ethSigner);
  console.info('Proof accepted. Tx hash:', depositTxHash.toString('hex'));

  console.info('Waiting for tx to settle...');
  await aztecSdkEmergency.awaitSettlement(userId, depositTxHash);

  const balanceAfter = aztecSdkEmergency.getBalance(userId);
  console.info('Balance after deposit:', aztecSdkEmergency.fromErc20Units(assetId, balanceAfter));

  // Withdraw
  const withdrawValue = aztecSdkEmergency.toErc20Units(assetId, '5');
  const recipientEthereumAddress = EthAddress.fromString(window.ethereum.selectedAddress);

  console.info('Creating withdraw proof...');
  const withdrawTxHash = await aztecSdkEmergency.withdraw(assetId, userId, value, signer, recipientEthereumAddress);
  console.info('Proof accepted. Tx hash:', withdrawTxHash.toString('hex'));

  console.info('Waiting for tx to settle...');
  await aztecSdkEmergency.awaitSettlement(userId, withdrawTxHash);

  const finalBalance = aztecSdkEmergency.getBalance(userId);
  console.info('Balance after withdraw:', aztecSdkEmergency.fromErc20Units(assetId, finalBalance));

  // Destroy this demo sdk
  await aztecSdkEmergency.destroy();
}
```
