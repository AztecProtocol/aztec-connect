#include <gtest/gtest.h>

#include <barretenberg/curves/grumpkin/grumpkin.hpp>
#include <barretenberg/waffle/composer/turbo_composer.hpp>
#include <barretenberg/waffle/proof_system/preprocess.hpp>
#include <barretenberg/waffle/proof_system/prover/prover.hpp>
#include <barretenberg/waffle/proof_system/verifier/verifier.hpp>
#include <barretenberg/waffle/proof_system/widgets/arithmetic_widget.hpp>
#include <barretenberg/waffle/stdlib/group/group_utils.hpp>

#include <barretenberg/polynomials/polynomial_arithmetic.hpp>
#include <memory>

using namespace barretenberg;

namespace
{
uint32_t get_random_int()
{
    return static_cast<uint32_t>(barretenberg::fr::random_element().data[0]);
}
}

TEST(turbo_composer, base_case)
{
    waffle::TurboComposer composer = waffle::TurboComposer();
    fr::field_t a = fr::one;
    composer.add_public_variable(a);

    waffle::TurboProver prover = composer.preprocess();

    waffle::TurboVerifier verifier = composer.create_verifier();

    waffle::plonk_proof proof = prover.construct_proof();

    bool result = verifier.verify_proof(proof); // instance, prover.reference_string.SRS_T2);
    EXPECT_EQ(result, true);

}

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

    // TODO: proof fails if one wire contains all zeros. Should we support this?
    uint32_t zero_idx = composer.add_variable(fr::zero);

    composer.create_big_add_gate({ zero_idx, zero_idx, zero_idx, a_idx, fr::one, fr::one, fr::one, fr::one, fr::neg_one() });

    waffle::TurboProver prover = composer.preprocess();

    waffle::TurboVerifier verifier = composer.create_verifier();

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

    fr::field_t a = fr::one;
    fr::field_t b = fr::random_element();
    fr::field_t c = fr::neg(fr::mul(fr::add(fr::add(fr::mul(q[0], a), fr::mul(q[1], b)), q[3]), q_inv[2]));
    fr::field_t d = fr::neg(fr::mul(fr::add(fr::mul(q[4], fr::mul(a, b)), q[6]), q_inv[5]));

    uint32_t a_idx = composer.add_public_variable(a);
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

    uint32_t zero_idx = composer.add_variable(fr::zero);
    uint32_t one_idx = composer.add_variable(fr::one);
    composer.create_big_add_gate({ zero_idx, zero_idx, zero_idx, one_idx, fr::one, fr::one, fr::one, fr::one, fr::neg_one() });

    uint32_t e_idx = composer.add_variable(fr::sub(a, fr::one));
    composer.create_add_gate({ e_idx, b_idx, c_idx, q[0], q[1], q[2], fr::add(q[3], q[0]) });
    waffle::TurboProver prover = composer.preprocess();

    waffle::TurboVerifier verifier = composer.create_verifier();

    waffle::plonk_proof proof = prover.construct_proof();

    bool result = verifier.verify_proof(proof);

    EXPECT_EQ(result, true);
}


TEST(turbo_composer, small_scalar_multipliers)
{
    constexpr size_t num_bits = 63;
    constexpr size_t num_quads_base = (num_bits - 1) >> 1;
    constexpr size_t num_quads = ((num_quads_base << 1) + 1 < num_bits) ? num_quads_base + 1 : num_quads_base;
    constexpr size_t num_wnaf_bits = (num_quads << 1) + 1;
    constexpr size_t initial_exponent = ((num_bits & 1) == 1) ? num_bits - 1 : num_bits;
    constexpr size_t bit_mask = (1ULL << num_bits) - 1UL;
    const plonk::stdlib::group_utils::fixed_base_ladder* ladder = plonk::stdlib::group_utils::get_ladder(0, num_bits);
    grumpkin::g1::affine_element generator = plonk::stdlib::group_utils::get_generator(0);

    grumpkin::g1::element origin_points[2];
    grumpkin::g1::affine_to_jacobian(ladder[0].one, origin_points[0]);
    grumpkin::g1::mixed_add(origin_points[0], generator, origin_points[1]);
    origin_points[1] = grumpkin::g1::normalize(origin_points[1]);

    grumpkin::fr::field_t scalar_multiplier_entropy = grumpkin::fr::random_element();
    grumpkin::fr::field_t scalar_multiplier_base{{ scalar_multiplier_entropy.data[0] & bit_mask, 0, 0, 0 }};
    // scalar_multiplier_base.data[0] = scalar_multiplier_base.data[0] | (1ULL);
    scalar_multiplier_base.data[0] = scalar_multiplier_base.data[0] & (~1ULL);
    grumpkin::fr::field_t scalar_multiplier = scalar_multiplier_base;

    uint64_t wnaf_entries[num_quads + 1] = { 0 };
    if ((scalar_multiplier_base.data[0] & 1) == 0)
    {
        scalar_multiplier_base.data[0] -= 2;
    }
    bool skew = false;
    barretenberg::wnaf::fixed_wnaf<num_wnaf_bits, 1, 2>(&scalar_multiplier_base.data[0], &wnaf_entries[0], skew, 0);

    fr::field_t accumulator_offset = fr::invert(fr::pow_small(fr::add(fr::one, fr::one), initial_exponent));
    fr::field_t origin_accumulators[2]{ fr::one, fr::add(accumulator_offset, fr::one) };

    grumpkin::g1::element* multiplication_transcript =
        static_cast<grumpkin::g1::element*>(aligned_alloc(64, sizeof(grumpkin::g1::element) * (num_quads + 1)));
    fr::field_t* accumulator_transcript = static_cast<fr::field_t*>(aligned_alloc(64, sizeof(fr::field_t) * (num_quads + 1)));

    if (skew)
    {
        multiplication_transcript[0] = origin_points[1];
        accumulator_transcript[0] = origin_accumulators[1];
    }
    else
    {
        multiplication_transcript[0] = origin_points[0];
        accumulator_transcript[0] = origin_accumulators[0];
    }
    
    fr::field_t one = fr::one;
    fr::field_t three = fr::add(fr::add(one, one), one);
    for (size_t i = 0; i < num_quads; ++i) {
        uint64_t entry = wnaf_entries[i + 1] & 0xffffff;
        fr::field_t prev_accumulator = fr::add(accumulator_transcript[i], accumulator_transcript[i]);
        prev_accumulator = fr::add(prev_accumulator, prev_accumulator);

        grumpkin::g1::affine_element point_to_add = (entry == 1) ? ladder[i + 1].three : ladder[i + 1].one;
        fr::field_t scalar_to_add = (entry == 1) ? three : one;
        uint64_t predicate = (wnaf_entries[i + 1] >> 31U) & 1U;
        if (predicate)
        {
            grumpkin::g1::__neg(point_to_add, point_to_add);
            fr::__neg(scalar_to_add, scalar_to_add);
        }
        accumulator_transcript[i + 1] = fr::add(prev_accumulator, scalar_to_add);
        grumpkin::g1::mixed_add(multiplication_transcript[i], point_to_add, multiplication_transcript[i + 1]);
    }
    grumpkin::g1::batch_normalize(&multiplication_transcript[0], num_quads + 1);

    waffle::fixed_group_init_quad init_quad{
        origin_points[0].x,
        fr::sub(origin_points[0].x, origin_points[1].x),
        origin_points[0].y,
        fr::sub(origin_points[0].y, origin_points[1].y)
    };

    waffle::TurboComposer composer = waffle::TurboComposer();

    fr::field_t x_alpha = accumulator_offset;
    for (size_t i = 0; i < num_quads; ++i) {
        waffle::fixed_group_add_quad round_quad;
        round_quad.d = composer.add_variable(accumulator_transcript[i]);
        round_quad.a = composer.add_variable(multiplication_transcript[i].x);
        round_quad.b = composer.add_variable(multiplication_transcript[i].y);
        round_quad.c = composer.add_variable(x_alpha);
        if ((wnaf_entries[i + 1] & 0xffffffU) == 0) {
            x_alpha = ladder[i+1].one.x;
        } else {
            x_alpha = ladder[i+1].three.x;
        }
        round_quad.q_x_1= ladder[i+1].q_x_1;
        round_quad.q_x_2= ladder[i+1].q_x_2;
        round_quad.q_y_1= ladder[i+1].q_y_1;
        round_quad.q_y_2 = ladder[i+1].q_y_2;

        if (i > 0)
        {
            composer.create_fixed_group_add_gate(round_quad);
        }
        else
        {
            composer.create_fixed_group_add_gate_with_init(round_quad, init_quad);
        }
    }

    waffle::add_quad add_quad{
        composer.add_variable(multiplication_transcript[num_quads].x),
        composer.add_variable(multiplication_transcript[num_quads].y),
        composer.add_variable(x_alpha),
        composer.add_variable(accumulator_transcript[num_quads]),
        fr::zero,
        fr::zero,
        fr::zero,
        fr::zero,
        fr::zero
    };
    composer.create_big_add_gate(add_quad);

    grumpkin::g1::element expected_point = grumpkin::g1::normalize(grumpkin::g1::group_exponentiation_inner(generator, grumpkin::fr::to_montgomery_form(scalar_multiplier)));
    EXPECT_EQ(fr::eq(multiplication_transcript[num_quads].x, expected_point.x), true);
    EXPECT_EQ(fr::eq(multiplication_transcript[num_quads].y, expected_point.y), true);

    uint64_t result_accumulator = fr::from_montgomery_form(accumulator_transcript[num_quads]).data[0];
    uint64_t expected_accumulator = scalar_multiplier.data[0];
    EXPECT_EQ(result_accumulator, expected_accumulator);

    waffle::TurboProver prover = composer.preprocess();

    waffle::TurboVerifier verifier = composer.create_verifier();

    waffle::plonk_proof proof = prover.construct_proof();

    bool result = verifier.verify_proof(proof);

    if (result) {
        printf("proof valid\n");
    }
    EXPECT_EQ(result, true);

    free(multiplication_transcript);
    free(accumulator_transcript);
}


TEST(turbo_composer, large_scalar_multipliers)
{
    constexpr size_t num_bits = 254;
    constexpr size_t num_quads_base = (num_bits - 1) >> 1;
    constexpr size_t num_quads = ((num_quads_base << 1) + 1 < num_bits) ? num_quads_base + 1 : num_quads_base;
    constexpr size_t num_wnaf_bits = (num_quads << 1) + 1;

    constexpr size_t initial_exponent = ((num_bits & 1) == 1) ? num_bits - 1 : num_bits;
    const plonk::stdlib::group_utils::fixed_base_ladder* ladder = plonk::stdlib::group_utils::get_ladder(0, num_bits);
    grumpkin::g1::affine_element generator = plonk::stdlib::group_utils::get_generator(0);

    grumpkin::g1::element origin_points[2];
    grumpkin::g1::affine_to_jacobian(ladder[0].one, origin_points[0]);
    grumpkin::g1::mixed_add(origin_points[0], generator, origin_points[1]);
    origin_points[1] = grumpkin::g1::normalize(origin_points[1]);

    grumpkin::fr::field_t scalar_multiplier_base = grumpkin::fr::random_element();

    grumpkin::fr::field_t scalar_multiplier = grumpkin::fr::from_montgomery_form(scalar_multiplier_base);

    if ((scalar_multiplier.data[0] & 1) == 0)
    {
        grumpkin::fr::field_t two = grumpkin::fr::add(grumpkin::fr::one, grumpkin::fr::one);
        scalar_multiplier_base = grumpkin::fr::sub(scalar_multiplier_base, two);
    }
    scalar_multiplier_base = grumpkin::fr::from_montgomery_form(scalar_multiplier_base);
    uint64_t wnaf_entries[num_quads + 1] = { 0 };

    bool skew = false;
    barretenberg::wnaf::fixed_wnaf<num_wnaf_bits, 1, 2>(&scalar_multiplier_base.data[0], &wnaf_entries[0], skew, 0);

    fr::field_t accumulator_offset = fr::invert(fr::pow_small(fr::add(fr::one, fr::one), initial_exponent));
    fr::field_t origin_accumulators[2]{ fr::one, fr::add(accumulator_offset, fr::one) };

    grumpkin::g1::element* multiplication_transcript =
        static_cast<grumpkin::g1::element*>(aligned_alloc(64, sizeof(grumpkin::g1::element) * (num_quads + 1)));
    fr::field_t* accumulator_transcript = static_cast<fr::field_t*>(aligned_alloc(64, sizeof(fr::field_t) * (num_quads + 1)));

    if (skew)
    {
        multiplication_transcript[0] = origin_points[1];
        accumulator_transcript[0] = origin_accumulators[1];
    }
    else
    {
        multiplication_transcript[0] = origin_points[0];
        accumulator_transcript[0] = origin_accumulators[0];
    }
    
    fr::field_t one = fr::one;
    fr::field_t three = fr::add(fr::add(one, one), one);
    for (size_t i = 0; i < num_quads; ++i) {
        uint64_t entry = wnaf_entries[i + 1] & 0xffffff;
        fr::field_t prev_accumulator = fr::add(accumulator_transcript[i], accumulator_transcript[i]);
        prev_accumulator = fr::add(prev_accumulator, prev_accumulator);

        grumpkin::g1::affine_element point_to_add = (entry == 1) ? ladder[i + 1].three : ladder[i + 1].one;
        fr::field_t scalar_to_add = (entry == 1) ? three : one;
        uint64_t predicate = (wnaf_entries[i + 1] >> 31U) & 1U;
        if (predicate)
        {
            grumpkin::g1::__neg(point_to_add, point_to_add);
            fr::__neg(scalar_to_add, scalar_to_add);
        }
        accumulator_transcript[i + 1] = fr::add(prev_accumulator, scalar_to_add);
        grumpkin::g1::mixed_add(multiplication_transcript[i], point_to_add, multiplication_transcript[i + 1]);
    }
    grumpkin::g1::batch_normalize(&multiplication_transcript[0], num_quads + 1);

    waffle::fixed_group_init_quad init_quad{
        origin_points[0].x,
        fr::sub(origin_points[0].x, origin_points[1].x),
        origin_points[0].y,
        fr::sub(origin_points[0].y, origin_points[1].y)
    };

    waffle::TurboComposer composer = waffle::TurboComposer();

    fr::field_t x_alpha = accumulator_offset;
    for (size_t i = 0; i < num_quads; ++i) {
        waffle::fixed_group_add_quad round_quad;
        round_quad.d = composer.add_variable(accumulator_transcript[i]);
        round_quad.a = composer.add_variable(multiplication_transcript[i].x);
        round_quad.b = composer.add_variable(multiplication_transcript[i].y);
        round_quad.c = composer.add_variable(x_alpha);
        if ((wnaf_entries[i + 1] & 0xffffffU) == 0) {
            x_alpha = ladder[i+1].one.x;
        } else {
            x_alpha = ladder[i+1].three.x;
        }
        round_quad.q_x_1= ladder[i+1].q_x_1;
        round_quad.q_x_2= ladder[i+1].q_x_2;
        round_quad.q_y_1= ladder[i+1].q_y_1;
        round_quad.q_y_2 = ladder[i+1].q_y_2;

        if (i > 0)
        {
            composer.create_fixed_group_add_gate(round_quad);
        }
        else
        {
            composer.create_fixed_group_add_gate_with_init(round_quad, init_quad);
        }
    }

    waffle::add_quad add_quad{
        composer.add_variable(multiplication_transcript[num_quads].x),
        composer.add_variable(multiplication_transcript[num_quads].y),
        composer.add_variable(x_alpha),
        composer.add_variable(accumulator_transcript[num_quads]),
        fr::zero,
        fr::zero,
        fr::zero,
        fr::zero,
        fr::zero
    };
    composer.create_big_add_gate(add_quad);

    grumpkin::g1::element expected_point = grumpkin::g1::normalize(grumpkin::g1::group_exponentiation_inner(generator, grumpkin::fr::to_montgomery_form(scalar_multiplier)));
    EXPECT_EQ(fr::eq(multiplication_transcript[num_quads].x, expected_point.x), true);
    EXPECT_EQ(fr::eq(multiplication_transcript[num_quads].y, expected_point.y), true);

    fr::field_t result_accumulator = (accumulator_transcript[num_quads]);
    fr::field_t expected_accumulator = fr::to_montgomery_form({{
        scalar_multiplier.data[0], scalar_multiplier.data[1], scalar_multiplier.data[2], scalar_multiplier.data[3]
    }});
    EXPECT_EQ(fr::eq(result_accumulator, expected_accumulator), true);

    waffle::TurboProver prover = composer.preprocess();

    waffle::TurboVerifier verifier = composer.create_verifier();

    waffle::plonk_proof proof = prover.construct_proof();

    bool result = verifier.verify_proof(proof);

    if (result) {
        printf("proof valid\n");
    }
    EXPECT_EQ(result, true);

    free(multiplication_transcript);
    free(accumulator_transcript);

}


TEST(turbo_composer, range_constraint)
{
    waffle::TurboComposer composer = waffle::TurboComposer();

    for (size_t i = 0; i < 10; ++i)
    {
        uint32_t value = get_random_int();
        fr::field_t witness_value = fr::to_montgomery_form({{ value, 0, 0, 0 }});
        uint32_t witness_index = composer.add_variable(witness_value);

        // include non-nice numbers of bits, that will bleed over gate boundaries
        size_t extra_bits = 2 * (i % 4);
    
        std::vector<uint32_t> accumulators = composer.create_range_constraint(witness_index, 32 + extra_bits);

        for (uint32_t j = 0; j < 16; ++j)
        {
            uint32_t result = (value >> (30U - (2* j)));
            fr::field_t source = fr::from_montgomery_form(composer.get_variable(accumulators[j + (extra_bits >> 1)]));
            uint32_t expected = static_cast<uint32_t>(source.data[0]);
            EXPECT_EQ(result, expected);
        }
        for (uint32_t j = 1; j < 16; ++j)
        {
            uint32_t left = (value >> (30U - (2* j)));
            uint32_t right = (value >> (30U - (2* (j - 1))));
            EXPECT_EQ(left - 4 * right < 4, true);
        }
    }

    uint32_t zero_idx = composer.add_variable(fr::zero);
    uint32_t one_idx = composer.add_variable(fr::one);
    composer.create_big_add_gate({ zero_idx, zero_idx, zero_idx, one_idx, fr::one, fr::one, fr::one, fr::one, fr::neg_one() });

    waffle::TurboProver prover = composer.preprocess();

    waffle::TurboVerifier verifier = composer.create_verifier();

    waffle::plonk_proof proof = prover.construct_proof();

    bool result = verifier.verify_proof(proof);

    EXPECT_EQ(result, true);

}
