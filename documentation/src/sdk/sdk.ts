import { RollupProviderStatus, Rollup, Tx } from 'barretenberg/rollup_provider';
import { EventEmitter } from 'events';
import { AssetId } from '../sdk';
import { User } from './user';
import { UserTx } from './user_tx';
import { GrumpkinAddress, EthAddress } from 'barretenberg/address';

export enum SdkEvent {
  // For emitting interesting log info during long running operations.
  LOG = 'SDKEVENT_LOG',
  // Initialization state changes.
  UPDATED_INIT_STATE = 'SDKEVENT_UPDATED_INIT_STATE',
  // Balance for a user changes.
  UPDATED_BALANCE = 'SDKEVENT_UPDATED_BALANCE',
  // Accounts are switched.
  UPDATED_ACCOUNT = 'SDKEVENT_UPDATED_ACCOUNT',
  // A user is added.
  UPDATED_USERS = 'SDKEVENT_UPDATED_USERS',
  // A transaction has been created within the current context.
  NEW_USER_TX = 'SDKEVENT_NEW_USER_TX',
  // A transaction has been added/updated (could be from a remote update).
  UPDATED_USER_TX = 'SDKEVENT_UPDATED_USER_TX',
  // Explorer rollups have updated.
  UPDATED_EXPLORER_ROLLUPS = 'SDKEVENT_UPDATED_EXPLORER_ROLLUPS',
  // Explorer txs have updated.
  UPDATED_EXPLORER_TXS = 'SDKEVENT_UPDATED_EXPLORER_TXS',
}

export enum SdkInitState {
  UNINITIALIZED = 'Uninitialized',
  INITIALIZING = 'Initializing',
  INITIALIZED = 'Initialized',
  DESTROYED = 'Destroyed',
}

export interface Signer {
  getAddress(): Buffer;
  signMessage(data: Buffer): Promise<Buffer>;
}

export type TxHash = Buffer;

export interface Sdk extends EventEmitter {

  getStatus(): Promise<RollupProviderStatus>;
  /**
   * Deposit.
   * @param assetId - [number] See the list of assets we currently support [here](/#/SDK/Types/AssetId).
   * @param userId - [Buffer] Id of the proof sender.
   * @param value - [bigint] The amount to deposit in ERC20 units.
   * @param signer - [Signer] An aztec signer used to create signatures.
   * @param ethSigner - [EthereumSigner] An ethereum signer used to create signatures to authorize the tx.
   * @param to - [GrumpkinAddress|string]? The public key or alias of the user receiving funds.
   * @returns Promise<TxHash> - Resolves to [TxHash](/#/SDK/Types/TxHash).
   */
  deposit(assetId: AssetId, userId: Buffer, value: bigint, signer: Signer, ethSigner: EthereumSigner, to?: GrumpkinAddress | string): Promise<Buffer>;

  /**
   * Withdraw
   * @param assetId - [number] See the list of assets we currently support [here](/#/SDK/Types/AssetId).
   * @param userId - [Buffer] Id of the proof sender.
   * @param value - [bigint] The amount to withdraw in ERC20 units.
   * @param signer - [Signer] An aztec signer used to create signatures.
   * @param to - [EthAddress] The Ethereum address of the user receiving funds.
   * @returns Promise<TxHash> - Resolves to [TxHash](/#/SDK/Types/TxHash).
   */
  withdraw(assetId: AssetId, userId: Buffer, value: bigint, signer: Signer, to: EthAddress): Promise<Buffer>;

  /**
   * Transfer
   * @param assetId - [number] See the list of assets we currently support [here](/#/SDK/Types/AssetId).
   * @param userId - [Buffer] Id of the proof sender.
   * @param value - [bigint] The amount to transfer in ERC20 units.
   * @param signer - [Signer] An aztec signer used to create signatures.
   * @param to - [GrumpkinAddress|string] The public key or alias of the user receiving funds.
   * @returns Promise<TxHash> - Resolves to [TxHash](/#/SDK/Types/TxHash).
   */
  transfer(assetId: AssetId, userId: Buffer, value: bigint, signer: Signer, to: GrumpkinAddress | string): Promise<Buffer>;

  /**
   * Public Transfer
   * @param assetId - [number] See the list of assets we currently support [here](/#/SDK/Types/AssetId).
   * @param userId - [Buffer] Id of the proof sender.
   * @param value - [bigint] The amount to transfer in ERC20 units.
   * @param signer - [Signer] An ethers signer used to create signatures to authorize the tx
   * @param ethSigner - [EthereumSigner] An ethereum signer used to create signatures to authorize the tx.
   * @param to - [EthAddress] The Ethereum address of the user receiving funds.
   * @returns Promise<TxHash> - Resolves to [TxHash](/#/SDK/Types/TxHash).
   */
  publicTransfer(assetId: AssetId, userId: Buffer, value: bigint, signer: Signer, ethSigner: EthereumSigner, to: EthAddress): Promise<Buffer>;

  /**
   * Await Settlement 
   * @remarks This method is useful to wait for a transaction to settle on layer 1.
   * @param txHash - [TxHash] object containing the TxHash.
   * @returns Promise 
   */
  awaitSettlement(txHash: TxHash): Promise<void>;

  /**
   * Generate Account Recovery Data
   * @param userId - [Buffer] Id of the proof sender.
   * @param trustedThirdPartyPublicKeys - [GrumpkinAddress[]] The 32-byte public keys of trusted third parties.
   * @returns Promise\<RecoveryPayload[]\> - Resolves to an object containing the public key and the recovery info for that user.
   */
  generateAccountRecoveryData(userId: Buffer, trustedThirdPartyPublicKeys: GrumpkinAddress[]): Promise<RecoveryPayload[]>;

  /**
   * Create Account
   * @param userId - [Buffer] Id of the proof sender.
   * @param newSigningPublicKey - [GrumpkinAddress] The 32-byte public key of the private key the user wishes to use to update state.
   * @param recoveryPublicKey - [GrumpkinAddress] The 32-byte public key generated along with user's recovery data.
   * @param alias - [string] The user's alias they wish to be identified by.
   * @returns Promise<TxHash> - Resolves to [TxHash](/#/SDK/Types/TxHash).
   */
  createAccount(userId: Buffer, newSigningPublicKey: GrumpkinAddress, recoveryPublicKey: GrumpkinAddress, alias: string): Promise<Buffer>;
 
  /**
   * Recover Acocunt
   * @param userId - [Buffer] Id of the proof sender.
   * @param recoveryPayload - [RecoveryPayload] The data created at account creation that authorises the key addition.
   * @returns Promise<TxHash> - Resolves to [TxHash](/#/SDK/Types/TxHash).
   */
  recoverAccount(userId: Buffer, recoveryPayload: RecoveryPayload): Promise<Buffer>;
  
  /**
   * Add Signing Key
   * @param userId - [Buffer] Id of the proof sender.
   * @param signingPublicKey - [GrumpkinAddress] The 32-byte public key of the private key the user wishes to use to update state.
   * @param signer - [Signer] An aztec signer used to create signatures.
   * @returns Promise<TxHash> - Resolves to [TxHash](/#/SDK/Types/TxHash).
   */
  addSigningKey(userId: Buffer, signingPublicKey: GrumpkinAddress, signer: Signer): Promise<Buffer>;

  /**
   * Remove Signing Key
   * @param userId - [Buffer] Id of the proof sender.
   * @param signingPublicKey - [GrumpkinAddress] The 32-byte public key of the private key the user wishes to use to update state.
   * @param signer - [Signer] An aztec signer used to create signatures.
   * @returns Promise<TxHash> - Resolves to [TxHash](/#/SDK/Types/TxHash).
   */
  removeSigningKey(userId: Buffer, signingPublicKey: GrumpkinAddress, signer: Signer): Promise<Buffer>;
   
  /**
   * Lock Escape Hatch .
   * @remarks This method allows the user to commit to a future block height to lock the verifier for 20 blocks. Users should use this method to withdraw if the Rollup Provider is not responding or acting maliciously.
   * @param blockHeight - [number] The height at which the user whishes to withdraw must satisfy blockHeight % 100 > 80.
   * @param address - [EthAddress] The ethereum address of the user that will be calling the escape hatch.
   * @returns Promise -  resolves to [TxHash](/#/SDK/Types) object containing the transaction.
   */
      
  lockEscapeHatch(blockHeight: number, address: EthAddress) Promise<TxHash>;;

  /**
   * Emergency Withdraw.
   * @remarks This method allows the user to emergency withdraw.
   * @param assetId - [string] 3 letter asset code (/#/SDK/assets).
   * @param blockHeight [number] The block height that the user reserved to send the tx
   * @param value [number] The value the user wants to withdraw.
   * @param to [EthAddress] The ethereum address that will be sent the funds.
   * @param signer [Signer] An ethers signer used to create signatures to authorize the tx and send.
   * @returns Promise -  resolves to [TxHash](/#/SDK/Types) object containing the transaction.
   */
  emergencyWithdraw(assetId: string, blockHeight: number, value: number, to: EthAddress, signer: Signer);  
  
}
