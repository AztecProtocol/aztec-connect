#ifndef PREPROCESS
#define PREPROCESS

#include "../groups/scalar_multiplication.hpp"
#include "../polynomials/polynomials.hpp"
#include "../types.hpp"

#include "./permutation.hpp"

#include <barretenberg/groups/g1.hpp>

using namespace barretenberg;

namespace waffle
{
inline circuit_instance preprocess_circuit(waffle::circuit_state& state, const srs::plonk_srs& srs)
{
    size_t n = state.n;

    fr::field_t* scratch_space = (fr::field_t*)(aligned_alloc(32, sizeof(fr::field_t) * (8 * state.n)));
    fr::field_t* roots = (fr::field_t*)aligned_alloc(32, sizeof(fr::field_t) * state.small_domain.size);

    fr::field_t* polys[8] = {&scratch_space[0],
                             &scratch_space[n],
                             &scratch_space[2 * n],
                             &scratch_space[3 * n],
                             &scratch_space[4 * n],
                             &scratch_space[5 * n],
                             &scratch_space[6 * n],
                             &scratch_space[7 * n]};

    fr::copy(fr::one(), roots[0]);
    for (size_t i = 1; i < state.small_domain.size; ++i)
    {
        fr::__mul(roots[i - 1], state.small_domain.root, roots[i]);
    }

    // copy polynomials so that we don't mutate inputs
    compute_permutation_lagrange_base(roots, polys[0], state.sigma_1_mapping, state.small_domain);
    compute_permutation_lagrange_base(roots, polys[1], state.sigma_2_mapping, state.small_domain);
    compute_permutation_lagrange_base(roots, polys[2], state.sigma_3_mapping, state.small_domain);
    polynomials::copy_polynomial(state.q_m, polys[3], n, n);
    polynomials::copy_polynomial(state.q_l, polys[4], n, n);
    polynomials::copy_polynomial(state.q_r, polys[5], n, n);
    polynomials::copy_polynomial(state.q_o, polys[6], n, n);
    polynomials::copy_polynomial(state.q_c, polys[7], n, n);

    for (size_t i = 0; i < 8; ++i)
    {
        polynomials::ifft(polys[i], state.small_domain);
    }

    scalar_multiplication::multiplication_state mul_state[8];

    for (size_t i = 0; i < 8; ++i)
    {
        mul_state[i].num_elements = n;
        mul_state[i].points = srs.monomials;
        mul_state[i].scalars = polys[i];
    }

    scalar_multiplication::batched_scalar_multiplications(mul_state, 8);

    circuit_instance instance;
    instance.n = n;
    g1::jacobian_to_affine(mul_state[0].output, instance.SIGMA_1);
    g1::jacobian_to_affine(mul_state[1].output, instance.SIGMA_2);
    g1::jacobian_to_affine(mul_state[2].output, instance.SIGMA_3);
    g1::jacobian_to_affine(mul_state[3].output, instance.Q_M);
    g1::jacobian_to_affine(mul_state[4].output, instance.Q_L);
    g1::jacobian_to_affine(mul_state[5].output, instance.Q_R);
    g1::jacobian_to_affine(mul_state[6].output, instance.Q_O);
    g1::jacobian_to_affine(mul_state[7].output, instance.Q_C);

    aligned_free(scratch_space);
    aligned_free(roots);
    return instance;
}
} // namespace waffle

#endif