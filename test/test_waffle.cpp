#include <gtest/gtest.h>

#include <barretenberg/waffle/waffle.hpp>

TEST(waffle, compute_z_coefficients)
{
    size_t n = 16;
    polynomials::evaluation_domain domain = polynomials::get_domain(n);

    fr::field_t data[12 * n];
    waffle::circuit_state state;

    state.w_l = &data[0];
    state.w_r = &data[n];
    state.w_o = &data[2*n];
    state.z_1 = &data[3*n];
    state.z_2 = &data[4*n];
    state.sigma_1 = &data[5*n];
    state.sigma_2 = &data[6*n];
    state.sigma_3 = &data[7*n];
    state.s_id = &data[8*n];
    state.product_1 = &data[9*n];
    state.product_2 = &data[10*n];
    state.product_3 = &data[11*n];
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
        fr::add(state.w_l[i], state.w_l[i], state.w_r[i]);
        fr::add(state.w_l[i], state.w_r[i], state.w_o[i]);
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
    
        z_1_evaluations[i+1] = z_1_evaluations[i]*id_product;
        z_2_evaluations[i+1] = z_2_evaluations[i]*sigma_product;
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
    fr::field_t data[9 * n];

    polynomials::evaluation_domain domain = polynomials::get_domain(n);
    waffle::circuit_state state;

    state.w_l = &data[0];
    state.w_r = &data[n];
    state.w_o = &data[2*n];
    state.z_1 = &data[6*n];
    state.z_2 = &data[7*n];
    state.t = &data[8*n];
    state.sigma_1 = &data[3*n];
    state.sigma_2 = &data[4*n];
    state.sigma_3 = &data[5*n];
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
    fr::field_t data[10 * n];
    waffle::circuit_state state;

    state.w_l = &data[0];
    state.w_r = &data[n];
    state.w_o = &data[2*n];
    state.z_1 = &data[6*n];
    state.z_2 = &data[7*n];
    state.t = &data[8*n];
    state.sigma_1 = &data[3*n];
    state.sigma_2 = &data[4*n];
    state.sigma_3 = &data[5*n];
    state.s_id = &data[6*n];
    state.product_1 = &data[7*n];
    state.product_2 = &data[8*n];
    state.product_3 = &data[9*n];
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

    fr::field_t* identity_poly = &scratch_space[12 * n];

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
    size_t n = 256;

    fr::field_t w_l[n];
    fr::field_t w_r[n];
    fr::field_t w_o[n];
    fr::field_t q_l[n];
    fr::field_t q_r[n];
    fr::field_t q_o[n];
    fr::field_t q_m[n];
    fr::field_t q_c[n];

    fr::field_t w_l_copy[n];
    fr::field_t w_r_copy[n];
    fr::field_t w_o_copy[n];

    // create some constraints that satisfy our arithmetic circuit relation
    fr::field_t one;
    fr::field_t zero;
    fr::field_t minus_one;
    fr::one(one);
    fr::neg(one, minus_one);
    fr::zero(zero);
    fr::field_t T0;
    // even indices = mul gates, odd incides = add gates
    for (size_t i = 0; i < n / 2; ++i)
    {
        fr::random_element(w_l[2*i]);
        fr::random_element(w_r[2*i]);
        fr::mul(w_l[2*i], w_r[2*i], w_o[2*i]);
        fr::copy(zero, q_l[2*i]);
        fr::copy(zero, q_r[2*i]);
        fr::copy(minus_one, q_o[2*i]);
        fr::copy(zero, q_c[2*i]);
        fr::copy(one, q_m[2*i]);

        fr::random_element(w_l[2*i + 1]);
        fr::random_element(w_r[2*i + 1]);
        fr::random_element(w_o[2*i + 1]);

        fr::add(w_l[2*i+1],w_r[2*i+1], T0);
        fr::add(T0, w_o[2*i+1], q_c[2*i+1]);
        fr::neg(q_c[2*i+1], q_c[2*i+1]);
        fr::one(q_l[2*i+1]);
        fr::one(q_r[2*i+1]);
        fr::one(q_o[2*i+1]);
        fr::zero(q_m[2*i+1]);
    }

    for (size_t i = 0; i < n; ++i)
    {
        fr::copy(w_l[i], w_l_copy[i]);
        fr::copy(w_r[i], w_r_copy[i]);
        fr::copy(w_o[i], w_o_copy[i]);
    }

    // sanity check that our constraints equal zero
    fr::field_t a;
    fr::field_t b;
    for (size_t i = 0; i < n; ++i)
    {
        fr::mul(w_l[i], w_r[i], a);
        fr::mul(a, q_m[i], a);

        fr::mul(w_l[i], q_l[i], b);
        fr::add(a, b, a);

        fr::mul(w_r[i], q_r[i], b);
        fr::add(a, b, a);
        
        fr::mul(w_o[i], q_o[i], b);
        fr::add(a, b, a);

        fr::add(a, q_c[i], a);

        EXPECT_EQ(a.data[0], 0);
        EXPECT_EQ(a.data[1], 0);
        EXPECT_EQ(a.data[2], 0);
        EXPECT_EQ(a.data[3], 0);
    }

    polynomials::evaluation_domain domain = polynomials::get_domain(n);

    // can make clearer comparisons if we remove generator for this test
    fr::one(domain.generator);
    fr::one(domain.generator_inverse);
    fr::field_t data[10 * n];
    waffle::circuit_state state;

    state.w_l = &w_l[0];
    state.w_r = &w_r[0];
    state.w_o = &w_o[0];
    state.z_1 = &data[0];
    state.z_2 = &data[n];
    state.t = &data[2*n];
    state.q_c = &q_c[0];
    state.q_l = &q_l[0];
    state.q_r = &q_r[0];
    state.q_o = &q_o[0];
    state.q_m = &q_m[0];
    state.sigma_1 = &data[3*n];
    state.sigma_2 = &data[4*n];
    state.sigma_3 = &data[5*n];
    state.s_id = &data[6*n];
    state.product_1 = &data[7*n];
    state.product_2 = &data[8*n];
    state.product_3 = &data[9*n];
    state.n = n;

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
        for(size_t j = 0; j < 4;  ++j)
        {
            EXPECT_EQ(ffts.w_l_poly[4*i].data[j], w_l_copy[i].data[j]);
            EXPECT_EQ(ffts.w_r_poly[4*i].data[j], w_r_copy[i].data[j]);
            EXPECT_EQ(ffts.w_o_poly[4*i].data[j], w_o_copy[i].data[j]);
        }
    }

    // compute arithmetisation coefficients - split into 2 polynomials
    // w_o_poly contains coefficients of 4n fourier transform
    // gate_poly_mid contains coefficients of 2n fourier transform
    waffle::compute_arithmetisation_coefficients(state, domain, ffts);
    polynomials::ifft_with_coset(ffts.gate_poly_mid, domain.mid_root_inverse, domain.generator_inverse, domain.mid_domain);
    
    fr::field_t eval_space[4*n];

    polynomials::copy_polynomial(ffts.gate_poly_mid, eval_space, 2 * n, 4 * n);
    polynomials::fft_with_coset(eval_space, domain.long_root, domain.generator, domain.long_domain);

    for (size_t i = 0; i < (4*n); ++i)
    {
        fr::add(ffts.gate_poly_long[i], eval_space[i], ffts.gate_poly_long[i]);
    }

    polynomials::ifft_with_coset(ffts.gate_poly_long, domain.long_root_inverse, domain.generator_inverse, domain.long_domain);
    polynomials::fft(ffts.gate_poly_long, domain.long_root, domain.long_domain);

    fr::field_t* result = ffts.gate_poly_long;
    // check that all subgroup evaluations are zero
    for (size_t i = 0; i < n; ++i)
    {
        EXPECT_EQ(result[4*i].data[0], 0);
        EXPECT_EQ(result[4*i].data[1], 0);
        EXPECT_EQ(result[4*i].data[2], 0);
        EXPECT_EQ(result[4*i].data[3], 0);
    }
}