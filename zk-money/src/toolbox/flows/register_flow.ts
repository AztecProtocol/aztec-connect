import { TxSettlementTime, AztecSdk, GrumpkinAddress, AssetValue } from '@aztec/sdk';
import { depositAndSignFlow, DepositAndSignFlowState } from './deposit_and_sign_flow';
import type { ThrowIfCancelled, Emit } from './flows_utils';
import { requestSignerFlow, RequestSignerFlowState } from './request_signer_flow';

export type RegisterFlowState =
  | { phase: 'select-fee-payer-signer'; requestSignerFlow: RequestSignerFlowState }
  | { phase: 'fetching-fees' }
  | { phase: 'creating-proof' }
  | { phase: 'deposit-and-sign'; depositAndSignFlow: DepositAndSignFlowState }
  | { phase: 'awaiting-l1-deposit-signature'; requiredFunds: AssetValue }
  | { phase: 'awaiting-l1-deposit-settlement' }
  | { phase: 'awaiting-proof-signature'; proofDigest: string }
  | { phase: 'sending-proof' }
  | { phase: 'done' };

export async function registerFlow(
  emitState: Emit<RegisterFlowState>,
  throwIfCancelled: ThrowIfCancelled,
  sdk: AztecSdk,
  accountKeys: { privateKey: Buffer; publicKey: GrumpkinAddress },
  alias: string,
  spendingPublicKey: GrumpkinAddress,
) {
  const { signer, address } = await requestSignerFlow(
    requestSignerFlow => emitState({ phase: 'select-fee-payer-signer', requestSignerFlow }),
    throwIfCancelled,
  );

  emitState({ phase: 'fetching-fees' });
  const fees = await throwIfCancelled(sdk.getRegisterFees(0));
  const fee = fees[TxSettlementTime.NEXT_ROLLUP];

  if (!(await sdk.userExists(accountKeys.publicKey))) {
    await sdk.addUser(accountKeys.privateKey, true);
  }
  const controller = sdk.createRegisterController(
    accountKeys.publicKey,
    alias,
    accountKeys.privateKey,
    spendingPublicKey,
    undefined,
    { assetId: 0, value: 0n },
    fee,
    address,
    signer,
  );

  emitState({ phase: 'creating-proof' });
  await throwIfCancelled(controller.createProof());

  await depositAndSignFlow(
    depositAndSignFlow => emitState({ phase: 'deposit-and-sign', depositAndSignFlow }),
    throwIfCancelled,
    controller,
  );

  emitState({ phase: 'sending-proof' });
  await throwIfCancelled(controller.send());

  emitState({ phase: 'done' });
}
