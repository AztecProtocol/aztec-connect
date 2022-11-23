// Barretenberg imports
import { createLogger } from '@aztec/barretenberg/log';

// Local imports
import { AccountHardener } from './account_hardener.js';

// Globals
const log = createLogger('am:harden_accounts');

/**
 * Harden command types: full sequence of steps or just a single step
 */
export enum HardenCommand {
  FULL_SEQUENCE,
  CREATE_HARDENER,
  GEN_HARDEN_PROOFS,
  HARDEN_ACCOUNTS,
  VERIFY_HARDENED,
}

/**
 * Execute a hardner command (either the full sequence of steps or just one step).
 *
 * @remarks
 * Create and initialize AccountHardener and execute the steps associated with
 * the provided command.
 * Most commands require that accounts be 'pulled' first.
 *
 * @param command - enum specifying command/step(s) to run on the AccountHardener
 * @param options - from command-line parser in `index.ts`
 *
 * @public
 */
export async function harden(command: HardenCommand, options: any) {
  log(`Executing hardener command: ${HardenCommand[command]}`);
  const hardener = new AccountHardener(
    options.port,
    options.address,
    options.url,
    options.rollupHost,
    options.confirmations,
    options.from,
    options.to,
    options.numWorkers,
    options.memoryDb,
    command != HardenCommand.CREATE_HARDENER && command != HardenCommand.FULL_SEQUENCE, // useCachedHardener - use file cache post-hardener-creation
    options.liveRun,
  );

  await hardener.init();
  if (command == HardenCommand.FULL_SEQUENCE) {
    log('Executing the full sequence of hardener steps');
    await hardener.pullAccountsToHarden();
    await hardener.createHardenerAccount();
    await hardener.generateAndStoreProofs();
    await hardener.monitorAndSubmitProofs();
    await hardener.verifyAccountsHardened();
  } else {
    log(`Executing single hardener step: ${HardenCommand[command]}`);

    // All commands except HARDEN_ACCOUNTS require that accounts be pulled from the blockchain first.
    // Don't need to pull accounts when just submitting harden proofs to falafel (HARDEN_ACCOUNTS mode)
    // because they should all already be stored to in file.
    if (command != HardenCommand.HARDEN_ACCOUNTS) {
      await hardener.pullAccountsToHarden();
    }

    switch (command) {
      case HardenCommand.CREATE_HARDENER: {
        await hardener.createHardenerAccount();
        break;
      }
      case HardenCommand.GEN_HARDEN_PROOFS: {
        await hardener.generateAndStoreProofs();
        break;
      }
      case HardenCommand.HARDEN_ACCOUNTS: {
        await hardener.monitorAndSubmitProofs();
        break;
      }
      case HardenCommand.VERIFY_HARDENED: {
        await hardener.verifyAccountsHardened();
        break;
      }
    }
  }

  await hardener.stop();
  process.exit();
}
