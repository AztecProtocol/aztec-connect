#include <gtest/gtest.h>

#include <barretenberg/waffle/prover.hpp>
#include <barretenberg/waffle/preprocess.hpp>
#include <barretenberg/waffle/verifier.hpp>
#include <barretenberg/polynomials/polynomial_arithmetic.hpp>

namespace
{

using namespace barretenberg;

void generate_test_data(waffle::plonk_circuit_state& state)
{
    size_t n = state.n;
    // create some constraints that satisfy our arithmetic circuit relation
    fr::field_t one;
    fr::field_t zero;
    fr::field_t minus_one;
    fr::one(one);
    fr::__neg(one, minus_one);
    fr::zero(zero);
    fr::field_t T0;
    // even indices = mul gates, odd incides = add gates

    state.w_l.resize(n);
    state.w_r.resize(n);
    state.w_o.resize(n);
    state.q_m.resize(n);
    state.q_l.resize(n);
    state.q_r.resize(n);
    state.q_o.resize(n);
    state.q_c.resize(n);
    for (size_t i = 0; i < n / 4; ++i)
    {
        state.w_l.at(2 * i) = fr::random_element();
        state.w_r.at(2 * i) = fr::random_element();
        fr::__mul(state.w_l.at(2 * i), state.w_r.at(2 * i), state.w_o.at(2 * i));
        fr::copy(zero, state.q_l.at(2 * i));
        fr::copy(zero, state.q_r.at(2 * i));
        fr::copy(minus_one, state.q_o.at(2 * i));
        fr::copy(zero, state.q_c.at(2 * i));
        fr::copy(one, state.q_m.at(2 * i));

        state.w_l.at(2 * i + 1) = fr::random_element();
        state.w_r.at(2 * i + 1) = fr::random_element();
        state.w_o.at(2 * i + 1) = fr::random_element();

        fr::__add(state.w_l.at(2 * i + 1), state.w_r.at(2 * i + 1), T0);
        fr::__add(T0, state.w_o.at(2 * i + 1), state.q_c.at(2 * i + 1));
        fr::__neg(state.q_c.at(2 * i + 1), state.q_c.at(2 * i + 1));
        fr::one(state.q_l.at(2 * i + 1));
        fr::one(state.q_r.at(2 * i + 1));
        fr::one(state.q_o.at(2 * i + 1));
        fr::zero(state.q_m.at(2 * i + 1));
    }
    size_t shift = n / 2;
    polynomial_arithmetic::copy_polynomial(&state.w_l.at(0), &state.w_l.at(shift), shift, shift);
    polynomial_arithmetic::copy_polynomial(&state.w_r.at(0), &state.w_r.at(shift), shift, shift);
    polynomial_arithmetic::copy_polynomial(&state.w_o.at(0), &state.w_o.at(shift), shift, shift);
    polynomial_arithmetic::copy_polynomial(&state.q_m.at(0), &state.q_m.at(shift), shift, shift);
    polynomial_arithmetic::copy_polynomial(&state.q_l.at(0), &state.q_l.at(shift), shift, shift);
    polynomial_arithmetic::copy_polynomial(&state.q_r.at(0), &state.q_r.at(shift), shift, shift);
    polynomial_arithmetic::copy_polynomial(&state.q_o.at(0), &state.q_o.at(shift), shift, shift);
    polynomial_arithmetic::copy_polynomial(&state.q_c.at(0), &state.q_c.at(shift), shift, shift);

    // create basic permutation - second half of witness vector is a copy of the first half
    state.sigma_1_mapping.resize(n);
    state.sigma_2_mapping.resize(n);
    state.sigma_3_mapping.resize(n);

    // TODO REMOVE
    // for (size_t i = 0; i < n; ++i)
    // {
    //     state.sigma_1_mapping[i] = (uint32_t)(i);
    //     state.sigma_2_mapping[i] = (uint32_t)(i) + (1U << 30U);
    //     state.sigma_3_mapping[i] = (uint32_t)(i) + (1U << 31U);
    // }
    for (size_t i = 0; i < n / 2; ++i)
    {
        state.sigma_1_mapping[shift + i] = (uint32_t)i;
        state.sigma_2_mapping[shift + i] = (uint32_t)i + (1U << 30U);
        state.sigma_3_mapping[shift + i] = (uint32_t)i + (1U << 31U);
        state.sigma_1_mapping[i] = (uint32_t)(i + shift);
        state.sigma_2_mapping[i] = (uint32_t)(i + shift) + (1U << 30U);
        state.sigma_3_mapping[i] = (uint32_t)(i + shift) + (1U << 31U);
    }
    // make last permutation the same as identity permutation
    state.sigma_1_mapping[shift - 1] = (uint32_t)shift - 1;
    state.sigma_2_mapping[shift - 1] = (uint32_t)shift - 1 + (1U << 30U);
    state.sigma_3_mapping[shift - 1] = (uint32_t)shift - 1 + (1U << 31U);
    state.sigma_1_mapping[n - 1] = (uint32_t)n - 1;
    state.sigma_2_mapping[n - 1] = (uint32_t)n - 1 + (1U << 30U);
    state.sigma_3_mapping[n - 1] = (uint32_t)n - 1 + (1U << 31U);

    fr::zero(state.w_l.at(n-1));
    fr::zero(state.w_r.at(n-1));
    fr::zero(state.w_o.at(n-1));
    fr::zero(state.q_c.at(n-1));
    fr::zero(state.q_l.at(n - 1));
    fr::zero(state.q_r.at(n - 1));
    fr::zero(state.q_o.at(n - 1));
    fr::zero(state.q_m.at(n - 1));

    fr::zero(state.w_l.at(shift-1));
    fr::zero(state.w_r.at(shift-1));
    fr::zero(state.w_o.at(shift-1));
    fr::zero(state.q_c.at(shift-1));
}
}

TEST(verifier, verifier)
{
    size_t n = 1 << 14;

    waffle::plonk_circuit_state state(n);
    generate_test_data(state);

    waffle::circuit_instance instance = waffle::construct_instance(state);

    // construct proof
    waffle::plonk_proof proof = state.construct_proof();

    // verify proof
    bool result = waffle::verifier::verify_proof(proof, instance, state.reference_string.SRS_T2);

    EXPECT_EQ(result, true);
}