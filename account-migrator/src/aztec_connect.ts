import { RollupProcessor } from '@aztec/blockchain';
import { EthAddress } from '@aztec/barretenberg/address';
import { Timer } from '@aztec/barretenberg/timer';
import { RollupProofData } from '@aztec/barretenberg/rollup_proof';
import { JsonRpcProvider } from '@aztec/blockchain';
import { ProofId } from '@aztec/barretenberg/client_proofs';
import { OffchainAccountData } from '@aztec/barretenberg/offchain_tx_data';
import { Account, Accounts } from './account';
import { AccountAliasId } from '@aztec/barretenberg/account_id';

export async function getAccountsConnect(options: any) {
  const blockTimer = new Timer();
  const ethereumProvider = new JsonRpcProvider(options.url);
  const rollupProcessor = new RollupProcessor(EthAddress.fromString(options.address), ethereumProvider);
  const blocks = await rollupProcessor.getRollupBlocksFrom(options.from, options.confirmations);
  const filteredBlocks = blocks.filter(block => {
    if (block.rollupId < options.from) {
      return false;
    }
    if (options.to && block.rollupId > options.to) {
      return false;
    }
    return true;
  });
  console.log(`Retrieved ${filteredBlocks.length} blocks in ${blockTimer.s()}s`);
  if (!filteredBlocks.length) {
    return {
      earliestRollupId: 0,
      lastestRollupId: 0,
      accounts: [],
    } as Accounts;
  }

  const rollupProofs = filteredBlocks.map(block => RollupProofData.fromBuffer(block.rollupProofData));
  const innerProofs = rollupProofs.flatMap(outerProof => outerProof.innerProofData).filter(x => !x.isPadding());
  const offChainData = filteredBlocks.map(block => block.offchainTxData);
  const offChainAccountData = offChainData.flat().filter((data, index) => {
    return innerProofs[index].proofId === ProofId.ACCOUNT;
  });

  console.log(`Total num off chain data: ${offChainData.length}`);
  const accounts = offChainAccountData
    .map(data => {
      return OffchainAccountData.fromBuffer(data);
    })
    .map(x => {
      return {
        aliasId: new AccountAliasId(x.aliasHash, 0),
        accountKey: x.accountPublicKey,
        spendingKeys: [x.spendingPublicKey1, x.spendingPublicKey2],
      } as Account;
    });
  return {
    earliestRollupId: filteredBlocks[0].rollupId,
    lastestRollupId: filteredBlocks[filteredBlocks.length - 1].rollupId,
    accounts: accounts,
  } as Accounts;
}
