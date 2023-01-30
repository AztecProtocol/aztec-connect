import { AliasHash } from '@aztec/barretenberg/account_id';
import { EthAddress, GrumpkinAddress } from '@aztec/barretenberg/address';
import { AssetValue } from '@aztec/barretenberg/asset';
import { BridgeCallData } from '@aztec/barretenberg/bridge_call_data';
import { ProofId } from '@aztec/barretenberg/client_proofs';
import { AuthAlgorithms } from '../../auth_algorithms/index.js';
import { Note } from '../../note/index.js';
import { PaymentProofRequestData, SpendingKeyAccount } from '../proof_request_data/index.js';
import { JoinSplitTxInputCreator } from './join_split_tx_input_creator.js';
import { PaymentProofInput } from './proof_input.js';

export class PaymentProofInputCreator {
  constructor(private joinSplitTxInputCreator: JoinSplitTxInputCreator) {}

  public async createProofInputs(
    {
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
    }: PaymentProofRequestData,
    authAlgos: AuthAlgorithms,
  ) {
    const accountSpendingKeyRequired = !spendingKeyAccount.spendingPublicKey.equals(accountPublicKey);

    if (accountSpendingKeyRequired && spendingKeyAccount.aliasHash.equals(AliasHash.ZERO)) {
      throw new Error('Spending key account not provided.');
    }
    if (inputNotes.some(n => n.treeNote.accountRequired !== accountSpendingKeyRequired)) {
      throw new Error(`Cannot spend notes with ${accountSpendingKeyRequired ? 'account' : 'spending'} key.`);
    }

    const assetNotes = inputNotes.filter(n => n.assetId === assetValue.assetId);
    const assetInputValue = assetNotes.reduce((sum, n) => sum + n.value, BigInt(0));

    if (assetNotes.length && proofId === ProofId.DEPOSIT) {
      // TODO - Enable it and modify the recovery logic in group_user_txs.
      throw new Error('Merging private balance with public balance is not supported.');
    }

    const requireFeePayingTx = fee.assetId !== assetValue.assetId && fee.value && assetValue.value;
    const feeNotes = requireFeePayingTx ? inputNotes.filter(n => n.assetId === fee.assetId) : [];

    if (feeNotes.length && proofId === ProofId.DEPOSIT) {
      throw new Error('Cannot pay fee with private asset for deposit.');
    }

    const privateInput = (() => {
      switch (proofId) {
        case ProofId.DEPOSIT:
          return BigInt(0);
        case ProofId.SEND:
        case ProofId.WITHDRAW:
          return !requireFeePayingTx ? assetValue.value + fee.value : assetValue.value;
      }
    })();

    if (assetInputValue < privateInput) {
      throw new Error('Provided notes are not enough to pay for the transaction.');
    }

    const publicValue = (() => {
      switch (proofId) {
        case ProofId.DEPOSIT:
          return assetValue.value + fee.value;
        case ProofId.SEND:
          return BigInt(0);
        case ProofId.WITHDRAW:
          return assetValue.value;
      }
    })();

    if (publicValue && publicOwner.equals(EthAddress.ZERO)) {
      throw new Error('Public owner undefined.');
    }

    const recipientPrivateOutput = (() => {
      switch (proofId) {
        case ProofId.DEPOSIT:
        case ProofId.SEND:
          return assetValue.value;
        case ProofId.WITHDRAW:
          return BigInt(0);
      }
    })();
    if (recipientPrivateOutput && recipient.equals(GrumpkinAddress.generator())) {
      throw new Error('Recipient undefined.');
    }

    const senderPrivateOutput = (() => {
      switch (proofId) {
        case ProofId.DEPOSIT:
          return BigInt(0);
        case ProofId.SEND:
        case ProofId.WITHDRAW: {
          return assetInputValue > privateInput ? assetInputValue - privateInput : BigInt(0);
        }
      }
    })();

    const assetProofInputs = await this.createChainedProofInputs(
      accountPublicKey,
      proofId,
      assetValue.assetId,
      publicValue,
      recipientPrivateOutput,
      senderPrivateOutput,
      assetNotes,
      recipient,
      recipientSpendingKeyRequired,
      publicOwner,
      spendingKeyAccount,
      dataRoot,
      allowChain,
      hideNoteCreator,
      authAlgos,
    );

    const feeProofInputs = requireFeePayingTx
      ? await this.createFeeProofInputs(
          accountPublicKey,
          fee,
          feeNotes,
          spendingKeyAccount,
          dataRoot,
          allowChain,
          authAlgos,
        )
      : [];

    return [...assetProofInputs, ...feeProofInputs];
  }

  public async createFeeProofInputs(
    accountPublicKey: GrumpkinAddress,
    fee: AssetValue,
    inputNotes: Note[],
    spendingKeyAccount: SpendingKeyAccount,
    dataRoot: Buffer,
    allowChain: boolean,
    authAlgos: AuthAlgorithms,
  ) {
    const accountSpendingKeyRequired = !spendingKeyAccount.spendingPublicKey.equals(accountPublicKey);

    const feeInputValue = inputNotes.reduce((sum, n) => sum + n.value, BigInt(0));
    if (feeInputValue < fee.value) {
      throw new Error('Provided notes are not enough to pay for the fee.');
    }

    return await this.createChainedProofInputs(
      accountPublicKey,
      ProofId.SEND,
      fee.assetId,
      BigInt(0), // publicValue
      BigInt(0), // recipientPrivateOutput
      feeInputValue - fee.value, // senderPrivateOutput
      inputNotes,
      accountPublicKey,
      accountSpendingKeyRequired,
      EthAddress.ZERO,
      spendingKeyAccount,
      dataRoot,
      allowChain,
      false, // hideNoteCreator
      authAlgos,
    );
  }

  private async createChainedProofInputs(
    accountPublicKey: GrumpkinAddress,
    proofId: ProofId,
    assetId: number,
    publicValue: bigint,
    recipientPrivateOutput: bigint,
    senderPrivateOutput: bigint,
    inputNotes: Note[],
    recipient: GrumpkinAddress | undefined,
    recipientSpendingKeyRequired: boolean,
    publicOwner: EthAddress | undefined,
    spendingKeyAccount: SpendingKeyAccount,
    dataRoot: Buffer,
    allowChain: boolean,
    hideNoteCreator: boolean,
    authAlgos: AuthAlgorithms,
  ) {
    const proofInputs: PaymentProofInput[] = [];
    let outputNotes = inputNotes;
    if (inputNotes.length > 2) {
      const chainedTxs = await this.joinSplitTxInputCreator.createChainedTxs(
        accountPublicKey,
        assetId,
        inputNotes,
        spendingKeyAccount,
        dataRoot,
        authAlgos,
      );
      outputNotes = chainedTxs.outputNotes;
      proofInputs.push(...chainedTxs.proofInputs);
    }

    const { tx, viewingKeys, signingData } = await this.joinSplitTxInputCreator.createTx(
      accountPublicKey,
      proofId,
      assetId,
      publicValue,
      publicOwner || EthAddress.ZERO,
      recipientPrivateOutput,
      senderPrivateOutput,
      BridgeCallData.ZERO,
      BigInt(0), // defiDepositValue
      recipient || GrumpkinAddress.generator(),
      recipientSpendingKeyRequired,
      outputNotes,
      spendingKeyAccount,
      dataRoot,
      allowChain ? 2 : 0,
      hideNoteCreator,
      authAlgos,
    );
    proofInputs.push({ tx, viewingKeys, signingData });

    return proofInputs;
  }
}
