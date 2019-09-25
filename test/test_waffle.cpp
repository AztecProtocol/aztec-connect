#include <gtest/gtest.h>

#include <barretenberg/waffle/waffle.hpp>
#include <barretenberg/waffle/permutation.hpp>

/*
```
elliptic curve point addition on a short weierstrass curve.

circuit has 9 gates, I've added 7 dummy gates so that the polynomial degrees are a power of 2 

input points: (x_1, y_1), (x_2, y_2)
output point: (x_3, y_3)
intermediate variables: (t_1, t_2, t_3, t_4, t_5, t_6, t_7)

Variable assignments:
t_1 = (y_2 - y_1)
t_2 = (x_2 - x_1)
t_3 = (y_2 - y_1) / (x_2 - x_1)
x_3 = t_3*t_3 - x_2 - x_1
y_3 = t_3*(x_1 - x_3) - y_1
t_4 = (x_3 + x_1)
t_5 = (t_4 + x_2)
t_6 = (y_3 + y_1)
t_7 = (x_1 - x_3)

Constraints:
(y_2 - y_1) - t_1 = 0
(x_2 - x_1) - t_2 = 0
(x_1 + x_2) - t_4 = 0
(t_4 + x_3) - t_5 = 0
(y_3 + y_1) - t_6 = 0
(x_1 - x_3) - t_7 = 0
 (t_3 * t_2) - t_1 = 0
-(t_3 * t_3) + t_5 = 0
-(t_3 * t_7) + t_6 = 0

Wire polynomials:
w_l = [y_2, x_2, x_1, t_4, y_3, x_1, t_3, t_3, t_3, 0, 0, 0, 0, 0, 0, 0]
w_r = [y_1, x_1, x_2, x_3, y_1, x_3, t_2, t_3, t_7, 0, 0, 0, 0, 0, 0, 0]
w_o = [t_1, t_2, t_4, t_5, t_6, t_7, t_1, t_5, t_6, 0, 0, 0, 0, 0, 0, 0]

Gate polynomials:
q_m = [ 0,  0,  0,  0,  0,  0,  1, -1, -1, 0, 0, 0, 0, 0, 0, 0]
q_l = [ 1,  1,  1,  1,  1,  1,  0,  0,  0, 0, 0, 0, 0, 0, 0, 0]
q_r = [-1, -1,  1,  1,  1, -1,  0,  0,  0, 0, 0, 0, 0, 0, 0, 0]
q_o = [-1, -1, -1, -1, -1, -1, -1,  1,  1, 0, 0, 0, 0, 0, 0, 0]
q_c = [ 0,  0,  0,  0,  0,  0,  0,  0,  0, 0, 0, 0, 0, 0, 0, 0]

Permutation polynomials:
s_id = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]
sigma_1 = [1, 3+n, 6, 3+2n, 5, 2+n, 8, 9, 8+n, 10, 11, 12, 13, 14, 15, 16]
sigma_2 = [5+n, 3, 2, 6+n, 1+n, 4+n, 2+2n, 7, 6+2n, 10+n, 11+n, 12+n, 13+n, 14+n, 15+n, 16+n]
sigma_3 = [7+2n, 7+n, 4, 8+2n, 9+2n, 9+n, 1+2n, 4+2n, 5+2n, 10+2n, 11+2n, 12+2n, 13+2n, 14+2n, 15+2n]

(for n = 16, permutation polynomials are)
sigma_1 = [1, 19, 6, 35, 5, 18, 8, 9, 24, 10, 11, 12, 13, 14, 15, 16]
sigma_2 = [21, 3, 2, 22, 17, 20, 34, 7, 38, 26, 27, 28, 29, 30, 31, 32]
sigma_3 = [39, 23, 4, 40, 41, 25, 33, 36, 37, 42, 43, 44, 45, 46, 47, 48]
```
*/
using namespace barretenberg;

namespace
{

void generate_point_addition_data_inner(waffle::circuit_state& state, size_t index)
{
    fr::field_t x_1 = fr::random_element();
    fr::field_t x_2 = fr::random_element();
    fr::field_t x_3;
    fr::field_t y_1 = fr::random_element();
    fr::field_t y_2 = fr::random_element();
    fr::field_t y_3;
    fr::field_t t[7];

    fr::sub(y_2, y_1, t[0]);
    fr::sub(x_2, x_1, t[1]);
    fr::invert(t[1], t[2]);
    fr::mul(t[2], t[0], t[2]);
    fr::sqr(t[2], x_3);
    fr::sub(x_3, x_2, x_3);
    fr::sub(x_3, x_1, x_3);
    fr::add(x_2, x_1, t[3]);
    fr::add(t[3], x_3, t[4]);
    fr::sub(x_1, x_3, t[6]);
    fr::mul(t[2], t[6], y_3);
    fr::sub(y_3, y_1, y_3);
    fr::add(y_3, y_1, t[5]);

    fr::copy(y_2, state.w_l[index + 0]);
    fr::copy(x_2, state.w_l[index + 1]);
    fr::copy(x_1, state.w_l[index + 2]);
    fr::copy(t[3], state.w_l[index + 3]);
    fr::copy(y_3, state.w_l[index + 4]);
    fr::copy(x_1, state.w_l[index + 5]);
    fr::copy(t[2], state.w_l[index + 6]);
    fr::copy(t[2], state.w_l[index + 7]);
    fr::copy(t[2], state.w_l[index + 8]);

    fr::copy(y_1, state.w_r[index + 0]);
    fr::copy(x_1, state.w_r[index + 1]);
    fr::copy(x_2, state.w_r[index + 2]);
    fr::copy(x_3, state.w_r[index + 3]);
    fr::copy(y_1, state.w_r[index + 4]);
    fr::copy(x_3, state.w_r[index + 5]);
    fr::copy(t[1], state.w_r[index + 6]);
    fr::copy(t[2], state.w_r[index + 7]);
    fr::copy(t[6], state.w_r[index + 8]);

    fr::copy(t[0], state.w_o[index + 0]);
    fr::copy(t[1], state.w_o[index + 1]);
    fr::copy(t[3], state.w_o[index + 2]);
    fr::copy(t[4], state.w_o[index + 3]);
    fr::copy(t[5], state.w_o[index + 4]);
    fr::copy(t[6], state.w_o[index + 5]);
    fr::copy(t[0], state.w_o[index + 6]);
    fr::copy(t[4], state.w_o[index + 7]);
    fr::copy(t[5], state.w_o[index + 8]);

    fr::zero(state.q_m[index + 0]);
    fr::zero(state.q_m[index + 1]);
    fr::zero(state.q_m[index + 2]);
    fr::zero(state.q_m[index + 3]);
    fr::zero(state.q_m[index + 4]);
    fr::zero(state.q_m[index + 5]);
    fr::one(state.q_m[index + 6]);
    fr::neg(fr::one(), state.q_m[index + 7]);
    fr::neg(fr::one(), state.q_m[index + 8]);

    fr::one(state.q_l[index + 0]);
    fr::one(state.q_l[index + 1]);
    fr::one(state.q_l[index + 2]);
    fr::one(state.q_l[index + 3]);
    fr::one(state.q_l[index + 4]);
    fr::one(state.q_l[index + 5]);

    fr::zero(state.q_l[index + 6]);
    fr::zero(state.q_l[index + 7]);
    fr::zero(state.q_l[index + 8]);

    fr::neg(fr::one(), state.q_r[index + 0]);
    fr::neg(fr::one(), state.q_r[index + 1]);
    fr::one(state.q_r[index + 2]);
    fr::one(state.q_r[index + 3]);
    fr::one(state.q_r[index + 4]);
    fr::neg(fr::one(), state.q_r[index + 5]);
    fr::zero(state.q_r[index + 6]);
    fr::zero(state.q_r[index + 7]);
    fr::zero(state.q_r[index + 8]);

    fr::neg(fr::one(), state.q_o[index + 0]);
    fr::neg(fr::one(), state.q_o[index + 1]);
    fr::neg(fr::one(), state.q_o[index + 2]);
    fr::neg(fr::one(), state.q_o[index + 3]);
    fr::neg(fr::one(), state.q_o[index + 4]);
    fr::neg(fr::one(), state.q_o[index + 5]);
    fr::neg(fr::one(), state.q_o[index + 6]);
    fr::one(state.q_o[index + 7]);
    fr::one(state.q_o[index + 8]);

    fr::zero(state.q_c[index + 0]);
    fr::zero(state.q_c[index + 1]);
    fr::zero(state.q_c[index + 2]);
    fr::zero(state.q_c[index + 3]);
    fr::zero(state.q_c[index + 4]);
    fr::zero(state.q_c[index + 5]);
    fr::zero(state.q_c[index + 6]);
    fr::zero(state.q_c[index + 7]);
    fr::zero(state.q_c[index + 8]);

    uint32_t shift = (1U << 30U);
    state.sigma_1_mapping[index + 0] = (uint32_t)index+0;
    state.sigma_1_mapping[index + 1] = (uint32_t)index+2+shift;
    state.sigma_1_mapping[index + 2] = (uint32_t)index+5;
    state.sigma_1_mapping[index + 3] = (uint32_t)index+2+shift+shift;
    state.sigma_1_mapping[index + 4] = (uint32_t)index+4;
    state.sigma_1_mapping[index + 5] = (uint32_t)index+1+shift;
    state.sigma_1_mapping[index + 6] = (uint32_t)index+7;
    state.sigma_1_mapping[index + 7] = (uint32_t)index+8;
    state.sigma_1_mapping[index + 8] = (uint32_t)index+7+shift;

    state.sigma_2_mapping[index + 0] = (uint32_t)index+4+shift;
    state.sigma_2_mapping[index + 1] = (uint32_t)index+2;
    state.sigma_2_mapping[index + 2] = (uint32_t)index+1;
    state.sigma_2_mapping[index + 3] = (uint32_t)index+5+shift;
    state.sigma_2_mapping[index + 4] = (uint32_t)index+0+shift;
    state.sigma_2_mapping[index + 5] = (uint32_t)index+3+shift;
    state.sigma_2_mapping[index + 6] = (uint32_t)index+1+shift+shift;
    state.sigma_2_mapping[index + 7] = (uint32_t)index+6;
    state.sigma_2_mapping[index + 8] = (uint32_t)index+5+shift+shift;

    state.sigma_3_mapping[index + 0] = (uint32_t)index+6+shift+shift;
    state.sigma_3_mapping[index + 1] = (uint32_t)index+6+shift;
    state.sigma_3_mapping[index + 2] = (uint32_t)index+3;
    state.sigma_3_mapping[index + 3] = (uint32_t)index+7+shift+shift;
    state.sigma_3_mapping[index + 4] = (uint32_t)index+8+shift+shift;
    state.sigma_3_mapping[index + 5] = (uint32_t)index+8+shift;
    state.sigma_3_mapping[index + 6] = (uint32_t)index+0+shift+shift;
    state.sigma_3_mapping[index + 7] = (uint32_t)index+3+shift+shift;
    state.sigma_3_mapping[index + 8] = (uint32_t)index+4+shift+shift;
}

void generate_point_addition_data(waffle::circuit_state& state, fr::field_t* data)
{
    size_t n = 16;
    state.n = n;
    state.challenges.beta = fr::random_element();
    state.challenges.gamma= fr::random_element();
    state.challenges.alpha= fr::random_element();
    fr::sqr(state.challenges.alpha, state.alpha_squared);
    fr::mul(state.alpha_squared, state.challenges.alpha, state.alpha_cubed);

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
    state.sigma_1_mapping = (uint32_t*)&data[17 * n + 2];
    state.sigma_2_mapping = (uint32_t*)((uintptr_t*)&data[18 * n + 2] + (n * sizeof(uint32_t)));
    state.sigma_3_mapping = (uint32_t*)((uintptr_t*)&data[19 * n + 2] + ((2 * n) * sizeof(uint32_t)));
    state.t = &data[14 * n + 2];
    
    state.product_1 = &data[17 * n + 5];
    state.product_2 = &data[18 * n + 6];
    state.product_3 = &data[19 * n + 7];
    state.permutation_product = &data[20 * n + 8];
    state.w_l_lagrange_base = state.t;
    state.w_r_lagrange_base = &state.t[n + 1];
    state.w_o_lagrange_base = &state.t[2 * n + 2];

    generate_point_addition_data_inner(state, 0);

    for (size_t i = 9; i < n; ++i)
    {
        state.sigma_1_mapping[i] = (uint32_t)i;
        state.sigma_2_mapping[i] = (uint32_t)(i + (1U << 30));
        state.sigma_3_mapping[i] = (uint32_t)(i + (1U << 31));

        fr::zero(state.w_l[i]);
        fr::zero(state.w_r[i]);
        fr::zero(state.w_o[i]);
        fr::zero(state.q_m[i]);
        fr::zero(state.q_l[i]);
        fr::zero(state.q_r[i]);
        fr::zero(state.q_o[i]);
        fr::zero(state.q_c[i]);
    }

}

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
    state.sigma_1_mapping = (uint32_t*)&data[13 * n + 2];
    state.sigma_2_mapping = (uint32_t*)((uintptr_t*)&data[13 * n + 2] + (n * sizeof(uint32_t)));
    state.sigma_3_mapping = (uint32_t*)((uintptr_t*)&data[13 * n + 2] + ((2 * n) * sizeof(uint32_t)));
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

    fr::zero(state.w_l[n-1]);
    fr::zero(state.w_r[n-1]);
    fr::zero(state.w_o[n-1]);
    fr::zero(state.q_c[n-1]);
    fr::zero(state.w_l[shift-1]);
    fr::zero(state.w_r[shift-1]);
    fr::zero(state.w_o[shift-1]);
    fr::zero(state.q_c[shift-1]);

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
}

TEST(waffle, compute_quotient_polynomial_for_structured_circuit)
{
    size_t n = 16;

    waffle::circuit_state state;
    state.small_domain = polynomials::get_domain(n);
    state.mid_domain = polynomials::get_domain(2 * n);
    state.large_domain = polynomials::get_domain(4 * n);
    state.n = n;

    fr::field_t* scratch_space = (fr::field_t*)(aligned_alloc(32, sizeof(fr::field_t) * (22 * n + 8)));
    fr::field_t* data = (fr::field_t*)(aligned_alloc(32, sizeof(fr::field_t) * (22 * n + 8)));

    waffle::fft_pointers ffts;
    ffts.scratch_memory = scratch_space;
    generate_point_addition_data(state, data);

    fr::field_t x = fr::random_element();
    srs::plonk_srs srs;
    g1::affine_element monomials[6 * n + 2];
    monomials[0] = g1::affine_one();

    for (size_t i = 1; i < 3 * n; ++i)
    {
        monomials[i] = g1::group_exponentiation(monomials[i-1], x);
    }
    scalar_multiplication::generate_pippenger_point_table(monomials, monomials, 3 * n);
    srs.monomials = monomials;
    srs.degree = n;

    waffle::plonk_proof proof;
    waffle::convert_permutations_into_lagrange_base_form(state);
    waffle::compute_quotient_polynomial(state, ffts, proof, srs);
    
    for (size_t i = 3 * n; i < 4 * n; ++i)
    {
        EXPECT_EQ(fr::eq(ffts.quotient_poly[i], fr::zero()), true);
    }

    free(scratch_space);
    free(data);
}

TEST(waffle, compute_quotient_polynomial)
{
    size_t n = 256;

    waffle::circuit_state state;
    state.small_domain = polynomials::get_domain(n);
    state.mid_domain = polynomials::get_domain(2 * n);
    state.large_domain = polynomials::get_domain(4 * n);
    state.n = n;

    fr::field_t data[28 * n + 2];

    fr::field_t* scratch_space = (fr::field_t*)(aligned_alloc(32, sizeof(fr::field_t) * (70 * n + 8)));

    waffle::fft_pointers ffts;
    ffts.scratch_memory = scratch_space;
    generate_test_data(state, data);

    fr::field_t x = fr::random_element();
    srs::plonk_srs srs;
    g1::affine_element monomials[6 * n + 2];
    monomials[0] = g1::affine_one();

    for (size_t i = 1; i < 3 * n; ++i)
    {
        monomials[i] = g1::group_exponentiation(monomials[i-1], x);
    }
    scalar_multiplication::generate_pippenger_point_table(monomials, monomials, 3 * n);
    srs.monomials = monomials;
    srs.degree = n;

    waffle::plonk_proof proof;
    waffle::convert_permutations_into_lagrange_base_form(state);
    waffle::compute_quotient_polynomial(state, ffts, proof, srs);

    // check that the max degree of our quotient polynomial is 3n
    for (size_t i = 3 * n; i < 4 * n; ++i)
    {
        EXPECT_EQ(fr::eq(ffts.quotient_poly[i], fr::zero()), true);
    }

    free(scratch_space);
}

// TEST(waffle, compute_z_coefficients)
// {
//     size_t n = 16;

//     fr::field_t data[16 * n + 2];
//     waffle::circuit_state state;
//     state.small_domain = polynomials::get_domain(n);
//     state.mid_domain = polynomials::get_domain(2 * n);
//     state.large_domain = polynomials::get_domain(4 * n);

//     state.w_l = &data[0];
//     state.w_r = &data[n];
//     state.w_o = &data[2 * n];
//     state.z_1 = &data[3 * n];
//     state.z_2 = &data[4 * n + 1];
//     state.sigma_1 = &data[5 * n + 2];
//     state.sigma_2 = &data[6 * n + 2];
//     state.sigma_3 = &data[7 * n + 2];
//     state.s_id = &data[8 * n + 2];
//     state.product_1 = &data[9 * n + 2];
//     state.product_2 = &data[10 * n + 2];
//     state.product_3 = &data[11 * n + 2];
//     state.w_l_lagrange_base = &data[12 * n + 2];
//     state.w_r_lagrange_base = &data[13 * n + 2];
//     state.w_o_lagrange_base = &data[14 * n + 2];
//     state.permutation_product = &data[15 * n + 2];
//     state.n = n;

//     fr::one(state.challenges.gamma);
//     fr::add(state.challenges.gamma, state.challenges.gamma, state.challenges.beta);

//     fr::field_t i_mont;
//     fr::field_t one;
//     fr::zero(i_mont);
//     fr::one(one);
//     for (size_t i = 0; i < n; ++i)
//     {
//         fr::copy(i_mont, state.w_l[i]);
//         fr::copy(state.w_l[i], state.w_l_lagrange_base[i]);
//         fr::add(state.w_l[i], state.w_l[i], state.w_r[i]);
//         fr::copy(state.w_r[i], state.w_r_lagrange_base[i]);
//         fr::add(state.w_l[i], state.w_r[i], state.w_o[i]);
//         fr::copy(state.w_o[i], state.w_o_lagrange_base[i]);
//         fr::add(i_mont, one, i_mont);

//         fr::one(state.sigma_1[i]);
//         fr::add(state.sigma_1[i], state.sigma_1[i], state.sigma_2[i]);
//         fr::add(state.sigma_1[i], state.sigma_2[i], state.sigma_3[i]);
//     }

//     fr::field_t scratch_space[8 * n + 4];
//     waffle::fft_pointers ffts;
//     ffts.z_1_poly = &scratch_space[0];
//     ffts.z_2_poly = &scratch_space[4 * n + 4];
//     waffle::convert_permutations_into_lagrange_base_form(state);
//     waffle::compute_z_coefficients(state, ffts);

//     size_t z_1_evaluations[n];
//     size_t z_2_evaluations[n];
//     z_1_evaluations[0] = 1;
//     z_2_evaluations[0] = 1;
//     for (size_t i = 0; i < n - 1; ++i)
//     {
        
//         uint64_t product_1 = i + 3;
//         uint64_t product_2 = (2 * i) + 5;
//         uint64_t product_3 = (3 * i) + 7;

//         uint64_t s_id = i + 1;
//         uint64_t id_1 = i + (2 * s_id) + 1;
//         uint64_t id_2 = (2 * i) + (2 * s_id) + 1 + (2 * n);
//         uint64_t id_3 = (3 * i) + (2 * s_id) + 1 + (4 * n);
//         uint64_t id_product = id_1 * id_2 * id_3;
//         uint64_t sigma_product = product_1 * product_2 * product_3;

//         z_1_evaluations[i + 1] = z_1_evaluations[i] * id_product;
//         z_2_evaluations[i + 1] = z_2_evaluations[i] * sigma_product;
//     }

//     fr::field_t work_root;
//     fr::field_t z_1_expected;
//     fr::field_t z_2_expected;
//     fr::one(work_root);

//     for (size_t i = 0; i < n; ++i)
//     {
//         z_1_expected = polynomials::evaluate(state.z_1, work_root, n);
//         z_2_expected = polynomials::evaluate(state.z_2, work_root, n);
//         fr::from_montgomery_form(z_1_expected, z_1_expected);
//         fr::from_montgomery_form(z_2_expected, z_2_expected);
//         fr::mul(work_root, state.small_domain.root, work_root);
//         EXPECT_EQ(z_1_expected.data[0], z_1_evaluations[i]);
//         EXPECT_EQ(z_2_expected.data[0], z_2_evaluations[i]);
//     }

//     fr::field_t z_coeffs[4 * n];
//     fr::field_t z_coeffs_copy[4 * n + 4];
//     polynomials::copy_polynomial(state.z_1, z_coeffs, n, 4 * n);
//     polynomials::fft(z_coeffs, state.large_domain);
//     polynomials::copy_polynomial(z_coeffs, z_coeffs_copy, 4 * n, 4 * n);

//     fr::copy(z_coeffs_copy[0], z_coeffs_copy[4 * n]);
//     fr::copy(z_coeffs_copy[1], z_coeffs_copy[4 * n + 1]);
//     fr::copy(z_coeffs_copy[2], z_coeffs_copy[4 * n + 2]);
//     fr::copy(z_coeffs_copy[3], z_coeffs_copy[4 * n + 3]);

//     polynomials::ifft(z_coeffs, state.large_domain);

//     fr::field_t* shifted_z = &z_coeffs_copy[4];

//     polynomials::ifft(shifted_z, state.large_domain);


//     fr::field_t x = fr::random_element();
//     fr::field_t shifted_x;
//     fr::mul(x, state.small_domain.root, shifted_x);

//     fr::field_t z_eval;
//     fr::field_t shifted_z_eval;
//     z_eval = polynomials::evaluate(z_coeffs, shifted_x, state.small_domain.size);
//     shifted_z_eval = polynomials::evaluate(shifted_z, x, state.small_domain.size);

//     EXPECT_EQ(fr::eq(z_eval, shifted_z_eval), true);
// }

TEST(waffle, compute_wire_coefficients)
{
    size_t n = 256;
    fr::field_t data[13 * n];

    waffle::circuit_state state;
    state.small_domain = polynomials::get_domain(n);
    state.mid_domain = polynomials::get_domain(2 * n);
    state.large_domain = polynomials::get_domain(4 * n);

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
    state.permutation_product = &data[12 * n];
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
    waffle::compute_wire_coefficients(state, ffts);

    fr::field_t work_root;
    fr::field_t w_l_expected;
    fr::field_t w_r_expected;
    fr::field_t w_o_expected;
    fr::one(work_root);

    for (size_t i = 0; i < n; ++i)
    {
        w_l_expected = polynomials::evaluate(state.w_l, work_root, n);
        w_r_expected = polynomials::evaluate(state.w_r, work_root, n);
        w_o_expected = polynomials::evaluate(state.w_o, work_root, n);
        fr::mul(work_root, state.small_domain.root, work_root);
        EXPECT_EQ(fr::eq(w_l_reference[i], w_l_expected), true);
        EXPECT_EQ(fr::eq(w_r_reference[i], w_r_expected), true);
        EXPECT_EQ(fr::eq(w_o_reference[i], w_o_expected), true);
    }
}

TEST(waffle, compute_wire_commitments)
{
    size_t n = 256;

    waffle::circuit_state state;
    state.small_domain = polynomials::get_domain(n);
    state.mid_domain = polynomials::get_domain(2 * n);
    state.large_domain = polynomials::get_domain(4 * n);
    state.n = n;
    fr::field_t data[25 * n];

    fr::field_t scratch_space[12 * n];

    waffle::fft_pointers ffts;
    ffts.scratch_memory = scratch_space;
    ffts.w_l_poly = &ffts.scratch_memory[0];
    ffts.w_r_poly = &ffts.scratch_memory[4 * n];
    ffts.w_o_poly = &ffts.scratch_memory[8 * n];
    generate_test_data(state, data);

    fr::field_t x = fr::random_element();
    srs::plonk_srs srs;
    g1::affine_element monomials[2 * n + 1];
    monomials[0] = g1::affine_one();

    for (size_t i = 1; i < n; ++i)
    {
        monomials[i] = g1::group_exponentiation(monomials[i-1], x);
    }
    scalar_multiplication::generate_pippenger_point_table(monomials, monomials, n);
    srs.monomials = monomials;
    srs.degree = n;

    waffle::compute_wire_coefficients(state, ffts);

    fr::field_t w_l_copy[n];
    fr::field_t w_r_copy[n];
    fr::field_t w_o_copy[n];
    polynomials::copy_polynomial(state.w_l, w_l_copy, n, n);
    polynomials::copy_polynomial(state.w_r, w_r_copy, n, n);
    polynomials::copy_polynomial(state.w_o, w_o_copy, n, n);

    fr::field_t w_l_eval;
    fr::field_t w_r_eval;
    fr::field_t w_o_eval;


    w_l_eval = polynomials::evaluate(w_l_copy, x, n);
    w_r_eval = polynomials::evaluate(w_r_copy, x, n);
    w_o_eval = polynomials::evaluate(w_o_copy, x, n);

    waffle::plonk_proof proof;
    waffle::compute_wire_commitments(state, proof, srs);

    g1::affine_element generator = g1::affine_one();
    g1::affine_element expected_w_l = g1::group_exponentiation(generator, w_l_eval);
    g1::affine_element expected_w_r = g1::group_exponentiation(generator, w_r_eval);
    g1::affine_element expected_w_o = g1::group_exponentiation(generator, w_o_eval);

    EXPECT_EQ(fq::eq(proof.W_L.x, expected_w_l.x), true);
    EXPECT_EQ(fq::eq(proof.W_L.y, expected_w_l.y), true);
    EXPECT_EQ(fq::eq(proof.W_R.x, expected_w_r.x), true);
    EXPECT_EQ(fq::eq(proof.W_R.y, expected_w_r.y), true);
    EXPECT_EQ(fq::eq(proof.W_O.x, expected_w_o.x), true);
    EXPECT_EQ(fq::eq(proof.W_O.y, expected_w_o.y), true);
}

TEST(waffle, compute_z_commitments)
{
    size_t n = 256;

    waffle::circuit_state state;
    state.small_domain = polynomials::get_domain(n);
    state.mid_domain = polynomials::get_domain(2 * n);
    state.large_domain = polynomials::get_domain(4 * n);
    state.n = n;

    fr::field_t* data = (fr::field_t*)(aligned_alloc(32, sizeof(fr::field_t) * (28 * n + 2)));
    fr::field_t* scratch_space = (fr::field_t*)(aligned_alloc(32, sizeof(fr::field_t) * (24 * n + 8)));
    g1::affine_element* monomials = (g1::affine_element*)(aligned_alloc(32, sizeof(g1::affine_element) * (6 * n + 2)));

    waffle::fft_pointers ffts;
    ffts.scratch_memory = scratch_space;
    ffts.w_l_poly = &ffts.scratch_memory[0];
    ffts.w_r_poly = &ffts.scratch_memory[4 * n];
    ffts.w_o_poly = &ffts.scratch_memory[8 * n];
    ffts.z_1_poly = &ffts.scratch_memory[12 * n];
    ffts.z_2_poly = &ffts.scratch_memory[16 * n];
    ffts.quotient_poly = &ffts.scratch_memory[20 * n];
    generate_test_data(state, data);

    fr::field_t x = fr::random_element();
    srs::plonk_srs srs;
    // g1::affine_element monomials[2 * n + 1];
    monomials[0] = g1::affine_one();

    for (size_t i = 1; i < n; ++i)
    {
        monomials[i] = g1::group_exponentiation(monomials[i-1], x);
    }
    scalar_multiplication::generate_pippenger_point_table(monomials, monomials, n);
    srs.monomials = monomials;
    srs.degree = n;
    waffle::convert_permutations_into_lagrange_base_form(state);
    waffle::compute_wire_coefficients(state, ffts);

    waffle::compute_z_coefficients(state, ffts);

    fr::field_t z_1_copy[n];
    fr::field_t z_2_copy[n];
    polynomials::copy_polynomial(state.z_1, z_1_copy, n, n);
    polynomials::copy_polynomial(state.z_2, z_2_copy, n, n);

    fr::field_t z_1_eval;
    fr::field_t z_2_eval;


    z_1_eval = polynomials::evaluate(z_1_copy, x, n);
    z_2_eval = polynomials::evaluate(z_2_copy, x, n);

    waffle::plonk_proof proof;
    waffle::compute_z_commitments(state, proof, srs);

    g1::affine_element generator = g1::affine_one();
    g1::affine_element expected_z_1 = g1::group_exponentiation(generator, z_1_eval);
    g1::affine_element expected_z_2 = g1::group_exponentiation(generator, z_2_eval);

    EXPECT_EQ(fq::eq(proof.Z_1.x, expected_z_1.x), true);
    EXPECT_EQ(fq::eq(proof.Z_1.y, expected_z_1.y), true);
    EXPECT_EQ(fq::eq(proof.Z_2.x, expected_z_2.x), true);
    EXPECT_EQ(fq::eq(proof.Z_2.y, expected_z_2.y), true);

    free(monomials);
    free(scratch_space);
    free(data);
}

TEST(waffle, compute_linearisation_coefficients)
{
    size_t n = 256;

    waffle::circuit_state state;
    state.small_domain = polynomials::get_domain(n);
    state.mid_domain = polynomials::get_domain(2 * n);
    state.large_domain = polynomials::get_domain(4 * n);

    state.n = n;

    // fr::field_t data[28 * n + 2];
    fr::field_t* data = (fr::field_t*)(aligned_alloc(32, sizeof(fr::field_t) * (28 * n + 2)));
    fr::field_t* scratch_space = (fr::field_t*)(aligned_alloc(32, sizeof(fr::field_t) * (70 * n + 8)));
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
    waffle::plonk_proof proof;
    waffle::convert_permutations_into_lagrange_base_form(state);
    waffle::compute_quotient_polynomial(state, ffts, proof, srs);
    state.challenges.z = fr::random_element();

    fr::field_t t_eval = polynomials::evaluate(ffts.quotient_poly, state.challenges.z, 3 * n);
    // fr::field_t foobar[4 * n];
    state.linear_poly = &ffts.scratch_memory[4 * n];

    waffle::compute_linearisation_coefficients(state, ffts, proof);

    polynomials::lagrange_evaluations lagrange_evals = polynomials::get_lagrange_evaluations(state.challenges.z, state.small_domain);

    fr::field_t rhs;
    fr::field_t lhs;
    fr::field_t T0;
    fr::field_t T1;
    fr::field_t T2;
    fr::mul(lagrange_evals.l_n_minus_1, state.alpha_squared, T0);
    fr::mul(T0, state.alpha_cubed, T0);

    fr::sub(proof.z_1_shifted_eval, proof.z_2_shifted_eval, T1);
    fr::mul(T0, T1, T0);

    fr::mul(proof.z_1_shifted_eval, state.alpha_squared, T1);
    fr::mul(proof.z_2_shifted_eval, state.alpha_cubed, T2);
    fr::add(T1, T2, T1);
    fr::sub(T0, T1, T0);
    fr::add(T0, proof.linear_eval, rhs);

    fr::mul(t_eval, lagrange_evals.vanishing_poly, lhs);

    EXPECT_EQ(fr::eq(lhs, rhs), true);

    free(scratch_space);
    free(data);
    free(monomials);
}

