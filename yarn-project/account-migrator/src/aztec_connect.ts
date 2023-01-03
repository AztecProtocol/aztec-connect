import { RollupProofData } from '@aztec/barretenberg/rollup_proof';
import { ProofId } from '@aztec/barretenberg/client_proofs';
import { OffchainAccountData } from '@aztec/barretenberg/offchain_tx_data';
import { AccountAliasId } from '@aztec/barretenberg/account_id';
import { Account, Accounts } from './account.js';
import { getRollupBlocks } from './get_rollup_blocks.js';

export async function getAccountsConnect(options: any) {
  const filteredBlocks = await getRollupBlocks(options);
  if (!filteredBlocks.length) {
    return {
      earliestRollupId: 0,
      lastestRollupId: 0,
      accounts: [],
    } as Accounts;
  }

  const rollupProofs = filteredBlocks.map(block => RollupProofData.decode(block.encodedRollupProofData));
  const innerProofs = rollupProofs.flatMap(outerProof => outerProof.getNonPaddingProofs());
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
