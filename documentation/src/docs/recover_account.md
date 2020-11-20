This method allows a user to recover their account to the trusted third party they selected during account creation. It is the responsibility of the third party to construct a new proof that returns the account control to a public key the user controls.

@spec sdk.ts recoverAccount

## Examples

### Recover account to a trusted third party.

```js
import { GrumpkinAddress } from '@aztec/sdk';
import { randomBytes } from 'crypto';

async function demoRecoveryData(aztecSdk) {
  // create a new user
  const privacyKey = randomBytes(32);
  const user = await aztecSdk.addUser(privacyKey);
  const accountPublicKey = user.getUserData().publicKey;

  // choose an alias name
  const alias = randomBytes(5).toString();

  // create recovery data
  const trustedThirdParties = [GrumpkinAddress.randomAddress()];
  const [recoveryPayload] = await aztecSdk.generateAccountRecoveryData(
    alias,
    accountPublicKey,
    trustedThirdParties,
  );

  // create a new account
  const signingPublicKey = GrumpkinAddress.randomAddress();
  console.info('Creating proof...');
  const txHash = await aztecSdk.createAccount(
    alias,
    accountPublicKey,
    signingPublicKey,
    recoveryPayload.recoveryPublicKey,
  );
  console.info(`Proof accepted by server. Tx hash: ${txHash}`);

  console.info('Waiting for tx to settle...');
  await aztecSdk.awaitSettlement(txHash);
  console.info('Account created!');

  // add the newly created user with nonce = 1
  const user1 = await aztecSdk.addUser(privacyKey, 1);
  await user1.awaitSynchronised();

  // recover the account
  console.info('Creating proof...');
  const recoverTxHash = await aztecSdk.recoverAccount(alias, recoveryPayload);
  console.info(`Proof accepted by server. Tx hash: ${recoverTxHash}`);

  console.info('Waiting for tx to settle...');
  await aztecSdk.awaitSettlement(recoverTxHash);
  console.info('Account recovered!');

  // remove these demo users from your device
  await aztecSdk.removeUser(accountPublicKey, 0);
  await aztecSdk.removeUser(accountPublicKey, 1);
}
```

## See Also

- **[Generate account recovery data](/#/User/generateAccountRecoveryData)**
- **[Create account](/#/User/createAccount)**
- **[Add new signing keys](/#/User/addSigningKeys)**
- **[Migrate account](/#/User/migrateAccount)**
