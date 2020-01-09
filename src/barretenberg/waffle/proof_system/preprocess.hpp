#pragma once

#include "../../curves/bn254/g1.hpp"
#include "../../curves/bn254/g2.hpp"
#include "../../curves/bn254/scalar_multiplication/scalar_multiplication.hpp"
#include "../../polynomials/polynomial.hpp"
#include "../../types.hpp"

#include "./permutation.hpp"
#include "./prover/prover.hpp"
#include "./verifier/verifier.hpp"
#include "./widgets/base_widget.hpp"

namespace waffle
{
inline Verifier preprocess(const Prover& prover)
{
    barretenberg::polynomial polys[3]{
        barretenberg::polynomial(prover.n, prover.n),
        barretenberg::polynomial(prover.n, prover.n),
        barretenberg::polynomial(prover.n, prover.n),
    };

    // copy polynomials so that we don't mutate inputs
    compute_permutation_lagrange_base_single(polys[0], prover.sigma_1_mapping, prover.circuit_state.small_domain);
    compute_permutation_lagrange_base_single(polys[1], prover.sigma_2_mapping, prover.circuit_state.small_domain);
    compute_permutation_lagrange_base_single(polys[2], prover.sigma_3_mapping, prover.circuit_state.small_domain);

    for (size_t i = 0; i < 3; ++i)
    {
        polys[i].ifft(prover.circuit_state.small_domain);
    }

    // barretenberg::scalar_multiplication::multiplication_state mul_state[3]{
    //     { prover.reference_string.monomials, polys[0].get_coefficients(), prover.n, {} },
    //     { prover.reference_string.monomials, polys[1].get_coefficients(), prover.n, {} },
    //     { prover.reference_string.monomials, polys[2].get_coefficients(), prover.n, {} }
    // };

    // barretenberg::scalar_multiplication::batched_scalar_multiplications(mul_state, 3);

    Verifier verifier(prover.n);

    barretenberg::g1::jacobian_to_affine(barretenberg::scalar_multiplication::pippenger(
                                             polys[0].get_coefficients(), prover.reference_string.monomials, prover.n),
                                         verifier.SIGMA_1);
    barretenberg::g1::jacobian_to_affine(barretenberg::scalar_multiplication::pippenger(
                                             polys[1].get_coefficients(), prover.reference_string.monomials, prover.n),
                                         verifier.SIGMA_2);
    barretenberg::g1::jacobian_to_affine(barretenberg::scalar_multiplication::pippenger(
                                             polys[2].get_coefficients(), prover.reference_string.monomials, prover.n),
                                         verifier.SIGMA_3);
    // barretenberg::g1::jacobian_to_affine(mul_state[1].output, verifier.SIGMA_2);
    // barretenberg::g1::jacobian_to_affine(mul_state[2].output, verifier.SIGMA_3);

    // barretenberg::g1::jacobian_to_affine(mul_state[0].output, verifier.SIGMA_1);
    // barretenberg::g1::jacobian_to_affine(mul_state[1].output, verifier.SIGMA_2);
    // barretenberg::g1::jacobian_to_affine(mul_state[2].output, verifier.SIGMA_3);

    verifier.reference_string = prover.reference_string.get_verifier_reference_string();
    // TODO: this whole method should be part of the class that owns prover.widgets
    for (size_t i = 0; i < prover.widgets.size(); ++i)
    {
        verifier.verifier_widgets.emplace_back(prover.widgets[i]->compute_preprocessed_commitments(
            prover.circuit_state.small_domain, prover.reference_string));
    }
    return verifier;
}
} // namespace waffle
