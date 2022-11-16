import { EthAddress, EthereumProvider } from '@aztec/sdk';
import { Amount } from '../../assets/amount.js';
import { RemoteAsset } from '../../types.js';

export interface AssessL1DepositWalletResources {
  depositor: EthAddress | undefined;
  depositorSigner: EthereumProvider | undefined;
  activeChainId: number | undefined;
  requiredChainId: number;
  ethAddressOfWalletUsedToGenerateAccount: EthAddress | undefined;
  feeAmount: Amount | undefined;
  depositAsset: RemoteAsset;
}

export function assessL1DepositConnectedWallet({
  depositor,
  depositorSigner,
  ethAddressOfWalletUsedToGenerateAccount,
  feeAmount,
  depositAsset,
  activeChainId,
  requiredChainId,
}: AssessL1DepositWalletResources) {
  const noWalletConnected = !depositor || !depositorSigner;
  const wrongNetwork = !noWalletConnected && activeChainId !== requiredChainId;
  const isUsingAuxiliaryFeeAsset = !!feeAmount && feeAmount.id !== depositAsset.id;
  const mustSwitchToWalletUsedToGenerateAztecAccount =
    isUsingAuxiliaryFeeAsset &&
    !!ethAddressOfWalletUsedToGenerateAccount &&
    !depositor?.equals(ethAddressOfWalletUsedToGenerateAccount);

  const issues = {
    noWalletConnected,
    wrongNetwork,
    mustSwitchToWalletUsedToGenerateAztecAccount,
  };

  return { issues };
}

export type L1DepositWalletAssment = ReturnType<typeof assessL1DepositConnectedWallet>;
