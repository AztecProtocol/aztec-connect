import { AztecSdk, GrumpkinAddress, AssetValue, EthAddress, EthereumProvider } from '@aztec/sdk';
import { Emit, ThrowIfCancelled } from '../../../toolbox/flows/flows_utils.js';
import { ActiveChainIdObs } from '../../active_wallet_hooks.js';
import { ActiveSignerObs } from '../../defi/defi_form/correct_provider_hooks.js';
import { L1DepositAndSignFlowState, l1DepositAndSignFlow } from '../l1_deposit/l1_deposit_and_sign_flow.js';

export type RegisterFormFlowState =
  | { phase: 'creating-proof' }
  | { phase: 'deposit-and-sign'; l1DepositAndSignFlow: L1DepositAndSignFlowState }
  | { phase: 'sending-proof' }
  | { phase: 'done' };

export async function registerFormFlow(
  emitState: Emit<RegisterFormFlowState>,
  throwIfCancelled: ThrowIfCancelled,
  sdk: AztecSdk,
  accountPublicKey: GrumpkinAddress,
  accountPrivateKey: Buffer,
  alias: string,
  spendingPublicKey: GrumpkinAddress,
  depositorEthSigner: EthereumProvider,
  activeSignerObs: ActiveSignerObs,
  depositorEthAddress: EthAddress,
  requiredChainId: number,
  activeChainIdObs: ActiveChainIdObs,
  deposit: AssetValue,
  fee: AssetValue,
) {
  if (deposit.assetId !== 0) throw new Error('TODO: support depositing other assets');
  const controller = sdk.createRegisterController(
    accountPublicKey,
    alias,
    accountPrivateKey,
    spendingPublicKey,
    undefined, // recoveryPublicKey
    deposit,
    fee,
    depositorEthAddress,
    depositorEthSigner,
  );

  emitState({ phase: 'creating-proof' });
  await throwIfCancelled(controller.createProof());

  await l1DepositAndSignFlow(
    l1DepositAndSignFlow => emitState({ phase: 'deposit-and-sign', l1DepositAndSignFlow }),
    throwIfCancelled,
    controller,
    activeSignerObs,
    depositorEthAddress,
    requiredChainId,
    activeChainIdObs,
  );

  emitState({ phase: 'sending-proof' });
  await throwIfCancelled(controller.send());

  emitState({ phase: 'done' });
  return true;
}
