// @ts-nocheck

export interface Sdk {
  /**
   * @param privateKey - [Buffer] The private key of the user.
   * @param nonce - [number]? The nonce of the user. Default to the latest nonce.
   * @returns WalletSdkUser - A user instance with apis bound to the user's account id.
   */
  addUser(privateKey: Buffer, nonce?: number): Promise<WalletSdkUser>;

  /**
   * @param userId - [AccountId] The account id of the user.
   * @returns WalletSdkUser - A user instance with apis bound to the user's account id.
   */
  getUser(userId: AccountId): WalletSdkUser;

  /**
   * @returns UserData[] - An array of user data.
   */
  getUsersData(): UserData[];

  /**
   * Deposit.
   * @param assetId - [AssetId] See the list of assets we currently support [here](/#/Types/AssetId).
   * @param userId - [AccountId] The account id of the proof sender.
   * @param value - [bigint] The amount to deposit in ERC20 units.
   * @param fee - [bigint] The amount charged by rollup provider.
   * @param signer - [Signer] An aztec signer used to create signatures.
   * @param ethSigner - [EthereumSigner] An ethereum signer used to create signatures to authorize the tx.
   * @param permitArgs - [PermitArgs]? Options for the erc20 permit function.
   * @returns Promise<TxHash> - Resolves to [TxHash](/#/Types/TxHash).
   */
  deposit(
    assetId: AssetId,
    userId: AccountId,
    value: bigint,
    fee: bigint,
    signer: Signer,
    ethSigner: EthereumSigner,
    permitArgs?: PermitArgs,
  ): Promise<TxHash>;

  /**
   * Withdraw
   * @param assetId - [AssetId] See the list of assets we currently support [here](/#/Types/AssetId).
   * @param userId - [AccountId] The account id of the proof sender.
   * @param value - [bigint] The amount to withdraw in ERC20 units.
   * @param fee - [bigint] The amount charged by rollup provider.
   * @param signer - [Signer] An aztec signer used to create signatures.
   * @param to - [EthAddress] The Ethereum address of the user receiving funds.
   * @returns Promise<TxHash> - Resolves to [TxHash](/#/Types/TxHash).
   */
  withdraw(
    assetId: AssetId,
    userId: AccountId,
    value: bigint,
    fee: bigint,
    signer: Signer,
    to: EthAddress,
  ): Promise<TxHash>;

  /**
   * Transfer
   * @param assetId - [AssetId] See the list of assets we currently support [here](/#/Types/AssetId).
   * @param userId - [AccountId] The account id of the proof sender.
   * @param value - [bigint] The amount to transfer in ERC20 units.
   * @param fee - [bigint] The amount charged by rollup provider.
   * @param signer - [Signer] An aztec signer used to create signatures.
   * @param to - [AccountId] The account id of the user receiving funds.
   * @returns Promise<TxHash> - Resolves to [TxHash](/#/Types/TxHash).
   */
  transfer(
    assetId: AssetId,
    userId: AccountId,
    value: bigint,
    fee: bigint,
    signer: Signer,
    to: AccountId,
  ): Promise<TxHash>;

  /**
   * Join Split
   * @param assetId - [AssetId] See the list of assets we currently support [here](/#/Types/AssetId).
   * @param userId - [AccountId] The account id of the proof sender.
   * @param publicInput - [bigint] The amount to deposit in ERC20 units.
   * @param publicOutput - [bigint] The amount to withdraw in ERC20 units.
   * @param privateInput - [bigint] The amount of notes to be destroyed.
   * @param privateOutput - [bigint] The amount of new notes to be created.
   * @param signer - [Signer] An aztec signer used to create signatures.
   * @param options - [JoinSplitTxOptions]? Options for various use cases.
   * @returns Promise<TxHash> - Resolves to [TxHash](/#/Types/TxHash).
   */
  joinSplit(
    assetId: AssetId,
    userId: AccountId,
    publicInput: bigint,
    publicOutput: bigint,
    privateInput: bigint,
    privateOutput: bigint,
    signer: Signer,
    options: JoinSplitTxOptions = {},
  ): Promise<TxHash>;

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
   * @param newAccountPrivateKey - [Buffer]? A new private key whose public key will be linked to the alias. Default to the current private key.
   * @returns Promise<TxHash> - Resolves to [TxHash](/#/Types/TxHash).
   */
  migrateAccount(
    userId: AccountId,
    signer: Signer,
    newSigningPublicKey: GrumpkinAddress,
    recoveryPublicKey?: GrumpkinAddress,
    newAccountPrivateKey?: Buffer,
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
   * @param assetId - [AssetId] See the list of assets we currently support [here](/#/Types/AssetId).
   * @param userId - [AccountId] Public key and nonce pair of the user.
   * @returns bigint - Private balance of the account.
   */
  getBalance(assetId: AssetId, userId: AccountId): bigint;

  /**
   * @param assetId - [AssetId] See the list of assets we currently support [here](/#/Types/AssetId).
   * @param ethAddress - [EthAddress] The ethereum address of the user.
   * @returns bigint - Public balance of the account.
   */
  getPublicBalance(assetId: AssetId, ethAddress: EthAddress): Promise<bigint>;

  /**
   * @param assetId - [AssetId] The asset of the value to be converted.
   * @param value - [bigint] Value to convert to string.
   * @param precision - [number] The number of decimal places to return.
   * @returns string - Formatted string.
   */
  fromBaseUnits(assetId: AssetId, value: bigint, precision?: number): string;

  /**
   * @param assetId - [AssetId] The asset of the value to be converted.
   * @param value - [string] Value to convert to bigint.
   * @returns bigint - Token value.
   */
  toBaseUnits(assetId: AssetId, value: string): bigint;
}
