import { useApp, useProviderState } from 'alt-model';
import { WalletId } from 'app';
import { StepStatus, WalletAccountIndicator } from 'ui-components';
import { WalletDropdownSelect } from '../../defi_modal/wallet_dropdown_select';
import { SubmissionItemPrompt } from '../submission_item_prompt';

function ConnectWalletPrompt() {
  return (
    <SubmissionItemPrompt>
      Please sign the message in your connected wallet to generate your Aztec Spending Key.
      <br />
      IMPORTANT: Only sign this message if you trust the application.
    </SubmissionItemPrompt>
  );
}

function SwitchWalletPrompt() {
  return (
    <SubmissionItemPrompt>
      Please connect the wallet account that was used to register your aztec account.
    </SubmissionItemPrompt>
  );
}

export function useSpendingKeyGenerationStep() {
  const providerState = useProviderState();
  const { keyVault } = useApp();
  const address = providerState?.account;
  const walletId = providerState?.walletId;
  const isCorrectAccount = !!(keyVault && address?.equals(keyVault.signerAddress));
  if (isCorrectAccount) {
    return {
      status: StepStatus.RUNNING,
      fieldContent: (
        <WalletAccountIndicator
          address={address?.toString() ?? ''}
          wallet={walletId === WalletId.METAMASK ? 'metamask' : 'wallet-connect'}
        />
      ),
      expandedContent: <ConnectWalletPrompt />,
    };
  } else {
    return {
      status: StepStatus.ERROR,
      fieldContent: <WalletDropdownSelect />,
      expandedContent: <SwitchWalletPrompt />,
    };
  }
}

export type SpendKeyGenerationStep = ReturnType<typeof useSpendingKeyGenerationStep>;
