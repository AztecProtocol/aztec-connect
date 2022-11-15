import { AssetValue } from '@aztec/sdk';
import { useAmount } from '../../alt-model/top_level_context/top_level_context_hooks.js';
import { EnforcedRetryableSignFlowState } from '../../toolbox/flows/enforced_retryable_sign_flow.js';
import { EnforcedRetryableSignInteractions } from '../../views/flow_interactions/enforced_retryable_sign_interactions.js';

interface SignDepositInteractionProps {
  requiredFunds: AssetValue;
  flowState: EnforcedRetryableSignFlowState;
  onCancel?: () => void;
}

export function SignDepositInteraction(props: SignDepositInteractionProps) {
  const amount = useAmount(props.requiredFunds);
  const prompt = `Approve transfer of ${amount?.format({ layer: 'L1' })}`;
  return (
    <EnforcedRetryableSignInteractions
      onCancel={props.onCancel}
      flowState={props.flowState}
      waitingText="Waiting for approval"
      prompt={prompt}
    />
  );
}
