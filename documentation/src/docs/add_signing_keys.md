This method allows a user to add signing keys to their account. This is usefull for multiple devices, or for device recovery. Today all signing keys are on the `Grumpkin` Elliptic curve. In the next 3 months we will support `SCEPK256K1` signatures and `Curve25519` signatures.

@spec sdk.ts addSigningKeys

## Examples

```js
import { GrumpkinAddress } from '@aztec/sdk';
import { randomBytes } from 'crypto';

async function demoAddSigningKey(aztecSdk) {
  // create a new user
  const privacyKey = randomBytes(32);
  const user0 = await aztecSdk.addUser(privacyKey);
  const alias = randomBytes(5).toString();

  // create a new account
  const signer1 = aztecSdk.createSchnorrSigner(randomBytes(32));
  const signer2 = aztecSdk.createSchnorrSigner(randomBytes(32));
  console.info('Creating proof...');
  const txHash = await user0.createAccount(
    alias,
    signer1.getPublicKey(),
    signer2.getPublicKey(),
  );
  console.info(`Proof accepted by server. Tx hash: ${txHash}`);

  console.info('Waiting for tx to settle...');
  await aztecSdk.awaitSettlement(txHash);
  console.info('Account created!');

  // add the newly created account with nonce = 1
  const user1 = await aztecSdk.addUser(privacyKey, 1);
  await user1.awaitSynchronised();

  // add new signing keys
  const newSigningKey1 = GrumpkinAddress.randomAddress();
  const newSigningKey2 = GrumpkinAddress.randomAddress();
  console.info('Creating proof...');
  const addKeysTxHash = await user1.addSigningKeys(signer1, newSigningKey1, newSigningKey2);
  console.info(`Proof accepted by server. Tx hash: ${addKeysTxHash}`);

  console.info('Waiting for tx to settle...');
  await aztecSdk.awaitSettlement(addKeysTxHash);
  console.info('New signing key added!');

  // remove these demo users from your device
  await aztecSdk.removeUser(user0.id);
  await aztecSdk.removeUser(user1.id);
}
```

## See Also

- **[Create account](/#/User/createAccount)**
- **[Migrate account](/#/User/migrateAccount)**
- **[Recover account](/#/User/recoverAccount)**
