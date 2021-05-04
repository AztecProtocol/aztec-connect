Deposit assets from layer 1.

@spec sdk.ts createDepositProof

```js
import { AssetId, EthAddress, TxType } from '@aztec/sdk';

async function demoDeposit(aztecSdk, userId, signer) {
  const assetId = AssetId.DAI;
  const value = aztecSdk.toBaseUnits(assetId, '10');
  const fee = await aztecSdk.getFee(assetId, TxType.DEPOSIT);
  const depositor = EthAddress.fromString(window.ethereum.selectedAddress);

  const balanceBefore = aztecSdk.getBalance(assetId, userId);
  console.info('Balance before deposit:', aztecSdk.fromBaseUnits(assetId, balanceBefore));

  const pendingDeposit = await aztecSdk.getUserPendingDeposit(assetId, depositor);
  const totalDeposit = value + fee - pendingDeposit;
  const allowance = await aztecSdk.getPublicAllowance(assetId, depositor);
  if (allowance < totalDeposit) {
    console.info('Approve rollup contract to spend your token...');
    await aztecSdk.approve(assetId, totalDeposit, depositor);
    console.info('Approved!');
  }
  if (totalDeposit > 0) {
    console.info('Depositing funds to rollup contract...');
    await aztecSdk.depositFundsToContract(assetId, depositor, totalDeposit);
  }

  console.info('Creating deposit proof...');
  const proof = await aztecSdk.createDepositProof(assetId, depositor, userId, value, fee, signer);

  console.info('Signing proof data...');
  const signature = await aztecSdk.signProof(proof, depositor);

  const txHash = await aztecSdk.sendProof(proof, signature);
  console.info(`Proof accepted by server. Tx hash: ${txHash}`);

  console.info('Waiting for tx to settle...');
  await aztecSdk.awaitSettlement(txHash);

  const balanceAfter = aztecSdk.getBalance(assetId, userId);
  console.info('Balance after deposit:', aztecSdk.fromBaseUnits(assetId, balanceAfter));
}
```

## Usage with UserAsset

Each [UserAsset](/#/Types/WalletSdkUserAsset) is bound to a user id and an asset id so that we don't have to pass these values around when we call the methods on it.

```js
import { AssetId, EthAddress, TxType } from '@aztec/sdk';

async function demoDeposit(aztecSdk, userId, signer) {
  const user = aztecSdk.getUser(userId);
  const asset = user.getAsset(AssetId.DAI);
  const value = asset.toBaseUnits('10');
  const fee = await asset.getFee(TxType.DEPOSIT);
  const depositor = EthAddress.fromString(window.ethereum.selectedAddress);

  const balanceBefore = asset.balance();
  console.info('Balance before deposit:', asset.fromBaseUnits(balanceBefore));

  const pendingDeposit = await asset.pendingDeposit(depositor);
  const totalDeposit = value + fee;
  const allowance = await asset.publicAllowance(depositor);
  if (allowance < totalDeposit) {
    console.info('Approve rollup contract to spend your token...');
    await asset.approve(totalDeposit, depositor);
    console.info('Approved!');
  }
  if (totalDeposit > 0) {
    console.info('Depositing funds to rollup contract...');
    await asset.depositFundsToContract(depositor, totalDeposit);
  }

  console.info('Creating deposit proof...');
  const proof = await asset.createDepositProof(value, fee, signer, depositor);

  console.info('Signing proof data...');
  const signature = await aztecSdk.signProof(proof, depositor);

  const txHash = await aztecSdk.sendProof(proof, signature);
  console.info(`Proof accepted by server. Tx hash: ${txHash}`);

  console.info('Waiting for tx to settle...');
  await aztecSdk.awaitSettlement(txHash);

  const balanceAfter = asset.getBalance(userId);
  console.info('Balance after deposit:', asset.fromBaseUnits(balanceAfter));
}
```

## See Also

- **[Get Balance](/#/zkAssets/getBalance)**
- **[Withdraw](/#/zkAssets/createWithdrawProof)**
- **[Transfer](/#/zkAssets/createTransferProof)**
- **[Join Split](/#/zkAssets/createJoinSplitProof)**
- **[Emergency Withdraw](/#/zkAssets/emergencyWithdraw)**
