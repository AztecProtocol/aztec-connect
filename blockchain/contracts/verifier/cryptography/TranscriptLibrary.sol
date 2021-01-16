// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.7.0;
pragma experimental ABIEncoderV2;

import {Types} from './Types.sol';

/**
 * @title Challenge transcript library
 * @dev Used to collect the data necessary to calculate the various challenges: beta, gamma, alpha, zeta, nu[7], u
 */
library TranscriptLibrary {
    uint256 constant r_mod = 21888242871839275222246405745257275088548364400416034343698204186575808495617;

    // When creating `transcript.data` we pre-allocate all the memory required to store the entire transcript.
    // TODO: figure out how big this needs to be! 16384 bytes is a big overestimate
    uint256 constant NUM_TRANSCRIPT_BYTES = 16384;

    struct Transcript {
        bytes32 current_challenge;
        bytes data;
        uint32 challenge_counter;
        bytes32 debug_data;
    }
    event ChallengeDebug(bytes32 data);

    /**
     * Instantiate a transcript and calculate the initial challenge, from which other challenges are derived.
     *
     * Resembles the preamble round in the Plonk prover
     */
    function new_transcript(uint256 circuit_size, uint256 num_public_inputs)
        internal
        pure
        returns (Transcript memory transcript)
    {
        bytes memory formatted_circuit_size = format_4_byte_variable(uint32(circuit_size));
        bytes memory formatted_num_public_inputs = format_4_byte_variable(uint32(num_public_inputs));

        transcript.current_challenge = keccak256(abi.encodePacked(formatted_circuit_size, formatted_num_public_inputs));
        transcript.debug_data = transcript.current_challenge;
        transcript.challenge_counter = 0;

        // manually format the transcript.data bytes array
        // This is because we want to reserve memory that is greatly in excess of the array's initial size
        bytes memory transcript_data_pointer;
        bytes32 transcript_data = transcript.current_challenge;
        assembly {
            transcript_data_pointer := mload(0x40)
            mstore(0x40, add(transcript_data_pointer, NUM_TRANSCRIPT_BYTES))
            // update length of transcript.data
            mstore(transcript_data_pointer, 0x20)
            // insert current challenge
            mstore(add(transcript_data_pointer, 0x20), transcript_data)
        }
        transcript.data = transcript_data_pointer;
    }

    function format_4_byte_variable(uint32 input) internal pure returns (bytes memory) {
        // uint8 byte0 = uint8(input & 0xff);
        // uint8 byte1 = uint8((input >> 8) & 0xff);
        // uint8 byte2 = uint8((input >> 16) & 0xff);
        // uint8 byte3 = uint8((input >> 24) & 0xff);
        // // TODO SWAP
        uint8 byte0 = uint8((input >> 24) & 0xff);
        uint8 byte1 = uint8((input >> 16) & 0xff);
        uint8 byte2 = uint8((input >> 8) & 0xff);
        uint8 byte3 = uint8((input) & 0xff);
        return abi.encodePacked(byte0, byte1, byte2, byte3);
    }

    /**
     * Add a uint256 into the transcript
     */
    function update_with_u256(Transcript memory self, uint256 value) internal pure {
        bytes memory data_ptr = self.data;
        uint256 array_length = 0;
        assembly {
            // update length of transcript data
            array_length := mload(data_ptr)
            mstore(data_ptr, add(0x20, array_length))
            // insert new 32-byte value at the end of the array
            mstore(add(data_ptr, add(array_length, 0x20)), value)
        }
    }

    /**
     * Add public inputs into the transcript
     */
    function update_with_public_inputs(Transcript memory self, uint256[] memory, uint256 num_public_inputs) internal pure {
        bytes memory data_ptr = self.data;
        // fetch the public inputs directly from calldata to reduce gas costs
        // N.B. IF WE CHANGE THE ABI FOR `verify` THIS CODE WILL NEED TO BE UPDATED
        assembly {
            // update length of transcript data
            let array_length := mload(data_ptr)
            mstore(data_ptr, add(mul(0x20, num_public_inputs), array_length))

            let array_start := add(data_ptr, add(array_length, 0x20))
            let inputs_start := add(calldataload(0x04), 0x24)
            let endpoint := mul(num_public_inputs, 0x20)
            calldatacopy(array_start, inputs_start, endpoint)
        }
    }

    /**
     * Add a field element into the transcript
     */
    function update_with_fr(Transcript memory self, Types.Fr memory value) internal pure {
        update_with_u256(self, value.value);
    }

    /**
     * Add a g1 point into the transcript
     */
    function update_with_g1(Transcript memory self, Types.G1Point memory p) internal pure {
        // in the C++ prover, the y coord is appended first before the x
        update_with_u256(self, p.Y);
        update_with_u256(self, p.X);
    }

    /**
     * Append byte
     */
    function append_byte(Transcript memory self, uint8 value) internal pure {
        bytes memory data_ptr = self.data;
        uint256 array_length = 0;
        assembly {
            // update length of transcript data
            array_length := mload(data_ptr)
            mstore(data_ptr, add(0x01, array_length))
            // insert new 1-byte value at the end of the array
            mstore8(add(data_ptr, add(array_length, 0x20)), value)
        }
    }

    /**
     * Reset challenge array to equal a single bytes32 value
     */
    function reset_to_bytes32(Transcript memory self, bytes32 value) internal pure {
        bytes memory data_ptr = self.data;
        {
            assembly {
                mstore(data_ptr, 0x20)
                mstore(add(data_ptr, 0x20), value)
            }
        }
    }

    /**
     * Draw a challenge
     */
    function get_challenge(Transcript memory self) internal pure returns (Types.Fr memory) {
        bytes32 challenge;
        bytes memory data_ptr = self.data;
        assembly {
            let length := mload(data_ptr)
            challenge := keccak256(add(data_ptr, 0x20), length)
        }
        self.current_challenge = challenge;

        // reset self.data by setting length to 0x20 and update first element
        {
            assembly {
                mstore(data_ptr, 0x20)
                mstore(add(data_ptr, 0x20), challenge)
            }
        }
        return Types.Fr({value: uint256(challenge) % r_mod});
    }
}
