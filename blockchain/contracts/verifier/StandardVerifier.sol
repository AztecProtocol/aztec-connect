// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Aztec

// gas count: 299,341 (includes 21,000 tx base cost, includes cost of 3 pub inputs. Cost of circuit without pub inputs is 298,312)
pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import {IVerifier} from '../interfaces/IVerifier.sol';
import {RootVerifierVk} from './keys/RootVerifierVk.sol';
import {StandardTypes} from './cryptography/StandardTypes.sol';

/**
 * @title Standard Plonk proof verification contract
 * @dev Top level Plonk proof verification contract, which allows Plonk proof to be verified
 *
 * Copyright 2020 Aztec
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
contract StandardVerifier is IVerifier {
    // VERIFICATION KEY MEMORY LOCATIONS
    uint256 constant N_LOC =                                    0x200 + 0x00;
    uint256 constant NUM_INPUTS_LOC =                           0x200 + 0x20;
    uint256 constant OMEGA_LOC =                                0x200 + 0x40;
    uint256 constant DOMAIN_INVERSE_LOC =                       0x200 + 0x60;
    uint256 constant Q1_X_LOC =                                 0x200 + 0x80;
    uint256 constant Q1_Y_LOC =                                 0x200 + 0xa0;
    uint256 constant Q2_X_LOC =                                 0x200 + 0xc0;
    uint256 constant Q2_Y_LOC =                                 0x200 + 0xe0;
    uint256 constant Q3_X_LOC =                                 0x200 + 0x100;
    uint256 constant Q3_Y_LOC =                                 0x200 + 0x120;
    uint256 constant QM_X_LOC =                                 0x200 + 0x140;
    uint256 constant QM_Y_LOC =                                 0x200 + 0x160;
    uint256 constant QC_X_LOC =                                 0x200 + 0x180;
    uint256 constant QC_Y_LOC =                                 0x200 + 0x1a0;
    uint256 constant SIGMA1_X_LOC =                             0x200 + 0x1c0;
    uint256 constant SIGMA1_Y_LOC =                             0x200 + 0x1e0;
    uint256 constant SIGMA2_X_LOC =                             0x200 + 0x200;
    uint256 constant SIGMA2_Y_LOC =                             0x200 + 0x220;
    uint256 constant SIGMA3_X_LOC =                             0x200 + 0x240;
    uint256 constant SIGMA3_Y_LOC =                             0x200 + 0x260;
    uint256 constant CONTAINS_RECURSIVE_PROOF_LOC =             0x200 + 0x280;
    uint256 constant RECURSIVE_PROOF_PUBLIC_INPUT_INDICES_LOC = 0x200 + 0x2a0;
    uint256 constant G2X_X0_LOC =                               0x200 + 0x2c0;
    uint256 constant G2X_X1_LOC =                               0x200 + 0x2e0;
    uint256 constant G2X_Y0_LOC =                               0x200 + 0x300;
    uint256 constant G2X_Y1_LOC =                               0x200 + 0x320;
    // 26

    // ### PROOF DATA MEMORY LOCATIONS
    uint256 constant W1_X_LOC =                                 0x200 + 0x340 + 0x00;
    uint256 constant W1_Y_LOC =                                 0x200 + 0x340 + 0x20;
    uint256 constant W2_X_LOC =                                 0x200 + 0x340 + 0x40;
    uint256 constant W2_Y_LOC =                                 0x200 + 0x340 + 0x60;
    uint256 constant W3_X_LOC =                                 0x200 + 0x340 + 0x80;
    uint256 constant W3_Y_LOC =                                 0x200 + 0x340 + 0xa0;
    uint256 constant Z_X_LOC =                                  0x200 + 0x340 + 0xc0;
    uint256 constant Z_Y_LOC =                                  0x200 + 0x340 + 0xe0;
    uint256 constant T1_X_LOC =                                 0x200 + 0x340 + 0x100;
    uint256 constant T1_Y_LOC =                                 0x200 + 0x340 + 0x120;
    uint256 constant T2_X_LOC =                                 0x200 + 0x340 + 0x140;
    uint256 constant T2_Y_LOC =                                 0x200 + 0x340 + 0x160;
    uint256 constant T3_X_LOC =                                 0x200 + 0x340 + 0x180;
    uint256 constant T3_Y_LOC =                                 0x200 + 0x340 + 0x1a0;
    uint256 constant W1_EVAL_LOC =                              0x200 + 0x340 + 0x1c0;
    uint256 constant W2_EVAL_LOC =                              0x200 + 0x340 + 0x1e0;
    uint256 constant W3_EVAL_LOC =                              0x200 + 0x340 + 0x200;
    uint256 constant SIGMA1_EVAL_LOC =                          0x200 + 0x340 + 0x220;
    uint256 constant SIGMA2_EVAL_LOC =                          0x200 + 0x340 + 0x240;
    uint256 constant Z_OMEGA_EVAL_LOC =                         0x200 + 0x340 + 0x260;
    uint256 constant PI_Z_X_LOC =                               0x200 + 0x340 + 0x280;
    uint256 constant PI_Z_Y_LOC =                               0x200 + 0x340 + 0x2a0;
    uint256 constant PI_Z_OMEGA_X_LOC =                         0x200 + 0x340 + 0x2c0;
    uint256 constant PI_Z_OMEGA_Y_LOC =                         0x200 + 0x340 + 0x2e0;
    // 25

    // ### CHALLENGES MEMORY OFFSETS
    uint256 constant C_BETA_LOC =                               0x200 + 0x340 + 0x300 + 0x00;
    uint256 constant C_GAMMA_LOC =                              0x200 + 0x340 + 0x300 + 0x20;
    uint256 constant C_ALPHA_LOC =                              0x200 + 0x340 + 0x300 + 0x40;
    uint256 constant C_ARITHMETIC_ALPHA_LOC =                   0x200 + 0x340 + 0x300 + 0x60;
    uint256 constant C_ZETA_LOC =                               0x200 + 0x340 + 0x300 + 0x80;
    uint256 constant C_CURRENT_LOC =                            0x200 + 0x340 + 0x300 + 0xa0;
    uint256 constant C_V0_LOC =                                 0x200 + 0x340 + 0x300 + 0xc0;
    uint256 constant C_V1_LOC =                                 0x200 + 0x340 + 0x300 + 0xe0;
    uint256 constant C_V2_LOC =                                 0x200 + 0x340 + 0x300 + 0x100;
    uint256 constant C_V3_LOC =                                 0x200 + 0x340 + 0x300 + 0x120;
    uint256 constant C_V4_LOC =                                 0x200 + 0x340 + 0x300 + 0x140;
    uint256 constant C_V5_LOC =                                 0x200 + 0x340 + 0x300 + 0x160;
    uint256 constant C_U_LOC =                                  0x200 + 0x340 + 0x300 + 0x180;
    // 13

    // ### LOCAL VARIABLES MEMORY OFFSETS
    uint256 constant DELTA_NUMERATOR_LOC =                      0x200 + 0x340 + 0x300 + 0x1a0 + 0x00;
    uint256 constant DELTA_DENOMINATOR_LOC =                    0x200 + 0x340 + 0x300 + 0x1a0 + 0x20;
    uint256 constant ZETA_POW_N_LOC =                           0x200 + 0x340 + 0x300 + 0x1a0 + 0x40;
    uint256 constant PUBLIC_INPUT_DELTA_LOC =                   0x200 + 0x340 + 0x300 + 0x1a0 + 0x60;
    uint256 constant ZERO_POLY_LOC =                            0x200 + 0x340 + 0x300 + 0x1a0 + 0x80;
    uint256 constant L_START_LOC =                              0x200 + 0x340 + 0x300 + 0x1a0 + 0xa0;
    uint256 constant L_END_LOC =                                0x200 + 0x340 + 0x300 + 0x1a0 + 0xc0;
    uint256 constant R_ZERO_EVAL_LOC =                          0x200 + 0x340 + 0x300 + 0x1a0 + 0xe0;
    uint256 constant ACCUMULATOR_X_LOC =                        0x200 + 0x340 + 0x300 + 0x1a0 + 0x100;
    uint256 constant ACCUMULATOR_Y_LOC =                        0x200 + 0x340 + 0x300 + 0x1a0 + 0x120;
    uint256 constant ACCUMULATOR2_X_LOC =                       0x200 + 0x340 + 0x300 + 0x1a0 + 0x140;
    uint256 constant ACCUMULATOR2_Y_LOC =                       0x200 + 0x340 + 0x300 + 0x1a0 + 0x160;
    uint256 constant PAIRING_LHS_X_LOC =                        0x200 + 0x340 + 0x300 + 0x1a0 + 0x180;
    uint256 constant PAIRING_LHS_Y_LOC =                        0x200 + 0x340 + 0x300 + 0x1a0 + 0x1a0;
    uint256 constant PAIRING_RHS_X_LOC =                        0x200 + 0x340 + 0x300 + 0x1a0 + 0x1c0;
    uint256 constant PAIRING_RHS_Y_LOC =                        0x200 + 0x340 + 0x300 + 0x1a0 + 0x1e0;
    // 21

    // ### SUCCESS FLAG MEMORY LOCATIONS
    uint256 constant GRAND_PRODUCT_SUCCESS_FLAG =               0x200 + 0x340 + 0x300 + 0x1a0 + 0x200 + 0x00;
    uint256 constant ARITHMETIC_TERM_SUCCESS_FLAG =             0x200 + 0x340 + 0x300 + 0x1a0 + 0x200 + 0x20;
    uint256 constant BATCH_OPENING_SUCCESS_FLAG =               0x200 + 0x340 + 0x300 + 0x1a0 + 0x200 + 0x40;
    uint256 constant OPENING_COMMITMENT_SUCCESS_FLAG =          0x200 + 0x340 + 0x300 + 0x1a0 + 0x200 + 0x60;
    uint256 constant PAIRING_PREAMBLE_SUCCESS_FLAG =            0x200 + 0x340 + 0x300 + 0x1a0 + 0x200 + 0x80;
    uint256 constant PAIRING_SUCCESS_FLAG =                     0x200 + 0x340 + 0x300 + 0x1a0 + 0x200 + 0xa0;
    uint256 constant RESULT_FLAG =                              0x200 + 0x340 + 0x300 + 0x1a0 + 0x200 + 0xc0;
    // 7

    // misc stuff
    uint256 constant OMEGA_INVERSE_LOC = 0x200 + 0x340 + 0x300 + 0x1a0 + 0x200 + 0xe0;
    uint256 constant C_ALPHA_SQR_LOC = 0x200 + 0x340 + 0x300 + 0x1a0 + 0x200 + 0xe0 + 0x20;
    // 3

    // ### RECURSION VARIABLE MEMORY LOCATIONS
    uint256 constant RECURSIVE_P1_X_LOC = 0x200 + 0x340 + 0x300 + 0x1a0 + 0x200 + 0xe0 + 0x40;
    uint256 constant RECURSIVE_P1_Y_LOC = 0x200 + 0x340 + 0x300 + 0x1a0 + 0x200 + 0xe0 + 0x60;
    uint256 constant RECURSIVE_P2_X_LOC = 0x200 + 0x340 + 0x300 + 0x1a0 + 0x200 + 0xe0 + 0x80;
    uint256 constant RECURSIVE_P2_Y_LOC = 0x200 + 0x340 + 0x300 + 0x1a0 + 0x200 + 0xe0 + 0xa0;

    uint256 constant PUBLIC_INPUTS_HASH_LOCATION = 0x200 + 0x340 + 0x300 + 0x1a0 + 0x200 + 0xe0 + 0xc0;

    // location of lookup table values when computing a modular inverse via the `invert` method
    uint256 constant II_POS = 0x00;
    uint256 constant IOI_POS = 0x20;
    uint256 constant III_POS = 0x40;
    uint256 constant IOOI_POS = 0x60;
    uint256 constant IIOI_POS = 0x80;
    uint256 constant IIII_POS = 0xa0;
    uint256 constant IOOOI_POS = 0xc0;
    uint256 constant IOOII_POS = 0xe0;
    uint256 constant IIOOI_POS = 0x100;
    uint256 constant IIIOI_POS = 0x120;
    uint256 constant IIOII_POS = 0x140;
    uint256 constant IIIII_POS = 0x160;


    /**
     * @dev Verify a Plonk proof
     * @param - array of serialized proof data
     * @param - number of transactions in the rollup
     */
    function verify(bytes calldata, uint256 rollup_size, uint256 public_inputs_hash) external override returns (bool) {
        // validate the correctness of the public inputs hash
        {
            bool hash_matches_input;
            assembly {
                hash_matches_input := eq(calldataload(add(calldataload(0x04), 0x24)), public_inputs_hash)
            }
            require(hash_matches_input, 'Rollup Processor: PUBLIC_INPUTS_HASH_VERIFICATION_FAILED');
        }

        StandardTypes.VerificationKey memory vk = RootVerifierVk.get_verification_key();

        assembly {
            /**
             * LOAD VKEY
             * TODO REPLACE THIS WITH A CONTRACT CALL
             */
            {
                mstore(N_LOC, mload(vk))
                mstore(NUM_INPUTS_LOC, mload(add(vk, 0x20)))
                mstore(OMEGA_LOC,           mload(add(vk, 0x40)))
                mstore(DOMAIN_INVERSE_LOC,  mload(add(vk, 0x60)))
                mstore(OMEGA_INVERSE_LOC,   mload(add(vk, 0x80)))
                mstore(Q1_X_LOC,            mload(mload(add(vk, 0xa0))))
                mstore(Q1_Y_LOC,            mload(add(mload(add(vk, 0xa0)), 0x20)))
                mstore(Q2_X_LOC,            mload(mload(add(vk, 0xc0))))
                mstore(Q2_Y_LOC,            mload(add(mload(add(vk, 0xc0)), 0x20)))
                mstore(Q3_X_LOC,            mload(mload(add(vk, 0xe0))))
                mstore(Q3_Y_LOC,            mload(add(mload(add(vk, 0xe0)), 0x20)))
                mstore(QM_X_LOC,            mload(mload(add(vk, 0x100))))
                mstore(QM_Y_LOC,            mload(add(mload(add(vk, 0x100)), 0x20)))
                mstore(QC_X_LOC,            mload(mload(add(vk, 0x120))))
                mstore(QC_Y_LOC,            mload(add(mload(add(vk, 0x120)), 0x20)))
                mstore(SIGMA1_X_LOC,        mload(mload(add(vk, 0x140))))
                mstore(SIGMA1_Y_LOC,        mload(add(mload(add(vk, 0x140)), 0x20)))
                mstore(SIGMA2_X_LOC,        mload(mload(add(vk, 0x160))))
                mstore(SIGMA2_Y_LOC,        mload(add(mload(add(vk, 0x160)), 0x20)))
                mstore(SIGMA3_X_LOC,        mload(mload(add(vk, 0x180))))
                mstore(SIGMA3_Y_LOC,        mload(add(mload(add(vk, 0x180)), 0x20)))
                mstore(CONTAINS_RECURSIVE_PROOF_LOC, mload(add(vk, 0x1a0)))
                mstore(RECURSIVE_PROOF_PUBLIC_INPUT_INDICES_LOC, mload(add(vk, 0x1c0)))
                mstore(G2X_X0_LOC, 0x260e01b251f6f1c7e7ff4e580791dee8ea51d87a358e038b4efe30fac09383c1)
                mstore(G2X_X1_LOC, 0x0118c4d5b837bcc2bc89b5b398b5974e9f5944073b32078b7e231fec938883b0)
                mstore(G2X_Y0_LOC, 0x04fc6369f7110fe3d25156c1bb9a72859cf2a04641f99ba4ee413c80da6a5fe4)
                mstore(G2X_Y1_LOC, 0x22febda3c0c0632a56475b4214e5615e11e6dd3f96e6cea2854a87d4dacc5e55)
            }

            let q := 21888242871839275222246405745257275088696311157297823662689037894645226208583 // EC group order
            let p := 21888242871839275222246405745257275088548364400416034343698204186575808495617 // Prime field order


            /**
             * LOAD PROOF FROM CALLDATA
             */
            {
                let data_ptr := add(calldataload(0x04), 0x24)
                if mload(CONTAINS_RECURSIVE_PROOF_LOC)
                {
                    let index_counter := add(mul(mload(RECURSIVE_PROOF_PUBLIC_INPUT_INDICES_LOC), 32), data_ptr)

                    let x0 := calldataload(index_counter)
                    x0 := add(x0, shl(68, calldataload(add(index_counter, 0x20))))
                    x0 := add(x0, shl(136, calldataload(add(index_counter, 0x40))))
                    x0 := add(x0, shl(204, calldataload(add(index_counter, 0x60))))
                    let y0 := calldataload(add(index_counter, 0x80))
                    y0 := add(y0, shl(68, calldataload(add(index_counter, 0xa0))))
                    y0 := add(y0, shl(136, calldataload(add(index_counter, 0xc0))))
                    y0 := add(y0, shl(204, calldataload(add(index_counter, 0xe0))))
                    let x1 := calldataload(add(index_counter, 0x100))
                    x1 := add(x1, shl(68, calldataload(add(index_counter, 0x120))))
                    x1 := add(x1, shl(136, calldataload(add(index_counter, 0x140))))
                    x1 := add(x1, shl(204, calldataload(add(index_counter, 0x160))))
                    let y1 := calldataload(add(index_counter, 0x180))
                    y1 := add(y1, shl(68, calldataload(add(index_counter, 0x1a0))))
                    y1 := add(y1, shl(136, calldataload(add(index_counter, 0x1c0))))
                    y1 := add(y1, shl(204, calldataload(add(index_counter, 0x1e0))))
                    mstore(RECURSIVE_P1_X_LOC, x0)
                    mstore(RECURSIVE_P1_Y_LOC, y0)
                    mstore(RECURSIVE_P2_X_LOC, x1)
                    mstore(RECURSIVE_P2_Y_LOC, y1)
                }

            let public_input_byte_length := mul(mload(NUM_INPUTS_LOC), 32)
            data_ptr := add(data_ptr, public_input_byte_length)


            mstore(W1_X_LOC, mod(calldataload(add(data_ptr, 0x20)), q))
            mstore(W1_Y_LOC, mod(calldataload(data_ptr), q))
            mstore(W2_X_LOC, mod(calldataload(add(data_ptr, 0x60)), q))
            mstore(W2_Y_LOC, mod(calldataload(add(data_ptr, 0x40)), q))
            mstore(W3_X_LOC, mod(calldataload(add(data_ptr, 0xa0)), q))
            mstore(W3_Y_LOC, mod(calldataload(add(data_ptr, 0x80)), q))
            mstore(Z_X_LOC, mod(calldataload(add(data_ptr, 0xe0)), q))
            mstore(Z_Y_LOC, mod(calldataload(add(data_ptr, 0xc0)), q))
            mstore(T1_X_LOC, mod(calldataload(add(data_ptr, 0x120)), q))
            mstore(T1_Y_LOC, mod(calldataload(add(data_ptr, 0x100)), q))
            mstore(T2_X_LOC, mod(calldataload(add(data_ptr, 0x160)), q))
            mstore(T2_Y_LOC, mod(calldataload(add(data_ptr, 0x140)), q))
            mstore(T3_X_LOC, mod(calldataload(add(data_ptr, 0x1a0)), q))
            mstore(T3_Y_LOC, mod(calldataload(add(data_ptr, 0x180)), q))
            mstore(W1_EVAL_LOC, mod(calldataload(add(data_ptr, 0x1c0)), p))
            mstore(W2_EVAL_LOC, mod(calldataload(add(data_ptr, 0x1e0)), p))
            mstore(W3_EVAL_LOC, mod(calldataload(add(data_ptr, 0x200)), p))
            mstore(SIGMA1_EVAL_LOC, mod(calldataload(add(data_ptr, 0x220)), p))
            mstore(SIGMA2_EVAL_LOC, mod(calldataload(add(data_ptr, 0x240)), p))
            mstore(Z_OMEGA_EVAL_LOC, mod(calldataload(add(data_ptr, 0x260)), p))
            mstore(PI_Z_X_LOC, mod(calldataload(add(data_ptr, 0x2a0)), q))
            mstore(PI_Z_Y_LOC, mod(calldataload(add(data_ptr, 0x280)), q))
            mstore(PI_Z_OMEGA_X_LOC, mod(calldataload(add(data_ptr, 0x2e0)), q))
            mstore(PI_Z_OMEGA_Y_LOC, mod(calldataload(add(data_ptr, 0x2c0)), q))
            }

            {
            /**
             * Generate initial challenge
             **/

            mstore(0x00, shl(224, mload(N_LOC)))
            mstore(0x04, shl(224, mload(NUM_INPUTS_LOC)))
            let challenge := keccak256(0x00, 0x08)

            /**
             * Generate beta, gamma challenges
             */
            mstore(PUBLIC_INPUTS_HASH_LOCATION, challenge)
            let inputs_start := add(calldataload(0x04), 0x24)
            let num_calldata_bytes := add(0xc0, mul(mload(NUM_INPUTS_LOC), 0x20))
            calldatacopy(add(PUBLIC_INPUTS_HASH_LOCATION, 0x20), inputs_start, num_calldata_bytes)

            challenge := keccak256(PUBLIC_INPUTS_HASH_LOCATION, add(num_calldata_bytes, 0x20))

            mstore(C_BETA_LOC, mod(challenge, p))

            mstore(0x00, challenge)
            mstore8(0x20, 0x01)
            challenge := keccak256(0x00, 0x21)
            mstore(C_GAMMA_LOC, mod(challenge, p))

            /**
             * Generate alpha challenge
             */
            mstore(0x00, challenge)
            mstore(0x20, mload(Z_Y_LOC))
            mstore(0x40, mload(Z_X_LOC))
            challenge := keccak256(0x00, 0x60)
            mstore(C_ALPHA_LOC, mod(challenge, p))
            /**
             * Generate zeta challenge
             */
            mstore(0x00, challenge)
            mstore(0x20, mload(T1_Y_LOC))
            mstore(0x40, mload(T1_X_LOC))
            mstore(0x60, mload(T2_Y_LOC))
            mstore(0x80, mload(T2_X_LOC))
            mstore(0xa0, mload(T3_Y_LOC))
            mstore(0xc0, mload(T3_X_LOC))
            challenge := keccak256(0x00, 0xe0)

            mstore(C_ZETA_LOC, mod(challenge, p))
            mstore(C_CURRENT_LOC, challenge)
            }

            /**
             * EVALUATE FIELD OPERATIONS
             */

            /**
             * COMPUTE PUBLIC INPUT DELTA
             */
            {
                let gamma := mload(C_GAMMA_LOC)
                let work_root := mload(OMEGA_LOC)
                let endpoint := sub(mul(mload(NUM_INPUTS_LOC), 0x20), 0x20)
                let public_inputs
                let root_1 := mload(C_BETA_LOC)
                let root_2 := root_1
                let numerator_value := 1
                let denominator_value := 1

                let p_clone := p // move p to the front of the stack
                let valid := true

                root_1 := mulmod(root_1, 0x05, p_clone) // k1.beta
                root_2 := mulmod(root_2, 0x07, p_clone) // 0x05 + 0x07 = 0x0c = external coset generator

                public_inputs := add(calldataload(0x04), 0x24)
                endpoint := add(endpoint, public_inputs)

                for {} lt(public_inputs, endpoint) {}
                {
                    let input0 := calldataload(public_inputs)
                    let N0 := add(root_1, add(input0, gamma))
                    let D0 := add(root_2, N0) // 4x overloaded

                    root_1 := mulmod(root_1, work_root, p_clone)
                    root_2 := mulmod(root_2, work_root, p_clone)

                    let input1 := calldataload(add(public_inputs, 0x20))
                    let N1 := add(root_1, add(input1, gamma))

                    denominator_value := mulmod(mulmod(D0, denominator_value, p_clone), add(N1, root_2), p_clone)
                    numerator_value := mulmod(mulmod(N1, N0, p_clone), numerator_value, p_clone)

                    root_1 := mulmod(root_1, work_root, p_clone)
                    root_2 := mulmod(root_2, work_root, p_clone)

                    valid := and(valid, and(lt(input0, p_clone), lt(input1, p_clone)))
                    public_inputs := add(public_inputs, 0x40)
                }

                endpoint := add(endpoint, 0x20)
                for {} lt(public_inputs, endpoint) { public_inputs := add(public_inputs, 0x20) }
                {
                    let input0 := calldataload(public_inputs)
                    valid := and(valid, lt(input0, p_clone))
                    let T0 := addmod(input0, gamma, p_clone)
                    numerator_value := mulmod(
                        numerator_value,
                        add(root_1, T0), // 0x05 = coset_generator0
                        p
                    )
                    denominator_value := mulmod(
                        denominator_value,
                        add(add(root_1, root_2), T0), // 0x0c = coset_generator7
                        p
                    )
                    root_1 := mulmod(root_1, work_root, p_clone)
                    root_2 := mulmod(root_2, work_root, p_clone)
                }

                mstore(DELTA_NUMERATOR_LOC, numerator_value)
                mstore(DELTA_DENOMINATOR_LOC, denominator_value)
            }

            /**
             * Compute lagrange poly and vanishing poly fractions
             */
            {
                let zeta := mload(C_ZETA_LOC)

                // compute zeta^n, where n is a power of 2
                let vanishing_numerator := zeta
                {
                    // pow_small
                    let exponent := mload(N_LOC)
                    let count := 1
                    for {} lt(count, exponent) { count := add(count, count) }
                    {
                        vanishing_numerator := mulmod(vanishing_numerator, vanishing_numerator, p)
                    }
                }
                mstore(ZETA_POW_N_LOC, vanishing_numerator)
                vanishing_numerator := addmod(vanishing_numerator, sub(p, 1), p)

                let accumulating_root := mload(OMEGA_INVERSE_LOC)
                let work_root := sub(p, accumulating_root)
                let domain_inverse := mload(DOMAIN_INVERSE_LOC)

                let vanishing_denominator := addmod(zeta, work_root, p)
                work_root := mulmod(work_root, accumulating_root, p)
                vanishing_denominator := mulmod(vanishing_denominator, addmod(zeta, work_root, p), p)
                work_root := mulmod(work_root, accumulating_root, p)
                vanishing_denominator := mulmod(vanishing_denominator, addmod(zeta, work_root, p), p)
                vanishing_denominator := mulmod(vanishing_denominator, addmod(zeta, mulmod(work_root, accumulating_root, p), p), p)

                work_root := mload(OMEGA_LOC)

                let lagrange_numerator := mulmod(vanishing_numerator, domain_inverse, p)
                let l_start_denominator := addmod(zeta, sub(p, 1), p)

                // l_end_denominator term contains a term \omega^5 to cut out 5 roots of unity from vanishing poly
                accumulating_root := mulmod(work_root, work_root, p)

                let l_end_denominator := addmod(
                    mulmod(
                        mulmod(
                            mulmod(accumulating_root, accumulating_root, p),
                            work_root, p
                        ),
                        zeta, p
                    ),
                    sub(p, 1), p
                )

            /**
             * Compute inversions using Montgomery's batch inversion trick
             */
                let accumulator := mload(DELTA_DENOMINATOR_LOC)
                let t0 := accumulator
                accumulator := mulmod(accumulator, vanishing_denominator, p)
                let t1 := accumulator
                accumulator := mulmod(accumulator, l_start_denominator, p)
                let t2 := accumulator
                {
                    mstore(0, 0x20)
                    mstore(0x20, 0x20)
                    mstore(0x40, 0x20)
                    mstore(0x60, mulmod(accumulator, l_end_denominator, p))
                    mstore(0x80, sub(p, 2))
                    mstore(0xa0, p)
                    if iszero(staticcall(gas(), 0x05, 0x00, 0xc0, 0x00, 0x20))
                    {
                        revert(0x00, 0x00)
                    }
                    accumulator := mload(0x00)
                }

                t2 := mulmod(accumulator, t2, p)
                accumulator := mulmod(accumulator, l_end_denominator, p)

                t1 := mulmod(accumulator, t1, p)
                accumulator := mulmod(accumulator, l_start_denominator, p)

                t0 := mulmod(accumulator, t0, p)
                accumulator := mulmod(accumulator, vanishing_denominator, p)

                accumulator := mulmod(mulmod(accumulator, accumulator, p), mload(DELTA_DENOMINATOR_LOC), p)

                mstore(PUBLIC_INPUT_DELTA_LOC, mulmod(mload(DELTA_NUMERATOR_LOC), accumulator, p))
                mstore(ZERO_POLY_LOC, mulmod(vanishing_numerator, t0, p))
                mstore(L_START_LOC, mulmod(lagrange_numerator, t1, p))
                mstore(L_END_LOC, mulmod(lagrange_numerator, t2, p))
            }

            /**
             * COMPUTE CONSTANT TERM (r_0) OF LINEARISATION POLYNOMIAL
             */
            {
                let alpha := mload(C_ALPHA_LOC)
                let beta := mload(C_BETA_LOC)
                let gamma := mload(C_GAMMA_LOC)
                let r_0 := sub(p,
                    mulmod(
                        mulmod(
                            mulmod(
                                add(add(mload(W1_EVAL_LOC), gamma), mulmod(beta, mload(SIGMA1_EVAL_LOC), p)),
                                add(add(mload(W2_EVAL_LOC), gamma), mulmod(beta, mload(SIGMA2_EVAL_LOC), p)),
                                p
                            ),
                            add(mload(W3_EVAL_LOC), gamma),
                            p
                        ),
                        mload(Z_OMEGA_EVAL_LOC),
                        p
                    )
                )
                // r_0 = -(ā + βs̄_σ1 + γ)( b̄ + βs̄_σ2 + γ)(c̄ + γ)z̄_ω
                let alpha_sqr := mulmod(alpha, alpha, p)
                mstore(C_ALPHA_SQR_LOC, alpha_sqr)
                mstore(C_ARITHMETIC_ALPHA_LOC, mulmod(alpha_sqr, alpha_sqr, p))

                mstore(R_ZERO_EVAL_LOC,
                            mulmod(
                                addmod(
                                    addmod(r_0, sub(p, mulmod(mload(L_START_LOC), alpha_sqr, p)), p),
                                    mulmod(
                                        mulmod(mload(L_END_LOC), alpha, p),
                                        addmod(mload(Z_OMEGA_EVAL_LOC), sub(p, mload(PUBLIC_INPUT_DELTA_LOC)), p), p
                                    ), p
                                ),
                                alpha, p
                            )
                        )
            }


            /**
             * GENERATE NU AND SEPARATOR CHALLENGES
             */
            {
                let current_challenge := mload(C_CURRENT_LOC)
                // get a calldata pointer that points to the start of the data we want to copy
                let calldata_ptr := add(calldataload(0x04), 0x24)
                // skip over the public inputs
                calldata_ptr := add(calldata_ptr, mul(mload(NUM_INPUTS_LOC), 0x20))
                // There are SEVEN G1 group elements added into the transcript in the `beta` round, that we need to skip over
                // W1, W2, W3 (W4), Z, T1, T2, T3, (T4)
                calldata_ptr := add(calldata_ptr, 0x1c0) // 7 * 0x40 = 0x1c0

                mstore(0x00, current_challenge)
                calldatacopy(0x20, calldata_ptr, 0xc0) // 6 * 0x20 = 0xc0
                let challenge := keccak256(0x00, 0xe0) // hash length = 0xe0 (0x20 + num field elements), we include the previous challenge in the hash

                mstore(C_V0_LOC, mod(challenge, p))

                mstore(0x00, challenge)
                mstore8(0x20, 0x01)
                mstore(C_V1_LOC, mod(keccak256(0x00, 0x21), p))

                mstore8(0x20, 0x02)
                mstore(C_V2_LOC, mod(keccak256(0x00, 0x21), p))

                mstore8(0x20, 0x03)
                mstore(C_V3_LOC, mod(keccak256(0x00, 0x21), p))

                mstore8(0x20, 0x04)
                mstore(C_V4_LOC, mod(keccak256(0x00, 0x21), p))

                mstore8(0x20, 0x05)
                challenge := keccak256(0x00, 0x21)
                mstore(C_V5_LOC, mod(challenge, p))

                // separator
                mstore(0x00, challenge)
                mstore(0x20, mload(PI_Z_Y_LOC))
                mstore(0x40, mload(PI_Z_X_LOC))
                mstore(0x60, mload(PI_Z_OMEGA_Y_LOC))
                mstore(0x80, mload(PI_Z_OMEGA_X_LOC))

                mstore(C_U_LOC, mod(keccak256(0x00, 0xa0), p))
            }

            // mstore(C_ALPHA_BASE_LOC, mload(C_ALPHA_LOC))

            /**
             * COMPUTE LINEARISED OPENING TERMS
             */
            {
                // /**
                //  * COMPUTE GRAND PRODUCT OPENING GROUP ELEMENT
                //  */
                let beta := mload(C_BETA_LOC)
                let zeta := mload(C_ZETA_LOC)
                let gamma := mload(C_GAMMA_LOC)
                let alpha := mload(C_ALPHA_LOC)
                let beta_zeta := mulmod(beta, zeta, p)

                let witness_term := addmod(mload(W1_EVAL_LOC), gamma, p)
                let partial_grand_product := addmod(beta_zeta, witness_term, p)
                let sigma_multiplier := addmod(mulmod(mload(SIGMA1_EVAL_LOC), beta, p), witness_term, p)
                witness_term := addmod(mload(W2_EVAL_LOC), gamma, p)
                sigma_multiplier := mulmod(sigma_multiplier, addmod(mulmod(mload(SIGMA2_EVAL_LOC), beta, p), witness_term, p), p)
                let k1_beta_zeta := mulmod(0x05, beta_zeta, p)
                //  partial_grand_product = mulmod( mulmod( partial_grand_product, w2 + k1.beta.zeta + gamma , p), k2.beta.zeta + gamma + w3, p)
                partial_grand_product := mulmod(
                    mulmod(
                        partial_grand_product,
                        addmod(k1_beta_zeta, witness_term, p), // w2 + k1.beta.zeta + gamma
                        p
                    ),
                    addmod(addmod(add(k1_beta_zeta, beta_zeta), gamma, p), mload(W3_EVAL_LOC), p), // k2.beta.zeta + gamma + w3 where k2 = k1+1
                    p
                )


                let linear_challenge := alpha // Owing to the simplified Plonk, nu =1, linear_challenge = nu * alpha = alpha


                mstore(0x00, mload(SIGMA3_X_LOC))
                mstore(0x20, mload(SIGMA3_Y_LOC))
                mstore(0x40, mulmod(
                    mulmod(
                        sub(p, mulmod(sigma_multiplier, mload(Z_OMEGA_EVAL_LOC), p)),
                        beta,
                        p
                    ),
                    linear_challenge,
                    p
                ))

                // Validate Z
                let success
                {
                    let x := mload(Z_X_LOC)
                    let y := mload(Z_Y_LOC)
                    let xx := mulmod(x, x, q)
                    success := eq(mulmod(y, y, q), addmod(mulmod(x, xx, q), 3, q))
                    mstore(0x60, x)
                    mstore(0x80, y)
                }
                mstore(0xa0, addmod(
                    mulmod(
                        addmod(partial_grand_product, mulmod(mload(L_START_LOC), mload(C_ALPHA_SQR_LOC), p), p),
                        linear_challenge,
                        p),
                    mload(C_U_LOC),
                    p
                ))
            // 0x00 = SIGMA3_X_LOC,
            // 0x20 = SIGMA3_Y_LOC,
            // 0x40 = −(ā + βs̄_σ1 + γ)( b̄ + βs̄_σ2 + γ)αβz̄_ω,
            // 0x60 = Z_X_LOC,
            // 0x80 = Z_Y_LOC,
            // 0xa0 = (ā + βz + γ)( b̄ + βk_1 z + γ)(c̄ + βk_2 z + γ)α + L_1(z)α^3 + u
                success := and(success, and(
                    staticcall(gas(), 6, ACCUMULATOR_X_LOC, 0x80, ACCUMULATOR_X_LOC, 0x40),
                    // Why ACCUMULATOR_X_LOC := ACCUMULATOR_X_LOC + ACCUMULATOR2_X_LOC? Inner parenthesis is executed before?
                    and(
                        staticcall(gas(), 7, 0x60, 0x60, ACCUMULATOR_X_LOC, 0x40),
                        // [ACCUMULATOR_X_LOC, ACCUMULATOR_X_LOC + 0x40) = ((ā + βz + γ)( b̄ + βk_1 z + γ)(c̄ + βk_2 z + γ)α + L_1(z)α^3 + u)*[z]_1
                        staticcall(gas(), 7, 0x00, 0x60, ACCUMULATOR2_X_LOC, 0x40)
                        // [ACCUMULATOR2_X_LOC, ACCUMULATOR2_X_LOC + 0x40) = −(ā + βs̄_σ1 + γ)( b̄ + βs̄_σ2 + γ)αβz̄_ω * [s_σ3]_1
                    )
                ))

                mstore(GRAND_PRODUCT_SUCCESS_FLAG, success)

            }

            /**
             * COMPUTE ARITHMETIC SELECTOR OPENING GROUP ELEMENT
             */
            {
                let linear_challenge := mload(C_ARITHMETIC_ALPHA_LOC) // Owing to simplified Plonk, nu = 1,  linear_challenge = C_ARITHMETIC_ALPHA (= alpha^4)

                let t1 := mulmod(mload(W1_EVAL_LOC), linear_challenge, p) // reuse this for QM scalar multiplier
                // Q1
                mstore(0x00, mload(Q1_X_LOC))
                mstore(0x20, mload(Q1_Y_LOC))
                mstore(0x40, t1)

                // add Q1 scalar mul into grand product scalar mul
                // Observe that ACCUMULATOR_X_LOC and ACCUMULATOR2_X_LOC are 0x40 bytes apart. Below, ACCUMULATOR2_X_LOC
                // captures new terms Q1, Q2, and so on and they get accumulated to ACCUMULATOR_X_LOC
                let success := and(
                    staticcall(gas(), 6, ACCUMULATOR_X_LOC, 0x80, ACCUMULATOR_X_LOC, 0x40),
                    // [ACCUMULATOR_X_LOC, ACCUMULATOR_X_LOC + 0x40) = ((ā + βz + γ)( b̄ + βk_1 z + γ)(c̄ + βk_2 z + γ)α + L_1(z)α^3 + u)*[z]_1 −(ā + βs̄_σ1 + γ)( b̄ + βs̄_σ2 + γ)αβz̄_ω * [s_σ3]_1
                    staticcall(gas(), 7, 0x00, 0x60, ACCUMULATOR2_X_LOC, 0x40)
                    // [ACCUMULATOR2_X_LOC, ACCUMULATOR2_X_LOC + 0x40) = ā * [q_L]_1
                )

                // Q2
                mstore(0x00, mload(Q2_X_LOC))
                mstore(0x20, mload(Q2_Y_LOC))
                mstore(0x40, mulmod(mload(W2_EVAL_LOC), linear_challenge, p))
                success := and(
                    success,
                    and(
                        staticcall(gas(), 6, ACCUMULATOR_X_LOC, 0x80, ACCUMULATOR_X_LOC, 0x40),
                        staticcall(gas(), 7, 0x00, 0x60, ACCUMULATOR2_X_LOC, 0x40)
                    )
                )

                // Q3
                mstore(0x00, mload(Q3_X_LOC))
                mstore(0x20, mload(Q3_Y_LOC))
                mstore(0x40, mulmod(mload(W3_EVAL_LOC), linear_challenge, p))
                success := and(
                    success,
                    and(
                        staticcall(gas(), 6, ACCUMULATOR_X_LOC, 0x80, ACCUMULATOR_X_LOC, 0x40),
                        staticcall(gas(), 7, 0x00, 0x60, ACCUMULATOR2_X_LOC, 0x40)
                    )
                )

                // QM
                mstore(0x00, mload(QM_X_LOC))
                mstore(0x20, mload(QM_Y_LOC))
                mstore(0x40, mulmod(t1, mload(W2_EVAL_LOC), p))
                success := and(
                    success,
                    and(
                        staticcall(gas(), 6, ACCUMULATOR_X_LOC, 0x80, ACCUMULATOR_X_LOC, 0x40),
                        staticcall(gas(), 7, 0x00, 0x60, ACCUMULATOR2_X_LOC, 0x40)
                    )
                )

                // QC
                mstore(0x00, mload(QC_X_LOC))
                mstore(0x20, mload(QC_Y_LOC))
                mstore(0x40, linear_challenge)
                success := and(
                    success,
                    and(
                        staticcall(gas(), 6, ACCUMULATOR_X_LOC, 0x80, ACCUMULATOR_X_LOC, 0x40),
                        staticcall(gas(), 7, 0x00, 0x60, ACCUMULATOR2_X_LOC, 0x40)
                    )
                )

                mstore(ARITHMETIC_TERM_SUCCESS_FLAG, success)
            }

             /**
             * COMPUTE BATCH OPENING COMMITMENT
             */
            {
                // previous scalar_multiplier = 1, z^n, z^2n
                // scalar_multiplier owing to the simplified Plonk = 1 * -Z_H(z), z^n * -Z_H(z), z^2n * -Z_H(z)
                // VALIDATE T1
                let success
                {
                    let x := mload(T1_X_LOC)
                    let y := mload(T1_Y_LOC)
                    let xx := mulmod(x, x, q)
                    success := eq(mulmod(y, y, q), addmod(mulmod(x, xx, q), 3, q))
                    mstore(0x00, x)
                    mstore(0x20, y)
                    mstore(0x40, sub(p, mload(ZERO_POLY_LOC)))
                    // mstore(ACCUMULATOR2_X_LOC, x)
                    // mstore(ACCUMULATOR2_Y_LOC, y)
                }
                success := and(success,
                and(
                    staticcall(gas(), 6, ACCUMULATOR_X_LOC, 0x80, ACCUMULATOR_X_LOC, 0x40),
                    staticcall(gas(), 7, 0x00, 0x60, ACCUMULATOR2_X_LOC, 0x40)
                ))

                // VALIDATE T2
                let scalar_multiplier := mload(ZETA_POW_N_LOC)
                {
                    let x := mload(T2_X_LOC)
                    let y := mload(T2_Y_LOC)
                    let xx := mulmod(x, x, q)
                    success := and(success, eq(mulmod(y, y, q), addmod(mulmod(x, xx, q), 3, q)))
                    mstore(0x00, x)
                    mstore(0x20, y)
                }
                mstore(0x40, mulmod(scalar_multiplier, sub(p, mload(ZERO_POLY_LOC)), p))

                success := and(
                    staticcall(gas(), 6, ACCUMULATOR_X_LOC, 0x80, ACCUMULATOR_X_LOC, 0x40),
                    and(
                        success,
                        staticcall(gas(), 7, 0x00, 0x60, ACCUMULATOR2_X_LOC, 0x40)
                    )
                )

                // VALIDATE T3
                {
                    let x := mload(T3_X_LOC)
                    let y := mload(T3_Y_LOC)
                    let xx := mulmod(x, x, q)
                    success := and(success, eq(mulmod(y, y, q), addmod(mulmod(x, xx, q), 3, q)))
                    mstore(0x00, x)
                    mstore(0x20, y)
                }
                mstore(0x40, mulmod(scalar_multiplier, mulmod(scalar_multiplier, sub(p, mload(ZERO_POLY_LOC)), p), p))
                success := and(
                    staticcall(gas(), 6, ACCUMULATOR_X_LOC, 0x80, ACCUMULATOR_X_LOC, 0x40),
                    and(
                        success,
                        staticcall(gas(), 7, 0x00, 0x60, ACCUMULATOR2_X_LOC, 0x40)
                    )
                )

                // VALIDATE W1
                {
                    let x := mload(W1_X_LOC)
                    let y := mload(W1_Y_LOC)
                    let xx := mulmod(x, x, q)
                    success := and(success, eq(mulmod(y, y, q), addmod(mulmod(x, xx, q), 3, q)))
                    mstore(0x00, x)
                    mstore(0x20, y)
                }
                mstore(0x40, mload(C_V0_LOC))

                success := and(
                    staticcall(gas(), 6, ACCUMULATOR_X_LOC, 0x80, ACCUMULATOR_X_LOC, 0x40),
                    and(
                        success,
                        staticcall(gas(), 7, 0x00, 0x60, ACCUMULATOR2_X_LOC, 0x40)
                    )
                )

                // VALIDATE W2
                {
                    let x := mload(W2_X_LOC)
                    let y := mload(W2_Y_LOC)
                    let xx := mulmod(x, x, q)
                    success := and(success, eq(mulmod(y, y, q), addmod(mulmod(x, xx, q), 3, q)))
                    mstore(0x00, x)
                    mstore(0x20, y)
                }
                mstore(0x40, mload(C_V1_LOC))
                success := and(
                    staticcall(gas(), 6, ACCUMULATOR_X_LOC, 0x80, ACCUMULATOR_X_LOC, 0x40),
                    and(
                        success,
                        staticcall(gas(), 7, 0x00, 0x60, ACCUMULATOR2_X_LOC, 0x40)
                    )
                )

                // VALIDATE W3
                {
                    let x := mload(W3_X_LOC)
                    let y := mload(W3_Y_LOC)
                    let xx := mulmod(x, x, q)
                    success := and(success, eq(mulmod(y, y, q), addmod(mulmod(x, xx, q), 3, q)))
                    mstore(0x00, x)
                    mstore(0x20, y)
                }
                mstore(0x40, mload(C_V2_LOC))
                success := and(
                    staticcall(gas(), 6, ACCUMULATOR_X_LOC, 0x80, ACCUMULATOR_X_LOC, 0x40),
                    and(
                        success,
                        staticcall(gas(), 7, 0x00, 0x60, ACCUMULATOR2_X_LOC, 0x40)
                    )
                )

                mstore(0x00, mload(SIGMA1_X_LOC))
                mstore(0x20, mload(SIGMA1_Y_LOC))
                mstore(0x40, mload(C_V3_LOC))
                success := and(
                    staticcall(gas(), 6, ACCUMULATOR_X_LOC, 0x80, ACCUMULATOR_X_LOC, 0x40),
                    and(
                        success,
                        staticcall(gas(), 7, 0x00, 0x60, ACCUMULATOR2_X_LOC, 0x40)
                    )
                )

                mstore(0x00, mload(SIGMA2_X_LOC))
                mstore(0x20, mload(SIGMA2_Y_LOC))
                mstore(0x40, mload(C_V4_LOC))
                success := and(
                    staticcall(gas(), 6, ACCUMULATOR_X_LOC, 0x80, ACCUMULATOR_X_LOC, 0x40),
                    and(
                        success,
                        staticcall(gas(), 7, 0x00, 0x60, ACCUMULATOR2_X_LOC, 0x40)
                    )
                )

                mstore(BATCH_OPENING_SUCCESS_FLAG, success)
            }

            /**
             * COMPUTE BATCH EVALUATION SCALAR MULTIPLIER
             */
            {
                mstore(0x00, 0x01) // [1].x
                mstore(0x20, 0x02) // [1].y
                // Yul stack optimizer doing some work here...
                mstore(0x40, sub(p,
                    addmod(
                        mulmod(mload(C_U_LOC), mload(Z_OMEGA_EVAL_LOC), p),
                        addmod(
                            sub(p, mload(R_ZERO_EVAL_LOC)), // Change owing to the simplified Plonk
                                addmod(
                                    mulmod(mload(C_V4_LOC), mload(SIGMA2_EVAL_LOC), p),
                                    addmod(
                                        mulmod(mload(C_V3_LOC), mload(SIGMA1_EVAL_LOC), p),
                                        addmod(
                                            mulmod(mload(C_V2_LOC), mload(W3_EVAL_LOC), p),
                                            addmod(
                                                mulmod(mload(C_V1_LOC), mload(W2_EVAL_LOC), p),
                                                mulmod(mload(C_V0_LOC), mload(W1_EVAL_LOC), p),
                                                p
                                            ),
                                            p
                                        ),
                                        p
                                    ),
                                    p
                                ),
                                p
                            ),
                            p
                        )
                    )
                )

                let success := and(
                    staticcall(gas(), 6, ACCUMULATOR_X_LOC, 0x80, ACCUMULATOR_X_LOC, 0x40),
                    staticcall(gas(), 7, 0x00, 0x60, ACCUMULATOR2_X_LOC, 0x40)
                )
                mstore(OPENING_COMMITMENT_SUCCESS_FLAG, success)
            }

             /**
             * PERFORM PAIRING PREAMBLE
             */
            {
                let u := mload(C_U_LOC)
                let zeta := mload(C_ZETA_LOC)
                let success
                // VALIDATE PI_Z
                {
                    let x := mload(PI_Z_X_LOC)
                    let y := mload(PI_Z_Y_LOC)
                    let xx := mulmod(x, x, q)
                    success := eq(mulmod(y, y, q), addmod(mulmod(x, xx, q), 3, q))
                    mstore(0x00, x)
                    mstore(0x20, y)
                }
                // compute zeta.[PI_Z] and add into accumulator
                mstore(0x40, zeta)
                success := and(success, and(
                    staticcall(gas(), 6, ACCUMULATOR_X_LOC, 0x80, ACCUMULATOR_X_LOC, 0x40),
                    staticcall(gas(), 7, 0x00, 0x60, ACCUMULATOR2_X_LOC, 0x40)
                ))

                // VALIDATE PI_Z_OMEGA
                {
                    let x := mload(PI_Z_OMEGA_X_LOC)
                    let y := mload(PI_Z_OMEGA_Y_LOC)
                    let xx := mulmod(x, x, q)
                    success := and(success, eq(mulmod(y, y, q), addmod(mulmod(x, xx, q), 3, q)))
                    mstore(0x00, x)
                    mstore(0x20, y)
                }
                // compute u.zeta.omega.[PI_Z_OMEGA] and add into accumulator
                mstore(0x40, mulmod(mulmod(u, zeta, p), mload(OMEGA_LOC), p))
                success := and(
                    staticcall(gas(), 6, ACCUMULATOR_X_LOC, 0x80, PAIRING_RHS_X_LOC, 0x40),
                    and(
                        success,
                        staticcall(gas(), 7, 0x00, 0x60, ACCUMULATOR2_X_LOC, 0x40)
                    )
                )

                mstore(0x00, mload(PI_Z_X_LOC))
                mstore(0x20, mload(PI_Z_Y_LOC))
                mstore(0x40, mload(PI_Z_OMEGA_X_LOC))
                mstore(0x60, mload(PI_Z_OMEGA_Y_LOC))
                mstore(0x80, u)
                success := and(
                    staticcall(gas(), 6, 0x00, 0x80, PAIRING_LHS_X_LOC, 0x40),
                    and(
                        success,
                        staticcall(gas(), 7, 0x40, 0x60, 0x40, 0x40)
                    )
                )
                // negate lhs y-coordinate
                mstore(PAIRING_LHS_Y_LOC, sub(q, mload(PAIRING_LHS_Y_LOC)))

                if mload(CONTAINS_RECURSIVE_PROOF_LOC)
                {
                    // VALIDATE RECURSIVE P1
                    {
                        let x := mload(RECURSIVE_P1_X_LOC)
                        let y := mload(RECURSIVE_P1_Y_LOC)
                        let xx := mulmod(x, x, q)
                        success := and(success, eq(mulmod(y, y, q), addmod(mulmod(x, xx, q), 3, q)))
                        mstore(0x00, x)
                        mstore(0x20, y)
                    }

                    // compute u.u.[recursive_p1] and write into 0x60
                    mstore(0x40, mulmod(u, u, p))
                    success := and(success, staticcall(gas(), 7, 0x00, 0x60, 0x60, 0x40))
                    // VALIDATE RECURSIVE P2
                    {
                        let x := mload(RECURSIVE_P2_X_LOC)
                        let y := mload(RECURSIVE_P2_Y_LOC)
                        let xx := mulmod(x, x, q)
                        success := and(success, eq(mulmod(y, y, q), addmod(mulmod(x, xx, q), 3, q)))
                        mstore(0x00, x)
                        mstore(0x20, y)
                    }
                    // compute u.u.[recursive_p2] and write into 0x00
                    // 0x40 still contains u*u
                    success := and(success, staticcall(gas(), 7, 0x00, 0x60, 0x00, 0x40))

                    // compute u.u.[recursiveP1] + rhs and write into rhs
                    mstore(0xa0, mload(PAIRING_RHS_X_LOC))
                    mstore(0xc0, mload(PAIRING_RHS_Y_LOC))
                    success := and(success, staticcall(gas(), 6, 0x60, 0x80, PAIRING_RHS_X_LOC, 0x40))

                    // compute u.u.[recursiveP2] + lhs and write into lhs
                    mstore(0x40, mload(PAIRING_LHS_X_LOC))
                    mstore(0x60, mload(PAIRING_LHS_Y_LOC))
                    success := and(success, staticcall(gas(), 6, 0x00, 0x80, PAIRING_LHS_X_LOC, 0x40))
                }

                if iszero(success)
                {
                    revert(0x00, 0x00)
                }
                mstore(PAIRING_PREAMBLE_SUCCESS_FLAG, success)
            }

            /**
             * PERFORM PAIRING
             */
            {
                // rhs paired with [1]_2
                // lhs paired with [x]_2

                mstore(0x00, mload(PAIRING_RHS_X_LOC))
                mstore(0x20, mload(PAIRING_RHS_Y_LOC))
                mstore(0x40, 0x198e9393920d483a7260bfb731fb5d25f1aa493335a9e71297e485b7aef312c2) // this is [1]_2
                mstore(0x60, 0x1800deef121f1e76426a00665e5c4479674322d4f75edadd46debd5cd992f6ed)
                mstore(0x80, 0x090689d0585ff075ec9e99ad690c3395bc4b313370b38ef355acdadcd122975b)
                mstore(0xa0, 0x12c85ea5db8c6deb4aab71808dcb408fe3d1e7690c43d37b4ce6cc0166fa7daa)

                mstore(0xc0, mload(PAIRING_LHS_X_LOC))
                mstore(0xe0, mload(PAIRING_LHS_Y_LOC))
                mstore(0x100, mload(G2X_X0_LOC))
                mstore(0x120, mload(G2X_X1_LOC))
                mstore(0x140, mload(G2X_Y0_LOC))
                mstore(0x160, mload(G2X_Y1_LOC))

                let success := staticcall(
                    gas(),
                    8,
                    0x00,
                    0x180,
                    0x00,
                    0x20
                )
                mstore(PAIRING_SUCCESS_FLAG, success)
                mstore(RESULT_FLAG, mload(0x00))
            }
            if and(
                and(
                    and(
                        and(
                            and(
                                and(
                                    mload(PAIRING_SUCCESS_FLAG),
                                    mload(RESULT_FLAG)
                                ),
                                mload(PAIRING_PREAMBLE_SUCCESS_FLAG)
                            ),
                            mload(OPENING_COMMITMENT_SUCCESS_FLAG)
                        ),
                        mload(BATCH_OPENING_SUCCESS_FLAG)
                    ),
                    mload(ARITHMETIC_TERM_SUCCESS_FLAG)
                ),
                mload(GRAND_PRODUCT_SUCCESS_FLAG)
            )
            {
                mstore(0x00, 0x01)
                return(0x00, 0x20) // Proof succeeded!
            }
        }
        require(false, 'Rollup Processor: PROOF_VERIFICATION_FAILED');
    }
}
