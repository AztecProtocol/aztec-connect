#include <gtest/gtest.h>

#include <barretenberg/waffle/widget_prover.hpp>
#include <barretenberg/waffle/preprocess.hpp>
#include <barretenberg/waffle/widget_verifier.hpp>
#include <barretenberg/polynomials/polynomial_arithmetic.hpp>
#include <barretenberg/waffle/composer/standard_composer.hpp>
#include <barretenberg/waffle/widgets/arithmetic_widget.hpp>
#include <memory>
namespace
{

using namespace barretenberg;

// void generate_test_data(waffle::Prover& state, waffle::plonk_circuit_state &old_state)
// {
//     size_t n = state.n;
//     std::unique_ptr<waffle::ProverArithmeticWidget> widget = std::make_unique<waffle::ProverArithmeticWidget>(n);
//     // state.widgets.emplace_back(std::make_unique<waffle::ProverArithmeticWidget>(n));

//     // create some constraints that satisfy our arithmetic circuit relation
//     fr::field_t one;
//     fr::field_t zero;
//     fr::field_t minus_one;
//     fr::one(one);
//     fr::__neg(one, minus_one);
//     fr::zero(zero);
//     fr::field_t T0;
//     // even indices = mul gates, odd incides = add gates

//     state.w_l.resize(n);
//     state.w_r.resize(n);
//     state.w_o.resize(n);

//     for (size_t i = 0; i < n / 4; ++i)
//     {
//         state.w_l.at(2 * i) = fr::random_element();
//         state.w_r.at(2 * i) = fr::random_element();
//         fr::__mul(state.w_l.at(2 * i), state.w_r.at(2 * i), state.w_o.at(2 * i));
//         fr::copy(zero, widget->q_l.at(2 * i));
//         fr::copy(zero, widget->q_r.at(2 * i));
//         fr::copy(minus_one, widget->q_o.at(2 * i));
//         fr::copy(zero, widget->q_c.at(2 * i));
//         fr::copy(one, widget->q_m.at(2 * i));

//         state.w_l.at(2 * i + 1) = fr::random_element();
//         state.w_r.at(2 * i + 1) = fr::random_element();
//         state.w_o.at(2 * i + 1) = fr::random_element();

//         fr::__add(state.w_l.at(2 * i + 1), state.w_r.at(2 * i + 1), T0);
//         fr::__add(T0, state.w_o.at(2 * i + 1), widget->q_c.at(2 * i + 1));
//         fr::__neg(widget->q_c.at(2 * i + 1), widget->q_c.at(2 * i + 1));
//         fr::one(widget->q_l.at(2 * i + 1));
//         fr::one(widget->q_r.at(2 * i + 1));
//         fr::one(widget->q_o.at(2 * i + 1));
//         fr::zero(widget->q_m.at(2 * i + 1));
//     }
//     size_t shift = n / 2;
//     polynomial_arithmetic::copy_polynomial(&state.w_l.at(0), &state.w_l.at(shift), shift, shift);
//     polynomial_arithmetic::copy_polynomial(&state.w_r.at(0), &state.w_r.at(shift), shift, shift);
//     polynomial_arithmetic::copy_polynomial(&state.w_o.at(0), &state.w_o.at(shift), shift, shift);
//     polynomial_arithmetic::copy_polynomial(&widget->q_m.at(0), &widget->q_m.at(shift), shift, shift);
//     polynomial_arithmetic::copy_polynomial(&widget->q_l.at(0), &widget->q_l.at(shift), shift, shift);
//     polynomial_arithmetic::copy_polynomial(&widget->q_r.at(0), &widget->q_r.at(shift), shift, shift);
//     polynomial_arithmetic::copy_polynomial(&widget->q_o.at(0), &widget->q_o.at(shift), shift, shift);
//     polynomial_arithmetic::copy_polynomial(&widget->q_c.at(0), &widget->q_c.at(shift), shift, shift);

//     // create basic permutation - second half of witness vector is a copy of the first half
//     state.sigma_1_mapping.resize(n);
//     state.sigma_2_mapping.resize(n);
//     state.sigma_3_mapping.resize(n);

//     // TODO REMOVE
//     // for (size_t i = 0; i < n; ++i)
//     // {
//     //     state.sigma_1_mapping[i] = (uint32_t)(i);
//     //     state.sigma_2_mapping[i] = (uint32_t)(i) + (1U << 30U);
//     //     state.sigma_3_mapping[i] = (uint32_t)(i) + (1U << 31U);
//     // }
//     for (size_t i = 0; i < n / 2; ++i)
//     {
//         state.sigma_1_mapping[shift + i] = (uint32_t)i;
//         state.sigma_2_mapping[shift + i] = (uint32_t)i + (1U << 30U);
//         state.sigma_3_mapping[shift + i] = (uint32_t)i + (1U << 31U);
//         state.sigma_1_mapping[i] = (uint32_t)(i + shift);
//         state.sigma_2_mapping[i] = (uint32_t)(i + shift) + (1U << 30U);
//         state.sigma_3_mapping[i] = (uint32_t)(i + shift) + (1U << 31U);
//     }
//     // make last permutation the same as identity permutation
//     state.sigma_1_mapping[shift - 1] = (uint32_t)shift - 1;
//     state.sigma_2_mapping[shift - 1] = (uint32_t)shift - 1 + (1U << 30U);
//     state.sigma_3_mapping[shift - 1] = (uint32_t)shift - 1 + (1U << 31U);
//     state.sigma_1_mapping[n - 1] = (uint32_t)n - 1;
//     state.sigma_2_mapping[n - 1] = (uint32_t)n - 1 + (1U << 30U);
//     state.sigma_3_mapping[n - 1] = (uint32_t)n - 1 + (1U << 31U);

//     fr::zero(state.w_l.at(n-1));
//     fr::zero(state.w_r.at(n-1));
//     fr::zero(state.w_o.at(n-1));
//     fr::zero(widget->q_c.at(n-1));
//     fr::zero(widget->q_l.at(n - 1));
//     fr::zero(widget->q_r.at(n - 1));
//     fr::zero(widget->q_o.at(n - 1));
//     fr::zero(widget->q_m.at(n - 1));

//     fr::zero(state.w_l.at(shift-1));
//     fr::zero(state.w_r.at(shift-1));
//     fr::zero(state.w_o.at(shift-1));
//     fr::zero(widget->q_c.at(shift-1));

//     old_state.w_l = polynomial(state.w_l);
//     old_state.w_r = polynomial(state.w_r);
//     old_state.w_o = polynomial(state.w_o);
//     old_state.q_m = polynomial(widget->q_m);
//     old_state.q_l = polynomial(widget->q_l);
//     old_state.q_r = polynomial(widget->q_r);
//     old_state.q_o = polynomial(widget->q_o);
//     old_state.q_c = polynomial(widget->q_c);

//     for (size_t i = 0; i < state.sigma_1_mapping.size(); ++i)
//     {
//         old_state.sigma_1_mapping.emplace_back(state.sigma_1_mapping[i]);
//         old_state.sigma_2_mapping.emplace_back(state.sigma_2_mapping[i]);
//         old_state.sigma_3_mapping.emplace_back(state.sigma_3_mapping[i]);
//     }

//     state.widgets.emplace_back(std::move(widget));
// }
// void comparison_proof(waffle::Prover& state)
// {
//     EXPECT_EQ(state.n, 16);
//     std::unique_ptr<waffle::ProverArithmeticWidget> widget = std::make_unique<waffle::ProverArithmeticWidget>(n);

//     state.w_l.resize(n);
//     widget->w_r.resize(n);
//     widget->w_o.resize(n);

//     for (size_t i = 0; i < n; ++i)
//     {
//         fr::copy(fr::zero(), state.q_m[i]);
//         fr::copy(fr::zero(), state.q_c[i]);
//         fr::copy(fr::one(), state.q_l[i]);
//         fr::copy(fr::one(), state.q_r[i]);
//         fr::copy(fr::neg_one(), state.q_o[i]);
//         fr::copy(fr::one(), widget->w_l[i]);
//         fr::copy(fr::one(), widget->w_r[i]);
//         fr::add(fr::one(), fr::one(), widget->w_o[i]);
//     }
//     state.sigma_1_mapping.resize(n);
//     state.sigma_2_mapping.resize(n);
//     state.sigma_3_mapping.resize(n);
// }
}

TEST(composer, test_add_gate_proofs)
{
    waffle::StandardComposer composer = waffle::StandardComposer();
    fr::field_t a = fr::one();
    fr::field_t b = fr::one();
    fr::field_t c = fr::add(a, b);
    fr::field_t d = fr::add(a, c);
    uint32_t a_idx = composer.add_variable(a);
    uint32_t b_idx = composer.add_variable(b);
    uint32_t c_idx = composer.add_variable(c);
    uint32_t d_idx = composer.add_variable(d);
    composer.create_add_gate({a_idx, b_idx, c_idx, fr::one(), fr::one(), fr::neg_one(), fr::zero() });

    composer.create_add_gate({d_idx, c_idx, a_idx, fr::one(), fr::neg_one(), fr::neg_one(), fr::zero() });

    composer.create_add_gate({a_idx, b_idx, c_idx, fr::one(), fr::one(), fr::neg_one(), fr::zero() });
    composer.create_add_gate({a_idx, b_idx, c_idx, fr::one(), fr::one(), fr::neg_one(), fr::zero() });
    composer.create_add_gate({a_idx, b_idx, c_idx, fr::one(), fr::one(), fr::neg_one(), fr::zero() });
    composer.create_add_gate({a_idx, b_idx, c_idx, fr::one(), fr::one(), fr::neg_one(), fr::zero() });
    composer.create_add_gate({a_idx, b_idx, c_idx, fr::one(), fr::one(), fr::neg_one(), fr::zero() });
    composer.create_add_gate({a_idx, b_idx, c_idx, fr::one(), fr::one(), fr::neg_one(), fr::zero() });
    composer.create_add_gate({a_idx, b_idx, c_idx, fr::one(), fr::one(), fr::neg_one(), fr::zero() });
    composer.create_add_gate({a_idx, b_idx, c_idx, fr::one(), fr::one(), fr::neg_one(), fr::zero() });
    composer.create_add_gate({a_idx, b_idx, c_idx, fr::one(), fr::one(), fr::neg_one(), fr::zero() });
    composer.create_add_gate({a_idx, b_idx, c_idx, fr::one(), fr::one(), fr::neg_one(), fr::zero() });
    composer.create_add_gate({a_idx, b_idx, c_idx, fr::one(), fr::one(), fr::neg_one(), fr::zero() });
    composer.create_add_gate({a_idx, b_idx, c_idx, fr::one(), fr::one(), fr::neg_one(), fr::zero() });
    composer.create_add_gate({a_idx, b_idx, c_idx, fr::one(), fr::one(), fr::neg_one(), fr::zero() });
    composer.create_add_gate({a_idx, b_idx, c_idx, fr::one(), fr::one(), fr::neg_one(), fr::zero() });

    composer.create_add_gate({a_idx, b_idx, c_idx, fr::one(), fr::one(), fr::neg_one(), fr::zero() });
    composer.create_add_gate({a_idx, b_idx, c_idx, fr::one(), fr::one(), fr::neg_one(), fr::zero() });
    composer.create_add_gate({a_idx, b_idx, c_idx, fr::one(), fr::one(), fr::neg_one(), fr::zero() });
    composer.create_add_gate({a_idx, b_idx, c_idx, fr::one(), fr::one(), fr::neg_one(), fr::zero() });
    composer.create_add_gate({a_idx, b_idx, c_idx, fr::one(), fr::one(), fr::neg_one(), fr::zero() });
    composer.create_add_gate({a_idx, b_idx, c_idx, fr::one(), fr::one(), fr::neg_one(), fr::zero() });
    composer.create_add_gate({a_idx, b_idx, c_idx, fr::one(), fr::one(), fr::neg_one(), fr::zero() });
    composer.create_add_gate({a_idx, b_idx, c_idx, fr::one(), fr::one(), fr::neg_one(), fr::zero() });
    composer.create_add_gate({a_idx, b_idx, c_idx, fr::one(), fr::one(), fr::neg_one(), fr::zero() });
    composer.create_add_gate({a_idx, b_idx, c_idx, fr::one(), fr::one(), fr::neg_one(), fr::zero() });
    composer.create_add_gate({a_idx, b_idx, c_idx, fr::one(), fr::one(), fr::neg_one(), fr::zero() });
    composer.create_add_gate({a_idx, b_idx, c_idx, fr::one(), fr::one(), fr::neg_one(), fr::zero() });
    composer.create_add_gate({a_idx, b_idx, c_idx, fr::one(), fr::one(), fr::neg_one(), fr::zero() });
    composer.create_add_gate({a_idx, b_idx, c_idx, fr::one(), fr::one(), fr::neg_one(), fr::zero() });
    composer.create_add_gate({a_idx, b_idx, c_idx, fr::one(), fr::one(), fr::neg_one(), fr::zero() });
    composer.create_add_gate({a_idx, b_idx, c_idx, fr::one(), fr::one(), fr::neg_one(), fr::zero() });

    waffle::Prover prover = composer.preprocess();

    waffle::base_circuit_instance instance = waffle::test_construct_instance(prover);

    waffle::plonk_proof proof = prover.construct_proof();

    bool result = waffle::test_verifier::verify_proof(proof, instance, prover.reference_string.SRS_T2);
    EXPECT_EQ(result, true);
}

TEST(composer, test_mul_gate_proofs)
{
    waffle::StandardComposer composer = waffle::StandardComposer();
    fr::field_t q[7]{
        fr::random_element(),
        fr::random_element(),
        fr::random_element(),
        fr::random_element(),
        fr::random_element(),
        fr::random_element(),
        fr::random_element()
    };
    fr::field_t q_inv[7]{
        fr::invert(q[0]),
        fr::invert(q[1]),
        fr::invert(q[2]),
        fr::invert(q[3]),
        fr::invert(q[4]),
        fr::invert(q[5]),
        fr::invert(q[6]),
    };

    fr::field_t a = fr::random_element();
    fr::field_t b = fr::random_element();
    fr::field_t c = fr::neg(fr::mul(fr::add(fr::add(fr::mul(q[0], a), fr::mul(q[1], b)), q[3]), q_inv[2]));
    fr::field_t d = fr::neg(fr::mul(fr::add(fr::mul(q[4], fr::mul(a, b)), q[6]), q_inv[5]));

    uint32_t a_idx = composer.add_variable(a);
    uint32_t b_idx = composer.add_variable(b);
    uint32_t c_idx = composer.add_variable(c);
    uint32_t d_idx = composer.add_variable(d);

    composer.create_add_gate({a_idx, b_idx, c_idx, q[0], q[1], q[2], q[3] });
    composer.create_mul_gate({a_idx, b_idx, d_idx, q[4], q[5], q[6] });
    composer.create_add_gate({a_idx, b_idx, c_idx, q[0], q[1], q[2], q[3] });
    composer.create_mul_gate({a_idx, b_idx, d_idx, q[4], q[5], q[6] });
    composer.create_add_gate({a_idx, b_idx, c_idx, q[0], q[1], q[2], q[3] });
    composer.create_mul_gate({a_idx, b_idx, d_idx, q[4], q[5], q[6] });
    composer.create_add_gate({a_idx, b_idx, c_idx, q[0], q[1], q[2], q[3] });
    composer.create_mul_gate({a_idx, b_idx, d_idx, q[4], q[5], q[6] });

    waffle::Prover prover = composer.preprocess();

    waffle::base_circuit_instance instance = waffle::test_construct_instance(prover);

    waffle::plonk_proof proof = prover.construct_proof();

    bool result = waffle::test_verifier::verify_proof(proof, instance, prover.reference_string.SRS_T2);
    EXPECT_EQ(result, true);
}