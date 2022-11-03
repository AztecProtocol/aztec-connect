import { useApp, useProviderState } from '../../../../../../alt-model/index.js';
import { WalletId, wallets } from '../../../../../../app/index.js';
import { useState } from 'react';
import { WalletAccountIndicator } from '../../../../../../components/index.js';
import { StepStatus } from '../../../../../../ui-components/index.js';
import { SubmissionItemPrompt } from '../submission_item_prompt/index.js';

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
  const { keyVault, userSession, provider } = useApp();

  const [isWalletSelectorOpen, setWalletSelectorOpen] = useState(false);

  const toggleWalletDropdown = () => {
    setWalletSelectorOpen(prevValue => !prevValue);
  };

  const options = (window.ethereum ? wallets : wallets.filter(w => w.id !== WalletId.METAMASK)).map(wallet => ({
    value: wallet.id,
    label: wallet.nameShort,
  }));
  const address = providerState?.account;
  const walletId = providerState?.walletId;
  const isCorrectAccount = !!(keyVault && address?.equals(keyVault.signerAddress));
  if (isCorrectAccount) {
    return {
      status: StepStatus.RUNNING,
      fieldContent: (
        <WalletAccountIndicator
          address={address?.toString() ?? ''}
          walletId={walletId}
          options={options}
          onChange={async id => {
            await provider?.disconnect();
            userSession?.changeWallet(id, true);
          }}
          onClose={toggleWalletDropdown}
          onClick={toggleWalletDropdown}
          isOpen={isWalletSelectorOpen}
        />
      ),
      expandedContent: <ConnectWalletPrompt />,
    };
  } else {
    return {
      status: StepStatus.ERROR,
      fieldContent: (
        <WalletAccountIndicator
          address={address?.toString() ?? ''}
          walletId={walletId}
          options={options}
          onChange={id => userSession?.changeWallet(id)}
          onClose={toggleWalletDropdown}
          onClick={toggleWalletDropdown}
          isOpen={isWalletSelectorOpen}
        />
      ),
      expandedContent: <SwitchWalletPrompt />,
    };
  }
}

export type SpendKeyGenerationStep = ReturnType<typeof useSpendingKeyGenerationStep>;
