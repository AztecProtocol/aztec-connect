This flexible api allows users to do more than a simple deposit, withdraw, or transfer in one transaction.

@spec sdk.ts createJoinSplitProof

## Deposit and Transfer

In the example below, the user deposits 10 DAI and destroys two notes with a total worth of 3 DAI. The amount gets converted to a new note worth 2 DAI for the recipient, and another note worth 5.9 DAI for the sender. It also sends 4 DAI to an eth address. The remaining amount 0.1 (10 + 3 - 2 - 5.9 - 4) is the fee.

Note that the user might receive a new note valued more than 5.9 if there are no two notes that sum to exactly 3.

```js
import { AssetId, EthAddress, GrumpkinAddress, Web3Signer } from '@aztec/sdk';

async function demoJoinSplit(aztecSdk, userId, signer) {
  const user = aztecSdk.getUser(userId);
  const assetId = AssetId.DAI;
  const asset = user.getAsset(assetId);

  const valueToDeposit = asset.toBaseUnits('10');
  const noteValueToDestroy = asset.toBaseUnits('3');
  const valueToSendPublicly = asset.toBaseUnits('4');
  const valueToSendPrivately = asset.toBaseUnits('2');
  const noteValueToKeep = asset.toBaseUnits('5.9');

  const senderEthAddress = EthAddress.fromString(window.ethereum.selectedAddress);
  const ethSigner = new Web3Signer(window.ethereum, senderEthAddress);

  const recipientPublicKey = GrumpkinAddress.fromString('RECIPIENT_PUBLIC_KEY');
  const recipientId = await aztecSdk.getAccountId(recipientPublicKey);

  const recipientEthAddress = EthAddress.fromString('RECIPIENT_ETH_ADDRESS');

  const allowance = await asset.publicAllowance(senderEthAddress);
  if (allowance < valueToDeposit) {
    console.info('Approve rollup contract to spend your token...');
    await asset.approve(valueToDeposit, senderEthAddress);
    console.info('Approved!');
  }

  const initialBalance = asset.balance(userId);
  console.info('Balance:', asset.fromBaseUnits(initialBalance));

  console.info('Creating join split proof...');
  const proof = await aztecSdk.createJoinSplitProof(
    assetId,
    userId,
    valueToDeposit,
    valueToSendPublicly,
    noteValueToDestroy,
    valueToSendPrivately,
    noteValueToKeep,
    signer,
    recipientId,
    senderEthAddress,
    recipientEthAddress,
  );

  console.info('Signing proof data...');
  const signature = await aztecSdk.signProof(proof, senderEthAddress);

  const txHash = await aztecSdk.sendProof(proof, signature);
  console.info(`Proof accepted by server. Tx hash: ${txHash}`);

  console.info('Waiting for tx to settle...');
  await aztecSdk.awaitSettlement(txHash);

  // Balance should be 2.9 (5.9 - 3) more than the initial balance.
  const balance = asset.balance(userId);
  console.info('Balance:', asset.fromBaseUnits(balance));
}
```

## See Also

- **[Deposit](/#/zkAssets/createDepositProof)**
- **[Withdraw](/#/zkAssets/createWithdrawProof)**
- **[Transfer](/#/zkAssets/createTransferProof)**
- **[Emergency Withdraw](/#/zkAssets/emergencyWithdraw)**
- **[WalletSDK Interface](/#/Types/WalletSdk)**
