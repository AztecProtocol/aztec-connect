This method deposits assets from layer 1.

@spec sdk.ts deposit

```js
import { AssetId, EthAddress, Web3Signer } from '@aztec/sdk';

async function demoDeposit(aztecSdk, accountPublicKey, signer) {
  const assetId = AssetId.DAI;

  const balanceBefore = aztecSdk.getBalance(assetId, accountPublicKey);
  console.info('Balance before deposit:', aztecSdk.fromErc20Units(assetId, balanceBefore));

  const senderEthAddress = EthAddress.fromString(window.ethereum.selectedAddress);
  const ethSigner = new Web3Signer(window.ethereum, senderEthAddress);

  const value = aztecSdk.toErc20Units(assetId, '10');

  const allowance = await aztecSdk.getPublicAllowance(assetId, senderEthAddress);
  if (allowance < value) {
    console.info('Approve rollup contract to spend your token...');
    await aztecSdk.approve(assetId, accountPublicKey, value, senderEthAddress);
    console.info('Approved!');
  }

  console.info('Creating deposit proof...');
  const userData = await aztecSdk.getUserData(accountPublicKey);
  const txHash = await aztecSdk.deposit(assetId, accountPublicKey, value, signer, ethSigner);
  console.info(`Proof accepted by server. Tx hash: ${txHash}`);

  console.info('Waiting for tx to settle...');
  await aztecSdk.awaitSettlement(txHash);

  const balanceAfter = aztecSdk.getBalance(assetId, accountPublicKey);
  console.info('Balance after deposit:', aztecSdk.fromErc20Units(assetId, balanceAfter));
}
```

## Usage with UserAsset

Each [UserAsset](/#/Types/WalletSdkUserAsset) is bound to a user id and an asset id so that we don't have to pass these values around when we call the methods on it.

```js
import { AssetId, EthAddress, Web3Signer } from '@aztec/sdk';

async function demoDeposit(aztecSdk, accountPublicKey, signer) {
  const user = aztecSdk.getUser(accountPublicKey);
  const asset = user.getAsset(AssetId.DAI);

  const balanceBefore = asset.balance();
  console.info('Balance before deposit:', asset.fromErc20Units(balanceBefore));

  const senderEthAddress = EthAddress.fromString(window.ethereum.selectedAddress);
  const ethSigner = new Web3Signer(window.ethereum, senderEthAddress);

  const value = asset.toErc20Units('10');

  const allowance = await asset.publicAllowance(senderEthAddress);
  if (allowance < value) {
    console.info('Approve rollup contract to spend your token...');
    await asset.approve(value, senderEthAddress);
    console.info('Approved!');
  }

  console.info('Creating deposit proof...');
  const txHash = await asset.deposit(value, signer, ethSigner);
  console.info(`Proof accepted by server. Tx hash: ${txHash}`);

  console.info('Waiting for tx to settle...');
  await aztecSdk.awaitSettlement(txHash);

  const balanceAfter = asset.balance();
  console.info('Balance after deposit:', asset.fromErc20Units(balanceAfter));
}
```

## See Also

- **[Withdraw](/#/ERC20%20Tokens/withdraw)**
- **[Transfer](/#/ERC20%20Tokens/transfer)**
- **[Public Transfer](/#/ERC20%20Tokens/publicTransfer)**
