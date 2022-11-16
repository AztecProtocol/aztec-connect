import { chainIdToNetwork } from '../../app/networks.js';
import { formatEthAddress } from '../../app/util/helpers.js';
import { EnforcedRetryableSignFlowState } from '../../toolbox/flows/enforced_retryable_sign_flow.js';
import { SigningRequest } from '../../ui-components/index.js';

const RETRY_WARNING_TEXT =
  'You should only request another signature from your wallet if you are confident that the previous request has been lost for good. This could occur for some wallets on an unstable network connection. Continue?';

interface Props {
  toastMessage?: string;
  onRequest?: () => void;
  requestButtonLabel?: string;
  waitingForSignature?: boolean;
  requestButtonDisabled: boolean;
}

function getProps(flowState: EnforcedRetryableSignFlowState, waitingText: string): Props {
  if (!flowState.correctSignerIsActive) {
    return {
      requestButtonDisabled: true,
      toastMessage: `Please switch to wallet with address ${formatEthAddress(flowState.requiredSignerAddress)}`,
    };
  }
  // TODO: State for no wallet connected
  if (flowState.wrongChainId && flowState.requiredChainId !== undefined) {
    const network = chainIdToNetwork(flowState.requiredChainId);
    return { requestButtonDisabled: true, toastMessage: `Please switch your network to ${network?.network}` };
  }
  if (flowState.actions.retrySign) {
    const handleRetry = () => {
      const confirmed = window.confirm(RETRY_WARNING_TEXT);
      if (confirmed) flowState.actions.retrySign?.();
    };
    return {
      requestButtonDisabled: false,
      onRequest: handleRetry,
      toastMessage: "Can't see the request in your wallet?",
      requestButtonLabel: 'Retry',
    };
  }
  if (flowState.actions.sign) {
    return {
      requestButtonDisabled: false,
      onRequest: flowState.actions.sign,
    };
  }
  if (flowState.busy) {
    return {
      requestButtonDisabled: true,
      waitingForSignature: true,
      toastMessage: waitingText,
    };
  }
  return {
    requestButtonDisabled: true,
    toastMessage: 'Unknown state',
  };
}

export function EnforcedRetryableSignInteractions(props: {
  flowState: EnforcedRetryableSignFlowState;
  waitingText: string;
  prompt?: string;
  messageToBeSigned?: string;
  onCancel?: () => void;
}) {
  return (
    <SigningRequest
      messageToBeSigned={props.messageToBeSigned}
      prompt={props.prompt}
      onCancel={props.onCancel}
      {...getProps(props.flowState, props.waitingText)}
    />
  );
}
