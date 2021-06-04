---
tags: Specs
---

[edit](https://hackmd.io/q1fcVLaLRZmtXNfkXvgwWA)

# Rollup Contract

Rollup contract is responsible for processing Aztec zkRollups, including relaying them to a verifier contract for validation and performing all relevant token transfers and defi bridge interactions.

## Contract Constants

#### `numberOfAssets`

Number of assets the rollup works with.

#### `numberOfBridgeCalls`

Number of defi bridge interactions in a rollup.

#### `ethAssetId`

Asset id of ETH.

#### `escapeBlockUpperBound`

Number of blocks in an escape hatch cycle.

#### `escapeBlockLowerBound`

Number of blocks in an escape hatch cycle when the window is open.

#### `txNumPubInputs`

Number of public inputs propagated from each inner proof.

#### `rollupNumPubInputs`

Number of public inputs for the root rollup.

#### `txPubInputLength`

Public inputs length for each inner proof tx.

#### `rollupPubInputLength`

Public inputs length for the root rollup.


## Contract Variables

#### `supportedAssets`

#### `assetPermitSupport`

#### `userPendingDeposits`

#### `depositProofApprovals`

#### `rollupProviders`

#### `feeDistributor`


## Contract State

The state is recorded via three Merkle trees:
+ **The Note Tree**: The Merkle tree of *note commitments* to all *notes* ever created in Aztec
+ **The Nullifier Tree**: The Merkle tree of all *spent* notes destroyed in Aztec
+ **The Root Tree**: The Merkle tree of all *old* note tree roots

### State variables

#### `dataRoot`

The root of the note tree.

#### `nullRoot`

The root of the nullifier tree.

#### `rootRoot`

The root of the root tree.

#### `dataSize`

The size of the data of a rollup.

#### `nextRollupId`

The id of the next expected rollup, incremented by one by the last one.


## External Methods

Methods that can be called by anybody.

### depositPendingFunds

Deposit funds as part of the first stage of the two stage deposit.

If `assetId` is `ethAssetId`, tx value must be larger than 0 and equal to `amount`.

If depositing a token asset, the user should've approved this rollup contract to transfer `amount` from `depositorAddress`.

```solidity
function depositPendingFunds(
    uint256 assetId,
    uint256 amount,
    address depositorAddress
) external payable whenNotPaused
```

##### Update contract states

- `userPendingDeposits`: `userPendingDeposits[assetId][depositorAddress]` will be incremented by `amount`.
- `totalPendingDeposit`: `totalPendingDeposit[assetId]` will be incremented by `amount`.

### depositPendingFundsPermit

Deposit funds with a permit signature as part of the first stage of the two stage deposit.

The user doesn't have to pre-approve the rollup contract to spend the amount.

```solidity
function depositPendingFundsPermit(
    uint256 assetId,
    uint256 amount,
    address depositorAddress,
    address spender,
    uint256 permitApprovalAmount,
    uint256 deadline,
    uint8 v,
    bytes32 r,
    bytes32 s
) external whenNotPaused
```

##### Update contract states

- `userPendingDeposits`: `userPendingDeposits[assetId][depositorAddress]` will be incremented by `amount`.
- `totalPendingDeposit`: `totalPendingDeposit[assetId]` will be incremented by `amount`.


## Permissioned Methods

### escapeHatch

Anyone can call this function in the escape hatch window.[^1]

This function will validate the `proofData`, process all transactions, and update state variables.

Note that this function won't take fees from the transactions even if the `txFees` in `proofData` are not zeros.

```solidity
function escapeHatch(
    bytes calldata proofData,
    bytes calldata signatures,
    bytes calldata viewingKeys
) external whenNotPaused
```

### processRollup

Only a user with a signature from an authorised rollup provider can call this function. i.e., `provider` must be in `rollupProviders`.

This function will validate the `proofData`, process all transactions, update state variables, and reimburse fee to `feeReceiver`.

```solidity
function processRollup(
    bytes calldata proofData,
    bytes calldata signatures,
    bytes calldata viewingKeys,
    bytes calldata providerSignature,
    address provider,
    address payable feeReceiver,
    uint256 feeLimit
) external whenNotPaused
```

### Owner Methods

```solidity
function setVerifier(address _verifierAddress) public onlyOwner
```

```solidity
function setRollupProvider(address providerAddress, bool valid) public onlyOwner
```

```solidity
function setFeeDistributor(address feeDistributorAddress) public onlyOwner
```

```solidity
function setSupportedAsset(address linkedToken, bool supportsPermit) external onlyOwner
```

```solidity
function setAssetPermitSupport(uint256 assetId, bool supportsPermit) external onlyOwner
```


## Internal Methods

### verifyProofAndUpdateState

This method verifies the zk proof and updates the contract states with those provided by the rollup.

```solidity
function verifyProofAndUpdateState(
    bytes memory proofData
) internal returns (uint256 numTxs)
```

##### Check state variables:

It compares the following values extracted from the `proofData` with the current contract state variables:

- `nextRollupId`
- `dataRoot`
- `nullRoot`
- `rootRoot`

Throw if any of the above values doesn't match.

##### Verify proof

Call the verifier contract to verify the `proofData`. Throw if the proof is not valid.

##### Update contract states:

- `nextRollupId`: will be `nextRollupId` + 1.
- `dataRoot`
- `nullRoot`
- `rootRoot`
- `dataSize`


### processDefiBridges

This method validates `defiInteractionHash` and process defi interaction data. It is called internally after `proofData` is verified.

```solidity
function processDefiBridges(bytes memory proofData) internal
```

##### Check `defiInteractionHash`

Compare `defiInteractionHash` with the `prevDefiInteractionHash` in the `proofData`. Throw if they don't match.

##### Iterate over interaction data

For each defi interaction data, extract the following values:

```solidity
uint256 bridgeId
address bridgeAddress
uint256[3] memory assetIds
uint32 numOutputAssets
uint256 totalInputValue
```

###### If `bridgeId` is not zero:

- Find the address of each asset id in `assetIds` from `supportedAssets`. Except for `ethAssetId`, its address should be `weth`, not *address(0)*. `assetIds[3]` will map to [`inputAsset`, `outputAssetA`, `outputAssetB`].
- Call `getInfo` on the bridge contract and check that the response matches the above decoded values.
- If `inputAsset` is `weth`, send `totalInputValue` to `weth`.
- Call `approve` on `inputAsset` to allow the bridge contract to transfer `totalInputValue` from the rollup contract.
- Call `convert` on the bridge contract, which returns `outputValueA` and `outputValueB`.
- If `outputValueA` is larger than 0, call `transferFrom` on `outputAssetA` to transfer `outputValueA` from the bridge contract to the rollup contract.
- If `outputValueB` is larger than 0 and `numOutputAssets` is 2, call `transferFrom` on `outputAssetB` to transfer `outputValueB` from the bridge contract to the rollup contract.

###### If `bridgeId` is zero:
- Stop processing the rest of the interaction data. Root rollup circuit guarantees that all empty interaction data will be appended to the array.

After interating over all the non-empty interaction data, update `defiInteractionHash` to be the SHA256 hash of `numberOfBridgeCalls` sets of the following values:

- `brigeId`
- `interactionNonce`
- `totalInputValue`
- `outputValueA`
- `outputValueB`
- `interactionResult`

All the above values should be 0 for empty interaction data.

#####  `interactionResult` will be *false* if:

- Fail to send ETH to `weth`.
- Fail to approve the bridge contract to transfer `totalInputValue` from `inputAsset`.
- Revert when calling `convert` on the bridge contract.

If `interactionResult` is *false*, both `outputValueA` and `outputValueB` must be 0. And the rollup contract will withdraw `totalInputValue` of ETH from `weth` if `inputAsset` is `weth`.

##### This function will throw if:

- `defiInteractionHash` and `prevDefiInteractionHash` are not the same.
- `totalInputValue` is 0 and `bridgeId` is not 0.
- `numOutputAssets` is 0 and `bridgeId` is not 0.
- Any values extracted from `bridgeId` doesn't match the info returned from the bridge contract.
- Both `outputValueA` and `outputValueB` are 0 and `interactionResult` is *true*.
- `outputValueB` is larger than 0 and `numOutputAssets` is 1.
- Fail to transfer `outputValueA` or `outputValueB` from the bridge contract.
- Fail to withdraw ETH back to the rollup contract when `interactionResult` is *false* and `inputAsset` is `weth`.

##### Update contract states:

- `defiInteractionHash`: the SHA256 hash of `numberOfBridgeCalls` sets of interaction result.

[^1]: The escape hatch window is open when:
`block.number % escapeBlockUpperBound >= escapeBlockLowerBound`.