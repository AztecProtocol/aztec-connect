This method allows a user to remove a signing key on their account. This is usefull for managing multiple devices, or for device recovery.

@spec sdk.ts removeSigningKey

## Examples

### Revoke a signing key on the account;

```js
import { GrumpkinAddress } from '@aztec/sdk';
import { randomBytes } from 'crypto';

async function demoAddSigningKey(aztecSdk) {
  // create a new user
  const privacyKey = randomBytes(32);
  const user = await aztecSdk.addUser(privacyKey);

  // create recovery data
  const trustedThirdParties = [GrumpkinAddress.randomAddress()];
  const { recoveryPublicKey, recoveryPayloads } = await aztecSdk.generateAccountRecoveryData(
    privacyKey,
    trustedThirdParties,
  );

  // create a new account
  const userKeys = aztecSdk.newKeyPair();
  const signer = aztecSdk.createSchnorrSigner(userKeys.publicKey, userKeys.privateKey);
  const alias = randomBytes(5).toString();

  console.info('Creating account proof...');
  const txHash = await aztecSdk.createAccount(privacyKey, userKeys.publicKey, recoveryPublicKey, alias);
  console.info('Proof accepted by server. Tx hash:', txHash.toString('hex'));

  console.info('Waiting for tx to settle...');
  await aztecSdk.awaitSettlement(user.id, txHash);
  console.info('Account created!');

  // revoke recoveryPublicKey
  console.info('Creating account proof...');
  const newKeyTxHash = await aztecSdk.removeSigningKey(user.id, recoveryPublicKey, signer);
  console.info('Proof accepted by server. Tx hash:', newKeyTxHash.toString('hex'));

  console.info('Waiting for tx to settle...');
  await aztecSdk.awaitSettlement(user.id, newKeyTxHash);
  console.info('Signing key revoked!');

  // remove this demo user from your account
  await aztecSdk.removeUser(user.id);
}
```

## See Also

- **[Initialize the SDK](/#/SDK/Initialize%20the%20SDK)**
- **[Generate account recovery data](/#/SDK/API/generateAccountRecoveryData)**
- **[Create an account](/#/SDK/API/createAccount)**
- **[Add a new signing key](/#/SDK/API/addSigningKey)**
