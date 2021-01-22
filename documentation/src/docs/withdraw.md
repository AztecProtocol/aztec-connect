This method withdraws assets back to layer 1, the layer one transaction is anonymous

@spec sdk.ts withdraw

```js
import { AssetId, EthAddress } from '@aztec/sdk';

async function demoWithdraw(aztecSdk, userId, signer) {
  const assetId = AssetId.DAI;

  const balanceBefore = aztecSdk.getBalance(assetId, userId);
  console.info('Balance before withdraw:', aztecSdk.fromBaseUnits(assetId, balanceBefore));

  const value = aztecSdk.toBaseUnits(assetId, '1.2');
  const fee = await aztecSdk.getFee(assetId);

  const recipientEthereumAddress = EthAddress.fromString(window.ethereum.selectedAddress);

  console.info('Creating withdraw proof...');
  const txHash = await aztecSdk.withdraw(assetId, userId, value, fee, signer, recipientEthereumAddress);
  console.info(`Proof accepted by server. Tx hash: ${txHash}`);

  console.info('Waiting for tx to settle...');
  await aztecSdk.awaitSettlement(txHash);

  const balanceAfter = aztecSdk.getBalance(assetId, userId);
  console.info('Balance after withdraw:', aztecSdk.fromBaseUnits(assetId, balanceAfter));
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
  console.info('Balance before withdraw:', asset.fromBaseUnits(balanceBefore));

  const value = asset.toBaseUnits('1.2');
  const fee = await asset.getFee();

  const recipientEthereumAddress = EthAddress.fromString(window.ethereum.selectedAddress);

  console.info('Creating withdraw proof...');
  const txHash = await asset.withdraw(value, fee, signer, recipientEthereumAddress);
  console.info(`Proof accepted by server. Tx hash: ${txHash}`);

  console.info('Waiting for tx to settle...');
  await aztecSdk.awaitSettlement(txHash);

  const balanceAfter = asset.balance();
  console.info('Balance after withdraw:', asset.fromBaseUnits(balanceAfter));
}
```

## See Also

- **[Get Balance](/#/ERC20%20Tokens/getBalance)**
- **[Deposit](/#/ERC20%20Tokens/deposit)**
- **[Transfer](/#/ERC20%20Tokens/transfer)**
- **[Emergency Withdraw](/#/ERC20%20Tokens/emergencyWithdraw)**
