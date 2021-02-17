This method deposits assets from layer 1.

@spec sdk.ts deposit

```js
import { AssetId, EthAddress, Web3Signer, TxType } from '@aztec/sdk';

async function demoDeposit(aztecSdk, userId, signer) {
  const assetId = AssetId.DAI;

  const balanceBefore = aztecSdk.getBalance(assetId, userId);
  console.info('Balance before deposit:', aztecSdk.fromBaseUnits(assetId, balanceBefore));

  const senderEthAddress = EthAddress.fromString(window.ethereum.selectedAddress);
  const ethSigner = new Web3Signer(window.ethereum, senderEthAddress);

  const value = aztecSdk.toBaseUnits(assetId, '10');
  const fee = await aztecSdk.getFee(assetId, TxType.DEPOSIT);

  const totalDeposit = value + fee;
  const allowance = await aztecSdk.getPublicAllowance(assetId, senderEthAddress);
  if (allowance < totalDeposit) {
    console.info('Approve rollup contract to spend your token...');
    await aztecSdk.approve(assetId, userId, totalDeposit, senderEthAddress);
    console.info('Approved!');
  }

  console.info('Creating deposit proof...');
  const userData = await aztecSdk.getUserData(userId);
  const txHash = await aztecSdk.deposit(assetId, userId, value, fee, signer, ethSigner);
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
import { AssetId, EthAddress, Web3Signer } from '@aztec/sdk';

async function demoDeposit(aztecSdk, userId, signer) {
  const user = aztecSdk.getUser(userId);
  const asset = user.getAsset(AssetId.DAI);

  const balanceBefore = asset.balance();
  console.info('Balance before deposit:', asset.fromBaseUnits(balanceBefore));

  const senderEthAddress = EthAddress.fromString(window.ethereum.selectedAddress);
  const ethSigner = new Web3Signer(window.ethereum, senderEthAddress);

  const value = asset.toBaseUnits('10');
  const fee = await asset.getFee();
  const totalDeposit = value + fee;

  const allowance = await asset.publicAllowance(senderEthAddress);
  if (allowance < totalDeposit) {
    console.info('Approve rollup contract to spend your token...');
    await asset.approve(totalDeposit, senderEthAddress);
    console.info('Approved!');
  }

  console.info('Creating deposit proof...');
  const txHash = await asset.deposit(value, fee, signer, ethSigner);
  console.info(`Proof accepted by server. Tx hash: ${txHash}`);

  console.info('Waiting for tx to settle...');
  await aztecSdk.awaitSettlement(txHash);

  const balanceAfter = asset.balance();
  console.info('Balance after deposit:', asset.fromBaseUnits(balanceAfter));
}
```

## See Also

- **[Get Balance](/#/ERC20%20Tokens/getBalance)**
- **[Withdraw](/#/ERC20%20Tokens/withdraw)**
- **[Transfer](/#/ERC20%20Tokens/transfer)**
- **[Emergency Withdraw](/#/ERC20%20Tokens/emergencyWithdraw)**
