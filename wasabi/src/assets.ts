import { EthAddress, EthereumProvider, AssetValue, AztecSdk } from '@aztec/sdk';
import { purchaseTokens } from '@aztec/blockchain';

export const purchaseAssets = async (
  sdk: AztecSdk,
  address: EthAddress,
  ethereumProvider: EthereumProvider,
  assetValues: AssetValue[],
  amountInMaximum: bigint,
) => {
  const usableBalances: AssetValue[] = [];
  const originalBalances: AssetValue[] = [];
  for (const assetValue of assetValues) {
    if (assetValue.value == 0n) {
      continue;
    }
    const assetInfo = sdk.getAssetInfo(assetValue.assetId);
    console.log(
      `purchasing ${assetValue.value} ${
        assetInfo.name
      } for address ${address.toString()}, max spend ${amountInMaximum}`,
    );
    const currentBalance = await sdk.getPublicBalance(address, assetValue.assetId);
    originalBalances.push(currentBalance);
    const amountRequiredToPurchase = assetValue.value - currentBalance.value;
    if (amountRequiredToPurchase <= 0n) {
      usableBalances.push({ assetId: assetValue.assetId, value: assetValue.value });
      continue;
    }
    const amountPurchased = await purchaseTokens(
      assetInfo.address,
      amountRequiredToPurchase,
      amountInMaximum,
      ethereumProvider,
      address,
      address,
    );
    if (!amountPurchased) {
      console.log(`failed to purchase ${assetInfo.name}!!`);
      continue;
    }
    console.log(`purchased ${amountPurchased} ${assetInfo.name} for address ${address}`);
    const newFundingAddressBalance = await sdk.getPublicBalance(address, 0);
    console.log(`new balance in funding account: ${address} (${sdk.fromBaseUnits(newFundingAddressBalance, true)})`);
    usableBalances.push({ assetId: assetValue.assetId, value: amountPurchased });
  }
  return {
    usableBalances,
    originalBalances,
  };
};
