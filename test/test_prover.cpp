#include <gtest/gtest.h>

#include <barretenberg/polynomials/polynomial.hpp>
#include <barretenberg/polynomials/polynomial_arithmetic.hpp>
#include <barretenberg/waffle/proof_system/permutation.hpp>
#include <barretenberg/waffle/proof_system/prover/prover.hpp>
#include <barretenberg/waffle/proof_system/widgets/arithmetic_widget.hpp>

#include <barretenberg/curves/bn254/g1.hpp>
#include <barretenberg/curves/bn254/scalar_multiplication.hpp>

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

namespace {

void generate_test_data(waffle::Prover& state)
{
    size_t n = state.n;
    std::unique_ptr<waffle::ProverArithmeticWidget> widget = std::make_unique<waffle::ProverArithmeticWidget>(n);
    // state.widgets.emplace_back(std::make_unique<waffle::ProverArithmeticWidget>(n));

    // create some constraints that satisfy our arithmetic circuit relation
    fr::field_t T0;

    // even indices = mul gates, odd incides = add gates

    state.w_l.resize(n);
    state.w_r.resize(n);
    state.w_o.resize(n);

    for (size_t i = 0; i < n / 4; ++i) {
        state.w_l.at(2 * i) = fr::random_element();
        state.w_r.at(2 * i) = fr::random_element();
        fr::__mul(state.w_l.at(2 * i), state.w_r.at(2 * i), state.w_o.at(2 * i));
        fr::__add(state.w_o[2 * i], state.w_l[2 * i], state.w_o[2 * i]);
        fr::__add(state.w_o[2 * i], state.w_r[2 * i], state.w_o[2 * i]);
        fr::__add(state.w_o[2 * i], fr::one, state.w_o[2 * i]);
        fr::__copy(fr::one, widget->q_l.at(2 * i));
        fr::__copy(fr::one, widget->q_r.at(2 * i));
        fr::__copy(fr::neg_one(), widget->q_o.at(2 * i));
        fr::__copy(fr::one, widget->q_c.at(2 * i));
        fr::__copy(fr::one, widget->q_m.at(2 * i));

        state.w_l.at(2 * i + 1) = fr::random_element();
        state.w_r.at(2 * i + 1) = fr::random_element();
        state.w_o.at(2 * i + 1) = fr::random_element();

        fr::__add(state.w_l.at(2 * i + 1), state.w_r.at(2 * i + 1), T0);
        fr::__add(T0, state.w_o.at(2 * i + 1), widget->q_c.at(2 * i + 1));
        fr::__neg(widget->q_c.at(2 * i + 1), widget->q_c.at(2 * i + 1));
        widget->q_l.at(2 * i + 1) = fr::one;
        widget->q_r.at(2 * i + 1) = fr::one;
        widget->q_o.at(2 * i + 1) = fr::one;
        widget->q_m.at(2 * i + 1) = fr::zero;
    }
    size_t shift = n / 2;
    polynomial_arithmetic::copy_polynomial(&state.w_l.at(0), &state.w_l.at(shift), shift, shift);
    polynomial_arithmetic::copy_polynomial(&state.w_r.at(0), &state.w_r.at(shift), shift, shift);
    polynomial_arithmetic::copy_polynomial(&state.w_o.at(0), &state.w_o.at(shift), shift, shift);
    polynomial_arithmetic::copy_polynomial(&widget->q_m.at(0), &widget->q_m.at(shift), shift, shift);
    polynomial_arithmetic::copy_polynomial(&widget->q_l.at(0), &widget->q_l.at(shift), shift, shift);
    polynomial_arithmetic::copy_polynomial(&widget->q_r.at(0), &widget->q_r.at(shift), shift, shift);
    polynomial_arithmetic::copy_polynomial(&widget->q_o.at(0), &widget->q_o.at(shift), shift, shift);
    polynomial_arithmetic::copy_polynomial(&widget->q_c.at(0), &widget->q_c.at(shift), shift, shift);

    // create basic permutation - second half of witness vector is a copy of the first half
    state.sigma_1_mapping.resize(n);
    state.sigma_2_mapping.resize(n);
    state.sigma_3_mapping.resize(n);

    for (size_t i = 0; i < n / 2; ++i) {
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

    state.w_l.at(n - 1) = fr::zero;
    state.w_r.at(n - 1) = fr::zero;
    state.w_o.at(n - 1) = fr::zero;
    widget->q_c.at(n - 1) = fr::zero;
    widget->q_l.at(n - 1) = fr::zero;
    widget->q_r.at(n - 1) = fr::zero;
    widget->q_o.at(n - 1) = fr::zero;
    widget->q_m.at(n - 1) = fr::zero;

    state.w_l.at(shift - 1) = fr::zero;
    state.w_r.at(shift - 1) = fr::zero;
    state.w_o.at(shift - 1) = fr::zero;
    widget->q_c.at(shift - 1) = fr::zero;

    state.widgets.emplace_back(std::move(widget));
}
} // namespace

TEST(prover, compute_quotient_polynomial)
{
    size_t n = 1 << 10;

    waffle::Prover state(n);
    generate_test_data(state);

    waffle::compute_permutation_lagrange_base_single(
        state.sigma_1, state.sigma_1_mapping, state.circuit_state.small_domain);
    waffle::compute_permutation_lagrange_base_single(
        state.sigma_2, state.sigma_2_mapping, state.circuit_state.small_domain);
    waffle::compute_permutation_lagrange_base_single(
        state.sigma_3, state.sigma_3_mapping, state.circuit_state.small_domain);
    state.compute_quotient_polynomial();

    // check that the max degree of our quotient polynomial is 3n
    for (size_t i = 3 * n; i < 4 * n; ++i) {
        EXPECT_EQ(fr::eq(state.circuit_state.quotient_large.at(i), fr::zero), true);
    }
}

/*
TEST(prover, compute_linearisation_coefficients)
{
    size_t n = 256;

    waffle::plonk_circuit_state state(n);
    generate_test_data(state);

    waffle::compute_permutation_lagrange_base_single(state.sigma_1, state.sigma_1_mapping,
state.circuit_state.small_domain); waffle::compute_permutation_lagrange_base_single(state.sigma_2,
state.sigma_2_mapping, state.circuit_state.small_domain);
    waffle::compute_permutation_lagrange_base_single(state.sigma_3, state.sigma_3_mapping,
state.circuit_state.small_domain); state.compute_quotient_polynomial(); state.compute_quotient_commitment();

    fr::field_t t_eval = state.compute_linearisation_coefficients();

    polynomial_arithmetic::lagrange_evaluations lagrange_evals =
polynomial_arithmetic::get_lagrange_evaluations(state.challenges.z, state.circuit_state.small_domain);

    fr::field_t alpha_pow[6];
    fr::__copy(state.challenges.alpha, alpha_pow[0]);
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

    fr::__sub(state.proof.z_1_shifted_eval, fr::one, T1);
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
*/