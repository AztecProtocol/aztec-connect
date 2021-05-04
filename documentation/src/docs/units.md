## fromBaseUnits

This api converts the value to a decimal string representation with the given precision. The digits outside the precision are simply discarded (i.e. the result is floored). This ensures we never report more funds than actually exists.

@spec sdk.ts fromBaseUnits

```js
import { AssetId } from '@aztec/sdk';

async function demoFormatValue(aztecSdk) {
  const assetId = AssetId.DAI;
  const balance = BigInt('12345600000000000000');
  console.info('Balance in erc20 unit:', aztecSdk.fromBaseUnits(assetId, balance));
  console.info('Balance in erc20 unit with precision:', aztecSdk.fromBaseUnits(assetId, balance, 6));
}
```

## toBaseUnits

This api converts the value from a decimal string to bigint value.

@spec sdk.ts toBaseUnits

```js
import { AssetId } from '@aztec/sdk';

async function demoFormatValue(aztecSdk) {
  const assetId = AssetId.DAI;
  const balance = '12.3456';
  const tokenValue = aztecSdk.toBaseUnits(assetId, balance);
  console.info(`Token value: ${tokenValue}`);
}
```

## See Also

- **[Get Balance](/#/zkAssets/getBalance)**
