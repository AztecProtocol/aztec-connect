#include <gtest/gtest.h>

#include <barretenberg/curves/grumpkin/grumpkin.hpp>
#include <barretenberg/waffle/composer/turbo_composer.hpp>
#include <barretenberg/waffle/proof_system/preprocess.hpp>
#include <barretenberg/waffle/proof_system/prover/prover.hpp>
#include <barretenberg/waffle/proof_system/verifier/verifier.hpp>
#include <barretenberg/waffle/proof_system/widgets/arithmetic_widget.hpp>

#include <barretenberg/polynomials/polynomial_arithmetic.hpp>
#include <memory>

using namespace barretenberg;


TEST(turbo_composer, test_add_gate_proofs)
{
    waffle::TurboComposer composer = waffle::TurboComposer();
    fr::field_t a = fr::one;
    fr::field_t b = fr::one;
    fr::field_t c = fr::add(a, b);
    fr::field_t d = fr::add(a, c);
    uint32_t a_idx = composer.add_variable(a);
    uint32_t b_idx = composer.add_variable(b);
    uint32_t c_idx = composer.add_variable(c);
    uint32_t d_idx = composer.add_variable(d);
    composer.create_add_gate({ a_idx, b_idx, c_idx, fr::one, fr::one, fr::neg_one(), fr::zero });

    composer.create_add_gate({ d_idx, c_idx, a_idx, fr::one, fr::neg_one(), fr::neg_one(), fr::zero });

    composer.create_add_gate({ a_idx, b_idx, c_idx, fr::one, fr::one, fr::neg_one(), fr::zero });
    composer.create_add_gate({ a_idx, b_idx, c_idx, fr::one, fr::one, fr::neg_one(), fr::zero });
    composer.create_add_gate({ b_idx, a_idx, c_idx, fr::one, fr::one, fr::neg_one(), fr::zero });
    composer.create_add_gate({ a_idx, b_idx, c_idx, fr::one, fr::one, fr::neg_one(), fr::zero });
    composer.create_add_gate({ a_idx, b_idx, c_idx, fr::one, fr::one, fr::neg_one(), fr::zero });
    composer.create_add_gate({ a_idx, b_idx, c_idx, fr::one, fr::one, fr::neg_one(), fr::zero });
    composer.create_add_gate({ a_idx, b_idx, c_idx, fr::one, fr::one, fr::neg_one(), fr::zero });
    composer.create_add_gate({ a_idx, b_idx, c_idx, fr::one, fr::one, fr::neg_one(), fr::zero });
    composer.create_add_gate({ a_idx, b_idx, c_idx, fr::one, fr::one, fr::neg_one(), fr::zero });
    composer.create_add_gate({ a_idx, b_idx, c_idx, fr::one, fr::one, fr::neg_one(), fr::zero });
    composer.create_add_gate({ a_idx, b_idx, c_idx, fr::one, fr::one, fr::neg_one(), fr::zero });
    composer.create_add_gate({ a_idx, b_idx, c_idx, fr::one, fr::one, fr::neg_one(), fr::zero });
    composer.create_add_gate({ a_idx, b_idx, c_idx, fr::one, fr::one, fr::neg_one(), fr::zero });
    composer.create_add_gate({ a_idx, b_idx, c_idx, fr::one, fr::one, fr::neg_one(), fr::zero });
    composer.create_add_gate({ a_idx, b_idx, c_idx, fr::one, fr::one, fr::neg_one(), fr::zero });

    composer.create_add_gate({ a_idx, b_idx, c_idx, fr::one, fr::one, fr::neg_one(), fr::zero });
    composer.create_add_gate({ a_idx, b_idx, c_idx, fr::one, fr::one, fr::neg_one(), fr::zero });
    composer.create_add_gate({ a_idx, b_idx, c_idx, fr::one, fr::one, fr::neg_one(), fr::zero });
    composer.create_add_gate({ a_idx, b_idx, c_idx, fr::one, fr::one, fr::neg_one(), fr::zero });
    composer.create_add_gate({ a_idx, b_idx, c_idx, fr::one, fr::one, fr::neg_one(), fr::zero });
    composer.create_add_gate({ a_idx, b_idx, c_idx, fr::one, fr::one, fr::neg_one(), fr::zero });
    composer.create_add_gate({ a_idx, b_idx, c_idx, fr::one, fr::one, fr::neg_one(), fr::zero });
    composer.create_add_gate({ a_idx, b_idx, c_idx, fr::one, fr::one, fr::neg_one(), fr::zero });
    composer.create_add_gate({ a_idx, b_idx, c_idx, fr::one, fr::one, fr::neg_one(), fr::zero });
    composer.create_add_gate({ a_idx, b_idx, c_idx, fr::one, fr::one, fr::neg_one(), fr::zero });
    composer.create_add_gate({ a_idx, b_idx, c_idx, fr::one, fr::one, fr::neg_one(), fr::zero });
    composer.create_add_gate({ a_idx, b_idx, c_idx, fr::one, fr::one, fr::neg_one(), fr::zero });
    composer.create_add_gate({ a_idx, b_idx, c_idx, fr::one, fr::one, fr::neg_one(), fr::zero });
    composer.create_add_gate({ a_idx, b_idx, c_idx, fr::one, fr::one, fr::neg_one(), fr::zero });
    composer.create_add_gate({ a_idx, b_idx, c_idx, fr::one, fr::one, fr::neg_one(), fr::zero });
    composer.create_add_gate({ a_idx, b_idx, c_idx, fr::one, fr::one, fr::neg_one(), fr::zero });

    waffle::Prover prover = composer.preprocess();

    waffle::Verifier verifier = waffle::preprocess(prover);

    waffle::plonk_proof proof = prover.construct_proof();

    bool result = verifier.verify_proof(proof); // instance, prover.reference_string.SRS_T2);
    EXPECT_EQ(result, true);
}

TEST(turbo_composer, test_mul_gate_proofs)
{
    waffle::TurboComposer composer = waffle::TurboComposer();
    fr::field_t q[7]{ fr::random_element(), fr::random_element(), fr::random_element(), fr::random_element(),
                      fr::random_element(), fr::random_element(), fr::random_element() };
    fr::field_t q_inv[7]{
        fr::invert(q[0]), fr::invert(q[1]), fr::invert(q[2]), fr::invert(q[3]),
        fr::invert(q[4]), fr::invert(q[5]), fr::invert(q[6]),
    };

    fr::field_t a = fr::random_element();
    fr::field_t b = fr::random_element();
    fr::field_t c = fr::neg(fr::mul(fr::add(fr::add(fr::mul(q[0], a), fr::mul(q[1], b)), q[3]), q_inv[2]));
    fr::field_t d = fr::neg(fr::mul(fr::add(fr::mul(q[4], fr::mul(a, b)), q[6]), q_inv[5]));

    uint32_t a_idx = composer.add_variable(a);
    uint32_t b_idx = composer.add_variable(b);
    uint32_t c_idx = composer.add_variable(c);
    uint32_t d_idx = composer.add_variable(d);

    composer.create_add_gate({ a_idx, b_idx, c_idx, q[0], q[1], q[2], q[3] });
    composer.create_mul_gate({ a_idx, b_idx, d_idx, q[4], q[5], q[6] });
    composer.create_add_gate({ a_idx, b_idx, c_idx, q[0], q[1], q[2], q[3] });
    composer.create_mul_gate({ a_idx, b_idx, d_idx, q[4], q[5], q[6] });
    composer.create_add_gate({ a_idx, b_idx, c_idx, q[0], q[1], q[2], q[3] });
    composer.create_mul_gate({ a_idx, b_idx, d_idx, q[4], q[5], q[6] });
    composer.create_add_gate({ a_idx, b_idx, c_idx, q[0], q[1], q[2], q[3] });
    composer.create_mul_gate({ a_idx, b_idx, d_idx, q[4], q[5], q[6] });
    composer.create_add_gate({ a_idx, b_idx, c_idx, q[0], q[1], q[2], q[3] });
    composer.create_mul_gate({ a_idx, b_idx, d_idx, q[4], q[5], q[6] });
    composer.create_add_gate({ a_idx, b_idx, c_idx, q[0], q[1], q[2], q[3] });
    composer.create_mul_gate({ a_idx, b_idx, d_idx, q[4], q[5], q[6] });
    composer.create_add_gate({ a_idx, b_idx, c_idx, q[0], q[1], q[2], q[3] });
    composer.create_mul_gate({ a_idx, b_idx, d_idx, q[4], q[5], q[6] });
    composer.create_add_gate({ a_idx, b_idx, c_idx, q[0], q[1], q[2], q[3] });
    composer.create_mul_gate({ a_idx, b_idx, d_idx, q[4], q[5], q[6] });
    composer.create_add_gate({ a_idx, b_idx, c_idx, q[0], q[1], q[2], q[3] });
    composer.create_mul_gate({ a_idx, b_idx, d_idx, q[4], q[5], q[6] });
    composer.create_add_gate({ a_idx, b_idx, c_idx, q[0], q[1], q[2], q[3] });
    composer.create_mul_gate({ a_idx, b_idx, d_idx, q[4], q[5], q[6] });
    composer.create_add_gate({ a_idx, b_idx, c_idx, q[0], q[1], q[2], q[3] });
    composer.create_mul_gate({ a_idx, b_idx, d_idx, q[4], q[5], q[6] });
    composer.create_add_gate({ a_idx, b_idx, c_idx, q[0], q[1], q[2], q[3] });
    composer.create_mul_gate({ a_idx, b_idx, d_idx, q[4], q[5], q[6] });

    composer.create_add_gate({ a_idx, b_idx, c_idx, q[0], q[1], q[2], q[3] });
    composer.create_mul_gate({ a_idx, b_idx, d_idx, q[4], q[5], q[6] });
    composer.create_add_gate({ a_idx, b_idx, c_idx, q[0], q[1], q[2], q[3] });
    composer.create_mul_gate({ a_idx, b_idx, d_idx, q[4], q[5], q[6] });
    composer.create_add_gate({ a_idx, b_idx, c_idx, q[0], q[1], q[2], q[3] });
    composer.create_mul_gate({ a_idx, b_idx, d_idx, q[4], q[5], q[6] });
    composer.create_add_gate({ a_idx, b_idx, c_idx, q[0], q[1], q[2], q[3] });
    composer.create_mul_gate({ a_idx, b_idx, d_idx, q[4], q[5], q[6] });
    composer.create_add_gate({ a_idx, b_idx, c_idx, q[0], q[1], q[2], q[3] });
    composer.create_mul_gate({ a_idx, b_idx, d_idx, q[4], q[5], q[6] });
    composer.create_add_gate({ a_idx, b_idx, c_idx, q[0], q[1], q[2], q[3] });
    composer.create_mul_gate({ a_idx, b_idx, d_idx, q[4], q[5], q[6] });
    composer.create_add_gate({ a_idx, b_idx, c_idx, q[0], q[1], q[2], q[3] });
    composer.create_mul_gate({ a_idx, b_idx, d_idx, q[4], q[5], q[6] });
    composer.create_add_gate({ a_idx, b_idx, c_idx, q[0], q[1], q[2], q[3] });
    composer.create_mul_gate({ a_idx, b_idx, d_idx, q[4], q[5], q[6] });
    composer.create_add_gate({ a_idx, b_idx, c_idx, q[0], q[1], q[2], q[3] });
    composer.create_mul_gate({ a_idx, b_idx, d_idx, q[4], q[5], q[6] });
    composer.create_add_gate({ a_idx, b_idx, c_idx, q[0], q[1], q[2], q[3] });
    composer.create_mul_gate({ a_idx, b_idx, d_idx, q[4], q[5], q[6] });
    composer.create_add_gate({ a_idx, b_idx, c_idx, q[0], q[1], q[2], q[3] });
    composer.create_mul_gate({ a_idx, b_idx, d_idx, q[4], q[5], q[6] });
    composer.create_add_gate({ a_idx, b_idx, c_idx, q[0], q[1], q[2], q[3] });
    composer.create_mul_gate({ a_idx, b_idx, d_idx, q[4], q[5], q[6] });

    uint32_t e_idx = composer.add_variable(fr::sub(a, fr::one));
    composer.create_add_gate({ e_idx, b_idx, c_idx, q[0], q[1], q[2], fr::add(q[3], q[0]) });
    waffle::Prover prover = composer.preprocess();

    waffle::Verifier verifier = waffle::preprocess(prover);

    waffle::plonk_proof proof = prover.construct_proof();

    bool result = verifier.verify_proof(proof);

    EXPECT_EQ(result, true);
}

TEST(turbo_composer, fixed_base_scalar_multiplication_proof)
{
    const size_t num_gates = 128;

    polynomial w_1(num_gates);
    polynomial w_2(num_gates);
    polynomial w_3(num_gates);
    polynomial w_4(num_gates);

    polynomial q_1(num_gates);
    polynomial q_2(num_gates);
    polynomial q_3(num_gates);
    polynomial q_4(num_gates);
    polynomial q_4_next(num_gates);
    polynomial q_m(num_gates);
    polynomial q_c(num_gates);
    polynomial q_ecc_1(num_gates);
    polynomial q_arith(num_gates);

    grumpkin::g1::element* ladder =
        static_cast<grumpkin::g1::element*>(aligned_alloc(64, sizeof(grumpkin::g1::element) * 128));
    grumpkin::g1::element* ladder3 =
        static_cast<grumpkin::g1::element*>(aligned_alloc(64, sizeof(grumpkin::g1::element) * 128));
    grumpkin::g1::element accumulator = grumpkin::g1::one;
    // grumpkin::g1::set_infinity(accumulator);
    for (size_t i = 0; i < 126; ++i) {
        grumpkin::g1::element p1 = accumulator;
        ladder[125 - i] = p1;
        grumpkin::g1::dbl(accumulator, accumulator);
        grumpkin::g1::add(p1, accumulator, p1);
        grumpkin::g1::dbl(accumulator, accumulator);
        ladder3[125 - i] = p1;
    }
    grumpkin::g1::element origin_point = accumulator;

    grumpkin::g1::batch_normalize(&ladder[0], 126);
    grumpkin::g1::batch_normalize(&ladder3[0], 126);
    origin_point = grumpkin::g1::normalize(origin_point);

    grumpkin::fr::field_t scalar_multiplier = grumpkin::fr::random_element();
    bool skew = false; // ignore skew for now
    uint64_t wnaf_entries[256] = { 0 };
    barretenberg::wnaf::fixed_wnaf<1, 2>(&scalar_multiplier.data[0], &wnaf_entries[0], skew, 0);

    if ((wnaf_entries[0] & 0xffffff) > 1) {
        wnaf_entries[0] = 1;
    }

    grumpkin::g1::element* multiplication_transcript =
        static_cast<grumpkin::g1::element*>(aligned_alloc(64, sizeof(grumpkin::g1::element) * 128));
    fr::field_t* accumulator_transcript = static_cast<fr::field_t*>(aligned_alloc(64, sizeof(fr::field_t) * 128));
    multiplication_transcript[0] = origin_point;
    accumulator_transcript[0] = fr::zero;
    fr::field_t one = fr::one;
    fr::field_t three = fr::add(fr::add(one, one), one);
    for (size_t i = 1; i < 126; ++i) {
        uint64_t entry = wnaf_entries[i] & 0xffffff;
        fr::field_t prev_accumulator = fr::add(accumulator_transcript[i - 1], accumulator_transcript[i - 1]);
        prev_accumulator = fr::add(prev_accumulator, prev_accumulator);
        if (entry == 1) {
            uint64_t predicate = (wnaf_entries[i] >> 31U) & 1U;
            grumpkin::g1::element to_add;
            if (predicate) {
                grumpkin::g1::__neg(ladder3[i], to_add);
                accumulator_transcript[i] = fr::sub(prev_accumulator, three);
            } else {
                to_add = ladder3[i];
                accumulator_transcript[i] = fr::add(prev_accumulator, three);
            }
            grumpkin::g1::add(multiplication_transcript[i - 1], to_add, multiplication_transcript[i]);
        }
        if (entry == 0) {
            uint64_t predicate = (wnaf_entries[i] >> 31U) & 1U;
            grumpkin::g1::element to_add;
            if (predicate) {
                grumpkin::g1::__neg(ladder[i], to_add);
                accumulator_transcript[i] = fr::sub(prev_accumulator, one);
            } else {
                to_add = ladder[i];
                accumulator_transcript[i] = fr::add(prev_accumulator, one);
            }
            grumpkin::g1::add(multiplication_transcript[i - 1], to_add, multiplication_transcript[i]);
        }
    }
    grumpkin::g1::batch_normalize(&multiplication_transcript[0], 126);

    fr::field_t eight_inverse = fr::invert(fr::to_montgomery_form({ { 8, 0, 0, 0 } }));
    w_3[0] = fr::zero;
    for (size_t i = 0; i < 125; ++i) {
        w_4[i] = accumulator_transcript[i];
        w_1[i] = multiplication_transcript[i].x;
        w_2[i] = multiplication_transcript[i].y;

        fr::field_t x_beta = ladder[i + 1].x;
        fr::field_t x_gamma = ladder3[i + 1].x;

        fr::field_t y_beta = ladder[i + 1].y;
        fr::field_t y_gamma = ladder3[i + 1].y;
        fr::field_t x_beta_times_nine = fr::add(x_beta, x_beta);
        x_beta_times_nine = fr::add(x_beta_times_nine, x_beta_times_nine);
        x_beta_times_nine = fr::add(x_beta_times_nine, x_beta_times_nine);
        x_beta_times_nine = fr::add(x_beta_times_nine, x_beta);

        fr::field_t x_alpha_1 = fr::mul(fr::sub(x_gamma, x_beta), eight_inverse);
        fr::field_t x_alpha_2 = fr::mul(fr::sub(x_beta_times_nine, x_gamma), eight_inverse);

        fr::field_t T0 = fr::sub(x_beta, x_gamma);
        fr::field_t y_denominator = fr::invert(fr::add(fr::add(T0, T0), T0));

        fr::field_t y_alpha_1 = fr::mul(fr::sub(fr::add(fr::add(y_beta, y_beta), y_beta), y_gamma), y_denominator);
        fr::field_t T1 = fr::mul(x_gamma, y_beta);
        T1 = fr::add(fr::add(T1, T1), T1);
        fr::field_t y_alpha_2 = fr::mul(fr::sub(fr::mul(x_beta, y_gamma), T1), y_denominator);
        // printf("entry = %lu \n", wnaf_entries[i] & 0xffffffU);

        if ((wnaf_entries[i + 1] & 0xffffffU) == 0) {
            w_3[i + 1] = x_beta;
        } else {
            w_3[i + 1] = x_gamma;
        }
        q_1[i] = x_alpha_1;
        q_2[i] = x_alpha_2;
        q_3[i] = y_alpha_1;
        q_ecc_1[i] = y_alpha_2;

        q_4[i] = fr::zero;
        q_4_next[i] = fr::zero;
        q_m[i] = fr::zero;
        q_c[i] = fr::zero;
        q_arith[i] = fr::zero;
    }

    w_1[125] = multiplication_transcript[125].x;
    w_2[125] = multiplication_transcript[125].y;
    w_4[125] = accumulator_transcript[125];
    // w_3[125] = fr::zero;

    // w_1[125] = fr::zero;
    // w_2[125] = fr::zero;
    q_1[125] = fr::zero;
    q_2[125] = fr::zero;
    q_3[125] = fr::zero;
    q_4[125] = fr::zero;
    q_4_next[125] = fr::zero;
    q_m[125] = fr::zero;
    q_c[125] = fr::zero;
    q_ecc_1[125] = fr::zero;
    q_arith[125] = fr::zero;

    w_1[126] = fr::zero;
    w_2[126] = fr::zero;
    w_3[126] = fr::zero;
    w_4[126] = fr::zero;
    q_1[126] = fr::zero;
    q_2[126] = fr::zero;
    q_3[126] = fr::zero;
    q_4[126] = fr::zero;
    q_4_next[126] = fr::zero;
    q_m[126] = fr::zero;
    q_c[126] = fr::zero;
    q_ecc_1[126] = fr::zero;
    q_arith[126] = fr::zero;

    w_1[127] = fr::zero;
    w_2[127] = fr::zero;
    w_3[127] = fr::zero;
    w_4[127] = fr::zero;
    q_1[127] = fr::zero;
    q_2[127] = fr::zero;
    q_3[127] = fr::zero;
    q_4[127] = fr::zero;
    q_4_next[127] = fr::zero;
    q_m[127] = fr::zero;
    q_c[127] = fr::zero;
    q_ecc_1[127] = fr::zero;
    q_arith[127] = fr::zero;

    waffle::TurboComposer composer = waffle::TurboComposer();
    composer.q_1.resize(num_gates);
    composer.q_2.resize(num_gates);
    composer.q_3.resize(num_gates);
    composer.q_4.resize(num_gates);
    composer.q_4_next.resize(num_gates);
    composer.q_m.resize(num_gates);
    composer.q_c.resize(num_gates);
    composer.q_arith.resize(num_gates);
    composer.q_ecc_1.resize(num_gates);

    composer.w_l.resize(num_gates);
    composer.w_r.resize(num_gates);
    composer.w_o.resize(num_gates);
    composer.w_4.resize(num_gates);

    for (size_t i = 0; i < num_gates; ++i) {
        composer.q_1[i] = q_1[i];
        composer.q_2[i] = q_2[i];
        composer.q_3[i] = q_3[i];
        composer.q_4[i] = q_4[i];
        composer.q_4_next[i] = q_4_next[i];
        composer.q_m[i] = q_m[i];
        composer.q_c[i] = q_c[i];
        composer.q_arith[i] = q_arith[i];
        composer.q_ecc_1[i] = q_ecc_1[i];

        // composer.q_arith[i] = fr::zero;
        // composer.q_ecc_1[i] = fr::zero;
        composer.w_l[i] = composer.add_variable(w_1[i]);
        composer.w_r[i] = composer.add_variable(w_2[i]);
        composer.w_o[i] = composer.add_variable(w_3[i]);
        composer.w_4[i] = composer.add_variable(w_4[i]);
    }
    composer.q_arith[127] = fr::one;
    composer.w_l[127] = composer.add_variable(fr::one);
    composer.q_1[127] = fr::one;
    composer.q_2[127] = fr::zero;
    composer.q_3[127] = fr::zero;
    composer.q_m[127] = fr::zero;
    composer.q_c[127] = fr::neg_one();
    composer.q_ecc_1[127] = fr::zero;
    composer.n = 127;
    // composer.q_ecc_1[0] = q_ecc_1[0];

    waffle::Prover prover = composer.preprocess();
    prover.sigma_1_mapping.resize(128);
    prover.sigma_2_mapping.resize(128);
    prover.sigma_3_mapping.resize(128);
    for (size_t i = 0; i < 128; ++i) {
        prover.sigma_1_mapping[i] = (uint32_t)i;
        prover.sigma_2_mapping[i] = (uint32_t)i + (1U << 30U);
        prover.sigma_3_mapping[i] = (uint32_t)i + (1U << 31U);
    }

    waffle::Verifier verifier = waffle::preprocess(prover);

    waffle::plonk_proof proof = prover.construct_proof();

    bool result = verifier.verify_proof(proof);
    if (result) {
        printf("proof valid\n");
    }
    EXPECT_EQ(result, true);
}