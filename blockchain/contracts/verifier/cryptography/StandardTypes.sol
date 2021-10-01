// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

/**
 * @title Bn254Crypto library used for the fr, g1 and g2 point types
 * @dev Used to manipulate fr, g1, g2 types, perform modular arithmetic on them and call
 * the precompiles add, scalar mul and pairing
 *
 * Notes on optimisations
 * 1) Perform addmod, mulmod etc. in assembly - removes the check that Solidity performs to confirm that
 * the supplied modulus is not 0. This is safe as the modulus's used (r_mod, q_mod) are hard coded
 * inside the contract and not supplied by the user
 */
library StandardTypes {
    uint256 constant PROGRAM_WIDTH = 3;
    uint256 constant NUM_NU_CHALLENGES = 6;

    uint256 constant coset_generator0 = 0x0000000000000000000000000000000000000000000000000000000000000005;
    uint256 constant coset_generator1 = 0x0000000000000000000000000000000000000000000000000000000000000006;
    uint256 constant coset_generator2 = 0x0000000000000000000000000000000000000000000000000000000000000007;

    // TODO: add external_coset_generator() method to compute this
    uint256 constant coset_generator7 = 0x000000000000000000000000000000000000000000000000000000000000000c;

    struct G1Point {
        uint256 x;
        uint256 y;
    }

    // G2 group element where x \in Fq2 = x0 * z + x1
    struct G2Point {
        uint256 x0;
        uint256 x1;
        uint256 y0;
        uint256 y1;
    }

    // N>B. Do not re-order these fields! They must appear in the same order as they
    // appear in the proof data
    struct Proof {
        G1Point W1;
        G1Point W2;
        G1Point W3;
        G1Point Z;
        G1Point T1;
        G1Point T2;
        G1Point T3;
        uint256 w1;
        uint256 w2;
        uint256 w3;
        uint256 sigma1;
        uint256 sigma2;
    //    uint256 linearization_polynomial;
        uint256 grand_product_at_z_omega;
        G1Point PI_Z;
        G1Point PI_Z_OMEGA;
        G1Point recursive_P1;
        G1Point recursive_P2;
        uint256 r_0;  // Changes owing to the simplified Plonk
    }

    struct ChallengeTranscript {
        uint256 alpha_base;
        uint256 alpha;
        uint256 zeta;
        uint256 beta;
        uint256 gamma;
        uint256 u;
        uint256 v0;
        uint256 v1;
        uint256 v2;
        uint256 v3;
        uint256 v4;
        uint256 v5;
        uint256 v6;
        // uint256 v7;
    }

    struct VerificationKey {
        uint256 circuit_size;
        uint256 num_inputs;
        uint256 work_root;
        uint256 domain_inverse;
        uint256 work_root_inverse;
        G1Point Q1;
        G1Point Q2;
        G1Point Q3;
        G1Point QM;
        G1Point QC;
        G1Point SIGMA1;
        G1Point SIGMA2;
        G1Point SIGMA3;
        bool contains_recursive_proof;
        uint256 recursive_proof_indices;
        G2Point g2_x;
        // zeta challenge raised to the power of the circuit size.
        // Not actually part of the verification key, but we put it here to prevent stack depth errors
        uint256 zeta_pow_n;
    }
}

/**

    ### MEMORY LAYOUT

    0x00 - 0x200 RESERVED FOR SCRATCH SPACE

    0x200 - 0x600 RESERVED FOR VERIFICATION KEY

    0x600 - 0x900 RESERVED FOR LOCAL VARIABLES

    ### VERIFICATION KEY ###
    ### ALL LOCALTIONS ARE RELATIVE TO THE START OF THIS BLOCK IN MEMORY (0x200)

    0x00          : n
    0x20          : num_inputs
    0x40          : omega
    0x60          : n^{-1}
    0x80          : omega^{-1}
    0xa0 - 0xe0   : Q1
    0xe0 - 0x120  : Q2
    0x120 - 0x160 : Q3
    0x160 - 0x1a0 : QM
    0x1a0 - 0x1e0 : QC
    0x1e0 - 0x220 : SIGMA1
    0x220 - 0x260 : SIGMA2
    0x260 - 0x2a0 : SIGMA3
    0x2a0 - 0x2c0 : contains_recursive_proof
    0x2c0 - 0x340 : G2_x ([x]_2)

    ### LOCAL VARIABLES ###
    ### ALL LOCALTIONS ARE RELATIVE TO THE START OF THIS BLOCK IN MEMORY (0x200)

    0x00  : zeta_pow_n
    0x20  : quotient_poly_eval
    0x40  : public_input_delta_numerator
    0x60  : public_input_delta_denominator
    0x80  : vanishing_numerator
    0xa0  : vanishing_denominator
    0xc0  : lagrange_numerator
    0xe0  : l_start_denominator
    0x100 : l_end_denominator
    0x120 : zero_poly_eval
    0x140 : public_input_delta
    0x160 : l_start
    0x180 : l_end
    0x200 : p
    0x220 : proof_calldata_ptr

    ### PROOF ###

    0x00  - 0x40  : W1
    0x40  - 0x80  : W2
    0x80  - 0xc0  : W3
    0xc0  - 0x100 : Z
    0x100 - 0x140 : T1
    0x140 - 0x180 : T2
    0x180 - 0x1c0 : T3
    0x1c0 - 0x200 : w1
    0x200 - 0x220 : w2
    0x220 - 0x240 : w3
    0x240 - 0x260 : sigma1
    0x260 - 0x280 : sigma2
    0x280 - 0x2a0 : r
    0x2a0 - 0x2c0 : z_omega
    0x2c0 - 0x300 : PI_Z
    0x300 - 0x340 : PI_Z_OMEGA
    0x340 - 0x380 : RECURSIVE_P1
    0x380 - 0x3c0 : RECURSIVE_P2
 */