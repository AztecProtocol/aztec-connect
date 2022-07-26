import { AztecSdk, GrumpkinAddress, TxSettlementTime } from '@aztec/sdk';
import { depositAndSignFlow, DepositAndSignFlowState } from './deposit_and_sign_flow';
import type { Emit, ThrowIfCancelled } from './flows_utils';
import { requestSignerFlow, RequestSignerFlowState } from './request_signer_flow';
import { KeyPair } from './types';

export type LegacyMigrateFlowState =
  | { phase: 'select-fee-payer-signer'; requestSignerFlow: RequestSignerFlowState }
  | { phase: 'fetching-fees' }
  | { phase: 'creating-proof' }
  | { phase: 'deposit-and-sign'; depositAndSignFlow: DepositAndSignFlowState }
  | { phase: 'sending-proof' }
  | { phase: 'done' };

export async function legacyMigrateFlow(
  emitState: Emit<LegacyMigrateFlowState>,
  throwIfCancelled: ThrowIfCancelled,
  sdk: AztecSdk,
  legacyAccountKeys: KeyPair,
  newAccountKeys: KeyPair,
  newSpendingPublicKey: GrumpkinAddress,
) {
  const { signer: signerForPaying, address: addressOfDepositor } = await requestSignerFlow(
    requestSignerFlow => emitState({ phase: 'select-fee-payer-signer', requestSignerFlow }),
    throwIfCancelled,
  );

  emitState({ phase: 'fetching-fees' });
  const fees = await throwIfCancelled(sdk.getMigrateAccountFees(0));
  const fee = fees[TxSettlementTime.NEXT_ROLLUP];

  if (!(await sdk.userExists(legacyAccountKeys.publicKey))) {
    await sdk.addUser(legacyAccountKeys.privateKey, true);
  }
  if (!(await sdk.userExists(newAccountKeys.publicKey))) {
    await sdk.addUser(newAccountKeys.privateKey, true);
  }

  emitState({ phase: 'creating-proof' });
  // Note that legacy account didn't use a separate spending key
  const legacyKeySchnorrSigner = await sdk.createSchnorrSigner(legacyAccountKeys.privateKey);
  const controller = sdk.createMigrateAccountController(
    legacyAccountKeys.publicKey,
    legacyKeySchnorrSigner,
    newAccountKeys.privateKey,
    newSpendingPublicKey,
    undefined,
    { value: 0n, assetId: 0 },
    fee,
    addressOfDepositor,
    undefined,
    signerForPaying,
  );
  await controller.createProof();

  await depositAndSignFlow(
    depositAndSignFlow => emitState({ phase: 'deposit-and-sign', depositAndSignFlow }),
    throwIfCancelled,
    controller,
  );

  emitState({ phase: 'sending-proof' });
  await controller.send();

  emitState({ phase: 'done' });
}
