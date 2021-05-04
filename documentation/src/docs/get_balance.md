@spec sdk.ts getBalance

```js
import { AssetId } from '@aztec/sdk';

async function demoGetBalance(aztecSdk, userId) {
  const assetId = AssetId.DAI;
  const balance = aztecSdk.getBalance(assetId, userId);
  console.info(`Balance: ${balance}`);
  console.info('Balance in base unit:', aztecSdk.fromBaseUnits(assetId, balance));
}
```

## Usage with UserAsset

Using a [UserAsset](/#/Types/WalletSdkUserAsset) object to get the balance of a specific user and asset combination.

```js
import { AssetId } from '@aztec/sdk';

async function demoGetBalance(aztecSdk, userId) {
  const user = aztecSdk.getUser(userId);
  const asset = user.getAsset(AssetId.DAI);
  const balance = asset.balance();
  console.info(`Balance: ${balance}`);
  console.info('Balance in base unit:', asset.fromBaseUnits(balance));
}
```

## See Also

- **[Units](/#/zkAssets/units)**
