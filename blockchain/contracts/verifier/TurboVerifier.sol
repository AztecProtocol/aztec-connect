// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.7.0;
pragma experimental ABIEncoderV2;

import {PairingsBn254} from './cryptography/PairingsBn254.sol';
import {TurboPlonk} from './cryptography/TurboPlonk.sol';
import {PolynomialEval} from './cryptography/PolynomialEval.sol';
import {Types} from './cryptography/Types.sol';
import {VerificationKeys} from './keys/VerificationKeys.sol';
import {TranscriptLibrary} from './cryptography/TranscriptLibrary.sol';
import {IVerifier} from '../interfaces/IVerifier.sol';

/**
 * @title Plonk proof verification contract
 * @dev Top level Plonk proof verification contract, which allows Plonk proof to be verified
 *
 * Copyright 2020 Spilsbury Holdings Ltd
 *
 * Licensed under the GNU General Public License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
contract TurboVerifier is IVerifier {
    using PairingsBn254 for Types.G1Point;
    using PairingsBn254 for Types.G2Point;
    using PairingsBn254 for Types.Fr;

    /**
     * @dev Verify a Plonk proof
     * @param serialized_proof - array of serialized proof data
     * @param rollup_size - number of transactions in the rollup
     */
    function verify(bytes calldata serialized_proof, uint256 rollup_size) external override {
        Types.VerificationKey memory vk = VerificationKeys.getKeyById(rollup_size);
        uint256 num_public_inputs = vk.num_inputs;

        Types.Proof memory decoded_proof = deserialize_proof(num_public_inputs, vk);
        
        (Types.ChallengeTranscript memory challenges, TranscriptLibrary.Transcript memory transcript) = TurboPlonk
            .construct_alpha_beta_gamma_zeta_challenges(decoded_proof, vk);
        
        /**
         * Compute all inverses that will be needed throughout the program here.
         *
         * This is an efficiency improvement - it allows us to make use of the batch inversion Montgomery trick,
         * which allows all inversions to be replaced with one inversion operation, at the expense of a few
         * additional multiplications
         **/
        (Types.Fr memory quotient_eval, Types.Fr memory L1) = TurboPlonk.compute_partial_state(
            decoded_proof,
            vk,
            challenges
        );
        decoded_proof.quotient_polynomial_at_z = PairingsBn254.new_fr(quotient_eval.value);

        //reset 'alpha base'
        challenges = TurboPlonk.construct_nu_u_challenges(decoded_proof, transcript, challenges);
        challenges.alpha_base = PairingsBn254.new_fr(challenges.alpha.value);

        (Types.G1Point memory batch_opening_commitment, Types.G1Point memory batch_evaluation_commitment) = TurboPlonk
            .evaluate_polynomials(decoded_proof, vk, challenges, L1);
    
        bool result = TurboPlonk.perform_pairing(
            batch_opening_commitment,
            batch_evaluation_commitment,
            challenges,
            decoded_proof,
            vk
        );
        require(result, 'Proof failed');
    }

    /**
     * @dev Deserialize a proof into a Proof struct
     * @param num_public_inputs - number of public inputs in the proof. Taken from verification key
     * @return proof - proof deserialized into the proof struct
     */
    function deserialize_proof(uint256 num_public_inputs, Types.VerificationKey memory vk)
        internal
        pure
        returns (Types.Proof memory proof)
    {
        uint256 data_ptr;
        uint256 x;
        uint256 y;
        // first 32 bytes of bytes array contains length, skip it
        assembly {
            data_ptr := add(calldataload(0x04), 0x24)
        }

        proof.public_input_values = new uint256[](num_public_inputs);

        uint256[] memory public_input_ptr = proof.public_input_values;
        assembly {
            let public_input_byte_length := mul(num_public_inputs, 0x20)
            calldatacopy(add(public_input_ptr, 0x20), data_ptr, public_input_byte_length)
            data_ptr := add(data_ptr, public_input_byte_length)
        }

        if (vk.contains_recursive_proof)
        {
            uint256 x0 = proof.public_input_values[vk.recursive_proof_indices[0]]
            + (proof.public_input_values[vk.recursive_proof_indices[1]] << 68)
            + (proof.public_input_values[vk.recursive_proof_indices[2]] << 136)
            + (proof.public_input_values[vk.recursive_proof_indices[3]] << 204);
            uint256 y0 = proof.public_input_values[vk.recursive_proof_indices[4]]
            + (proof.public_input_values[vk.recursive_proof_indices[5]] << 68)
            + (proof.public_input_values[vk.recursive_proof_indices[6]] << 136)
            + (proof.public_input_values[vk.recursive_proof_indices[7]] << 204);
            uint256 x1 = proof.public_input_values[vk.recursive_proof_indices[8]]
            + (proof.public_input_values[vk.recursive_proof_indices[9]] << 68)
            + (proof.public_input_values[vk.recursive_proof_indices[10]] << 136)
            + (proof.public_input_values[vk.recursive_proof_indices[11]] << 204);
            uint256 y1 = proof.public_input_values[vk.recursive_proof_indices[12]]
            + (proof.public_input_values[vk.recursive_proof_indices[13]] << 68)
            + (proof.public_input_values[vk.recursive_proof_indices[14]] << 136)
            + (proof.public_input_values[vk.recursive_proof_indices[15]] << 204);
            proof.recursive_proof_outputs[0] = PairingsBn254.new_g1(
                x0, y0
            );
            proof.recursive_proof_outputs[1] = PairingsBn254.new_g1(
                x1, y1
            );
        }
        for (uint256 i = 0; i < Types.STATE_WIDTH; ++i) {
            assembly {
                y := calldataload(data_ptr)
                x := calldataload(add(data_ptr, 0x20))
            }
            proof.wire_commitments[i] = PairingsBn254.new_g1(x, y);
            data_ptr += 0x40;
        }

        assembly {
            y := calldataload(data_ptr)
            x := calldataload(add(data_ptr, 0x20))
        }
        proof.grand_product_commitment = PairingsBn254.new_g1(x, y);
        data_ptr += 0x40;

        for (uint256 i = 0; i < Types.STATE_WIDTH; ++i) {
            assembly {
                y := calldataload(data_ptr)
                x := calldataload(add(data_ptr, 0x20))
            }
            proof.quotient_poly_commitments[i] = PairingsBn254.new_g1(x, y);
            data_ptr += 0x40;
        }

        for (uint256 i = 0; i < Types.STATE_WIDTH; ++i) {
            assembly {
                x := calldataload(data_ptr)
            }
            proof.wire_values_at_z[i] = PairingsBn254.new_fr(x);
            data_ptr += 0x20;
        }

        for (uint256 i = 0; i < Types.STATE_WIDTH - 1; ++i) {
            assembly {
                x := calldataload(data_ptr)
            }
            proof.permutation_polynomials_at_z[i] = PairingsBn254.new_fr(x);
            data_ptr += 0x20;
        }

        assembly {
            x := calldataload(data_ptr)
        }
        proof.q_arith_at_z = PairingsBn254.new_fr(x);
        data_ptr += 0x20;
        assembly {
            x := calldataload(data_ptr)
        }
        proof.q_ecc_at_z = PairingsBn254.new_fr(x);
        data_ptr += 0x20;

        assembly {
            x := calldataload(data_ptr)
        }
        proof.q_c_at_z = PairingsBn254.new_fr(x);
        data_ptr += 0x20;

        assembly {
            x := calldataload(data_ptr)
        }
        proof.linearization_polynomial_at_z = PairingsBn254.new_fr(x);
        data_ptr += 0x20;

        assembly {
            x := calldataload(data_ptr)
        }
        proof.grand_product_at_z_omega = PairingsBn254.new_fr(x);
        data_ptr += 0x20;

        for (uint256 i = 0; i < Types.STATE_WIDTH; ++i) {
            assembly {
                x := calldataload(data_ptr)
            }
            proof.wire_values_at_z_omega[i] = PairingsBn254.new_fr(x);
            data_ptr += 0x20;
        }

        assembly {
            y := calldataload(data_ptr)
            x := calldataload(add(data_ptr, 0x20))
        }
        proof.opening_at_z_proof = PairingsBn254.new_g1(x, y);
        data_ptr += 0x40;
        assembly {
            y := calldataload(data_ptr)
            x := calldataload(add(data_ptr, 0x20))
        }
        proof.opening_at_z_omega_proof = PairingsBn254.new_g1(x, y);
        data_ptr += 0x40;
    }
}
