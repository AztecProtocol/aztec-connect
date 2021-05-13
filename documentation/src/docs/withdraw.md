This method withdraws assets back to layer 1, the layer one transaction is anonymous.

@spec sdk.ts createWithdrawProof

```js
import { AssetId, EthAddress, TxType } from '@aztec/sdk';

async function demoWithdraw(aztecSdk, userId, signer) {
  const assetId = AssetId.DAI;
  const value = aztecSdk.toBaseUnits(assetId, '1.2');
  const fee = await aztecSdk.getFee(assetId, TxType.WITHDRAW_TO_WALLET);

  const balanceBefore = aztecSdk.getBalance(assetId, userId);
  console.info('Balance before withdraw:', aztecSdk.fromBaseUnits(assetId, balanceBefore));

  const recipientEthereumAddress = EthAddress.fromString(window.ethereum.selectedAddress);

  console.info('Creating withdraw proof...');
  const proof = await aztecSdk.createWithdrawProof(assetId, userId, value, fee, signer, recipientEthereumAddress);
  const txHash = await aztecSdk.sendProof(proof);
  console.info(`Proof accepted by server. Tx hash: ${txHash}`);

  console.info('Waiting for tx to settle...');
  await aztecSdk.awaitSettlement(txHash);

  const balanceAfter = aztecSdk.getBalance(assetId, userId);
  console.info('Balance after withdraw:', aztecSdk.fromBaseUnits(assetId, balanceAfter));
}
```

## Usage with UserAsset

Each [UserAsset](/#/Types/WalletSdkUserAsset) is bound to a user id and an asset id so that we don't have to pass these values around when we call the methods on it.

```js
import { AssetId, EthAddress, TxType } from '@aztec/sdk';

async function demoWithdraw(aztecSdk, userId, signer) {
  const user = aztecSdk.getUser(userId);
  const asset = user.getAsset(AssetId.DAI);

  const balanceBefore = asset.balance();
  console.info('Balance before withdraw:', asset.fromBaseUnits(balanceBefore));

  const value = asset.toBaseUnits('1.2');
  const fee = await asset.getFee(TxType.WITHDRAW_TO_WALLET);

  const recipientEthereumAddress = EthAddress.fromString(window.ethereum.selectedAddress);

  console.info('Creating withdraw proof...');
  const proof = await asset.createWithdrawProof(value, fee, signer, recipientEthereumAddress);
  const txHash = await aztecSdk.sendProof(proof);
  console.info(`Proof accepted by server. Tx hash: ${txHash}`);

  console.info('Waiting for tx to settle...');
  await aztecSdk.awaitSettlement(txHash);

  const balanceAfter = asset.balance();
  console.info('Balance after withdraw:', asset.fromBaseUnits(balanceAfter));
}
```

## See Also

- **[Get Balance](/#/zkAssets/getBalance)**
- **[Deposit](/#/zkAssets/createDepositProof)**
- **[Transfer](/#/zkAssets/createTransferProof)**
- **[Join Split](/#/zkAssets/createJoinSplitProof)**
- **[Emergency Withdraw](/#/zkAssets/emergencyWithdraw)**
