This method sends funds privately on layer 2, the transfer is private and confidential.

@spec sdk.ts transfer

```js
import { AssetId, GrumpkinAddress } from '@aztec/sdk';

async function demoTransfer(aztecSdk, userId, signer) {
  const assetId = AssetId.DAI;

  const balanceBefore = aztecSdk.getBalance(assetId, userId);
  console.info('Balance before transfer:', aztecSdk.fromErc20Units(assetId, balanceBefore));

  const value = aztecSdk.toErc20Units(assetId, '2');

  const recipientPublicKey = GrumpkinAddress.fromString('RECIPIENT_PUBLIC_KEY');
  const recipientId = await aztecSdk.getAccountId(recipientPublicKey);

  console.info('Creating transfer proof...');
  const userData = await aztecSdk.getUserData(userId);
  const txHash = await aztecSdk.transfer(assetId, userId, value, signer, recipientId);
  console.info(`Proof accepted by server. Tx hash: ${txHash}`);

  console.info('Waiting for tx to settle...');
  await aztecSdk.awaitSettlement(txHash);

  const balanceAfter = aztecSdk.getBalance(assetId, userId);
  console.info('Balance after transfer:', aztecSdk.fromErc20Units(assetId, balanceAfter));
}
```

## Usage with UserAsset

Each [UserAsset](/#/Types/WalletSdkUserAsset) is bound to a user id and an asset id so that we don't have to pass these values around when we call the methods on it.

```js
import { AssetId, GrumpkinAddress } from '@aztec/sdk';

async function demoTransfer(aztecSdk, userId, signer) {
  const user = aztecSdk.getUser(userId);
  const asset = user.getAsset(AssetId.DAI);

  const balanceBefore = asset.balance();
  console.info('Balance before transfer:', asset.fromErc20Units(balanceBefore));

  const value = asset.toErc20Units('2');

  const recipientAlias = 'RECIPIENT_ALIAS';

  if (await aztecSdk.isAliasAvailable(recipientAlias)) {
    console.error('Unknown user.');
    return;
  }

  console.info('Creating transfer proof...');
  const recipientId = await aztecSdk.getAccountId(recipientAlias);
  const txHash = await asset.transfer(value, signer, recipientId);
  console.info(`Proof accepted by server. Tx hash: ${txHash}`);

  console.info('Waiting for tx to settle...');
  await aztecSdk.awaitSettlement(txHash);

  const balanceAfter = asset.balance();
  console.info('Balance after transfer:', asset.fromErc20Units(balanceAfter));
}
```

## See Also

- **[Get Balance](/#/ERC20%20Tokens/getBalance)**
- **[Deposit](/#/ERC20%20Tokens/deposit)**
- **[Withdraw](/#/ERC20%20Tokens/withdraw)**
- **[Emergency Withdraw](/#/ERC20%20Tokens/emergencyWithdraw)**
