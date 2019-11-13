#include <gtest/gtest.h>

#include <barretenberg/io/io.hpp>
#include <barretenberg/waffle/waffle.hpp>
#include <barretenberg/waffle/preprocess.hpp>
#include <barretenberg/waffle/verifier.hpp>

namespace
{

using namespace barretenberg;

void generate_test_data(waffle::circuit_state &state, fr::field_t *data)
{
    size_t n = state.n;
    // state.small_domain = polynomials::evaluation_domain(n);
    // state.mid_domain = polynomials::evaluation_domain(2 * n);
    // state.large_domain = polynomials::evaluation_domain(4 * n);
    state.w_l = &data[0];
    state.w_r = &data[n];
    state.w_o = &data[2 * n];
    state.z_1 = &data[3 * n];
    state.z_2 = &data[4 * n + 1];
    state.q_c = &data[5 * n + 2];
    state.q_l = &data[6 * n + 2];
    state.q_r = &data[7 * n + 2];
    state.q_o = &data[8 * n + 2];
    state.q_m = &data[9 * n + 2];
    state.sigma_1 = &data[10 * n + 2];
    state.sigma_2 = &data[11 * n + 2];
    state.sigma_3 = &data[12 * n + 2];
    state.sigma_1_mapping = (uint32_t *)&data[13 * n + 2];
    state.sigma_2_mapping = (uint32_t *)((uintptr_t)&data[13 * n + 2] + (uintptr_t)(n * sizeof(uint32_t)));
    state.sigma_3_mapping = (uint32_t *)((uintptr_t)&data[13 * n + 2] + (uintptr_t)((2 * n) * sizeof(uint32_t)));
    state.t = &data[14 * n + 2];

    state.w_l_lagrange_base = state.t;
    state.w_r_lagrange_base = &state.t[n + 1];
    state.w_o_lagrange_base = &state.t[2 * n + 2];

    // create some constraints that satisfy our arithmetic circuit relation
    fr::field_t one;
    fr::field_t zero;
    fr::field_t minus_one;
    fr::one(one);
    fr::neg(one, minus_one);
    fr::zero(zero);
    fr::field_t T0;
    fr::field_t T1;
    fr::field_t T2;
    // even indices = mul gates, odd incides = add gates
    // make selector polynomials / wire values randomly distributed (subject to gate constraints)
    fr::field_t q_m_seed = fr::random_element();
    fr::field_t q_l_seed = fr::random_element();
    fr::field_t q_r_seed = fr::random_element();
    fr::field_t q_o_seed = fr::random_element();
    fr::field_t q_c_seed = fr::random_element();
    fr::field_t w_l_seed = fr::random_element();
    fr::field_t w_r_seed = fr::random_element();
    fr::field_t q_m_acc;
    fr::field_t q_l_acc;
    fr::field_t q_r_acc;
    fr::field_t q_o_acc;
    fr::field_t q_c_acc;
    fr::field_t w_l_acc;
    fr::field_t w_r_acc;
    fr::copy(q_m_seed, q_m_acc);
    fr::copy(q_l_seed, q_l_acc);
    fr::copy(q_r_seed, q_r_acc);
    fr::copy(q_o_seed, q_o_acc);
    fr::copy(q_c_seed, q_c_acc);
    fr::copy(w_l_seed, w_l_acc);
    fr::copy(w_r_seed, w_r_acc);

    for (size_t i = 0; i < n / 2; i += 2)
    {
        fr::copy(q_m_acc, state.q_m[i]);
        // fr::copy(fr::zero(), state.q_l[i]);
        // fr::copy(fr::zero(), state.q_r[i]);
        fr::copy(q_l_acc, state.q_l[i]);
        fr::copy(q_r_acc, state.q_r[i]);
        fr::copy(q_o_acc, state.q_o[i]);
        fr::copy(q_c_acc, state.q_c[i]);
        fr::copy(w_l_acc, state.w_l[i]);
        fr::copy(w_r_acc, state.w_r[i]);
        fr::copy(state.q_o[i], state.w_o[i]);

        fr::__mul(q_m_acc, q_m_seed, q_m_acc);
        fr::__mul(q_l_acc, q_l_seed, q_l_acc);
        fr::__mul(q_r_acc, q_r_seed, q_r_acc);
        fr::__mul(q_o_acc, q_o_seed, q_o_acc);
        fr::__mul(q_c_acc, q_c_seed, q_c_acc);
        fr::__mul(w_l_acc, w_l_seed, w_l_acc);
        fr::__mul(w_r_acc, w_r_seed, w_r_acc);

        // fr::copy(fr::zero(), state.q_m[i + 1]);
        fr::copy(q_m_acc, state.q_m[i + 1]);
        fr::copy(q_l_acc, state.q_l[i + 1]);
        fr::copy(q_r_acc, state.q_r[i + 1]);
        fr::copy(q_o_acc, state.q_o[i + 1]);
        fr::copy(q_c_acc, state.q_c[i + 1]);
        fr::copy(w_l_acc, state.w_l[i + 1]);
        fr::copy(w_r_acc, state.w_r[i + 1]);
        fr::copy(state.q_o[i + 1], state.w_o[i + 1]);

        fr::__mul(q_m_acc, q_m_seed, q_m_acc);
        fr::__mul(q_l_acc, q_l_seed, q_l_acc);
        fr::__mul(q_r_acc, q_r_seed, q_r_acc);
        fr::__mul(q_o_acc, q_o_seed, q_o_acc);
        fr::__mul(q_c_acc, q_c_seed, q_c_acc);
        fr::__mul(w_l_acc, w_l_seed, w_l_acc);
        fr::__mul(w_r_acc, w_r_seed, w_r_acc);
    }
    fr::field_t *scratch_mem = (fr::field_t *)(aligned_alloc(32, sizeof(fr::field_t) * n / 2));
    fr::batch_invert(state.w_o, n / 2, scratch_mem);
    aligned_free(scratch_mem);
    for (size_t i = 0; i < n / 2; ++i)
    {
        fr::__mul(state.q_l[i], state.w_l[i], T0);
        fr::__mul(state.q_r[i], state.w_r[i], T1);
        fr::__mul(state.w_l[i], state.w_r[i], T2);
        fr::__mul(T2, state.q_m[i], T2);
        fr::__add(T0, T1, T0);
        fr::__add(T0, T2, T0);
        fr::__add(T0, state.q_c[i], T0);
        fr::neg(T0, T0);
        fr::__mul(state.w_o[i], T0, state.w_o[i]);
    }
    size_t shift = n / 2;
    polynomials::copy_polynomial(state.w_l, state.w_l + shift, shift, shift);
    polynomials::copy_polynomial(state.w_r, state.w_r + shift, shift, shift);
    polynomials::copy_polynomial(state.w_o, state.w_o + shift, shift, shift);
    polynomials::copy_polynomial(state.q_m, state.q_m + shift, shift, shift);
    polynomials::copy_polynomial(state.q_l, state.q_l + shift, shift, shift);
    polynomials::copy_polynomial(state.q_r, state.q_r + shift, shift, shift);
    polynomials::copy_polynomial(state.q_o, state.q_o + shift, shift, shift);
    polynomials::copy_polynomial(state.q_c, state.q_c + shift, shift, shift);

    // create basic permutation - second half of witness vector is a copy of the first half
    for (size_t i = 0; i < n / 2; ++i)
    {
        state.sigma_1_mapping[shift + i] = (uint32_t)i;
        state.sigma_2_mapping[shift + i] = (uint32_t)i + (1U << 30U);
        state.sigma_3_mapping[shift + i] = (uint32_t)i + (1U << 31U);
        state.sigma_1_mapping[i] = (uint32_t)(i + shift);
        state.sigma_2_mapping[i] = (uint32_t)(i + shift) + (1U << 30U);
        state.sigma_3_mapping[i] = (uint32_t)(i + shift) + (1U << 31U);
    }

    fr::zero(state.w_l[n - 1]);
    fr::zero(state.w_r[n - 1]);
    fr::zero(state.w_o[n - 1]);
    fr::zero(state.q_c[n - 1]);
    fr::zero(state.w_l[shift - 1]);
    fr::zero(state.w_r[shift - 1]);
    fr::zero(state.w_o[shift - 1]);
    fr::zero(state.q_c[shift - 1]);
    fr::zero(state.q_m[shift - 1]);
    fr::zero(state.q_l[shift - 1]);
    fr::zero(state.q_r[shift - 1]);
    fr::zero(state.q_o[shift - 1]);
    // make last permutation the same as identity permutation
    state.sigma_1_mapping[shift - 1] = (uint32_t)shift - 1;
    state.sigma_2_mapping[shift - 1] = (uint32_t)shift - 1 + (1U << 30U);
    state.sigma_3_mapping[shift - 1] = (uint32_t)shift - 1 + (1U << 31U);
    state.sigma_1_mapping[n - 1] = (uint32_t)n - 1;
    state.sigma_2_mapping[n - 1] = (uint32_t)n - 1 + (1U << 30U);
    state.sigma_3_mapping[n - 1] = (uint32_t)n - 1 + (1U << 31U);

    fr::zero(state.q_l[n - 1]);
    fr::zero(state.q_r[n - 1]);
    fr::zero(state.q_o[n - 1]);
    fr::zero(state.q_m[n - 1]);
}
} // namespace

TEST(verifier, verifier)
{
    size_t n = 1 << 12;

    waffle::circuit_state state(n);
    // state.small_domain = polynomials::evaluation_domain(n);
    // state.mid_domain = polynomials::evaluation_domain(2 * n);
    // state.large_domain = polynomials::evaluation_domain(4 * n);

    state.n = n;

    fr::field_t *data = (fr::field_t *)(aligned_alloc(32, sizeof(fr::field_t) * (17 * n + 2)));
    generate_test_data(state, data);

    // load structured reference string from disk
    srs::plonk_srs srs;
    srs.degree = n;
    srs.monomials = (g1::affine_element *)(aligned_alloc(32, sizeof(g1::affine_element) * (2 * n + 2)));
    io::read_transcript(srs, BARRETENBERG_SRS_PATH);

    scalar_multiplication::generate_pippenger_point_table(srs.monomials, srs.monomials, n);

    // process circuit
    waffle::circuit_instance instance = waffle::preprocess_circuit(state, srs);

    // construct proof
    waffle::plonk_proof proof = waffle::construct_proof(state, srs);

    // verify proof
    bool result = waffle::verifier::verify_proof(proof, instance, srs.SRS_T2);

    EXPECT_EQ(result, true);
    aligned_free(data);
    aligned_free(srs.monomials);
}