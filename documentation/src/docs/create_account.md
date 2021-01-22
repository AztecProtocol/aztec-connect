@spec sdk.ts createAccount

```js
import { AccountId, GrumpkinAddress } from '@aztec/sdk';
import { randomBytes } from 'crypto';

async function demoCreateAccount(aztecSdk) {
  const alias = randomBytes(5).toString();

  // define the privacy key used for decrypting data
  const privacyKey = randomBytes(32);
  const user = await aztecSdk.addUser(privacyKey);
  const accountPublicKey = user.getUserData().publicKey;

  // define the public key used for signing proof data
  const signingPublicKey = GrumpkinAddress.randomAddress();

  // define the public key that the account will be recovered to for social recovery
  const recoveryPublicKey = GrumpkinAddress.randomAddress();

  console.info('Creating proof...');
  const txHash = await user.createAccount(
    alias,
    signingPublicKey,
    recoveryPublicKey,
  );
  console.info(`Proof accepted by server. Tx hash: ${txHash}`);

  console.info('Waiting for tx to settle...');
  await aztecSdk.awaitSettlement(txHash);
  console.info('Account created!');

  // get the newly created user with nonce = 1
  const newUserId = new AccountId(accountPublicKey, 1);
  const newUser = await aztecSdk.getUser(newUserId);
  console.info(newUser.getUserData());

  // remove demo users from your device
  await aztecSdk.removeUser(user.id);
  await aztecSdk.removeUser(newUser.id);
}
```

## See Also

- **[Generate account recovery data](/#/User/generateAccountRecoveryData)**
- **[Recover account](/#/User/recoverAccount)**
- **[Add new signing keys](/#/User/addSigningKeys)**
- **[Migrate account](/#/User/migrateAccount)**
