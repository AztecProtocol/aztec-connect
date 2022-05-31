import { AccountData, InitHelpers } from '@aztec/barretenberg/environment';
import { WorldStateDb, RollupTreeId } from '@aztec/barretenberg/world_state_db';
import { NoteAlgorithms } from '@aztec/barretenberg/note_algorithms';
import { BarretenbergWasm } from '@aztec/barretenberg/wasm';
import { AccountId } from '@aztec/barretenberg/account_id';
import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { Timer } from '@aztec/barretenberg/timer';
import { getAccountsLegacy } from './legacy_aztec';
import { getAccountsConnect } from './aztec_connect';
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
  .requiredOption('-f, --from <rollupIdFrom>', 'Id of first required rollup', parseAndCheckNumber, 0)
  .requiredOption(
    '-c, --confirmations <confirmations>',
    'Num confirmations required on rollups',
    parseAndCheckNumber,
    3,
  )
  .option('-t, --to <rollupIdTo>', 'Id of last required rollup', parseAndCheckNumber)
  .option('-l, --logDuplicates', 'Log duplicate Public Key/Nonce/Signing Key combinations', false)
  .option('-z, --aztecConnect', 'Connects to an aztec connect version of the rollup contract', false)
  .option(
    '-v, --verify <chainId>',
    "Don't generate output files, just calculate the roots and verify against those stored for the given chain id",
    parseAndCheckNumber,
  );
program.parse(process.argv);
const options = program.opts();

async function writeAndVerifyAccounts(accountsFile: string, accounts: AccountData[]): Promise<AccountData[]> {
  console.log(`Writing ${accounts.length} accounts to file: ${accountsFile}`);
  const bytesWritten = await InitHelpers.writeAccountTreeData(accounts, accountsFile);
  console.log(`Successfully wrote ${bytesWritten} bytes to accounts file`);

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
    if (account.nullifiers.nullifier1.compare(readAccounts[accountIndex].nullifiers.nullifier1)) {
      throw new Error(`Nullifier 1 of account index ${accountIndex} was different on file than it was on chain`);
    }
    if (account.nullifiers.nullifier2.compare(readAccounts[accountIndex].nullifiers.nullifier2)) {
      throw new Error(`Nullifier 2 of account index ${accountIndex} was different on file than it was on chain`);
    }
    if (account.alias.address.compare(readAccounts[accountIndex].alias.address)) {
      throw new Error(`Address of account alias index ${accountIndex} was different on file than it was on chain`);
    }
    if (account.alias.aliasHash.compare(readAccounts[accountIndex].alias.aliasHash)) {
      throw new Error(`Alias Hash of account alias index ${accountIndex} was different on file than it was on chain`);
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
  const merkleDbPath = path + '/world_state.db';

  const toValue = options.to === undefined ? '' : `to ${options.to}`;
  console.log(
    `Requesting blocks from rollupID ${options.from} ${toValue} with at least ${options.confirmations} confirmations...`,
  );
  const accountProofs = options.aztecConnect ? await getAccountsConnect(options) : await getAccountsLegacy(options);

  const accountsMap: { [key: string]: AccountData } = {};

  const barretenberg = await BarretenbergWasm.new();
  const noteAlgos = new NoteAlgorithms(barretenberg);

  const migrations = new Map();
  const duplicateKeys = new Set();

  console.log('Generating nullifiers, notes and account aliases etc...');
  const parseTimer = new Timer();
  for (let i = 0; i < accountProofs.accounts.length; i++) {
    const {
      aliasId: accountAliasId,
      accountKey,
      spendingKeys: [signingKey1, signingKey2],
    } = accountProofs.accounts[i];

    const aliasString = accountAliasId.aliasHash.toString();
    const oldNonce = migrations.get(aliasString) ?? 0; // if we haven't seen this account before, it's initial nonce is 0
    migrations.set(aliasString, accountAliasId.accountNonce);
    if (oldNonce > accountAliasId.accountNonce) {
      console.log(
        `New nonce is lower than previous nonce!! New nonce: ${accountAliasId.accountNonce}, old nonce: ${oldNonce}`,
      );
    }
    const account: AccountData = {
      nullifiers: {
        nullifier1: noteAlgos.accountAliasHashNullifier(accountAliasId.aliasHash),
        nullifier2: noteAlgos.accountPublicKeyNullifier(accountKey),
      },
      notes: {
        note1: noteAlgos.accountNoteCommitment(accountAliasId.aliasHash, accountKey, signingKey1),
        note2: noteAlgos.accountNoteCommitment(accountAliasId.aliasHash, accountKey, signingKey2),
      },
      alias: {
        aliasHash: accountAliasId.aliasHash.toBuffer(),
        address: accountKey.toBuffer(),
      },
      signingKeys: {
        signingKey1,
        signingKey2,
      },
    };
    if (options.logDuplicates) {
      buildSigningKeyStrings(accountKey, accountAliasId.accountNonce, [signingKey1, signingKey2]).forEach(x => {
        if (duplicateKeys.has(x)) {
          console.log(`Duplicate Account/Signing key: ${x}`);
        }
        duplicateKeys.add(x);
      });
    }
    accountsMap[accountKey.toString()] = account;
  }
  console.log(`Completed in ${parseTimer.s()}s`);
  const accounts = Object.values(accountsMap);
  // if chain id is specified then we are just verifying the roots against those stored for this chain id
  if (options.verify === undefined) {
    console.log(`Writing accounts data to file ${accountsFile}`);
    await writeAndVerifyAccounts(accountsFile, accounts);
  }
  console.log('Building new data and nullifier trees...');

  const merkleTree = new WorldStateDb(merkleDbPath);
  await merkleTree.start();
  if (merkleTree.getSize(RollupTreeId.DATA) !== BigInt(0) || merkleTree.getSize(RollupTreeId.NULL) !== BigInt(0)) {
    throw new Error('Ensure world_state.db is removed from disk and run again. Merkle trees are not empty');
  }
  const dataTreeTimer = new Timer();
  const dataAndRootsRoots = await InitHelpers.populateDataAndRootsTrees(
    accounts,
    merkleTree,
    RollupTreeId.DATA,
    RollupTreeId.ROOT,
  );
  console.log(`Completed data tree in ${dataTreeTimer.s()}s`);
  console.log('Generating nullifier tree');
  const nullifierTimer = new Timer();
  const nullRoot = await InitHelpers.populateNullifierTree(accounts, merkleTree, RollupTreeId.NULL);
  merkleTree.stop();
  console.log(`Completed nullifier tree in ${nullifierTimer.s()}s`);
  const roots = { dataRoot: dataAndRootsRoots.dataRoot, nullRoot, rootsRoot: dataAndRootsRoots.rootsRoot };
  console.log('Generated roots: ', {
    dataRoot: roots.dataRoot.toString('hex'),
    nullRoot: roots.nullRoot.toString('hex'),
    rootsRoot: roots.rootsRoot.toString('hex'),
  });
  console.log(`Initial data size: ${dataAndRootsRoots.dataSize}`);
  console.log(`First rollup Id: ${accountProofs.earliestRollupId}`);
  console.log(`Last rollup Id: ${accountProofs.lastestRollupId}`);

  // if chain id is specified then we are just verifying the roots against those stored for this chain id
  if (options.verify) {
    const initRootsFromEnvironment = InitHelpers.getInitRoots(options.verify);
    if (roots.dataRoot.equals(initRootsFromEnvironment.dataRoot)) {
      console.log(
        `Data root comparison SUCCEEDED ${roots.dataRoot.toString(
          'hex',
        )} == ${initRootsFromEnvironment.dataRoot.toString('hex')}`,
      );
    } else {
      console.log(
        `Data root comparison FAILED ${roots.dataRoot.toString('hex')} != ${initRootsFromEnvironment.dataRoot.toString(
          'hex',
        )}`,
      );
    }

    if (roots.rootsRoot.equals(initRootsFromEnvironment.rootsRoot)) {
      console.log(
        `Roots root comparison SUCCEEDED ${roots.rootsRoot.toString(
          'hex',
        )} == ${initRootsFromEnvironment.rootsRoot.toString('hex')}`,
      );
    } else {
      console.log(
        `Roots root comparison FAILED ${roots.rootsRoot.toString(
          'hex',
        )} != ${initRootsFromEnvironment.rootsRoot.toString('hex')}`,
      );
    }

    if (roots.nullRoot.equals(initRootsFromEnvironment.nullRoot)) {
      console.log(
        `Null root comparison SUCCEEDED ${roots.nullRoot.toString(
          'hex',
        )} == ${initRootsFromEnvironment.nullRoot.toString('hex')}`,
      );
    } else {
      console.log(
        `Null root comparison FAILED ${roots.nullRoot.toString('hex')} != ${initRootsFromEnvironment.nullRoot.toString(
          'hex',
        )}`,
      );
    }
  }
}

main().catch(err => {
  console.log(`Error thrown: ${err}`);
  process.exit(1);
});
