#include <gtest/gtest.h>

#include <barretenberg/io/io.hpp>
#include <barretenberg/waffle/waffle.hpp>
#include <barretenberg/waffle/preprocess.hpp>
#include <barretenberg/waffle/verifier.hpp>

namespace
{

using namespace barretenberg;

void generate_test_data(waffle::circuit_state& state, fr::field_t* data)
{
    size_t n = state.n;

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
    // state.s_id = &data[13 * n + 2];
    state.t = &data[14 * n + 2];
    // state.sigma_1_mapping = (uint32_t*)&data[13 * n + 2];
    // state.sigma_2_mapping = (uint32_t*)((uintptr_t*)&data[13 * n + 2] + (n * sizeof(uint32_t)));
    // state.sigma_3_mapping = (uint32_t*)((uintptr_t*)&data[13 * n + 2] + ((2 * n) * sizeof(uint32_t)));
    state.sigma_1_mapping = (uint32_t*)&data[17 * n + 2];
    state.sigma_2_mapping = (uint32_t*)&data[18 * n + 2];
    state.sigma_3_mapping = (uint32_t*)&data[19 * n + 2];

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
    // even indices = mul gates, odd incides = add gates

    for (size_t i = 0; i < n / 4; ++i)
    {
        state.w_l[2 * i] = fr::random_element();
        state.w_r[2 * i] = fr::random_element();
        fr::mul(state.w_l[2 * i], state.w_r[2 * i], state.w_o[2 * i]);
        fr::copy(zero, state.q_l[2 * i]);
        fr::copy(zero, state.q_r[2 * i]);
        fr::copy(minus_one, state.q_o[2 * i]);
        fr::copy(zero, state.q_c[2 * i]);
        fr::copy(one, state.q_m[2 * i]);

        state.w_l[2 * i + 1] = fr::random_element();
        state.w_r[2 * i + 1] = fr::random_element();
        state.w_o[2 * i + 1] = fr::random_element();

        fr::add(state.w_l[2 * i + 1], state.w_r[2 * i + 1], T0);
        fr::add(T0, state.w_o[2 * i + 1], state.q_c[2 * i + 1]);
        fr::neg(state.q_c[2 * i + 1], state.q_c[2 * i + 1]);
        fr::one(state.q_l[2 * i + 1]);
        fr::one(state.q_r[2 * i + 1]);
        fr::one(state.q_o[2 * i + 1]);
        fr::zero(state.q_m[2 * i + 1]);
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


    fr::field_t T1 = { .data = { shift + 1, 0, 0, 0 } };
    fr::field_t n_mont = { .data = { n, 0, 0, 0 } } ;
    fr::one(T0);
    fr::to_montgomery_form(T1, T1);
    fr::to_montgomery_form(n_mont, n_mont);
    uint32_t tt0 = 0;
    uint32_t tt1 = (uint32_t)shift;

    for (size_t i = 0; i < n / 2; ++i)
    {
        state.sigma_1_mapping[shift + i] = tt0;
        state.sigma_2_mapping[shift + i] = tt0 + (1U << 30U);
        state.sigma_3_mapping[shift + i] = tt0 + (1U << 31U);
        // fr::copy(T0, state.sigma_1[shift + i]);
        // fr::copy(T0, state.sigma_2[shift + i]);
        // fr::copy(T0, state.sigma_3[shift + i]);

        // fr::add(state.sigma_2[shift + i], n_mont, state.sigma_2[shift + i]);
        // fr::add(state.sigma_3[shift + i], n_mont, state.sigma_3[shift + i]);
        // fr::add(state.sigma_3[shift + i], n_mont, state.sigma_3[shift + i]);

        state.sigma_1_mapping[i] = tt1;
        state.sigma_2_mapping[i] = tt1 + (1U << 30U);
        state.sigma_3_mapping[i] = tt1 + (1U << 31U);
        tt0 += 1;
        tt1 += 1;
        // fr::copy(T1, state.sigma_1[i]);
        // fr::copy(T1, state.sigma_2[i]);
        // fr::copy(T1, state.sigma_3[i]);

        // fr::add(state.sigma_2[i], n_mont, state.sigma_2[i]);
        // fr::add(state.sigma_3[i], n_mont, state.sigma_3[i]);
        // fr::add(state.sigma_3[i], n_mont, state.sigma_3[i]);

        // fr::add(T0, one, T0);
        // fr::add(T1, one, T1);
    }


    fr::zero(state.w_l[n-1]);
    fr::zero(state.w_r[n-1]);
    fr::zero(state.w_o[n-1]);
    fr::zero(state.q_c[n-1]);
    fr::zero(state.w_l[shift-1]);
    fr::zero(state.w_r[shift-1]);
    fr::zero(state.w_o[shift-1]);
    fr::zero(state.q_c[shift-1]);

    state.sigma_1_mapping[shift - 1] = (uint32_t)shift - 1;
    state.sigma_2_mapping[shift - 1] = (uint32_t)shift - 1 + (1U << 30U);
    state.sigma_3_mapping[shift - 1] = (uint32_t)shift - 1 + (1U << 31U);
    state.sigma_1_mapping[n - 1] = (uint32_t)n - 1;
    state.sigma_2_mapping[n - 1] = (uint32_t)n - 1 + (1U << 30U);
    state.sigma_3_mapping[n - 1] = (uint32_t)n - 1 + (1U << 31U);


    // for (size_t i = 0; i < n; ++i)
    // {
    //     state.sigma_1_mapping[i] = (uint32_t)i;
    //     state.sigma_2_mapping[i] = (uint32_t)i + (1U << 30U);
    //     state.sigma_3_mapping[i] = (uint32_t)i + (1U << 31U);
    // }
    // fr::field_t T2 = { .data = { shift, 0, 0, 0 } };
    // fr::to_montgomery_form(T2, T2);
    // fr::copy(T2, state.sigma_1[shift-1]);
    // fr::copy(T2, state.sigma_2[shift-1]);
    // fr::copy(T2, state.sigma_3[shift-1]);
    // fr::add(state.sigma_2[shift-1], n_mont, state.sigma_2[shift-1]);
    // fr::add(state.sigma_3[shift-1], n_mont, state.sigma_3[shift-1]);
    // fr::add(state.sigma_3[shift-1], n_mont, state.sigma_3[shift-1]);

    // fr::zero(state.sigma_1[n-1]);
    // fr::zero(state.sigma_2[n-1]);
    // fr::zero(state.sigma_3[n-1]);

    fr::zero(state.q_l[n - 1]);
    fr::zero(state.q_r[n - 1]);
    fr::zero(state.q_o[n - 1]);
    fr::zero(state.q_m[n - 1]);

    fr::field_t* roots = (fr::field_t*)aligned_alloc(32, sizeof(fr::field_t) * state.small_domain.size);

    fr::copy(fr::one(), roots[0]);
    for (size_t i = 1; i < state.small_domain.size; ++i)
    {
        fr::mul(roots[i-1], state.small_domain.root, roots[i]);
    }

    waffle::compute_permutation_lagrange_base(roots, state.sigma_3, state.sigma_3_mapping, state.small_domain.size);
    waffle::compute_permutation_lagrange_base(roots, state.sigma_2, state.sigma_2_mapping, state.small_domain.size);
    waffle::compute_permutation_lagrange_base(roots, state.sigma_1, state.sigma_1_mapping, state.small_domain.size);

    free(roots);
}
}

TEST(verifier, verifier)
{
    size_t n = 1 << 12;

    waffle::circuit_state state;
    state.small_domain = polynomials::get_domain(n);
    state.mid_domain = polynomials::get_domain(2 * n);
    state.large_domain = polynomials::get_domain(4 * n);

    state.n = n;

    fr::field_t* data = (fr::field_t*)(aligned_alloc(32, sizeof(fr::field_t) * (20 * n + 2)));
    generate_test_data(state, data);

    // load structured reference string from disk
    srs::plonk_srs srs;
    srs.degree = 3 * n;
    srs.monomials = (g1::affine_element*)(aligned_alloc(32, sizeof(g1::affine_element) * (6 * n + 2)));
    io::read_transcript(srs, "../srs_db/transcript.dat");

    scalar_multiplication::generate_pippenger_point_table(srs.monomials, srs.monomials, 3 * n);

    // process circuit
    waffle::circuit_instance instance = waffle::preprocess_circuit(state, srs);

    // construct proof
    waffle::plonk_proof proof = waffle::construct_proof(state, srs);

    // verify proof
    bool result = waffle::verifier::verify_proof(proof, instance, srs.SRS_T2);

    EXPECT_EQ(result, true);
    free(data);
    free(srs.monomials);
}