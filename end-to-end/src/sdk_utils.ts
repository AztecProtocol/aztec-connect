import {
  AccountId,
  AztecSdk,
  BridgeId,
  DefiSettlementTime,
  EthAddress,
  TxSettlementTime,
  WalletProvider,
} from '@aztec/sdk';

export async function depositTokensToAztec(
  usersEthereumAddress: EthAddress,
  user: AccountId,
  token: EthAddress,
  tokenQuantity: bigint,
  settlementTime: TxSettlementTime,
  sdk: AztecSdk,
  provider: WalletProvider,
) {
  const tokenAssetId = sdk.getAssetIdByAddress(token);
  const signer = await sdk.createSchnorrSigner(provider.getPrivateKeyForAddress(usersEthereumAddress)!);
  const tokenDepositFee = (await sdk.getDepositFees(tokenAssetId))[settlementTime];
  const tokenAssetValue = { assetId: tokenAssetId, value: tokenQuantity };
  const tokenDepositController = sdk.createDepositController(
    user,
    signer,
    tokenAssetValue,
    tokenDepositFee,
    usersEthereumAddress,
  );
  await tokenDepositController.createProof();
  await tokenDepositController.sign();
  await tokenDepositController.approve();
  const txHash = await tokenDepositController.depositFundsToContract();
  await sdk.getTransactionReceipt(txHash);
  await tokenDepositController.send();
  return tokenDepositController;
}

export async function sendTokens(
  sender: AccountId,
  recipient: AccountId,
  token: EthAddress,
  tokenQuantity: bigint,
  settlementTime: TxSettlementTime,
  sdk: AztecSdk,
) {
  const tokenAssetId = sdk.getAssetIdByAddress(token);
  const senderSigner = await sdk.createSchnorrSigner((await sdk.getUserData(sender)).privateKey);
  const tokenTransferFee = (await sdk.getTransferFees(tokenAssetId))[settlementTime];
  const tokenAssetValue = { assetId: tokenAssetId, value: tokenQuantity };
  const tokenTransferController = sdk.createTransferController(
    sender,
    senderSigner,
    tokenAssetValue,
    tokenTransferFee,
    recipient,
  );
  await tokenTransferController.createProof();
  await tokenTransferController.send();
  return tokenTransferController;
}

export async function withdrawTokens(
  user: AccountId,
  recipientEthereumAddress: EthAddress,
  token: EthAddress,
  tokenQuantity: bigint,
  settlementTime: TxSettlementTime,
  sdk: AztecSdk,
) {
  const tokenAssetId = sdk.getAssetIdByAddress(token);
  const withdrawSigner = await sdk.createSchnorrSigner((await sdk.getUserData(user)).privateKey);
  const tokenWithdrawFee = (await sdk.getWithdrawFees(tokenAssetId))[settlementTime];
  const tokenAssetValue = { assetId: tokenAssetId, value: tokenQuantity };
  const tokenWithdrawController = sdk.createWithdrawController(
    user,
    withdrawSigner,
    tokenAssetValue,
    tokenWithdrawFee,
    recipientEthereumAddress,
  );
  await tokenWithdrawController.createProof();
  await tokenWithdrawController.send();
  return tokenWithdrawController;
}

export async function defiDepositTokens(
  user: AccountId,
  token: EthAddress,
  tokenQuantity: bigint,
  settlementTime: DefiSettlementTime,
  bridgeId: BridgeId,
  sdk: AztecSdk,
) {
  const tokenAssetId = sdk.getAssetIdByAddress(token);
  const defiSigner = await sdk.createSchnorrSigner((await sdk.getUserData(user)).privateKey);
  const tokenDepositFee = (await sdk.getDefiFees(bridgeId, false, user, tokenQuantity))[settlementTime];
  const tokenAssetValue = { assetId: tokenAssetId, value: tokenQuantity };
  const defiDepositController = sdk.createDefiController(user, defiSigner, bridgeId, tokenAssetValue, tokenDepositFee);
  await defiDepositController.createProof();
  await defiDepositController.send();
  return defiDepositController;
}
