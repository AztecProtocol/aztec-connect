// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd
pragma solidity >=0.6.10 <0.8.0;

import {SafeMath} from '@openzeppelin/contracts/math/SafeMath.sol';
import {Types} from './verifier/cryptography/Types.sol';
import {Bn254Crypto} from './verifier/cryptography/Bn254Crypto.sol';

// import 'hardhat/console.sol';

/**
 * Rollup proof decoder. Encoded proofData structure is as follows:
 *
 * length
 * rollupId
 * dataStartIndex
 * oldDataRoot
 * newDataRoot
 * oldNullRoot
 * newNullRoot
 * oldDataRootsRoot
 * newDataRootsRoot
 * oldDefiRoot
 * newDefiRoot
 * bridgeIds[numberOfBridgeCalls]
 * depositSums[numberOfBridgeCalls]
 * assetIds[numberOfAssets]
 * txFees[numberOfAssets]
 * interactionNotes[numberOfBridgeCalls]
 * prevDefiInteractionHash
 * numRollupTxs
 * encodedInnerProofData.length (4 bytes)
 * encodedInnerProofData
 */
contract Decoder {
    using SafeMath for uint256;

    uint256 public constant numberOfAssets = 16;
    uint256 public constant numberOfBridgeCalls = 4;
    uint256 public constant txNumPubInputs = 8;
    uint256 public constant rollupNumHeaderInputs = 13 + (numberOfBridgeCalls * 3) + (numberOfAssets * 2);
    uint256 public constant txPubInputLength = txNumPubInputs * 32;
    uint256 public constant rollupHeaderInputLength = rollupNumHeaderInputs * 32;
    uint256 public constant ethAssetId = 0;
    uint256 public constant numRollupTxsOffset = rollupNumHeaderInputs - 1;
    uint256 public constant CIRCUIT_MODULUS =
        21888242871839275222246405745257275088548364400416034343698204186575808495617;
    // offset we add to `proofData` to point to the bridgeIds
    uint256 public constant bridgeIdsOffset = 0x180;

    uint256 public constant DATASIZE_BIT_OFFSET = 202;
    uint256 public constant ASYNCDEFIINTERACTIONHASHES_BIT_OFFSET = 235;
    uint256 public constant DEFIINTERACTIONHASHES_BIT_OFFSET = 245;
    uint256 public constant REENTRANCY_MUTEX_BIT_OFFSET = 255;
    uint256 public constant STATE_HASH_MASK = 0x3ffffffffffffffffffffffffffffffffffffffffffffffffff;
    uint256 public constant ARRAY_LENGTH_MASK = 0x3ff;
    uint256 public constant DATASIZE_MASK = 0xffffffff;

    function depositTx(uint256 inPtr, uint256 outPtr) internal pure returns (uint256) {
        assembly {
            calldatacopy(add(outPtr, 0x20), add(inPtr, 0x1), 0xa0) // noteCommitment1 ... publicValue
            calldatacopy(add(outPtr, 0xcc), add(inPtr, 0xa1), 0x14) // publicOwner
            calldatacopy(add(outPtr, 0xfc), add(inPtr, 0xb5), 0x4) // assetId
        }
        return (inPtr + 0xb9);
    }

    function withdrawTx(uint256 inPtr, uint256 outPtr) internal pure returns (uint256) {
        assembly {
            calldatacopy(add(outPtr, 0x20), add(inPtr, 0x1), 0xa0) // noteCommitment1 ... publicValue
            calldatacopy(add(outPtr, 0xcc), add(inPtr, 0xa1), 0x14) // publicOwner
            calldatacopy(add(outPtr, 0xfc), add(inPtr, 0xb5), 0x4) // assetId
        }
        return (inPtr + 0xb9);
    }

    function sendTx(uint256 inPtr, uint256 outPtr) internal pure returns (uint256) {
        assembly {
            calldatacopy(add(outPtr, 0x20), add(inPtr, 0x1), 0x80) // noteCommitment1 ... nullifier2
        }
        return (inPtr + 0x81);
    }

    function accountTx(uint256 inPtr, uint256 outPtr) internal pure returns (uint256) {
        assembly {
            calldatacopy(add(outPtr, 0x20), add(inPtr, 0x1), 0x60) // noteCommitment1 ... nullifier1
        }
        return (inPtr + 0x61);
    }

    function defiDepositTx(uint256 inPtr, uint256 outPtr) internal pure returns (uint256) {
        assembly {
            calldatacopy(add(outPtr, 0x20), add(inPtr, 0x1), 0x80) // noteCommitment1 ... nullifier2
        }
        return (inPtr + 0x81);
    }

    function defiClaimTx(uint256 inPtr, uint256 outPtr) internal pure returns (uint256) {
        assembly {
            calldatacopy(add(outPtr, 0x20), add(inPtr, 0x1), 0x80) // noteCommitment1 ... nullifier2
        }
        return (inPtr + 0x81);
    }

    function invalidTx(uint256, uint256) internal pure returns (uint256) {
        require(false, 'encoding byte is invalid!');
    }

    function decodeProof(uint256 rollupHeaderInputLength, uint256 txNumPubInputs)
        internal
        view
        returns (
            bytes memory proofData,
            uint256 numTxs,
            uint256 publicInputsHash
        )
    {
        uint256 dataSize;
        uint256 outPtr;
        uint256 inPtr;
        uint256 rollupSize;
        uint256 outPtrCopy;

        {
            uint256 tailInPtr;
            uint256 txSize;
            function(uint256, uint256) pure returns (uint256) callfunc;

            // let's build a function table!
            // Step 1: reserve memory for our table of function pointers, referenced via `functionTable`
            uint256 functionTable;
            assembly {
                functionTable := mload(0x40)
                mstore(0x40, add(functionTable, 0x100)) // reserve 256 bytes for function pointers
            }
            {
                // Step 2: copy function pointers into local variables so that inline asm code can access them
                function(uint256, uint256) pure returns (uint256) t1 = depositTx;
                function(uint256, uint256) pure returns (uint256) t2 = withdrawTx;
                function(uint256, uint256) pure returns (uint256) t3 = sendTx;
                function(uint256, uint256) pure returns (uint256) t4 = accountTx;
                function(uint256, uint256) pure returns (uint256) t5 = defiDepositTx;
                function(uint256, uint256) pure returns (uint256) t6 = defiClaimTx;
                function(uint256, uint256) pure returns (uint256) t7 = invalidTx;

                // Step 3: write function pointers into the table!
                assembly {
                    mstore(functionTable, t7)
                    mstore(add(functionTable, 0x20), t1)
                    mstore(add(functionTable, 0x40), t2)
                    mstore(add(functionTable, 0x60), t3)
                    mstore(add(functionTable, 0x80), t4)
                    mstore(add(functionTable, 0xa0), t5)
                    mstore(add(functionTable, 0xc0), t6)
                    mstore(add(functionTable, 0xe0), t7)
                }
            }

            assembly {
                // Add encoded proof data size to dataSize, minus the 4 bytes of encodedInnerProofData.length.
                inPtr := add(calldataload(0x04), 0x4)
                dataSize := sub(calldataload(inPtr), 0x4)
                inPtr := add(inPtr, 0x20)

                // Get encoded inner proof data size.
                let encodedInnerDataSize := and(
                    calldataload(add(inPtr, sub(rollupHeaderInputLength, 0x1c))),
                    0xffffffff
                )

                // Add the size of trimmed zero bytes to dataSize.
                rollupSize := calldataload(add(inPtr, 0x20))
                txSize := mul(txNumPubInputs, 0x20)
                let decodedInnerDataSize := mul(rollupSize, txSize)
                dataSize := add(dataSize, sub(decodedInnerDataSize, encodedInnerDataSize))

                // Allocate memory for `proofData`.
                // - 0x20: decoded proof data size
                // - `dataSize`: decoded proof data
                proofData := mload(0x40)
                mstore(0x40, add(proofData, add(dataSize, 0x20)))
                outPtr := proofData

                // Write decoded proof data size to `proofData`.
                mstore(outPtr, dataSize)
                outPtr := add(outPtr, 0x20)

                // Copy rollup header data to `proofData`.
                calldatacopy(outPtr, inPtr, rollupHeaderInputLength)
                inPtr := add(inPtr, add(rollupHeaderInputLength, 0x04))
                outPtr := add(outPtr, rollupHeaderInputLength)

                // Copy the data after inner proof data to `proofData`.
                tailInPtr := add(inPtr, encodedInnerDataSize)
                outPtrCopy := outPtr
            }
            for (; tailInPtr > inPtr; ) {
                assembly {
                    // For each tx, the encoding byte determines how we decode the tx calldata
                    // The encoding byte can take values from 0 to 7; we want to turn these into offsets that can index our function table.
                    // 1. Access encoding byte via `calldataload(inPtr)`. The most significant byte is our encoding byte.
                    // 2. Shift left by 5 bits. This is equivalent to multiplying the encoding byte by 32.
                    // 4. The result will be 1 of 8 offset values (0x00, 0x20, ..., 0xe0) which we can use to retrieve the relevant function pointer from `functionTable`
                    let encoding := byte(0, calldataload(inPtr))
                    mstore(outPtr, encoding) // proofId
                    callfunc := mload(add(functionTable, shl(5, encoding)))
                }
                inPtr = callfunc(inPtr, outPtr);
                outPtr += txSize;
            }
            // numTxs is not the same as rollupSize because it ignores padding proofs
            numTxs = (outPtr - outPtrCopy) / txSize;
        }

        // Step 1: compute the hashes that constitute the inner proofs data
        assembly {
            // we need to figure out how many rollup proofs are in this tx and how many js transactions are in each rollup
            let numRollupTxs := mload(add(proofData, rollupHeaderInputLength))
            let numJoinSplitsPerRollup := div(rollupSize, numRollupTxs)
            let rollupDataSize := mul(mul(numJoinSplitsPerRollup, txNumPubInputs), 32)

            let proofdataHashPtr := mload(0x40)

            // copy the header data into the proofdataHash
            // header start is at calldataload(0x04) + 0x24 (+0x04 to skip over func signature, +0x20 to skip over byte array length param)
            calldatacopy(proofdataHashPtr, add(calldataload(0x04), 0x24), rollupHeaderInputLength)

            // update pointer
            proofdataHashPtr := add(proofdataHashPtr, rollupHeaderInputLength)

            // compute the endpoint for the proofdataHashPtr (used as a loop boundary condition)
            let endPtr := add(proofdataHashPtr, mul(numRollupTxs, 0x20))
            let p := 21888242871839275222246405745257275088548364400416034343698204186575808495617
            // iterate over the public inputs for each inner rollup proof and compute their SHA256 hash
            for {

            } lt(proofdataHashPtr, endPtr) {
                proofdataHashPtr := add(proofdataHashPtr, 0x20)
            } {
                // address(0x02) is the SHA256 precompile address
                if iszero(staticcall(gas(), 0x02, outPtrCopy, rollupDataSize, 0x00, 0x20)) {
                    revert(0x00, 0x00)
                }

                mstore(proofdataHashPtr, mod(mload(0x00), p))
                outPtrCopy := add(outPtrCopy, rollupDataSize)
            }

            // compute SHA256 hash of header data + inner public input hashes
            let startPtr := mload(0x40)
            if iszero(staticcall(gas(), 0x02, startPtr, sub(proofdataHashPtr, startPtr), 0x00, 0x20)) {
                revert(0x00, 0x00)
            }
            publicInputsHash := mod(mload(0x00), p)
        }
    }

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
            uint256 numDataLeaves,
            uint256 dataStartIndex
        )
    {
        assembly {
            let dataStart := add(proofData, 0x20) // jump over first word, it's length of data
            numDataLeaves := shl(1, mload(add(dataStart, 0x20))) // rollupSize * 2 (2 notes per tx)
            dataStartIndex := mload(add(dataStart, 0x40))
            rollupId := mload(dataStart)

            let mPtr := mload(0x40)

            mstore(mPtr, rollupId) // old nextRollupId
            mstore(add(mPtr, 0x20), mload(add(dataStart, 0x60))) // oldDataRoot
            mstore(add(mPtr, 0x40), mload(add(dataStart, 0xa0))) // oldNullRoot
            mstore(add(mPtr, 0x60), mload(add(dataStart, 0xe0))) // oldRootRoot
            mstore(add(mPtr, 0x80), mload(add(dataStart, 0x120))) // oldDefiRoot
            oldStateHash := and(STATE_HASH_MASK, keccak256(mPtr, 0xa0))

            mstore(mPtr, add(rollupId, 0x01)) // new nextRollupId
            mstore(add(mPtr, 0x20), mload(add(dataStart, 0x80))) // newDataRoot
            mstore(add(mPtr, 0x40), mload(add(dataStart, 0xc0))) // newNullRoot
            mstore(add(mPtr, 0x60), mload(add(dataStart, 0x100))) // newRootRoot
            mstore(add(mPtr, 0x80), mload(add(dataStart, 0x140))) // newDefiRoot
            newStateHash := and(STATE_HASH_MASK, keccak256(mPtr, 0xa0))
        }
    }

    function extractPrevDefiInteractionHash(bytes memory proofData, uint256 rollupHeaderInputLength)
        internal
        pure
        returns (bytes32 prevDefiInteractionHash)
    {
        assembly {
            prevDefiInteractionHash := mload(add(proofData, sub(rollupHeaderInputLength, 0x20)))
        }
    }

    function extractInteractionData(
        bytes memory proofData,
        uint256 idx,
        uint256 numberOfBridgeCalls
    )
        internal
        pure
        returns (
            uint256 bridgeId,
            address bridgeAddress,
            uint256[3] memory assetIds,
            uint32 numOutputAssets,
            uint256 totalInputValue
        )
    {
        assembly {
            let dataStart := add(add(proofData, bridgeIdsOffset), mul(0x20, idx))
            bridgeId := mload(dataStart)
            bridgeAddress := and(bridgeId, 0xffffffffffffffffffffffffffffffffffffffff)
            numOutputAssets := and(shr(160, bridgeId), 3)
            mstore(assetIds, and(shr(162, bridgeId), 0x3fffffff))
            mstore(add(assetIds, 0x20), and(shr(192, bridgeId), 0x3fffffff))
            mstore(add(assetIds, 0x40), and(shr(222, bridgeId), 0x3fffffff))
            totalInputValue := mload(add(dataStart, mul(0x20, numberOfBridgeCalls)))
        }
    }

    function extractAssetId(
        bytes memory proofData,
        uint256 idx,
        uint256 numberOfBridgeCalls
    ) internal pure returns (uint256 totalTxFee) {
        assembly {
            totalTxFee := mload(add(add(add(proofData, 0x180), mul(0x40, numberOfBridgeCalls)), mul(0x20, idx)))
        }
    }

    function extractTotalTxFee(
        bytes memory proofData,
        uint256 idx,
        uint256 numberOfBridgeCalls
    ) internal pure returns (uint256 totalTxFee) {
        assembly {
            totalTxFee := mload(add(add(add(proofData, 0x380), mul(0x40, numberOfBridgeCalls)), mul(0x20, idx)))
        }
    }
}
