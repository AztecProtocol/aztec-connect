#ifndef PREPROCESS_HPP
#define PREPROCESS_HPP

#include "../../groups/scalar_multiplication.hpp"
#include "../../types.hpp"

#include "./permutation.hpp"

#include "../../groups/g1.hpp"
#include "../../polynomials/polynomial.hpp"

#include "./widgets/base_widget.hpp"
#include "./prover/prover.hpp"

namespace waffle
{
inline base_circuit_instance compute_instance(waffle::Prover &state)
{
    barretenberg::polynomial polys[3]{
        barretenberg::polynomial(state.n, state.n),
        barretenberg::polynomial(state.n, state.n),
        barretenberg::polynomial(state.n, state.n),    
    };

    // copy polynomials so that we don't mutate inputs
    compute_permutation_lagrange_base_single(polys[0], state.sigma_1_mapping, state.circuit_state.small_domain);
    compute_permutation_lagrange_base_single(polys[1], state.sigma_2_mapping, state.circuit_state.small_domain);
    compute_permutation_lagrange_base_single(polys[2], state.sigma_3_mapping, state.circuit_state.small_domain);

    for (size_t i = 0; i < 3; ++i)
    {
        polys[i].ifft(state.circuit_state.small_domain);
    }

    barretenberg::scalar_multiplication::multiplication_state mul_state[3]{
        { state.reference_string.monomials, polys[0].get_coefficients(), state.n, {} },
        { state.reference_string.monomials, polys[1].get_coefficients(), state.n, {} },
        { state.reference_string.monomials, polys[2].get_coefficients(), state.n, {} }
    };

    barretenberg::scalar_multiplication::batched_scalar_multiplications(mul_state, 3);
    base_circuit_instance instance;
    instance.n = state.n;
    barretenberg::g1::jacobian_to_affine(mul_state[0].output, instance.SIGMA_1);
    barretenberg::g1::jacobian_to_affine(mul_state[1].output, instance.SIGMA_2);
    barretenberg::g1::jacobian_to_affine(mul_state[2].output, instance.SIGMA_3);

    // TODO: this whole method should be part of the class that owns state.widgets
    for (size_t i = 0; i < state.widgets.size(); ++i)
    {
        instance.verifiers.emplace_back(state.widgets[i]->compute_preprocessed_commitments(state.circuit_state.small_domain, state.reference_string));
    }
    return instance;
}

} // namespace waffle

#endif