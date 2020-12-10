This api adds a user to the current device. The sdk will start tracking the user's transactions and decrypting value notes to calculate the balances.

@spec sdk.ts addUser

```js
import { randomBytes } from 'crypto';

async function demoAddUser(aztecSdk) {
  const privateKey = randomBytes(32);
  const user = await aztecSdk.addUser(privateKey);

  const data = user.getUserData();
  // equivalent to aztecSdk.getUserData(user.id);
  console.info(data);

  // remove this demo user from your device
  await aztecSdk.removeUser(user.id);
}
```

## See Also

- **[WalletSdkUser](/#/Types/WalletSdkUser)**
- **[Get User](/#/User/getUser)**
- **[Create account](/#/User/createAccount)**
