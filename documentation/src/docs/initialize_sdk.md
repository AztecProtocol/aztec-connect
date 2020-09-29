```js
import { WalletSdk } from '@aztec/sdk';

const aztecSdk = new WalletSdk(window.ethereum);

await aztecSdk.init('SERVER_URL');

console.info(aztecSdk.getLocalStatus());

await aztecSdk.destroy();

console.info(aztecSdk.getLocalStatus());
```
