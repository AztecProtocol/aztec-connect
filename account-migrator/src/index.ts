import { AccountData, InitHelpers } from '@aztec/barretenberg/environment';
import { WorldStateDb, RollupTreeId } from '@aztec/barretenberg/world_state_db';
import { NoteAlgorithms } from '@aztec/barretenberg/note_algorithms';
import { BarretenbergWasm } from '@aztec/barretenberg/wasm';
import { AccountAliasId, AccountId } from '@aztec/barretenberg/account_id';
import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { EthAddress } from '@aztec/barretenberg/address';
import { RollupProcessor } from './rollup_processor';
import { Web3Provider } from '@ethersproject/providers';
import { ethers } from 'ethers';
import { EthersAdapter } from '@aztec/blockchain';
import { RollupProofData } from './rollup_proof';
import { Command, InvalidArgumentError } from 'commander';
import * as filePath from 'path';

function parseAndCheckNumber(value: any, dummy: any): number {
  const parsedValue = parseInt(value, 10);
  if (isNaN(parsedValue)) {
    throw new InvalidArgumentError('Not a number.');
  }
  return parsedValue;
}

const program = new Command();
program
  .requiredOption('-d, --directory <dir>', 'Directory to output files')
  .requiredOption('-a, --address <address>', 'Address of rollup processor contract')
  .requiredOption('-u, --url <url>', 'Infura URL')
  .option('-r, --rollupId <rollupId>', 'Id of first required rollup', parseAndCheckNumber, 0)
  .option('-c, --confirmations <confirmations>', 'Num confirmations required on rollups', parseAndCheckNumber, 0)
  .option('-l, --logDuplicates', 'Log duplicate Public Key/Nonce/Signing Key combinations', false);
program.parse(process.argv);
const options = program.opts();

async function writeAndVerifyAccounts(accountsFile: string, accounts: AccountData[]): Promise<AccountData[]> {
  console.log(`Writing ${accounts.length} accounts to file: ${accountsFile}`);
  const bytesWritten = await InitHelpers.writeAccountTreeData(accounts, accountsFile);
  console.log(`Successfully written ${bytesWritten} bytes to accounts file`);

  const readAccounts = await InitHelpers.readAccountTreeData(accountsFile);

  if (!readAccounts) {
    throw new Error('Failed to write accounts to file!!');
  }

  if (accounts.length !== readAccounts.length) {
    throw new Error(
      `Number of accounts read from file was different to the number read from chain. Number from file: ${readAccounts.length}, number from chain: ${accounts.length}`,
    );
  }

  console.log('Successfully read back the same number of notes from file as there are on chain.');

  accounts.forEach((account, accountIndex) => {
    if (account.notes.note1.compare(readAccounts[accountIndex].notes.note1)) {
      throw new Error(`Note 1 of account index ${accountIndex} was different on file than it was on chain`);
    }
    if (account.notes.note2.compare(readAccounts[accountIndex].notes.note2)) {
      throw new Error(`Note 2 of account index ${accountIndex} was different on file than it was on chain`);
    }
    if (account.nullifier.compare(readAccounts[accountIndex].nullifier)) {
      throw new Error(`Nullifier of account index ${accountIndex} was different on file than it was on chain`);
    }
    if (account.alias.address.compare(readAccounts[accountIndex].alias.address)) {
      throw new Error(`Address of account alias index ${accountIndex} was different on file than it was on chain`);
    }
    if (account.alias.aliasHash.compare(readAccounts[accountIndex].alias.aliasHash)) {
      throw new Error(`Alias Hash of account alias index ${accountIndex} was different on file than it was on chain`);
    }
    if (account.alias.nonce !== readAccounts[accountIndex].alias.nonce) {
      throw new Error(`Nonce of account alias index ${accountIndex} was different on file than it was on chain`);
    }
    if (account.signingKeys.signingKey1.compare(readAccounts[accountIndex].signingKeys.signingKey1)) {
      throw new Error(
        `Signing Key 1 of account alias index ${accountIndex} was different on file than it was on chain`,
      );
    }
    if (account.signingKeys.signingKey2.compare(readAccounts[accountIndex].signingKeys.signingKey2)) {
      throw new Error(
        `Signing Key 2 of account alias index ${accountIndex} was different on file than it was on chain`,
      );
    }
  });

  console.log('Successfully verfied contents of accounts file');

  return accounts;
}

function buildSigningKeyStrings(address: GrumpkinAddress, nonce: number, singingKeys: Buffer[]): string[] {
  return singingKeys.map(
    key => `Public Key and Nonce: ${new AccountId(address, nonce).toString()} - Signing Key: ${key.toString('hex')}`,
  );
}

async function main() {
  console.log(`Started!!`);
  console.log('Args: ', options);
  const path = filePath.resolve(__dirname, options.directory);
  const accountsFile = path + '/accounts';
  const rootsFile = path + '/roots';
  const merkleDbPath = path + '/world_state.db';
  console.log(`Accounts will be written to ${accountsFile}`);
  console.log(`Roots will be written to ${rootsFile}`);

  const provider = new ethers.providers.JsonRpcProvider(options.url);
  const web3Provider = new Web3Provider(new EthersAdapter(provider));
  const rollupProcessor = new RollupProcessor(EthAddress.fromString(options.address), web3Provider);

  console.log(
    `Requesting blocks from rollupID ${options.rollupId} with at least ${options.confirmations} confirmations...`,
  );
  const blocks = await rollupProcessor.getRollupBlocksFrom(options.rollupId, options.confirmations);
  console.log(`Total num blocks returned: ${blocks.length}`);

  const rollupProofs = blocks.map(block => RollupProofData.fromBuffer(block.rollupProofData));
  const innerProofs = rollupProofs.map(outerProof => outerProof.innerProofData).flat();
  console.log(`Total num inner proofs: ${innerProofs.length}`);
  const accountProofs = innerProofs.filter(proof => proof.proofId === 1);
  console.log(`Total num account proofs: ${accountProofs.length}`);

  const accounts = new Array<AccountData>(accountProofs.length);

  const barretenberg = await BarretenbergWasm.new();
  const noteAlgos = new NoteAlgorithms(barretenberg);

  const migrations = new Map();
  const duplicateKeys = new Set();

  console.log('Generating nullifiers, notes and account aliases etc...');
  for (let i = 0; i < accountProofs.length; i++) {
    const proof = accountProofs[i];
    const accountAliasId = AccountAliasId.fromBuffer(proof.assetId);
    const accountKey = new GrumpkinAddress(Buffer.concat([proof.publicInput, proof.publicOutput]));
    const signingKey1 = proof.inputOwner;
    const signingKey2 = proof.outputOwner;
    const aliasString = accountAliasId.aliasHash.toString();
    const oldNonce = migrations.get(aliasString) ?? 0; // if we haven't seen this account before, it's initial nonce is 0
    migrations.set(aliasString, accountAliasId.accountNonce);
    if (oldNonce > accountAliasId.accountNonce) {
      console.log(
        `New nonce is lower than previous nonce!! New nonce: ${accountAliasId.accountNonce}, old nonce: ${oldNonce}`,
      );
    }
    const account: AccountData = {
      nullifier:
        oldNonce === accountAliasId.accountNonce
          ? Buffer.alloc(32, 0)
          : noteAlgos.accountAliasIdNullifier(accountAliasId),
      notes: {
        note1: noteAlgos.accountNoteCommitment(accountAliasId, accountKey, signingKey1),
        note2: noteAlgos.accountNoteCommitment(accountAliasId, accountKey, signingKey2),
      },
      alias: {
        aliasHash: accountAliasId.aliasHash.toBuffer(),
        address: accountKey.toBuffer(),
        nonce: accountAliasId.accountNonce,
      },
      signingKeys: {
        signingKey1,
        signingKey2,
      },
    };
    accounts[i] = account;
    if (options.logDuplicates) {
      buildSigningKeyStrings(accountKey, accountAliasId.accountNonce, [signingKey1, signingKey2]).forEach(x => {
        if (duplicateKeys.has(x)) {
          console.log(`Duplicate Account/Signing key: ${x}`);
        }
        duplicateKeys.add(x);
      });
    }
  }
  console.log('Completed generation, writing files...');
  await writeAndVerifyAccounts(accountsFile, accounts);
  console.log('Completed writing files, now building new data and nullifier trees...');

  const merkleTree = new WorldStateDb(merkleDbPath);
  await merkleTree.start();
  if (
    (await merkleTree.getSize(RollupTreeId.DATA)) !== BigInt(0) ||
    (await merkleTree.getSize(RollupTreeId.NULL)) !== BigInt(0)
  ) {
    throw new Error('Ensure world_state.db is removed from disk and run again. Merkle trees are not empty');
  }
  console.log('Generating data tree');
  const dataAndRootsRoots = await InitHelpers.populateDataAndRootsTrees(
    accounts,
    merkleTree,
    RollupTreeId.DATA,
    RollupTreeId.ROOT,
  );
  console.log('Generating nullifier tree');
  const nullRoot = await InitHelpers.populateNullifierTree(accounts, merkleTree, RollupTreeId.NULL);
  merkleTree.stop();
  const roots = { dataRoot: dataAndRootsRoots.dataRoot, nullRoot, rootsRoot: dataAndRootsRoots.rootsRoot };
  console.log('Generated roots: ', {
    dataRoot: roots.dataRoot.toString('hex'),
    nullRoot: roots.nullRoot.toString('hex'),
    rootsRoot: roots.rootsRoot.toString('hex'),
  });
  await InitHelpers.writeRoots(roots, rootsFile);
  const newRoots = await InitHelpers.readRoots(rootsFile);
  if (!newRoots) {
    throw new Error('Failed to write roots to file!!');
  }
  if (!roots.dataRoot.equals(newRoots.dataRoot)) {
    throw new Error(
      `Data root read back from file did not match the generated value. Generated: ${roots.dataRoot.toString(
        'hex',
      )}, file: ${newRoots.dataRoot.toString('hex')}`,
    );
  }
  if (!roots.nullRoot.equals(newRoots.nullRoot)) {
    throw new Error(
      `Null root read back from file did not match the generated value. Generated: ${roots.nullRoot.toString(
        'hex',
      )}, file: ${newRoots.nullRoot.toString('hex')}`,
    );
  }
  if (!roots.rootsRoot.equals(newRoots.rootsRoot)) {
    throw new Error(
      `Roots root read back from file did not match the generated value. Generated: ${roots.rootsRoot.toString(
        'hex',
      )}, file: ${newRoots.rootsRoot.toString('hex')}`,
    );
  }
  console.log('Successfully verified roots written to file');
}

main().catch(err => {
  console.log(`Error thrown: ${err}`);
  process.exit(1);
});
