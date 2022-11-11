import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { StepStatus } from '../../../../../../ui-components/index.js';
import { SubmissionItemPrompt } from '../submission_item_prompt/index.js';
import { useAccountState } from '../../../../../../alt-model/account_state/index.js';

function ConnectWalletPrompt() {
  return (
    <SubmissionItemPrompt>
      Please sign the message in your connected wallet to retrieve your Aztec Spending Key.
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
  const accountState = useAccountState();
  const { address } = useAccount();

  const isCorrectAccount = !!(accountState && address === accountState.ethAddressUsedForAccountKey.toString());
  if (isCorrectAccount) {
    return {
      status: StepStatus.RUNNING,
      fieldContent: <ConnectButton accountStatus="address" showBalance={false} />,
      expandedContent: <ConnectWalletPrompt />,
    };
  } else {
    return {
      status: StepStatus.ERROR,
      fieldContent: <ConnectButton accountStatus="address" showBalance={false} />,
      expandedContent: <SwitchWalletPrompt />,
    };
  }
}

export type SpendKeyGenerationStep = ReturnType<typeof useSpendingKeyGenerationStep>;
