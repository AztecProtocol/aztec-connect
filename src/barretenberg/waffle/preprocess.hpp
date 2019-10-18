#ifndef PREPROCESS_HPP
#define PREPROCESS_HPP

#include "../groups/scalar_multiplication.hpp"
#include "../types.hpp"

#include "./permutation.hpp"

#include "../groups/g1.hpp"
#include "../polynomials/polynomial.hpp"
#include "./prover.hpp"

#include "./widgets/widget_base.hpp"
#include "./widget_prover.hpp"
using namespace barretenberg;

namespace waffle
{
inline base_circuit_instance test_construct_instance(waffle::Prover &state)
{
    polynomial polys[3]{
        polynomial(state.n, state.n),
        polynomial(state.n, state.n),
        polynomial(state.n, state.n),    
    };

    // copy polynomials so that we don't mutate inputs
    compute_permutation_lagrange_base_single(polys[0], state.sigma_1_mapping, state.circuit_state.small_domain);
    compute_permutation_lagrange_base_single(polys[1], state.sigma_2_mapping, state.circuit_state.small_domain);
    compute_permutation_lagrange_base_single(polys[2], state.sigma_3_mapping, state.circuit_state.small_domain);

    for (size_t i = 0; i < 3; ++i)
    {
        polys[i].ifft(state.circuit_state.small_domain);
    }

    scalar_multiplication::multiplication_state mul_state[3]{
        { state.reference_string.monomials, polys[0].get_coefficients(), state.n, {} },
        { state.reference_string.monomials, polys[1].get_coefficients(), state.n, {} },
        { state.reference_string.monomials, polys[2].get_coefficients(), state.n, {} }
    };

    scalar_multiplication::batched_scalar_multiplications(mul_state, 3);
    base_circuit_instance instance;
    instance.n = state.n;
    g1::jacobian_to_affine(mul_state[0].output, instance.SIGMA_1);
    g1::jacobian_to_affine(mul_state[1].output, instance.SIGMA_2);
    g1::jacobian_to_affine(mul_state[2].output, instance.SIGMA_3);

    // TODO: this whole method should be part of the class that owns state.widgets
    for (size_t i = 0; i < state.widgets.size(); ++i)
    {
        instance.widget_verifiers.emplace_back(state.widgets[i]->compute_preprocessed_commitments(state.circuit_state.small_domain, state.reference_string));
    }
    return instance;
}

inline circuit_instance construct_instance(waffle::plonk_circuit_state &state)
{
    polynomial polys[8]{
        polynomial(state.n, state.n),
        polynomial(state.n, state.n),
        polynomial(state.n, state.n),
        polynomial(state.q_m),
        polynomial(state.q_l),
        polynomial(state.q_r),
        polynomial(state.q_o),
        polynomial(state.q_c),
    };

    // copy polynomials so that we don't mutate inputs
    compute_permutation_lagrange_base_single(polys[0], state.sigma_1_mapping, state.small_domain);
    compute_permutation_lagrange_base_single(polys[1], state.sigma_2_mapping, state.small_domain);
    compute_permutation_lagrange_base_single(polys[2], state.sigma_3_mapping, state.small_domain);

    for (size_t i = 0; i < 8; ++i)
    {
        polys[i].ifft(state.small_domain);
    }

    scalar_multiplication::multiplication_state mul_state[8];

    for (size_t i = 0; i < 8; ++i)
    {
        mul_state[i].num_elements = state.n;
        mul_state[i].points = state.reference_string.monomials;
        mul_state[i].scalars = polys[i].get_coefficients();
    }

    scalar_multiplication::batched_scalar_multiplications(mul_state, 8);

    circuit_instance instance;
    instance.n = state.n;
    g1::jacobian_to_affine(mul_state[0].output, instance.SIGMA_1);
    g1::jacobian_to_affine(mul_state[1].output, instance.SIGMA_2);
    g1::jacobian_to_affine(mul_state[2].output, instance.SIGMA_3);
    g1::jacobian_to_affine(mul_state[3].output, instance.Q_M);
    g1::jacobian_to_affine(mul_state[4].output, instance.Q_L);
    g1::jacobian_to_affine(mul_state[5].output, instance.Q_R);
    g1::jacobian_to_affine(mul_state[6].output, instance.Q_O);
    g1::jacobian_to_affine(mul_state[7].output, instance.Q_C);

    return instance;
}
} // namespace waffle

#endif