// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec.
pragma solidity >=0.8.4;

import {Test} from "forge-std/Test.sol";
import {BaseStandardVerifier} from "core/verifier/BaseStandardVerifier.sol";
import {MockVerifier} from "core/verifier/instances/MockVerifier.sol";
import {Verifier1x1} from "core/verifier/instances/Verifier1x1.sol";
import {RollupProcessorLibrary} from "rollup-encoder/libraries/RollupProcessorLibrary.sol";
import {Decoder} from "core/Decoder.sol";

interface Cheats {
    function readFileBinary(string calldata) external returns (bytes memory);
}

contract Dec is Decoder {
    function decode(bytes memory)
        public
        view
        returns (bytes memory proofData, uint256 numTxs, uint256 publicInputsHash)
    {
        return decodeProof();
    }
}

contract VerifierTest is Test {
    function testMockVerifier() public {
        string memory path = "verification-keys/mock_rollup_proof_data_3x2.dat";
        (, bytes memory proof, uint256 inputHash, bool expected) = _readData(path);
        MockVerifier verifier = new MockVerifier();
        assertEq(verifier.verify(proof, inputHash), expected);
    }

    function testVerifier1x1() public {
        string memory path = "verification-keys/rollup_proof_data_1x1.dat";
        (, bytes memory proof, uint256 inputHash, bool expected) = _readData(path);
        Verifier1x1 verifier = new Verifier1x1();
        assertEq(verifier.verify(proof, inputHash), expected);
    }

    function testInputHasher() public {
        string memory path = "verification-keys/rollup_proof_data_1x1.dat";
        (bytes memory full, bytes memory proof, uint256 _inputHash, bool expected) = _readData(path);
        bytes memory rawEncoded =
            Cheats(address(vm)).readFileBinary("verification-keys/encoded_rollup_proof_data_1x1.dat");

        (bytes memory decodedData,, uint256 inputHash) = (new Dec()).decode(rawEncoded);

        Verifier1x1 verifier = new Verifier1x1();
        assertEq(verifier.verify(proof, inputHash), expected);
        assertEq(inputHash, _inputHash);
    }

    function testInputHasherFailure() public {
        // Fuzzing is very slow because of file reads
        uint256 _where = 100;
        bytes32 _rand = keccak256("random");

        (bytes memory full, bytes memory proof, uint256 realHash, bool expected) =
            _readData("verification-keys/rollup_proof_data_1x1.dat");
        bytes memory rawEncoded =
            Cheats(address(vm)).readFileBinary("verification-keys/encoded_rollup_proof_data_1x1.dat");

        uint256 proofLen = 0x20 * (24 + 17);
        uint256 where = bound(_where, 0, (rawEncoded.length - proofLen) / 0x20);

        uint256 was;
        assembly {
            was := mload(add(add(rawEncoded, 0x20), mul(where, 0x20)))

            if eq(was, _rand) { _rand := add(_rand, 1) }

            mstore(add(add(rawEncoded, 0x20), mul(where, 0x20)), _rand)
        }

        (bytes memory decodedData,, uint256 computedHash) = (new Dec()).decode(rawEncoded);
        assertTrue(computedHash != realHash, "Hashes match!");

        Verifier1x1 verifier = new Verifier1x1();
        vm.expectRevert(
            abi.encodeWithSelector(
                BaseStandardVerifier.PUBLIC_INPUTS_HASH_VERIFICATION_FAILED.selector, computedHash, realHash
            )
        );
        verifier.verify(proof, computedHash);
    }

    function testVerifierEcScalarMulFailure() public {
        // Manipulate proof to force a failure when validating the recursive P1
        string memory path = "verification-keys/rollup_proof_data_1x1.dat";
        (, bytes memory proof, uint256 inputHash,) = _readData(path);
        Verifier1x1 verifier = new Verifier1x1();

        assembly {
            let where := add(add(proof, 0x20), mul(0x20, 2))
            mstore(where, add(where, 1))
        }

        vm.expectRevert(abi.encodeWithSelector(BaseStandardVerifier.EC_SCALAR_MUL_FAILURE.selector));
        verifier.verify(proof, inputHash);
    }

    function testVerifierProofFailure() public {
        // Manipulate proof to force an invalid but correctly formatted proof
        string memory path = "verification-keys/rollup_proof_data_1x1.dat";
        (, bytes memory proof, uint256 inputHash,) = _readData(path);
        Verifier1x1 verifier = new Verifier1x1();

        assembly {
            let where := add(add(proof, 0x20), mul(0x20, 20))
            mstore(where, add(where, 1))
        }

        vm.expectRevert(abi.encodeWithSelector(BaseStandardVerifier.PROOF_FAILURE.selector));
        verifier.verify(proof, inputHash);
    }

    function testVerifierInvalidBn128G1() public {
        _testVerifierInvalidBn128Component(0x40); // x0
        _testVerifierInvalidBn128Component(0xc0); // y0
        _testVerifierInvalidBn128Component(0x140); // x1
        _testVerifierInvalidBn128Component(0x1c0); // y1
    }

    function testPublicInputsNotInP(uint256 _offset) public {
        // Ones where we can "easily" hit this is
        // The input hash
        // The last 68 bit limb in each point (except the last, as that is check in another testLastPublicInputNotInP)

        string memory path = "verification-keys/rollup_proof_data_1x1.dat";
        (, bytes memory proof, uint256 inputHash, bool expected) = _readData(path);
        Verifier1x1 verifier = new Verifier1x1();

        uint256 toReplace = 4 * bound(_offset, 0, 3);

        uint256 p = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
        assembly {
            let start := add(proof, 0x20)
            let offset := mul(toReplace, 0x20)
            let loc := add(start, offset)
            mstore(loc, p)
        }

        vm.expectRevert(BaseStandardVerifier.PUBLIC_INPUT_GE_P.selector);
        verifier.verify(proof, toReplace == 0 ? p : inputHash);
    }

    function testLastPublicInputNotInP() public {
        // The last public element (index 16) is replaced with p
        // This is the last value that is put into y1

        string memory path = "verification-keys/rollup_proof_data_1x1.dat";
        (, bytes memory proof, uint256 inputHash, bool expected) = _readData(path);
        Verifier1x1 verifier = new Verifier1x1();

        uint256 toReplace = 16;

        uint256 p = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
        assembly {
            let start := add(proof, 0x20)
            let offset := mul(toReplace, 0x20)
            let loc := add(start, offset)
            mstore(loc, p)
        }

        vm.expectRevert(BaseStandardVerifier.PUBLIC_INPUT_GE_P.selector);
        verifier.verify(proof, toReplace == 0 ? p : inputHash);
    }

    function testVerifier1x1InvalidHash(uint256 invalidHash) public {
        string memory path = "verification-keys/rollup_proof_data_1x1.dat";
        (, bytes memory proof, uint256 inputHash,) = _readData(path);
        vm.assume(inputHash != invalidHash);
        Verifier1x1 verifier = new Verifier1x1();
        vm.expectRevert(
            abi.encodeWithSelector(
                BaseStandardVerifier.PUBLIC_INPUTS_HASH_VERIFICATION_FAILED.selector, invalidHash, inputHash
            )
        );
        assertFalse(verifier.verify(proof, invalidHash));
    }

    function _testVerifierInvalidBn128Component(uint256 _offset) internal {
        string memory path = "verification-keys/rollup_proof_data_1x1.dat";
        (, bytes memory proof, uint256 inputHash, bool expected) = _readData(path);
        Verifier1x1 verifier = new Verifier1x1();

        {
            uint256 q = 21888242871839275222246405745257275088696311157297823662689037894645226208583;

            assembly {
                mstore(add(proof, _offset), and(shr(0, q), 0x0fffffffffffffffff))
                mstore(add(proof, add(_offset, 0x20)), and(shr(68, q), 0x0fffffffffffffffff))
                mstore(add(proof, add(_offset, 0x40)), and(shr(136, q), 0x0fffffffffffffffff))
                mstore(add(proof, add(_offset, 0x60)), and(shr(204, q), 0x0fffffffffffffffff))
            }
        }

        vm.expectRevert(BaseStandardVerifier.PUBLIC_INPUT_INVALID_BN128_G1_POINT.selector);
        verifier.verify(proof, inputHash);
    }

    function _readData(string memory path)
        internal
        returns (bytes memory, bytes memory, uint256 inputHash, bool expectedResult)
    {
        // format [4 byte length][data][1 byte flag for expected validity]
        bytes memory rawBytes = Cheats(address(vm)).readFileBinary(path);

        bytes memory proofData = new bytes(rawBytes.length - 5); //
        assembly {
            let length := shr(224, mload(add(rawBytes, 0x20)))

            let wLoc := add(proofData, 0x20)
            let rLoc := add(rawBytes, 0x24)
            let end := add(rLoc, length)

            for {} lt(rLoc, end) {
                wLoc := add(wLoc, 0x20)
                rLoc := add(rLoc, 0x20)
            } { mstore(wLoc, mload(rLoc)) }
        }

        uint256 proofLen = 0x20 * (24 + 17);
        bytes memory proof = new bytes(proofLen);

        assembly {
            let length := shr(224, mload(add(rawBytes, 0x20)))
            let start := sub(sub(length, proofLen), 0x00)
            let readLoc := add(rawBytes, add(0x24, start))

            mstore(add(proof, 0x20), mload(readLoc))
            for { let offset := 0x00 } lt(offset, proofLen) {
                offset := add(offset, 0x20)
                readLoc := add(readLoc, 0x20)
            } { mstore(add(0x20, add(proof, offset)), mload(readLoc)) }
            inputHash := mload(add(proof, 0x20))
        }

        return (proofData, proof, inputHash, rawBytes[rawBytes.length - 1] == 0x01);
    }

    function _printBytes(bytes memory _data, uint256 _offset) internal {
        uint256 length = _data.length - _offset;

        for (uint256 i = 0; i < length / 0x20; i++) {
            bytes32 val;
            assembly {
                val := mload(add(_offset, add(_data, mul(0x20, add(1, i)))))
            }
            emit log_named_bytes32(RollupProcessorLibrary.toHexString(bytes32(i * 0x20)), val);
        }
    }
}
