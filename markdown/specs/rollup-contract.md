---
tags: Specs
---

[edit](https://hackmd.io/q1fcVLaLRZmtXNfkXvgwWA)
# Rollup contract
`uint256 public dataSize` - the size of the data of a rollup


## Contract constants
Number of assets the rollup works with:

`numberOfAssets = 4`

Number of public inputs propagated from each inner proof (currently all public inputs except `txFee` and `merkle_root`):

`txNumPubInputs = 12`

Number of public inputs for the root rollup circuit:

`rollupNumPubInputs = 10 + numberOfAssets`

`txPubInputLength = txNumPubInputs * 32 // public inputs length for of each inner proof tx`

    rollupPubInputLength = rollupNumPubInputs * 32;
    ethAssetId = 0;
    escapeBlockLowerBound;
    escapeBlockUpperBound;




## Contract state

The state is recorded via root three Merkle trees:
+ **The Note Tree**: The Merkle tree of *note commitments* to all *notes* ever created in Aztec
+ **The Nullifier Tree**: The Merkle tree of all *spent* notes destroyed in Aztec
+ **The RootRoot Tree**: The Merkle tree of all *old* note tree roots

## Variables tracking state
The roots of the above three trees:

- `dataRoot`
- `nullRoot`
- `rootRoot`

And this mapping: 

- `pendingUserDeposits`






Additional:
- `nextRollupId` - the id of the next expected rollup, incremented by one by the last one.



## External Methods (can be called by anybody)

`depositPendingFunds()`

`depositPendingFundsPermit()`


## Permissioned Methods

`escapeHatch()`

**Permissions**: For 2 our of every 10 hours, anyone can call this function

`processRollup()`

This function should validate a rollup proof, process all transactions, and update the merkle roots of the dataRoot null root

**Permissions:** Only a user with a signature from an authorised rollupProvider can call this function. 

- This method checks the following public inputs:



### Owner Methods

`setVerifier()` 

`setRollupProvider()`

`setSupportedAsset()`

`setFeeDistributor()`
