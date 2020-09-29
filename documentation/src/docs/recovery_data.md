@spec sdk.ts generateAccountRecoveryData

```js
import { GrumpkinAddress } from '@aztec/sdk';
import { randomBytes } from 'crypto';

async function demoRecoveryData(aztecSdk) {
  const privacyKey = randomBytes(32);
  const trustedThirdParties = [GrumpkinAddress.randomAddress(), GrumpkinAddress.randomAddress()];
  const data = await aztecSdk.generateAccountRecoveryData(privacyKey, trustedThirdParties);
  console.info(data);
}
```
