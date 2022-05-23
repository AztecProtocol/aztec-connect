import { AccountId, AliasHash } from '@aztec/barretenberg/account_id';
import { EthAddress, GrumpkinAddress } from '@aztec/barretenberg/address';
import { Block } from '@aztec/barretenberg/block_source';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { AccountProver, JoinSplitProver, ProofId, UnrolledProver } from '@aztec/barretenberg/client_proofs';
import { Crs } from '@aztec/barretenberg/crs';
import { Blake2s, Pedersen, Schnorr } from '@aztec/barretenberg/crypto';
import { createLogger } from '@aztec/barretenberg/debug';
import { Grumpkin } from '@aztec/barretenberg/ecc';
import { AccountData, InitHelpers } from '@aztec/barretenberg/environment';
import { FftFactory } from '@aztec/barretenberg/fft';
import { MemoryFifo } from '@aztec/barretenberg/fifo';
import { HashPath, MemoryMerkleTree } from '@aztec/barretenberg/merkle_tree';
import { NoteAlgorithms } from '@aztec/barretenberg/note_algorithms';
import { OffchainAccountData } from '@aztec/barretenberg/offchain_tx_data';
import { Pippenger } from '@aztec/barretenberg/pippenger';
import { RollupProofData } from '@aztec/barretenberg/rollup_proof';
import { RollupProvider } from '@aztec/barretenberg/rollup_provider';
import { Timer } from '@aztec/barretenberg/timer';
import { TxId } from '@aztec/barretenberg/tx_id';
import { BarretenbergWasm, WorkerPool } from '@aztec/barretenberg/wasm';
import { WorldState, WorldStateConstants } from '@aztec/barretenberg/world_state';
import { randomBytes } from 'crypto';
import { EventEmitter } from 'events';
import { LevelUp } from 'levelup';
import { BlockContext } from '../block_context/block_context';
import { CorePaymentTx, createCorePaymentTxForRecipient } from '../core_tx';
import { Alias, Database, SigningKey } from '../database';
import { Note } from '../note';
import {
  AccountProofCreator,
  AccountProofInput,
  DefiDepositProofCreator,
  JoinSplitProofInput,
  PaymentProofCreator,
  ProofOutput,
} from '../proofs';
import { MemorySerialQueue, MutexSerialQueue, SerialQueue } from '../serial_queue';
import { SchnorrSigner } from '../signer';
import { UserState, UserStateEvent, UserStateFactory } from '../user_state';
import { CoreSdkInterface } from './core_sdk_interface';
import { CoreSdkOptions } from './core_sdk_options';
import { SdkEvent, SdkStatus } from './sdk_status';

const debug = createLogger('bb:core_sdk');

enum SdkInitState {
  UNINITIALIZED = 'UNINITIALIZED',
  INITIALIZED = 'INITIALIZED',
  RUNNING = 'RUNNING',
  DESTROYED = 'DESTROYED',
}

/**
 * CoreSdk is responsible for keeping everything in sync and proof construction.
 * A serial queue is used to ensure initialisation, synching, proof construction, and block processing, are synchronised.
 * init() should be called before making any other calls to construct the basic components.
 * run() should be called once a client wants to start synching, or requesting proof construction.
 * Takes ownership of injected components (should destroy them etc).
 */
export class CoreSdk extends EventEmitter implements CoreSdkInterface {
  private options!: CoreSdkOptions;
  private worldState!: WorldState;
  private userStates: UserState[] = [];
  private paymentProofCreator!: PaymentProofCreator;
  private accountProofCreator!: AccountProofCreator;
  private defiDepositProofCreator!: DefiDepositProofCreator;
  private blockQueue = new MemoryFifo<Block>();
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
  private processBlocksPromise?: Promise<void>;
  private noteAlgos!: NoteAlgorithms;
  private blake2s!: Blake2s;
  private grumpkin!: Grumpkin;
  private schnorr!: Schnorr;

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
   * Basic initialisation of the sdk.
   * Call run() to actually start syncing etc.
   * If multiple calls to init occur (e.g. many tabs calling into a shared worker),
   * each blocks until the first call completes.
   */
  public async init(options: CoreSdkOptions) {
    if (this.initState !== SdkInitState.UNINITIALIZED) {
      throw new Error('Already initialized.');
    }

    try {
      // Take copy so we can modify internally.
      this.options = { useMutex: true, ...options };

      this.serialQueue = this.options.useMutex
        ? new MutexSerialQueue(this.db, 'aztec_core_sdk')
        : new MemorySerialQueue();

      this.noteAlgos = new NoteAlgorithms(this.barretenberg);
      this.blake2s = new Blake2s(this.barretenberg);
      this.grumpkin = new Grumpkin(this.barretenberg);
      this.schnorr = new Schnorr(this.barretenberg);
      this.userStateFactory = new UserStateFactory(
        this.grumpkin,
        this.noteAlgos,
        this.db,
        this.rollupProvider,
        this.pedersen,
      );
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

      // Allows us to query the merkle tree roots etc.
      // 2 notes per tx
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

      this.updateInitState(SdkInitState.INITIALIZED);
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
    debug('Destroying...');
    // The serial queue will cancel itself. This ensures that anything currently in the queue finishes, and ensures
    // that once the await to push() returns, nothing else is on, or can be added to the queue.
    await this.serialQueue.push(async () => this.serialQueue.cancel());
    await this.stopReceivingBlocks();
    await Promise.all(this.userStates.map(us => this.stopSyncingUserState(us)));
    await this.leveldb.close();
    await this.db.close();
    await this.workerPool?.destroy();
    this.updateInitState(SdkInitState.DESTROYED);
    this.emit(SdkEvent.DESTROYED);
    this.removeAllListeners();
    debug('Destroyed.');
  }

  public async getLocalStatus() {
    return { ...this.sdkStatus };
  }

  public async getRemoteStatus() {
    return await this.rollupProvider.getStatus();
  }

  public async getTxFees(assetId: number) {
    return this.rollupProvider.getTxFees(assetId);
  }

  public async getDefiFees(bridgeId: BridgeId) {
    return this.rollupProvider.getDefiFees(bridgeId);
  }

  /**
   * Return the latest nonce for a given public key, derived from chain data.
   */
  public async getLatestAccountNonce(publicKey: GrumpkinAddress) {
    return (await this.db.getLatestNonceByAddress(publicKey)) || 0;
  }

  public async getRemoteLatestAccountNonce(publicKey: GrumpkinAddress) {
    return (await this.rollupProvider.getLatestAccountNonce(publicKey)) || 0;
  }

  public async getLatestAliasNonce(alias: string) {
    const aliasHash = await this.computeAliasHash(alias);
    return (await this.db.getLatestNonceByAliasHash(aliasHash)) ?? 0;
  }

  public async getRemoteLatestAliasNonce(alias: string) {
    return this.rollupProvider.getLatestAliasNonce(alias);
  }

  public async getAccountId(alias: string, accountNonce?: number) {
    const aliasHash = await this.computeAliasHash(alias);
    return this.db.getAccountId(aliasHash, accountNonce);
  }

  public async getRemoteAccountId(alias: string, accountNonce?: number) {
    return this.rollupProvider.getAccountId(alias, accountNonce);
  }

  public async isAliasAvailable(alias: string) {
    return !(await this.getLatestAliasNonce(alias));
  }

  public async isRemoteAliasAvailable(alias: string) {
    return !(await this.rollupProvider.getLatestAliasNonce(alias));
  }

  public async computeAliasHash(alias: string) {
    return AliasHash.fromAlias(alias, this.blake2s);
  }

  public async getDefiInteractionNonce(txId: TxId) {
    const tx = await this.db.getDefiTx(txId);
    if (!tx) {
      throw new Error('Unknown txId');
    }
    return tx.interactionNonce;
  }

  public async userExists(userId: AccountId) {
    return !!(await this.db.getUser(userId));
  }

  public async getUserData(userId: AccountId) {
    return this.getUserState(userId).getUser();
  }

  public async getUsersData() {
    return this.userStates.map(us => us.getUser());
  }

  public async derivePublicKey(privateKey: Buffer) {
    return new GrumpkinAddress(this.grumpkin.mul(Grumpkin.one, privateKey));
  }

  public async constructSignature(message: Buffer, privateKey: Buffer) {
    return this.schnorr.constructSignature(message, privateKey);
  }

  public async addUser(privateKey: Buffer, accountNonce?: number, noSync = false) {
    return this.serialQueue.push(async () => {
      const publicKey = await this.derivePublicKey(privateKey);
      if (accountNonce === undefined) {
        accountNonce = await this.getLatestAccountNonce(publicKey);
      }
      const id = new AccountId(publicKey, accountNonce);
      if (await this.db.getUser(id)) {
        throw new Error(`User already exists: ${id}`);
      }

      let syncedToRollup = -1;
      if (noSync) {
        const {
          blockchainStatus: { nextRollupId },
        } = await this.getRemoteStatus();
        syncedToRollup = nextRollupId - 1;
      }

      const aliasHash = accountNonce > 0 ? await this.db.getAliasHashByAddress(publicKey) : undefined;
      const user = { id, privateKey, publicKey, accountNonce, aliasHash, syncedToRollup };
      await this.db.addUser(user);

      const userState = this.userStateFactory.createUserState(user);
      await userState.init();
      this.userStates.push(userState);
      this.startSyncingUserState(userState, []);

      this.emit(SdkEvent.UPDATED_USERS);

      return userState.getUser();
    });
  }

  public async removeUser(userId: AccountId) {
    const userState = this.getUserState(userId);
    this.userStates = this.userStates.filter(us => us !== userState);
    this.stopSyncingUserState(userState);
    await this.db.removeUser(userId);

    this.emit(SdkEvent.UPDATED_USERS);
  }

  public async getSigningKeys(userId: AccountId) {
    const keys = await this.db.getUserSigningKeys(userId);
    return keys.map(k => k.key);
  }

  public async getBalances(userId: AccountId) {
    return this.getUserState(userId).getBalances();
  }

  public async getBalance(assetId: number, userId: AccountId) {
    const userState = this.getUserState(userId);
    return userState.getBalance(assetId);
  }

  public async getSpendableSum(assetId: number, userId: AccountId, excludePendingNotes?: boolean) {
    const userState = this.getUserState(userId);
    return userState.getSpendableSum(assetId, excludePendingNotes);
  }

  public async getSpendableSums(userId: AccountId, excludePendingNotes?: boolean) {
    const userState = this.getUserState(userId);
    return userState.getSpendableSums(excludePendingNotes);
  }

  public async getMaxSpendableValue(
    assetId: number,
    userId: AccountId,
    numNotes?: number,
    excludePendingNotes?: boolean,
  ) {
    const userState = this.getUserState(userId);
    return userState.getMaxSpendableValue(assetId, numNotes, excludePendingNotes);
  }

  public async pickNotes(userId: AccountId, assetId: number, value: bigint, excludePendingNotes?: boolean) {
    return this.getUserState(userId).pickNotes(assetId, value, excludePendingNotes);
  }

  public async pickNote(userId: AccountId, assetId: number, value: bigint, excludePendingNotes?: boolean) {
    return this.getUserState(userId).pickNote(assetId, value, excludePendingNotes);
  }

  public async getUserTxs(userId: AccountId) {
    return this.db.getUserTxs(userId);
  }

  public async getRemoteUnsettledAccountTxs() {
    return this.rollupProvider.getUnsettledAccountTxs();
  }

  public async getRemoteUnsettledPaymentTxs() {
    return this.rollupProvider.getUnsettledPaymentTxs();
  }

  /**
   * Kicks off data tree updates, user note decryptions, alias table updates, proving key construction.
   * Moves the sdk into RUNNING state.
   */
  public async run() {
    if (this.initState === SdkInitState.RUNNING) {
      return;
    }

    if (this.serialQueue.length()) {
      throw new Error('`run` must be called before other proof-generating apis.');
    }

    this.updateInitState(SdkInitState.RUNNING);

    this.serialQueue.push(async () => {
      const { useKeyCache } = this.options;

      const {
        proverless,
        blockchainStatus: { verifierContractAddress },
      } = await this.getRemoteStatus();

      const vca = await this.getLocalVerifierContractAddress();
      const forceCreate = (vca && !vca.equals(verifierContractAddress)) || !useKeyCache;

      const maxCircuitSize = Math.max(JoinSplitProver.getCircuitSize(), AccountProver.getCircuitSize());
      const crsData = await this.getCrsData(maxCircuitSize);

      await this.pippenger.init(crsData);
      await this.genesisSync();
      const receivedBlockContexts = await this.startReceivingBlocks();
      this.userStates.forEach(us => this.startSyncingUserState(us, receivedBlockContexts));
      await this.createJoinSplitProofCreators(forceCreate, proverless);
      await this.createAccountProofCreator(forceCreate, proverless);

      // Makes the saved proving keys considered valid. Hence set this after they're saved.
      await this.leveldb.put('verifierContractAddress', verifierContractAddress.toBuffer());
    });
  }

  // -------------------------------------------------------
  // PUBLIC METHODS FROM HERE ON REQUIRE run() TO BE CALLED.
  // -------------------------------------------------------

  public async createDepositProof(
    assetId: number,
    publicInput: bigint,
    privateOutput: bigint,
    noteRecipient: AccountId,
    publicOwner: EthAddress,
    txRefNo: number,
  ) {
    return this.serialQueue.push(async () => {
      this.assertInitState(SdkInitState.RUNNING);

      // Create a one time user to generate and sign the proof.
      const privateKey = randomBytes(32);
      const publicKey = await this.derivePublicKey(privateKey);
      const accountNonce = 0;
      const user = {
        id: new AccountId(publicKey, accountNonce),
        privateKey,
        publicKey,
        accountNonce,
        syncedToRollup: -1,
      };
      const signer = new SchnorrSigner(this, publicKey, privateKey);
      const spendingPublicKey = GrumpkinAddress.randomAddress();

      const proofInput = await this.paymentProofCreator.createProofInput(
        user,
        [], // notes
        BigInt(0), // privateInput
        privateOutput,
        BigInt(0), // senderPrivateOutput
        publicInput,
        BigInt(0), // publicOutput
        assetId,
        noteRecipient,
        publicOwner,
        spendingPublicKey,
        0, // allowChain
      );
      const signature = await signer.signMessage(proofInput.signingData);

      return this.paymentProofCreator.createProof(user, { ...proofInput, signature }, txRefNo);
    });
  }

  public async createPaymentProofInput(
    userId: AccountId,
    assetId: number,
    publicInput: bigint,
    publicOutput: bigint,
    privateInput: bigint,
    recipientPrivateOutput: bigint,
    senderPrivateOutput: bigint,
    noteRecipient: AccountId | undefined,
    publicOwner: EthAddress | undefined,
    spendingPublicKey: GrumpkinAddress,
    allowChain: number,
  ) {
    return this.serialQueue.push(async () => {
      this.assertInitState(SdkInitState.RUNNING);

      const userState = this.getUserState(userId);
      const user = userState.getUser();

      const notes = privateInput ? await userState.pickNotes(assetId, privateInput) : [];
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
      const userId = new AccountId(outputNotes[1].ownerPubKey, outputNotes[1].accountNonce);
      const userState = this.getUserState(userId);
      const user = userState.getUser();
      return this.paymentProofCreator.createProof(user, input, txRefNo);
    });
  }

  public async createAccountProofSigningData(
    signingPubKey: GrumpkinAddress,
    alias: string,
    accountNonce: number,
    migrate: boolean,
    accountPublicKey: GrumpkinAddress,
    newAccountPublicKey?: GrumpkinAddress,
    newSigningPubKey1?: GrumpkinAddress,
    newSigningPubKey2?: GrumpkinAddress,
  ) {
    return this.serialQueue.push(async () => {
      this.assertInitState(SdkInitState.RUNNING);
      const aliasHash = await this.computeAliasHash(alias);
      const tx = await this.accountProofCreator.createAccountTx(
        signingPubKey,
        aliasHash,
        accountNonce,
        migrate,
        accountPublicKey,
        newAccountPublicKey,
        newSigningPubKey1,
        newSigningPubKey2,
      );
      return this.accountProofCreator.computeSigningData(tx);
    });
  }

  public async createAccountProofInput(
    userId: AccountId,
    aliasHash: AliasHash,
    migrate: boolean,
    signingPublicKey: GrumpkinAddress,
    newSigningPublicKey1: GrumpkinAddress | undefined,
    newSigningPublicKey2: GrumpkinAddress | undefined,
    newAccountPrivateKey: Buffer | undefined,
  ) {
    return this.serialQueue.push(async () => {
      this.assertInitState(SdkInitState.RUNNING);
      const newAccountPublicKey = newAccountPrivateKey ? await this.derivePublicKey(newAccountPrivateKey) : undefined;
      return this.accountProofCreator.createProofInput(
        aliasHash,
        userId.accountNonce,
        migrate,
        userId.publicKey,
        signingPublicKey,
        newAccountPublicKey,
        newSigningPublicKey1,
        newSigningPublicKey2,
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
    userId: AccountId,
    bridgeId: BridgeId,
    depositValue: bigint,
    inputNotes: Note[],
    spendingPublicKey: GrumpkinAddress,
  ) {
    return this.serialQueue.push(async () => {
      this.assertInitState(SdkInitState.RUNNING);
      const userState = this.getUserState(userId);
      const user = userState.getUser();
      return this.defiDepositProofCreator.createProofInput(user, bridgeId, depositValue, inputNotes, spendingPublicKey);
    });
  }

  public async createDefiProof(input: JoinSplitProofInput, txRefNo: number) {
    return this.serialQueue.push(async () => {
      this.assertInitState(SdkInitState.RUNNING);

      const { outputNotes } = input.tx;
      const userId = new AccountId(outputNotes[1].ownerPubKey, outputNotes[1].accountNonce);
      const userState = this.getUserState(userId);
      const user = userState.getUser();
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
            const recipientTx = createCorePaymentTxForRecipient(proof.tx as CorePaymentTx, recipient);
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

  public async isUserSynching(userId: AccountId) {
    this.assertInitState(SdkInitState.RUNNING);

    return this.getUserState(userId).isSyncing();
  }

  public async awaitUserSynchronised(userId: AccountId) {
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

  private getUserState(userId: AccountId) {
    const userState = this.userStates.find(us => us.getUser().id.equals(userId));
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

  private updateInitState(initState: SdkInitState) {
    this.initState = initState;
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

  private async initUserStates() {
    debug('initializing user states...');
    const users = await this.db.getUsers();
    this.userStates = users.map(u => this.userStateFactory.createUserState(u));
    await Promise.all(this.userStates.map(us => us.init()));
  }

  private async startSyncingUserState(userState: UserState, blockContexts: BlockContext[]) {
    userState.on(UserStateEvent.UPDATED_USER_STATE, (id: Buffer) => {
      this.emit(SdkEvent.UPDATED_USER_STATE, id);
    });
    await userState.startSync(blockContexts);
  }

  private async stopSyncingUserState(userState: UserState) {
    userState.removeAllListeners();
    await userState.stopSync();
  }

  private async createJoinSplitProofCreators(recreateKeys: boolean, proverless: boolean) {
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
    const start = new Date().getTime();
    await joinSplitProver.computeKey();
    if (this.options.useKeyCache) {
      debug('saving join-split proving key...');
      const newProvingKey = await joinSplitProver.getKey();
      await this.db.addKey('join-split-proving-key', newProvingKey);
    } else {
      await this.db.deleteKey('join-split-proving-key');
    }
    debug(`complete: ${new Date().getTime() - start}ms`);
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
    const start = new Date().getTime();
    await accountProver.computeKey();
    if (this.options.useKeyCache) {
      debug('saving account proving key...');
      const newProvingKey = await accountProver.getKey();
      await this.db.addKey('account-proving-key', newProvingKey);
    } else {
      await this.db.deleteKey('account-proving-key');
    }
    debug(`complete: ${new Date().getTime() - start}ms`);
  }

  private async syncAliasesAndKeys(accounts: AccountData[], hashPathMap: { [key: number]: HashPath }) {
    const aliases = new Array<Alias>();
    const uniqueSigningKeys = new Map<string, SigningKey>();

    // There can be duplicate account/nonce/signing key combinations.
    // We need to just keep the most recent one.
    // This loop simulates upserts by keeping the most recent version before inserting into the DB.
    let noteIndex = 0;
    for (let i = 0; i < accounts.length; i++) {
      const {
        alias: { address, accountNonce },
        signingKeys: { signingKey1, signingKey2 },
      } = accounts[i];
      const accountId = new AccountId(new GrumpkinAddress(address), accountNonce);

      const signingKeys = [signingKey1, signingKey2];
      for (let j = 0; j < signingKeys.length; j++) {
        const key = signingKeys[j];
        const keyVal = key.toString('hex') + ' - ' + accountId.toString();
        const sk: SigningKey = { treeIndex: noteIndex, key, accountId, hashPath: hashPathMap[noteIndex].toBuffer() };
        uniqueSigningKeys.set(keyVal, sk);
        noteIndex++;
      }

      aliases.push({
        aliasHash: new AliasHash(accounts[i].alias.aliasHash),
        address: new GrumpkinAddress(accounts[i].alias.address),
        latestNonce: accounts[i].alias.accountNonce,
      });
    }
    const keys = [...uniqueSigningKeys.values()];

    debug(`synching with ${aliases.length} aliases`);
    const aliasesTimer = new Timer();
    await this.db.setAliases(aliases);
    debug(`aliases saved in ${aliasesTimer.s()}s`);

    debug(`synching with ${keys.length} signing keys`);
    const keysTimer = new Timer();
    await this.db.addUserSigningKeys(keys);
    debug(`signing keys saved in ${keysTimer.s()}s`);
  }

  // Returns a mapping of tree index to hash path for all account notes
  private async syncCommitments(accounts: AccountData[]) {
    const { rollupSize } = await this.getRemoteStatus();
    const commitments = accounts.flatMap(x => [x.notes.note1, x.notes.note2]);
    const size = 1 << Math.ceil(Math.log2(rollupSize));
    // 2 notes per tx
    const notesInSubtree = size * WorldStateConstants.NUM_NEW_DATA_TREE_NOTES_PER_TX;
    let noteIndex = 0;
    const hashPathMap: { [key: number]: HashPath } = {};
    const roots: Buffer[] = [];
    const subTreeTimer = new Timer();
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
    debug(`${roots.length} sub-trees created in ${subTreeTimer.s()}s, adding roots to data tree...`);
    const dataTreeTimer = new Timer();
    await this.worldState.insertElements(0, roots);
    debug(`data tree sync completed in ${dataTreeTimer.s()}s`);
    return hashPathMap;
  }

  private async genesisSync() {
    const syncedToRollup = await this.getSyncedToRollup();
    if (syncedToRollup >= 0) {
      return;
    }

    debug('initialising genesis state from server...');
    const genesisTimer = new Timer();
    const initialState = await this.rollupProvider.getInitialWorldState();
    const accounts = InitHelpers.parseAccountTreeData(initialState.initialAccounts);
    const hashPathMap = await this.syncCommitments(accounts);
    await this.syncAliasesAndKeys(accounts, hashPathMap);
    debug(`genesis sync completed in ${genesisTimer.s()}s`);
  }

  /**
   * Kicks off the process of listening for blocks, also ensures we are fully synced
   * Produces a set of block context objects that can be passed to user states for their sync process
   * Returns the set of generated shared block contexts
   */
  private async startReceivingBlocks() {
    this.rollupProvider.on('block', b => this.blockQueue.put(b));
    this.processBlocksPromise = this.processBlockQueue();

    const receivedBlockContexts = await this.sync();

    const syncedToRollup = await this.getSyncedToRollup();
    await this.rollupProvider.start(+syncedToRollup + 1);

    debug(`started processing blocks, generated ${receivedBlockContexts.length} shared blocks...`);
    return receivedBlockContexts;
  }

  private async stopReceivingBlocks() {
    await this.rollupProvider.stop();
    this.rollupProvider.removeAllListeners();
    this.blockQueue.cancel();
    await this.processBlocksPromise;
  }

  /**
   * Called when data root is not as expected. We need to save parts of leveldb we don't want to lose, erase the db,
   * and rebuild the merkle tree.
   */
  private async eraseAndRebuildDataTree() {
    debug('erasing and rebuilding data tree...');

    const rca = await this.getLocalRollupContractAddress();
    const vca = await this.getLocalVerifierContractAddress();
    await this.leveldb.clear();
    await this.leveldb.put('rollupContractAddress', rca!.toBuffer());
    if (vca) {
      await this.leveldb.put('verifierContractAddress', vca.toBuffer());
    }

    const { rollupSize } = await this.getRemoteStatus();

    // 2 notes per tx
    const subtreeDepth = Math.ceil(Math.log2(rollupSize * WorldStateConstants.NUM_NEW_DATA_TREE_NOTES_PER_TX));
    await this.worldState.init(subtreeDepth);

    const initialState = await this.rollupProvider.getInitialWorldState();
    const accounts = InitHelpers.parseAccountTreeData(initialState.initialAccounts);
    await this.syncCommitments(accounts);

    await this.sync();
  }

  private async sync() {
    const syncedToRollup = await this.getSyncedToRollup();
    const blocks = await this.rollupProvider.getBlocks(syncedToRollup + 1);

    debug(`blocks received from rollup provider: ${blocks.length}`);

    // For debugging.
    const oldRoot = this.worldState.getRoot();
    const oldSize = this.worldState.getSize();

    if (!blocks.length) {
      // TODO: Ugly hotfix. Find root cause.
      // If no new blocks, we expect our local data root to be equal to that on falafel.
      const { dataRoot: expectedDataRoot, dataSize: expectedDataSize } = (await this.getRemoteStatus())
        .blockchainStatus;
      if (!oldRoot.equals(expectedDataRoot)) {
        debug(`old root ${oldRoot.toString('hex')}, Expected root ${expectedDataRoot.toString('hex')}`);
        await this.eraseAndRebuildDataTree();
        await this.rollupProvider.clientLog({
          message: 'Invalid dataRoot.',
          synchingFromRollup: syncedToRollup,
          blocksReceived: blocks.length,
          currentRoot: oldRoot.toString('hex'),
          currentSize: oldSize,
          expectedDataRoot: expectedDataRoot.toString('hex'),
          expectedDataSize,
        });
      }
      return [];
    }

    const rollups = blocks.map(b => RollupProofData.fromBuffer(b.rollupProofData));
    const offchainTxData = blocks.map(b => b.offchainTxData);

    // For debugging.
    const expectedDataRoot = rollups[rollups.length - 1].newDataRoot;
    const expectedDataSize = rollups[0].dataStartIndex + rollups.reduce((a, r) => a + r.rollupSize * 2, 0);

    debug('synchronising data...');
    debug(`adding ${blocks.length}, sub-roots to data tree starting at index ${rollups[0].dataStartIndex}...`);
    await this.worldState.insertElements(
      rollups[0].dataStartIndex,
      blocks.map(block => block.subtreeRoot!),
    );
    await this.processAliases(rollups, offchainTxData);
    await this.updateStatusRollupInfo(rollups[rollups.length - 1]);
    debug('done.');

    // TODO: Ugly hotfix. Find root cause.
    // We expect our data root to be equal to the new data root in the last block we processed.
    if (!this.worldState.getRoot().equals(expectedDataRoot)) {
      await this.eraseAndRebuildDataTree();
      this.rollupProvider.clientLog({
        message: 'Invalid dataRoot.',
        synchingFromRollup: syncedToRollup,
        blocksReceived: blocks.length,
        oldRoot: oldRoot.toString('hex'),
        oldSize,
        newRoot: this.worldState.getRoot().toString('hex'),
        newSize: this.worldState.getSize(),
        expectedDataRoot: expectedDataRoot.toString('hex'),
        expectedDataSize,
      });
      return [];
    }

    const blockContexts = blocks.map(block => new BlockContext(block, this.pedersen));
    // Forward the block on to each UserState for processing.
    for (const context of blockContexts) {
      this.userStates.forEach(us => us.processBlock(context));
    }
    return blockContexts;
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

  private async processBlockQueue() {
    while (true) {
      const block = await this.blockQueue.get();
      if (!block) {
        break;
      }

      await this.serialQueue.push(async () => {
        await this.worldState.syncFromDb().catch(() => {});
        const rollup = RollupProofData.fromBuffer(block.rollupProofData);
        await this.worldState.insertElement(rollup.dataStartIndex, block.subtreeRoot!);
        await this.processAliases([rollup], [block.offchainTxData]);
        await this.updateStatusRollupInfo(rollup);

        const blockContext = new BlockContext(block, this.pedersen);
        // Forward the block on to each UserState for processing.
        this.userStates.forEach(us => us.processBlock(blockContext));
      });
    }
  }

  private async processAliases(rollups: RollupProofData[], offchainTxData: Buffer[][]) {
    const processRollup = (rollup: RollupProofData, offchainData: Buffer[]) => {
      const aliases: Alias[] = [];
      for (let i = 0; i < rollup.innerProofData.length; ++i) {
        const proof = rollup.innerProofData[i];
        if (proof.proofId !== ProofId.ACCOUNT) {
          continue;
        }

        const { accountPublicKey, accountAliasId, spendingPublicKey1 } = OffchainAccountData.fromBuffer(
          offchainData[i],
        );
        const commitment = this.noteAlgos.accountNoteCommitment(accountAliasId, accountPublicKey, spendingPublicKey1);
        // Only need to check one commitment to make sure the accountAliasId and accountPublicKey pair is valid.
        if (commitment.equals(proof.noteCommitment1)) {
          aliases.push({
            address: accountPublicKey,
            aliasHash: accountAliasId.aliasHash,
            latestNonce: accountAliasId.accountNonce,
          });
        }
      }
      return aliases;
    };

    const aliases = rollups.map((rollup, i) => processRollup(rollup, offchainTxData[i])).flat();
    await this.db.setAliases(aliases);
  }
}
