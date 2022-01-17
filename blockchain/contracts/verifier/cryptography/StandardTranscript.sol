// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.8.11;
pragma experimental ABIEncoderV2;

import {StandardTypes} from './StandardTypes.sol';
import {Bn254Crypto} from './StandardBn254Crypto.sol';

/**
 * @title StandardTranscript library
 * @dev Generates Plonk random challenges
 */
library StandardTranscript {

    struct TranscriptData {
        bytes32 current_challenge;
    }
    
    /**
     * Compute keccak256 hash of 2 4-byte variables (circuit_size, num_public_inputs)
     */
    function generate_initial_challenge(
                TranscriptData memory self,
                uint256 circuit_size,
                uint256 num_public_inputs
    ) internal pure {
        bytes32 challenge;
        assembly {
            let mPtr := mload(0x40)
            mstore8(add(mPtr, 0x20), shr(24, circuit_size))
            mstore8(add(mPtr, 0x21), shr(16, circuit_size))
            mstore8(add(mPtr, 0x22), shr(8, circuit_size))
            mstore8(add(mPtr, 0x23), circuit_size)           
            mstore8(add(mPtr, 0x24), shr(24, num_public_inputs))
            mstore8(add(mPtr, 0x25), shr(16, num_public_inputs))
            mstore8(add(mPtr, 0x26), shr(8, num_public_inputs))
            mstore8(add(mPtr, 0x27), num_public_inputs)
            challenge := keccak256(add(mPtr, 0x20), 0x08)
        }
        self.current_challenge = challenge;
    }

    /**
     * We treat the beta challenge as a special case, because it includes the public inputs.
     * The number of public inputs can be extremely large for rollups and we want to minimize mem consumption.
     * => we directly allocate memory to hash the public inputs, in order to prevent the global memory pointer from increasing
     */
    function generate_beta_gamma_challenges(
        TranscriptData memory self,
        StandardTypes.ChallengeTranscript memory challenges,
        uint256 num_public_inputs
    ) internal pure  {
        bytes32 challenge;
        bytes32 old_challenge = self.current_challenge;
        uint256 p = Bn254Crypto.r_mod;
        uint256 reduced_challenge;
        assembly {
            let m_ptr := mload(0x40)
            // N.B. If the calldata ABI changes this code will need to change!
            // We can copy all of the public inputs, followed by the wire commitments, into memory
            // using calldatacopy
            mstore(m_ptr, old_challenge)
            m_ptr := add(m_ptr, 0x20)
            let inputs_start := add(calldataload(0x04), 0x24)
            // num_calldata_bytes = public input size + 192 bytes for the 3 wire commitments
            let num_calldata_bytes := add(0xc0, mul(num_public_inputs, 0x20))
            calldatacopy(m_ptr, inputs_start, num_calldata_bytes)

            let start := mload(0x40)
            let length := add(num_calldata_bytes, 0x20)

            challenge := keccak256(start, length)
            reduced_challenge := mod(challenge, p)
        }
        challenges.beta = reduced_challenge;

        // get gamma challenge by appending 1 to the beta challenge and hash
        assembly {
            mstore(0x00, challenge)
            mstore8(0x20, 0x01)
            challenge := keccak256(0, 0x21)
            reduced_challenge := mod(challenge, p)
        }
        challenges.gamma = reduced_challenge;
        self.current_challenge = challenge;
    }

    function generate_alpha_challenge(
        TranscriptData memory self,
        StandardTypes.ChallengeTranscript memory challenges,
        StandardTypes.G1Point memory Z
    ) internal pure  {
        bytes32 challenge;
        bytes32 old_challenge = self.current_challenge;
        uint256 p = Bn254Crypto.r_mod;
        uint256 reduced_challenge;
        assembly {
            let m_ptr := mload(0x40)
            mstore(m_ptr, old_challenge)
            mstore(add(m_ptr, 0x20), mload(add(Z, 0x20)))
            mstore(add(m_ptr, 0x40), mload(Z))
            challenge := keccak256(m_ptr, 0x60)
            reduced_challenge := mod(challenge, p)
        }
        challenges.alpha = reduced_challenge;
        challenges.alpha_base = reduced_challenge;
        self.current_challenge = challenge;
    }

    function generate_zeta_challenge(
        TranscriptData memory self,
        StandardTypes.ChallengeTranscript memory challenges,
        StandardTypes.G1Point memory T1,
        StandardTypes.G1Point memory T2,
        StandardTypes.G1Point memory T3
        // StandardTypes.G1Point memory T4
    ) internal pure  {
        bytes32 challenge;
        bytes32 old_challenge = self.current_challenge;
        uint256 p = Bn254Crypto.r_mod;
        uint256 reduced_challenge;
        assembly {
            let m_ptr := mload(0x40)
            mstore(m_ptr, old_challenge)
            mstore(add(m_ptr, 0x20), mload(add(T1, 0x20)))
            mstore(add(m_ptr, 0x40), mload(T1))
            mstore(add(m_ptr, 0x60), mload(add(T2, 0x20)))
            mstore(add(m_ptr, 0x80), mload(T2))
            mstore(add(m_ptr, 0xa0), mload(add(T3, 0x20)))
            mstore(add(m_ptr, 0xc0), mload(T3))
            // mstore(add(m_ptr, 0xe0), mload(add(T4, 0x20)))
            // mstore(add(m_ptr, 0x100), mload(T4))
            challenge := keccak256(m_ptr, 0xe0)
            reduced_challenge := mod(challenge, p)
        }
        challenges.zeta = reduced_challenge;
        self.current_challenge = challenge;
    }

    /**
     * We compute our initial nu challenge by hashing the following proof elements (with the current challenge):
     *
     * w1, w2, w3, w4, sigma1, sigma2, sigma3, q_arith, q_ecc, q_c, linearization_poly, grand_product_at_z_omega,
     * w1_omega, w2_omega, w3_omega, w4_omega
     *
     * These values are placed linearly in the proofData, we can extract them with a calldatacopy call
     *
     */
    function generate_nu_challenges(TranscriptData memory self, StandardTypes.ChallengeTranscript memory challenges, uint256 quotient_poly_eval, uint256 num_public_inputs) internal pure
    {
        uint256 p = Bn254Crypto.r_mod;
        bytes32 current_challenge = self.current_challenge;
        uint256 base_v_challenge;
        uint256 updated_v;

        // We want to copy SEVEN field elements from calldata into memory to hash
        // TurboPlonk field elements (16):
        /**
         *   w1, w2, w3, w4, sigma1, sigma2, sigma3, qarith, qecc1, qc, r, zomega, w1omega, w2omega, w3omega, w4omega
         **/
        // StandardPlonk field elements (7):
        /**
         *   w1, w2, w3, sigma1, sigma2, r, zomega
         */
        // But we start by adding the quotient poly evaluation to the hash transcript
        assembly {
            // get a calldata pointer that points to the start of the data we want to copy
            let calldata_ptr := add(calldataload(0x04), 0x24)
            // skip over the public inputs
            calldata_ptr := add(calldata_ptr, mul(num_public_inputs, 0x20))
            // There are SEVEN G1 group elements added into the transcript in the `beta` round, that we need to skip over
            // W1, W2, W3 (W4), Z, T1, T2, T3, (T4)
            calldata_ptr := add(calldata_ptr, 0x1c0) // 7 * 0x40 = 0x1c0

            let m_ptr := mload(0x40)
            mstore(m_ptr, current_challenge)
            mstore(add(m_ptr, 0x20), quotient_poly_eval)
            calldatacopy(add(m_ptr, 0x40), calldata_ptr, 0xe0) // 7 * 0x20 = 0xe0
            base_v_challenge := keccak256(m_ptr, 0x120) // hash length = 0x120 (0x40 + num field elements), we include the previous challenge in the hash
            updated_v := mod(base_v_challenge, p)
        }

        // assign the first challenge value
        challenges.v0 = updated_v;

        // for subsequent challenges we iterate 10 times.
        // At each iteration i \in [1, 10] we compute challenges.vi = keccak256(base_v_challenge, byte(i))
        assembly {
            mstore(0x00, base_v_challenge)
            mstore8(0x20, 0x01)
            updated_v := mod(keccak256(0x00, 0x21), p)
        }
        challenges.v1 = updated_v;
        assembly {
            mstore8(0x20, 0x02)
            updated_v := mod(keccak256(0x00, 0x21), p)
        }
        challenges.v2 = updated_v;
        assembly {
            mstore8(0x20, 0x03)
            updated_v := mod(keccak256(0x00, 0x21), p)
        }
        challenges.v3 = updated_v;
        assembly {
            mstore8(0x20, 0x04)
            updated_v := mod(keccak256(0x00, 0x21), p)
        }
        challenges.v4 = updated_v;
        // assembly {
        //     mstore8(0x20, 0x05)
        //     updated_v := mod(keccak256(0x00, 0x21), p)
        // }
        // challenges.v5 = updated_v;
        // assembly {
        //     mstore8(0x20, 0x06)
        //     updated_v := mod(keccak256(0x00, 0x21), p)
        // }
        // challenges.v6 = updated_v;
        // assembly {
        //     mstore8(0x20, 0x07)
        //     updated_v := mod(keccak256(0x00, 0x21), p)
        // }
        // challenges.v7 = updated_v;
        // assembly {
        //     mstore8(0x20, 0x08)
        //     updated_v := mod(keccak256(0x00, 0x21), p)
        // }
        // challenges.v8 = updated_v;
        // assembly {
        //     mstore8(0x20, 0x09)
        //     updated_v := mod(keccak256(0x00, 0x21), p)
        // }
        // challenges.v9 = updated_v;

        // update the current challenge when computing the final nu challenge
        bytes32 challenge;
        assembly {
            mstore8(0x20, 0x05)
            challenge := keccak256(0x00, 0x21)
            updated_v := mod(challenge, p)
        }
        challenges.v5 = updated_v;

        self.current_challenge = challenge;
    }

    function generate_separator_challenge(
        TranscriptData memory self,
        StandardTypes.ChallengeTranscript memory challenges,
        StandardTypes.G1Point memory PI_Z,
        StandardTypes.G1Point memory PI_Z_OMEGA
    ) internal pure  {
        bytes32 challenge;
        bytes32 old_challenge = self.current_challenge;
        uint256 p = Bn254Crypto.r_mod;
        uint256 reduced_challenge;
        assembly {
            let m_ptr := mload(0x40)
            mstore(m_ptr, old_challenge)
            mstore(add(m_ptr, 0x20), mload(add(PI_Z, 0x20)))
            mstore(add(m_ptr, 0x40), mload(PI_Z))
            mstore(add(m_ptr, 0x60), mload(add(PI_Z_OMEGA, 0x20)))
            mstore(add(m_ptr, 0x80), mload(PI_Z_OMEGA))
            challenge := keccak256(m_ptr, 0xa0)
            reduced_challenge := mod(challenge, p)
        }
        challenges.u = reduced_challenge;
        self.current_challenge = challenge;
    }
}
