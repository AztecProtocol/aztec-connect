#include <gtest/gtest.h>

#include <barretenberg/polynomials/polynomial.hpp>
#include <barretenberg/polynomials/polynomial_arithmetic.hpp>
#include <barretenberg/waffle/proof_system/permutation.hpp>
#include <barretenberg/waffle/proof_system/prover/prover.hpp>
#include <barretenberg/waffle/proof_system/widgets/arithmetic_widget.hpp>

#include <barretenberg/curves/bn254/g1.hpp>
#include <barretenberg/curves/bn254/scalar_multiplication/scalar_multiplication.hpp>

#include <barretenberg/transcript/manifest.hpp>

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
using namespace waffle;

namespace {

transcript::Manifest create_manifest(const size_t num_public_inputs = 0)
{
    constexpr size_t g1_size = 64;
    constexpr size_t fr_size = 32;
    const size_t public_input_size = fr_size * num_public_inputs;
    static const transcript::Manifest output = transcript::Manifest(
        { transcript::Manifest::RoundManifest({ { "circuit_size", 4, false } }, "init"),
          transcript::Manifest::RoundManifest({ { "public_inputs", public_input_size, false },
                                                               { "W_1", g1_size, false },
                                                               { "W_2", g1_size, false },
                                                               { "W_3", g1_size, false } },
                                                             "beta"),
          transcript::Manifest::RoundManifest({ {} }, "gamma"),
          transcript::Manifest::RoundManifest({ { "Z", g1_size, false } }, "alpha"),
          transcript::Manifest::RoundManifest(
              { { "T_1", g1_size, false }, { "T_2", g1_size, false }, { "T_3", g1_size, false } }, "z"),
          transcript::Manifest::RoundManifest({ { "w_1", fr_size, false },
                                                               { "w_2", fr_size, false },
                                                               { "w_3", fr_size, false },
                                                               { "z_omega", fr_size, false },
                                                               { "sigma_1", fr_size, false },
                                                               { "sigma_2", fr_size, false },
                                                               { "r", fr_size, false },
                                                               { "t", fr_size, true } },
                                                             "nu"),
          transcript::Manifest::RoundManifest(
              { { "PI_Z", g1_size, false }, { "PI_Z_OMEGA", g1_size, false } }, "separator") });
    return output;
}

waffle::Prover generate_test_data(const size_t n)
{
    // state.widgets.emplace_back(std::make_unique<waffle::ProverArithmeticWidget>(n));

    // create some constraints that satisfy our arithmetic circuit relation
    fr::field_t T0;

    // even indices = mul gates, odd incides = add gates

    std::shared_ptr<proving_key> key = std::make_shared<proving_key>(n);
    std::shared_ptr<program_witness> witness = std::make_shared<program_witness>();

    polynomial w_l;
    polynomial w_r;
    polynomial w_o;
    polynomial q_l;
    polynomial q_r;
    polynomial q_o;
    polynomial q_c;
    polynomial q_m;

    w_l.resize(n);
    w_r.resize(n);
    w_o.resize(n);
    q_l.resize(n);
    q_r.resize(n);
    q_o.resize(n);
    q_m.resize(n);
    q_c.resize(n);

    for (size_t i = 0; i < n / 4; ++i) {
        w_l.at(2 * i) = fr::random_element();
        w_r.at(2 * i) = fr::random_element();
        fr::__mul(w_l.at(2 * i), w_r.at(2 * i), w_o.at(2 * i));
        fr::__add(w_o[2 * i], w_l[2 * i], w_o[2 * i]);
        fr::__add(w_o[2 * i], w_r[2 * i], w_o[2 * i]);
        fr::__add(w_o[2 * i], fr::one, w_o[2 * i]);
        fr::__copy(fr::one, q_l.at(2 * i));
        fr::__copy(fr::one, q_r.at(2 * i));
        fr::__copy(fr::neg_one(), q_o.at(2 * i));
        fr::__copy(fr::one, q_c.at(2 * i));
        fr::__copy(fr::one, q_m.at(2 * i));

        w_l.at(2 * i + 1) = fr::random_element();
        w_r.at(2 * i + 1) = fr::random_element();
        w_o.at(2 * i + 1) = fr::random_element();

        fr::__add(w_l.at(2 * i + 1), w_r.at(2 * i + 1), T0);
        fr::__add(T0, w_o.at(2 * i + 1), q_c.at(2 * i + 1));
        fr::__neg(q_c.at(2 * i + 1), q_c.at(2 * i + 1));
        q_l.at(2 * i + 1) = fr::one;
        q_r.at(2 * i + 1) = fr::one;
        q_o.at(2 * i + 1) = fr::one;
        q_m.at(2 * i + 1) = fr::zero;
    }
    size_t shift = n / 2;
    polynomial_arithmetic::copy_polynomial(&w_l.at(0), &w_l.at(shift), shift, shift);
    polynomial_arithmetic::copy_polynomial(&w_r.at(0), &w_r.at(shift), shift, shift);
    polynomial_arithmetic::copy_polynomial(&w_o.at(0), &w_o.at(shift), shift, shift);
    polynomial_arithmetic::copy_polynomial(&q_m.at(0), &q_m.at(shift), shift, shift);
    polynomial_arithmetic::copy_polynomial(&q_l.at(0), &q_l.at(shift), shift, shift);
    polynomial_arithmetic::copy_polynomial(&q_r.at(0), &q_r.at(shift), shift, shift);
    polynomial_arithmetic::copy_polynomial(&q_o.at(0), &q_o.at(shift), shift, shift);
    polynomial_arithmetic::copy_polynomial(&q_c.at(0), &q_c.at(shift), shift, shift);

    std::vector<uint32_t> sigma_1_mapping;
    std::vector<uint32_t> sigma_2_mapping;
    std::vector<uint32_t> sigma_3_mapping;
    // create basic permutation - second half of witness vector is a copy of the first half
    sigma_1_mapping.resize(n);
    sigma_2_mapping.resize(n);
    sigma_3_mapping.resize(n);

    for (size_t i = 0; i < n / 2; ++i) {
        sigma_1_mapping[shift + i] = (uint32_t)i;
        sigma_2_mapping[shift + i] = (uint32_t)i + (1U << 30U);
        sigma_3_mapping[shift + i] = (uint32_t)i + (1U << 31U);
        sigma_1_mapping[i] = (uint32_t)(i + shift);
        sigma_2_mapping[i] = (uint32_t)(i + shift) + (1U << 30U);
        sigma_3_mapping[i] = (uint32_t)(i + shift) + (1U << 31U);
    }
    // make last permutation the same as identity permutation
    sigma_1_mapping[shift - 1] = (uint32_t)shift - 1;
    sigma_2_mapping[shift - 1] = (uint32_t)shift - 1 + (1U << 30U);
    sigma_3_mapping[shift - 1] = (uint32_t)shift - 1 + (1U << 31U);
    sigma_1_mapping[n - 1] = (uint32_t)n - 1;
    sigma_2_mapping[n - 1] = (uint32_t)n - 1 + (1U << 30U);
    sigma_3_mapping[n - 1] = (uint32_t)n - 1 + (1U << 31U);

    polynomial sigma_1(key->n);
    polynomial sigma_2(key->n);
    polynomial sigma_3(key->n);

    waffle::compute_permutation_lagrange_base_single<standard_settings>(sigma_1, sigma_1_mapping, key->small_domain);
    waffle::compute_permutation_lagrange_base_single<standard_settings>(sigma_2, sigma_2_mapping, key->small_domain);
    waffle::compute_permutation_lagrange_base_single<standard_settings>(sigma_3, sigma_3_mapping, key->small_domain);

    polynomial sigma_1_lagrange_base(sigma_1, key->n);
    polynomial sigma_2_lagrange_base(sigma_2, key->n);
    polynomial sigma_3_lagrange_base(sigma_3, key->n);

    key->permutation_selectors_lagrange_base.insert({ "sigma_1", std::move(sigma_1_lagrange_base) });
    key->permutation_selectors_lagrange_base.insert({ "sigma_2", std::move(sigma_2_lagrange_base) });
    key->permutation_selectors_lagrange_base.insert({ "sigma_3", std::move(sigma_3_lagrange_base) });

    sigma_1.ifft(key->small_domain);
    sigma_2.ifft(key->small_domain);
    sigma_3.ifft(key->small_domain);
    constexpr size_t width = 4;
    polynomial sigma_1_fft(sigma_1, key->n * width);
    polynomial sigma_2_fft(sigma_2, key->n * width);
    polynomial sigma_3_fft(sigma_3, key->n * width);

    sigma_1_fft.coset_fft(key->large_domain);
    sigma_2_fft.coset_fft(key->large_domain);
    sigma_3_fft.coset_fft(key->large_domain);

    key->permutation_selectors.insert({ "sigma_1", std::move(sigma_1) });
    key->permutation_selectors.insert({ "sigma_2", std::move(sigma_2) });
    key->permutation_selectors.insert({ "sigma_3", std::move(sigma_3) });

    key->permutation_selector_ffts.insert({ "sigma_1_fft", std::move(sigma_1_fft) });
    key->permutation_selector_ffts.insert({ "sigma_2_fft", std::move(sigma_2_fft) });
    key->permutation_selector_ffts.insert({ "sigma_3_fft", std::move(sigma_3_fft) });

    w_l.at(n - 1) = fr::zero;
    w_r.at(n - 1) = fr::zero;
    w_o.at(n - 1) = fr::zero;
    q_c.at(n - 1) = fr::zero;
    q_l.at(n - 1) = fr::zero;
    q_r.at(n - 1) = fr::zero;
    q_o.at(n - 1) = fr::zero;
    q_m.at(n - 1) = fr::zero;

    w_l.at(shift - 1) = fr::zero;
    w_r.at(shift - 1) = fr::zero;
    w_o.at(shift - 1) = fr::zero;
    q_c.at(shift - 1) = fr::zero;

    witness->wires.insert({ "w_1" , std::move(w_l) });
    witness->wires.insert({ "w_2" , std::move(w_r) });
    witness->wires.insert({ "w_3" , std::move(w_o) });

    q_l.ifft(key->small_domain);
    q_r.ifft(key->small_domain);
    q_o.ifft(key->small_domain);
    q_m.ifft(key->small_domain);
    q_c.ifft(key->small_domain);

    polynomial q_1_fft(q_l, n * 2);
    polynomial q_2_fft(q_r, n * 2);
    polynomial q_3_fft(q_o, n * 2);
    polynomial q_m_fft(q_m, n * 2);
    polynomial q_c_fft(q_c, n * 2);

    q_1_fft.coset_fft(key->mid_domain);
    q_2_fft.coset_fft(key->mid_domain);
    q_3_fft.coset_fft(key->mid_domain);
    q_m_fft.coset_fft(key->mid_domain);
    q_c_fft.coset_fft(key->mid_domain);

    key->constraint_selectors.insert({ "q_1", std::move(q_l) });
    key->constraint_selectors.insert({ "q_2", std::move(q_r) });
    key->constraint_selectors.insert({ "q_3", std::move(q_o) });
    key->constraint_selectors.insert({ "q_m", std::move(q_m) });
    key->constraint_selectors.insert({ "q_c", std::move(q_c) });

    key->constraint_selector_ffts.insert({ "q_1_fft", std::move(q_1_fft) });
    key->constraint_selector_ffts.insert({ "q_2_fft", std::move(q_2_fft) });
    key->constraint_selector_ffts.insert({ "q_3_fft", std::move(q_3_fft) });
    key->constraint_selector_ffts.insert({ "q_m_fft", std::move(q_m_fft) });
    key->constraint_selector_ffts.insert({ "q_c_fft", std::move(q_c_fft) });
    std::unique_ptr<waffle::ProverArithmeticWidget> widget = std::make_unique<waffle::ProverArithmeticWidget>(key.get(), witness.get());

    waffle::Prover state = waffle::Prover(key, witness, create_manifest());
    state.widgets.emplace_back(std::move(widget));
    return state;
}
} // namespace

TEST(prover, compute_quotient_polynomial)
{
    size_t n = 1 << 10;

    waffle::Prover state = generate_test_data(n);

    state.execute_preamble_round();
    state.execute_first_round();
    state.execute_second_round();
    state.execute_third_round();

    // check that the max degree of our quotient polynomial is 3n
    for (size_t i = 3 * n; i < 4 * n; ++i) {
        EXPECT_EQ(fr::eq(state.key->quotient_large.at(i), fr::zero), true);
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