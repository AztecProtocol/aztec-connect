#include <gtest/gtest.h>

#include <barretenberg/waffle/prover.hpp>
#include <barretenberg/waffle/permutation.hpp>
#include <barretenberg/polynomials/polynomial.hpp>
#include <barretenberg/polynomials/polynomial_arithmetic.hpp>

#include <barretenberg/groups/g1.hpp>
#include <barretenberg/groups/scalar_multiplication.hpp>

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

void generate_point_addition_data_inner(waffle::plonk_circuit_state& state, size_t index)
{
    fr::field_t x_1 = fr::random_element();
    fr::field_t x_2 = fr::random_element();
    fr::field_t x_3;
    fr::field_t y_1 = fr::random_element();
    fr::field_t y_2 = fr::random_element();
    fr::field_t y_3;
    fr::field_t t[7];

    fr::__sub(y_2, y_1, t[0]);
    fr::__sub(x_2, x_1, t[1]);
    fr::__invert(t[1], t[2]);
    fr::__mul(t[2], t[0], t[2]);
    fr::__sqr(t[2], x_3);
    fr::__sub(x_3, x_2, x_3);
    fr::__sub(x_3, x_1, x_3);
    fr::__add(x_2, x_1, t[3]);
    fr::__add(t[3], x_3, t[4]);
    fr::__sub(x_1, x_3, t[6]);
    fr::__mul(t[2], t[6], y_3);
    fr::__sub(y_3, y_1, y_3);
    fr::__add(y_3, y_1, t[5]);

    fr::copy(y_2, state.w_l.at(index + 0));
    fr::copy(x_2, state.w_l.at(index + 1));
    fr::copy(x_1, state.w_l.at(index + 2));
    fr::copy(t[3], state.w_l.at(index + 3));
    fr::copy(y_3, state.w_l.at(index + 4));
    fr::copy(x_1, state.w_l.at(index + 5));
    fr::copy(t[2], state.w_l.at(index + 6));
    fr::copy(t[2], state.w_l.at(index + 7));
    fr::copy(t[2], state.w_l.at(index + 8));

    fr::copy(y_1, state.w_r.at(index + 0));
    fr::copy(x_1, state.w_r.at(index + 1));
    fr::copy(x_2, state.w_r.at(index + 2));
    fr::copy(x_3, state.w_r.at(index + 3));
    fr::copy(y_1, state.w_r.at(index + 4));
    fr::copy(x_3, state.w_r.at(index + 5));
    fr::copy(t[1], state.w_r.at(index + 6));
    fr::copy(t[2], state.w_r.at(index + 7));
    fr::copy(t[6], state.w_r.at(index + 8));

    fr::copy(t[0], state.w_o.at(index + 0));
    fr::copy(t[1], state.w_o.at(index + 1));
    fr::copy(t[3], state.w_o.at(index + 2));
    fr::copy(t[4], state.w_o.at(index + 3));
    fr::copy(t[5], state.w_o.at(index + 4));
    fr::copy(t[6], state.w_o.at(index + 5));
    fr::copy(t[0], state.w_o.at(index + 6));
    fr::copy(t[4], state.w_o.at(index + 7));
    fr::copy(t[5], state.w_o.at(index + 8));

    fr::zero(state.q_m.at(index + 0));
    fr::zero(state.q_m.at(index + 1));
    fr::zero(state.q_m.at(index + 2));
    fr::zero(state.q_m.at(index + 3));
    fr::zero(state.q_m.at(index + 4));
    fr::zero(state.q_m.at(index + 5));
    fr::one(state.q_m.at(index + 6));
    fr::__neg(fr::one(), state.q_m.at(index + 7));
    fr::__neg(fr::one(), state.q_m.at(index + 8));

    fr::one(state.q_l.at(index + 0));
    fr::one(state.q_l.at(index + 1));
    fr::one(state.q_l.at(index + 2));
    fr::one(state.q_l.at(index + 3));
    fr::one(state.q_l.at(index + 4));
    fr::one(state.q_l.at(index + 5));

    fr::zero(state.q_l.at(index + 6));
    fr::zero(state.q_l.at(index + 7));
    fr::zero(state.q_l.at(index + 8));

    fr::__neg(fr::one(), state.q_r.at(index + 0));
    fr::__neg(fr::one(), state.q_r.at(index + 1));
    fr::one(state.q_r.at(index + 2));
    fr::one(state.q_r.at(index + 3));
    fr::one(state.q_r.at(index + 4));
    fr::__neg(fr::one(), state.q_r.at(index + 5));
    fr::zero(state.q_r.at(index + 6));
    fr::zero(state.q_r.at(index + 7));
    fr::zero(state.q_r.at(index + 8));

    fr::__neg(fr::one(), state.q_o.at(index + 0));
    fr::__neg(fr::one(), state.q_o.at(index + 1));
    fr::__neg(fr::one(), state.q_o.at(index + 2));
    fr::__neg(fr::one(), state.q_o.at(index + 3));
    fr::__neg(fr::one(), state.q_o.at(index + 4));
    fr::__neg(fr::one(), state.q_o.at(index + 5));
    fr::__neg(fr::one(), state.q_o.at(index + 6));
    fr::one(state.q_o.at(index + 7));
    fr::one(state.q_o.at(index + 8));

    fr::zero(state.q_c.at(index + 0));
    fr::zero(state.q_c.at(index + 1));
    fr::zero(state.q_c.at(index + 2));
    fr::zero(state.q_c.at(index + 3));
    fr::zero(state.q_c.at(index + 4));
    fr::zero(state.q_c.at(index + 5));
    fr::zero(state.q_c.at(index + 6));
    fr::zero(state.q_c.at(index + 7));
    fr::zero(state.q_c.at(index + 8));

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

void generate_point_addition_data(waffle::plonk_circuit_state& state)
{
    state.challenges.beta = fr::random_element();
    state.challenges.gamma= fr::random_element();
    state.challenges.alpha= fr::random_element();

    state.w_l.resize(state.n);
    state.w_r.resize(state.n);
    state.w_o.resize(state.n);
    state.q_m.resize(state.n);
    state.q_l.resize(state.n);
    state.q_r.resize(state.n);
    state.q_o.resize(state.n);
    state.q_c.resize(state.n);
    state.sigma_1_mapping.resize(state.n);
    state.sigma_2_mapping.resize(state.n);
    state.sigma_3_mapping.resize(state.n);
    generate_point_addition_data_inner(state, 0);

    for (size_t i = 9; i < state.n; ++i)
    {
        state.sigma_1_mapping[i] = (uint32_t)i;
        state.sigma_2_mapping[i] = (uint32_t)(i + (1U << 30));
        state.sigma_3_mapping[i] = (uint32_t)(i + (1U << 31));

        fr::zero(state.w_l.at(i));
        fr::zero(state.w_r.at(i));
        fr::zero(state.w_o.at(i));
        fr::zero(state.q_m.at(i));
        fr::zero(state.q_l.at(i));
        fr::zero(state.q_r.at(i));
        fr::zero(state.q_o.at(i));
        fr::zero(state.q_c.at(i));
    }

}

void generate_test_data(waffle::plonk_circuit_state& state)
{
    size_t n = state.n;

    state.w_l.resize(state.n);
    state.w_r.resize(state.n);
    state.w_o.resize(state.n);
    state.q_m.resize(state.n);
    state.q_l.resize(state.n);
    state.q_r.resize(state.n);
    state.q_o.resize(state.n);
    state.q_c.resize(state.n);
    state.sigma_1_mapping.resize(state.n);
    state.sigma_2_mapping.resize(state.n);
    state.sigma_3_mapping.resize(state.n);

    // create some constraints that satisfy our arithmetic circuit relation
    fr::field_t one;
    fr::field_t zero;
    fr::field_t minus_one;
    fr::one(one);
    fr::__neg(one, minus_one);
    fr::zero(zero);
    fr::field_t T0;
    // even indices = mul gates, odd incides = add gates

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
    for (size_t i = 0; i < n / 2; ++i)
    {
        state.sigma_1_mapping[shift + i] = (uint32_t)i;
        state.sigma_2_mapping[shift + i] = (uint32_t)i + (1U << 30U);
        state.sigma_3_mapping[shift + i] = (uint32_t)i + (1U << 31U);
        state.sigma_1_mapping[i] = (uint32_t)(i + shift);
        state.sigma_2_mapping[i] = (uint32_t)(i + shift) + (1U << 30U);
        state.sigma_3_mapping[i] = (uint32_t)(i + shift) + (1U << 31U);
    }

    fr::zero(state.w_l.at(n-1));
    fr::zero(state.w_r.at(n-1));
    fr::zero(state.w_o.at(n-1));
    fr::zero(state.q_c.at(n-1));
    fr::zero(state.w_l.at(shift-1));
    fr::zero(state.w_r.at(shift-1));
    fr::zero(state.w_o.at(shift-1));
    fr::zero(state.q_c.at(shift-1));

    // make last permutation the same as identity permutation
    state.sigma_1_mapping[shift - 1] = (uint32_t)shift - 1;
    state.sigma_2_mapping[shift - 1] = (uint32_t)shift - 1 + (1U << 30U);
    state.sigma_3_mapping[shift - 1] = (uint32_t)shift - 1 + (1U << 31U);
    state.sigma_1_mapping[n - 1] = (uint32_t)n - 1;
    state.sigma_2_mapping[n - 1] = (uint32_t)n - 1 + (1U << 30U);
    state.sigma_3_mapping[n - 1] = (uint32_t)n - 1 + (1U << 31U);

    fr::zero(state.q_l.at(n - 1));
    fr::zero(state.q_r.at(n - 1));
    fr::zero(state.q_o.at(n - 1));
    fr::zero(state.q_m.at(n - 1));
}
}

TEST(prover, compute_quotient_polynomial_for_structured_circuit)
{
    size_t n = 16;

    waffle::plonk_circuit_state state(n);
    generate_point_addition_data(state);

    waffle::compute_permutation_lagrange_base_single(state.sigma_1, state.sigma_1_mapping, state.small_domain);
    waffle::compute_permutation_lagrange_base_single(state.sigma_2, state.sigma_2_mapping, state.small_domain);
    waffle::compute_permutation_lagrange_base_single(state.sigma_3, state.sigma_3_mapping, state.small_domain);
    state.compute_quotient_polynomial();

    for (size_t i = 3 * n; i < 4 * n; ++i)
    {
        EXPECT_EQ(fr::eq(state.quotient_large.at(i), fr::zero()), true);
    }
}

TEST(prover, compute_quotient_polynomial)
{
    size_t n = 256;

    waffle::plonk_circuit_state state(n);
    generate_test_data(state);

    waffle::compute_permutation_lagrange_base_single(state.sigma_1, state.sigma_1_mapping, state.small_domain);
    waffle::compute_permutation_lagrange_base_single(state.sigma_2, state.sigma_2_mapping, state.small_domain);
    waffle::compute_permutation_lagrange_base_single(state.sigma_3, state.sigma_3_mapping, state.small_domain);
    state.compute_quotient_polynomial();

    // check that the max degree of our quotient polynomial is 3n
    for (size_t i = 3 * n; i < 4 * n; ++i)
    {
        EXPECT_EQ(fr::eq(state.quotient_large.at(i), fr::zero()), true);
    }
}

// TEST(prover, compute_wire_commitments)
// {
//     size_t n = 256;

//     waffle::plonk_circuit_state state(n);

//     waffle::compute_permutation_lagrange_base_single(state.sigma_1, state.sigma_1_mapping, state.small_domain);
//     waffle::compute_permutation_lagrange_base_single(state.sigma_2, state.sigma_2_mapping, state.small_domain);
//     waffle::compute_permutation_lagrange_base_single(state.sigma_3, state.sigma_3_mapping, state.small_domain);
//     state.quotient_large.resize_unsafe(4 * n);
//     state.quotient_mid.resize_unsafe(2 * n);
//     state.compute_wire_coefficients();


//     fr::field_t w_l_copy[n];
//     fr::field_t w_r_copy[n];
//     fr::field_t w_o_copy[n];
//     polynomials::copy_polynomial(state.w_l, w_l_copy, n, n);
//     polynomials::copy_polynomial(state.w_r, w_r_copy, n, n);
//     polynomials::copy_polynomial(state.w_o, w_o_copy, n, n);

//     fr::field_t w_l_eval;
//     fr::field_t w_r_eval;
//     fr::field_t w_o_eval;


//     w_l_eval = polynomials::evaluate(w_l_copy, x, n);
//     w_r_eval = polynomials::evaluate(w_r_copy, x, n);
//     w_o_eval = polynomials::evaluate(w_o_copy, x, n);

//     waffle::plonk_proof proof;
//     waffle::compute_wire_commitments(state, proof, srs);

//     g1::affine_element generator = g1::affine_one();
//     g1::affine_element expected_w_l = g1::group_exponentiation(generator, w_l_eval);
//     g1::affine_element expected_w_r = g1::group_exponentiation(generator, w_r_eval);
//     g1::affine_element expected_w_o = g1::group_exponentiation(generator, w_o_eval);

//     EXPECT_EQ(fq::eq(proof.W_L.x, expected_w_l.x), true);
//     EXPECT_EQ(fq::eq(proof.W_L.y, expected_w_l.y), true);
//     EXPECT_EQ(fq::eq(proof.W_R.x, expected_w_r.x), true);
//     EXPECT_EQ(fq::eq(proof.W_R.y, expected_w_r.y), true);
//     EXPECT_EQ(fq::eq(proof.W_O.x, expected_w_o.x), true);
//     EXPECT_EQ(fq::eq(proof.W_O.y, expected_w_o.y), true);
// }

// TEST(prover, compute_z_commitments)
// {
//     size_t n = 256;

//     waffle::circuit_state state(n);
//     // state.small_domain = polynomials::evaluation_domain(n);
//     // state.mid_domain = polynomials::evaluation_domain(2 * n);
//     // state.large_domain = polynomials::evaluation_domain(4 * n);
//     state.n = n;

//     fr::field_t* data = (fr::field_t*)(aligned_alloc(32, sizeof(fr::field_t) * (28 * n + 2)));
//     fr::field_t* scratch_space = (fr::field_t*)(aligned_alloc(32, sizeof(fr::field_t) * (24 * n + 8)));
//     g1::affine_element* monomials = (g1::affine_element*)(aligned_alloc(32, sizeof(g1::affine_element) * (6 * n + 2)));

//     waffle::fft_pointers ffts;
//     ffts.scratch_memory = scratch_space;
//     ffts.w_l_poly = &ffts.scratch_memory[0];
//     ffts.w_r_poly = &ffts.scratch_memory[4 * n];
//     ffts.w_o_poly = &ffts.scratch_memory[8 * n];
//     ffts.z_1_poly = &ffts.scratch_memory[12 * n];
//     ffts.quotient_poly = &ffts.scratch_memory[20 * n];
//     generate_test_data(state, data);

//     fr::field_t x = fr::random_element();
//     srs::plonk_srs srs;
//     // g1::affine_element monomials[2 * n + 1];
//     monomials[0] = g1::affine_one();

//     for (size_t i = 1; i < n; ++i)
//     {
//         monomials[i] = g1::group_exponentiation(monomials[i-1], x);
//     }
//     scalar_multiplication::generate_pippenger_point_table(monomials, monomials, n);
//     srs.monomials = monomials;
//     srs.degree = n;
//     waffle::convert_permutations_into_lagrange_base_form(state);
//     waffle::compute_wire_coefficients(state, ffts);

//     waffle::compute_z_coefficients(state, ffts);

//     fr::field_t z_1_copy[n];
//     polynomials::copy_polynomial(state.z_1, z_1_copy, n, n);

//     fr::field_t z_1_eval;


//     z_1_eval = polynomials::evaluate(z_1_copy, x, n);

//     waffle::plonk_proof proof;
//     waffle::compute_z_commitments(state, proof, srs);

//     g1::affine_element generator = g1::affine_one();
//     g1::affine_element expected_z_1 = g1::group_exponentiation(generator, z_1_eval);

//     EXPECT_EQ(fq::eq(proof.Z_1.x, expected_z_1.x), true);
//     EXPECT_EQ(fq::eq(proof.Z_1.y, expected_z_1.y), true);

//     free(monomials);
//     free(scratch_space);
//     free(data);
// }

TEST(prover, compute_linearisation_coefficients)
{
    size_t n = 256;

    waffle::plonk_circuit_state state(n);
    generate_test_data(state);

    waffle::compute_permutation_lagrange_base_single(state.sigma_1, state.sigma_1_mapping, state.small_domain);
    waffle::compute_permutation_lagrange_base_single(state.sigma_2, state.sigma_2_mapping, state.small_domain);
    waffle::compute_permutation_lagrange_base_single(state.sigma_3, state.sigma_3_mapping, state.small_domain);
    state.compute_quotient_polynomial();
    state.compute_quotient_commitment();

    fr::field_t t_eval = state.compute_linearisation_coefficients();

    polynomial_arithmetic::lagrange_evaluations lagrange_evals = polynomial_arithmetic::get_lagrange_evaluations(state.challenges.z, state.small_domain);

    fr::field_t alpha_pow[6];
    fr::copy(state.challenges.alpha, alpha_pow[0]);
    for (size_t i = 1; i < 6; ++i)
    {
        fr::__mul(alpha_pow[i - 1], alpha_pow[0], alpha_pow[i]);
    }

    fr::field_t T0;
    fr::field_t T1;
    fr::field_t T2;
    fr::field_t T3;
    fr::__mul(state.proof.sigma_1_eval, state.challenges.beta, T0);
    fr::__add(state.proof.w_l_eval, state.challenges.gamma, T1);
    fr::__add(T0, T1, T0);

    fr::__mul(state.proof.sigma_2_eval, state.challenges.beta, T2);
    fr::__add(state.proof.w_r_eval, state.challenges.gamma, T1);
    fr::__add(T2, T1, T2);

    fr::__add(state.proof.w_o_eval, state.challenges.gamma, T3);

    fr::__mul(T0, T2, T0);
    fr::__mul(T0, T3, T0);
    fr::__mul(T0, state.proof.z_1_shifted_eval, T0);
    fr::__mul(T0, alpha_pow[1], T0);

    fr::__sub(state.proof.z_1_shifted_eval, fr::one(), T1);
    fr::__mul(T1, lagrange_evals.l_n_minus_1, T1);
    fr::__mul(T1, alpha_pow[2], T1);

    fr::__mul(lagrange_evals.l_1, alpha_pow[3], T2);

    fr::__sub(T1, T2, T1);
    fr::__sub(T1, T0, T1);

    fr::field_t rhs;
    fr::__add(T1, state.proof.linear_eval, rhs);
    fr::__invert(lagrange_evals.vanishing_poly, T0);
    fr::__mul(rhs, T0, rhs);

    EXPECT_EQ(fr::eq(t_eval, rhs), true);
}

