import { DepositAndSignFlowState } from './deposit_and_sign_flow';

export function getDepositAndSignFlowMessage(flowState: DepositAndSignFlowState) {
  switch (flowState.phase) {
    case 'checking-pending-funds':
      return 'Checking for any previously transferred funds...';
    case 'awaiting-l1-deposit-signature':
      // TODO find a way to format flowState.registerFlow.requiredFunds
      return 'Please approve the L1 funds transfer in your wallet. This will later be used for paying the L2 tx fee.';
    case 'awaiting-l1-deposit-settlement':
      return 'Waiting for L1 transfer to settle...';
    case 'awaiting-proof-signature':
      return `Please sign the message in your wallet containing the following transaction ID: ${flowState.proofDigest}`;
    default:
      return;
  }
}
