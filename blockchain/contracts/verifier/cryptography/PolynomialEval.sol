// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd
pragma solidity >=0.6.0 <0.7.0;
pragma experimental ABIEncoderV2;

import {PairingsBn254} from './PairingsBn254.sol';
import {Types} from './Types.sol';

/**
 * @title Turbo Plonk polynomial evaluation
 * @dev Implementation of Turbo Plonk's polynomial evaluation algorithms
 *
 * Expected to be inherited by `TurboPlonk.sol`
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
library PolynomialEval {
    using PairingsBn254 for Types.G1Point;
    using PairingsBn254 for Types.G2Point;
    using PairingsBn254 for Types.Fr;

    /**
     * @dev Use batch inversion (so called Montgomery's trick). Circuit size is the domain
     * Allows multiple inversions to be performed in one inversion, at the expense of additional multiplications
     *
     * Returns a struct containing the inverted elements
     */
    function compute_batch_inversions(Types.PartialStateFractions memory partial_state_fractions)
        internal
        view
        returns (
            Types.Fr memory,
            Types.Fr memory,
            Types.Fr memory,
            Types.Fr memory
        )
    {
        uint256 denominatorsLength = 4;
        Types.Fr[4] memory denominators;

        // Extract all denominators from partial_state_fractions
        denominators[0] = partial_state_fractions.public_input_delta.denominator;
        denominators[1] = partial_state_fractions.zero_poly.numerator; // we actually want the inverse of the zero poly
        denominators[2] = partial_state_fractions.lagrange_1_fraction.denominator;
        denominators[3] = partial_state_fractions.lagrange_n_fraction.denominator;

        Types.Fr memory product_accumulator = PairingsBn254.new_fr(1);

        Types.Fr[4] memory temporaries;

        for (uint256 i = 0; i < denominatorsLength; i += 1) {
            temporaries[i] = product_accumulator;
            product_accumulator = PairingsBn254.mul_fr(product_accumulator, denominators[i]);
        }

        product_accumulator = product_accumulator.inverse();

        Types.Fr memory intermediate;
        for (uint256 i = denominatorsLength - 1; i < denominatorsLength; i -= 1) {
            intermediate = PairingsBn254.mul_fr(product_accumulator, temporaries[i]);
            product_accumulator = PairingsBn254.mul_fr(product_accumulator, denominators[i]);
            denominators[i] = intermediate;
        }

        Types.BatchInversions memory batch_inverted_elements = Types.BatchInversions({
            public_input_delta_denominator_inverse: denominators[0],
            zero_poly_inverse: denominators[1],
            lagrange_1_fraction_inverse: denominators[2],
            lagrange_n_fraction_inverse: denominators[3]
        });

        Types.Fr memory zero_polynomial_eval;
        Types.Fr memory public_input_delta;
        Types.Fr memory l_start;
        Types.Fr memory l_end;
        (zero_polynomial_eval, public_input_delta, l_start, l_end) = evaluate_fractions(
            partial_state_fractions,
            batch_inverted_elements
        );

        return (zero_polynomial_eval, public_input_delta, l_start, l_end);
    }

    function evaluate_fractions(
        Types.PartialStateFractions memory partial_state_fractions,
        Types.BatchInversions memory batch_inverted_elements
    )
        internal
        pure
        returns (
            Types.Fr memory,
            Types.Fr memory,
            Types.Fr memory,
            Types.Fr memory
        )
    {
        Types.Fr memory public_input_delta = PairingsBn254.mul_fr(
            batch_inverted_elements.public_input_delta_denominator_inverse,
            partial_state_fractions.public_input_delta.numerator
        );

        Types.Fr memory zero_poly_eval = PairingsBn254.mul_fr(
            batch_inverted_elements.zero_poly_inverse,
            partial_state_fractions.zero_poly.denominator
        );

        Types.Fr memory L1 = PairingsBn254.mul_fr(
            batch_inverted_elements.lagrange_1_fraction_inverse,
            partial_state_fractions.lagrange_1_fraction.numerator
        );

        Types.Fr memory Ln = PairingsBn254.mul_fr(
            batch_inverted_elements.lagrange_n_fraction_inverse,
            partial_state_fractions.lagrange_n_fraction.numerator
        );

        return (zero_poly_eval, public_input_delta, L1, Ln);
    }

    function compute_zero_polynomial(
        Types.Fr memory zeta,
        uint256 circuit_size,
        Types.Fr memory work_root_inverse
    ) internal pure returns (Types.Fraction memory) {
        Types.Fr memory firstTerm = zeta.pow_small(circuit_size, Types.r_mod);

        Types.Fr memory secondTerm = PairingsBn254.new_fr(1);

        Types.Fr memory denominator = PairingsBn254.new_fr(1);
        Types.Fr memory work_root = work_root_inverse.copy();
        Types.Fr memory T0 = PairingsBn254.new_fr(1);
        for (uint256 i = 0; i < 4; ++i)
        {
            // T0 = z - w^{n-i}
            T0 = PairingsBn254.sub_fr(zeta, work_root);
            // denominator = PairingsBn254.mul_fr(denominator, T0);
            denominator.mul_assign(T0);
            work_root.mul_assign(work_root_inverse);
        }

        Types.Fr memory numerator = PairingsBn254.sub_fr(firstTerm, secondTerm);

        return Types.Fraction({numerator: numerator, denominator: denominator});
    }

    function compute_public_input_delta(
        Types.ChallengeTranscript memory challenges,
        Types.VerificationKey memory vk
    ) internal pure returns (Types.Fraction memory) {
        uint256 gamma = challenges.gamma.value;
        uint256 work_root = vk.work_root.value;

        uint256 endpoint = (vk.num_inputs * 0x20) - 0x60;
        uint256 public_inputs;
        uint256 accumulating_root = challenges.beta.value;
        uint256 numerator_value = 1;
        uint256 denominator_value = 1;

        // we multiply length by 0x20 because our loop step size is 0x20 not 0x01
        // we subtract 0x60 because our loop is unrolled 4 times an we don't want to overshoot

        // perform this computation in assembly to improve efficiency. We are sensitive to the cost of this loop as
        // it scales with the number of public inputs
        uint256 p = PairingsBn254.r_mod;
        assembly {
            // let accumulating_root := beta
            public_inputs := add(calldataload(0x04), 0x24)

            // get public inputs from calldata. N.B. If Contract ABI Changes this code will need to be updated!
            endpoint := add(endpoint, public_inputs)
            // Do some loop unrolling to reduce number of conditional jump operations
            for {} lt(public_inputs, endpoint) {}
            {
                let N0 := add(mulmod(accumulating_root, 0x05, p), addmod(calldataload(public_inputs), gamma, p))
                let D0 := add(mulmod(accumulating_root, 0x07, p), N0)

                accumulating_root := mulmod(accumulating_root, work_root, p)

                let N1 := add(mulmod(accumulating_root, 0x05, p), addmod(calldataload(add(public_inputs, 0x20)), gamma, p))
                let D1 := add(mulmod(accumulating_root, 0x07, p), N1)

                accumulating_root := mulmod(accumulating_root, work_root, p)

                let N2 := add(mulmod(accumulating_root, 0x05, p), addmod(calldataload(add(public_inputs, 0x40)), gamma, p))
                let D2 := add(mulmod(accumulating_root, 0x07, p), N2)

                accumulating_root := mulmod(accumulating_root, work_root, p)

                let N3 := add(mulmod(accumulating_root, 0x05, p), addmod(calldataload(add(public_inputs, 0x60)), gamma, p))

                denominator_value := mulmod(mulmod(mulmod(mulmod(D2, D1, p), D0, p), denominator_value, p), add(N3, mulmod(accumulating_root, 0x07, p)), p)
                numerator_value := mulmod(mulmod(mulmod(mulmod(N3, N2, p), N1, p), N0, p), numerator_value, p)

                accumulating_root := mulmod(accumulating_root, work_root, p)

                public_inputs := add(public_inputs, 0x80)
            }

            endpoint := add(endpoint, 0x60)
            for {} lt(public_inputs, endpoint) { public_inputs := add(public_inputs, 0x20) }
            {
                let T0 := addmod(calldataload(public_inputs), gamma, p)
                numerator_value := mulmod(
                    numerator_value,
                    add(mulmod(accumulating_root, 0x05, p), T0), // 0x05 = coset_generator0
                    p
                )
                denominator_value := mulmod(
                    denominator_value,
                    add(mulmod(accumulating_root, 0x0c, p), T0), // 0x0c = coset_generator7
                    p
                )
                accumulating_root := mulmod(accumulating_root, work_root, p)
            }
        }
        
        return Types.Fraction({numerator: PairingsBn254.new_fr(numerator_value), denominator: PairingsBn254.new_fr(denominator_value)});
    }

    /**
     * @dev Computes the lagrange evaluations L1 and Ln.
     * @return Returns lagrange evals as an array, with L1 at index 0 and Ln at index 1
     */
    function compute_lagrange_evaluations(Types.VerificationKey memory vk, Types.Fr memory zeta)
        internal
        pure
        returns (Types.Fraction[] memory)
    {
        Types.Fr memory zeta_copy = zeta;
        Types.Fr memory vanishing_poly_numerator = PairingsBn254.sub_fr(
            zeta.pow_small(vk.circuit_size, Types.r_mod),
            PairingsBn254.new_fr(1)
        );

        Types.Fr memory domain_inverse = vk.domain_inverse;

        Types.Fr memory numerator = PairingsBn254.mul_fr(vanishing_poly_numerator, domain_inverse);

        Types.Fr memory denominator1 = PairingsBn254.sub_fr(zeta_copy, PairingsBn254.new_fr(1));

        Types.Fr memory w_pow_5 = PairingsBn254.mul_fr(vk.work_root, vk.work_root.pow_4()); 
        Types.Fr memory T0 = PairingsBn254.mul_fr(zeta_copy, w_pow_5);

        Types.Fr memory denominatorEnd = PairingsBn254.sub_fr(T0, PairingsBn254.new_fr(1));

        Types.Fraction memory L1 = Types.Fraction({numerator: numerator, denominator: denominator1});
        Types.Fraction memory Lend = Types.Fraction({numerator: numerator, denominator: denominatorEnd});

        Types.Fraction[] memory lagrange_evals = new Types.Fraction[](2);
        lagrange_evals[0] = L1;
        lagrange_evals[1] = Lend;

        return lagrange_evals;
    }

    function compute_arithmetic_gate_quotient_contribution(
        Types.ChallengeTranscript memory challenges,
        Types.Proof memory proof
    ) internal pure returns (Types.Fr memory) {

        uint256 q_arith = proof.q_arith_at_z.value;
        uint256 wire3 = proof.wire_values_at_z[2].value;
        uint256 wire4 = proof.wire_values_at_z[3].value;
        uint256 alpha_base = challenges.alpha_base.value;
        uint256 alpha = challenges.alpha.value;
        uint256 t1;
        uint256 p = PairingsBn254.r_mod;
        assembly {
            
            t1 := addmod(mulmod(q_arith, q_arith, p), sub(p, q_arith), p)

            let t2 := addmod(sub(p, mulmod(wire4, 0x04, p)), wire3, p)

            let t3 := mulmod(mulmod(t2, t2, p), 0x02, p)

            let t4 := mulmod(t2, 0x09, p)
            t4 := addmod(t4, addmod(sub(p, t3), sub(p, 0x07), p), p)

            t2 := mulmod(t2, t4, p)

            t1 := mulmod(mulmod(t1, t2, p), alpha_base, p)


            alpha_base := mulmod(alpha_base, alpha, p)
            alpha_base := mulmod(alpha_base, alpha, p)
        }

        challenges.alpha_base = Types.Fr(alpha_base);

        return Types.Fr(t1);
    }

    function compute_pedersen_gate_quotient_contribution(
        Types.ChallengeTranscript memory challenges,
        Types.Proof memory proof
    ) internal pure returns (Types.Fr memory) {


        uint256 alpha = challenges.alpha.value;
        uint256 gate_id = 0;
        uint256 alpha_base = challenges.alpha_base.value;

        {
            uint256 p = PairingsBn254.r_mod;
            uint256 delta = 0;

            uint256 wire_t0 = proof.wire_values_at_z[3].value; // w4
            uint256 wire_t1 = proof.wire_values_at_z_omega[3].value; // w4_omega
            uint256 wire_t2 = proof.wire_values_at_z_omega[2].value; // w3_omega
            assembly {
                let wire4_neg := sub(p, wire_t0)
                delta := addmod(wire_t1, mulmod(wire4_neg, 0x04, p), p)

                gate_id :=
                mulmod(
                    mulmod(
                        mulmod(
                            mulmod(
                                add(delta, 0x01),
                                add(delta, 0x03),
                                p
                            ),
                            add(delta, sub(p, 0x01)),
                            p
                        ),
                        add(delta, sub(p, 0x03)),
                        p
                    ),
                    alpha_base,
                    p
                )
                alpha_base := mulmod(alpha_base, alpha, p)
        
                gate_id := addmod(gate_id, sub(p, mulmod(wire_t2, alpha_base, p)), p)

                alpha_base := mulmod(alpha_base, alpha, p)
            }

            uint256 selector_value = proof.q_ecc_at_z.value;

            wire_t0 = proof.wire_values_at_z[0].value; // w1
            wire_t1 = proof.wire_values_at_z_omega[0].value; // w1_omega
            wire_t2 = proof.wire_values_at_z[1].value; // w2
            uint256 wire_t3 = proof.wire_values_at_z_omega[2].value; // w3_omega
            uint256 t0;
            uint256 t1;
            uint256 t2;
            assembly {
                t0 := addmod(wire_t1, addmod(wire_t0, wire_t3, p), p)

                t1 := addmod(wire_t3, sub(p, wire_t0), p)
                t1 := mulmod(t1, t1, p)

                t0 := mulmod(t0, t1, p)

                t1 := mulmod(wire_t3, mulmod(wire_t3, wire_t3, p), p)

                t2 := mulmod(wire_t2, wire_t2, p)

                t1 := sub(p, addmod(addmod(t1, t2, p), sub(p, 17), p))

                t2 := mulmod(mulmod(delta, wire_t2, p), selector_value, p)
                t2 := addmod(t2, t2, p)

                t0 := 
                    mulmod(
                        addmod(t0, addmod(t1, t2, p), p),
                        alpha_base,
                        p
                    )
                gate_id := addmod(gate_id, t0, p)

                alpha_base := mulmod(alpha_base, alpha, p)
            }

            wire_t0 = proof.wire_values_at_z[0].value; // w1
            wire_t1 = proof.wire_values_at_z_omega[1].value; // w2_omega
            wire_t2 = proof.wire_values_at_z[1].value; // w2
            wire_t3 = proof.wire_values_at_z_omega[2].value; // w3_omega
            uint256 wire_t4 = proof.wire_values_at_z_omega[0].value; // w1_omega
            assembly {
                t0 := mulmod(
                    addmod(wire_t1, wire_t2, p),
                    addmod(wire_t3, sub(p, wire_t0), p),
                    p
                )

                t1 := addmod(wire_t0, sub(p, wire_t4), p)

                t2 := addmod(
                        sub(p, mulmod(selector_value, delta, p)),
                        wire_t2,
                        p
                )

                gate_id := addmod(gate_id, mulmod(add(t0, mulmod(t1, t2, p)), alpha_base, p), p)

                alpha_base := mulmod(alpha_base, alpha, p)
            }

            selector_value = proof.q_c_at_z.value;
        
            wire_t1 = proof.wire_values_at_z[3].value; // w4
            wire_t2 = proof.wire_values_at_z[2].value; // w3
            assembly {
                let acc_init_id := addmod(wire_t1, sub(p, 0x01), p)

                t1 := addmod(acc_init_id, sub(p, wire_t2), p)

                acc_init_id := mulmod(acc_init_id, mulmod(t1, alpha_base, p), p)
                acc_init_id := mulmod(acc_init_id, selector_value, p)

                gate_id := addmod(gate_id, acc_init_id, p)

                alpha_base := mulmod(alpha_base, alpha, p)
            }
        
            assembly {
                let x_init_id := sub(p, mulmod(mulmod(wire_t0, selector_value, p), mulmod(wire_t2, alpha_base, p), p))

                gate_id := addmod(gate_id, x_init_id, p)

                alpha_base := mulmod(alpha_base, alpha, p)
            }

            wire_t0 = proof.wire_values_at_z[1].value; // w2
            wire_t1 = proof.wire_values_at_z[2].value; // w3
            wire_t2 = proof.wire_values_at_z[3].value; // w4
            assembly {
                let y_init_id := mulmod(add(0x01, sub(p, wire_t2)), selector_value, p)

                t1 := sub(p, mulmod(wire_t0, wire_t1, p))

                y_init_id := mulmod(add(y_init_id, t1), mulmod(alpha_base, selector_value, p), p)

                gate_id := addmod(gate_id, y_init_id, p)

                alpha_base := mulmod(alpha_base, alpha, p)

            }
            selector_value = proof.q_ecc_at_z.value;
            assembly {
                gate_id := mulmod(gate_id, selector_value, p)
            }
        }
        challenges.alpha_base = Types.Fr(alpha_base);
        return Types.Fr(gate_id);
    }

    function compute_permutation_quotient_contribution(
        Types.Fr memory public_input_delta,
        Types.ChallengeTranscript memory challenges,
        Types.Fr memory lagrange_start,
        Types.Fr memory lagrange_end,
        Types.Proof memory proof
    ) internal pure returns (Types.Fr memory) {

        uint256 numerator_collector;
        uint256 alpha = challenges.alpha.value;
        uint256 beta = challenges.beta.value;
        uint256 p = PairingsBn254.r_mod;
        uint256 grand_product = proof.grand_product_at_z_omega.value;
        {
            uint256 gamma = challenges.gamma.value;
            uint256 wire1 = proof.wire_values_at_z[0].value;
            uint256 wire2 = proof.wire_values_at_z[1].value;
            uint256 wire3 = proof.wire_values_at_z[2].value;
            uint256 wire4 = proof.wire_values_at_z[3].value;
            uint256 sigma1 = proof.permutation_polynomials_at_z[0].value;
            uint256 sigma2 = proof.permutation_polynomials_at_z[1].value;
            uint256 sigma3 = proof.permutation_polynomials_at_z[2].value;
            assembly {

                let t0 := add(
                    add(wire1, gamma),
                    mulmod(beta, sigma1, p)
                )

                let t1 := add(
                    add(wire2, gamma),
                    mulmod(beta, sigma2, p)
                )

                let t2 := add(
                    add(wire3, gamma),
                    mulmod(beta, sigma3, p)
                )

                t0 := mulmod(t0, mulmod(t1, t2, p), p)

                t0 := mulmod(
                    t0,
                    add(wire4, gamma),
                    p
                )

                t0 := mulmod(
                    t0,
                    grand_product,
                    p
                )

                t0 := mulmod(
                    t0,
                    alpha,
                    p
                )

                numerator_collector := sub(p, t0)
            }
        }


        uint256 alpha_base = challenges.alpha_base.value;
        {
            uint256 lstart = lagrange_start.value;
            uint256 lend = lagrange_end.value;
            uint256 public_delta = public_input_delta.value;
            uint256 linearization_poly = proof.linearization_polynomial_at_z.value;
            assembly {
                let alpha_squared := mulmod(alpha, alpha, p)
                let alpha_cubed := mulmod(alpha, alpha_squared, p)

                let t0 := mulmod(lstart, alpha_cubed, p)
                let t1 := mulmod(lend, alpha_squared, p)
                let t2 := addmod(grand_product, sub(p, public_delta), p)
                t1 := mulmod(t1, t2, p)

                numerator_collector := addmod(numerator_collector, sub(p, t0), p)
                numerator_collector := addmod(numerator_collector, t1, p)
                numerator_collector := addmod(numerator_collector, linearization_poly, p)
                alpha_base := mulmod(alpha_base, alpha_cubed, p)
            }
        }

        challenges.alpha_base = Types.Fr(alpha_base);

        return Types.Fr(numerator_collector);
    }

    function compute_quotient_polynomial(
        Types.Fr memory zero_poly_eval,
        Types.Fr memory public_input_delta,
        Types.ChallengeTranscript memory challenges,
        Types.Fr memory lagrange_start,
        Types.Fr memory lagrange_end,
        Types.Proof memory proof
    ) internal pure returns (Types.Fr memory) {
        uint256 t0 = compute_permutation_quotient_contribution(
            public_input_delta,
            challenges,
            lagrange_start,
            lagrange_end,
            proof
        ).value;

        uint256 t1 = compute_arithmetic_gate_quotient_contribution(challenges, proof).value;

        uint256 t2 = compute_pedersen_gate_quotient_contribution(challenges, proof).value;

        uint256 zero_inverse = zero_poly_eval.value;

        uint256 quotient_eval;
        uint256 p = PairingsBn254.r_mod;
        assembly {
            quotient_eval := add(t0, add(t1, t2))
            quotient_eval := mulmod(quotient_eval, zero_inverse, p)
        }
        return Types.Fr(quotient_eval);
    }

    function compute_partial_opening_commitment(
        Types.ChallengeTranscript memory challenges,
        Types.Fr memory L1_fr,
        Types.G1Point memory,
        Types.VerificationKey memory vk,
        Types.Proof memory proof
    ) internal view returns (Types.G1Point memory) {
        Types.G1Point memory accumulator = compute_grand_product_opening_scalar(proof, vk, challenges, L1_fr);
        Types.G1Point memory arithmetic_term = compute_arithmetic_selector_opening_scalars(proof, vk, challenges);
        Types.G1Point memory range_term = compute_range_gate_opening_scalar(proof, vk, challenges);
        Types.G1Point memory logic_term = compute_logic_gate_opening_scalar(proof, vk, challenges);

        accumulator.point_add_assign(arithmetic_term);
        accumulator.point_add_assign(range_term);
        accumulator.point_add_assign(logic_term);
        return accumulator;
    }

    function compute_batch_opening_commitment(
        Types.ChallengeTranscript memory challenges,
        Types.VerificationKey memory vk,
        Types.G1Point memory partial_opening_commitment,
        Types.Proof memory proof
    ) internal view returns (Types.G1Point memory) {
        // first term

        Types.G1Point memory accumulator = PairingsBn254.copy_g1(proof.quotient_poly_commitments[0]); //tlow

        // second term
        Types.Fr memory zeta_n = challenges.zeta.pow_small(vk.circuit_size, Types.r_mod);

        accumulator.point_add_assign(PairingsBn254.point_mul(proof.quotient_poly_commitments[1], zeta_n));

        // third term
        Types.Fr memory zeta_2n = zeta_n.pow_2();

        accumulator.point_add_assign(PairingsBn254.point_mul(proof.quotient_poly_commitments[2], zeta_2n));

        // fourth term
        Types.Fr memory zeta_3n = zeta_n.pow_3();

        accumulator.point_add_assign(PairingsBn254.point_mul(proof.quotient_poly_commitments[3], zeta_3n));

        // fifth term
        accumulator.point_add_assign(partial_opening_commitment);

        Types.Fr memory u_plus_one = challenges.u.add_fr(Types.Fr(1));

        // shifted_wire_value
        Types.Fr memory scalar_multiplier = challenges.v[0].mul_fr(u_plus_one);

        accumulator.point_add_assign(PairingsBn254.point_mul(proof.wire_commitments[0], scalar_multiplier));

        scalar_multiplier = challenges.v[1].mul_fr(u_plus_one);
        accumulator.point_add_assign(PairingsBn254.point_mul(proof.wire_commitments[1], scalar_multiplier));

        scalar_multiplier = challenges.v[2].mul_fr(u_plus_one);
        accumulator.point_add_assign(PairingsBn254.point_mul(proof.wire_commitments[2], scalar_multiplier));

        scalar_multiplier = challenges.v[3].mul_fr(u_plus_one);
        accumulator.point_add_assign(PairingsBn254.point_mul(proof.wire_commitments[3], scalar_multiplier));

        // copy permutation selectors
        scalar_multiplier = challenges.v[4];
        accumulator.point_add_assign(PairingsBn254.point_mul(vk.sigma_commitments[0], scalar_multiplier));

        scalar_multiplier = challenges.v[5];
        accumulator.point_add_assign(PairingsBn254.point_mul(vk.sigma_commitments[1], scalar_multiplier));

        scalar_multiplier = challenges.v[6];
        accumulator.point_add_assign(PairingsBn254.point_mul(vk.sigma_commitments[2], scalar_multiplier));

        // arithmetic selector evaluations
        scalar_multiplier = challenges.v[7];
        accumulator.point_add_assign(PairingsBn254.point_mul(vk.QARITH, scalar_multiplier));

        // arithmetic selector evaluations
        scalar_multiplier = challenges.v[8];
        accumulator.point_add_assign(PairingsBn254.point_mul(vk.QECC, scalar_multiplier));

        return accumulator;
    }

    function compute_batch_evaluation_commitment(Types.Proof memory proof, Types.ChallengeTranscript memory challenges)
        internal
        view
        returns (Types.G1Point memory)
    {
        uint256 p = PairingsBn254.r_mod;
        uint256 opening_scalar;
        uint256 lhs;
        uint256 rhs;

        lhs = challenges.v[0].value;
        rhs = proof.wire_values_at_z[0].value;
        assembly {
            opening_scalar := addmod(opening_scalar, mulmod(lhs, rhs, p), p)
        }

        lhs = challenges.v[1].value;
        rhs = proof.wire_values_at_z[1].value;
        assembly {
            opening_scalar := addmod(opening_scalar, mulmod(lhs, rhs, p), p)
        }

        lhs = challenges.v[2].value;
        rhs = proof.wire_values_at_z[2].value;
        assembly {
            opening_scalar := addmod(opening_scalar, mulmod(lhs, rhs, p), p)
        }

        lhs = challenges.v[3].value;
        rhs = proof.wire_values_at_z[3].value;
        assembly {
            opening_scalar := addmod(opening_scalar, mulmod(lhs, rhs, p), p)
        }

        lhs = challenges.v[4].value;
        rhs = proof.permutation_polynomials_at_z[0].value;
        assembly {
            opening_scalar := addmod(opening_scalar, mulmod(lhs, rhs, p), p)
        }

        lhs = challenges.v[5].value;
        rhs = proof.permutation_polynomials_at_z[1].value;
        assembly {
            opening_scalar := addmod(opening_scalar, mulmod(lhs, rhs, p), p)
        }

        lhs = challenges.v[6].value;
        rhs = proof.permutation_polynomials_at_z[2].value;
        assembly {
            opening_scalar := addmod(opening_scalar, mulmod(lhs, rhs, p), p)
        }

        lhs = challenges.v[7].value;
        rhs = proof.q_arith_at_z.value;
        assembly {
            opening_scalar := addmod(opening_scalar, mulmod(lhs, rhs, p), p)
        }

        lhs = challenges.v[8].value;
        rhs = proof.q_ecc_at_z.value;
        assembly {
            opening_scalar := addmod(opening_scalar, mulmod(lhs, rhs, p), p)
        }

        lhs = challenges.v[9].value;
        rhs = proof.q_c_at_z.value;
        assembly {
            opening_scalar := addmod(opening_scalar, mulmod(lhs, rhs, p), p)
        }
    
        lhs = challenges.v[10].value;
        rhs = proof.linearization_polynomial_at_z.value;
        assembly {
            opening_scalar := addmod(opening_scalar, mulmod(lhs, rhs, p), p)
        }
    
        lhs = proof.quotient_polynomial_at_z.value;
        assembly {
            opening_scalar := addmod(opening_scalar, lhs, p)
        }

        lhs = challenges.v[0].value;
        rhs = proof.wire_values_at_z_omega[0].value;
        uint256 shifted_opening_scalar;
        assembly {
            shifted_opening_scalar := mulmod(lhs, rhs, p)
        }
    
        lhs = challenges.v[1].value;
        rhs = proof.wire_values_at_z_omega[1].value;
        assembly {
            shifted_opening_scalar := addmod(shifted_opening_scalar, mulmod(lhs, rhs, p), p)
        }

        lhs = challenges.v[2].value;
        rhs = proof.wire_values_at_z_omega[2].value;
        assembly {
            shifted_opening_scalar := addmod(shifted_opening_scalar, mulmod(lhs, rhs, p), p)
        }

        lhs = challenges.v[3].value;
        rhs = proof.wire_values_at_z_omega[3].value;
        assembly {
            shifted_opening_scalar := addmod(shifted_opening_scalar, mulmod(lhs, rhs, p), p)
        }

        lhs = proof.grand_product_at_z_omega.value;
        assembly {
            shifted_opening_scalar := addmod(shifted_opening_scalar, lhs, p)
        }

        lhs = challenges.u.value;
        assembly {
            shifted_opening_scalar := mulmod(shifted_opening_scalar, lhs, p)

            opening_scalar := addmod(opening_scalar, shifted_opening_scalar, p)
        }

        Types.G1Point memory batch_eval_commitment = PairingsBn254.point_mul(PairingsBn254.P1(), Types.Fr(opening_scalar));
        return batch_eval_commitment;
    }

    // Compute kate opening scalar for arithmetic gate selectors and pedersen gate selectors
    // (both the arithmetic gate and pedersen hash gate reuse the same selectors)
    function compute_arithmetic_selector_opening_scalars(
        Types.Proof memory proof,
        Types.VerificationKey memory vk,
        Types.ChallengeTranscript memory challenges
    ) internal view returns (Types.G1Point memory) {

        uint256 q_arith = proof.q_arith_at_z.value;
        uint256 q_ecc_at_z = proof.q_ecc_at_z.value;
        uint256 linear_challenge = challenges.v[10].value;
        uint256 alpha_base = challenges.alpha_base.value;
        uint256 scaling_alpha = challenges.alpha_base.value;
        uint256 alpha = challenges.alpha.value;
        uint256 p = PairingsBn254.r_mod;
        uint256 scalar_multiplier;
        Types.G1Point memory accumulator;
        {
            uint256 delta;
            // Q1 Selector
            {
                {
                    uint256 w4 = proof.wire_values_at_z[3].value;
                    uint256 w4_omega = proof.wire_values_at_z_omega[3].value;
                    assembly {
                        delta := addmod(w4_omega, sub(p, mulmod(w4, 0x04, p)), p)
                    }
                }
                uint256 w1 = proof.wire_values_at_z[0].value;

                assembly {
                    scalar_multiplier := mulmod(w1, linear_challenge, p)
                    scalar_multiplier := mulmod(scalar_multiplier, alpha_base, p)
                    scalar_multiplier := mulmod(scalar_multiplier, q_arith, p)

                    scaling_alpha := mulmod(scaling_alpha, alpha, p)
                    scaling_alpha := mulmod(scaling_alpha, alpha, p)
                    scaling_alpha := mulmod(scaling_alpha, alpha, p)
                    let t0 := mulmod(delta, delta, p)
                    t0 := mulmod(t0, q_ecc_at_z, p)
                    t0 := mulmod(t0, scaling_alpha, p)

                    scalar_multiplier := addmod(scalar_multiplier, mulmod(t0, linear_challenge, p), p)
                }
            }
            accumulator = PairingsBn254.point_mul(vk.Q1, Types.Fr(scalar_multiplier));

            // Q2 Selector
            {
                uint256 w2 = proof.wire_values_at_z[1].value;
                assembly {
                    scalar_multiplier := mulmod(w2, linear_challenge, p)
                    scalar_multiplier := mulmod(scalar_multiplier, alpha_base, p)
                    scalar_multiplier := mulmod(scalar_multiplier, q_arith, p)

                    let t0 := mulmod(scaling_alpha, q_ecc_at_z, p)
                    scalar_multiplier := addmod(scalar_multiplier, mulmod(t0, linear_challenge, p), p)
                }
            }
            accumulator.point_add_assign(PairingsBn254.point_mul(vk.Q2, Types.Fr(scalar_multiplier)));

            // Q3 Selector
            {
                {
                    uint256 w3 = proof.wire_values_at_z[2].value;
                    assembly {
                        scalar_multiplier := mulmod(w3, linear_challenge, p)
                        scalar_multiplier := mulmod(scalar_multiplier, alpha_base, p)
                        scalar_multiplier := mulmod(scalar_multiplier, q_arith, p)
                    }
                }
                {
                    uint256 t1;
                    {
                        uint256 w3_omega = proof.wire_values_at_z_omega[2].value;
                        assembly {
                            t1 := mulmod(delta, w3_omega, p)
                        }
                    }
                    {
                        uint256 w2 = proof.wire_values_at_z[1].value;
                        assembly {
                            scaling_alpha := mulmod(scaling_alpha, alpha, p)

                            t1 := mulmod(t1, w2, p)
                            t1 := mulmod(t1, scaling_alpha, p)
                            t1 := addmod(t1, t1, p)
                            t1 := mulmod(t1, q_ecc_at_z, p)

                        scalar_multiplier := addmod(scalar_multiplier, mulmod(t1, linear_challenge, p), p)
                        }
                    }
                }
                uint256 t0 = proof.wire_values_at_z_omega[0].value;
                {
                    uint256 w1 = proof.wire_values_at_z[0].value;
                    assembly {
                        scaling_alpha := mulmod(scaling_alpha, alpha, p)
                        t0 := addmod(t0, sub(p, w1), p)
                        t0 := mulmod(t0, delta, p)
                    }
                }
                uint256 w3_omega = proof.wire_values_at_z_omega[2].value;
                assembly {

                    t0 := mulmod(t0, w3_omega, p)
                    t0 := mulmod(t0, scaling_alpha, p)

                    t0 := mulmod(t0, q_ecc_at_z, p)

                    scalar_multiplier := addmod(scalar_multiplier, mulmod(t0, linear_challenge, p), p)
                }
            }
        }
        accumulator.point_add_assign(PairingsBn254.point_mul(vk.Q3, Types.Fr(scalar_multiplier)));

        // Q4 Selector
        {
            uint256 w3 = proof.wire_values_at_z[2].value;
            uint256 w4 = proof.wire_values_at_z[3].value;
            uint256 q_c_at_z = proof.q_c_at_z.value;
            assembly {
                scalar_multiplier := mulmod(w4, linear_challenge, p)
                scalar_multiplier := mulmod(scalar_multiplier, alpha_base, p)
                scalar_multiplier := mulmod(scalar_multiplier, q_arith, p)

                scaling_alpha := mulmod(scaling_alpha, mulmod(alpha, alpha, p), p)
                let t0 := mulmod(w3, q_ecc_at_z, p)
                t0 := mulmod(t0, q_c_at_z, p)
                t0 := mulmod(t0, scaling_alpha, p)

                scalar_multiplier := addmod(scalar_multiplier, mulmod(t0, linear_challenge, p), p)
            }
        }
        accumulator.point_add_assign(PairingsBn254.point_mul(vk.Q4, Types.Fr(scalar_multiplier)));

        // Q5 Selector
        {
            uint256 w4 = proof.wire_values_at_z[3].value;
            uint256 q_c_at_z = proof.q_c_at_z.value;
            assembly {
                let neg_w4 := sub(p, w4)
                scalar_multiplier := mulmod(w4, w4, p)
                scalar_multiplier := addmod(scalar_multiplier, neg_w4, p)
                scalar_multiplier := mulmod(scalar_multiplier, addmod(w4, sub(p, 2), p), p)
                scalar_multiplier := mulmod(scalar_multiplier, alpha_base, p)
                scalar_multiplier := mulmod(scalar_multiplier, alpha, p)
                scalar_multiplier := mulmod(scalar_multiplier, q_arith, p)
                scalar_multiplier := mulmod(scalar_multiplier, linear_challenge, p)

                let t0 := addmod(0x01, neg_w4, p)
                t0 := mulmod(t0, q_ecc_at_z, p)
                t0 := mulmod(t0, q_c_at_z, p)
                t0 := mulmod(t0, scaling_alpha, p)

                scalar_multiplier := addmod(scalar_multiplier, mulmod(t0, linear_challenge, p), p)
            }
        }
        accumulator.point_add_assign(PairingsBn254.point_mul(vk.Q5, Types.Fr(scalar_multiplier)));
    
        // QM Selector
        {
            {
                uint256 w1 = proof.wire_values_at_z[0].value;
                uint256 w2 = proof.wire_values_at_z[1].value;

                assembly {
                    scalar_multiplier := mulmod(w1, w2, p)
                    scalar_multiplier := mulmod(scalar_multiplier, linear_challenge, p)
                    scalar_multiplier := mulmod(scalar_multiplier, alpha_base, p)
                    scalar_multiplier := mulmod(scalar_multiplier, q_arith, p)
                }
            }
            uint256 w3 = proof.wire_values_at_z[2].value;
            uint256 q_c_at_z = proof.q_c_at_z.value;
            assembly {

                scaling_alpha := mulmod(scaling_alpha, alpha, p)
                let t0 := mulmod(w3, q_ecc_at_z, p)
                t0 := mulmod(t0, q_c_at_z, p)
                t0 := mulmod(t0, scaling_alpha, p)

                scalar_multiplier := addmod(scalar_multiplier, mulmod(t0, linear_challenge, p), p)
            }
        }
        accumulator.point_add_assign(PairingsBn254.point_mul(vk.QM, Types.Fr(scalar_multiplier)));

        // QC Selector
        {
            uint256 q_c_challenge = challenges.v[9].value;
            assembly {
                scalar_multiplier := mulmod(linear_challenge, alpha_base, p)
                scalar_multiplier := mulmod(scalar_multiplier, q_arith, p)

                // TurboPlonk requires an explicit evaluation of q_c
                scalar_multiplier := addmod(scalar_multiplier, q_c_challenge, p)

                alpha_base := mulmod(scaling_alpha, alpha, p)
            }
        }
        accumulator.point_add_assign(PairingsBn254.point_mul(vk.QC, Types.Fr(scalar_multiplier)));
        challenges.alpha_base = Types.Fr(alpha_base);

        return accumulator;
    }


    // Compute kate opening scalar for arithmetic gate selectors
    function compute_logic_gate_opening_scalar(
        Types.Proof memory proof,
        Types.VerificationKey memory vk,
        Types.ChallengeTranscript memory challenges
    ) internal view returns (Types.G1Point memory) {

        uint256 identity = 0;

        {
            uint256 p = PairingsBn254.r_mod;
            uint256 delta_sum = 0;
            uint256 delta_squared_sum = 0;
            uint256 t0 = 0;
            uint256 t1 = 0;
            uint256 t2 = 0;
            uint256 t3 = 0;
            {
                uint256 wire1_omega = proof.wire_values_at_z_omega[0].value;
                uint256 wire1 = proof.wire_values_at_z[0].value;
                assembly {
                    t0 := addmod(wire1_omega, sub(p, mulmod(wire1, 0x04, p)), p)
                }
            }

            {
                uint256 wire2_omega = proof.wire_values_at_z_omega[1].value;
                uint256 wire2 = proof.wire_values_at_z[1].value;
                assembly {
                    t1 := addmod(wire2_omega, sub(p, mulmod(wire2, 0x04, p)), p)

                    delta_sum := addmod(t0, t1, p)
                    t2 := mulmod(t0, t0, p)
                    t3 := mulmod(t1, t1, p)
                    delta_squared_sum := addmod(t2, t3, p)
                    identity := mulmod(delta_sum, delta_sum, p)
                    identity := addmod(identity, sub(p, delta_squared_sum), p)
                }
            }

            uint256 t4 = 0;
            uint256 alpha = challenges.alpha.value;

            {
                uint256 wire3 = proof.wire_values_at_z[2].value;
                assembly{
                    t4 := mulmod(wire3, 0x02, p)
                    identity := addmod(identity, sub(p, t4), p)
                    identity := mulmod(identity, alpha, p)
                }
            }

            assembly {
                t4 := addmod(t4, t4, p)
                t2 := addmod(t2, sub(p, t0), p)
                t0 := mulmod(t0, 0x04, p)
                t0 := addmod(t2, sub(p, t0), p)
                t0 := addmod(t0, 0x06, p)

                t0 := mulmod(t0, t2, p)
                identity := addmod(identity, t0, p)
                identity := mulmod(identity, alpha, p)

                t3 := addmod(t3, sub(p, t1), p)
                t1 := mulmod(t1, 0x04, p)
                t1 := addmod(t3, sub(p, t1), p)
                t1 := addmod(t1, 0x06, p)

                t1 := mulmod(t1, t3, p)
                identity := addmod(identity, t1, p)
                identity := mulmod(identity, alpha, p)

                t0 := mulmod(delta_sum, 0x03, p)

                t1 := mulmod(t0, 0x03, p)

                delta_sum := addmod(t1, t1, p)

                t2 := mulmod(delta_sum, 0x04, p)
                t1 := addmod(t1, t2, p)

                t2 := mulmod(delta_squared_sum, 0x03, p)

                delta_squared_sum := mulmod(t2, 0x06, p)

                delta_sum := addmod(t4, sub(p, delta_sum), p)
                delta_sum := addmod(delta_sum, 81, p)

                t1 := addmod(delta_squared_sum, sub(p, t1), p)
                t1 := addmod(t1, 83, p)
            }

            {
                uint256 wire3 = proof.wire_values_at_z[2].value;
                assembly {
                    delta_sum := mulmod(delta_sum, wire3, p)

                    delta_sum := addmod(delta_sum, t1, p)
                    delta_sum := mulmod(delta_sum, wire3, p)
                }
            }
            {
                uint256 wire4 = proof.wire_values_at_z[3].value;
                assembly {
                    t2 := mulmod(wire4, 0x04, p)
                }
            }
            {
                uint256 wire4_omega = proof.wire_values_at_z_omega[3].value;
                assembly {
                    t2 := addmod(wire4_omega, sub(p, t2), p)
                }
            }
            {
                uint256 q_c = proof.q_c_at_z.value;
                assembly {
                    t3 := addmod(t2, t2, p)
                    t2 := addmod(t2, t3, p)

                    t3 := addmod(t2, t2, p)
                    t3 := addmod(t3, t2, p)

                    t3 := addmod(t3, sub(p, t0), p)
                    t3 := mulmod(t3, q_c, p)

                    t2 := addmod(t2, t0, p)
                    delta_sum := addmod(delta_sum, delta_sum, p)
                    t2 := addmod(t2, sub(p, delta_sum), p)

                    t2 := addmod(t2, t3, p)

                    identity := addmod(identity, t2, p)
                }
            }
            uint256 linear_nu = challenges.v[10].value;
            uint256 alpha_base = challenges.alpha_base.value;

            assembly {
                identity := mulmod(identity, alpha_base, p)
                identity := mulmod(identity, linear_nu, p)
            }
        }
        Types.Fr memory identity_fr = Types.Fr(identity);
        Types.G1Point memory kate_component = PairingsBn254.point_mul(vk.QLOGIC, identity_fr);

        challenges.alpha_base.mul_assign(challenges.alpha);
        challenges.alpha_base.mul_assign(challenges.alpha);
        challenges.alpha_base.mul_assign(challenges.alpha);
        challenges.alpha_base.mul_assign(challenges.alpha);

        return kate_component;
    }

    // Compute kate opening scalar for arithmetic gate selectors
    function compute_range_gate_opening_scalar(
        Types.Proof memory proof,
        Types.VerificationKey memory vk,
        Types.ChallengeTranscript memory challenges
    ) internal view returns (Types.G1Point memory) {

        uint256 wire1 = proof.wire_values_at_z[0].value;
        uint256 wire2 = proof.wire_values_at_z[1].value;
        uint256 wire3 = proof.wire_values_at_z[2].value;
        uint256 wire4 = proof.wire_values_at_z[3].value;
        uint256 wire4_omega = proof.wire_values_at_z_omega[3].value;
        uint256 alpha = challenges.alpha.value;
        uint256 alpha_base = challenges.alpha_base.value;
        uint256 range_acc;
        uint256 p = PairingsBn254.r_mod;
        assembly {
            let delta_1 := addmod(wire3, sub(p, mulmod(wire4, 0x04, p)), p)
            let delta_2 := addmod(wire2, sub(p, mulmod(wire3, 0x04, p)), p)
            let delta_3 := addmod(wire1, sub(p, mulmod(wire2, 0x04, p)), p)
            let delta_4 := addmod(wire4_omega, sub(p, mulmod(wire1, 0x04, p)), p)


            let t0 := mulmod(delta_1, delta_1, p)
            t0 := addmod(t0, sub(p, delta_1), p)
            let t1 := addmod(delta_1, sub(p, 2), p)
            t0 := mulmod(t0, t1, p)
            t1 := addmod(delta_1, sub(p, 3), p)
            t0 := mulmod(t0, t1, p)
            t0 := mulmod(t0, alpha_base, p)

            range_acc := t0
            alpha_base := mulmod(alpha_base, alpha, p)

            t0 := mulmod(delta_2, delta_2, p)
            t0 := addmod(t0, sub(p, delta_2), p)
            t1 := addmod(delta_2, sub(p, 2), p)
            t0 := mulmod(t0, t1, p)
            t1 := addmod(delta_2, sub(p, 3), p)
            t0 := mulmod(t0, t1, p)
            t0 := mulmod(t0, alpha_base, p)
            range_acc := addmod(range_acc, t0, p)
            alpha_base := mulmod(alpha_base, alpha, p)

            t0 := mulmod(delta_3, delta_3, p)
            t0 := addmod(t0, sub(p, delta_3), p)
            t1 := addmod(delta_3, sub(p, 2), p)
            t0 := mulmod(t0, t1, p)
            t1 := addmod(delta_3, sub(p, 3), p)
            t0 := mulmod(t0, t1, p)
            t0 := mulmod(t0, alpha_base, p)
            range_acc := addmod(range_acc, t0, p)
            alpha_base := mulmod(alpha_base, alpha, p)

            t0 := mulmod(delta_4, delta_4, p)
            t0 := addmod(t0, sub(p, delta_4), p)
            t1 := addmod(delta_4, sub(p, 2), p)
            t0 := mulmod(t0, t1, p)
            t1 := addmod(delta_4, sub(p, 3), p)
            t0 := mulmod(t0, t1, p)
            t0 := mulmod(t0, alpha_base, p)
            range_acc := addmod(range_acc, t0, p)
            alpha_base := mulmod(alpha_base, alpha, p)
        }

        Types.Fr memory range_accumulator = Types.Fr(range_acc);
        range_accumulator.mul_assign(challenges.v[10]);
        Types.G1Point memory kate_component = PairingsBn254.point_mul(vk.QRANGE, range_accumulator);

        challenges.alpha_base = Types.Fr(alpha_base);

        return kate_component;
    }

    // Compute grand product opening scalar and perform kate verification scalar multiplication
    function compute_grand_product_opening_scalar(
        Types.Proof memory proof,
        Types.VerificationKey memory vk,
        Types.ChallengeTranscript memory challenges,
        Types.Fr memory L1_fr
    ) internal view returns (Types.G1Point memory) {
        uint256 beta = challenges.beta.value;
        uint256 zeta = challenges.zeta.value;
        uint256 gamma = challenges.gamma.value;
        uint256 p = PairingsBn254.r_mod;
        
        uint256 partial_grand_product;
        uint256 sigma_multiplier;

        {
            uint256 w1 = proof.wire_values_at_z[0].value;
            uint256 sigma1 = proof.permutation_polynomials_at_z[0].value;
            assembly {
                let witness_term := addmod(w1, gamma, p)
                partial_grand_product := addmod(mulmod(beta, zeta, p), witness_term, p)
                sigma_multiplier := addmod(mulmod(sigma1, beta, p), witness_term, p)
            }
        }
        {
            uint256 w2 = proof.wire_values_at_z[1].value;
            uint256 sigma2 = proof.permutation_polynomials_at_z[1].value;
            assembly {
                let witness_term := addmod(w2, gamma, p)
                partial_grand_product := mulmod(partial_grand_product, addmod(mulmod(mulmod(zeta, 0x05, p), beta, p), witness_term, p), p)
                sigma_multiplier := mulmod(sigma_multiplier, addmod(mulmod(sigma2, beta, p), witness_term, p), p)
            }
        }
        {
            uint256 w3 = proof.wire_values_at_z[2].value;
            uint256 sigma3 = proof.permutation_polynomials_at_z[2].value;
            assembly {
                let witness_term := addmod(w3, gamma, p)
                partial_grand_product := mulmod(partial_grand_product, addmod(mulmod(mulmod(zeta, 0x06, p), beta, p), witness_term, p), p)

                sigma_multiplier := mulmod(sigma_multiplier, addmod(mulmod(sigma3, beta, p), witness_term, p), p)
            }
        }
        {
            uint256 w4 = proof.wire_values_at_z[3].value;
            assembly {
                partial_grand_product := mulmod(partial_grand_product, addmod(addmod(mulmod(mulmod(zeta, 0x07, p), beta, p), gamma, p), w4, p), p)
            }
        }
        {
            uint256 linear_challenge = challenges.v[10].value;
            uint256 alpha_base = challenges.alpha_base.value;
            uint256 alpha = challenges.alpha.value;
            uint256 separator_challenge = challenges.u.value;
            uint256 grand_product_at_z_omega = proof.grand_product_at_z_omega.value;
            uint256 l_start = L1_fr.value;
            assembly {
                partial_grand_product := mulmod(partial_grand_product, alpha_base, p)

                sigma_multiplier := mulmod(mulmod(sub(p, mulmod(mulmod(sigma_multiplier, grand_product_at_z_omega, p), alpha_base, p)), beta, p), linear_challenge, p)

                alpha_base := mulmod(mulmod(alpha_base, alpha, p), alpha, p)

                partial_grand_product := addmod(mulmod(addmod(partial_grand_product, mulmod(l_start, alpha_base, p), p), linear_challenge, p), separator_challenge, p)

                alpha_base := mulmod(alpha_base, alpha, p)
            }
            challenges.alpha_base = Types.Fr(alpha_base);
        }

        Types.G1Point memory accumulator = PairingsBn254.point_mul(
            proof.grand_product_commitment,
            Types.Fr(partial_grand_product)
        );

        Types.G1Point memory S = PairingsBn254.point_mul(vk.sigma_commitments[3], Types.Fr(sigma_multiplier));
        accumulator.point_add_assign(S);
        return accumulator;
    }
}
