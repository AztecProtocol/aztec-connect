import { AliasHash } from '@aztec/barretenberg/account_id';
import { EthAddress, GrumpkinAddress } from '@aztec/barretenberg/address';
import { AssetValue } from '@aztec/barretenberg/asset';
import { BridgeCallData } from '@aztec/barretenberg/bridge_call_data';
import { ProofId } from '@aztec/barretenberg/client_proofs';
import { Blake2s } from '@aztec/barretenberg/crypto';
import { WorldState } from '@aztec/barretenberg/world_state';
import { UserState as AccountState } from '../../user_state/index.js';
import { Database } from '../../database/index.js';
import { AccountProofRequestData } from './account_proof_request_data.js';
import { DefiProofRequestData } from './defi_proof_request_data.js';
import { PaymentProofRequestData } from './payment_proof_request_data.js';
import { pickDefiInputNotes, pickInputNotes } from './pick_input_notes.js';
import { getSpendingKeyAccount } from './spending_key_account.js';

export interface ProofRequestOptions {
  excludedNullifiers?: Buffer[];
  excludePendingNotes?: boolean;
  allowChain?: boolean;
  hideNoteCreator?: boolean;
}

export class ProofRequestDataFactory {
  constructor(private worldState: WorldState, private db: Database, private blake2s: Blake2s) {}

  /**
   * accountState can be undefined when one of the following is true:
   *  - proofId === ProofId.DEPOSIT
   *  - inputNotes will be picked by AztecWalletProvider when creating proof inputs.
   */
  public async createPaymentProofRequestData(
    proofId: ProofId.DEPOSIT | ProofId.SEND | ProofId.WITHDRAW,
    accountPublicKey: GrumpkinAddress,
    spendingPublicKey: GrumpkinAddress,
    assetValue: AssetValue,
    fee: AssetValue,
    publicOwner: EthAddress,
    recipient: GrumpkinAddress,
    recipientSpendingKeyRequired: boolean,
    accountState?: AccountState,
    options: ProofRequestOptions = {},
  ): Promise<PaymentProofRequestData> {
    // TODO - validate input args

    // If spendingPublicKey equals GrumpkinAddress.ZERO, it means that spendingPublicKey is unknown at the moment, and
    // proofInputs will be sent to the spending key owner later on to create signatures.
    const spendingKeyRequired =
      !spendingPublicKey.equals(accountPublicKey) || spendingPublicKey.equals(GrumpkinAddress.ZERO);
    const inputNotes = accountState
      ? await pickInputNotes(assetValue, fee, { ...options, spendingKeyRequired }, accountState, this.worldState)
      : [];

    const spendingKeyAccount = await getSpendingKeyAccount(
      spendingPublicKey,
      accountPublicKey,
      this.worldState,
      this.db,
    );

    const dataRoot = this.worldState.getRoot();

    // The output note from a deposit proof can't be chained from by default because it will be a privacy leak when the
    // chained tx is defi or withdraw. People will be able to associate an L1 address or a defi interaction with the
    // depositor.
    const allowChain = options.allowChain ?? proofId !== ProofId.DEPOSIT;

    const hideNoteCreator = options.hideNoteCreator ?? false;

    return {
      accountPublicKey,
      proofId,
      assetValue,
      fee,
      publicOwner,
      recipient,
      recipientSpendingKeyRequired,
      inputNotes,
      spendingKeyAccount,
      dataRoot,
      allowChain,
      hideNoteCreator,
    };
  }

  public async createAccountProofRequestData(
    accountPublicKey: GrumpkinAddress,
    spendingPublicKey: GrumpkinAddress,
    alias: string,
    newAccountPublicKey: GrumpkinAddress,
    newSpendingPublicKey1: GrumpkinAddress,
    newSpendingPublicKey2: GrumpkinAddress,
    deposit: AssetValue,
    fee: AssetValue,
    depositor: EthAddress,
    accountState?: AccountState,
    options: ProofRequestOptions = {},
  ): Promise<AccountProofRequestData> {
    // TODO - validate input args
    if (deposit.value && fee.value && deposit.assetId !== fee.assetId) {
      throw new Error('Inconsistent asset ids.');
    }

    const aliasHash = alias
      ? AliasHash.fromAlias(alias, this.blake2s)
      : (await this.db.getAlias(accountPublicKey))?.aliasHash;
    if (!aliasHash) {
      throw new Error('Provide an alias or wait for the account to be fully synced.');
    }

    const publicInput = !depositor.equals(EthAddress.ZERO) ? deposit.value + fee.value : BigInt(0);
    const privateInput = !publicInput ? fee.value : BigInt(0);

    const inputNotes =
      privateInput && accountState
        ? await pickInputNotes(
            { value: privateInput, assetId: fee.assetId },
            fee,
            { ...options, spendingKeyRequired: true },
            accountState,
            this.worldState,
          )
        : [];

    const spendingKeyAccount = await getSpendingKeyAccount(
      spendingPublicKey,
      accountPublicKey,
      this.worldState,
      this.db,
    );

    const dataRoot = this.worldState.getRoot();

    const allowChain = options.allowChain ?? !!privateInput;

    return {
      accountPublicKey,
      alias,
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
    };
  }

  // accountState can be undefined if inputNotes will be picked by AztecWalletProvider when creating proof inputs.
  public async createDefiProofRequestData(
    accountPublicKey: GrumpkinAddress,
    spendingPublicKey: GrumpkinAddress,
    bridgeCallData: BridgeCallData,
    assetValue: AssetValue,
    fee: AssetValue,
    accountState?: AccountState,
    options: ProofRequestOptions = {},
  ): Promise<DefiProofRequestData> {
    // TODO - validate input args

    const spendingKeyRequired =
      !spendingPublicKey.equals(accountPublicKey) || spendingPublicKey.equals(GrumpkinAddress.ZERO);
    const inputNotes = accountState
      ? await pickDefiInputNotes(
          bridgeCallData,
          assetValue,
          fee,
          { ...options, spendingKeyRequired },
          accountState,
          this.worldState,
        )
      : [];

    const spendingKeyAccount = await getSpendingKeyAccount(
      spendingPublicKey,
      accountPublicKey,
      this.worldState,
      this.db,
    );

    const dataRoot = this.worldState.getRoot();

    const allowChain = options.allowChain ?? true;

    return {
      accountPublicKey,
      bridgeCallData,
      assetValue,
      fee,
      inputNotes,
      spendingKeyAccount,
      dataRoot,
      allowChain,
    };
  }
}
