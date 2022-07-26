import { AssetValue, DepositController, MigrateAccountController, RegisterController } from '@aztec/sdk';
import { Emit, ThrowIfCancelled } from './flows_utils';

export type DepositAndSignFlowState =
  | { phase: 'checking-pending-funds' }
  | { phase: 'awaiting-l1-deposit-signature'; requiredFunds: AssetValue }
  | { phase: 'awaiting-l1-deposit-settlement' }
  | { phase: 'awaiting-proof-signature'; proofDigest: string };

type L1PayableController = RegisterController | DepositController | MigrateAccountController;

export async function depositAndSignFlow(
  emitState: Emit<DepositAndSignFlowState>,
  throwIfCancelled: ThrowIfCancelled,
  controller: L1PayableController,
) {
  emitState({ phase: 'checking-pending-funds' });
  const requiredFundsBaseUnits = await throwIfCancelled(controller.getRequiredFunds());
  if (requiredFundsBaseUnits) {
    // TODO: dynamically handle assetId
    const requiredFunds: AssetValue = { assetId: 0, value: requiredFundsBaseUnits };
    emitState({ phase: 'awaiting-l1-deposit-signature', requiredFunds });
    await throwIfCancelled(controller.depositFundsToContract());

    emitState({ phase: 'awaiting-l1-deposit-settlement' });
    await throwIfCancelled(controller.awaitDepositFundsToContract());
  }

  const proofDigest = controller.getProofHash()?.toString('hex');
  if (!proofDigest) throw new Error('Proof digest unavailable');
  emitState({ phase: 'awaiting-proof-signature', proofDigest: `0x${proofDigest}` });
  await throwIfCancelled(controller.sign());
}
