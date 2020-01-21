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
        barretenberg::polynomial(prover.key->permutation_selectors.at("sigma_1"), prover.n),
        barretenberg::polynomial(prover.key->permutation_selectors.at("sigma_2"), prover.n),
        barretenberg::polynomial(prover.key->permutation_selectors.at("sigma_3"), prover.n),
    };


    Verifier verifier(prover.n, prover.transcript.get_manifest(), prover.__DEBUG_HAS_FOURTH_WIRE);

    barretenberg::g1::jacobian_to_affine(barretenberg::scalar_multiplication::pippenger(
                                             polys[0].get_coefficients(), prover.key->reference_string.monomials, prover.n),
                                         verifier.SIGMA_1);
    barretenberg::g1::jacobian_to_affine(barretenberg::scalar_multiplication::pippenger(
                                             polys[1].get_coefficients(), prover.key->reference_string.monomials, prover.n),
                                         verifier.SIGMA_2);
    barretenberg::g1::jacobian_to_affine(barretenberg::scalar_multiplication::pippenger(
                                             polys[2].get_coefficients(), prover.key->reference_string.monomials, prover.n),
                                         verifier.SIGMA_3);

    verifier.reference_string = prover.key->reference_string.get_verifier_reference_string();
    // TODO: this whole method should be part of the class that owns prover.widgets
    for (size_t i = 0; i < prover.widgets.size(); ++i)
    {
        verifier.verifier_widgets.emplace_back(prover.widgets[i]->compute_preprocessed_commitments(
            prover.key->reference_string));
    }
    return verifier;
}
} // namespace waffle
