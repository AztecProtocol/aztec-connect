import { AssetValue, DepositController, EthAddress, MigrateAccountController, RegisterController } from '@aztec/sdk';
import {
  EnforcedRetryableSignFlowState,
  enforcedRetryableSignFlow,
} from '../../../toolbox/flows/enforced_retryable_sign_flow.js';
import { Emit, ThrowIfCancelled } from '../../../toolbox/flows/flows_utils.js';
import { ActiveChainIdObs } from '../../active_wallet_hooks.js';
import { ActiveSignerObs } from '../../defi/defi_form/correct_provider_hooks.js';

export type L1DepositAndSignFlowState =
  | { phase: 'idle' }
  | { phase: 'checking-pending-funds' }
  | {
      phase: 'awaiting-l1-deposit-signature';
      requiredFunds: AssetValue;
      enforcedRetryableSignFlow: EnforcedRetryableSignFlowState;
    }
  | { phase: 'awaiting-l1-deposit-settlement' }
  | {
      phase: 'awaiting-proof-signature';
      messageToSign: string;
      enforcedRetryableSignFlow: EnforcedRetryableSignFlowState;
    };

type L1PayableController = RegisterController | DepositController | MigrateAccountController;

export async function l1DepositAndSignFlow(
  emitState: Emit<L1DepositAndSignFlowState>,
  throwIfCancelled: ThrowIfCancelled,
  controller: L1PayableController,
  activeSignerObs: ActiveSignerObs,
  depositorEthAddress: EthAddress,
  requiredChainId: number,
  activeChainIdObs: ActiveChainIdObs,
) {
  emitState({ phase: 'checking-pending-funds' });
  const requiredFundsBaseUnits = await throwIfCancelled(controller.getRequiredFunds());
  if (requiredFundsBaseUnits) {
    // TODO: dynamically handle assetId
    const requiredFunds: AssetValue = { assetId: 0, value: requiredFundsBaseUnits };
    await enforcedRetryableSignFlow(
      enforcedRetryableSignFlow => {
        emitState({ phase: 'awaiting-l1-deposit-signature', requiredFunds, enforcedRetryableSignFlow });
      },
      throwIfCancelled,
      () => controller.depositFundsToContract(),
      activeSignerObs,
      depositorEthAddress,
      requiredChainId,
      activeChainIdObs,
    );

    emitState({ phase: 'awaiting-l1-deposit-settlement' });
    await throwIfCancelled(controller.awaitDepositFundsToContract());
  }

  const signingData = controller.getSigningData();
  if (!signingData) throw new Error('Signing data unavailable');
  const messageToSign = new TextDecoder().decode(signingData);
  await enforcedRetryableSignFlow(
    enforcedRetryableSignFlow => {
      emitState({ phase: 'awaiting-proof-signature', messageToSign, enforcedRetryableSignFlow });
    },
    throwIfCancelled,
    () => controller.sign(),
    activeSignerObs,
    depositorEthAddress,
    requiredChainId,
    activeChainIdObs,
  );
}
