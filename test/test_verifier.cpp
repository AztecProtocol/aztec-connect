#include <gtest/gtest.h>

#include <barretenberg/waffle/waffle.hpp>
#include <barretenberg/waffle/preprocess.hpp>
#include <barretenberg/waffle/verifier.hpp>

namespace
{

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
    state.s_id = &data[13 * n + 2];
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
    for (size_t i = 0; i < n / 2; ++i)
    {
        fr::copy(T0, state.sigma_1[shift + i]);
        fr::copy(T0, state.sigma_2[shift + i]);
        fr::copy(T0, state.sigma_3[shift + i]);

        fr::add(state.sigma_2[shift + i], n_mont, state.sigma_2[shift + i]);
        fr::add(state.sigma_3[shift + i], n_mont, state.sigma_3[shift + i]);
        fr::add(state.sigma_3[shift + i], n_mont, state.sigma_3[shift + i]);

        fr::copy(T1, state.sigma_1[i]);
        fr::copy(T1, state.sigma_2[i]);
        fr::copy(T1, state.sigma_3[i]);

        fr::add(state.sigma_2[i], n_mont, state.sigma_2[i]);
        fr::add(state.sigma_3[i], n_mont, state.sigma_3[i]);
        fr::add(state.sigma_3[i], n_mont, state.sigma_3[i]);

        fr::add(T0, one, T0);
        fr::add(T1, one, T1);
    }

    fr::zero(state.w_l[n-1]);
    fr::zero(state.w_r[n-1]);
    fr::zero(state.w_o[n-1]);
    fr::zero(state.q_c[n-1]);
    fr::zero(state.w_l[shift-1]);
    fr::zero(state.w_r[shift-1]);
    fr::zero(state.w_o[shift-1]);
    fr::zero(state.q_c[shift-1]);

    fr::field_t T2 = { .data = { shift, 0, 0, 0 } };
    fr::to_montgomery_form(T2, T2);
    fr::copy(T2, state.sigma_1[shift-1]);
    fr::copy(T2, state.sigma_2[shift-1]);
    fr::copy(T2, state.sigma_3[shift-1]);
    fr::add(state.sigma_2[shift-1], n_mont, state.sigma_2[shift-1]);
    fr::add(state.sigma_3[shift-1], n_mont, state.sigma_3[shift-1]);
    fr::add(state.sigma_3[shift-1], n_mont, state.sigma_3[shift-1]);

    fr::zero(state.sigma_1[n-1]);
    fr::zero(state.sigma_2[n-1]);
    fr::zero(state.sigma_3[n-1]);
    fr::zero(state.q_l[n - 1]);
    fr::zero(state.q_r[n - 1]);
    fr::zero(state.q_o[n - 1]);
    fr::zero(state.q_m[n - 1]);

    // fr::zero(state.q_c[n-1]);
}
}

TEST(verifier, verifier)
{
    size_t n = 1 << 10;

    waffle::circuit_state state;
    state.small_domain = polynomials::get_domain(n);
    state.mid_domain = polynomials::get_domain(2 * n);
    state.large_domain = polynomials::get_domain(4 * n);

    state.n = n;

    fr::field_t* data = (fr::field_t*)(aligned_alloc(32, sizeof(fr::field_t) * (17 * n + 2)));
    fr::field_t* scratch_space = (fr::field_t*)(aligned_alloc(32, sizeof(fr::field_t) * (22 * n + 8)));
    g1::affine_element* monomials = (g1::affine_element*)(aligned_alloc(32, sizeof(g1::affine_element) * (6 * n + 2)));

    waffle::fft_pointers ffts;
    ffts.scratch_memory = scratch_space;
    generate_test_data(state, data);

    fr::field_t x = fr::random_element();
    srs::plonk_srs srs;
    monomials[0] = g1::affine_one();
    for (size_t i = 1; i < 3 * n; ++i)
    {
        monomials[i] = g1::group_exponentiation(monomials[i-1], x);
    }
    scalar_multiplication::generate_pippenger_point_table(monomials, monomials, 3 * n);
    srs.monomials = monomials;
    srs.degree = n;

    srs.SRS_T2 = g2::group_exponentiation(g2::affine_one(), x);

    waffle::circuit_instance instance = waffle::preprocess_circuit(state, srs);
    waffle::plonk_proof proof = waffle::construct_proof(state, ffts, srs);
    bool result = waffle::verifier::verify_proof(proof, instance, srs.SRS_T2);

    EXPECT_EQ(result, true);

    free(scratch_space);
    free(data);
    free(monomials);
}