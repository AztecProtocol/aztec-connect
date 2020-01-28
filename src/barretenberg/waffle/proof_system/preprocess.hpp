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
template <typename settings>
inline VerifierBase<settings> preprocess(const ProverBase<settings>& prover)
{
    std::array<barretenberg::polynomial, settings::program_width> polys;
    for (size_t i = 0; i < settings::program_width; ++i)
    {
        polys[i] = barretenberg::polynomial(prover.key->permutation_selectors.at("sigma_" + std::to_string(i + 1)), prover.n);
    }

    VerifierBase<settings> verifier(prover.n, prover.transcript.get_manifest(), settings::program_width > 3);

    for (size_t i = 0; i < settings::program_width; ++i) {
        barretenberg::g1::jacobian_to_affine(
            barretenberg::scalar_multiplication::pippenger(
                polys[i].get_coefficients(), prover.key->reference_string.monomials, prover.n),
            verifier.SIGMA[i]);
    }

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
