// #include <gtest/gtest.h>

// #include <barretenberg/curves/grumpkin/grumpkin.hpp>
// #include <barretenberg/waffle/composer/standard_composer.hpp>
// #include <barretenberg/waffle/proof_system/widgets/turbo_fixed_base_widget.hpp>

// #include <iostream>
// #include <memory>

// #include "../test_helpers.hpp"

// using namespace barretenberg;

// TEST(turbo_fixed_base_widget, quotient_polynomial_satisfiability)
// {
//     const size_t num_gates = 4;
//     waffle::ProverTurboFixedBaseWidget widget(num_gates);

//     waffle::CircuitFFTState circuit_state(num_gates);
//     circuit_state.small_domain.generator = fr::one;
//     circuit_state.mid_domain.generator = fr::one;
//     circuit_state.large_domain.generator = fr::one;
//     circuit_state.small_domain.generator_inverse = fr::one;
//     circuit_state.mid_domain.generator_inverse = fr::one;
//     circuit_state.large_domain.generator_inverse = fr::one;

//     polynomial w_1(num_gates);
//     polynomial w_2(num_gates);
//     polynomial w_3(num_gates);
//     polynomial w_4(num_gates);

//     polynomial q_1(num_gates);
//     polynomial q_2(num_gates);
//     polynomial q_3(num_gates);
//     polynomial q_4(num_gates);
//     polynomial q_5(num_gates);
//     polynomial q_m(num_gates);
//     polynomial q_c(num_gates);
//     polynomial q_ecc_1(num_gates);
//     polynomial q_arith(num_gates);

//     w_1[0] = grumpkin::g1::one.x;
//     w_2[0] = grumpkin::g1::one.y; // fr::one + fr::one; // (1, 2) = starting point
//     w_4[0] = fr::zero;
//     w_3[0] = fr::zero;
//     grumpkin::g1::affine_element beta = grumpkin::g1::random_affine_element();
//     grumpkin::g1::affine_element gamma = grumpkin::g1::random_affine_element();

//     fr::field_t x_beta = beta.x;
//     fr::field_t x_gamma = gamma.x;
//     fr::field_t y_beta = beta.y;
//     fr::field_t y_gamma = gamma.y;

//     fr::field_t eight_inverse = fr::invert(fr::to_montgomery_form({ { 8, 0, 0, 0 } }));

//     fr::field_t x_beta_times_nine = x_beta + x_beta;
//     x_beta_times_nine = x_beta_times_nine + x_beta_times_nine;
//     x_beta_times_nine = x_beta_times_nine + x_beta_times_nine;
//     x_beta_times_nine = x_beta_times_nine + x_beta;

//     fr::field_t x_alpha_1 = fr::mul(fr::sub(x_gamma, x_beta), eight_inverse);
//     fr::field_t x_alpha_2 = fr::mul(fr::sub(x_beta_times_nine, x_gamma), eight_inverse);

//     fr::field_t T0 = x_beta - x_gamma;
//     fr::field_t y_denominator = fr::invert(fr::add((T0 + T0), T0));

//     fr::field_t y_alpha_1 = fr::mul(fr::sub(fr::add(fr::add(y_beta, y_beta), y_beta), y_gamma), y_denominator);
//     fr::field_t T1 = x_gamma * y_beta;
//     T1 = fr::add((T1 + T1), T1);
//     fr::field_t y_alpha_2 = fr::mul(fr::sub(fr::mul(x_beta, y_gamma), T1), y_denominator);

//     w_4[1] = fr::to_montgomery_form({ 3, 0, 0, 0 }); // first point = 3P
//     w_3[1] = x_gamma;

//     fr::field_t lambda = fr::mul(fr::sub(y_gamma, w_2[0]), fr::invert(fr::sub(x_gamma, w_1[0])));
//     fr::field_t x_2 = fr::sub(lambda.sqr(), fr::add(w_1[0], x_gamma));
//     fr::field_t y_2 = fr::sub(fr::mul(lambda, fr::sub(w_1[0], x_2)), w_2[0]);
//     w_1[1] = x_2;
//     w_2[1] = y_2;

//     q_1[0] = x_alpha_1;
//     q_2[0] = x_alpha_2;
//     q_3[0] = y_alpha_1;
//     q_ecc_1[0] = y_alpha_2;

//     w_4[2] = fr::to_montgomery_form({ 13, 0, 0, 0 });
//     w_3[1+1] = x_beta;

//     lambda = fr::mul(fr::sub(y_beta, w_2[1]), fr::invert(fr::sub(x_beta, w_1[1])));
//     fr::field_t x_3 = fr::sub(lambda.sqr(), fr::add(w_1[1], x_beta));
//     fr::field_t y_3 = fr::sub(fr::mul(lambda, fr::sub(w_1[1], x_3)), w_2[1]);

//     w_1[2] = x_3;
//     w_2[2] = y_3;

//     q_1[1] = x_alpha_1;
//     q_2[1] = x_alpha_2;
//     q_3[1] = y_alpha_1;
//     q_ecc_1[1] = y_alpha_2;

//     w_1[3] = fr::zero;
//     w_2[3] = fr::zero;
//     w_3[3] = fr::zero;
//     w_4[3] = fr::zero;

//     q_ecc_1[2] = fr::zero;
//     q_ecc_1[3] = fr::zero;
//     q_1[2] = fr::zero;
//     q_2[2] = fr::zero;
//     q_3[2] = fr::zero;
//     q_1[3] = fr::zero;
//     q_2[3] = fr::zero;
//     q_3[3] = fr::zero;
//     for (size_t i = 0; i < 4; ++i) {
//         q_arith[i] = fr::zero;
//         q_m[i] = fr::zero;
//         q_c[i] = fr::zero;
//         q_4[i] = fr::zero;
//         q_5[i] = fr::zero;
//     }

//     circuit_state.w_l_fft = polynomial(w_1, 4 * num_gates + 4);
//     circuit_state.w_r_fft = polynomial(w_2, 4 * num_gates + 4);
//     circuit_state.w_o_fft = polynomial(w_3, 4 * num_gates + 4);
//     circuit_state.w_4_fft = polynomial(w_4, 4 * num_gates + 4);

//     circuit_state.w_l_fft.ifft(circuit_state.small_domain);
//     circuit_state.w_r_fft.ifft(circuit_state.small_domain);
//     circuit_state.w_o_fft.ifft(circuit_state.small_domain);
//     circuit_state.w_4_fft.ifft(circuit_state.small_domain);

//     circuit_state.w_l_fft.coset_fft(circuit_state.large_domain);
//     circuit_state.w_r_fft.coset_fft(circuit_state.large_domain);
//     circuit_state.w_o_fft.coset_fft(circuit_state.large_domain);
//     circuit_state.w_4_fft.coset_fft(circuit_state.large_domain);

//     circuit_state.w_l_fft.add_lagrange_base_coefficient(circuit_state.w_l_fft[0]);
//     circuit_state.w_l_fft.add_lagrange_base_coefficient(circuit_state.w_l_fft[1]);
//     circuit_state.w_l_fft.add_lagrange_base_coefficient(circuit_state.w_l_fft[2]);
//     circuit_state.w_l_fft.add_lagrange_base_coefficient(circuit_state.w_l_fft[3]);
//     circuit_state.w_r_fft.add_lagrange_base_coefficient(circuit_state.w_r_fft[0]);
//     circuit_state.w_r_fft.add_lagrange_base_coefficient(circuit_state.w_r_fft[1]);
//     circuit_state.w_r_fft.add_lagrange_base_coefficient(circuit_state.w_r_fft[2]);
//     circuit_state.w_r_fft.add_lagrange_base_coefficient(circuit_state.w_r_fft[3]);
//     circuit_state.w_o_fft.add_lagrange_base_coefficient(circuit_state.w_o_fft[0]);
//     circuit_state.w_o_fft.add_lagrange_base_coefficient(circuit_state.w_o_fft[1]);
//     circuit_state.w_o_fft.add_lagrange_base_coefficient(circuit_state.w_o_fft[2]);
//     circuit_state.w_o_fft.add_lagrange_base_coefficient(circuit_state.w_o_fft[3]);
//     circuit_state.w_4_fft.add_lagrange_base_coefficient(circuit_state.w_4_fft[0]);
//     circuit_state.w_4_fft.add_lagrange_base_coefficient(circuit_state.w_4_fft[1]);
//     circuit_state.w_4_fft.add_lagrange_base_coefficient(circuit_state.w_4_fft[2]);
//     circuit_state.w_4_fft.add_lagrange_base_coefficient(circuit_state.w_4_fft[3]);

//    // widget.w_4 = polynomial(w_4);
//     widget.q_1 = polynomial(q_1);
//     widget.q_2 = polynomial(q_2);
//     widget.q_3 = polynomial(q_3);
//     widget.q_4 = polynomial(q_4);
//     widget.q_5 = polynomial(q_5);
//     widget.q_m = polynomial(q_m);
//     widget.q_c = polynomial(q_c);
//     widget.q_arith = polynomial(q_arith);
//     widget.q_ecc_1 = polynomial(q_ecc_1);

//     transcript::Transcript transcript = test_helpers::create_dummy_standard_transcript();

//     circuit_state.quotient_large = polynomial(num_gates * 4);
//     for (size_t i = 0; i < num_gates * 4; ++i) {
//         circuit_state.quotient_large[i] = fr::zero;
//     }
//     widget.compute_quotient_contribution(fr::one, transcript, circuit_state);

//     // circuit_state.quotient_large.ifft(circuit_state.large_domain);
//     // circuit_state.quotient_large.fft(circuit_state.large_domain);
//     for (size_t i = 0; i < num_gates; ++i) {
//         EXPECT_EQ(circuit_state.quotient_large[i * 4] == fr::zero, true);
//     }
// }

// TEST(turbo_fixed_base_widget, quotient_polynomial_satisfiability_for_full_ladder)
// {
//     const size_t num_gates = 128;
//     waffle::ProverTurboFixedBaseWidget widget(num_gates);

//     waffle::CircuitFFTState circuit_state(num_gates);

//     circuit_state.small_domain.generator = fr::one;
//     circuit_state.mid_domain.generator = fr::one;
//     circuit_state.large_domain.generator = fr::one;
//     circuit_state.small_domain.generator_inverse = fr::one;
//     circuit_state.mid_domain.generator_inverse = fr::one;
//     circuit_state.large_domain.generator_inverse = fr::one;

//     polynomial w_1(num_gates);
//     polynomial w_2(num_gates);
//     polynomial w_3(num_gates);
//     polynomial w_4(num_gates);

//     polynomial q_1(num_gates);
//     polynomial q_2(num_gates);
//     polynomial q_3(num_gates);
//     polynomial q_4(num_gates);
//     polynomial q_5(num_gates);
//     polynomial q_m(num_gates);
//     polynomial q_c(num_gates);
//     polynomial q_ecc_1(num_gates);
//     polynomial q_arith(num_gates);

//     grumpkin::g1::element* ladder = static_cast<grumpkin::g1::element*>(aligned_alloc(64,
//     sizeof(grumpkin::g1::element) * 128)); grumpkin::g1::element* ladder3 =
//     static_cast<grumpkin::g1::element*>(aligned_alloc(64, sizeof(grumpkin::g1::element) * 128));
//     grumpkin::g1::element accumulator = grumpkin::g1::one;
//     // grumpkin::g1::set_infinity(accumulator);
//     for (size_t i = 0; i < 126; ++i) {
//         grumpkin::g1::element p1 = accumulator;
//         ladder[125 - i] = p1;
//         grumpkin::g1::dbl(accumulator, accumulator);
//         grumpkin::g1::add(p1, accumulator, p1);
//         grumpkin::g1::dbl(accumulator, accumulator);
//         ladder3[125 - i] = p1;
//     }
//     grumpkin::g1::element origin_point = accumulator;

//     grumpkin::g1::batch_normalize(&ladder[0], 126);
//     grumpkin::g1::batch_normalize(&ladder3[0], 126);
//     origin_point = grumpkin::g1::normalize(origin_point);

//     grumpkin::fr::field_t scalar_multiplier = grumpkin::fr::random_element();
//     bool skew = false; // ignore skew for now
//     uint64_t wnaf_entries[256] = {0};
//     barretenberg::wnaf::fixed_wnaf<1, 2>(&scalar_multiplier.data[0], &wnaf_entries[0], skew, 0);

//     if ((wnaf_entries[0] & 0xffffff) > 1) {
//         wnaf_entries[0] = 1;
//     }

//     grumpkin::g1::element* multiplication_transcript = static_cast<grumpkin::g1::element*>(aligned_alloc(64,
//     sizeof(grumpkin::g1::element) * 128)); fr::field_t* accumulator_transcript =
//     static_cast<fr::field_t*>(aligned_alloc(64, sizeof(fr::field_t) * 128)); multiplication_transcript[0] =
//     origin_point; accumulator_transcript[0] = fr::zero; fr::field_t one = fr::one; fr::field_t three = fr::add((one +
//     one), one); for (size_t i = 1; i < 126; ++i) {
//         uint64_t entry = wnaf_entries[i] & 0xffffff;
//         fr::field_t prev_accumulator = fr::add(accumulator_transcript[i - 1], accumulator_transcript[i - 1]);
//         prev_accumulator = prev_accumulator + prev_accumulator;
//         if (entry == 1) {
//             uint64_t predicate = (wnaf_entries[i] >> 31U) & 1U;
//             grumpkin::g1::element to_add;
//             if (predicate) {
//                 grumpkin::g1::__neg(ladder3[i], to_add);
//                 accumulator_transcript[i] = prev_accumulator - three;
//             } else {
//                 to_add = ladder3[i];
//                 accumulator_transcript[i] = prev_accumulator + three;
//             }
//             grumpkin::g1::add(multiplication_transcript[i - 1], to_add, multiplication_transcript[i]);
//         }
//         if (entry == 0) {
//             uint64_t predicate = (wnaf_entries[i] >> 31U) & 1U;
//             grumpkin::g1::element to_add;
//             if (predicate) {
//                 grumpkin::g1::__neg(ladder[i], to_add);
//                 accumulator_transcript[i] = prev_accumulator - one;
//             } else {
//                 to_add = ladder[i];
//                 accumulator_transcript[i] = prev_accumulator + one;
//             }
//             grumpkin::g1::add(multiplication_transcript[i - 1], to_add, multiplication_transcript[i]);
//         }
//     }
//     grumpkin::g1::batch_normalize(&multiplication_transcript[0], 126);

//     fr::field_t eight_inverse = fr::invert(fr::to_montgomery_form({ { 8, 0, 0, 0 } }));

//     w_3[0] = fr::zero;
//     for (size_t i = 0; i < 125; ++i) {
//         w_4[i] = accumulator_transcript[i];
//         w_1[i] = multiplication_transcript[i].x;
//         w_2[i] = multiplication_transcript[i].y;

//         fr::field_t x_beta = ladder[i + 1].x;
//         fr::field_t x_gamma = ladder3[i + 1].x;

//         fr::field_t y_beta = ladder[i + 1].y;
//         fr::field_t y_gamma = ladder3[i + 1].y;
//         fr::field_t x_beta_times_nine = x_beta + x_beta;
//         x_beta_times_nine = x_beta_times_nine + x_beta_times_nine;
//         x_beta_times_nine = x_beta_times_nine + x_beta_times_nine;
//         x_beta_times_nine = x_beta_times_nine + x_beta;

//         fr::field_t x_alpha_1 = fr::mul(fr::sub(x_gamma, x_beta), eight_inverse);
//         fr::field_t x_alpha_2 = fr::mul(fr::sub(x_beta_times_nine, x_gamma), eight_inverse);

//         fr::field_t T0 = x_beta - x_gamma;
//         fr::field_t y_denominator = fr::invert(fr::add((T0 + T0), T0));

//         fr::field_t y_alpha_1 = fr::mul(fr::sub(fr::add(fr::add(y_beta, y_beta), y_beta), y_gamma), y_denominator);
//         fr::field_t T1 = x_gamma * y_beta;
//         T1 = fr::add((T1 + T1), T1);
//         fr::field_t y_alpha_2 = fr::mul(fr::sub(fr::mul(x_beta, y_gamma), T1), y_denominator);
//         // printf("entry = %lu \n", wnaf_entries[i] & 0xffffffU);

//         if ((wnaf_entries[i + 1] & 0xffffffU) == 0) {
//             w_3[i+1] = x_beta;
//         } else {
//             w_3[i+1] = x_gamma;
//         }
//         q_1[i] = x_alpha_1;
//         q_2[i] = x_alpha_2;
//         q_3[i] = y_alpha_1;
//         q_ecc_1[i] = y_alpha_2;

//         q_4[i] = fr::zero;
//         q_5[i] = fr::zero;
//         q_m[i] = fr::zero;
//         q_c[i] = fr::zero;
//         q_arith[i] = fr::zero;
//     }

//     w_1[125] = multiplication_transcript[125].x;
//     w_2[125] = multiplication_transcript[125].y;
//     w_4[125] = accumulator_transcript[125];

//     // w_1[125] = fr::zero;
//     // w_2[125] = fr::zero;
//     q_1[125] = fr::zero;
//     q_2[125] = fr::zero;
//     q_3[125] = fr::zero;
//     q_4[125] = fr::zero;
//     q_5[125] = fr::zero;
//     q_m[125] = fr::zero;
//     q_c[125] = fr::zero;
//     q_ecc_1[125] = fr::zero;
//     q_arith[125] = fr::zero;

//     w_1[126] = fr::zero;
//     w_2[126] = fr::zero;
//     w_3[126] = fr::zero;
//     w_4[126] = fr::zero;
//     q_1[126] = fr::zero;
//     q_2[126] = fr::zero;
//     q_3[126] = fr::zero;
//     q_4[126] = fr::zero;
//     q_5[126] = fr::zero;
//     q_m[126] = fr::zero;
//     q_c[126] = fr::zero;
//     q_ecc_1[126] = fr::zero;
//     q_arith[126] = fr::zero;

//     w_1[127] = fr::zero;
//     w_2[127] = fr::zero;
//     w_3[127] = fr::zero;
//     w_4[127] = fr::zero;
//     q_1[127] = fr::zero;
//     q_2[127] = fr::zero;
//     q_3[127] = fr::zero;
//     q_4[127] = fr::zero;
//     q_5[127] = fr::zero;
//     q_m[127] = fr::zero;
//     q_c[127] = fr::zero;
//     q_ecc_1[127] = fr::zero;
//     q_arith[127] = fr::zero;

//     circuit_state.w_l_fft = polynomial(w_1, 4 * num_gates + 4);
//     circuit_state.w_r_fft = polynomial(w_2, 4 * num_gates + 4);
//     circuit_state.w_o_fft = polynomial(w_3, 4 * num_gates + 4);
//     circuit_state.w_4_fft = polynomial(w_4, 4 * num_gates + 4);

//     circuit_state.w_l_fft.ifft(circuit_state.small_domain);
//     circuit_state.w_r_fft.ifft(circuit_state.small_domain);
//     circuit_state.w_o_fft.ifft(circuit_state.small_domain);
//     circuit_state.w_4_fft.ifft(circuit_state.small_domain);

//     circuit_state.w_l_fft.coset_fft(circuit_state.large_domain);
//     circuit_state.w_r_fft.coset_fft(circuit_state.large_domain);
//     circuit_state.w_o_fft.coset_fft(circuit_state.large_domain);
//     circuit_state.w_4_fft.coset_fft(circuit_state.large_domain);

//     circuit_state.w_l_fft.add_lagrange_base_coefficient(circuit_state.w_l_fft[0]);
//     circuit_state.w_l_fft.add_lagrange_base_coefficient(circuit_state.w_l_fft[1]);
//     circuit_state.w_l_fft.add_lagrange_base_coefficient(circuit_state.w_l_fft[2]);
//     circuit_state.w_l_fft.add_lagrange_base_coefficient(circuit_state.w_l_fft[3]);
//     circuit_state.w_r_fft.add_lagrange_base_coefficient(circuit_state.w_r_fft[0]);
//     circuit_state.w_r_fft.add_lagrange_base_coefficient(circuit_state.w_r_fft[1]);
//     circuit_state.w_r_fft.add_lagrange_base_coefficient(circuit_state.w_r_fft[2]);
//     circuit_state.w_r_fft.add_lagrange_base_coefficient(circuit_state.w_r_fft[3]);
//     circuit_state.w_o_fft.add_lagrange_base_coefficient(circuit_state.w_o_fft[0]);
//     circuit_state.w_o_fft.add_lagrange_base_coefficient(circuit_state.w_o_fft[1]);
//     circuit_state.w_o_fft.add_lagrange_base_coefficient(circuit_state.w_o_fft[2]);
//     circuit_state.w_o_fft.add_lagrange_base_coefficient(circuit_state.w_o_fft[3]);
//     circuit_state.w_4_fft.add_lagrange_base_coefficient(circuit_state.w_4_fft[0]);
//     circuit_state.w_4_fft.add_lagrange_base_coefficient(circuit_state.w_4_fft[1]);
//     circuit_state.w_4_fft.add_lagrange_base_coefficient(circuit_state.w_4_fft[2]);
//     circuit_state.w_4_fft.add_lagrange_base_coefficient(circuit_state.w_4_fft[3]);

//     // widget.w_4 = polynomial(w_4, num_gates);
//     widget.q_1 = polynomial(q_1, num_gates);
//     widget.q_2 = polynomial(q_2, num_gates);
//     widget.q_3 = polynomial(q_3, num_gates);
//     widget.q_4 = polynomial(q_4, num_gates);
//     widget.q_5 = polynomial(q_5, num_gates);
//     widget.q_m = polynomial(q_m, num_gates);
//     widget.q_c = polynomial(q_c, num_gates);
//     widget.q_arith = polynomial(q_arith, num_gates);
//     widget.q_ecc_1 = polynomial(q_ecc_1, num_gates);

//     transcript::Transcript transcript = test_helpers::create_dummy_standard_transcript();

//     circuit_state.quotient_large = polynomial(num_gates * 4);
//     for (size_t i = 0; i < num_gates * 4; ++i) {
//         circuit_state.quotient_large[i] = fr::zero;
//     }
//     widget.compute_quotient_contribution(fr::one, transcript, circuit_state);

//     for (size_t i = 0; i < num_gates; ++i) {
//         EXPECT_EQ(circuit_state.quotient_large[i * 4] == fr::zero, true);
//     }
//     aligned_free(ladder);
//     aligned_free(ladder3);
//     aligned_free(multiplication_transcript);
//     aligned_free(accumulator_transcript);
// }