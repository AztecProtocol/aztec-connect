import { RollupProcessor } from './rollup_processor';
import { EthAddress } from '@aztec/barretenberg/address';
import { Timer } from '@aztec/barretenberg/timer';
import { Web3Provider } from '@ethersproject/providers';
import { ethers } from 'ethers';
import { EthersAdapter } from '@aztec/blockchain';
import { RollupProofData } from './rollup_proof';
import { Account, Accounts } from './account';
import { AccountAliasId } from '@aztec/barretenberg/account_id';
import { GrumpkinAddress } from '@aztec/barretenberg/address';

export async function getAccountsLegacy(options: any) {
  const blockTimer = new Timer();
  const provider = new ethers.providers.JsonRpcProvider(options.url);
  const web3Provider = new Web3Provider(new EthersAdapter(provider));
  const rollupProcessor = new RollupProcessor(EthAddress.fromString(options.address), web3Provider);
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
  const innerProofs = rollupProofs.map(outerProof => outerProof.innerProofData).flat();
  console.log(`Total num inner proofs: ${innerProofs.length}`);
  const accountProofs = innerProofs.filter(proof => proof.proofId === 1);
  console.log(`Total num account proofs: ${accountProofs.length}`);
  const accounts = accountProofs.map(proof => {
    return {
      aliasId: AccountAliasId.fromBuffer(proof.assetId),
      accountKey: new GrumpkinAddress(Buffer.concat([proof.publicInput, proof.publicOutput])),
      spendingKeys: [proof.inputOwner, proof.outputOwner],
    } as Account;
  });
  return {
    earliestRollupId: filteredBlocks[0].rollupId,
    lastestRollupId: filteredBlocks[filteredBlocks.length - 1].rollupId,
    accounts: accounts,
  } as Accounts;
}
