// @ts-nocheck

export interface Sdk {
  /**
   * Deposit.
   * @param assetId - [AssetId] See the list of assets we currently support [here](/#/Types/AssetId).
   * @param userId - [AccountId] The account id of the proof sender.
   * @param value - [bigint] The amount to deposit in ERC20 units.
   * @param signer - [Signer] An aztec signer used to create signatures.
   * @param ethSigner - [EthereumSigner] An ethereum signer used to create signatures to authorize the tx.
   * @param permitArgs - [PermitArgs]? Options for the erc20 permit function.
   * @param to - [AccountId]? The accountId of the user receiving funds. Default to the proof sender.
   * @returns Promise<TxHash> - Resolves to [TxHash](/#/Types/TxHash).
   */
  deposit(
    assetId: AssetId,
    userId: AccountId,
    value: bigint,
    signer: Signer,
    ethSigner: EthereumSigner,
    permitArgs?: PermitArgs,
    to?: AccountId,
  ): Promise<TxHash>;

  /**
   * Withdraw
   * @param assetId - [AssetId] See the list of assets we currently support [here](/#/Types/AssetId).
   * @param userId - [AccountId] The account id of the proof sender.
   * @param value - [bigint] The amount to withdraw in ERC20 units.
   * @param signer - [Signer] An aztec signer used to create signatures.
   * @param to - [EthAddress] The Ethereum address of the user receiving funds.
   * @returns Promise<TxHash> - Resolves to [TxHash](/#/Types/TxHash).
   */
  withdraw(assetId: AssetId, userId: AccountId, value: bigint, signer: Signer, to: EthAddress): Promise<TxHash>;

  /**
   * Transfer
   * @param assetId - [AssetId] See the list of assets we currently support [here](/#/Types/AssetId).
   * @param userId - [AccountId] The account id of the proof sender.
   * @param value - [bigint] The amount to transfer in ERC20 units.
   * @param signer - [Signer] An aztec signer used to create signatures.
   * @param to - [AccountId] The account id of the user receiving funds.
   * @returns Promise<TxHash> - Resolves to [TxHash](/#/Types/TxHash).
   */
  transfer(assetId: AssetId, userId: AccountId, value: bigint, signer: Signer, to: AccountId): Promise<TxHash>;

  /**
   * Await Settlement
   * @remarks This method is useful to wait for a transaction to settle on layer 1.
   * @param txHash - [TxHash] object containing the TxHash.
   * @returns Promise
   */
  awaitSettlement(txHash: TxHash): Promise<void>;

  /**
   * Generate Account Recovery Data
   * @param alias - [string] The user's alias.
   * @param accountPublicKey - [GrumpkinAddress] Public key of the proof sender.
   * @param trustedThirdPartyPublicKeys - [GrumpkinAddress[]] The 32-byte public keys of trusted third parties.
   * @param nonce - [number]? The nonce of the account to be recovered. Default to the latest nonce plus one.
   * @returns Promise\<RecoveryPayload[]\> - Resolves to an object containing the recovery data.
   */
  generateAccountRecoveryData(
    alias: string,
    accountPublicKey: GrumpkinAddress,
    trustedThirdPartyPublicKeys: GrumpkinAddress[],
    nonce?: number,
  ): Promise<RecoveryPayload[]>;

  /**
   * Create Account
   * @param userId - [AccountId] The account id of the proof sender.
   * @param alias - [string] The user's alias they wish to be identified by.
   * @param newSigningPublicKey - [GrumpkinAddress] The 32-byte public key of the private key the user wishes to use to update state.
   * @param recoveryPublicKey - [GrumpkinAddress] The 32-byte public key generated along with user's recovery data.
   * @returns Promise<TxHash> - Resolves to [TxHash](/#/Types/TxHash).
   */
  createAccount(
    userId: AccountId,
    alias: string,
    newSigningPublicKey: GrumpkinAddress,
    recoveryPublicKey?: GrumpkinAddress,
  ): Promise<TxHash>;

  /**
   * Recover Acocunt
   * @param recoveryPayload - [RecoveryPayload] The data created at account creation that authorises the key addition.
   * @returns Promise<TxHash> - Resolves to [TxHash](/#/Types/TxHash).
   */
  recoverAccount(recoveryPayload: RecoveryPayload): Promise<TxHash>;

  /**
   * Migrate Account
   * @param userId - [AccountId] The account id of the proof sender.
   * @param signer - [Signer] An aztec signer used to create signatures.
   * @param newSigningPublicKey - [GrumpkinAddress] The 32-byte public key of the private key the user wishes to use to update state.
   * @param recoveryPublicKey - [GrumpkinAddress]? The 32-byte public key generated along with user's recovery data.
   * @param newAccountPublicKey - [GrumpkinAddress]? A new public key to be linked to the alias. Default to the current public key.
   * @returns Promise<TxHash> - Resolves to [TxHash](/#/Types/TxHash).
   */
  migrateAccount(
    userId: AccountId,
    signer: Signer,
    newSigningPublicKey: GrumpkinAddress,
    recoveryPublicKey?: GrumpkinAddress,
    newAccountPublicKey?: GrumpkinAddress,
  ): Promise<TxHash>;

  /**
   * Add Signing Key
   * @param userId - [AccountId] The account id of the proof sender.
   * @param signer - [Signer] An aztec signer used to create signatures.
   * @param signingPublicKey1 - [GrumpkinAddress] The 32-byte public key of the private key the user wishes to use to update state.
   * @param signingPublicKey2 - [GrumpkinAddress] The 32-byte public key of the private key the user wishes to use to update state.
   * @returns Promise<TxHash> - Resolves to [TxHash](/#/Types/TxHash).
   */
  addSigningKeys(
    userId: AccountId,
    signer: Signer,
    signingPublicKey1: GrumpkinAddress,
    signingPublicKey2?: GrumpkinAddress,
  ): Promise<TxHash>;

  /**
   * Lock Escape Hatch .
   * @remarks This method allows the user to commit to a future block height to lock the verifier for 20 blocks. Users should use this method to withdraw if the Rollup Provider is not responding or acting maliciously.
   * @param blockHeight - [number] The height at which the user whishes to withdraw must satisfy blockHeight % 100 > 80.
   * @param address - [EthAddress] The ethereum address of the user that will be calling the escape hatch.
   * @returns Promise -  resolves to [TxHash](/#/Types) object containing the transaction.
   */
  lockEscapeHatch(blockHeight: number, address: EthAddress): Promise<TxHash>;

  /**
   * Emergency Withdraw.
   * @remarks This method allows the user to emergency withdraw.
   * @param assetId - [string] 3 letter asset code (/#/assets).
   * @param blockHeight [number] The block height that the user reserved to send the tx
   * @param value [number] The value the user wants to withdraw.
   * @param to [EthAddress] The ethereum address that will be sent the funds.
   * @param signer [Signer] An ethers signer used to create signatures to authorize the tx and send.
   * @returns Promise -  resolves to [TxHash](/#/Types) object containing the transaction.
   */
  emergencyWithdraw(assetId: string, blockHeight: number, value: number, to: EthAddress, signer: Signer);
}
