This method sends funds privately on layer 2, the transfer is private and confidential.

@spec sdk.ts transfer

```js
import { AssetId, GrumpkinAddress } from '@aztec/sdk';

async function demoTransfer(aztecSdk, userId, signer) {
  const assetId = AssetId.DAI;

  const balanceBefore = aztecSdk.getBalance(assetId, userId);
  console.info('Balance before transfer:', aztecSdk.fromBaseUnits(assetId, balanceBefore));

  const value = aztecSdk.toBaseUnits(assetId, '2');
  const fee = await aztecSdk.getFee(assetId);

  const recipientPublicKey = GrumpkinAddress.fromString('RECIPIENT_PUBLIC_KEY');
  const recipientId = await aztecSdk.getAccountId(recipientPublicKey);

  console.info('Creating transfer proof...');
  const txHash = await aztecSdk.transfer(assetId, userId, value, fee, signer, recipientId);
  console.info(`Proof accepted by server. Tx hash: ${txHash}`);

  console.info('Waiting for tx to settle...');
  await aztecSdk.awaitSettlement(txHash);

  const balanceAfter = aztecSdk.getBalance(assetId, userId);
  console.info('Balance after transfer:', aztecSdk.fromBaseUnits(assetId, balanceAfter));
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
  console.info('Balance before transfer:', asset.fromBaseUnits(balanceBefore));

  const value = asset.toBaseUnits('2');
  const fee = await asset.getFee();

  const recipientAlias = 'RECIPIENT_ALIAS';

  if (await aztecSdk.isAliasAvailable(recipientAlias)) {
    console.error('Unknown user.');
    return;
  }

  console.info('Creating transfer proof...');
  const recipientId = await aztecSdk.getAccountId(recipientAlias);
  const txHash = await asset.transfer(value, fee, signer, recipientId);
  console.info(`Proof accepted by server. Tx hash: ${txHash}`);

  console.info('Waiting for tx to settle...');
  await aztecSdk.awaitSettlement(txHash);

  const balanceAfter = asset.balance();
  console.info('Balance after transfer:', asset.fromBaseUnits(balanceAfter));
}
```

## See Also

- **[Get Balance](/#/ERC20%20Tokens/getBalance)**
- **[Deposit](/#/ERC20%20Tokens/deposit)**
- **[Withdraw](/#/ERC20%20Tokens/withdraw)**
- **[Emergency Withdraw](/#/ERC20%20Tokens/emergencyWithdraw)**
