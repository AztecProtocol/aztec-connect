#pragma once

#include "../polynomials/polynomials.hpp"
#include "../groups/scalar_multiplication.hpp"

#include "../types.hpp"
namespace waffle
{
inline circuit_instance preprocess_circuit(const waffle::circuit_state& state, const srs::plonk_srs &srs)
{
    size_t n = state.n;
    
    fr::field_t* scratch_space = (fr::field_t*)(aligned_alloc(32, sizeof(fr::field_t) * (9 * state.n)));

    fr::field_t* polys[9] = {
        &scratch_space[0],
        &scratch_space[n],
        &scratch_space[2*n],
        &scratch_space[3*n],
        &scratch_space[4*n],
        &scratch_space[5*n],
        &scratch_space[6*n],
        &scratch_space[7*n],
        &scratch_space[8*n]
    };

    // polynomials::evaluation_domain domain = polynomials::get_domain(n);

    // TODO: optimize this!
    fr::one(state.s_id[0]);
    fr::field_t one;
    fr::one(one);
    for (size_t i = 1; i < state.n - 1; ++i)
    {
        fr::add(state.s_id[i - 1], one, state.s_id[i]);
    }
    fr::zero(state.s_id[state.n - 1]);

    // copy polynomials so that we don't mutate inputs
    polynomials::copy_polynomial(state.sigma_1, polys[0], n, n);
    polynomials::copy_polynomial(state.sigma_2, polys[1], n, n);
    polynomials::copy_polynomial(state.sigma_3, polys[2], n, n);
    polynomials::copy_polynomial(state.s_id, polys[3], n, n);
    polynomials::copy_polynomial(state.q_m, polys[4], n, n);
    polynomials::copy_polynomial(state.q_l, polys[5], n, n);
    polynomials::copy_polynomial(state.q_r, polys[6], n, n);
    polynomials::copy_polynomial(state.q_o, polys[7], n, n);
    polynomials::copy_polynomial(state.q_c, polys[8], n, n);


    for (size_t i = 0; i < 9; ++i)
    {
        polynomials::ifft(polys[i], state.small_domain);
    }

    scalar_multiplication::multiplication_state mul_state[9];

    for (size_t i = 0; i < 9; ++i)
    {
        mul_state[i].num_elements = n;
        mul_state[i].points = srs.monomials;
        mul_state[i].scalars = polys[i];
    }
    
    
    for (size_t i = 0; i < 9; ++i)
    {
        mul_state[i].output = scalar_multiplication::pippenger(mul_state[i].scalars, srs.monomials, n);
    }

    circuit_instance instance;
    instance.n = n;
    g1::copy_to_affine(mul_state[0].output, instance.SIGMA_1);
    g1::copy_to_affine(mul_state[1].output, instance.SIGMA_2);
    g1::copy_to_affine(mul_state[2].output, instance.SIGMA_3);
    g1::copy_to_affine(mul_state[3].output, instance.S_ID);
    g1::copy_to_affine(mul_state[4].output, instance.Q_M);
    g1::copy_to_affine(mul_state[5].output, instance.Q_L);
    g1::copy_to_affine(mul_state[6].output, instance.Q_R);
    g1::copy_to_affine(mul_state[7].output, instance.Q_O);
    g1::copy_to_affine(mul_state[8].output, instance.Q_C);

    free(scratch_space);
    return instance;
}
}