import { AliasHash } from '@aztec/barretenberg/account_id';
import { EthAddress, GrumpkinAddress } from '@aztec/barretenberg/address';
import { AssetValue } from '@aztec/barretenberg/asset';
import { toBigIntBE } from '@aztec/barretenberg/bigint_buffer';
import { EthereumProvider } from '@aztec/barretenberg/blockchain';
import { DecodedBlock } from '@aztec/barretenberg/block_source';
import { BridgeCallData } from '@aztec/barretenberg/bridge_call_data';
import { ProofId } from '@aztec/barretenberg/client_proofs';
import { Blake2s, keccak256, Pedersen, Schnorr } from '@aztec/barretenberg/crypto';
import { Grumpkin } from '@aztec/barretenberg/ecc';
import { InitHelpers, LENGTH_OF_ACCOUNT_DATA } from '@aztec/barretenberg/environment';
import { createDebugLogger, logHistory } from '@aztec/barretenberg/log';
import { NoteAlgorithms } from '@aztec/barretenberg/note_algorithms';
import { OffchainAccountData } from '@aztec/barretenberg/offchain_tx_data';
import { retryUntil } from '@aztec/barretenberg/retry';
import { RollupProofData } from '@aztec/barretenberg/rollup_proof';
import { BridgePublishQuery, BridgePublishQueryResult, RollupProvider, Tx } from '@aztec/barretenberg/rollup_provider';
import { InterruptableSleep } from '@aztec/barretenberg/sleep';
import { Timer } from '@aztec/barretenberg/timer';
import { TxId } from '@aztec/barretenberg/tx_id';
import { BarretenbergWasm, WorkerPool } from '@aztec/barretenberg/wasm';
import { WorldState, WorldStateConstants } from '@aztec/barretenberg/world_state';
import isNode from 'detect-node';
import { EventEmitter } from 'events';
import { LevelUp } from 'levelup';
import { AccountState, AccountStateEvent, AccountStateFactory } from '../account_state/index.js';
import { AztecWalletProvider, VanillaAztecWalletProvider } from '../aztec_wallet_provider/index.js';
import { BlockContext } from '../block_context/index.js';
import { BlockProcessor } from '../block_processor/index.js';
import { sendClientConsoleLog, sendClientLog } from '../client_log/client_log.js';
import { CorePaymentTx, createCorePaymentTxForRecipient } from '../core_tx/index.js';
import { Alias, Database } from '../database/index.js';
import { getSpendingKeysFromGenesisData, parseGenesisAliasesAndKeys } from '../genesis_state/index.js';
import {
  AztecKeyStore,
  ConstantKeyPair,
  decryptPrivateKeys,
  KeyStore,
  LegacyKeyStore,
  Permission,
  RecoveryKit,
} from '../key_store/index.js';
import { NotePickerOptions } from '../note_picker/index.js';
import { VERSION_HASH } from '../package_version.js';
import { ProofOutput, proofOutputToProofTx, ProofRequestDataFactory, ProofRequestOptions } from '../proofs/index.js';
import { MutexSerialQueue, SerialQueue } from '../serial_queue/index.js';
import { CoreSdkOptions } from './core_sdk_options.js';
import { SdkEvent, SdkStatus } from './sdk_status.js';
import { sdkVersion } from './sdk_version.js';

enum SdkInitState {
  // Constructed but uninitialized. Unusable.
  UNINITIALIZED = 'UNINITIALIZED',
  // Initialized but not yet synching data tree and accounts. Can be queried for data, but not create proofs.
  INITIALIZED = 'INITIALIZED',
  // Synchronises data tree and accounts. Ready for proof construction.
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
export class CoreSdk extends EventEmitter {
  private dataVersion = 1;
  private options!: CoreSdkOptions;
  private worldState!: WorldState;
  private accountStateFactory!: AccountStateFactory;
  private accountStates: AccountState[] = [];
  private proofRequestDataFactory!: ProofRequestDataFactory;
  private serialQueue!: SerialQueue;
  private broadcastChannel: BroadcastChannel | undefined = isNode ? undefined : new BroadcastChannel('aztec-sdk');
  private sdkStatus: SdkStatus = {
    serverUrl: '',
    chainId: -1,
    rollupContractAddress: EthAddress.ZERO,
    permitHelperContractAddress: EthAddress.ZERO,
    verifierContractAddress: EthAddress.ZERO,
    feePayingAssetIds: [0],
    rollupSize: -1,
    syncedToRollup: -1,
    latestRollupId: -1,
    dataRoot: Buffer.alloc(0),
    dataSize: 0,
    useKeyCache: false,
    proverless: false,
    version: sdkVersion,
  };
  private initState = SdkInitState.UNINITIALIZED;
  private noteAlgos!: NoteAlgorithms;
  private blake2s!: Blake2s;
  private grumpkin!: Grumpkin;
  private schnorr!: Schnorr;
  private syncSleep = new InterruptableSleep();
  private synchingPromise!: Promise<void>;
  private debug = createDebugLogger('bb:core_sdk');
  private initialTreeSize!: number;

  constructor(
    private leveldb: LevelUp,
    private db: Database,
    private rollupProvider: RollupProvider,
    private barretenberg: BarretenbergWasm,
    private pedersen: Pedersen,
    private workerPool?: WorkerPool,
  ) {
    super();

    if (this.broadcastChannel) {
      this.broadcastChannel.onmessage = ({ data: { event, args } }) => {
        if (event === SdkEvent.UPDATED_ACCOUNT_STATE) {
          this.emit(SdkEvent.UPDATED_ACCOUNT_STATE, GrumpkinAddress.fromString(args[0]));
        }
      };
    }
    this.rollupProvider.on('versionMismatch', error => {
      this.debug(error);
      this.emit(SdkEvent.VERSION_MISMATCH);
    });
  }

  /**
   * Constructs internal components.
   * Erases dbs if rollup contract address changed.
   * Destroys injected components on failure.
   */
  public async init(options: CoreSdkOptions) {
    if (this.initState !== SdkInitState.UNINITIALIZED) {
      throw new Error('Already initialized.');
    }

    try {
      this.debug(`initializing...${sdkVersion ? ` (version: ${sdkVersion})` : ''}`);
      this.debug(`Version hash: ${VERSION_HASH}`);

      this.options = options;
      // Tasks in serialQueue require states like notes and hash path, which will need the sdk to sync to (ideally)
      // the latest block.

      this.serialQueue = new MutexSerialQueue(this.db, 'aztec_core_sdk', 30000);
      this.noteAlgos = new NoteAlgorithms(this.barretenberg);
      this.blake2s = new Blake2s(this.barretenberg);
      this.grumpkin = new Grumpkin(this.barretenberg);
      this.schnorr = new Schnorr(this.barretenberg);
      const blockProcessor = new BlockProcessor(this.noteAlgos, this.db);
      this.accountStateFactory = new AccountStateFactory(blockProcessor, this.rollupProvider, this.db);
      this.worldState = new WorldState(this.leveldb, this.pedersen);
      this.proofRequestDataFactory = new ProofRequestDataFactory(this.worldState, this.db, this.blake2s);

      const {
        blockchainStatus: { chainId, rollupContractAddress, permitHelperContractAddress, verifierContractAddress },
        runtimeConfig: { feePayingAssetIds, useKeyCache },
        rollupSize,
        proverless,
      } = await this.getRemoteStatus();

      // Clear all data if contract changed or dataVersion changed.
      const rca = await this.getLocalRollupContractAddress();
      const localDataVersion = await this.getLocalDataVersion();
      if ((rca && !rca.equals(rollupContractAddress)) || localDataVersion !== this.dataVersion) {
        this.debug('erasing database...');
        await this.leveldb.clear();
        await this.db.clear();
        await this.setLocalDataVersion(this.dataVersion);
      }

      await this.db.addKey('rollupContractAddress', rollupContractAddress.toBuffer());

      // Initialize the "mutable" merkle tree. This is the tree that represents all layers about each rollup subtree.
      const subtreeDepth = Math.ceil(Math.log2(rollupSize * WorldStateConstants.NUM_NEW_DATA_TREE_NOTES_PER_TX));
      await this.worldState.init(subtreeDepth);

      this.sdkStatus = {
        ...this.sdkStatus,
        serverUrl: options.serverUrl,
        chainId,
        rollupContractAddress,
        permitHelperContractAddress,
        verifierContractAddress,
        feePayingAssetIds,
        rollupSize,
        syncedToRollup: await this.getLocalSyncedToRollup(),
        latestRollupId: await this.rollupProvider.getLatestRollupId(),
        dataSize: this.worldState.getSize(),
        dataRoot: this.worldState.getRoot(),
        useKeyCache,
        proverless,
      };

      this.initState = SdkInitState.INITIALIZED;
      this.debug('initialization complete.');
    } catch (err) {
      this.debug('initialization failed: ', err);
      // If initialization fails, we should destroy the components we've taken ownership of.
      await this.leveldb.close();
      await this.db.close();
      await this.workerPool?.destroy();
      this.serialQueue?.cancel();
      throw err;
    }
  }

  public async destroy() {
    this.debug('destroying...');

    // If sync() task is running, signals it to stop, to awake for exit if it's asleep, and awaits the exit.
    this.initState = SdkInitState.STOPPING;
    this.syncSleep.interrupt();
    await this.synchingPromise;

    // The serial queue will cancel itself. This ensures that anything currently in the queue finishes, and ensures
    // that once the await to push() returns, nothing else is on, or can be added to the queue.
    await this.serialQueue.push(() => Promise.resolve(this.serialQueue.cancel()));

    // Stop listening to account state updates.
    this.accountStates.forEach(a => a.removeAllListeners());

    // Destroy injected components.
    await this.leveldb.close();
    await this.db.close();
    await this.workerPool?.destroy();

    // Destroy components.
    this.broadcastChannel?.close();

    this.initState = SdkInitState.DESTROYED;
    this.emit(SdkEvent.DESTROYED);
    this.removeAllListeners();

    this.debug('destroyed.');
  }

  public getLocalStatus() {
    return Promise.resolve({ ...this.sdkStatus });
  }

  public async getRemoteStatus() {
    return await this.rollupProvider.getStatus();
  }

  public async sendConsoleLog(clientData?: string[], preserveLog?: boolean) {
    const logs = logHistory.getLogs();
    if (!logs.length && !clientData?.length) {
      return;
    }

    const publicKeys = this.accountStates.map(a => a.getAccountPublicKey());
    const ensureJson = (log: any[]) =>
      log.map(logArgs => {
        try {
          JSON.stringify(logArgs);
          return logArgs;
        } catch (e) {
          return `${logArgs}`;
        }
      });
    await sendClientConsoleLog(this.rollupProvider, {
      publicKeys: publicKeys.map(k => k.toString()),
      logs: logs.map(ensureJson),
      clientData,
      clientUrl: location?.href,
    });
    if (!preserveLog) {
      logHistory.clear(logs.length);
    }
  }

  public async isAccountRegistered(accountPublicKey: GrumpkinAddress, includePending: boolean) {
    return (
      !!(await this.db.getAlias(accountPublicKey)) ||
      (includePending && (await this.rollupProvider.isAccountRegistered(accountPublicKey)))
    );
  }

  public async isAliasRegistered(alias: string, includePending: boolean) {
    const aliasHash = this.computeAliasHash(alias);
    return (
      (await this.db.getAliases(aliasHash)).length > 0 ||
      (includePending && (await this.rollupProvider.isAliasRegistered(alias)))
    );
  }

  public async isAliasRegisteredToAccount(accountPublicKey: GrumpkinAddress, alias: string, includePending: boolean) {
    const aliasHash = this.computeAliasHash(alias);
    const savedAlias = await this.db.getAlias(accountPublicKey);
    return savedAlias
      ? savedAlias.aliasHash.equals(aliasHash)
      : includePending && (await this.rollupProvider.isAliasRegisteredToAccount(accountPublicKey, alias));
  }

  public async getAccountPublicKey(alias: string) {
    const aliasHash = this.computeAliasHash(alias);
    const aliases = await this.db.getAliases(aliasHash);
    return aliases[0]?.accountPublicKey;
  }

  public async getAccountIndex(alias: string) {
    const aliasHash = this.computeAliasHash(alias);
    const aliases = await this.db.getAliases(aliasHash);
    return aliases[0]?.index;
  }

  public async getTxFees(assetId: number) {
    return await this.rollupProvider.getTxFees(assetId);
  }

  public async getDefiFees(bridgeCallData: BridgeCallData) {
    return await this.rollupProvider.getDefiFees(bridgeCallData);
  }

  public async getPendingDepositTxs() {
    return await this.rollupProvider.getPendingDepositTxs();
  }

  public async getDefiInteractionNonce(txId: TxId) {
    const tx = await this.db.getDefiTx(txId);
    if (!tx) {
      throw new Error('Unknown txId');
    }
    return tx.interactionNonce;
  }

  public derivePublicKey(privateKey: Buffer) {
    return GrumpkinAddress.fromPrivateKey(privateKey, this.grumpkin);
  }

  public deriveMultiSigPublicKey(privateKey: Buffer) {
    return this.schnorr.multiSigComputePublicKey(privateKey);
  }

  public combineMultiSigPublicKeys(publicKeys: Buffer[]) {
    return new GrumpkinAddress(this.schnorr.multiSigValidateAndCombinePublicKeys(publicKeys));
  }

  public generateMultiSigData() {
    return this.schnorr.multiSigRoundOne();
  }

  public createMultiSigSignature(
    message: Buffer,
    publicKeys: Buffer[],
    publicOutputs: Buffer[],
    privateKey: Buffer,
    privateOutput: Buffer,
  ) {
    return this.schnorr.multiSigRoundTwo(message, privateKey, privateOutput, publicKeys, publicOutputs);
  }

  public combineMultiSigSignatures(
    message: Buffer,
    publicKeys: Buffer[],
    publicOutputs: Buffer[],
    signatures: Buffer[],
  ) {
    return this.schnorr.multiSigCombineSignatures(message, publicKeys, publicOutputs, signatures);
  }

  public createLegacyKeyStore(account: EthAddress, permissions: Permission[], provider: EthereumProvider) {
    return new LegacyKeyStore(provider, account, this.barretenberg, permissions);
  }

  public createKeyStore(permissions: Permission[]) {
    return AztecKeyStore.create(this.barretenberg, permissions);
  }

  public decryptKeyPairs(encryptedKeys: Buffer, userPassword: string) {
    return decryptPrivateKeys(encryptedKeys, userPassword);
  }

  public openKeyStore(encryptedKeys: Buffer, userPassword: string, permissions: Permission[]) {
    return AztecKeyStore.open(encryptedKeys, userPassword, this.barretenberg, permissions);
  }

  public recoverAccountKey(recoveryKit: RecoveryKit, provider: EthereumProvider, account: EthAddress) {
    return AztecKeyStore.recoverAccountKey(recoveryKit, provider, account, this.barretenberg);
  }

  public deriveLegacySigningMessageHash(address: EthAddress) {
    const signingMessage = this.blake2s.hashToField(address.toBuffer());
    return Promise.resolve(keccak256(signingMessage));
  }

  public constructSignature(message: Buffer, privateKey: Buffer) {
    return Promise.resolve(this.schnorr.constructSignature(message, privateKey));
  }

  public createKeyPair(privateKey: Buffer) {
    const publicKey = this.derivePublicKey(privateKey);
    return new ConstantKeyPair(publicKey, privateKey, this.schnorr);
  }

  public createRandomKeyPair() {
    return ConstantKeyPair.random(this.grumpkin, this.schnorr);
  }

  public async createAztecWalletProvider(keyStore: KeyStore) {
    const { proverless } = await this.getLocalStatus();
    return await VanillaAztecWalletProvider.new(
      keyStore,
      proverless,
      this.rollupProvider,
      this.barretenberg,
      this.workerPool,
    );
  }

  public getAccounts() {
    return Promise.resolve(this.accountStates.map(a => a.getAccountPublicKey()));
  }

  public async isAccountAdded(accountPublicKey: GrumpkinAddress) {
    // TODO - don't have to check db if removing an account in other instance also removes it from this.accountStates
    return (
      this.accountStates.some(a => a.getAccountPublicKey().equals(accountPublicKey)) &&
      !!(await this.db.getAccount(accountPublicKey))
    );
  }

  public getAztecWalletProvider(accountPublicKey: GrumpkinAddress) {
    return this.getAccountState(accountPublicKey).getAztecWalletProvider();
  }

  public async addAccount(provider: AztecWalletProvider, noSync = false) {
    return await this.serialQueue.push(async () => {
      const accountPublicKey = await provider.getAccountPublicKey();

      if (!(await this.db.getAccount(accountPublicKey))) {
        const { latestRollupId } = this.sdkStatus;
        const syncedToRollup = noSync ? latestRollupId : -1;
        await this.db.addAccount({ accountPublicKey, syncedToRollup });
        await this.addInitialSpendingKeys([accountPublicKey]);
      }

      const olsAccountState = this.accountStates.find(a => a.getAccountPublicKey().equals(accountPublicKey));
      this.accountStates = this.accountStates.filter(a => a !== olsAccountState);
      olsAccountState?.removeAllListeners();
      const accountState = await this.initAccountState(provider);
      this.accountStates.push(accountState);

      if (!noSync) {
        // If the sync microtask is sleeping, wake it up to start syncing.
        this.syncSleep.interrupt();
      }

      return accountPublicKey;
    });
  }

  private async retrieveGenesisData() {
    const stored = await this.db.getGenesisData();
    if (stored.length) {
      return stored;
    }
    this.debug('genesis data not found locally, retrieving from server...');
    const serverData = await this.rollupProvider.getInitialWorldState();
    await this.db.setGenesisData(serverData.initialAccounts);
    return serverData.initialAccounts;
  }

  private async getInitialTreeSize(): Promise<number> {
    if (this.initialTreeSize === undefined) {
      const numGenesisAccounts = (await this.retrieveGenesisData()).length / LENGTH_OF_ACCOUNT_DATA;
      this.initialTreeSize = Math.ceil(numGenesisAccounts / this.sdkStatus.rollupSize);
      this.debug('initial tree size set to ', this.initialTreeSize);
    }
    return this.initialTreeSize;
  }

  public async removeAccount(accountPublicKey: GrumpkinAddress) {
    return await this.serialQueue.push(async () => {
      const accountState = this.getAccountState(accountPublicKey);
      this.accountStates = this.accountStates.filter(a => a !== accountState);
      accountState.removeAllListeners();
      await this.db.removeAccount(accountPublicKey);
      // TODO - broadcast UPDATED_ACCOUNT_STATE
    });
  }

  public getAccountSyncedToRollup(accountPublicKey: GrumpkinAddress) {
    return Promise.resolve(this.getAccountState(accountPublicKey).getSyncedToRollup());
  }

  public async getSpendingKeys(accountPublicKey: GrumpkinAddress) {
    const keys = await this.db.getSpendingKeys(accountPublicKey);
    return keys.map(k => k.key);
  }

  public async getBalances(accountPublicKey: GrumpkinAddress) {
    return await this.getAccountState(accountPublicKey).getBalances();
  }

  public async getBalance(accountPublicKey: GrumpkinAddress, assetId: number) {
    const accountState = this.getAccountState(accountPublicKey);
    return await accountState.getBalance(assetId);
  }

  public async getSpendableNoteValues(accountPublicKey: GrumpkinAddress, assetId: number, options?: NotePickerOptions) {
    const accountState = this.getAccountState(accountPublicKey);
    return await accountState.getSpendableNoteValues(assetId, options);
  }

  public async getSpendableSum(accountPublicKey: GrumpkinAddress, assetId: number, options?: NotePickerOptions) {
    const accountState = this.getAccountState(accountPublicKey);
    return await accountState.getSpendableSum(assetId, options);
  }

  public async getSpendableSums(accountPublicKey: GrumpkinAddress, options?: NotePickerOptions) {
    const accountState = this.getAccountState(accountPublicKey);
    return await accountState.getSpendableSums(options);
  }

  public async getMaxSpendableNoteValues(
    accountPublicKey: GrumpkinAddress,
    assetId: number,
    options?: NotePickerOptions & { numNotes?: number },
  ) {
    const accountState = this.getAccountState(accountPublicKey);
    return await accountState.getMaxSpendableNoteValues(assetId, options);
  }

  public async pickNotes(
    accountPublicKey: GrumpkinAddress,
    assetId: number,
    value: bigint,
    options?: NotePickerOptions,
  ) {
    return await this.getAccountState(accountPublicKey).pickNotes(assetId, value, options);
  }

  public async pickNote(
    accountPublicKey: GrumpkinAddress,
    assetId: number,
    value: bigint,
    options?: NotePickerOptions,
  ) {
    return await this.getAccountState(accountPublicKey).pickNote(assetId, value, options);
  }

  public async getTxs(accountPublicKey: GrumpkinAddress) {
    return await this.db.getTxs(accountPublicKey);
  }

  /**
   * Moves the sdk into RUNNING state.
   * Kicks off data tree updates, note decryptions, alias table updates, proving key construction.
   */
  public run() {
    if (this.initState === SdkInitState.RUNNING) {
      return Promise.resolve();
    }

    this.initState = SdkInitState.RUNNING;

    this.serialQueue
      .push(async () => {
        await this.genesisSync();
        await this.getInitialTreeSize();
        this.startReceivingBlocks();
      })
      .catch(err => {
        this.debug('failed to run:', err);
        return this.destroy();
      });

    return Promise.resolve();
  }

  // -------------------------------------------------------
  // PUBLIC METHODS FROM HERE ON REQUIRE run() TO BE CALLED.
  // -------------------------------------------------------

  public async createPaymentProofRequestData(
    proofId: ProofId.DEPOSIT | ProofId.SEND | ProofId.WITHDRAW,
    accountPublicKey: GrumpkinAddress,
    spendingPublicKey: GrumpkinAddress,
    assetValue: AssetValue,
    fee: AssetValue,
    publicOwner: EthAddress,
    recipient: GrumpkinAddress,
    recipientSpendingKeyRequired: boolean,
    options?: ProofRequestOptions,
  ) {
    const requireSyncedState = proofId !== ProofId.DEPOSIT;

    const createPaymentProofRequestData = async () => {
      const accountState = this.accountStates.find(a => a.getAccountPublicKey().equals(accountPublicKey));
      return await this.proofRequestDataFactory.createPaymentProofRequestData(
        proofId,
        accountPublicKey,
        spendingPublicKey,
        assetValue,
        fee,
        publicOwner,
        recipient,
        recipientSpendingKeyRequired,
        accountState,
        options,
      );
    };

    return !requireSyncedState
      ? await createPaymentProofRequestData()
      : await this.serialQueue.push(async () => {
          this.assertInitState(SdkInitState.RUNNING);
          return await createPaymentProofRequestData();
        });
  }

  public async createAccountProofRequestData(
    accountPublicKey: GrumpkinAddress,
    spendingPublicKey: GrumpkinAddress,
    alias: string,
    newAccountPublicKey: GrumpkinAddress,
    newSpendingPublicKey1: GrumpkinAddress,
    newSpendingPublicKey2: GrumpkinAddress,
    deposit: AssetValue,
    fee: AssetValue,
    depositor: EthAddress,
    options?: ProofRequestOptions,
  ) {
    const requireSpendingKey =
      !accountPublicKey.equals(spendingPublicKey) && !spendingPublicKey.equals(GrumpkinAddress.ZERO);
    const requirePrivateInput = depositor.equals(EthAddress.ZERO) && !!fee.value;
    const requireSyncedState = requireSpendingKey || requirePrivateInput;

    const createAccountProofRequestData = async () => {
      const accountState = this.accountStates.find(a => a.getAccountPublicKey().equals(accountPublicKey));
      return await this.proofRequestDataFactory.createAccountProofRequestData(
        accountPublicKey,
        spendingPublicKey,
        alias,
        newAccountPublicKey,
        newSpendingPublicKey1,
        newSpendingPublicKey2,
        deposit,
        fee,
        depositor,
        accountState,
        options,
      );
    };

    return !requireSyncedState
      ? await createAccountProofRequestData()
      : await this.serialQueue.push(async () => {
          this.assertInitState(SdkInitState.RUNNING);
          return await createAccountProofRequestData();
        });
  }

  public async createDefiProofRequestData(
    accountPublicKey: GrumpkinAddress,
    spendingPublicKey: GrumpkinAddress,
    bridgeCallData: BridgeCallData,
    assetValue: AssetValue,
    fee: AssetValue,
    options?: ProofRequestOptions,
  ) {
    return await this.serialQueue.push(async () => {
      this.assertInitState(SdkInitState.RUNNING);

      const accountState = this.accountStates.find(a => a.getAccountPublicKey().equals(accountPublicKey));

      return await this.proofRequestDataFactory.createDefiProofRequestData(
        accountPublicKey,
        spendingPublicKey,
        bridgeCallData,
        assetValue,
        fee,
        accountState,
        options,
      );
    });
  }

  public async sendProofs(proofs: ProofOutput[], depositSignatures: Buffer[] = [], proofTxs: Tx[] = []) {
    return await this.serialQueue.push(async () => {
      this.assertInitState(SdkInitState.RUNNING);

      let depositSignatureIndex = 0;
      const txs = proofs.map(p => {
        if (p.tx.proofId === ProofId.DEPOSIT) {
          if (
            depositSignatureIndex > 0 &&
            !depositSignatures[depositSignatureIndex] !== !depositSignatures[depositSignatureIndex - 1]
          ) {
            throw new Error('Insufficient deposit signatures.');
          }
          return proofOutputToProofTx(p, depositSignatures[depositSignatureIndex++]);
        } else {
          return proofOutputToProofTx(p);
        }
      });
      const txIds = await this.rollupProvider.sendTxs([...proofTxs, ...txs]);

      for (const proof of proofs) {
        const { accountPublicKey } = proof.tx;
        try {
          await this.getAccountState(accountPublicKey).addProof(proof);
        } catch (e) {
          // Proof sender is not added.
        }

        // Add the payment proof to recipient's account if they are not the sender.
        if ([ProofId.DEPOSIT, ProofId.SEND].includes(proof.tx.proofId)) {
          const recipient = proof.outputNotes[0].owner;
          if (!recipient.equals(accountPublicKey)) {
            const recipientTx = createCorePaymentTxForRecipient(proof.tx as CorePaymentTx, recipient);
            try {
              await this.getAccountState(recipient).addProof({ ...proof, tx: recipientTx });
            } catch (e) {
              // Recipient's account is not added.
            }
          }
        }
      }

      return txIds;
    });
  }

  public async awaitSynchronised(timeout?: number) {
    this.assertInitState(SdkInitState.RUNNING);

    await retryUntil(() => this.isSynchronised(), 'data synchronised', timeout);
  }

  public isAccountSynching(accountPublicKey: GrumpkinAddress) {
    this.assertInitState(SdkInitState.RUNNING);

    return Promise.resolve(!this.getAccountState(accountPublicKey).isSynchronised(this.sdkStatus.latestRollupId));
  }

  public async awaitAccountSynchronised(accountPublicKey: GrumpkinAddress, timeout?: number) {
    this.assertInitState(SdkInitState.RUNNING);

    await this.getAccountState(accountPublicKey).awaitSynchronised(this.sdkStatus.latestRollupId, timeout);
  }

  public async awaitSettlement(txId: TxId, timeout?: number) {
    this.assertInitState(SdkInitState.RUNNING);

    await retryUntil(() => this.db.isTxSettled(txId), `tx settlement: ${txId}`, timeout);
  }

  public async awaitDefiDepositCompletion(txId: TxId, timeout?: number) {
    this.assertInitState(SdkInitState.RUNNING);

    const defiDepositCompleted = async () => {
      const tx = await this.db.getDefiTx(txId);
      if (!tx) {
        throw new Error('Unknown txId.');
      }

      return !!tx.settled;
    };
    await retryUntil(defiDepositCompleted, `defi interaction: ${txId}`, timeout);
  }

  public async awaitDefiFinalisation(txId: TxId, timeout?: number) {
    this.assertInitState(SdkInitState.RUNNING);

    const defiFinalised = async () => {
      const tx = await this.db.getDefiTx(txId);
      if (!tx) {
        throw new Error('Unknown txId.');
      }

      return !!tx.finalised;
    };
    await retryUntil(defiFinalised, `defi finalisation: ${txId}`, timeout);
  }

  public async awaitDefiSettlement(txId: TxId, timeout?: number) {
    this.assertInitState(SdkInitState.RUNNING);

    const defiSettled = async () => {
      const tx = await this.db.getDefiTx(txId);
      if (!tx) {
        throw new Error('Unknown txId.');
      }

      return !!tx.claimSettled;
    };
    await retryUntil(defiSettled, `defi settlement: ${txId}`, timeout);
  }

  // ---------------
  // PRIVATE METHODS
  // ---------------
  private getAccountState(accountPublicKey: GrumpkinAddress) {
    const account = this.accountStates.find(a => a.getAccountPublicKey().equals(accountPublicKey));
    if (!account) {
      throw new Error(`Account not found: ${accountPublicKey}`);
    }
    return account;
  }

  private isSynchronised() {
    return this.sdkStatus.syncedToRollup === this.sdkStatus.latestRollupId;
  }

  private assertInitState(state: SdkInitState) {
    if (this.initState !== state) {
      throw new Error(`Init state ${this.initState} !== ${state}`);
    }
  }

  private async setLocalDataVersion(version: number) {
    await this.db.addKey('dataVersion', Buffer.from([version]));
  }

  private async getLocalDataVersion() {
    const result = await this.db.getKey('dataVersion');
    return result ? result.readInt8(0) : 0;
  }

  private async getLocalRollupContractAddress() {
    const result = await this.db.getKey('rollupContractAddress');
    return result ? new EthAddress(result) : undefined;
  }

  private async getLocalSyncedToRollup() {
    return +(await this.leveldb.get('syncedToRollup').catch(() => -1));
  }

  private async initAccountState(provider: AztecWalletProvider) {
    const accountState = await this.accountStateFactory.createAccountState(provider);
    accountState.on(AccountStateEvent.UPDATED_ACCOUNT_STATE, id => {
      this.emit(SdkEvent.UPDATED_ACCOUNT_STATE, id);
      this.broadcastChannel?.postMessage({
        event: SdkEvent.UPDATED_ACCOUNT_STATE,
        args: [id.toString()],
      });
    });
    return accountState;
  }

  private async addInitialSpendingKeys(accountPublicKeys: GrumpkinAddress[]) {
    if (!accountPublicKeys.length) {
      return;
    }
    const genesisAccountsData = await this.retrieveGenesisData();
    if (genesisAccountsData.length) {
      const spendingKeys = await getSpendingKeysFromGenesisData(
        accountPublicKeys,
        genesisAccountsData,
        this.pedersen,
        this.sdkStatus.rollupSize,
      );
      this.debug(`found ${spendingKeys.length} spending keys for account${accountPublicKeys.length == 1 ? '' : 's'}`);
      if (spendingKeys.length) {
        await this.db.addSpendingKeys(spendingKeys);
      }
    }
  }

  private computeAliasHash(alias: string) {
    return AliasHash.fromAlias(alias, this.blake2s);
  }

  /**
   * If the world state has no data, download the initial world state data and process it.
   */
  private async genesisSync(commitmentsOnly = false) {
    await this.worldState.syncFromDb();
    if (this.worldState.getSize() > 0) {
      return;
    }

    this.debug('initializing genesis state from server...');
    const genesisTimer = new Timer();
    const initialState = await this.rollupProvider.getInitialWorldState();
    this.debug(
      `received genesis state with ${initialState.initialAccounts.length} bytes and ${initialState.initialSubtreeRoots.length} sub-tree roots`,
    );

    await this.db.setGenesisData(initialState.initialAccounts);
    await this.worldState.insertElements(0, initialState.initialSubtreeRoots);
    if (!commitmentsOnly) {
      const accounts = InitHelpers.parseAccountTreeData(initialState.initialAccounts);
      const genesisData = parseGenesisAliasesAndKeys(accounts);
      this.debug(`storing aliases to db...`);
      await this.db.addAliases(genesisData.aliases);
    }
    this.debug(`genesis sync complete in ${genesisTimer.s()}s`);
  }

  /**
   * Starts a micro task that repeatedly calls sync() on the serial queue.
   * sync() will only process so much data at a time. We sleep for 10s between calls only if we're fully synched.
   * If we're not fully synched, we loop around immediately to process more data.
   * This mechanism ensures we don't starve servicing the serial queue for long periods of time.
   * Will return once destroy() is called and the state shifts to STOPPING.
   */
  private startReceivingBlocks() {
    this.synchingPromise = (async () => {
      this.debug('starting sync task...');
      while (this.initState !== SdkInitState.STOPPING) {
        const timer = new Timer();
        try {
          await this.serialQueue.push(() => this.sync());
        } catch (err) {
          this.debug('sync() failed:', err);
          try {
            await sendClientLog(this.rollupProvider, {
              message: 'sync failed',
              error: err,
            });
          } catch (err) {
            this.debug('client log failed:', err);
          }

          await this.syncSleep.sleep(10000);
        }
        if (this.isSynchronised() && this.accountStates.every(a => a.isSynchronised(this.sdkStatus.latestRollupId))) {
          await this.syncSleep.sleep(this.options.pollInterval || 10000);
        } else if (timer.s() < 1) {
          // Ensure that at least 1s has passed before we loop around again.
          await this.syncSleep.sleep(1000);
        }
      }
      this.debug('stopped sync task.');
    })();
  }

  /**
   * Called when data root is not as expected. We need to erase the db and rebuild the merkle tree.
   */
  private async reinitDataTree() {
    this.debug('re-initializing data tree...');

    await this.leveldb.clear();

    const subtreeDepth = Math.ceil(
      Math.log2(this.sdkStatus.rollupSize * WorldStateConstants.NUM_NEW_DATA_TREE_NOTES_PER_TX),
    );
    await this.worldState.init(subtreeDepth);
    await this.genesisSync(true);
  }

  /**
   * Every time called, determine the lowest `from` block for core and user states. If some user state is synced to
   * a lower block, use this iteration for that user state to catch up (by calling syncUserStates(...) function).
   * If not, fetch the following chunk of blocks and apply them to both core and user states (syncBoth(...) function).
   */
  private async sync() {
    // Persistent data could have changed underfoot. Ensure this.sdkStatus and account states are up to date first.
    await this.readSyncInfo();
    await Promise.all(this.accountStates.map(a => a.syncFromDb()));

    const { syncedToRollup } = this.sdkStatus;

    // Determine the lowest synced block of all user states
    const userSyncedToRollup = Math.min(...this.accountStates.map(a => a.getSyncedToRollup()));

    // Insertion of new leaves into the merkle tree is most efficient when done in the "multiples of 2" leaves. For this
    // reason we want to be inserting chunks of 128 leaves when possible. At genesis, the Aztec Connect system didn't
    // start from 0 rollup blocks/leaves but instead from `initialSubtreeRootsLength` leaves (in Aztec Connect production
    // this number is 73). These initial blocks contain aliases from the old system. The SDK requests only `firstTake`
    // amount of blocks upon sync initialization which will ensure that the inefficent insertion happens only once and
    // the following insertions are done in multiples of 128.
    const firstTake = 128 - ((await this.getInitialTreeSize()) % 128);
    const from = Math.min(syncedToRollup, userSyncedToRollup) + 1;
    let take = from < firstTake ? firstTake - from : 128 - ((from - firstTake) % 128);

    if (userSyncedToRollup < syncedToRollup) {
      // Some user state is lagging behind core --> first make the user state catch up to core

      // Ensure user state is never synced to a higher block than core by capping the take amount
      take = Math.min(take, syncedToRollup - userSyncedToRollup);
      await this.syncUserStates(from, take);
    } else {
      // User state is not lagging behind core --> sync both
      await this.syncBoth(from, take);
    }
  }

  /**
   * @notice Fetches blocks and applies them to user states
   * @from Number of a block from which to sync
   * @take Number of blocks to fetch
   */
  private async syncUserStates(from: number, take: number) {
    const timer = new Timer();
    this.debug(`fetching blocks from ${from} for user states...`);
    let userBlocks = await this.rollupProvider.getBlocks(from, take);
    // Filter blocks with higher `rollupId`/`block height` than `to` --> this should not be necessary in case `take`
    // param was respected by the server but we do it just in case.
    userBlocks = userBlocks.filter(block => block.rollupId < from + take);
    if (!userBlocks.length) {
      // nothing to do
      return;
    }
    this.debug(`creating contexts for blocks ${from} to ${from + userBlocks.length - 1}...`);
    const userBlockContexts = userBlocks.map(b => BlockContext.fromBlock(b, this.pedersen));
    this.debug(`forwarding blocks to user states...`);
    await Promise.all(this.accountStates.map(us => us.processBlocks(userBlockContexts)));
    this.debug(`finished processing user state blocks ${from} to ${from + userBlocks.length - 1} in ${timer.s()}s...`);
  }

  /**
   * @notice Fetches blocks and applies them to both core and user states
   * @from Number of a block from which to sync
   * @take Number of blocks to fetch
   */
  private async syncBoth(from: number, take: number) {
    const timer = new Timer();

    const coreBlocks = await this.rollupProvider.getBlocks(from, take);
    if (!coreBlocks.length) {
      // nothing to do
      return;
    }
    this.debug(`creating contexts for blocks ${from} to ${from + coreBlocks.length - 1}...`);
    const coreBlockContexts = coreBlocks.map(b => BlockContext.fromBlock(b, this.pedersen));

    // For debugging corrupted data root.
    const oldRoot = this.worldState.getRoot();

    // First bring the core in sync (mutable data tree layers and accounts).
    const rollups = coreBlockContexts.map(b => b.rollup);
    const offchainTxData = coreBlocks.map(b => b.offchainTxData);
    const subtreeRoots = coreBlocks.map(block => block.subtreeRoot!);
    this.debug(`inserting ${subtreeRoots.length} rollup roots into data tree...`);
    const oldSize = this.worldState.getSize();
    await this.logOnFailure(
      () => this.worldState.insertElements(rollups[0].dataStartIndex, subtreeRoots),
      'worldState.insertElements',
    );
    this.debug(`processing aliases...`);
    await this.logOnFailure(() => this.processAliases(rollups, offchainTxData), 'processAliases');
    await this.logOnFailure(() => this.writeSyncInfo(rollups[rollups.length - 1].rollupId), 'writeSyncInfo');

    // TODO: Ugly hotfix. Find root cause.
    // We expect our data root to be equal to the new data root in the last block we processed.
    // UPDATE: Possibly solved. But leaving in for now. Can monitor for clientLogs.
    const expectedDataRoot = rollups[rollups.length - 1].newDataRoot;
    const newRoot = this.worldState.getRoot();
    if (!newRoot.equals(expectedDataRoot)) {
      const newSize = this.worldState.getSize();
      await this.reinitDataTree();
      await this.writeSyncInfo(-1);
      await sendClientLog(this.rollupProvider, {
        message: 'Invalid dataRoot.',
        synchingFromRollup: from,
        blocksReceived: coreBlocks.length,
        oldRoot: oldRoot.toString('hex'),
        newRoot: newRoot.toString('hex'),
        newSize,
        oldSize,
        expectedDataRoot: expectedDataRoot.toString('hex'),
      });
      return;
    }

    // Second apply the blocks to user states
    this.debug(`forwarding blocks to user states...`);
    await this.logOnFailure(
      () => Promise.all(this.accountStates.map(us => us.processBlocks(coreBlockContexts))),
      'userState.processBlocks',
    );

    this.debug(`finished processing blocks ${from} to ${from + coreBlocks.length - 1} in ${timer.s()}s...`);
  }

  /**
   * Executes the given async function and submits a client log and rethrows in case of failure
   */
  private async logOnFailure<T>(fn: () => Promise<T>, description: string) {
    try {
      return await fn();
    } catch (err) {
      await sendClientLog(this.rollupProvider, {
        message: description,
        error: err,
      });
      throw err;
    }
  }

  /**
   * Brings this.sdkStatus, in line with whats persisted.
   */
  private async readSyncInfo() {
    const syncedToRollup = await this.getLocalSyncedToRollup();
    const latestRollupId = await this.rollupProvider.getLatestRollupId();
    this.sdkStatus.latestRollupId = latestRollupId;

    if (this.sdkStatus.syncedToRollup < syncedToRollup) {
      await this.worldState.syncFromDb();
      this.sdkStatus.syncedToRollup = syncedToRollup;
      this.sdkStatus.dataRoot = this.worldState.getRoot();
      this.sdkStatus.dataSize = this.worldState.getSize();
      this.emit(SdkEvent.UPDATED_WORLD_STATE, syncedToRollup, latestRollupId);
    }
  }

  /**
   * Persist new syncedToRollup and update this.sdkStatus.
   */
  private async writeSyncInfo(syncedToRollup: number) {
    await this.leveldb.put('syncedToRollup', syncedToRollup.toString());

    this.sdkStatus.syncedToRollup = syncedToRollup;
    this.sdkStatus.dataRoot = this.worldState.getRoot();
    this.sdkStatus.dataSize = this.worldState.getSize();

    this.emit(SdkEvent.UPDATED_WORLD_STATE, syncedToRollup, this.sdkStatus.latestRollupId);
  }

  private async processAliases(rollups: RollupProofData[], offchainTxData: Buffer[][]) {
    const processRollup = (rollup: RollupProofData, offchainData: Buffer[]) => {
      // Using a Map here to preserve insertion-order
      const aliasMap = new Map<string, Alias>();
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
            aliasMap.set(aliasHash.toString(), {
              accountPublicKey,
              aliasHash,
              index: rollup.dataStartIndex + i * 2,
            });
          }
        }
      }
      return [...aliasMap.values()];
    };

    const aliases = rollups.map((rollup, i) => processRollup(rollup, offchainTxData[i])).flat();
    await this.db.addAliases(aliases);
  }

  public async queryDefiPublishStats(query: BridgePublishQuery): Promise<BridgePublishQueryResult> {
    return await this.rollupProvider.queryDefiPublishStats(query);
  }

  public async getBlocks(from: number, take = 1): Promise<DecodedBlock[]> {
    const rawBlocks = await this.rollupProvider.getBlocks(from, Math.min(Math.max(take, 1), 5));
    return rawBlocks.map(x => new DecodedBlock(x));
  }
}
