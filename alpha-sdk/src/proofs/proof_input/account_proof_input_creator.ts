import { AliasHash } from '@aztec/barretenberg/account_id';
import { EthAddress, GrumpkinAddress } from '@aztec/barretenberg/address';
import { AccountTx, createAccountProofSigningData, ProofId } from '@aztec/barretenberg/client_proofs';
import { BarretenbergWasm } from '@aztec/barretenberg/wasm';
import { AuthAlgorithms } from '../../auth_algorithms/index.js';
import { AccountProofRequestData, ProofRequestDataType, SpendingKeyAccount } from '../proof_request_data/index.js';
import { PaymentProofInputCreator } from './payment_proof_input_creator.js';
import { AccountProofInput } from './proof_input.js';
import { ProofInputType } from './proof_input_type.js';

export class AccountProofInputCreator {
  constructor(private paymentProofInputCreator: PaymentProofInputCreator, private wasm: BarretenbergWasm) {}

  public async createProofInputs(
    {
      accountPublicKey,
      aliasHash,
      newAccountPublicKey,
      newSpendingPublicKey1,
      newSpendingPublicKey2,
      deposit,
      fee,
      depositor,
      inputNotes,
      spendingKeyAccount,
      dataRoot,
      allowChain,
    }: AccountProofRequestData,
    authAlgos: AuthAlgorithms,
  ) {
    // TODO - check AccountProofRequestData

    const accountProofInput = await this.createAccountProofInput(
      accountPublicKey,
      aliasHash,
      newAccountPublicKey,
      newSpendingPublicKey1,
      newSpendingPublicKey2,
      spendingKeyAccount,
      dataRoot,
    );

    const payFeeViaDeposit = (deposit.value || fee.value) && !depositor.equals(EthAddress.ZERO);
    const depositProofInputs = payFeeViaDeposit
      ? await this.paymentProofInputCreator.createProofInputs(
          {
            type: ProofRequestDataType.PaymentProofRequestData,
            accountPublicKey,
            proofId: ProofId.DEPOSIT,
            assetValue: deposit,
            fee,
            publicOwner: depositor,
            recipient: accountPublicKey,
            recipientSpendingKeyRequired: true,
            inputNotes,
            spendingKeyAccount: {
              ...spendingKeyAccount,
              // The spending key exists for a request to recover an account, but its private key was discarded after
              // recovery payload was generated. We only have the siganure for the account proof, and can't use that
              // spending key to create and sign a deposit tx.
              spendingPublicKey: accountPublicKey.equals(newAccountPublicKey)
                ? accountPublicKey
                : spendingKeyAccount.spendingPublicKey,
            },
            dataRoot,
            allowChain,
            hideNoteCreator: false,
          },
          authAlgos,
        )
      : [];
    const feeProofInputs =
      fee.value && !payFeeViaDeposit
        ? await this.paymentProofInputCreator.createFeeProofInputs(
            accountPublicKey,
            fee,
            inputNotes,
            spendingKeyAccount,
            dataRoot,
            allowChain,
            authAlgos,
          )
        : [];

    return [accountProofInput, ...depositProofInputs, ...feeProofInputs];
  }

  private async createAccountProofInput(
    accountPublicKey: GrumpkinAddress,
    aliasHash: AliasHash,
    newAccountPublicKey: GrumpkinAddress,
    newSpendingPublicKey1: GrumpkinAddress,
    newSpendingPublicKey2: GrumpkinAddress,
    { spendingPublicKey, accountIndex, accountPath }: SpendingKeyAccount,
    dataRoot: Buffer,
  ): Promise<AccountProofInput> {
    const create = accountPublicKey.equals(spendingPublicKey);
    const migrate = !newAccountPublicKey.equals(accountPublicKey);
    const tx = new AccountTx(
      dataRoot,
      accountPublicKey,
      newAccountPublicKey || accountPublicKey,
      newSpendingPublicKey1 || GrumpkinAddress.ZERO,
      newSpendingPublicKey2 || GrumpkinAddress.ZERO,
      aliasHash,
      create,
      migrate,
      accountIndex,
      accountPath,
      spendingPublicKey,
    );

    const signingData = await createAccountProofSigningData(tx, this.wasm);

    return { type: ProofInputType.AccountProofInput, tx, signingData };
  }
}
