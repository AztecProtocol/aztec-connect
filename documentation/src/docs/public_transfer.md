This method sends funds publicaly on layer 1.

@spec sdk.ts publicTransfer

```js
import { AssetId, EthAddress } from '@aztec/sdk';
import { ethers } from 'ethers';

async function demoPublicTransfer(aztecSdk, userId, signer) {
  const assetId = AssetId.DAI;
  const senderEthereumAddress = EthAddress.fromString(window.ethereum.selectedAddress);

  const balanceBefore = await aztecSdk.getPublicBalance(assetId, senderEthereumAddress);
  console.info('Public balance before transfer:', aztecSdk.fromErc20Units(assetId, balanceBefore));

  const value = aztecSdk.toErc20Units(assetId, '1.5');

  const allowance = await aztecSdk.getPublicAllowance(assetId, senderEthereumAddress);
  if (allowance < value) {
    console.info('Approve rollup contract to spend your token...');
    await aztecSdk.approve(assetId, userId, value, senderEthereumAddress);
    console.info('Approved!');
  }

  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const ethSigner = await provider.getSigner();

  const recipientEthereumAddress = EthAddress.fromString('RECIPIENT_ETH_ADDRESS');

  console.info('Creating transfer proof...');
  const userData = await aztecSdk.getUserData(userId);
  const txHash = await aztecSdk.publicTransfer(assetId, userId, value, signer, ethSigner, recipientEthereumAddress);
  console.info('Proof accepted by server. Tx hash:', txHash.toString('hex'));

  console.info('Waiting for tx to settle...');
  await aztecSdk.awaitSettlement(userId, txHash);

  const balanceAfter = await aztecSdk.getPublicBalance(assetId, senderEthereumAddress);
  console.info('Public balance after transfer:', aztecSdk.fromErc20Units(assetId, balanceAfter));
}
```

## Usage with UserAsset

Each [UserAsset](/#/SDK/Types/WalletSdkUserAsset) is bound to a user id and an asset id so that we don't have to pass these values around when we call the methods on it.

```js
import { AssetId, EthAddress } from '@aztec/sdk';
import { ethers } from 'ethers';

async function demoPublicTransfer(aztecSdk, userId, signer) {
  const user = aztecSdk.getUser(userId);
  const asset = user.getAsset(AssetId.DAI);
  const senderEthereumAddress = EthAddress.fromString(window.ethereum.selectedAddress);

  const balanceBefore = await asset.publicBalance(senderEthereumAddress);
  console.info('Public balance before transfer:', asset.fromErc20Units(balanceBefore));

  const value = asset.toErc20Units('1.5');

  const allowance = await asset.publicAllowance(senderEthereumAddress);
  if (allowance < value) {
    console.info('Approve rollup contract to spend your token...');
    await asset.approve(value, senderEthereumAddress);
    console.info('Approved!');
  }

  const recipientEthereumAddress = EthAddress.fromString('RECIPIENT_ETH_ADDRESS');

  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const ethSigner = await provider.getSigner();

  console.info('Creating transfer proof...');
  const txHash = await asset.publicTransfer(value, signer, ethSigner, recipientEthereumAddress);
  console.info('Proof accepted by server. Tx hash:', txHash.toString('hex'));

  console.info('Waiting for tx to settle...');
  await aztecSdk.awaitSettlement(userId, txHash);

  const balanceAfter = await asset.publicBalance(senderEthereumAddress);
  console.info('Public balance after transfer:', asset.fromErc20Units(balanceAfter));
}
```

## See Also

- **[Initialize the SDK](/#/SDK/Initialize%20the%20SDK)**
