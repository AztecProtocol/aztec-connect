#include <gtest/gtest.h>

#include <barretenberg/waffle/waffle.hpp>


void generate_test_data(waffle::circuit_state& state, fr::field_t* data)
{
    size_t n = state.n;

    state.w_l = &data[0];
    state.w_r = &data[n];
    state.w_o = &data[2 * n];
    state.z_1 = &data[3 * n];
    state.z_2 = &data[4 * n];
    state.t = &data[5 * n];
    state.q_c = &data[8 * n];
    state.q_l = &data[9 * n];
    state.q_r = &data[10 * n];
    state.q_o = &data[11 * n];
    state.q_m = &data[12 * n];
    state.sigma_1 = &data[13 * n];
    state.sigma_2 = &data[14 * n];
    state.sigma_3 = &data[15 * n];
    state.s_id = &data[16 * n];
    state.product_1 = &data[17 * n];
    state.product_2 = &data[18 * n];
    state.product_3 = &data[19 * n];
    state.w_l_lagrange_base = state.t;
    state.w_r_lagrange_base = &state.t[n];
    state.w_o_lagrange_base = &state.t[2 * n];

    fr::random_element(state.beta);
    fr::random_element(state.gamma);
    fr::random_element(state.alpha);
    fr::sqr(state.alpha, state.alpha_squared);
    fr::mul(state.alpha_squared, state.alpha, state.alpha_cubed);
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
        fr::random_element(state.w_l[2 * i]);
        fr::random_element(state.w_r[2 * i]);
        fr::mul(state.w_l[2 * i], state.w_r[2 * i], state.w_o[2 * i]);
        fr::copy(zero, state.q_l[2 * i]);
        fr::copy(zero, state.q_r[2 * i]);
        fr::copy(minus_one, state.q_o[2 * i]);
        fr::copy(zero, state.q_c[2 * i]);
        fr::copy(one, state.q_m[2 * i]);

        fr::random_element(state.w_l[2 * i + 1]);
        fr::random_element(state.w_r[2 * i + 1]);
        fr::random_element(state.w_o[2 * i + 1]);

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

}

TEST(waffle, compute_z_coefficients)
{
    size_t n = 16;
    polynomials::evaluation_domain domain = polynomials::get_domain(n);

    fr::field_t data[15 * n];
    waffle::circuit_state state;

    state.w_l = &data[0];
    state.w_r = &data[n];
    state.w_o = &data[2 * n];
    state.z_1 = &data[3 * n];
    state.z_2 = &data[4 * n];
    state.sigma_1 = &data[5 * n];
    state.sigma_2 = &data[6 * n];
    state.sigma_3 = &data[7 * n];
    state.s_id = &data[8 * n];
    state.product_1 = &data[9 * n];
    state.product_2 = &data[10 * n];
    state.product_3 = &data[11 * n];
    state.w_l_lagrange_base = &data[12 * n];
    state.w_r_lagrange_base = &data[13 * n];
    state.w_o_lagrange_base = &data[14 * n];
    state.n = n;

    fr::one(state.gamma);
    fr::add(state.gamma, state.gamma, state.beta);

    fr::field_t i_mont;
    fr::field_t one;
    fr::zero(i_mont);
    fr::one(one);
    for (size_t i = 0; i < n; ++i)
    {
        fr::copy(i_mont, state.w_l[i]);
        fr::copy(state.w_l[i], state.w_l_lagrange_base[i]);
        fr::add(state.w_l[i], state.w_l[i], state.w_r[i]);
        fr::copy(state.w_r[i], state.w_r_lagrange_base[i]);
        fr::add(state.w_l[i], state.w_r[i], state.w_o[i]);
        fr::copy(state.w_o[i], state.w_o_lagrange_base[i]);
        fr::add(i_mont, one, i_mont);

        fr::one(state.sigma_1[i]);
        fr::add(state.sigma_1[i], state.sigma_1[i], state.sigma_2[i]);
        fr::add(state.sigma_1[i], state.sigma_2[i], state.sigma_3[i]);
    }

    fr::field_t scratch_space[8 * n + 4];
    waffle::fft_pointers ffts;
    ffts.z_1_poly = &scratch_space[0];
    ffts.z_2_poly = &scratch_space[4 * n + 4];
    waffle::compute_z_coefficients(state, domain, ffts);

    size_t z_1_evaluations[n];
    size_t z_2_evaluations[n];
    z_1_evaluations[0] = 1;
    z_2_evaluations[0] = 1;
    for (size_t i = 0; i < n - 1; ++i)
    {
        uint64_t product_1 = i + 3;
        uint64_t product_2 = (2 * i) + 5;
        uint64_t product_3 = (3 * i) + 7;

        uint64_t s_id = i + 1;
        uint64_t id_1 = i + (2 * s_id) + 1;
        uint64_t id_2 = (2 * i) + (2 * s_id) + 1 + (2 * n);
        uint64_t id_3 = (3 * i) + (2 * s_id) + 1 + (4 * n);
        uint64_t id_product = id_1 * id_2 * id_3;
        uint64_t sigma_product = product_1 * product_2 * product_3;

        z_1_evaluations[i + 1] = z_1_evaluations[i] * id_product;
        z_2_evaluations[i + 1] = z_2_evaluations[i] * sigma_product;
        fr::field_t product_1_result;
        fr::field_t product_2_result;
        fr::field_t product_3_result;
        fr::from_montgomery_form(state.product_1[i], product_1_result);
        fr::from_montgomery_form(state.product_2[i], product_2_result);
        fr::from_montgomery_form(state.product_3[i], product_3_result);
        EXPECT_EQ(product_1_result.data[0], product_1);
        EXPECT_EQ(product_2_result.data[0], product_2);
        EXPECT_EQ(product_3_result.data[0], product_3);
    }

    fr::field_t work_root;
    fr::field_t z_1_expected;
    fr::field_t z_2_expected;
    fr::one(work_root);

    for (size_t i = 0; i < n; ++i)
    {
        polynomials::eval(state.z_1, work_root, n, z_1_expected);
        polynomials::eval(state.z_2, work_root, n, z_2_expected);
        fr::from_montgomery_form(z_1_expected, z_1_expected);
        fr::from_montgomery_form(z_2_expected, z_2_expected);
        fr::mul(work_root, domain.short_root, work_root);
        EXPECT_EQ(z_1_expected.data[0], z_1_evaluations[i]);
        EXPECT_EQ(z_2_expected.data[0], z_2_evaluations[i]);
    }
}

TEST(waffle, compute_wire_commitments)
{
    size_t n = 256;
    fr::field_t data[12 * n];

    polynomials::evaluation_domain domain = polynomials::get_domain(n);
    waffle::circuit_state state;

    state.w_l = &data[0];
    state.w_r = &data[n];
    state.w_o = &data[2 * n];
    state.z_1 = &data[6 * n];
    state.z_2 = &data[7 * n];
    state.t = &data[8 * n];
    state.sigma_1 = &data[3 * n];
    state.sigma_2 = &data[4 * n];
    state.sigma_3 = &data[5 * n];
    state.w_l_lagrange_base = &data[9 * n];
    state.w_r_lagrange_base = &data[10 * n];
    state.w_o_lagrange_base = &data[11 * n];
    state.n = n;

    fr::field_t w_l_reference[n];
    fr::field_t w_r_reference[n];
    fr::field_t w_o_reference[n];
    fr::field_t i_mont;
    fr::field_t one;
    fr::zero(i_mont);
    fr::one(one);
    for (size_t i = 0; i < n; ++i)
    {
        fr::copy(i_mont, state.w_l[i]);
        fr::add(state.w_l[i], state.w_l[i], state.w_r[i]);
        fr::add(state.w_l[i], state.w_r[i], state.w_o[i]);
        fr::add(i_mont, one, i_mont);

        fr::one(state.sigma_1[i]);
        fr::add(state.sigma_1[i], state.sigma_1[i], state.sigma_2[i]);
        fr::add(state.sigma_1[i], state.sigma_2[i], state.sigma_3[i]);

        fr::copy(state.w_l[i], w_l_reference[i]);
        fr::copy(state.w_r[i], w_r_reference[i]);
        fr::copy(state.w_o[i], w_o_reference[i]);
    }

    fr::field_t scratch_space[24 * n + 8];
    waffle::fft_pointers ffts;
    ffts.w_l_poly = &scratch_space[0];
    ffts.w_r_poly = &scratch_space[4 * n];
    ffts.w_o_poly = &scratch_space[8 * n];
    ffts.identity_poly = &scratch_space[12 * n];
    ffts.z_1_poly = &scratch_space[16 * n];
    ffts.z_2_poly = &scratch_space[20 * n + 4];
    waffle::compute_wire_coefficients(state, domain, ffts);

    fr::field_t work_root;
    fr::field_t w_l_expected;
    fr::field_t w_r_expected;
    fr::field_t w_o_expected;
    fr::one(work_root);

    for (size_t i = 0; i < n; ++i)
    {
        polynomials::eval(state.w_l, work_root, n, w_l_expected);
        polynomials::eval(state.w_r, work_root, n, w_r_expected);
        polynomials::eval(state.w_o, work_root, n, w_o_expected);
        fr::mul(work_root, domain.short_root, work_root);
        for (size_t j = 0; j < 4; ++j)
        {
            EXPECT_EQ(w_l_reference[i].data[j], w_l_expected.data[j]);
            EXPECT_EQ(w_r_reference[i].data[j], w_r_expected.data[j]);
            EXPECT_EQ(w_o_reference[i].data[j], w_o_expected.data[j]);
        }
    }
}

TEST(waffle, compute_identity_grand_product_coefficients)
{
    size_t n = 16;
    polynomials::evaluation_domain domain = polynomials::get_domain(n);

    // can make clearer comparisons if we remove generator for this test
    fr::one(domain.generator);
    fr::one(domain.generator_inverse);
    fr::field_t data[13 * n];
    waffle::circuit_state state;

    state.w_l = &data[0];
    state.w_r = &data[n];
    state.w_o = &data[2 * n];
    state.z_1 = &data[6 * n];
    state.z_2 = &data[7 * n];
    state.t = &data[8 * n];
    state.sigma_1 = &data[3 * n];
    state.sigma_2 = &data[4 * n];
    state.sigma_3 = &data[5 * n];
    state.s_id = &data[6 * n];
    state.product_1 = &data[7 * n];
    state.product_2 = &data[8 * n];
    state.product_3 = &data[9 * n];
    state.w_l_lagrange_base = &data[10 * n];
    state.w_r_lagrange_base = &data[11 * n];
    state.w_o_lagrange_base = &data[12 * n];

    state.n = n;

    fr::one(state.gamma);
    fr::add(state.gamma, state.gamma, state.beta);
    fr::copy(state.gamma, state.alpha);
    fr::field_t i_mont;
    fr::field_t one;
    fr::zero(i_mont);
    fr::one(one);
    for (size_t i = 0; i < n; ++i)
    {
        fr::copy(i_mont, state.w_l[i]);
        fr::add(state.w_l[i], state.w_l[i], state.w_r[i]);
        fr::add(state.w_l[i], state.w_r[i], state.w_o[i]);
        fr::add(i_mont, one, i_mont);

        fr::one(state.sigma_1[i]);
        fr::add(state.sigma_1[i], state.sigma_1[i], state.sigma_2[i]);
        fr::add(state.sigma_1[i], state.sigma_2[i], state.sigma_3[i]);
    }

    fr::field_t scratch_space[24 * n + 8];

    waffle::fft_pointers ffts;
    ffts.w_l_poly = &scratch_space[0];
    ffts.w_r_poly = &scratch_space[4 * n];
    ffts.w_o_poly = &scratch_space[8 * n];
    ffts.identity_poly = &scratch_space[12 * n];
    ffts.z_1_poly = &scratch_space[16 * n];
    ffts.z_2_poly = &scratch_space[20 * n + 4];
    waffle::compute_wire_coefficients(state, domain, ffts);
    waffle::compute_z_coefficients(state, domain, ffts);

    waffle::compute_identity_grand_product_coefficients(state, domain, ffts);

    fr::field_t *identity_poly = &scratch_space[12 * n];

    for (size_t i = 0; i < n; ++i)
    {
        uint64_t s_id = i + 1;
        uint64_t id_1 = i + (2 * s_id) + 1;
        uint64_t id_2 = (2 * i) + (2 * s_id) + 1 + (2 * n);
        uint64_t id_3 = (3 * i) + (2 * s_id) + 1 + (4 * n);
        uint64_t id_product = id_1 * id_2 * id_3;

        size_t index = 4 * i;
        fr::field_t result;
        fr::from_montgomery_form(identity_poly[index], result);
        EXPECT_EQ(result.data[0], id_product);
    }
}

TEST(waffle, compute_arithmetisation_coefficients)
{
    size_t n = 256 * 8;

    fr::field_t w_l_copy[n];
    fr::field_t w_r_copy[n];
    fr::field_t w_o_copy[n];

    fr::field_t data[20 * n];
    waffle::circuit_state state;

    state.n = n;
    // create some constraints that satisfy our arithmetic circuit relation
    generate_test_data(state, data);

    polynomials::copy_polynomial(state.w_l, w_l_copy, n, n);
    polynomials::copy_polynomial(state.w_r, w_r_copy, n, n);
    polynomials::copy_polynomial(state.w_o, w_o_copy, n, n);


    // sanity check that our constraints equal zero
    fr::field_t a;
    fr::field_t b;
    for (size_t i = 0; i < n; ++i)
    {
        fr::mul(state.w_l[i], state.w_r[i], a);
        fr::mul(a, state.q_m[i], a);

        fr::mul(state.w_l[i], state.q_l[i], b);
        fr::add(a, b, a);

        fr::mul(state.w_r[i], state.q_r[i], b);
        fr::add(a, b, a);

        fr::mul(state.w_o[i], state.q_o[i], b);
        fr::add(a, b, a);

        fr::add(a, state.q_c[i], a);

        EXPECT_EQ(a.data[0], 0);
        EXPECT_EQ(a.data[1], 0);
        EXPECT_EQ(a.data[2], 0);
        EXPECT_EQ(a.data[3], 0);
    }

    polynomials::evaluation_domain domain = polynomials::get_domain(n);

    // can make clearer comparisons if we remove generator for this test
    fr::one(domain.generator);
    fr::one(domain.generator_inverse);


    fr::field_t scratch_space[32 * n + 8];

    waffle::fft_pointers ffts;
    ffts.scratch_memory = scratch_space;
    ffts.w_l_poly = &ffts.scratch_memory[0];
    ffts.w_r_poly = &ffts.scratch_memory[4 * n];
    ffts.w_o_poly = &ffts.scratch_memory[8 * n];
    ffts.identity_poly = &ffts.scratch_memory[12 * n];
    ffts.gate_poly_long = &ffts.scratch_memory[16 * n];
    ffts.z_1_poly = &ffts.scratch_memory[20 * n];
    ffts.z_2_poly = &ffts.scratch_memory[24 * n + 4];
    ffts.gate_poly_mid = &ffts.scratch_memory[28 * n + 8];

    ffts.q_c_poly = ffts.w_o_poly;
    ffts.q_r_poly = ffts.w_o_poly;
    ffts.q_l_poly = ffts.w_o_poly + domain.mid_domain;
    ffts.gate_poly_long = ffts.w_o_poly;
    waffle::compute_wire_coefficients(state, domain, ffts);

    waffle::compute_z_coefficients(state, domain, ffts);

    waffle::compute_identity_grand_product_coefficients(state, domain, ffts);

    // fr::field_t* ffts.w_l_poly = &scratch_space[0];
    // fr::field_t* w_r_poly = &scratch_space[4 * n];
    // fr::field_t* w_o_poly = &scratch_space[8 * n];
    // fr::field_t* gate_poly_mid = &scratch_space[16 * n];

    // are ffts.w_l_poly, w_r_poly, w_o_poly computed correctly?
    for (size_t i = 0; i < n; ++i)
    {
        for (size_t j = 0; j < 4; ++j)
        {
            EXPECT_EQ(ffts.w_l_poly[4 * i].data[j], w_l_copy[i].data[j]);
            EXPECT_EQ(ffts.w_r_poly[4 * i].data[j], w_r_copy[i].data[j]);
            EXPECT_EQ(ffts.w_o_poly[4 * i].data[j], w_o_copy[i].data[j]);
        }
    }

    // compute arithmetisation coefficients - split into 2 polynomials
    // w_o_poly contains coefficients of 4n fourier transform
    // gate_poly_mid contains coefficients of 2n fourier transform
    waffle::compute_arithmetisation_coefficients(state, domain, ffts);
    polynomials::ifft_with_coset(ffts.gate_poly_mid, domain.mid_root_inverse, domain.generator_inverse, domain.mid_domain);

    fr::field_t eval_space[4 * n];

    polynomials::copy_polynomial(ffts.gate_poly_mid, eval_space, 2 * n, 4 * n);
    polynomials::fft_with_coset(eval_space, domain.long_root, domain.generator, domain.long_domain);

    for (size_t i = 0; i < (4 * n); ++i)
    {
        fr::add(ffts.gate_poly_long[i], eval_space[i], ffts.gate_poly_long[i]);
    }

    polynomials::ifft_with_coset(ffts.gate_poly_long, domain.long_root_inverse, domain.generator_inverse, domain.long_domain);
    polynomials::fft(ffts.gate_poly_long, domain.long_root, domain.long_domain);

    fr::field_t *result = ffts.gate_poly_long;
    // check that all subgroup evaluations are zero
    for (size_t i = 0; i < n; ++i)
    {
        EXPECT_EQ(result[4 * i].data[0], 0);
        EXPECT_EQ(result[4 * i].data[1], 0);
        EXPECT_EQ(result[4 * i].data[2], 0);
        EXPECT_EQ(result[4 * i].data[3], 0);
    }
}

TEST(waffle, concatenate_arithmetic_and_identity_coefficients)
{
    size_t n = 256;
    polynomials::evaluation_domain domain = polynomials::get_domain(n);

    waffle::circuit_state state;
    state.n = n;
    fr::random_element(state.beta);
    fr::random_element(state.gamma);
    fr::random_element(state.alpha);
    fr::field_t data[20 * n];

    fr::field_t scratch_space[35 * n + 8];

    waffle::fft_pointers ffts;
    ffts.scratch_memory = scratch_space;
    ffts.w_l_poly = &ffts.scratch_memory[0];
    ffts.w_r_poly = &ffts.scratch_memory[4 * n];
    ffts.w_o_poly = &ffts.scratch_memory[8 * n];
    ffts.identity_poly = &ffts.scratch_memory[12 * n];
    ffts.gate_poly_long = &ffts.scratch_memory[16 * n];
    ffts.z_1_poly = &ffts.scratch_memory[20 * n];
    ffts.z_2_poly = &ffts.scratch_memory[24 * n + 4];
    ffts.gate_poly_mid = &ffts.scratch_memory[29 * n + 8];

    ffts.q_c_poly = ffts.w_o_poly;
    ffts.q_r_poly = ffts.w_o_poly;
    ffts.q_l_poly = ffts.w_o_poly + domain.mid_domain;
    ffts.gate_poly_long = ffts.w_o_poly;
    ffts.quotient_poly = ffts.identity_poly;

    generate_test_data(state, data);

    waffle::compute_wire_coefficients(state, domain, ffts);

    waffle::compute_z_coefficients(state, domain, ffts);

    waffle::compute_identity_grand_product_coefficients(state, domain, ffts);

    fr::field_t eval_space[20 * n];

    polynomials::copy_polynomial(state.z_1, eval_space, n, 4 * n);
    polynomials::fft(eval_space, domain.long_root, 4 * n);
    polynomials::copy_polynomial(ffts.identity_poly, &eval_space[4 * n], 4 * n, 4 * n);
    polynomials::ifft_with_coset(&eval_space[4 * n], domain.long_root_inverse, domain.generator_inverse, domain.long_domain);
    polynomials::fft(&eval_space[4 * n], domain.long_root, 4 * n);


    waffle::compute_arithmetisation_coefficients(state, domain, ffts);

    waffle::concatenate_arithmetic_and_identity_coefficients(state, domain, ffts);

    // we want to convert `gate_poly_mid` into a 4d fft, so that we can add it into the quotient poly
    // the resulting set of point evaluations should be 0 for every element of the original multiplicative subgroup, minus the last element,
    // once the coset is taken into account
    polynomials::ifft_with_coset(ffts.gate_poly_mid, domain.mid_root_inverse, domain.generator_inverse, domain.mid_domain);

    // fr::field_t eval_space[4 * n];

    polynomials::copy_polynomial(ffts.gate_poly_mid, eval_space, 2 * n, 4 * n);
    polynomials::fft_with_coset(eval_space, domain.long_root, domain.generator, domain.long_domain);

    for (size_t i = 0; i < (4 * n); ++i)
    {
        fr::add(ffts.quotient_poly[i], eval_space[i], ffts.quotient_poly[i]);
    }

    polynomials::ifft_with_coset(ffts.quotient_poly, domain.long_root_inverse, domain.generator_inverse, domain.long_domain);
    polynomials::fft(ffts.quotient_poly, domain.long_root, domain.long_domain);

    fr::field_t *result = ffts.quotient_poly;
    // check that all but one subgroup evaluation is zero
    for (size_t i = 0; i < n - 1; ++i)
    {
        EXPECT_EQ(result[4 * i].data[0], 0);
        EXPECT_EQ(result[4 * i].data[1], 0);
        EXPECT_EQ(result[4 * i].data[2], 0);
        EXPECT_EQ(result[4 * i].data[3], 0);
    }
}

TEST(waffle, compute_permutation_grand_product_coefficients)
{
    size_t n = 256;
    polynomials::evaluation_domain domain = polynomials::get_domain(n);

    waffle::circuit_state state;
    state.n = n;
    fr::random_element(state.beta);
    fr::random_element(state.gamma);
    fr::random_element(state.alpha);
    fr::field_t data[24 * n];

    fr::field_t scratch_space[52 * n + 16];

    waffle::fft_pointers ffts;
    ffts.scratch_memory = scratch_space;
    ffts.w_l_poly = &ffts.scratch_memory[0];
    ffts.w_r_poly = &ffts.scratch_memory[4 * n];
    ffts.w_o_poly = &ffts.scratch_memory[8 * n];
    ffts.identity_poly = &ffts.scratch_memory[12 * n];
    ffts.gate_poly_long = &ffts.scratch_memory[16 * n];
    ffts.z_1_poly = &ffts.scratch_memory[20 * n];
    ffts.z_2_poly = &ffts.scratch_memory[24 * n + 4];
    ffts.gate_poly_mid = &ffts.scratch_memory[28 * n + 8];
    ffts.sigma_1_poly = &ffts.scratch_memory[32 * n + 8];
    ffts.sigma_2_poly = &ffts.scratch_memory[36 * n + 8];
    ffts.sigma_3_poly = &ffts.scratch_memory[40 * n + 8];
    ffts.l_1_poly = &ffts.scratch_memory[44 * n + 8];
    ffts.permutation_start_poly = &ffts.scratch_memory[48 * n + 12];
    ffts.permutation_end_poly = &ffts.scratch_memory[50 * n + 16];
    ffts.q_c_poly = ffts.w_o_poly;
    ffts.q_r_poly = ffts.w_o_poly;
    ffts.q_l_poly = ffts.w_o_poly + domain.mid_domain;
    ffts.gate_poly_long = ffts.w_o_poly;
    ffts.quotient_poly = ffts.identity_poly;

    generate_test_data(state, data);

    waffle::compute_wire_coefficients(state, domain, ffts);

    waffle::compute_z_coefficients(state, domain, ffts);

    waffle::compute_identity_grand_product_coefficients(state, domain, ffts);

    fr::field_t eval_space[20 * n];

    polynomials::copy_polynomial(state.z_1, eval_space, n, 4 * n);
    polynomials::fft(eval_space, domain.long_root, 4 * n);
    polynomials::copy_polynomial(ffts.identity_poly, &eval_space[4 * n], 4 * n, 4 * n);
    polynomials::ifft_with_coset(&eval_space[4 * n], domain.long_root_inverse, domain.generator_inverse, domain.long_domain);
    polynomials::fft(&eval_space[4 * n], domain.long_root, 4 * n);


    waffle::compute_arithmetisation_coefficients(state, domain, ffts);

    waffle::concatenate_arithmetic_and_identity_coefficients(state, domain, ffts);

    waffle::compute_permutation_grand_product_coefficients(state, domain, ffts);

    polynomials::ifft_with_coset(ffts.quotient_poly, domain.long_root_inverse, domain.generator_inverse, domain.long_domain);
    polynomials::fft(ffts.quotient_poly, domain.long_root, domain.long_domain);

    fr::field_t *result = ffts.quotient_poly;
    // check that all but last subgroup evaluation is zero
    for (size_t i = 0; i < n - 1; ++i)
    {
        EXPECT_EQ(result[4 * i].data[0], 0);
        EXPECT_EQ(result[4 * i].data[1], 0);
        EXPECT_EQ(result[4 * i].data[2], 0);
        EXPECT_EQ(result[4 * i].data[3], 0);
    }
}