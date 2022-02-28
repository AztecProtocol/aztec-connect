## Rollup Contract

Rollup contract is responsible for processing Aztec zkRollups, including relaying them to a verifier contract for validation and performing all relevant token transfers and defi bridge interactions.

High-Level Layer 2 Architecture

The specifics of the Layer 2 architecture are not explicitly in scope for the smart contract audit, as the rules/transaction semantics are defined via the logic in our ZK-SNARK cryptographic circuits, not the L1 smart contracts.

However, understanding the architecture may be useful to better understand the logic of the rollup processor smart contract, and the logic it executes when processing a rollup block.

State Model

L2 state is recorded in 5 append-only databases, represented as Merkle trees. The Rollup contract records the roots of each tree via the rollupStateHash variable.

A call to the proessRollup method is, at its core, a request to update the roots of the above Merkle trees due to changes in the underlying databases from a block of L2 transactions.

The main databases/Merkle trees are:

- dataTree**
  Contains UTXO notes that contain all created value notes**
  and account notes\*\*
- defiTree\*\*
  Contains the results of previous L1 contract interactions instigated from the rollup contract

- rootTree\*\*
  Contains all past (and the present) Merkle roots of the dataTree. Used in L2 transactions to prove the existence of notes in the dataTree

The dataTree and defiTree each have an associated nullifier set\*\*
. Each nullifier set is an additional database (also represented as Merkle tree, whose roots are included in rollupStateHash).

Nullifier sets record all items that have been deleted\*\*
from their linked database. The encryption algorithm used to encrypt nullifiers is different from the encryption used for their counterpart objects in their linked database. This gives us the property of unlinkability - observers cannot link note creation to note destruction, which obscures the transaction graph.

The rootTree has no linked nullifier set as it is not possible to delete members of rootTree.

L2 data structures

The following is a brief description of the data structures in the Aztec L2 architecture. See notes_and_nullifiers.md for more complete descriptions.

value notes\*\*
. Stored in the dataTree. Represents a discrete sum of ETH/ERC20 tokens held by a user.

account notes\*\*
. Stored in the dataTree. Represents a user account, which links a human-readable “alias” to both an account public/private key to a spending public/private key (account keys are used to decrypt/view notes, spending keys are required to spend notes. The security requirements for the former are weaker than the latter, as spending keys are required to move user funds). A user can have multiple account notes with multiple spending keys, but all must share the same alias and account key.

defi notes\*\*
. Stored in the defiTree. Represents the result of a L1 contract interaction instigated by the rollup contract. Records the number of input/output tokens from the interaction (as well as their asset types), as well as whether the interaction succeeded/failed.

claim notes\*\*
. Stored in the dataTree. Represents a claim on the future proceeds of a L1 contract interaction. Claim notes are created from value notes, and are converted back into value notes with the help of a defi note.

L2 transaction types

An Aztec rollup block contains up to 896 individual user transactions, which represent one of seven transaction types. Each transaction type is defined via a proofId variable attached to the transaction.

| proofId | transaction type | description                                                                                    |
| ------- | ---------------- | ---------------------------------------------------------------------------------------------- |
| 0       | padding          | an empty transaction, for when there are not enough user transactions to fill the rollup block |
| 1       | deposit          | Converts public L1 ETH/ERC20 tokens into value notes                                           |
| 2       | withdraw         | Converts value notes into public ETH/ERC20 tokens on L1                                        |
| 3       | spend            | Private L2 transaction. Converts value notes into different value notes                        |
| 4       | account          | Creates a user account note                                                                    |
| 5       | defiDeposit      | Converts a value note into a claim note                                                        |
| 6       | defiClaim        | Converts a claim note into a value note                                                        |

L2 high-level circuit architecture

The Aztec network utilizes the following ZK-SNARK circuits to describe and validate L2 transactions:

Single transaction circuits:

Join-Split circuit\*\*
Describes a single deposit/withdraw/spend/defiDeposit transaction. Proof created by the user on their local hardware.

Account circuit\*\*
Describes a single account transaction. Proof created by the user on their local hardware

Claim circuit\*\*
Describes a single defiClaim transaction. Proof created by the rollup provider (for convenience. In theory this proof could be created by a user locally, but no secret information is required to create a proof. Proof creation is deferred to the rollup provider for better user UX)

Rollup circuits:

Inner rollup circuit\*\*
Verifies up to 28 single transaction proofs and performs required L2 state updates.

Root rollup circuit\*\*
Also referred to as a rollup circuit in the smart contract code/comments. Verifies up to 28 inner rollup proofs.

Root verifier circuit\*\*
Verifies a single root rollup proof.

The inner rollup/root rollup design is to enable better parallelism.

Knowledge of the existence of the root verifier circuit is likely beyond the scope of this audit. It is used to simplify the computations required by the smart contract PLONK verifier (StandardVerifier.sol). All other circuits/proofs are created using the “Turbo PLONK” ZK-SNARK proving system. Turbo PLONK proofs are faster to construct but slower to verify.

Regular PLONK proofs are slower to construct but faster to verify compared to Turbo PLONK proofs. The root verifier circuit is made using regular PLONK, and it verifies the Turbo PLONK root rollup circuit. This reduces the computations (and gas costs) required to verify the proof on-chain.

Aztec uses recursive ZK-SNARK constructions to ensure that only the final ZK-SNARK proof in the transaction stack needs to be verified on-chain. If the root verifier proof is correct, one can prove inductively that all other proofs in the transaction stack are correct.

Anatomy of a L2 transaction

Each user transaction in the rollup block will have 8 uint256 variables associated with it, present in the transaction calldata when processRollup is called. While represented as a uint256 in the smart contract, these variables are big integers taken modulo the BN254 elliptic curve group order. This is verified in StandardVerifier.sol. Not all fields are used by all transaction types.

| publicInput | name            | description                                                                         |
| ----------- | --------------- | ----------------------------------------------------------------------------------- |
| 0           | proofId         | defines the transaction type (checked in the rollup ZK-SNARK)                       |
| 1           | noteCommitment1 | the 1st note created by the transaction (if applicable)                             |
| 2           | noteCommitment2 | the 2nd note created by the transaction (if applicable)                             |
| 3           | nullifier1      | the 1st nullifier for any notes destroyed by the transaction (if applicable)        |
| 4           | nullifier2      | the 2nd nullifier for any notes destroyed by the transaction (if applicable)        |
| 5           | publicValue     | Amount being deposited/withdrawn (if applicable)                                    |
| 6           | publicOwner     | Ethereum address of a user depositing/withdrawing funds (if applicable)             |
| 7           | assetId         | 30-bit variable that represents the asset being deposited/withdrawn (if applicable) |

As not all fields are used by all transaction types, a custom encoding algorithm is used to reduce the calldata payload of these transactions. Transactions are decoded in Decoder.sol.

Data included in a rollup transaction

When the processRollup function is called, the input variable bytes calldata proofData contains the core information required to validate and process an Aztec rollup block.

Due to significant gas inefficiencies in the Solidity ABI decoding logic, custom encoding is used and the overall data structure is wrapped in a bytes variable.

The proofData can be split into 3 key components:

- rollup header\*\*
  A fixed-size block of data that records the key properties of the rollup block

- transaction data\*\*
  A variable-size block that records the encoded user transaction data

- PLONK proof\*\*
  A fixed-size block of data that contains a PLONK ZK-SNARK validity proof that proves the L2 transaction logic has been correctly followed.

Rollup Header Structure

| byte range      | num bytes | name                                     | description                                                                                                                                                                  |
| --------------- | --------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0x00 - 0x20     | 32        | rollupId                                 | Unique rollup block identifier. Equivalent to block number                                                                                                                   |
| 0x20 - 0x40     | 32        | rollupSize                               | Max number of transactions in the block                                                                                                                                      |
| 0x40 - 0x60     | 32        | dataStartIndex                           | Position of the next empty slot in the Aztec data tree                                                                                                                       |
| 0x60 - 0x80     | 32        | oldDataRoot                              | Root of the data tree prior to rollup block’s state updates                                                                                                                  |
| 0x80 - 0xa0     | 32        | newDataRoot                              | Root of the data tree after rollup block’s state updates                                                                                                                     |
| 0xa0 - 0xc0     | 32        | oldNullRoot                              | Root of the nullifier tree prior to rollup block’s state updates                                                                                                             |
| 0xc0 - 0xe0     | 32        | newNullRoot                              | Root of the nullifier tree after rollup block’s state updates                                                                                                                |
| 0xe0 - 0x100    | 32        | oldDataRootsRoot                         | Root of the tree of data tree roots prior to rollup block’s state updates                                                                                                    |
| 0x100 - 0x120   | 32        | newDataRootsRoot                         | Root of the tree of data tree roots after rollup block’s state updates                                                                                                       |
| 0x120 - 0x140   | 32        | oldDefiRoot                              | Root of the defi tree prior to rollup block’s state updates                                                                                                                  |
| 0x140 - 0x160   | 32        | newDefiRoot                              | Root of the defi tree after rollup block’s state updates                                                                                                                     |
| 0x160 - 0x560   | 1024      | bridgeIds[NUMBER_OF_BRIDGE_CALLS]        | Size-32 array of bridgeIds for bridges being called in this block. If bridgeId == 0, no bridge is called                                                                     |
| 0x560 - 0x960   | 1024      | depositSums[NUMBER_OF_BRIDGE_CALLS]      | Size-32 array of deposit values being sent for bridges being called in this block                                                                                            |
| 0x960 - 0xb60   | 512       | assetIds[NUMBER_OF_ASSETS]               | Size-16 array of the assetIds for assets being deposited/withdrawn/used to pay fees in this block                                                                            |
| 0xb60 - 0xd60   | 512       | txFees[NUMBER_OF_ASSETS]                 | Size-16 array of transaction fees paid to the rollup beneficiary, denominated in each assetId                                                                                |
| 0xd60 - 0x1160  | 1024      | interactionNotes[NUMBER_OF_BRIDGE_CALLS] | Size-32 array of defi interaction result commitments that must be inserted into the defi tree at this rollup block                                                           |
| 0x1160 - 0x1180 | 32        | prevDefiInteractionHash                  | A SHA256 hash of the data used to create each interaction result commitment. Used to validate correctness of interactionNotes                                                |
| 0x1180 - 0x11a0 | 32        | rollupBeneficiary                        | The address that the fees from this rollup block should be sent to. Prevents a rollup proof being taken from the transaction pool and having its fees redirected             |
| 0x11a0 - 0x11c0 | 32        | numRollupTxs                             | Number of “inner rollup” proofs used to create the block proof. “inner rollup” circuits process 3-28 user txns, the outer rollup circuit processes 1-28 inner rollup proofs. |

N.B. our documentation will sometimes refer to a “note” as a “commitment” (they are effectively synonyms in our architecture).

Security properties of Aztec

The tokens/ETH in every un-spent value note in the dataTree must be fully collateralised on-chain. That is, the RollupProcessor.sol contract must own enough ERC20 tokens/ETH to cover the value represented in all of its un-spent notes.

Consequently - whenever a user creates a deposit transaction, they must have previously transferred/approved an equivalent amount of ETH/tokens to RollupProcessor.sol

It should also not be possible for an attacker to create value notes that are linked to ETH/tokens deposited by a different user without their express permission.

More generally it is essential that front-running attacks are not possible, where an attacker takes a transaction out of the transaction pool and manipulates it to re-route value to/from an account not intended by the original transaction sender.

Value can also be deposited via defi interactions. When claim notes are converted into value notes, an equivalent amount of ETH/tokens must have been deposited int othe bridge by a defi interaction (described in the next section).

When value is extracted from RollupProcessor.sol, an equivalent amount of value recorded in value notes must have been destroyed.

Assuming the cryptography is correct, this means that in processRollup’s call-data, there must be a withdraw transaction whose value field matches the amount being withdrawn.

Alternatively, value can be extracted if the rollup header contains a non-zero value inside the depositSums array (this implies that value notes have been converted into claim notes and we are instructing the rollup to send tokens to a specified bridge contract).

Anatomy of an Aztec Connect defi transaction

An outbound defi interaction is described by a tuple of a bridgeId and a depositSum (present in the rollup header in the bridgeIds and depositSums arrays).

A bridgeId uniquely defines the expected inputs/outputs of a defi interaction. It is a uint256 that represents a bit-string containing multiple fields. When unpacked its data is used to create the BridgeData struct:

struct BridgeData {
uint256 bridgeAddressId;
address bridgeAddress;
uint256 inputAssetId;
uint256 outputAssetIdA;
uint256 outputAssetIdB;
uint256 linkedInteractionNonce;
uint256 auxData;
bool secondOutputVirtual;
bool secondOutputReal;
bool firstOutputVirtual;
bool secondInputVirtual;
uint256 bridgeGasLimit;
}

```

For specific encoding/decoding logic see comments in RollupProcessor.sol.

A bridge contract is a L1 smart contract that translates the interface of a generic smart contract into the Aztec Connect interface.

Interactions are modelled as synchronous or asynchronous token transfers. Input tokens are sent to a bridge contract and up to two output token types are returned. The exchange rate between the input/output tokens is assumed to be unknown until the transaction is mined.

Input/output tokens can be either “real” or “virtual”. A “real” token has an underlying ERC20 smart contract (or is ETH). A “virtual” token exists entirely inside the Aztec network, with no L1 counterpart. It is used to efficiently track synthetic values (such as the amount of outstanding value in a loan, or votes in a DAO).

The first input asset must always be “real”. There can be an optional second virtual asset. There cannot be a second real asset due to limitations in the ZK-SNARK circuit logic.

The first output asset can be either real or virtual. A second output asset can optionally exist and can be either real or virtual.

### Defi transaction flow

When processing a rollup block, the function processDefiBridges is called. The following occurs:

- All outbound defi interactions in the rollup block are iterated over. For each interaction:
- Input tokens are transferred to the specified bridge contract
- The bridge contract should return 3 parameters: uint256 outputValueA, uint256 outputValueB, bool isAsync
- For non-zero output values, the contract attempts to recover the output tokens via calling transferFrom on the relevant ERC20 contract. If the asset is ETH, the contract validates it has received a correctly-sized ETH payment linked to the defi interaction.
- A defiInteractionResult object is constructed based on the results of the above

The logic for processing a single defi transaction is wrapped in a DefiBridgeProxy smart contract, which is called from the RollupProcessor via delegateCall. The purpose of this is to enable the call stack to be partially unwound if any step of the defi interaction fails.

e.g. consider a defi interaction where 10 ETH is sent and the expected return asset is DAI. If the defi bridge contract reverts, we want to recover the 10 ETH that was sent to the contract, without causing the entire rollup block to revert (which would enable griefing attacks).

Similarly imagine we send 10 ETH to a bridge, which claims its outputValueA is 100 DAI/. If a call to DAI.transferFrom fails, we want to unwind the call stack such that 10 ETH never left RollupProcessor.

If the DefiBridgeProxy call fails, we record this in the defiInteractionResult. This allows for a future defiClaim transaction to convert any linked claim notes back into value notes equal to the input value of the claim note.

The expected interface for defi bridges is defined in interfaces/IDefiBridge.sol

Deposit transaction flow


Rollup Processor Interface (slightly out of date TODO update!)
Contract Constants

#### numberOfAssets

Number of assets the rollup works with.

#### numberOfBridgeCalls

Number of defi bridge interactions in a rollup.

#### ethAssetId

Asset id of ETH.

#### escapeBlockUpperBound

Number of blocks in an escape hatch cycle.

#### escapeBlockLowerBound

Number of blocks in an escape hatch cycle when the window is open.

#### txNumPubInputs

Number of public inputs propagated from each inner proof.

#### rollupNumPubInputs

Number of public inputs for the root rollup.

#### txPubInputLength

Public inputs length for each inner proof tx.

#### rollupPubInputLength

Public inputs length for the root rollup.

Contract Variables

#### supportedAssets

#### assetPermitSupport

#### userPendingDeposits

#### depositProofApprovals

#### rollupProviders

#### feeDistributor

Contract State

The state is recorded via three Merkle trees:

- The Note Tree**
: The Merkle tree of note commitments to all notes ever created in Aztec

- The Nullifier Tree**
: The Merkle tree of all spent notes destroyed in Aztec

- The Root Tree**
: The Merkle tree of all old note tree roots

### State variables

#### dataRoot

The root of the note tree.

#### nullRoot

The root of the nullifier tree.

#### rootRoot

The root of the root tree.

#### dataSize

The size of the data of a rollup.

#### nextRollupId

The id of the next expected rollup, incremented by one by the last one.

External Methods

Methods that can be called by anybody.

### depositPendingFunds

Deposit funds as part of the first stage of the two stage deposit.

If assetId is ethAssetId, tx value must be larger than 0 and equal to amount.

If depositing a token asset, the user should’ve approved this rollup contract to transfer amount from depositorAddress.

solidity
function depositPendingFunds(
    uint256 assetId,
    uint256 amount,
    address depositorAddress
) external payable whenNotPaused
```

##### Update contract states

- userPendingDeposits: userPendingDeposits[assetId][depositoraddress] will be incremented by amount.
- totalPendingDeposit: totalPendingDeposit[assetId] will be incremented by amount.

### depositPendingFundsPermit

Deposit funds with a permit signature as part of the first stage of the two stage deposit.

The user doesn’t have to pre-approve the rollup contract to spend the amount.

solidity
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

- userPendingDeposits: userPendingDeposits[assetId][depositorAddress] will be incremented by amount.
- totalPendingDeposit: totalPendingDeposit[assetId] will be incremented by amount.

Permissioned Methods

### escapeHatch

Anyone can call this function in the escape hatch window.[^1]

This function will validate the proofData, process all transactions, and update state variables.

Note that this function won’t take fees from the transactions even if the txFees in proofData are not zeros.

solidity
function escapeHatch(
    bytes calldata proofData,
    bytes calldata signatures,
    bytes calldata viewingKeys
) external whenNotPaused
```

### processRollup

Only a user with a signature from an authorised rollup provider can call this function. i.e., provider must be in rollupProviders.

This function will validate the proofData, process all transactions, update state variables, and reimburse fee to feeReceiver.

solidity
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

solidity
function setVerifier(address _verifierAddress) public onlyOwner
```

solidity
function setRollupProvider(address providerAddress, bool valid) public onlyOwner

```

solidity
function setFeeDistributor(address feeDistributorAddress) public onlyOwner
```

solidity
function setSupportedAsset(address linkedToken, bool supportsPermit) external onlyOwner

```

solidity
function setAssetPermitSupport(uint256 assetId, bool supportsPermit) external onlyOwner
```

Internal Methods

### verifyProofAndUpdateState

This method verifies the zk proof and updates the contract states with those provided by the rollup.

solidity
function verifyProofAndUpdateState(
bytes memory proofData
) internal returns (uint256 numTxs)

```

##### Check state variables:

It compares the following values extracted from the proofData with the current contract state variables:

- nextRollupId
- dataRoot
- nullRoot
- rootRoot

Throw if any of the above values doesn’t match.

##### Verify proof

Call the verifier contract to verify the proofData. Throw if the proof is not valid.

##### Update contract states:

- nextRollupId: will be nextRollupId + 1.
- dataRoot
- nullRoot
- rootRoot
- dataSize

### processDefiBridges

This method validates defiInteractionHash and process defi interaction data. It is called internally after proofData is verified.

solidity
function processDefiBridges(bytes memory proofData) internal
```

##### Check defiInteractionHash

Compare defiInteractionHash with the prevDefiInteractionHash in the proofData. Throw if they don’t match.

##### Iterate over interaction data

For each defi interaction data, extract the following values:

solidity
uint256 bridgeId
address bridgeAddress
uint256[3] memory assetIds
uint32 numOutputAssets
uint256 totalInputValue

```

###### If bridgeId is not zero:

- Find the address of each asset id in assetIds from supportedAssets. Except for ethAssetId, its address should be weth, not address(0). assetIds[3] will map to [inputAsset, outputAssetA, outputAssetB].
- Call getInfo on the bridge contract and check that the response matches the above decoded values.
- If inputAsset is weth, send totalInputValue to weth.
- Call approve on inputAsset to allow the bridge contract to transfer totalInputValue from the rollup contract.
- Call convert on the bridge contract, which returns outputValueA and outputValueB.
- If outputValueA is larger than 0, call transferFrom on outputAssetA to transfer outputValueA from the bridge contract to the rollup contract.
- If outputValueB is larger than 0 and numOutputAssets is 2, call transferFrom on outputAssetB to transfer outputValueB from the bridge contract to the rollup contract.

###### If bridgeId is zero:

- Stop processing the rest of the interaction data. Root rollup circuit guarantees that all empty interaction data will be appended to the array.

After interating over all the non-empty interaction data, update defiInteractionHash to be the SHA256 hash of numberOfBridgeCalls sets of the following values:

- brigeId
- interactionNonce
- totalInputValue
- outputValueA
- outputValueB
- interactionResult

All the above values should be 0 for empty interaction data.

##### interactionResult will be false if:

- Fail to send ETH to weth.
- Fail to approve the bridge contract to transfer totalInputValue from inputAsset.
- Revert when calling convert on the bridge contract.

If interactionResult is false, both outputValueA and outputValueB must be 0. And the rollup contract will withdraw totalInputValue of ETH from weth if inputAsset is weth.

##### This function will throw if:

- defiInteractionHash and prevDefiInteractionHash are not the same.
- totalInputValue is 0 and bridgeId is not 0.
- numOutputAssets is 0 and bridgeId is not 0.
- Any values extracted from bridgeId doesn’t match the info returned from the bridge contract.
- Both outputValueA and outputValueB are 0 and interactionResult is true.
- outputValueB is larger than 0 and numOutputAssets is 1.
- Fail to transfer outputValueA or outputValueB from the bridge contract.
- Fail to withdraw ETH back to the rollup contract when interactionResult is false and inputAsset is weth.

##### Update contract states:

- defiInteractionHash: the SHA256 hash of numberOfBridgeCalls sets of interaction result.

[^1]:
The escape hatch window is open when:
block.number % escapeBlockUpperBound >= escapeBlockLowerBound.

### Encoding and Decoding proof data

Each inner transaction is described by 10 32-byte field elements, which are required in order to produce the root rollup circuit’s broadcasted inputs hash. These fields are:

1. proof_id
1. public_input
1. public_output
1. public_asset_id
1. output_nc_1
1. output_nc_2
1. nullifier_1
1. nullifier_2
1. input_owner
1. output_owner

To reduce the data payload of a rollup proof, these broadcasted inputs are compressed according to the transaction type being represented. The types used are:

1. Deposit
2. Withdraw
3. Send
4. Account
5. DefiDeposit
6. DefiClaim
7. Padding (an empty transaction)

The data payload for a transaction consists of 1 encoding byte (the transaction type) followed by a string of fixed length, where the length is specific to the tx type.

The padding transaction data payload is empty other than the encoding byte. For all other transactions, the encoding is the following (excluding the encoding byte):

##### Deposit encoding

tx length: 212 bytes.

1. public_output
2. public_asset_id
3. output_nc_1
4. output_nc_2
5. nullifier_1
6. nullifier_2
7. input_owner (20 bytes)

All other fields are 0

##### Withdraw encoding

tx length: 212 bytes.

1. public_input
2. public_asset_id
3. output_nc_1
4. output_nc_2
5. nullifier_1
6. nullifier_2
7. output_owner (20 bytes)

All other fields are 0

##### Send encoding

tx length: 160 bytes

1. public_asset_id
2. output_nc_1
3. output_nc_2
4. nullifier_1
5. nullifier_2

All other fields are 0

##### Account encoding

tx length: 288 bytes

1. public_input
1. public_output
1. public_asset_id
1. output_nc_1
1. output_nc_2
1. nullifier_1
1. nullifier_2
1. input_owner
1. output_owner

##### Defi Deposit encoding

tx length: 224 bytes.

1. public_output
2. public_asset_id
3. output_nc_1
4. output_nc_2
5. nullifier_1
6. nullifier_2
7. input_owner (32 bytes)

All other fields are 0

##### Defi Claim encoding

tx length: 161 bytes.

2. public_asset_id
3. output_nc_1
4. output_nc_2
5. nullifier_1
6. input_owner (32 bytes)

All other fields are 0

### Tx Decoding

The function decodeProof converts the encoded proof into the full set of 32-byte field elements that are SHA256 hashed as part of producing the root rollup public inputs.
```
