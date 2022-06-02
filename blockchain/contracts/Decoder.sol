// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec
pragma solidity >=0.8.4;

/**
 * ----------------------------------------
 *  PROOF DATA SPECIFICATION
 * ----------------------------------------
 * Our input "proof data" is represented as a single byte array - we use a custom encoding the encode the
 * data associated with a rollup block. The encoded structure is as follows (excluding the length param of the bytes type):
 * 
   | byte range      | num bytes        | name                             | description |
   | ---             | ---              | ---                              | ---         |
   | 0x00  - 0x20    | 32               | rollupId                         | Unique rollup block identifier. Equivalent to block number |
   | 0x20  - 0x40    | 32               | rollupSize                       | Max number of transactions in the block |
   | 0x40  - 0x60    | 32               | dataStartIndex                   | Position of the next empty slot in the Aztec data tree |
   | 0x60  - 0x80    | 32               | oldDataRoot                      | Root of the data tree prior to rollup block's state updates |
   | 0x80  - 0xa0    | 32               | newDataRoot                      | Root of the data tree after rollup block's state updates |
   | 0xa0  - 0xc0    | 32               | oldNullRoot                      | Root of the nullifier tree prior to rollup block's state updates |
   | 0xc0  - 0xe0    | 32               | newNullRoot                      | Root of the nullifier tree after rollup block's state updates |
   | 0xe0  - 0x100   | 32               | oldDataRootsRoot                 | Root of the tree of data tree roots prior to rollup block's state updates |
   | 0x100 - 0x120   | 32               | newDataRootsRoot                 | Root of the tree of data tree roots after rollup block's state updates |
   | 0x120 - 0x140   | 32               | oldDefiRoot                      | Root of the defi tree prior to rollup block's state updates |
   | 0x140 - 0x160   | 32               | newDefiRoot                      | Root of the defi tree after rollup block's state updates |
   | 0x160 - 0x560   | 1024             | bridgeIds[NUMBER_OF_BRIDGE_CALLS]   | Size-32 array of bridgeIds for bridges being called in this block. If bridgeId == 0, no bridge is called |
   | 0x560 - 0x960   | 1024             | depositSums[NUMBER_OF_BRIDGE_CALLS] | Size-32 array of deposit values being sent for bridges being called in this block |
   | 0x960 - 0xb60   | 512              | assetIds[NUMBER_OF_ASSETS]         | Size-16 array of the assetIds for assets being deposited/withdrawn/used to pay fees in this block |
   | 0xb60 - 0xd60   | 512              | txFees[NUMBER_OF_ASSETS]           | Size-16 array of transaction fees paid to the rollup beneficiary, denominated in each assetId |
   | 0xd60 - 0x1160  | 1024             | interactionNotes[NUMBER_OF_BRIDGE_CALLS] | Size-32 array of defi interaction result commitments that must be inserted into the defi tree at this rollup block |
   | 0x1160 - 0x1180 | 32               | prevDefiInteractionHash          | A SHA256 hash of the data used to create each interaction result commitment. Used to validate correctness of interactionNotes |
   | 0x1180 - 0x11a0 | 32               | rollupBeneficiary                | The address that the fees from this rollup block should be sent to. Prevents a rollup proof being taken from the transaction pool and having its fees redirected |
   | 0x11a0 - 0x11c0 | 32               | numRollupTxs                     | Number of "inner rollup" proofs used to create the block proof. "inner rollup" circuits process 3-28 user txns, the outer rollup circuit processes 1-28 inner rollup proofs. |
   | 0x11c0 - 0x11c4 | 4                | numRealTxs                       | Number of transactions in the rollup excluding right-padded padding proofs
   | 0x11c4 - 0x11c8 | 4                | encodedInnerTxData.length        | Number of bytes of encodedInnerTxData |
   | 0x11c8 - end    | encodedInnerTxData.length | encodedInnerTxData      | Encoded inner transaction data. Contains encoded form of the broadcasted data associated with each tx in the rollup block |
 **/

 /**
  * --------------------------------------------
  *  DETERMINING THE NUMBER OF REAL TRANSACTIONS
  * --------------------------------------------
  * The `rollupSize` parameter describes the MAX number of txns in a block.
  * However the block may not be full.
  * Incomplete blocks will be padded with "padding" transactions that represent empty txns.
  *
  * The amount of end padding is not explicitly defined in `proofData`. It is derived.
  * The encodedInnerTxData does not include tx data for the txns associated with this end padding.
  * (it does include any padding transactions that are not part of the end padding, which can sometimes happen)
  * When decoded, the transaction data for each transaction is a fixed size (256 bytes)
  * Number of real transactions = rollupSize - (decoded tx data size / 256)
  *
  * The decoded transaction data associated with padding transactions is 256 zero bytes.
 **/

/**
 * @title Decoder
 * @dev contains functions for decoding/extracting the encoded proof data passed in as calldata,
 * as well as computing the SHA256 hash of the decoded data (publicInputsHash).
 * The publicInputsHash is used to ensure the data passed in as calldata matches the data used within the rollup circuit
 */
contract Decoder {

    /*----------------------------------------
      CONSTANTS
      ----------------------------------------*/
    uint256 internal constant NUMBER_OF_ASSETS = 16; // max number of assets in a block
    uint256 internal constant NUMBER_OF_BRIDGE_CALLS = 32; // max number of bridge calls in a block
    uint256 internal constant NUMBER_OF_BRIDGE_BYTES = 1024; // NUMBER_OF_BRIDGE_CALLS * 32
    uint256 internal constant NUMBER_OF_PUBLIC_INPUTS_PER_TX = 8; // number of ZK-SNARK "public inputs" per join-split/account/claim transaction
    uint256 internal constant TX_PUBLIC_INPUT_LENGTH = 256; // byte-length of NUMBER_OF_PUBLIC_INPUTS_PER_TX. NUMBER_OF_PUBLIC_INPUTS_PER_TX * 32;
    uint256 internal constant ROLLUP_NUM_HEADER_INPUTS = 142; // 58; // number of ZK-SNARK "public inputs" that make up the rollup header 14 + (NUMBER_OF_BRIDGE_CALLS * 3) + (NUMBER_OF_ASSETS * 2);
    uint256 internal constant ROLLUP_HEADER_LENGTH = 4544; // 1856; // ROLLUP_NUM_HEADER_INPUTS * 32;

    // ENCODED_PROOF_DATA_LENGTH_OFFSET = byte offset into the rollup header such that `numRealTransactions` occupies
    // the least significant 4 bytes of the 32-byte word being pointed to.
    // i.e. ROLLUP_HEADER_LENGTH - 28
    uint256 internal constant NUM_REAL_TRANSACTIONS_OFFSET = 4516;

    // ENCODED_PROOF_DATA_LENGTH_OFFSET = byte offset into the rollup header such that `encodedInnerProofData.length` occupies
    // the least significant 4 bytes of the 32-byte word being pointed to.
    // i.e. ROLLUP_HEADER_LENGTH - 24
    uint256 internal constant ENCODED_PROOF_DATA_LENGTH_OFFSET = 4520;

    // offset we add to `proofData` to point to the bridgeIds
    uint256 internal constant BRIDGE_IDS_OFFSET = 0x180;

    // offset we add to `proofData` to point to prevDefiInteractionhash
    uint256 internal constant PREVIOUS_DEFI_INTERACTION_HASH_OFFSET = 4480; // ROLLUP_HEADER_LENGTH - 0x40

    // offset we add to `proofData` to point to rollupBeneficiary
    uint256 internal constant ROLLUP_BENEFICIARY_OFFSET = 4512; // ROLLUP_HEADER_LENGTH - 0x20

    // CIRCUIT_MODULUS = group order of the BN254 elliptic curve. All arithmetic gates in our ZK-SNARK circuits are evaluated modulo this prime.
    // Is used when computing the public inputs hash - our SHA256 hash outputs are reduced modulo CIRCUIT_MODULUS
    uint256 internal constant CIRCUIT_MODULUS =
        21888242871839275222246405745257275088548364400416034343698204186575808495617;

    // SHA256 hashes
    uint256 internal constant PADDING_ROLLUP_HASH_SIZE_1 =
        0x22dd983f8337d97d56071f7986209ab2ee6039a422242e89126701c6ee005af0;
    uint256 internal constant PADDING_ROLLUP_HASH_SIZE_2 =
        0x076a27c79e5ace2a3d47f9dd2e83e4ff6ea8872b3c2218f66c92b89b55f36560;
    uint256 internal constant PADDING_ROLLUP_HASH_SIZE_4 =
        0x2f0c70a5bf5460465e9902f9c96be324e8064e762a5de52589fdb97cbce3c6ee;
    uint256 internal constant PADDING_ROLLUP_HASH_SIZE_8 =
        0x240ed0de145447ff0ceff2aa477f43e0e2ed7f3543ee3d8832f158ec76b183a9;
    uint256 internal constant PADDING_ROLLUP_HASH_SIZE_16 =
        0x1c52c159b4dae66c3dcf33b44d4d61ead6bc4d260f882ac6ba34dccf78892ca4;
    uint256 internal constant PADDING_ROLLUP_HASH_SIZE_32 =
        0x0df0e06ab8a02ce2ff08babd7144ab23ca2e99ddf318080cf88602eeb8913d44;
    uint256 internal constant PADDING_ROLLUP_HASH_SIZE_64 =
        0x1f83672815ac9b3ca31732d641784035834e96b269eaf6a2e759bf4fcc8e5bfd;

    uint256 internal constant ADDRESS_MASK = 0x00ffffffffffffffffffffffffffffffffffffffff;

    /*----------------------------------------
      ERROR TAGS
      ----------------------------------------*/
    error ENCODING_BYTE_INVALID();
    error INVALID_ROLLUP_TOPOLOGY();

    /*----------------------------------------
      DECODING FUNCTIONS
      ----------------------------------------*/
    /**
     * In `bytes proofData`, transaction data is appended after the rollup header data
     * Each transaction is described by 8 'public inputs' used to create a user transaction ZK-SNARK proof
     * (i.e. there are 8 public inputs for each of the "join-split", "account" and "claim" circuits)
     * The public inputs are represented in calldata according to the following specification:
     *
     * | public input idx | calldata size (bytes) | variable | description |
     * | 0                | 1                     |proofId         | transaction type identifier       |
     * | 1                | 32                    | encrypted form of 1st output note |
     * | 2                | 32                    | encrypted form of 2nd output note |
     * | 3                | 32                    | nullifier of 1st input note       |
     * | 4                | 32                    | nullifier of 2nd input note       |
     * | 5                | 32                    | amount being deposited or withdrawn |
     * | 6                | 20                    | address of depositor or withdraw destination |
     * | 7                | 4                     | assetId used in transaction |
     *
     * The following table maps proofId values to transaction types
     *
     *
     * | proofId | tx type     | description |
     * | ---     | ---         | ---         |
     * | 0       | padding     | empty transaction. Rollup blocks have a fixed number of txns. If number of real txns is less than block size, padding txns make up the difference |
     * | 1       | deposit     | deposit Eth/tokens into Aztec in exchange for encrypted Aztec notes |
     * | 2       | withdraw    | exchange encrypted Aztec notes for Eth/tokens sent to a public address |
     * | 3       | send        | private send |
     * | 4       | account     | creates an Aztec account |
     * | 5       | defiDeposit | deposit Eth/tokens into a L1 smart contract via a Defi bridge contract |
     * | 6       | defiClaim   | convert proceeds of defiDeposit tx back into encrypted Aztec notes |
     *
     * Most of the above transaction types do not use the full set of 8 public inputs (i.e. some are zero).
     * To save on calldata costs, we encode each transaction into the smallest payload possible.
     * In `decodeProof`, the encoded transaction data decoded, with the decoded tx data written into memory
     *
     * As part of the decoding algorithms we must convert the 20-byte `publicOwner` and 4-byte `assetId` fields
     * into 32-byte EVM words
     *
     * The following functions perform transaction-specific decoding. The `proofId` field is decoded prior to calling these functions
     */

    /**
     * @dev decode a padding tx
     * @param inPtr location in calldata of the encoded transaction
     * @return location in calldata of the next encoded transaction
     *
     * Encoded padding tx consists of 1 byte, the `proofId`
     * The proofId has been written into memory before we called this function so there is nothing to copy.
     * Advance the calldatapointer by 1 byte to move to the next transaction
     */
    function paddingTx(uint256 inPtr, uint256) internal pure returns (uint256) {
        unchecked{
            return (inPtr + 0x1);
        }
    }

    /**
     * @dev decode a deposit or a withdraw tx
     * @param inPtr location in calldata of the encoded transaction
     * @param outPtr location in memory to write the decoded transaction to
     * @return location in calldata of the next encoded transaction
     *
     * the deposit tx uses all 8 public inputs. All calldata is copied into memory
     */
    function depositOrWithdrawTx(uint256 inPtr, uint256 outPtr) internal pure returns (uint256) {
        // Copy deposit calldata into memory
        assembly {
            // start copying into `outPtr + 0x20`, as `outPtr` points to `proofId`, which has already been written into memry
            calldatacopy(add(outPtr, 0x20), add(inPtr, 0x20), 0xa0) // noteCommitment1 ... publicValue
            calldatacopy(add(outPtr, 0xcc), add(inPtr, 0xc0), 0x14) // convert 20-byte publicOwner calldata variable into 32-byte EVM word
            calldatacopy(add(outPtr, 0xfc), add(inPtr, 0xd4), 0x4) // convert 4-byte assetId variable into 32-byte EVM word
        }
        // advance calldata ptr by 185 bytes
        unchecked {
            return (inPtr + 0xb9);
        }
    }

    /**
     * @dev decode a send tx
     * @param inPtr location in calldata of the encoded transaction
     * @param outPtr location in memory to write the decoded transaction to
     * @return location in calldata of the next encoded transaction
     *
     * The send tx has 0-values for `publicValue`, `publicOwner` and `assetId`
     * No need to copy anything into memory for these fields as memory defaults to 0
     */
    function sendTx(uint256 inPtr, uint256 outPtr) internal pure returns (uint256) {
        assembly {
            calldatacopy(add(outPtr, 0x20), add(inPtr, 0x20), 0x80) // noteCommitment1 ... nullifier2
        }
        unchecked {
            return (inPtr + 0x81);
        }
    }

    /**
     * @dev decode an account tx
     * @param inPtr location in calldata of the encoded transaction
     * @param outPtr location in memory to write the decoded transaction to
     * @return location in calldata of the next encoded transaction
     *
     * The send tx has 0-values for `nullifier2`, `publicValue`, `publicOwner` and `assetId`
     * No need to copy anything into memory for these fields as memory defaults to 0
     */
    function accountTx(uint256 inPtr, uint256 outPtr) internal pure returns (uint256) {
        assembly {
            calldatacopy(add(outPtr, 0x20), add(inPtr, 0x20), 0x80) // noteCommitment1 ... nullifier2
        }
        unchecked {
            return (inPtr + 0x81);
        }
    }

    /**
     * @dev decode a defi deposit or claim tx
     * @param inPtr location in calldata of the encoded transaction
     * @param outPtr location in memory to write the decoded transaction to
     * @return location in calldata of the next encoded transaction
     *
     * The defi deposit/claim txns has 0-values for `publicValue`, `publicOwner` and `assetId`
     * No need to copy anything into memory for these fields as memory defaults to 0
     */
    function defiDepositOrClaimTx(uint256 inPtr, uint256 outPtr) internal pure returns (uint256) {
        assembly {
            calldatacopy(add(outPtr, 0x20), add(inPtr, 0x20), 0x80) // noteCommitment1 ... nullifier2
        }
        unchecked {
            return (inPtr + 0x81);
        }
    }

    /**
     * @dev invalid transaction function
     * If we hit this, there is a transaction whose proofId is invalid (i.e. not 0 to 7).
     * Throw an error and revert the tx.
     */
    function invalidTx(uint256, uint256) internal pure returns (uint256) {
        revert ENCODING_BYTE_INVALID();
    }

    /**
     * @dev decodes the rollup block's proof data
     * This function converts the proof data into a representation we can work with in memory
     * In particular, encoded transaction calldata is decoded and written into memory
     * The rollup header is also copied from calldata into memory
     * @return proofData numTxs publicInputsHash
     * proofData is a memory pointer to the decoded proof data
     *
     * The publicInputsHash is a sha256 hash of the public inputs associated with each transaction in the rollup.
     * It is used to validate the correctness of the data being fed into the rollup circuit
     * (there is a bit of nomenclature abuse here. Processing a public input in the verifier algorithm costs 150 gas, which
     * adds up very quickly. Instead of this, we sha256 hash what used to be the "public" inputs and only set the hash to be public.
     * We then make the old "public" inputs private in the rollup circuit, and validate their correctness by checking their sha256 hash matches
     * what we compute in the decodeProof function!
     *
     * numTxs = number of transactions in the rollup, excluding end-padding transactions
     * 
     */
    function decodeProof()
        internal
        view
        returns (
            bytes memory proofData,
            uint256 numTxs,
            uint256 publicInputsHash
        )
    {
        // declare some variables that will be set inside asm blocks
        uint256 dataSize; // size of our decoded transaction data, in bytes
        uint256 outPtr; // memory pointer to where we will write our decoded transaction data
        uint256 inPtr; // calldata pointer into our proof data
        uint256 rollupSize; // max number of transactions in the rollup block
        uint256 decodedTxDataStart;

        {
            uint256 tailInPtr; // calldata pointer to the end of our proof data

            /**
             * Let's build a function table!
             *
             * To decode our tx data, we need to iterate over every encoded transaction and call its
             * associated decoding function. If we did this via a `switch` statement this would be VERY expensive,
             * due to the large number of JUMPI instructions that would be called.
             *
             * Instead, we use function pointers.
             * The `proofId` field in our encoded proof data is an integer from 0-6,
             * we can use `proofId` to index a table of function pointers for our respective decoding functions.
             * This is much faster as there is no conditional branching!
             */
            function(uint256, uint256) pure returns (uint256) callfunc; // we're going to use `callfunc` as a function pointer
            // `functionTable` is a pointer to a table in memory, containing function pointers
            // Step 1: reserve memory for functionTable
            uint256 functionTable;
            assembly {
                functionTable := mload(0x40)
                mstore(0x40, add(functionTable, 0x100)) // reserve 256 bytes for function pointers
            }
            {
                // Step 2: copy function pointers into local variables so that inline asm code can access them
                function(uint256, uint256) pure returns (uint256) t0 = paddingTx;
                function(uint256, uint256) pure returns (uint256) t1 = depositOrWithdrawTx;
                function(uint256, uint256) pure returns (uint256) t3 = sendTx;
                function(uint256, uint256) pure returns (uint256) t4 = accountTx;
                function(uint256, uint256) pure returns (uint256) t5 = defiDepositOrClaimTx;
                function(uint256, uint256) pure returns (uint256) t7 = invalidTx;

                // Step 3: write function pointers into the table!
                assembly {
                    mstore(functionTable, t0)
                    mstore(add(functionTable, 0x20), t1)
                    mstore(add(functionTable, 0x40), t1)
                    mstore(add(functionTable, 0x60), t3)
                    mstore(add(functionTable, 0x80), t4)
                    mstore(add(functionTable, 0xa0), t5)
                    mstore(add(functionTable, 0xc0), t5)
                    mstore(add(functionTable, 0xe0), t7) // a proofId of 7 is not a valid transaction type, set to invalidTx
                }
            }
            uint256 decodedTransactionDataSize;
            assembly {
                // Add encoded proof data size to dataSize, minus the 4 bytes of encodedInnerProofData.length.
                // Set inPtr to point to the length parameter of `bytes calldata proofData`
                inPtr := add(calldataload(0x04), 0x4) // `proofData = first input parameter. Calldata offset to proofData will be at 0x04. Add 0x04 to account for function signature.
                
                // set dataSize to be the length of `bytes calldata proofData`
                // dataSize := sub(calldataload(inPtr), 0x4)

                // Advance inPtr to point to the start of proofData
                inPtr := add(inPtr, 0x20)

                numTxs := and(
                    calldataload(add(inPtr, NUM_REAL_TRANSACTIONS_OFFSET)),
                    0xffffffff
                )
                // Get encoded inner proof data size.
                // add ENCODED_PROOF_DATA_LENGTH_OFFSET to inPtr to point to the correct variable in our header block,
                // mask off all but 4 least significant bytes as this is a packed 32-bit variable.
                let encodedInnerDataSize := and(
                    calldataload(add(inPtr, ENCODED_PROOF_DATA_LENGTH_OFFSET)),
                    0xffffffff
                )
                // Add the size of trimmed zero bytes to dataSize.

                // load up the rollup size from `proofData`
                rollupSize := calldataload(add(inPtr, 0x20))

                // compute the number of bytes our decoded proof data will take up.
                // i.e. num total txns in the rollup (including padding) * number of public inputs per transaction
                let decodedInnerDataSize := mul(rollupSize, TX_PUBLIC_INPUT_LENGTH)

                // we want dataSize to equal: rollup header length + decoded tx length (excluding padding blocks)
                let numInnerRollups := calldataload(add(inPtr, sub(ROLLUP_HEADER_LENGTH, 0x20)))
                let numTxsPerRollup := div(rollupSize, numInnerRollups)

                let numFilledBlocks := div(numTxs, numTxsPerRollup)
                numFilledBlocks := add(numFilledBlocks, iszero(eq(mul(numFilledBlocks, numTxsPerRollup), numTxs)))

                decodedTransactionDataSize := mul(mul(numFilledBlocks, numTxsPerRollup), TX_PUBLIC_INPUT_LENGTH)
                // i.e. current dataSize value + (difference between decoded and encoded data)
                dataSize := add(ROLLUP_HEADER_LENGTH, decodedTransactionDataSize)

                // Allocate memory for `proofData`.
                proofData := mload(0x40)
                // set free mem ptr to dataSize + 0x20 (to account for the 0x20 bytes for the length param of proofData)
                // This allocates memory whose size is equal to the rollup header size, plus the data required for
                // each transaction's decoded tx data (256 bytes * number of non-padding blocks)
                // only reserve memory for blocks that contain non-padding proofs. These "padding" blocks don't need to be
                // stored in memory as we don't need their data for any computations
                mstore(0x40, add(proofData, add(dataSize, 0x20)))

                // set outPtr to point to the proofData length parameter
                outPtr := proofData
                // write dataSize into proofData.length
                mstore(outPtr, dataSize)
                // advance outPtr to point to start of proofData
                outPtr := add(outPtr, 0x20)

                // Copy rollup header data to `proofData`.
                calldatacopy(outPtr, inPtr, ROLLUP_HEADER_LENGTH)
                // Advance outPtr to point to the end of the header data (i.e. the start of the decoded inner transaction data)
                outPtr := add(outPtr, ROLLUP_HEADER_LENGTH)

                // Advance inPtr to point to the start of our encoded inner transaction data.
                // Add (ROLLUP_HEADER_LENGTH + 0x08) to skip over the packed (numRealTransactions, encodedProofData.length) parameters
                inPtr := add(inPtr, add(ROLLUP_HEADER_LENGTH, 0x08))

                // Set tailInPtr to point to the end of our encoded transaction data
                tailInPtr := add(inPtr, encodedInnerDataSize)
                // Set decodedTxDataStart pointer
                decodedTxDataStart := outPtr
            }
            /**
             * Start of decoding algorithm
             *
             * Iterate over every encoded transaction, load out the first byte (`proofId`) and use it to
             * jump to the relevant transaction's decoding function
             */
            assembly {
                // subtract 31 bytes off of inPtr, so that the first byte of the encoded transaction data
                // is located at the least significant byte of calldataload(inPtr)
                // also adjust tailInPtr as we compare inPtr against tailInPtr
                inPtr := sub(inPtr, 0x1f)
                tailInPtr := sub(tailInPtr, 0x1f)
            }
            unchecked {
                for (; tailInPtr > inPtr; ) {
                    assembly {
                        // For each tx, the encoding byte determines how we decode the tx calldata
                        // The encoding byte can take values from 0 to 7; we want to turn these into offsets that can index our function table.
                        // 1. Access encoding byte via `calldataload(inPtr)`. The least significant byte is our encoding byte. Mask off all but the 3 least sig bits
                        // 2. Shift left by 5 bits. This is equivalent to multiplying the encoding byte by 32.
                        // 4. The result will be 1 of 8 offset values (0x00, 0x20, ..., 0xe0) which we can use to retrieve the relevant function pointer from `functionTable`
                        let encoding := and(calldataload(inPtr), 7)
                        // store proofId at outPtr.
                        mstore(outPtr, encoding) // proofId

                        // use proofId to extract the relevant function pointer from functionTable
                        callfunc := mload(add(functionTable, shl(5, encoding)))
                    }
                    // call the decoding function. Return value will be next required value of inPtr
                    inPtr = callfunc(inPtr, outPtr);
                    // advance outPtr by the size of a decoded transaction
                    outPtr += TX_PUBLIC_INPUT_LENGTH;
                }
            }
        }

        /**
         * Compute the public inputs hash
         *
         * We need to take our decoded proof data and compute its SHA256 hash.
         * This hash is fed into our rollup proof as a public input.
         * If the hash does not match the SHA256 hash computed within the rollup circuit
         * on the equivalent parameters, the proof will reject.
         * This check ensures that the transaction data present in calldata are equal to
         * the transaction data values present in the rollup ZK-SNARK circuit.
         *
         * One complication is the structure of the SHA256 hash.
         * We slice transactions into chunks equal to the number of transactions in the "inner rollup" circuit
         * (a rollup circuit verifies multiple "inner rollup" circuits, which each verify 3-28 private user transactions.
         *  This tree structure helps parallelise proof construction)
         * We then SHA256 hash each transaction *chunk*
         * Finally we SHA256 hash the above SHA256 hashes to get our public input hash!
         *
         * We do the above instead of a straight hash of all of the transaction data,
         * because it's faster to parallelise proof construction if the majority of the SHA256 hashes are computed in
         * the "inner rollup" circuit and not the main rollup circuit.
         */
        // Step 1: compute the hashes that constitute the inner proofs data
        bool invalidRollupTopology;
        assembly {
            // we need to figure out how many rollup proofs are in this tx and how many user transactions are in each rollup
            let numRollupTxs := mload(add(proofData, ROLLUP_HEADER_LENGTH))
            let numJoinSplitsPerRollup := div(rollupSize, numRollupTxs)
            let rollupDataSize := mul(mul(numJoinSplitsPerRollup, NUMBER_OF_PUBLIC_INPUTS_PER_TX), 32)

            // Compute the number of inner rollups that don't contain padding proofs
            let numNotEmptyInnerRollups := div(numTxs, numJoinSplitsPerRollup)
            numNotEmptyInnerRollups := add(
                numNotEmptyInnerRollups,
                iszero(eq(mul(numNotEmptyInnerRollups, numJoinSplitsPerRollup), numTxs))
            )
            // Compute the number of inner rollups that only contain padding proofs!
            // For these "empty" inner rollups, we don't need to compute their public inputs hash directly,
            // we can use a precomputed value
            let numEmptyInnerRollups := sub(numRollupTxs, numNotEmptyInnerRollups)

            let proofdataHashPtr := mload(0x40)
            // copy the header data into the proofdataHash
            // header start is at calldataload(0x04) + 0x24 (+0x04 to skip over func signature, +0x20 to skip over byte array length param)
            calldatacopy(proofdataHashPtr, add(calldataload(0x04), 0x24), ROLLUP_HEADER_LENGTH)

            // update pointer
            proofdataHashPtr := add(proofdataHashPtr, ROLLUP_HEADER_LENGTH)

            // compute the endpoint for the proofdataHashPtr (used as a loop boundary condition)
            let endPtr := add(proofdataHashPtr, mul(numNotEmptyInnerRollups, 0x20))
            // iterate over the public inputs for each inner rollup proof and compute their SHA256 hash

            // better solution here is ... iterate over number of non-padding rollup blocks
            // and hash those
            // for padding rollup blocks...just append the zero hash
            for {

            } lt(proofdataHashPtr, endPtr) {
                proofdataHashPtr := add(proofdataHashPtr, 0x20)
            } {
                // address(0x02) is the SHA256 precompile address
                if iszero(staticcall(gas(), 0x02, decodedTxDataStart, rollupDataSize, 0x00, 0x20)) {
                    revert(0x00, 0x00)
                }

                mstore(proofdataHashPtr, mod(mload(0x00), CIRCUIT_MODULUS))
                decodedTxDataStart := add(decodedTxDataStart, rollupDataSize)
            }

            // If there are empty inner rollups, we can use a precomputed hash
            // of their public inputs instead of computing it directly.
            if iszero(iszero(numEmptyInnerRollups))
            {
                let zeroHash
                switch numJoinSplitsPerRollup
                case 32 {
                    zeroHash := PADDING_ROLLUP_HASH_SIZE_32
                }
                case 16 {
                    zeroHash := PADDING_ROLLUP_HASH_SIZE_16
                }
                case 64 {
                    zeroHash := PADDING_ROLLUP_HASH_SIZE_64
                }
                case 1 {
                    zeroHash := PADDING_ROLLUP_HASH_SIZE_1
                }
                case 2 {
                    zeroHash := PADDING_ROLLUP_HASH_SIZE_2
                }
                case 4 {
                    zeroHash := PADDING_ROLLUP_HASH_SIZE_4
                }
                case 8 {
                    zeroHash := PADDING_ROLLUP_HASH_SIZE_8
                }
                default {
                    invalidRollupTopology := true
                }
    
                endPtr := add(endPtr, mul(numEmptyInnerRollups, 0x20))
                for {

                } lt (proofdataHashPtr, endPtr) {
                    proofdataHashPtr := add(proofdataHashPtr, 0x20)
                } {
                    mstore(proofdataHashPtr, zeroHash)
                }
            }
            // compute SHA256 hash of header data + inner public input hashes
            let startPtr := mload(0x40)
            if iszero(staticcall(gas(), 0x02, startPtr, sub(proofdataHashPtr, startPtr), 0x00, 0x20)) {
                revert(0x00, 0x00)
            }
            publicInputsHash := mod(mload(0x00), CIRCUIT_MODULUS)
        }
        if (invalidRollupTopology)
        {
            revert INVALID_ROLLUP_TOPOLOGY();
        }
    }

    /**
     * @dev Extract the `rollupId` param from the decoded proof data.
     * represents the rollupId of the next valid rollup block
     * @param proofData the decoded proof data
     * @return nextRollupId the expected id of the next rollup block
     */
    function getRollupId(bytes memory proofData) internal pure returns (uint256 nextRollupId) {
        assembly {
            nextRollupId := mload(add(proofData, 0x20))
        }
    }

    /**
     * @dev Decode the public inputs component of proofData and compute sha3 hash of merkle roots && dataStartIndex
     *      The rollup's state is uniquely defined by the following variables:
     *          * The next empty location in the data root tree (rollupId + 1)
     *          * The next empty location in the data tree (dataStartIndex + rollupSize)
     *          * The root of the data tree
     *          * The root of the nullifier set
     *          * The root of the data root tree (tree containing all previous roots of the data tree)
     *          * The root of the defi tree
     *      Instead of storing all of these variables in storage (expensive!), we store a keccak256 hash of them.
     *      To validate the correctness of a block's state transition, we must perform the following:
     *          * Use proof broadcasted inputs to reconstruct the "old" state hash
     *          * Use proof broadcasted inputs to reconstruct the "new" state hash
     *          * Validate the old state hash matches what is in storage
     *          * Set the old state hash to the new state hash
     *      N.B. we still store dataSize as a separate storage var as proofData does not contain all
     *           neccessary information to reconstruct its old value.
     * @param proofData - cryptographic proofData associated with a rollup
     */
    function computeRootHashes(bytes memory proofData)
        internal
        pure
        returns (
            uint256 rollupId,
            bytes32 oldStateHash,
            bytes32 newStateHash,
            uint32 numDataLeaves,
            uint32 dataStartIndex
        )
    {
        assembly {
            let dataStart := add(proofData, 0x20) // jump over first word, it's length of data
            numDataLeaves := shl(1, mload(add(dataStart, 0x20))) // rollupSize * 2 (2 notes per tx)
            dataStartIndex := mload(add(dataStart, 0x40))

            // validate numDataLeaves && dataStartIndex are uint32s
            if or(gt(numDataLeaves, 0xffffffff), gt(dataStartIndex, 0xffffffff))
            {
                revert(0,0)
            }
            rollupId := mload(dataStart)

            let mPtr := mload(0x40)

            mstore(mPtr, rollupId) // old nextRollupId
            mstore(add(mPtr, 0x20), mload(add(dataStart, 0x60))) // oldDataRoot
            mstore(add(mPtr, 0x40), mload(add(dataStart, 0xa0))) // oldNullRoot
            mstore(add(mPtr, 0x60), mload(add(dataStart, 0xe0))) // oldRootRoot
            mstore(add(mPtr, 0x80), mload(add(dataStart, 0x120))) // oldDefiRoot
            oldStateHash := keccak256(mPtr, 0xa0)

            mstore(mPtr, add(rollupId, 0x01)) // new nextRollupId
            mstore(add(mPtr, 0x20), mload(add(dataStart, 0x80))) // newDataRoot
            mstore(add(mPtr, 0x40), mload(add(dataStart, 0xc0))) // newNullRoot
            mstore(add(mPtr, 0x60), mload(add(dataStart, 0x100))) // newRootRoot
            mstore(add(mPtr, 0x80), mload(add(dataStart, 0x140))) // newDefiRoot
            newStateHash := keccak256(mPtr, 0xa0)
        }
    }

    /**
     * @dev extract the `prevDefiInterationHash` from the proofData's rollup header
     * @param proofData byte array of our input proof data
     * @return prevDefiInteractionHash the defiInteractionHash of the previous rollup block
     */
    function extractPrevDefiInteractionHash(bytes memory proofData)
        internal
        pure
        returns (bytes32 prevDefiInteractionHash)
    {
        assembly {
            prevDefiInteractionHash := mload(add(proofData, PREVIOUS_DEFI_INTERACTION_HASH_OFFSET))
        }
    }

    /**
     * @dev extract the address we pay the rollup fee to, from the proofData's rollup header
     * This "rollup beneficiary" address is included as part of the ZK-SNARK circuit data, so that
     * the rollup provider can explicitly define who should get the fee at the point they generate the ZK-SNARK proof.
     * (instead of simply sending the fee to msg.sender)
     * This prevents front-running attacks where an attacker can take somebody else's rollup proof from out of the tx pool and replay it, stealing the fee.
     * @param proofData byte array of our input proof data
     * @return rollupBeneficiaryAddress the address we pay this rollup block's fee to
     */
    function extractRollupBeneficiaryAddress(bytes memory proofData)
        internal
        pure
        returns (address rollupBeneficiaryAddress)
    {
        assembly {
            rollupBeneficiaryAddress := mload(add(proofData, ROLLUP_BENEFICIARY_OFFSET))
            // validate rollupBeneficiaryAddress is an address!
            if gt(rollupBeneficiaryAddress, ADDRESS_MASK) {
                revert(0, 0)
            }

        }
    }

    /**
     * @dev Extract an assetId from the rollup block.
     * The rollup block contains up to 16 different assets, which can be recovered from the rollup header data.
     * @param proofData byte array of our input proof data
     * @param idx The index of the asset we want. assetId = header.assetIds[idx]
     * @return assetId the 30-bit identifier of an asset. The ERC20 token address is obtained via the mapping `supportedAssets[assetId]`, 
     */
    function extractAssetId(
        bytes memory proofData,
        uint256 idx
    ) internal pure returns (uint256 assetId) {
        assembly {
            assetId := mload(add(add(add(proofData, BRIDGE_IDS_OFFSET), mul(0x40, NUMBER_OF_BRIDGE_CALLS)), mul(0x20, idx)))
            // validate assetId is a uint32!
            if gt(assetId, 0xffffffff) {
                revert(0, 0)
            }
        }
    }

    /**
     * @dev Extract the transaction fee, for a given asset, due to be paid to the rollup beneficiary
     * The total fee is the sum of the individual fees paid by each transaction in the rollup block.
     * This sum is computed directly in the rollup circuit, and is present in the rollup header data
     * @param proofData byte array of our input proof data
     * @param idx The index of the asset the fee is denominated in
     * @return totalTxFee 
     */
    function extractTotalTxFee(
        bytes memory proofData,
        uint256 idx
    ) internal pure returns (uint256 totalTxFee) {
        assembly {
            totalTxFee := mload(add(add(add(proofData, 0x380), mul(0x40, NUMBER_OF_BRIDGE_CALLS)), mul(0x20, idx)))
        }
    }
}
