@spec sdk.ts generateAccountRecoveryData

```js
import { GrumpkinAddress, RecoveryPayload } from '@aztec/sdk';

async function demoRecoveryData(aztecSdk) {
  const alias = 'User 0';
  const accountPublicKey = GrumpkinAddress.randomAddress();

  const trustedThirdParties = [GrumpkinAddress.randomAddress(), GrumpkinAddress.randomAddress()];
  const recoveryPayloads = await aztecSdk.generateAccountRecoveryData(
    alias,
    accountPublicKey,
    trustedThirdParties,
  );
  console.info(recoveryPayloads);

  const secret = recoveryPayloads[0].toString();
  console.info('Save this secret somewhere safe:', secret);

  const recoveryData = RecoveryPayload.fromString(secret);
  console.info('Use it to recover your account later:', recoveryData);
}
```

## See Also

- **[Create account](/#/User/createAccount)**
- **[Recover account](/#/User/recoverAccount)**
- **[RecoveryPayload](/#/User/RecoveryPayload)**
