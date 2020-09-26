This method allows a user to remove a signing key on their account. This is usefull for managing multiple devices, or for device recovery.

@spec sdk.ts removeSigningKey

## Examples

### Revoke a signing key on the account;

```js
import { GrumpkinAddress } from '@aztec/sdk';
import { randomBytes } from 'crypto';

async function demoRemoveSigningKey(aztecSdk) {
  const privacyKey = randomBytes(32);
  const user = await aztecSdk.addUser(privacyKey);

  // create new account
  const signer = aztecSdk.createSchnorrSigner(randomBytes(32));
  const signingKey = signer.getPublicKey();
  const recoveryPublicKey = GrumpkinAddress.randomAddress();
  const alias = randomBytes(5).toString();

  console.info('Creating proof...');
  const txHash = await aztecSdk.createAccount(user.id, signingKey, recoveryPublicKey, alias);
  console.info('Proof accepted by server. Tx hash:', txHash.toString('hex'));

  console.info('Waiting for tx to settle...');
  await aztecSdk.awaitSettlement(user.id, txHash);
  console.info('Account created!');

  // revoke recoveryPublicKey
  console.info('Creating proof...');
  const revokeTxHash = await aztecSdk.removeSigningKey(user.id, recoveryPublicKey, signer);
  console.info('Proof accepted by server. Tx hash:', revokeTxHash.toString('hex'));

  console.info('Waiting for tx to settle...');
  await aztecSdk.awaitSettlement(user.id, revokeTxHash);
  console.info('Signing key revoked!');

  // remove this demo user from your account
  await aztecSdk.removeUser(user.id);
}
```

## See Also

- **[Create account](/#/User/createAccount)**
- **[Add a new signing key](/#/User/addSigningKey)**
