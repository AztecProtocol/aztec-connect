import { AliasHash } from '@aztec/barretenberg/account_id';
import { EthAddress, GrumpkinAddress } from '@aztec/barretenberg/address';
import { toBigIntBE } from '@aztec/barretenberg/bigint_buffer';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { AccountProver, JoinSplitProver, ProofId, UnrolledProver } from '@aztec/barretenberg/client_proofs';
import { Crs } from '@aztec/barretenberg/crs';
import { Blake2s, Pedersen, Schnorr, randomBytes } from '@aztec/barretenberg/crypto';
import { createLogger } from '@aztec/barretenberg/debug';
import { Grumpkin } from '@aztec/barretenberg/ecc';
import { AccountData, InitHelpers } from '@aztec/barretenberg/environment';
import { FftFactory } from '@aztec/barretenberg/fft';
import { HashPath, MemoryMerkleTree } from '@aztec/barretenberg/merkle_tree';
import { NoteAlgorithms } from '@aztec/barretenberg/note_algorithms';
import { OffchainAccountData } from '@aztec/barretenberg/offchain_tx_data';
import { Pippenger } from '@aztec/barretenberg/pippenger';
import { RollupProofData } from '@aztec/barretenberg/rollup_proof';
import { RollupProvider } from '@aztec/barretenberg/rollup_provider';
import { InterruptableSleep } from '@aztec/barretenberg/sleep';
import { Timer } from '@aztec/barretenberg/timer';
import { TxId } from '@aztec/barretenberg/tx_id';
import { BarretenbergWasm, WorkerPool } from '@aztec/barretenberg/wasm';
import { WorldState, WorldStateConstants } from '@aztec/barretenberg/world_state';
import { EventEmitter } from 'events';
import { LevelUp } from 'levelup';
import { BlockContext } from '../block_context/block_context';
import { CorePaymentTx, createCorePaymentTxForRecipient } from '../core_tx';
import { Alias, Database, SpendingKey } from '../database';
import { Note } from '../note';
import {
  AccountProofCreator,
  AccountProofInput,
  DefiDepositProofCreator,
  JoinSplitProofInput,
  PaymentProofCreator,
  ProofOutput,
} from '../proofs';
import { MutexSerialQueue, SerialQueue } from '../serial_queue';
import { SchnorrSigner } from '../signer';
import { UserState, UserStateEvent, UserStateFactory } from '../user_state';
import { CoreSdkInterface } from './core_sdk_interface';
import { CoreSdkOptions } from './core_sdk_options';
import { SdkEvent, SdkStatus } from './sdk_status';

const debug = createLogger('bb:core_sdk');

enum SdkInitState {
  // Constructed but uninitialized. Unusable.
  UNINITIALIZED = 'UNINITIALIZED',
  // Initialized but not yet synching data tree and user accounts. Can be queried for data, but not create proofs.
  INITIALIZED = 'INITIALIZED',
  // Synchronises data tree and user accounts. Ready for proof construction.
  RUNNING = 'RUNNING',
  // Stop requested. Wait for synching task to return.
  STOPPING = 'STOPPING',
  // Unusable.
  DESTROYED = 'DESTROYED',
}

/**
 * CoreSdk is responsible for keeping everything in sync and proof construction.
 * init() should be called before making any other calls to construct the basic components.
 * run() should be called once a client wants to start synching, or requesting proof construction.
 * Takes ownership of injected components (should destroy them etc).
 * A serial queue ensures that all calls that modify internal state happen in sequence.
 * By default, the serial queue is protected with a cross-process mutex, ensuring that if multiple instances
 * of the CoreSdk exist in different processes, that they will not modify state at the same time.
 */
export class CoreSdk extends EventEmitter implements CoreSdkInterface {
  private options!: CoreSdkOptions;
  private worldState!: WorldState;
  private userStates: UserState[] = [];
  private paymentProofCreator!: PaymentProofCreator;
  private accountProofCreator!: AccountProofCreator;
  private defiDepositProofCreator!: DefiDepositProofCreator;
  private serialQueue!: SerialQueue;
  private userStateFactory!: UserStateFactory;
  private sdkStatus: SdkStatus = {
    serverUrl: '',
    chainId: -1,
    rollupContractAddress: EthAddress.ZERO,
    feePayingAssetIds: [0],
    syncedToRollup: -1,
    latestRollupId: -1,
    dataRoot: Buffer.alloc(0),
    dataSize: 0,
  };
  private initState = SdkInitState.UNINITIALIZED;
  private noteAlgos!: NoteAlgorithms;
  private blake2s!: Blake2s;
  private grumpkin!: Grumpkin;
  private schnorr!: Schnorr;
  private interruptableSleep = new InterruptableSleep();
  private synchingPromise!: Promise<void>;

  constructor(
    private leveldb: LevelUp,
    private db: Database,
    private rollupProvider: RollupProvider,
    private barretenberg: BarretenbergWasm,
    private pedersen: Pedersen,
    private pippenger: Pippenger,
    private fftFactory: FftFactory,
    private workerPool?: WorkerPool,
  ) {
    super();
  }

  /**
   * Constructs internal components.
   * Erases dbs if rollup contract address changed.
   * Loads and initializes known user accounts.
   * Destroys injected components on failure.
   */
  public async init(options: CoreSdkOptions) {
    if (this.initState !== SdkInitState.UNINITIALIZED) {
      throw new Error('Already initialized.');
    }

    try {
      this.options = options;
      this.serialQueue = new MutexSerialQueue(this.db, 'aztec_core_sdk');
      this.noteAlgos = new NoteAlgorithms(this.barretenberg);
      this.blake2s = new Blake2s(this.barretenberg);
      this.grumpkin = new Grumpkin(this.barretenberg);
      this.schnorr = new Schnorr(this.barretenberg);
      this.userStateFactory = new UserStateFactory(this.grumpkin, this.noteAlgos, this.db, this.rollupProvider);
      this.worldState = new WorldState(this.leveldb, this.pedersen);

      const {
        blockchainStatus: { chainId, rollupContractAddress },
        runtimeConfig: { feePayingAssetIds },
        rollupSize,
      } = await this.getRemoteStatus();

      // Clear all data if contract changed.
      const rca = await this.getLocalRollupContractAddress();
      if (rca && !rca.equals(rollupContractAddress)) {
        debug('Erasing database...');
        await this.leveldb.clear();
        await this.db.clear();
      }

      // TODO: Refactor all leveldb saved config into a little PersistentConfig class with getters/setters.
      await this.leveldb.put('rollupContractAddress', rollupContractAddress.toBuffer());

      // Ensures we can get the list of users and access current known balances.
      await this.initUserStates();

      // Initialize the "mutable" merkle tree. This is the tree that represents all layers about each rollup subtree.
      const subtreeDepth = Math.ceil(Math.log2(rollupSize * WorldStateConstants.NUM_NEW_DATA_TREE_NOTES_PER_TX));
      await this.worldState.init(subtreeDepth);

      this.sdkStatus = {
        ...this.sdkStatus,
        serverUrl: options.serverUrl,
        chainId,
        rollupContractAddress: rollupContractAddress,
        feePayingAssetIds,
        dataSize: this.worldState.getSize(),
        dataRoot: this.worldState.getRoot(),
        syncedToRollup: await this.getSyncedToRollup(),
        latestRollupId: +(await this.leveldb.get('latestRollupId').catch(() => -1)),
      };

      this.initState = SdkInitState.INITIALIZED;
    } catch (err) {
      // If initialisation fails, we should destroy the components we've taken ownership of.
      await this.leveldb.close();
      await this.db.close();
      await this.workerPool?.destroy();
      this.serialQueue?.cancel();
      throw err;
    }
  }

  public async destroy() {
    debug('destroying...');

    // If sync() task is running, signals it to stop, to awake for exit if it's asleep, and awaits the exit.
    this.initState = SdkInitState.STOPPING;
    this.interruptableSleep.interrupt();
    await this.synchingPromise;

    // The serial queue will cancel itself. This ensures that anything currently in the queue finishes, and ensures
    // that once the await to push() returns, nothing else is on, or can be added to the queue.
    await this.serialQueue.push(async () => this.serialQueue.cancel());

    // Stop listening to account state updates.
    this.userStates.forEach(us => us.removeAllListeners());

    // Destroy injected components.
    await this.fftFactory.destroy();
    await this.leveldb.close();
    await this.db.close();
    await this.workerPool?.destroy();

    this.initState = SdkInitState.DESTROYED;
    this.emit(SdkEvent.DESTROYED);
    this.removeAllListeners();

    debug('destroyed.');
  }

  public async getLocalStatus() {
    return { ...this.sdkStatus };
  }

  public async getRemoteStatus() {
    return await this.rollupProvider.getStatus();
  }

  public async isAccountRegistered(accountPublicKey: GrumpkinAddress) {
    return !!(await this.db.getAlias(accountPublicKey));
  }

  public async isRemoteAccountRegistered(accountPublicKey: GrumpkinAddress) {
    return this.rollupProvider.isAccountRegistered(accountPublicKey);
  }

  public async isAliasRegistered(alias: string) {
    const aliasHash = await this.computeAliasHash(alias);
    return (await this.db.getAliases(aliasHash)).length > 0;
  }

  public async isRemoteAliasRegistered(alias: string) {
    return this.rollupProvider.isAliasRegistered(alias);
  }

  public async accountExists(accountPublicKey: GrumpkinAddress, alias: string) {
    const aliasHash = await this.computeAliasHash(alias);
    const savedAlias = await this.db.getAlias(accountPublicKey);
    return !!savedAlias && savedAlias.aliasHash.equals(aliasHash);
  }

  public async remoteAccountExists(accountPublicKey: GrumpkinAddress, alias: string) {
    return this.rollupProvider.accountExists(accountPublicKey, alias);
  }

  public async getAccountPublicKey(alias: string) {
    const aliasHash = await this.computeAliasHash(alias);
    const aliases = await this.db.getAliases(aliasHash);
    return aliases[0]?.accountPublicKey;
  }

  public async getRemoteUnsettledAccountPublicKey(alias: string) {
    const aliasHash = await this.computeAliasHash(alias);
    const accounts = await this.rollupProvider.getUnsettledAccounts();
    return accounts.find(a => a.aliasHash.equals(aliasHash))?.accountPublicKey;
  }

  public async getTxFees(assetId: number) {
    return this.rollupProvider.getTxFees(assetId);
  }

  public async getDefiFees(bridgeId: BridgeId) {
    return this.rollupProvider.getDefiFees(bridgeId);
  }

  public async getDefiInteractionNonce(txId: TxId) {
    const tx = await this.db.getDefiTx(txId);
    if (!tx) {
      throw new Error('Unknown txId');
    }
    return tx.interactionNonce;
  }

  public async userExists(userId: GrumpkinAddress) {
    return !!(await this.db.getUser(userId));
  }

  public async getUserData(userId: GrumpkinAddress) {
    return this.getUserState(userId).getUserData();
  }

  public async getUsersData() {
    return this.userStates.map(us => us.getUserData());
  }

  public async derivePublicKey(privateKey: Buffer) {
    return new GrumpkinAddress(this.grumpkin.mul(Grumpkin.one, privateKey));
  }

  public async constructSignature(message: Buffer, privateKey: Buffer) {
    return this.schnorr.constructSignature(message, privateKey);
  }

  public async addUser(accountPrivateKey: Buffer, noSync = false) {
    return this.serialQueue.push(async () => {
      const accountPublicKey = await this.derivePublicKey(accountPrivateKey);
      if (await this.db.getUser(accountPublicKey)) {
        throw new Error(`User already exists: ${accountPublicKey}`);
      }

      let syncedToRollup = -1;
      if (noSync) {
        const {
          blockchainStatus: { nextRollupId },
        } = await this.getRemoteStatus();
        syncedToRollup = nextRollupId - 1;
      }

      const user = { id: accountPublicKey, accountPrivateKey, accountPublicKey, syncedToRollup };
      await this.db.addUser(user);

      const userState = await this.userStateFactory.createUserState(user);
      userState.on(UserStateEvent.UPDATED_USER_STATE, id => this.emit(SdkEvent.UPDATED_USER_STATE, id));
      this.userStates.push(userState);

      this.emit(SdkEvent.UPDATED_USERS);

      return userState.getUserData();
    });
  }

  public async removeUser(userId: GrumpkinAddress) {
    return this.serialQueue.push(async () => {
      const userState = this.getUserState(userId);
      this.userStates = this.userStates.filter(us => us !== userState);
      userState.removeAllListeners();
      await this.db.removeUser(userId);

      this.emit(SdkEvent.UPDATED_USERS);
    });
  }

  public async getSpendingKeys(userId: GrumpkinAddress) {
    const keys = await this.db.getSpendingKeys(userId);
    return keys.map(k => k.key);
  }

  public async getBalances(userId: GrumpkinAddress, unsafe?: boolean) {
    return this.getUserState(userId).getBalances(unsafe);
  }

  public async getBalance(userId: GrumpkinAddress, assetId: number, unsafe?: boolean) {
    const userState = this.getUserState(userId);
    return userState.getBalance(assetId, unsafe);
  }

  public async getSpendableSum(
    userId: GrumpkinAddress,
    assetId: number,
    excludePendingNotes?: boolean,
    unsafe?: boolean,
  ) {
    const userState = this.getUserState(userId);
    return userState.getSpendableSum(assetId, excludePendingNotes, unsafe);
  }

  public async getSpendableSums(userId: GrumpkinAddress, excludePendingNotes?: boolean, unsafe?: boolean) {
    const userState = this.getUserState(userId);
    return userState.getSpendableSums(excludePendingNotes, unsafe);
  }

  public async getMaxSpendableValue(
    userId: GrumpkinAddress,
    assetId: number,
    numNotes?: number,
    excludePendingNotes?: boolean,
    unsafe?: boolean,
  ) {
    const userState = this.getUserState(userId);
    return userState.getMaxSpendableValue(assetId, numNotes, excludePendingNotes, unsafe);
  }

  public async pickNotes(
    userId: GrumpkinAddress,
    assetId: number,
    value: bigint,
    excludePendingNotes?: boolean,
    unsafe?: boolean,
  ) {
    return this.getUserState(userId).pickNotes(assetId, value, excludePendingNotes, unsafe);
  }

  public async pickNote(
    userId: GrumpkinAddress,
    assetId: number,
    value: bigint,
    excludePendingNotes?: boolean,
    unsafe?: boolean,
  ) {
    return this.getUserState(userId).pickNote(assetId, value, excludePendingNotes, unsafe);
  }

  public async getUserTxs(userId: GrumpkinAddress) {
    return this.db.getUserTxs(userId);
  }

  public async getRemoteUnsettledPaymentTxs() {
    return this.rollupProvider.getUnsettledPaymentTxs();
  }

  /**
   * Moves the sdk into RUNNING state.
   * Kicks off data tree updates, user note decryptions, alias table updates, proving key construction.
   */
  public async run() {
    if (this.initState === SdkInitState.RUNNING) {
      return;
    }

    this.initState = SdkInitState.RUNNING;

    this.serialQueue
      .push(async () => {
        const { useKeyCache: localUseKeyCache } = this.options;

        const {
          proverless,
          blockchainStatus: { verifierContractAddress },
          runtimeConfig: { useKeyCache },
        } = await this.getRemoteStatus();

        const vca = await this.getLocalVerifierContractAddress();
        const forceCreateProvingKeys =
          (vca && !vca.equals(verifierContractAddress)) || !useKeyCache || !localUseKeyCache;

        const maxCircuitSize = Math.max(JoinSplitProver.getCircuitSize(), AccountProver.getCircuitSize());
        const crsData = await this.getCrsData(maxCircuitSize);

        await this.pippenger.init(crsData);
        await this.genesisSync();
        await this.startReceivingBlocks();
        await this.createJoinSplitProofCreator(forceCreateProvingKeys, proverless);
        await this.createAccountProofCreator(forceCreateProvingKeys, proverless);

        // Makes the saved proving keys considered valid. Hence set this after they're saved.
        await this.leveldb.put('verifierContractAddress', verifierContractAddress.toBuffer());
      })
      .catch(debug);
  }

  // -------------------------------------------------------
  // PUBLIC METHODS FROM HERE ON REQUIRE run() TO BE CALLED.
  // -------------------------------------------------------

  public async createDepositProof(
    assetId: number,
    publicInput: bigint,
    privateOutput: bigint,
    depositor: EthAddress,
    recipient: GrumpkinAddress,
    recipientAccountRequired: boolean,
    txRefNo: number,
  ) {
    return this.serialQueue.push(async () => {
      this.assertInitState(SdkInitState.RUNNING);

      // Create a one time user to generate and sign the proof.
      const accountPrivateKey = randomBytes(32);
      const accountPublicKey = await this.derivePublicKey(accountPrivateKey);
      const user = {
        id: accountPublicKey,
        accountPrivateKey,
        accountPublicKey,
        syncedToRollup: -1,
      };
      const signer = new SchnorrSigner(this, accountPublicKey, accountPrivateKey);
      const spendingPublicKey = accountPublicKey;

      const proofInput = await this.paymentProofCreator.createProofInput(
        user,
        [], // notes
        BigInt(0), // privateInput
        privateOutput,
        BigInt(0), // senderPrivateOutput
        publicInput,
        BigInt(0), // publicOutput
        assetId,
        recipient,
        recipientAccountRequired,
        depositor,
        spendingPublicKey,
        0, // allowChain
      );
      const signature = await signer.signMessage(proofInput.signingData);

      return this.paymentProofCreator.createProof(user, { ...proofInput, signature }, txRefNo);
    });
  }

  public async createPaymentProofInput(
    userId: GrumpkinAddress,
    assetId: number,
    publicInput: bigint,
    publicOutput: bigint,
    privateInput: bigint,
    recipientPrivateOutput: bigint,
    senderPrivateOutput: bigint,
    noteRecipient: GrumpkinAddress | undefined,
    recipientAccountRequired: boolean,
    publicOwner: EthAddress | undefined,
    spendingPublicKey: GrumpkinAddress,
    allowChain: number,
  ) {
    return this.serialQueue.push(async () => {
      this.assertInitState(SdkInitState.RUNNING);

      const userState = this.getUserState(userId);
      const user = userState.getUserData();

      const unsafe = spendingPublicKey.equals(userId);
      const notes = privateInput ? await userState.pickNotes(assetId, privateInput, false, unsafe) : [];
      if (privateInput && !notes.length) {
        throw new Error(`Failed to find no more than 2 notes that sum to ${privateInput}.`);
      }

      return this.paymentProofCreator.createProofInput(
        user,
        notes,
        privateInput,
        recipientPrivateOutput,
        senderPrivateOutput,
        publicInput,
        publicOutput,
        assetId,
        noteRecipient,
        recipientAccountRequired,
        publicOwner,
        spendingPublicKey,
        allowChain,
      );
    });
  }

  public async createPaymentProof(input: JoinSplitProofInput, txRefNo: number) {
    return this.serialQueue.push(async () => {
      this.assertInitState(SdkInitState.RUNNING);

      const { outputNotes } = input.tx;
      const userId = outputNotes[1].ownerPubKey;
      const userState = this.getUserState(userId);
      const user = userState.getUserData();
      return this.paymentProofCreator.createProof(user, input, txRefNo);
    });
  }

  public async createAccountProofSigningData(
    accountPublicKey: GrumpkinAddress,
    alias: string,
    migrate: boolean,
    spendingPublicKey: GrumpkinAddress,
    newAccountPublicKey?: GrumpkinAddress,
    newSpendingPublicKey1?: GrumpkinAddress,
    newSpendingPublicKey2?: GrumpkinAddress,
  ) {
    return this.serialQueue.push(async () => {
      this.assertInitState(SdkInitState.RUNNING);
      const aliasHash = this.computeAliasHash(alias);
      const { signingData } = await this.accountProofCreator.createProofInput(
        accountPublicKey,
        aliasHash,
        migrate,
        spendingPublicKey,
        newAccountPublicKey,
        newSpendingPublicKey1,
        newSpendingPublicKey2,
        false, // spendingKeyExists
      );
      return signingData;
    });
  }

  public async createAccountProofInput(
    userId: GrumpkinAddress,
    alias: string,
    migrate: boolean,
    spendingPublicKey: GrumpkinAddress,
    newSpendingPublicKey1?: GrumpkinAddress,
    newSpendingPublicKey2?: GrumpkinAddress,
    newAccountPrivateKey?: Buffer,
  ) {
    return this.serialQueue.push(async () => {
      this.assertInitState(SdkInitState.RUNNING);
      const aliasHash = await this.computeAliasHash(alias);
      const newAccountPublicKey = newAccountPrivateKey ? await this.derivePublicKey(newAccountPrivateKey) : undefined;
      return this.accountProofCreator.createProofInput(
        userId,
        aliasHash,
        migrate,
        spendingPublicKey,
        newAccountPublicKey,
        newSpendingPublicKey1,
        newSpendingPublicKey2,
      );
    });
  }

  public async createAccountProof(input: AccountProofInput, txRefNo: number) {
    return this.serialQueue.push(async () => {
      this.assertInitState(SdkInitState.RUNNING);
      return this.accountProofCreator.createProof(input, txRefNo);
    });
  }

  public async createDefiProofInput(
    userId: GrumpkinAddress,
    bridgeId: BridgeId,
    depositValue: bigint,
    inputNotes: Note[],
    spendingPublicKey: GrumpkinAddress,
  ) {
    return this.serialQueue.push(async () => {
      this.assertInitState(SdkInitState.RUNNING);
      const userState = this.getUserState(userId);
      const user = userState.getUserData();
      return this.defiDepositProofCreator.createProofInput(user, bridgeId, depositValue, inputNotes, spendingPublicKey);
    });
  }

  public async createDefiProof(input: JoinSplitProofInput, txRefNo: number) {
    return this.serialQueue.push(async () => {
      this.assertInitState(SdkInitState.RUNNING);

      const { outputNotes } = input.tx;
      const userId = outputNotes[1].ownerPubKey;
      const userState = this.getUserState(userId);
      const user = userState.getUserData();
      return this.defiDepositProofCreator.createProof(user, input, txRefNo);
    });
  }

  public async sendProofs(proofs: ProofOutput[]) {
    return this.serialQueue.push(async () => {
      this.assertInitState(SdkInitState.RUNNING);

      const txs = proofs.map(({ proofData, offchainTxData, signature }) => ({
        proofData: proofData.rawProofData,
        offchainTxData: offchainTxData.toBuffer(),
        depositSignature: signature,
      }));
      const txIds = await this.rollupProvider.sendTxs(txs);

      for (const proof of proofs) {
        const { userId } = proof.tx;
        try {
          await this.getUserState(userId).addProof(proof);
        } catch (e) {
          // Proof sender is not added.
        }

        // Add the payment proof to recipient's account if they are not the sender.
        if ([ProofId.DEPOSIT, ProofId.SEND].includes(proof.tx.proofId)) {
          const recipient = proof.outputNotes[0].owner;
          if (!recipient.equals(userId)) {
            const recipientAccountRequired = proof.outputNotes[0].ownerAccountRequired;
            const recipientTx = createCorePaymentTxForRecipient(
              proof.tx as CorePaymentTx,
              recipient,
              recipientAccountRequired,
            );
            try {
              await this.getUserState(recipient).addProof({ ...proof, tx: recipientTx });
            } catch (e) {
              // Recipient's account is not added.
            }
          }
        }
      }

      return txIds;
    });
  }

  public async awaitSynchronised() {
    this.assertInitState(SdkInitState.RUNNING);

    while (true) {
      try {
        if (await this.isSynchronised()) {
          return;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (err) {
        debug(err);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  public async isUserSynching(userId: GrumpkinAddress) {
    this.assertInitState(SdkInitState.RUNNING);

    return this.getUserState(userId).isSyncing();
  }

  public async awaitUserSynchronised(userId: GrumpkinAddress) {
    this.assertInitState(SdkInitState.RUNNING);

    await this.getUserState(userId).awaitSynchronised();
  }

  public async awaitSettlement(txId: TxId, timeout?: number) {
    this.assertInitState(SdkInitState.RUNNING);

    const started = new Date().getTime();
    while (true) {
      if (timeout && new Date().getTime() - started > timeout * 1000) {
        throw new Error(`Timeout awaiting tx settlement: ${txId}`);
      }

      if (await this.db.isUserTxSettled(txId)) {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  public async awaitDefiDepositCompletion(txId: TxId, timeout?: number) {
    this.assertInitState(SdkInitState.RUNNING);

    const started = new Date().getTime();
    while (true) {
      if (timeout && new Date().getTime() - started > timeout * 1000) {
        throw new Error(`Timeout awaiting defi interaction: ${txId}`);
      }

      const tx = await this.db.getDefiTx(txId);
      if (!tx) {
        throw new Error('Unknown txId.');
      }

      if (tx.settled) {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  public async awaitDefiFinalisation(txId: TxId, timeout?: number) {
    this.assertInitState(SdkInitState.RUNNING);

    const started = new Date().getTime();
    while (true) {
      if (timeout && new Date().getTime() - started > timeout * 1000) {
        throw new Error(`Timeout awaiting defi interaction: ${txId}`);
      }

      const tx = await this.db.getDefiTx(txId);
      if (!tx) {
        throw new Error('Unknown txId.');
      }

      if (tx.finalised) {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  public async awaitDefiSettlement(txId: TxId, timeout?: number) {
    this.assertInitState(SdkInitState.RUNNING);

    const started = new Date().getTime();
    while (true) {
      if (timeout && new Date().getTime() - started > timeout * 1000) {
        throw new Error(`Timeout awaiting defi interaction: ${txId}`);
      }

      const tx = await this.db.getDefiTx(txId);
      if (!tx) {
        throw new Error('Unknown txId.');
      }

      if (tx.claimSettled) {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // ---------------
  // PRIVATE METHODS
  // ---------------

  private getUserState(userId: GrumpkinAddress) {
    const userState = this.userStates.find(us => us.getUserData().id.equals(userId));
    if (!userState) {
      throw new Error(`User not found: ${userId}`);
    }
    return userState;
  }

  private async isSynchronised() {
    const providerStatus = await this.rollupProvider.getStatus();
    const localDataRoot = this.worldState.getRoot();
    return localDataRoot.equals(providerStatus.blockchainStatus.dataRoot);
  }

  private assertInitState(state: SdkInitState) {
    if (this.initState !== state) {
      throw new Error(`Init state ${this.initState} !== ${state}`);
    }
  }

  private async getLocalRollupContractAddress() {
    const result: Buffer | undefined = await this.leveldb.get('rollupContractAddress').catch(() => undefined);
    return result ? new EthAddress(result) : undefined;
  }

  private async getLocalVerifierContractAddress() {
    const result: Buffer | undefined = await this.leveldb.get('verifierContractAddress').catch(() => undefined);
    return result ? new EthAddress(result) : undefined;
  }

  private async getSyncedToRollup() {
    return +(await this.leveldb.get('syncedToRollup').catch(() => -1));
  }

  private async getCrsData(circuitSize: number) {
    debug('downloading crs data...');
    const crs = new Crs(circuitSize);
    await crs.download();
    debug('done.');
    return Buffer.from(crs.getData());
  }

  /**
   * Loads known accounts from db.
   * Registers to forward any notifications of account state updates.
   */
  private async initUserStates() {
    debug('initializing user states...');
    const users = await this.db.getUsers();
    this.userStates = await Promise.all(users.map(u => this.userStateFactory.createUserState(u)));
    this.userStates.forEach(us =>
      us.on(UserStateEvent.UPDATED_USER_STATE, id => this.emit(SdkEvent.UPDATED_USER_STATE, id)),
    );
  }

  private computeAliasHash(alias: string) {
    return AliasHash.fromAlias(alias, this.blake2s);
  }

  private async createJoinSplitProofCreator(recreateKeys: boolean, proverless: boolean) {
    const fft = await this.fftFactory.createFft(JoinSplitProver.getCircuitSize(proverless));
    const unrolledProver = new UnrolledProver(this.barretenberg, this.pippenger, fft);
    const joinSplitProver = new JoinSplitProver(unrolledProver, proverless);
    this.paymentProofCreator = new PaymentProofCreator(
      joinSplitProver,
      this.noteAlgos,
      this.worldState,
      this.grumpkin,
      this.db,
    );
    this.defiDepositProofCreator = new DefiDepositProofCreator(
      joinSplitProver,
      this.noteAlgos,
      this.worldState,
      this.grumpkin,
      this.db,
    );
    await this.createJoinSplitProvingKey(joinSplitProver, recreateKeys);
  }

  private async createAccountProofCreator(forceCreate: boolean, proverless: boolean) {
    const fft = await this.fftFactory.createFft(AccountProver.getCircuitSize(proverless));
    const unrolledProver = new UnrolledProver(this.barretenberg, this.pippenger, fft);
    const accountProver = new AccountProver(unrolledProver, proverless);
    this.accountProofCreator = new AccountProofCreator(accountProver, this.worldState, this.db);
    await this.createAccountProvingKey(accountProver, forceCreate);
  }

  private async createJoinSplitProvingKey(joinSplitProver: JoinSplitProver, forceCreate: boolean) {
    if (!forceCreate) {
      const provingKey = await this.db.getKey('join-split-proving-key');
      if (provingKey) {
        debug('loading join-split proving key...');
        await joinSplitProver.loadKey(provingKey);
        return;
      }
    }

    debug('computing join-split proving key...');
    await joinSplitProver.computeKey();
    if (this.options.useKeyCache) {
      debug('saving join-split proving key...');
      const newProvingKey = await joinSplitProver.getKey();
      await this.db.addKey('join-split-proving-key', newProvingKey);
    } else {
      await this.db.deleteKey('join-split-proving-key');
    }
    debug(`done.`);
  }

  private async createAccountProvingKey(accountProver: AccountProver, forceCreate: boolean) {
    if (!forceCreate) {
      const provingKey = await this.db.getKey('account-proving-key');
      if (provingKey) {
        debug('loading account proving key...');
        await accountProver.loadKey(provingKey);
        return;
      }
    }

    debug('computing account proving key...');
    await accountProver.computeKey();
    if (this.options.useKeyCache) {
      debug('saving account proving key...');
      const newProvingKey = await accountProver.getKey();
      await this.db.addKey('account-proving-key', newProvingKey);
    } else {
      await this.db.deleteKey('account-proving-key');
    }
    debug(`done.`);
  }

  private async syncGenesisAliasesAndKeys(accounts: AccountData[], hashPathMap: { [key: number]: HashPath }) {
    const aliases: Alias[] = [];
    const spendingKeys: SpendingKey[] = [];

    // There can be duplicate account/spending key combinations.
    // We need to just keep the most recent one.
    // This loop simulates upserts by keeping the most recent version before inserting into the DB.
    let treeIndex = 0;
    for (const account of accounts) {
      const {
        alias: { aliasHash, address },
        signingKeys: { signingKey1, signingKey2 },
      } = account;
      const accountPublicKey = new GrumpkinAddress(address);

      aliases.push({
        accountPublicKey,
        aliasHash: new AliasHash(aliasHash),
        index: treeIndex,
      });

      [signingKey1, signingKey2].forEach(key => {
        spendingKeys.push({ userId: accountPublicKey, treeIndex, key, hashPath: hashPathMap[treeIndex].toBuffer() });
        treeIndex++;
      });
    }

    debug(`saving ${aliases.length} aliases...`);
    await this.db.addAliases(aliases);
    debug(`saving ${spendingKeys.length} spending keys...`);
    await this.db.addSpendingKeys(spendingKeys);
  }

  // Returns a mapping of tree index to hash path for all account notes
  private async syncGenesisCommitments(accounts: AccountData[]) {
    const { rollupSize } = await this.getRemoteStatus();
    const commitments = accounts.flatMap(x => [x.notes.note1, x.notes.note2]);
    const size = 1 << Math.ceil(Math.log2(rollupSize));
    const notesInSubtree = size * WorldStateConstants.NUM_NEW_DATA_TREE_NOTES_PER_TX;
    let noteIndex = 0;
    const hashPathMap: { [key: number]: HashPath } = {};
    const roots: Buffer[] = [];
    debug(`building immutable sub-trees from commitments...`);
    while (commitments.length > 0) {
      const slice = commitments.splice(0, notesInSubtree);
      const zeroNotes = Array(notesInSubtree - slice.length).fill(MemoryMerkleTree.ZERO_ELEMENT);
      const fullTreeNotes = [...slice, ...zeroNotes];
      const merkleSubTree = await MemoryMerkleTree.new(fullTreeNotes, this.pedersen);
      for (let i = 0; i < notesInSubtree; i++) {
        hashPathMap[noteIndex++] = merkleSubTree.getHashPath(i);
      }
      roots.push(merkleSubTree.getRoot());
    }
    debug(`adding ${roots.length} subtree roots to data tree...`);
    await this.worldState.insertElements(0, roots);
    return hashPathMap;
  }

  /**
   * If the world state has no data, download the initial world state data and process it.
   */
  private async genesisSync(commitmentsOnly = false) {
    if (this.worldState.getSize() > 0) {
      return;
    }

    debug('initialising genesis state from server...');
    const genesisTimer = new Timer();
    const initialState = await this.rollupProvider.getInitialWorldState();
    const accounts = InitHelpers.parseAccountTreeData(initialState.initialAccounts);
    const hashPathMap = await this.syncGenesisCommitments(accounts);
    if (!commitmentsOnly) {
      await this.syncGenesisAliasesAndKeys(accounts, hashPathMap);
    }
    debug(`genesis sync complete in ${genesisTimer.s()}s`);
  }

  /**
   * Starts a micro task that calls sync() via the serial queue every 10s.
   * Will return once destroy() is called and the state shifts to STOPPING.
   */
  private async startReceivingBlocks() {
    this.synchingPromise = (async () => {
      debug('starting sync task...');
      while (this.initState !== SdkInitState.STOPPING) {
        this.serialQueue.push(() => this.sync());
        await this.interruptableSleep.sleep(10000);
      }
      debug('stopped sync task.');
    })();
  }

  /**
   * Called when data root is not as expected. We need to save parts of leveldb we don't want to lose, erase the db,
   * and rebuild the merkle tree.
   */
  private async reinitDataTree() {
    debug('re-initialising data tree...');

    const rca = await this.getLocalRollupContractAddress();
    const vca = await this.getLocalVerifierContractAddress();
    await this.leveldb.clear();
    await this.leveldb.put('rollupContractAddress', rca!.toBuffer());
    if (vca) {
      await this.leveldb.put('verifierContractAddress', vca.toBuffer());
    }

    const { rollupSize } = await this.getRemoteStatus();

    const subtreeDepth = Math.ceil(Math.log2(rollupSize * WorldStateConstants.NUM_NEW_DATA_TREE_NOTES_PER_TX));
    await this.worldState.init(subtreeDepth);
    await this.genesisSync(true);
  }

  /**
   * Every time called, determine the lowest `from` block, and start downloading and processing the blocks in chunks.
   * Will always first bring the data tree into sync, and then forward the blocks onto user states.
   * This is always called on the serial queue.
   */
  private async sync() {
    const coreSyncedToRollup = await this.getSyncedToRollup();
    let from = Math.min(coreSyncedToRollup, ...this.userStates.map(us => us.getUserData().syncedToRollup)) + 1;

    // Server will return blocks in chunks. We will break out of this loop when it stops returning blocks.
    while (true) {
      const blocks = await this.rollupProvider.getBlocks(from);
      if (!blocks.length) {
        break;
      }

      const coreSyncedToRollup = await this.getSyncedToRollup();
      const coreBlocks = blocks.filter(b => b.rollupId > coreSyncedToRollup);

      if (coreBlocks.length) {
        // For debugging corrupted data root.
        const oldRoot = this.worldState.getRoot();

        const rollups = coreBlocks.map(b => RollupProofData.fromBuffer(b.rollupProofData));
        const offchainTxData = coreBlocks.map(b => b.offchainTxData);
        const subtreeRoots = coreBlocks.map(block => block.subtreeRoot!);
        await this.worldState.insertElements(rollups[0].dataStartIndex, subtreeRoots);
        await this.processAliases(rollups, offchainTxData);
        await this.updateStatusRollupInfo(rollups[rollups.length - 1]);

        // TODO: Ugly hotfix. Find root cause.
        // We expect our data root to be equal to the new data root in the last block we processed.
        // UPDATE: Possibly solved. But leaving in for now. Can monitor for clientLogs.
        const expectedDataRoot = rollups[rollups.length - 1].newDataRoot;
        if (!this.worldState.getRoot().equals(expectedDataRoot)) {
          await this.reinitDataTree();
          this.rollupProvider.clientLog({
            message: 'Invalid dataRoot.',
            synchingFromRollup: coreSyncedToRollup,
            blocksReceived: coreBlocks.length,
            oldRoot: oldRoot.toString('hex'),
            newRoot: this.worldState.getRoot().toString('hex'),
            newSize: this.worldState.getSize(),
            expectedDataRoot: expectedDataRoot.toString('hex'),
          });
          continue;
        }
      }

      // BlockContexts wrap a block, and are shared amongst user states. Allows reuse of subtree computations.
      const blockContexts = blocks.map(block => new BlockContext(block, this.pedersen));

      // Forward the block contexts on to each UserState for processing.
      await Promise.all(this.userStates.map(us => us.processBlocks(blockContexts)));

      from = blocks[blocks.length - 1].rollupId + 1;
    }
  }

  private async updateStatusRollupInfo(rollup: RollupProofData) {
    const rollupId = rollup.rollupId;
    const latestRollupId = this.rollupProvider.getLatestRollupId();
    await this.leveldb.put('syncedToRollup', rollupId.toString());
    await this.leveldb.put('latestRollupId', latestRollupId.toString());

    this.sdkStatus.syncedToRollup = rollupId;
    this.sdkStatus.latestRollupId = latestRollupId;
    this.sdkStatus.dataRoot = this.worldState.getRoot();
    this.sdkStatus.dataSize = this.worldState.getSize();

    this.emit(SdkEvent.UPDATED_WORLD_STATE, rollupId, latestRollupId);
  }

  private async processAliases(rollups: RollupProofData[], offchainTxData: Buffer[][]) {
    const processRollup = (rollup: RollupProofData, offchainData: Buffer[]) => {
      const aliases: Alias[] = [];
      let offchainIndex = -1;
      for (let i = 0; i < rollup.innerProofData.length; ++i) {
        const proof = rollup.innerProofData[i];
        if (proof.isPadding()) {
          continue;
        }

        offchainIndex++;

        if (proof.proofId !== ProofId.ACCOUNT) {
          continue;
        }

        const createOrMigrate = !!toBigIntBE(proof.nullifier2);
        if (createOrMigrate) {
          const { accountPublicKey, aliasHash, spendingPublicKey1 } = OffchainAccountData.fromBuffer(
            offchainData[offchainIndex],
          );
          const commitment = this.noteAlgos.accountNoteCommitment(aliasHash, accountPublicKey, spendingPublicKey1);
          // Only need to check one commitment to make sure the aliasHash and accountPublicKey pair is valid.
          if (commitment.equals(proof.noteCommitment1)) {
            aliases.push({
              accountPublicKey,
              aliasHash,
              index: rollup.dataStartIndex + i * 2,
            });
          }
        }
      }
      return aliases;
    };

    const aliases = rollups.map((rollup, i) => processRollup(rollup, offchainTxData[i])).flat();
    await this.db.addAliases(aliases);
  }
}
