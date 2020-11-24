This method allows a user to migrate their account to the next nonce. The proof nullifies the current `account_id` (_accountPublicKey_ and _nonce_ pair), stopping a lost key from migrating the account. This is useful when one or more signing public keys in the current account are compromised.

Note that it's the user's responsibility to transfer the funds to the new account immediately after the migration to prevent malicious users from spending funds using the compromised keys.

@spec sdk.ts migrateAccount

```js
import { GrumpkinAddress } from '@aztec/sdk';
import { randomBytes } from 'crypto';

async function demoRecoveryData(aztecSdk) {
  // create a new user
  const privacyKey = randomBytes(32);
  const user = await aztecSdk.addUser(privacyKey);
  const accountPublicKey = user.getUserData().publicKey;
  const alias = randomBytes(5).toString();

  // create a new account
  const signer1 = aztecSdk.createSchnorrSigner(randomBytes(32));
  const signer2 = aztecSdk.createSchnorrSigner(randomBytes(32));
  console.info('Creating proof...');
  const txHash = await aztecSdk.createAccount(
    alias,
    accountPublicKey,
    signer1.getPublicKey(),
    signer2.getPublicKey(),
  );
  console.info('Proof accepted by server. Tx hash:', txHash.toString('hex'));

  console.info('Waiting for tx to settle...');
  await aztecSdk.awaitSettlement(txHash);
  console.info('Account created!');

  // add the newly created account with nonce = 1
  const user1 = await aztecSdk.addUser(privacyKey, 1);
  await user1.awaitSynchronised();

  // signer1 is compromised, migrate the account
  console.info('Creating proof...');
  const migrateTxHash = await aztecSdk.migrateAccount(
    alias,
    signer2,
    signer2.getPublicKey(),
  );
  console.info('Proof accepted by server. Tx hash:', migrateTxHash.toString('hex'));

  console.info('Waiting for tx to settle...');
  await aztecSdk.awaitSettlement(migrateTxHash);
  console.info('Account recovered!');

  // remove these demo users from your device
  await aztecSdk.removeUser(accountPublicKey, 0);
  await aztecSdk.removeUser(accountPublicKey, 1);
}
```

## See Also

- **[Create account](/#/User/createAccount)**
- **[Add new signing keys](/#/User/addSigningKeys)**
- **[Recover account](/#/User/recoverAccount)**
  