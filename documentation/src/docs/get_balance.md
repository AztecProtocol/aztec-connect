@spec sdk.ts getBalance

```js
import { AssetId } from '@aztec/sdk';

async function demoGetBalance(aztecSdk, accountPublicKey) {
  const assetId = AssetId.DAI;
  const balance = aztecSdk.getBalance(assetId, accountPublicKey);
  console.info(`Balance: ${balance}`);
  console.info('Balance in erc20 unit:', aztecSdk.fromErc20Units(assetId, balance));
}
```

## Usage with UserAsset

Using a [UserAsset](/#/Types/WalletSdkUserAsset) object to get the balance of a specific user and asset combination.

```js
import { AssetId } from '@aztec/sdk';

async function demoGetBalance(aztecSdk, accountPublicKey) {
  const user = aztecSdk.getUser(accountPublicKey);
  const asset = user.getAsset(AssetId.DAI);
  const balance = asset.balance();
  console.info(`Balance: ${balance}`);
  console.info('Balance in erc20 unit:', asset.fromErc20Units(balance));
}
```

## See Also

- **[Units](/#/ERC20%20Tokens/units)**
