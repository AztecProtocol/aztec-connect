@spec sdk.ts createAccount

```js
import { GrumpkinAddress } from '@aztec/sdk';
import { randomBytes } from 'crypto';

async function demoCreateAccount(aztecSdk) {
  // define the private key used for encrypting user data
  const privacyKey = randomBytes(32);
  const user = await aztecSdk.addUser(privacyKey);

  // define the public key used for signing proof data
  const signingPublicKey = GrumpkinAddress.randomAddress();

  // define the public key that the account will be recovered to for social recovery
  const recoveryPublicKey = GrumpkinAddress.randomAddress();

  const alias = randomBytes(5).toString();

  console.info('Creating account proof...');
  const txHash = await aztecSdk.createAccount(privacyKey, signingPublicKey, recoveryPublicKey, alias);
  console.info('Proof accepted by server. Tx hash:', txHash.toString('hex'));

  console.info('Waiting for tx to settle...');
  await aztecSdk.awaitSettlement(user.id, txHash);
  console.info('Account created!');

  // remove this demo user from your account
  await aztecSdk.removeUser(user.id);
}
```

## See Also

- **[Initialize the SDK](/#/SDK/Initialize%20the%20SDK)**
- **[Generate account recovery data](/#/SDK/API/generateAccountRecoveryData)**
