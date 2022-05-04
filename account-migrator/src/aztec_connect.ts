import { RollupProcessor } from '@aztec/blockchain';
import { EthAddress } from '@aztec/barretenberg/address';
import { Timer } from '@aztec/barretenberg/timer';
import { RollupProofData } from '@aztec/barretenberg/rollup_proof';
import { JsonRpcProvider } from '@aztec/blockchain';
import { ProofId } from '@aztec/barretenberg/client_proofs';
import { OffchainAccountData } from '@aztec/barretenberg/offchain_tx_data';
import { Account } from './account';

export async function getAccountsConnect(options: any) {
  const blockTimer = new Timer();
  const ethereumProvider = new JsonRpcProvider(options.url);
  const rollupProcessor = new RollupProcessor(EthAddress.fromString(options.address), ethereumProvider);
  const blocks = await rollupProcessor.getRollupBlocksFrom(options.rollupId, options.confirmations);
  console.log(`Total num blocks returned: ${blocks.length} in ${blockTimer.s()}s`);

  const rollupProofs = blocks.map(block => RollupProofData.fromBuffer(block.rollupProofData));
  const innerProofs = rollupProofs.flatMap(outerProof => outerProof.innerProofData).filter(x => !x.isPadding());
  const offChainData = blocks.map(block => block.offchainTxData);
  const offChainAccountData = offChainData.flat().filter((data, index) => {
    return innerProofs[index].proofId === ProofId.ACCOUNT;
  });

  console.log(`Total num off chain data: ${offChainData.length}`);
  return offChainAccountData
    .map(data => {
      return OffchainAccountData.fromBuffer(data);
    })
    .map(x => {
      return {
        aliasId: x.accountAliasId,
        accountKey: x.accountPublicKey,
        spendingKeys: [x.spendingPublicKey1, x.spendingPublicKey2],
      } as Account;
    });
}
