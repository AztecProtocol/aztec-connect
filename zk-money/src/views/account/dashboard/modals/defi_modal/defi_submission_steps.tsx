import { EthAddress } from '@aztec/sdk';
import { StepStatus, SubmissionFlow, ActiveSubmissionFlowItem, WalletAccountIndicator } from 'ui-components';
import { useApp, useProviderState } from 'alt-model';
import { DefiComposerPhase, DefiComposerState } from 'alt-model/defi/defi_form';
import { WalletId } from 'app';
import { SubmissionItemPrompt } from '../modal_molecules/submission_item_prompt';
import { WalletDropdownSelect } from './wallet_dropdown_select';

interface DefiSubmissionStepsProps {
  composerState: DefiComposerState;
}

const steps = [
  { phase: DefiComposerPhase.GENERATING_KEY, label: 'Creating Spending Key' },
  { phase: DefiComposerPhase.CREATING_PROOF, label: 'Creating Proof' },
  { phase: DefiComposerPhase.SENDING_PROOF, label: 'Sending Proof' },
];

const labels = steps.map(x => x.label);

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

function getActiveItem(
  { phase, error }: DefiComposerState,
  isCorrectAccount: boolean,
  address?: EthAddress,
  walletId?: WalletId,
): ActiveSubmissionFlowItem {
  if (error) {
    const idx = steps.findIndex(x => x.phase === error.phase);
    const expandedContent = <SubmissionItemPrompt errored>{error.message}</SubmissionItemPrompt>;
    return { idx, status: StepStatus.ERROR, expandedContent };
  }
  const idx = steps.findIndex(x => x.phase === phase);
  if (phase === DefiComposerPhase.GENERATING_KEY) {
    if (isCorrectAccount) {
      return {
        idx,
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
        idx,
        status: StepStatus.ERROR,
        fieldContent: <WalletDropdownSelect />,
        expandedContent: <SwitchWalletPrompt />,
      };
    }
  }
  return { idx, status: StepStatus.RUNNING };
}

export function DefiSubmissionSteps({ composerState }: DefiSubmissionStepsProps) {
  const providerState = useProviderState();
  const { keyVault } = useApp();
  const address = providerState?.account;
  const walletId = providerState?.walletId;
  const isCorrectAccount = !!(keyVault && address?.equals(keyVault.signerAddress));

  return (
    <SubmissionFlow activeItem={getActiveItem(composerState, isCorrectAccount, address, walletId)} labels={labels} />
  );
}
