@spec sdk.ts createAccount

```js
import { GrumpkinAddress } from '@aztec/sdk';
import { randomBytes } from 'crypto';

async function demoCreateAccount(aztecSdk) {
  // define the privacy key used for decrypting data
  const privacyKey = randomBytes(32);
  const user = await aztecSdk.addUser(privacyKey);

  // define the public key used for signing proof data
  const signingPublicKey = GrumpkinAddress.randomAddress();

  // define the public key that the account will be recovered to for social recovery
  const recoveryPayloads = await aztecSdk.generateAccountRecoveryData(user.id, [GrumpkinAddress.randomAddress()]);
  const { recoveryPublicKey } = recoveryPayloads[0];

  const alias = randomBytes(5).toString();

  console.info('Creating proof...');
  const txHash = await aztecSdk.createAccount(user.id, signingPublicKey, recoveryPublicKey, alias);
  console.info('Proof accepted by server. Tx hash:', txHash.toString('hex'));

  console.info('Waiting for tx to settle...');
  await aztecSdk.awaitSettlement(user.id, txHash);
  console.info('Account created!');

  // remove this demo user from your account
  await aztecSdk.removeUser(user.id);
}
```

## See Also

- **[Generate account recovery data](/#/User/generateAccountRecoveryData)**
- **[Recover account](/#/User/recoverAccount)**
- **[Add a new signing key](/#/User/addSigningKey)**
