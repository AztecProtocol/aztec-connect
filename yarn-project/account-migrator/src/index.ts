#!/usr/bin/env node

import { migrate } from './migrate.js';
import { harden, HardenCommand } from './harden.js';
import { Command, InvalidArgumentError } from 'commander';

const program = new Command();

/**
 * Parse a number in base-10 and ensure it is valid
 */
function parseAndCheckNumber(value: any, _dummy: any): number {
  const parsedValue = parseInt(value, 10);
  if (isNaN(parsedValue)) {
    throw new InvalidArgumentError('Not a number.');
  }
  return parsedValue;
}

/**
 * Add harden-relevant options to a command
 */
function withHardenOptions(command: Command) {
  command
    .requiredOption('-p, --port <port>', 'HttpJobServer port')
    .requiredOption('-a, --address <address>', 'Address of rollup processor contract')
    .requiredOption('-u, --url <url>', 'Infura URL', 'http://localhost:8545')
    .requiredOption('-r, --rollupHost <rollupHost>', 'Rollup Host URL', 'http://localhost:8081')
    .requiredOption(
      '-c, --confirmations <confirmations>',
      'Num confirmations required on rollups',
      parseAndCheckNumber,
      3,
    )
    .option('-f, --from <rollupIdFrom>', 'Id of first required rollup', parseAndCheckNumber, 0)
    .option('-t, --to <rollupIdTo>', 'Id of last required rollup', parseAndCheckNumber, Infinity)
    .option('-w, --numWorkers <wkrs>', 'Number of workers for note decryptor and pedersen', parseAndCheckNumber, 1)
    .option('-m, --memoryDb <mem>', 'Flag indicating whether to use a memoryDB', false)
    .option('-l, --liveRun <live>', 'Flag indicating whether this is a live run (testnet/mainnet)', false);
}

/**
 * Parse account migrator command-line subcommands (migrate, harden) and options.
 * Call the relevant command functions.
 */
async function main() {
  // migrate command
  program
    .command('migrate')
    .description('Migrate accounts to another rollup')
    .requiredOption('-d, --directory <dir>', 'Directory to output files', './data')
    .requiredOption('-a, --address <address>', 'Address of rollup processor contract')
    .requiredOption('-u, --url <url>', 'Infura URL', 'http://localhost:8545')
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
    )
    .action(migrate);

  // harden command
  const hardenCommand = program
    .command('harden')
    .description("Harden accounts by migrating an alias without spending keys to the account's inverted public key");

  // harden subcommands, each with the same set of options defined in the `withHardenOptions` helper
  withHardenOptions(
    hardenCommand
      .command('fullSequence')
      .description('Run all sub-steps to harden all accounts')
      .action(options => harden(HardenCommand.FULL_SEQUENCE, options)),
  );
  // This command may prove useful in the future
  //withHardenOptions(
  //  hardenCommand
  //    .command('pullAccounts')
  //    .description('Just pull all accounts - probably don\'t want to run this alone')
  //    .action(options => harden(HardenCommand.CREATE_HARDENER, options)),
  //);
  withHardenOptions(
    hardenCommand
      .command('createHardener')
      .description('Create hardener account that will be used to harden all vulnerable accounts')
      .action(options => harden(HardenCommand.CREATE_HARDENER, options)),
  );
  withHardenOptions(
    hardenCommand
      .command('genHardenProofs')
      .description('Generate proofs that can be used to harden vulnerable accounts')
      .action(options => harden(HardenCommand.GEN_HARDEN_PROOFS, options)),
  );
  withHardenOptions(
    hardenCommand
      .command('hardenAccounts')
      .description('Harden accounts by submitting previously generated proofs')
      .action(options => harden(HardenCommand.HARDEN_ACCOUNTS, options)),
  );
  withHardenOptions(
    hardenCommand
      .command('verifyHardened')
      .description('Verify that all accounts in the block range have been hardened')
      .action(options => harden(HardenCommand.VERIFY_HARDENED, options)),
  );

  await program.parseAsync(process.argv);
}

main().catch(err => {
  console.log(`Error thrown: ${err}`);
  process.exit(1);
});
