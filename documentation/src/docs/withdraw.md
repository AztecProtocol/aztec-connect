This method withdraws assets back to layer 1, the layer one transaction is anonymous

@spec sdk.ts withdraw

```js
import { AssetId, EthAddress } from '@aztec/sdk';

async function demoWithdraw(aztecSdk, userId, signer) {
  const assetId = AssetId.DAI;

  const balanceBefore = aztecSdk.getBalance(userId);
  console.info('Balance before withdraw:', aztecSdk.fromErc20Units(assetId, balanceBefore));

  const value = aztecSdk.toErc20Units(assetId, '1.2');

  const recipientEthereumAddress = EthAddress.fromString(window.ethereum.selectedAddress);

  console.info('Creating withdraw proof...');
  const userData = await aztecSdk.getUserData(userId);
  const txHash = await aztecSdk.withdraw(assetId, userId, value, signer, recipientEthereumAddress);
  console.info('Proof accepted by server. Tx hash:', txHash.toString('hex'));

  console.info('Waiting for tx to settle...');
  await aztecSdk.awaitSettlement(userId, txHash);

  const balanceAfter = aztecSdk.getBalance(userId);
  console.info('Balance after withdraw:', aztecSdk.fromErc20Units(assetId, balanceAfter));
}
```

## Usage with UserAsset

Each [UserAsset](/#/Types/WalletSdkUserAsset) is bound to a user id and an asset id so that we don't have to pass these values around when we call the methods on it.

```js
import { AssetId, EthAddress } from '@aztec/sdk';

async function demoWithdraw(aztecSdk, userId, signer) {
  const user = aztecSdk.getUser(userId);
  const asset = user.getAsset(AssetId.DAI);

  const balanceBefore = asset.balance();
  console.info('Balance before withdraw:', asset.fromErc20Units(balanceBefore));

  const value = asset.toErc20Units('1.2');

  const recipientEthereumAddress = EthAddress.fromString(window.ethereum.selectedAddress);

  console.info('Creating withdraw proof...');
  const txHash = await asset.withdraw(value, signer, recipientEthereumAddress);
  console.info('Proof accepted by server. Tx hash:', txHash.toString('hex'));

  console.info('Waiting for tx to settle...');
  await aztecSdk.awaitSettlement(userId, txHash);

  const balanceAfter = asset.balance();
  console.info('Balance after withdraw:', asset.fromErc20Units(balanceAfter));
}
```

## See Also

- **[Deposit](/#/ERC20%20Tokens/deposit)**
- **[Transfer](/#/ERC20%20Tokens/transfer)**
- **[Public Transfer](/#/ERC20%20Tokens/publicTransfer)**
