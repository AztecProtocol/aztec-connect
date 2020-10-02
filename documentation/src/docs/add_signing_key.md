This method allows a user to add a signing key to their account. This is usefull for multiple devices, or for device recovery. Today all signing keys are on the `Grumpkin` Elliptic curve. In the next 3 months we will support `SCEPK256K1` signatures and `Curve25519` signatures.

@spec sdk.ts addSigningKey

## Examples

### Add signing key to account

```js
import { GrumpkinAddress } from '@aztec/sdk';
import { randomBytes } from 'crypto';

async function demoAddSigningKey(aztecSdk) {
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

  // add new signing key
  const newSigningKey = GrumpkinAddress.randomAddress();
  console.info('Creating proof...');
  const addKeyTxHash = await aztecSdk.addSigningKey(user.id, newSigningKey, signer);
  console.info('Proof accepted by server. Tx hash:', addKeyTxHash.toString('hex'));

  console.info('Waiting for tx to settle...');
  await aztecSdk.awaitSettlement(user.id, addKeyTxHash);
  console.info('New signing key added!');

  // remove this demo user from your account
  await aztecSdk.removeUser(user.id);
}
```

## See Also

- **[Create account](/#/User/createAccount)**
- **[Remove a signing key](/#/User/removeSigningKey)**
