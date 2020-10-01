@spec sdk.ts generateAccountRecoveryData

```js
import { GrumpkinAddress, RecoveryPayload } from '@aztec/sdk';

async function demoRecoveryData(aztecSdk, userId) {
  const trustedThirdParties = [GrumpkinAddress.randomAddress(), GrumpkinAddress.randomAddress()];
  const recoveryPayloads = await aztecSdk.generateAccountRecoveryData(userId, trustedThirdParties);
  console.info(recoveryPayloads);

  const [firstData] = recoveryPayloads;
  const secret = firstData.toString();
  console.info('Save this secret somewhere safe:', secret);

  const recoveryData = RecoveryPayload.fromString(secret);
  console.info('Use it to recover your account later:', recoveryData);
}
```

## See Also

- **[Create account](/#/User/createAccount)**
- **[Recover account](/#/User/recoverAccount)**
- **[RecoveryPayload](/#/User/RecoveryPayload)**
