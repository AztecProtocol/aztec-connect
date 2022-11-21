// SDK imports
import { AztecSdk, createAztecSdk } from '@aztec/sdk';
import { EthAddress, WalletProvider, TxSettlementTime } from '@aztec/sdk';

// Barretenberg imports
import { sleep } from '@aztec/barretenberg/sleep';
import { createLogger, createDebugLogger } from '@aztec/barretenberg/log';
import { HashPath } from '@aztec/barretenberg/merkle_tree';
import { NetCrs } from '@aztec/barretenberg/crs';
import { BarretenbergWasm, WorkerPool } from '@aztec/barretenberg/wasm';
import { PooledPippenger } from '@aztec/barretenberg/pippenger';
import { PooledFft } from '@aztec/barretenberg/fft';
import { Schnorr, SinglePedersen, Blake2s } from '@aztec/barretenberg/crypto';
import { AccountTx, AccountProver, UnrolledProver } from '@aztec/barretenberg/client_proofs';
import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { TxId } from '@aztec/barretenberg/tx_id';
import { WorldState } from '@aztec/barretenberg/world_state';
import { InitHelpers } from '@aztec/barretenberg/environment';
import { RollupProofData, InnerProofData } from '@aztec/barretenberg/rollup_proof';
import { AliasHash } from '@aztec/barretenberg/account_id';
import { OffchainAccountData } from '@aztec/barretenberg/offchain_tx_data';
import { ProofId } from '@aztec/barretenberg/client_proofs';
import { Tx, txToJson, txFromJson } from '@aztec/barretenberg/rollup_provider';

// Halloumi imports
import { HttpJobServer } from '@aztec/halloumi/proof_generator';

// External imports
import fs from 'fs';
import path from 'path';
import { mkdirSync } from 'fs';
import { randomBytes } from 'crypto';
import {default as levelup, LevelUp } from 'levelup';
import {default as leveldown} from 'leveldown';
import {default as memdown} from 'memdown';

// Local imports
import { createFundedWalletProvider } from './create_funded_wallet_provider.js';
import { getRollupBlocks } from './get_rollup_blocks.js';
import { numToUInt32BE } from './rollup_proof.js';
import { SecondClassRollupProviderLimited } from './second_class_rollup_provider_limited.js';

const log = createLogger('am:accountHardener');
const debug = createDebugLogger('am:debug:accountHardener');

const BATCH_SIZE = 10;
const MAX_PENDING_SECOND_CLASS_TXS = 2000;
const GEN_DIR = './gen/';
const PROOFS_DIR = GEN_DIR + 'account-proofs/';
const BATCH_COUNT_FILE = GEN_DIR + 'num_batches.json';
const NEXT_BATCH_FILE = GEN_DIR + 'next_batch.json';
const BATCH_FILE_PREFIX = PROOFS_DIR + 'account_proofs_block_';
const HARDENER_FILE = GEN_DIR + 'hardener.json';

/**
 * An AccountHardener is responsible for hardening accounts vulnerable to attack as per
 * the account bug (internal PR #1490). It does so by creating a new account with an alias,
 * generating proofs for all vulnerable accounts to migrate that alias to each account's
 * negated account public key, submitting those proofs to falafel in batches, and finally
 * verifying that all accounts have been successfully hardened. The four stages are named:
 * `createHardener`, `generateAndStoreProofs`, `monitorAndSubmitProofs`, and `verifyAccountsHardened`.
 *
 * @remarks
 * `init` is essentially an async constructor. It must be called and awaited before any other
 * methods are called.
 * `stop` should be called to stop and tear down members.
 * If steps are not executed in the order shown below, behavior is undefined.
 * All four of the core steps save results to persistent files and therefore can be run
 * as part of separate program executions (but still in this order).
 *
 * @example
 * ```
 * const hardener = new AccountHardener();
 * hardener.init();
 * hardener.createHardener();
 * hardener.generateAndStoreProofs();
 * hardener.monitorAndSubmitProofs();
 * hardener.verifyAccountsHardened();
 * hardener.stop();
 * ```
 *
 * @public
 */
export class AccountHardener {
  private ethPublicKey!: EthAddress; // eth public key for the provided private key
  private ethPrivateKey!: Buffer;
  private allAccountsEver = new Map<string, GrumpkinAddress>();
  private accountsProcessed = new Set<string>();
  private walletProvider!: WalletProvider;
  private rollupProvider!: SecondClassRollupProviderLimited;
  private sdk!: AztecSdk;
  private wasm!: BarretenbergWasm;
  private worldState!: WorldState;
  private proofGenerator!: HttpJobServer;
  private accountProver!: AccountProver;
  private schnorr!: Schnorr;
  private hardener!: HardenerAccountInfo;
  private accounts!: GrumpkinAddress[];
  private numBatches!: number;
  // lastRollupId is used to keep track of the latest rollupId when checking new blocks for tx settlement
  private lastRollupId = -1;

  constructor(
    private halloumiPort: number,
    private rollupAddress: string,
    private infuraUrl: string,
    private rollupHost: string,
    private confirmations: number,
    private rollupIdFrom: number,
    private rollupIdTo: number,
    private numWorkers: number,
    private memoryDb: boolean,
    private useCachedHardener: boolean = false,
    private liveRun: boolean = false,
  ) {}

  /////////////////////////////////////////////////////////////////////////////
  // PUBLIC FUNCTIONS
  /////////////////////////////////////////////////////////////////////////////

  /**
   * Initialize an AccountHardner and all of its necessary subcomponents including the SDK,
   * HttpJobServer/Halloumi, Barretenberg WASM, RollupProvider, AccountProver, WorldState and
   * other prerequisite components.
   *
   * @remarks
   * This method is meant to be an asynchronous supplement to the constructor. It must be
   * called directly after the constructor before an AccountHardener instance is used.
   * This method also initializes the "Hardener Account" info either from scratch
   * (from the loaded ethereum key pair) or from file (if cached previously).
   */
  public async init() {
    log('Initializing account hardener');

    debug('Setting up WalletProvider');
    if (!process.env.ETHEREUM_PRIVATE_KEY) {
      throw Error('Must set ETHEREUM_PRIVATE_KEY in env');
    }
    this.walletProvider = await createFundedWalletProvider(
      this.infuraUrl,
      1,
      this.liveRun ? 0 : 1, // when testing, give account ETH to fund flushes
    );

    debug('Initializing RollupProvider');
    this.rollupProvider = new SecondClassRollupProviderLimited(this.rollupHost);

    debug('Creating BarretenbergWASM and WorkerPool');
    this.wasm = await BarretenbergWasm.new();
    const pool = await WorkerPool.new(this.wasm, this.numWorkers);

    this.proofGenerator = new HttpJobServer(this.halloumiPort);
    await this.proofGenerator.start();

    debug('Getting circuit size and downloading CRS');
    const circuitSize = AccountProver.getCircuitSize();
    const crs = new NetCrs(circuitSize);
    await crs.init();

    debug('Creating Schnorr');
    this.schnorr = new Schnorr(this.wasm);
    debug('Creating Pippenger');
    const pippenger = new PooledPippenger(pool);
    await pippenger.init(crs.getData());
    debug('Creating FFT');
    const fft = new PooledFft(pool);
    await fft.init(circuitSize);
    debug('Creating provers');
    const unrolledProver = new UnrolledProver(pool.workers[0], pippenger, fft);
    this.accountProver = new AccountProver(unrolledProver);

    debug('Computing new proving key');
    await this.accountProver.computeKey();

    debug('Creating SDK');
    this.sdk = await createAztecSdk(this.walletProvider, {
      serverUrl: this.rollupHost,
      memoryDb: this.memoryDb,
      minConfirmation: this.confirmations,
      //debug: 'bb:*',  // setting this here overrides debug logger set in this module
    });

    debug('Initializing WorldState');
    this.worldState = new WorldState(getLevelDb(this.memoryDb), new SinglePedersen(this.wasm));
    await this.worldState.init(0); // subTreeDepth is 0

    // Initialize Hardener Account information using eth account,
    // and optionally load Hardener aliasHash, path, and index
    await this.initHardenerAccountInfo();
    if (this.useCachedHardener) {
      this.loadHardenerInfo();
    }
  }

  /**
   * Stop/tear-down this instance of the AccountHardener.
   */
  public async stop() {
    log('Stopping account hardener');
    await this.sdk.destroy();
    this.proofGenerator.stop();
  }

  /**
   * Pull rollup blocks and keep track of all accounts created.
   *
   * @remarks
   * Other methods rely on this method for initialization of account/batch related fields.
   * Specifically: `createHardener`, `generateAndStoreProofs`, and `verifyAccountsHardened`.
   * Updates world state tree for each account detected.
   * Ensures that the list of accounts is 'unique' (no duplicates).
   * Store batch count to file.
   */
  public async pullAccountsToHarden() {
    debug('Pulling initial accounts and accounts from rollup blocks');

    const initialState = await this.rollupProvider.getInitialWorldState();
    const initialAccounts = InitHelpers.parseAccountTreeData(initialState.initialAccounts);

    const notes = initialAccounts.flatMap(x => [x.notes.note1, x.notes.note2]);
    debug(`Number of initial account notes ${notes.length}`);

    // unique target accounts found within provided block range
    const targetAccounts = new Map<string, GrumpkinAddress>();

    // Keep track of accounts in a Map for now to ensure no duplicates
    for (let a = 0; a < initialAccounts.length; a++) {
      const address = new GrumpkinAddress(initialAccounts[a].alias.address);
      this.allAccountsEver.set(address.toString(), address);
      if (this.rollupIdFrom == 0) {
        targetAccounts.set(address.toString(), address);
      }
    }
    debug(`Number of unique initial accounts: ${this.allAccountsEver.size}`);

    // Insert genesis accounts into WorldState
    await this.worldState.insertElements(0, notes);
    debug(`WorldState ROOT (notes only): ${this.worldState.getRoot().toString('hex')}`);

    // Get ALL blocks from rollup and decode contained data
    const filteredBlocks = await getRollupBlocks({
      url: this.infuraUrl,
      address: this.rollupAddress,
      confirmations: this.confirmations,
      from: 0,
      to: Infinity,
    });


    // Insert all notes in rollup blocks into WorldState
    for (let i = 0; i < filteredBlocks.length; i++) {
      const block = filteredBlocks[i];
      const rollupProof = RollupProofData.decode(block.encodedRollupProofData);
      const innerProofs = rollupProof.innerProofData;
      const commitments = innerProofs.flatMap(x => [x.noteCommitment1, x.noteCommitment2]);
      debug(`----------------------------------------------------------------`);
      debug(`Rollup ID: ${block.rollupId}`);
      await this.worldState.insertElements(rollupProof.dataStartIndex, commitments);
      debug(`Inserted ${commitments.length} commitments to WorldState @ dataStartIndex ${rollupProof.dataStartIndex}`);

      const innerProof = rollupProof.innerProofData.flat().filter(x => !x.isPadding());
      const offChainAccountData = block.offchainTxData
        .flat()
        .filter((_, index) => innerProof[index].proofId == ProofId.ACCOUNT);

      const accountsFromBlock = offChainAccountData.map(data => OffchainAccountData.fromBuffer(data).accountPublicKey);
      debug(`Found ${accountsFromBlock.length} accounts in this rollup block`);
      // Add accounts to unique list/Map of all accounts ever
      accountsFromBlock.forEach(acc => this.allAccountsEver.set(acc.toString(), acc));

      // While within the provided rollup/block range, add discovered accounts to list of target accounts
      if (block.rollupId >= this.rollupIdFrom && block.rollupId <= this.rollupIdTo) {
        accountsFromBlock.forEach(acc => targetAccounts.set(acc.toString(), acc));
      }
    }
    // lastRollupId is useful when checking new blocks for new tx settlement
    this.lastRollupId = filteredBlocks.length > 0 ? filteredBlocks[filteredBlocks.length - 1].rollupId : -1;
    // Get the WorldState root (should match falafel root)
    debug(`Last Rollup ID: ${this.lastRollupId}`);
    debug(`Total Data Size: ${this.worldState.getSize()}`);
    debug(`WorldState ROOT: ${this.worldState.getRoot().toString('hex')}`);

    // Convert Map of unique accounts to array for easier iteration
    this.accounts = Array.from(targetAccounts.values());

    this.numBatches = Math.ceil(this.accounts.length / BATCH_SIZE);
    log(`${this.allAccountsEver.size} accounts exist in the rollup`);
    log(`${this.accounts.length} target accounts were found in rollupId range ${this.rollupIdFrom}:${this.rollupIdTo}`);
    log(
      `Proofs for these target accounts can be generated and submitted in ${this.numBatches} batches of size ${BATCH_SIZE}`,
    );

    writeFileSafe(BATCH_COUNT_FILE, JSON.stringify(this.numBatches));
    writeFileSafe(NEXT_BATCH_FILE, '0');
  }

  /**
   * Generates account creation proof for hardener, submits to falafel, awaits settlement
   * `pullAccountsToHarden` must be called before this method to ensure merkle tree is correct.
   *
   * @remarks
   * Submits the account creation proof as a second-class TX.
   * Awaits the TX's settlement by checking all TXs in each new rollup blocks, * sleeping,
   * and checking again.
   * Updates the worldstate tree with each new account-creation TX found.
   * Assumes that any new accounts created in these blocks are hardened on-creation
   * (account-bug is already fixed).
   * The HardenerAccountInfo type is used to group all information relevant to the 'hardener' account.
   * Stores the hardener info to file for later use by subsequent calls to the AccountHardener.
   */
  public async createHardenerAccount() {
    log('Creating one new account to be used for many migrations.');

    const newAccountTx = new AccountTx(
      this.worldState.getRoot(),
      this.hardener.accountPublicKey, // accountPublicKey
      this.hardener.accountPublicKey, // newAccountPublicKey
      this.hardener.spendingPublicKey, // spendingPublicKey
      this.hardener.spendingPublicKey, // newSpendingPublicKey
      this.hardener.aliasHash, // aliasHash
      true, // create
      false, // migrate
      0, // accountIndex
      this.worldState.buildZeroHashPath(32), // accountPath
      this.hardener.accountPublicKey, // spendingPublicKey
    );
    // Create signing data for tx
    const signingData = await this.accountProver.computeSigningData(newAccountTx);
    debug(`Signing data: 0x${signingData.toString('hex')}`);

    // Construct Schnorr signature using user's accountPrivateKey to sign data
    const signature = this.schnorr.constructSignature(signingData, this.hardener.accountPrivateKey);
    debug(`Schnorr signature: ${signature.toString()}`);

    debug('Creating account proof via Halloumi/HttpJobServer');
    const proof = await this.proofGenerator.createProof(
      Buffer.concat([numToUInt32BE(ProofId.ACCOUNT), newAccountTx.toBuffer(), signature.toBuffer()]),
    );
    debug(`Proof size: ${proof.length}`);

    const offchainTxData = new OffchainAccountData(
      this.hardener.accountPublicKey,
      this.hardener.aliasHash,
      this.hardener.spendingPublicKey.x(),
      this.hardener.spendingPublicKey.x(),
      0, // txRefNo
    );
    const finalNewAccountTx: Tx = {
      proofData: proof,
      offchainTxData: offchainTxData.toBuffer(),
    };
    debug('Account creation TX submitted');

    const txId = (await this.rollupProvider.sendSecondClassTxs([finalNewAccountTx]))[0] as TxId;
    debug(`TxId submitted: ${txId}`);

    const txs = await this.rollupProvider.getPendingTxs();
    debug(`TxId pending: ${txs[0].txId}`);

    if (!this.liveRun) {
      await this.flushRollup();
    }

    let txSettled = false;
    log('Awaiting TX settlement...');
    while (!txSettled) {
      const filteredBlocks = await getRollupBlocks({
        url: this.infuraUrl,
        address: this.rollupAddress,
        confirmations: this.confirmations,
        from: this.lastRollupId + 1,
        to: this.rollupIdTo,
      });
      for (let i = 0; i < filteredBlocks.length; i++) {
        const block = filteredBlocks[i];
        const rollupProof = RollupProofData.decode(block.encodedRollupProofData);
        const innerProofs = rollupProof.innerProofData;
        const commitments = innerProofs.flatMap(x => [x.noteCommitment1, x.noteCommitment2]);
        debug(`Inserting at DataStartIndex: ${rollupProof.dataStartIndex}, num commitments: ${commitments.length}`);
        await this.worldState.insertElements(rollupProof.dataStartIndex, commitments);

        const txIndex = innerProofs.findIndex(
          (inner: InnerProofData) => `0x${inner.txId.toString('hex')}` == txId.toString(),
        );
        txSettled = txIndex != -1;
        if (txSettled) {
          // Index into block with txIndex*2 because each tx has 2 commitments
          this.hardener.index = rollupProof.dataStartIndex + txIndex * 2;
          debug(`Hardener account index: ${this.hardener.index}`);
          this.hardener.path = await this.worldState.getHashPath(this.hardener.index);
          break;
        }
      }
      if (!txSettled) {
        if (filteredBlocks.length > 0) {
          this.lastRollupId = filteredBlocks[filteredBlocks.length - 1].rollupId;
        }
        debug('Waiting and trying again...');
        await sleep(1000);
      }
    }

    this.saveHardenerInfo();
  }

  /**
   * Generates hardening proofs for vulnerable accounts and writes to file.
   *
   * @remarks
   * `pullAccountsToHarden` must be called before this method to ensure merkle tree is correct.
   * Proofs are written to file in batches for later submission to falafel.
   * This method gets the root of the worldState tree to use during proof generation.
   * Each proof is a migration (without spending keys) of an alias to the negated account public
   * key of a vulnerable account.
   */
  public async generateAndStoreProofs() {
    fs.mkdirSync(PROOFS_DIR, { recursive: true });

    // Get the WorldState root for use in proof-generation
    const merkleRoot = this.worldState.getRoot();
    debug(`Total Data Size: ${this.worldState.getSize()}`);
    debug(`WorldState ROOT: ${this.worldState.getRoot().toString('hex')}`);

    // TODO more comments!
    log(`Batches: ${this.numBatches}, accounts: ${this.accounts}`);
    const lastBatchSize = this.accounts.length - (this.numBatches - 1) * BATCH_SIZE;
    for (let b = 0; b < this.numBatches; b++) {
      const batch_size = b == this.numBatches - 1 ? lastBatchSize : BATCH_SIZE;
      log(`Batch ${b} of size ${batch_size}: generating proofs...`);

      const batch_file = `${BATCH_FILE_PREFIX}${b}.json`;
      log(`Writing to file sync...`);
      fs.writeFileSync(batch_file, '[\n');
      log(`Looping...`);
      for (let i = 0; i < batch_size; i++) {
        const accountIdx = b * BATCH_SIZE + i;
        debug(`Account IDX: ${accountIdx} (batch ${b}, offset ${i})`);
        const account = this.accounts[accountIdx];

        log(`Inverting...`);
        const negatedAccountKey = this.schnorr.negatePublicKey(account);

        if (this.accountsProcessed.has(account.toString())) {
          log(`Skipping ${account} / negated: ${negatedAccountKey} (proof already generated...)`);
          continue;
        }

        debug(`Generating proof to harden account...`);
        debug(`\tvulnerable account key:       ${account.toString()}`);
        debug(`\tnegated/newAccountPublicKey: ${negatedAccountKey.toString()}`);
        const finalTx = await this.generateHardenProof(merkleRoot, negatedAccountKey);

        debug('Writing TX (proofData and offchainTxData) to file...');
        const finalTxJson = txToJson(finalTx);

        let suffix = '\n';
        if (i < batch_size - 1) {
          suffix = ',' + suffix;
        }
        // FIXME asynchronous fs.appendFile instead for performance?
        fs.appendFileSync(batch_file, JSON.stringify(finalTxJson, null, 2) + suffix);

        this.accountsProcessed.add(account.toString());
      }
      fs.appendFileSync(batch_file, ']\n');
    }
  }

  /**
   * Monitor falafel and submit batches of account-harden proofs.
   *
   * @remarks
   * This method checks falafel's current queue of second-class txs
   * and only submits another batch when falafel is ready.
   * Keep track of the index of the next unsubmitted batch in a file.
   */
  public async monitorAndSubmitProofs() {
    log(`Submitting harden proofs to falafel one batch at a time as falafel becomes ready`);
    const numBatches = JSON.parse(fs.readFileSync(BATCH_COUNT_FILE, 'utf-8')) as number;
    let nextBatch = JSON.parse(fs.readFileSync(NEXT_BATCH_FILE, 'utf-8'));
    log(`Account proofs are chunked into ${numBatches} batches. Starting/resuming at batch ${nextBatch}`);
    try {
      while (nextBatch < numBatches) {
        log(`Attempting to submit batch #${nextBatch}...`);
        const pendingTxCount = await this.rollupProvider.getPendingSecondClassTxCount();
        log(`Pending 2nd-class TXS: ${pendingTxCount}`);
        if (pendingTxCount < MAX_PENDING_SECOND_CLASS_TXS) {
          await this.loadAndSubmitProofBatch(nextBatch);
          nextBatch++;
        } else {
          log(`Falafel is not ready to receive more second class txs, sleeping...`);
          sleep(10000);
        }
      }
    } finally {
      fs.writeFileSync(NEXT_BATCH_FILE, JSON.stringify(nextBatch));
    }
  }

  /**
   * Verify that all accounts in the specified block range are hardened. Log any vulnerable accounts.
   *
   * @remarks
   * `pullAccountsToHarden` must be called before this method to ensure merkle tree is correct.
   * Verification involves checking whether an account's negated account key is present in any
   * of the pulled rollup blocks. So really _all_ rollup blocks should be pulled when calling this
   * command on the hardener.
   * Display number of vulnerable accounts.
   */
  public async verifyAccountsHardened() {
    log(`Checking whether ${this.accounts.length} accounts are hardened`);
    let vulnerableAccounts = 0;
    for (let a = 0; a < this.accounts.length; a++) {
      const negatedAccountKey = this.schnorr.negatePublicKey(this.accounts[a]);
      debug(`Verifying account is hardened. Account public key: ${this.accounts[a]}, negated: ${negatedAccountKey}`);
      const hardened = this.allAccountsEver.has(negatedAccountKey.toString());
      if (!hardened) {
        log(`Account ${this.accounts[a].toString()} has not been hardened.`);
        log(`Its negated key ${negatedAccountKey.toString()} is not registered.`);
        vulnerableAccounts++;
      }
    }
    log(`${vulnerableAccounts} vulnerable accounts found`);
  }

  /////////////////////////////////////////////////////////////////////////////
  // PRIVATE HELPER FUNCTIONS
  /////////////////////////////////////////////////////////////////////////////

  /**
   * Initialize info associated with the account to be used to harden all vulnerable accounts.
   * The provided ethereum account is used for generation of the Hardener's Aztec account.
   *
   * @remarks
   * The hardener account is an aztec account derived from an ethereum key pair
   * This account will be the source of serveral 'migration' txs that harden a vulnerable account by
   * migrating an alias (without spending keys) to a vulnerable account's negated public key.
   * The HardenerAccountInfo type is used to group all information relevant to the 'hardener' account.
   */
  private async initHardenerAccountInfo() {
    log(`Generating hardener Aztec account info from Ethereum keys...`);

    this.ethPrivateKey = Buffer.from(process.env.ETHEREUM_PRIVATE_KEY!, 'hex');

    // Add key to wallet provider for use by SDK when generating Aztec keys
    this.ethPublicKey = this.walletProvider.addAccount(this.ethPrivateKey);
    debug(`Ethereum Public Key: ${this.ethPublicKey}`);

    // Generate Aztec account and spending keys for Ethereum account
    const { privateKey: accountPrivateKey, publicKey: accountPublicKey } = await this.sdk.generateAccountKeyPair(
      this.ethPublicKey,
    );
    const { privateKey: spendingPrivateKey, publicKey: spendingPublicKey } = await this.sdk.generateSpendingKeyPair(
      this.ethPublicKey,
    );
    debug(`Account  Public Key: ${accountPublicKey}`);
    debug(`Spending Public Key: ${spendingPublicKey}`);

    // Generate Aztec alias
    const newAccountAlias = randomBytes(8).toString('hex'); // 'accounthardener'
    const newAccountAliasHash = AliasHash.fromAlias(newAccountAlias, new Blake2s(this.wasm));
    debug(`Account Alias: ${newAccountAlias}`);
    debug(`Account Alias Hash: ${newAccountAliasHash.toString()}`);

    this.hardener = new HardenerAccountInfo(
      this.ethPublicKey,
      accountPublicKey,
      accountPrivateKey,
      spendingPublicKey,
      spendingPrivateKey,
      newAccountAliasHash,
    );
  }

  /**
   * Generate a proof that will harden an account via its specified negated account public key.
   *
   * @remarks
   * Each proof is a migration of the hardener's alias to a vulnerable account's negated public key
   * but with no associated spending keys.
   * Submits account TX info to Halloumi for efficient proof-generation.
   * Called by `generateAndStoreProofs` which generates ALL proofs
   */
  private async generateHardenProof(merkleRoot: Buffer, negatedAccountKey: GrumpkinAddress) {
    debug(`Generating account-harden proof for negated key: ${negatedAccountKey}`);
    // Construct an AccountTx
    const accountTx = new AccountTx(
      merkleRoot,
      this.hardener.accountPublicKey, // accountPublicKey
      negatedAccountKey, // newAccountPublicKey
      GrumpkinAddress.ZERO, // newSpendingPublicKey1
      GrumpkinAddress.ZERO, // newSpendingPublicKey2
      this.hardener.aliasHash, // aliasHash
      false, // create
      true, // migrate
      this.hardener.index, // accountIndex
      this.hardener.path, // accountPath
      this.hardener.spendingPublicKey, // spendingPublicKey
    );
    // Create signing data for tx
    const signingData = await this.accountProver.computeSigningData(accountTx);
    debug(`Signing data: 0x${signingData.toString('hex')}`);

    // Construct Schnorr signature using user's accountPrivateKey to sign data
    const signature = this.schnorr.constructSignature(signingData, this.hardener.spendingPrivateKey);
    debug(`Schnorr signature: ${signature.toString()}`);

    log('Creating account proof via Halloumi/HttpJobServer');
    const proof = await this.proofGenerator.createProof(
      Buffer.concat([numToUInt32BE(ProofId.ACCOUNT), accountTx.toBuffer(), signature.toBuffer()]),
    );
    debug(`Proof size: ${proof.length}`);

    const offchainTxData = new OffchainAccountData(
      negatedAccountKey,
      this.hardener.aliasHash,
      GrumpkinAddress.ZERO.x(), // spendingPublicKey
      GrumpkinAddress.ZERO.x(), // spendingPublicKey
    );
    return {
      proofData: proof,
      offchainTxData: offchainTxData.toBuffer(),
    } as Tx;
  }

  /**
   * Load batch of pre-generated harden proofs from file and submit to falafel
   *
   * @remarks
   * Harden txs are submitted as second class txs.
   * If in local test mode (not on a live network), flush the rollup.
   * Called by `monitorAndSubmitProofs` which submits ALL proof batches
   *
   * @param batchIdx - index of the batch for use when reading file
   */
  private async loadAndSubmitProofBatch(batchIdx: number) {
    log(`Batch ${batchIdx}: retrieving TXs and submitting to falafel...`);
    const batch_file = `${BATCH_FILE_PREFIX}${batchIdx}.json`;
    const txsJson = JSON.parse(fs.readFileSync(batch_file, 'utf-8'));
    const txs: Tx[] = [];
    for (let i = 0; i < txsJson.length; i++) {
      txs.push(txFromJson(txsJson[i]));
    }
    log(`Submitting batch to falafel`);
    await this.rollupProvider.sendSecondClassTxs(txs);
    log('Batch submitted.');

    if (!this.liveRun) {
      await this.flushRollup();
    }
  }

  /**
   * Generate txs to force publish a rollup block.
   *
   * @remarks This is useful for local tests where we want to force rollup blocks
   * when no 1st class txs are coming in from elsewhere.
   * This just generates a 'deposit' tx under account 0.
   * Waits for the tx to settle at which point the rollup was 'flushed'.
   */
  private async flushRollup() {
    log(`Flushing falafel using deposit TX (should be for local tests only)...`);
    const address = this.walletProvider.getAccount(0);

    await this.sdk.run();
    await this.sdk.awaitSynchronised();

    const assetId = 0;
    const depositValue = this.sdk.toBaseUnits(assetId, '0.005');
    // in order to flush this tx through, we will pay for all slots in the rollup
    const fee = (await this.sdk.getRegisterFees(assetId))[TxSettlementTime.INSTANT];

    const account0 = await this.sdk.generateAccountKeyPair(address);
    debug(
      `depositing ${this.sdk.fromBaseUnits(depositValue, true)} (fee: ${this.sdk.fromBaseUnits(fee)}) to ${
        account0.publicKey
      }`,
    );
    let userId: GrumpkinAddress;
    try {
      userId = (await this.sdk.getUser(account0.publicKey)).id;
    } catch {
      userId = (await this.sdk.addUser(account0.privateKey)).id;
    }

    const controller = this.sdk.createDepositController(address, depositValue, fee, userId);

    await controller.depositFundsToContract();
    await controller.awaitDepositFundsToContract();

    await controller.createProof();
    await controller.sign();

    await controller.send();
    debug(`waiting to settle...`);
    await controller.awaitSettlement();
    debug(`Flushed.`);
  }

  /**
   * Save hardener information to file for later use in subsequent calls.
   *
   * @remarks
   * This method converts the hardener to json first before writing to file.
   */
  private saveHardenerInfo() {
    const hardenerInfo = this.hardener.persistentInfoToJson();
    // FIXME make async and check for write errors
    writeFileSafe(HARDENER_FILE, hardenerInfo);
  }

  /**
   * Load hardener path and index from file to use a previously created account in this call
   *
   * @remarks
   * `initHardenerAccountInfo` must be called before this function
   * Interpret the hardener as json and convert to HardenerAccountInfo.
   */
  private loadHardenerInfo() {
    // FIXME make async and check for read errors
    const jsonStr = fs.readFileSync(HARDENER_FILE, 'utf-8');
    const jsonObj = JSON.parse(jsonStr);
    const ethPublicKey = EthAddress.fromString(jsonObj.ethPublicKey);
    // Ensure that the stored+loaded hardener is for the currently active eth account
    if (!ethPublicKey.equals(this.ethPublicKey)) {
      throw new Error('Provided Ethereum private key does not match the stored hardener public key');
    }
    (this.hardener.aliasHash = AliasHash.fromString(jsonObj.aliasHash)), (this.hardener.index = jsonObj.index);
    this.hardener.path = HashPath.fromBuffer(Buffer.from(jsonObj.path, 'hex'));
  }
}

/////////////////////////////////////////////////////////////////////////////
// UTILITIES / HELPERS
/////////////////////////////////////////////////////////////////////////////

/**
 * Helper class for storing information associated with the "hardener" account.
 * Index, path, and the other fields are necessary when generating
 * migration/hardening proofs from this account.
 *
 * @remarks
 * Information includes ethereum key pair, Aztec keys, alias hash, account note index and path.
 * `index` and `path` are not known at when account information is first generated from the
 * ethereum keys. These fields must be set after the account-creation TX settles.
 * This class includes to/from json helpers for easier storing of hardener account in file.
 */
class HardenerAccountInfo {
  public index!: number;
  public path!: HashPath;

  constructor(
    public ethPublicKey: EthAddress,
    public accountPublicKey: GrumpkinAddress,
    public accountPrivateKey: Buffer,
    public spendingPublicKey: GrumpkinAddress,
    public spendingPrivateKey: Buffer,
    public aliasHash: AliasHash,
  ) {}

  public persistentInfoToJson() {
    const obj = {
      index: this.index,
      path: this.path.toBuffer().toString('hex'),
      ethPublicKey: this.ethPublicKey.toString(),
      aliasHash: this.aliasHash.toString(),
    };
    return JSON.stringify(obj, null, 2);
  }
}

/**
 * Configure and return a LevelUp DB
 */
function getLevelDb(memoryDb = false, identifier?: string): LevelUp {
  const folder = identifier ? `/${identifier}` : '';
  const dbPath = `./data${folder}`;
  if (memoryDb) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return levelup(memdown());
  } else {
    mkdirSync(dbPath, { recursive: true });
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return levelup(leveldown(`${dbPath}/aztec2-sdk.db`));
  }
}

/**
 * Write to file, but first `mkdir -p`
 */
function writeFileSafe(fpath: string, info: string) {
  fs.mkdirSync(path.dirname(fpath), { recursive: true });
  fs.writeFileSync(fpath, info);
}
