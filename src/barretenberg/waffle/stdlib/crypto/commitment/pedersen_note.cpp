#include "./pedersen_note.hpp"

#include "../../bool/bool.hpp"
#include "../../field/field.hpp"

#include "../../../composer/turbo_composer.hpp"

namespace plonk {
namespace stdlib {
namespace pedersen_note {
template <size_t num_bits>
note_triple fixed_base_scalar_mul(const field_t<waffle::TurboComposer>& in, const size_t generator_index)
{
    field_t<waffle::TurboComposer> scalar = in;
    if (!(in.additive_constant == barretenberg::fr::field_t::zero) || !(in.multiplicative_constant == barretenberg::fr::field_t::one)) {
        scalar = scalar.normalize();
    }
    waffle::TurboComposer* ctx = in.context;
    ASSERT(ctx != nullptr);
    barretenberg::fr::field_t scalar_multiplier = scalar.get_value().from_montgomery_form();

    // constexpr size_t num_bits = 250;
    constexpr size_t num_quads_base = (num_bits - 1) >> 1;
    constexpr size_t num_quads = ((num_quads_base << 1) + 1 < num_bits) ? num_quads_base + 1 : num_quads_base;
    constexpr size_t num_wnaf_bits = (num_quads << 1) + 1;

    size_t initial_exponent = ((num_bits & 1) == 1) ? num_bits - 1 : num_bits;
    const plonk::stdlib::group_utils::fixed_base_ladder* ladder =
        plonk::stdlib::group_utils::get_ladder(generator_index, num_bits);
    grumpkin::g1::affine_element generator = plonk::stdlib::group_utils::get_generator(generator_index);

    grumpkin::g1::element origin_points[2];
    grumpkin::g1::affine_to_jacobian(ladder[0].one, origin_points[0]);
    origin_points[1] = origin_points[0] + generator;
    origin_points[1] = grumpkin::g1::normalize(origin_points[1]);

    barretenberg::fr::field_t scalar_multiplier_base = scalar_multiplier.to_montgomery_form();

    if ((scalar_multiplier.data[0] & 1) == 0) {
        barretenberg::fr::field_t two = barretenberg::fr::field_t::one + barretenberg::fr::field_t::one;
        scalar_multiplier_base = scalar_multiplier_base - two;
    }
    scalar_multiplier_base = scalar_multiplier_base.from_montgomery_form();
    uint64_t wnaf_entries[num_quads + 1] = { 0 };
    bool skew = false;

    barretenberg::wnaf::fixed_wnaf<num_wnaf_bits, 1, 2>(&scalar_multiplier_base.data[0], &wnaf_entries[0], skew, 0);

    barretenberg::fr::field_t accumulator_offset =
        (barretenberg::fr::field_t::one + barretenberg::fr::field_t::one).pow(static_cast<uint64_t>(initial_exponent)).invert();

    barretenberg::fr::field_t origin_accumulators[2]{ barretenberg::fr::field_t::one,
                                                      accumulator_offset + barretenberg::fr::field_t::one };

    grumpkin::g1::element* multiplication_transcript =
        static_cast<grumpkin::g1::element*>(aligned_alloc(64, sizeof(grumpkin::g1::element) * (num_quads + 1)));
    barretenberg::fr::field_t* accumulator_transcript =
        static_cast<barretenberg::fr::field_t*>(aligned_alloc(64, sizeof(barretenberg::fr::field_t) * (num_quads + 1)));

    if (skew) {
        multiplication_transcript[0] = origin_points[1];
        accumulator_transcript[0] = origin_accumulators[1];
    } else {
        multiplication_transcript[0] = origin_points[0];
        accumulator_transcript[0] = origin_accumulators[0];
    }
    barretenberg::fr::field_t one = barretenberg::fr::field_t::one;
    barretenberg::fr::field_t three = ((one + one) + one);

    for (size_t i = 0; i < num_quads; ++i) {
        uint64_t entry = wnaf_entries[i + 1] & 0xffffff;

        barretenberg::fr::field_t prev_accumulator = accumulator_transcript[i] + accumulator_transcript[i];
        prev_accumulator = prev_accumulator + prev_accumulator;

        grumpkin::g1::affine_element point_to_add = (entry == 1) ? ladder[i + 1].three : ladder[i + 1].one;

        barretenberg::fr::field_t scalar_to_add = (entry == 1) ? three : one;
        uint64_t predicate = (wnaf_entries[i + 1] >> 31U) & 1U;
        if (predicate) {
            grumpkin::g1::__neg(point_to_add, point_to_add);
            scalar_to_add.self_neg();
        }
        accumulator_transcript[i + 1] = prev_accumulator + scalar_to_add;
        grumpkin::g1::mixed_add(multiplication_transcript[i], point_to_add, multiplication_transcript[i + 1]);
    }

    grumpkin::g1::batch_normalize(&multiplication_transcript[0], num_quads + 1);

    waffle::fixed_group_init_quad init_quad{ origin_points[0].x,
                                             (origin_points[0].x - origin_points[1].x),
                                             origin_points[0].y,
                                             (origin_points[0].y - origin_points[1].y) };

    barretenberg::fr::field_t x_alpha = accumulator_offset;
    for (size_t i = 0; i < num_quads; ++i) {
        waffle::fixed_group_add_quad round_quad;
        round_quad.d = ctx->add_variable(accumulator_transcript[i]);
        round_quad.a = ctx->add_variable(multiplication_transcript[i].x);
        round_quad.b = ctx->add_variable(multiplication_transcript[i].y);

        if (i == 0) {
            // we need to ensure that the first value of x_alpha is a defined constant.
            // However, repeated applications of the pedersen hash will use the same constant value.
            // `put_constant_variable` will create a gate that fixes the value of x_alpha, but only once
            round_quad.c = ctx->put_constant_variable(x_alpha);
        } else {
            round_quad.c = ctx->add_variable(x_alpha);
        }
        if ((wnaf_entries[i + 1] & 0xffffffU) == 0) {
            x_alpha = ladder[i + 1].one.x;
        } else {
            x_alpha = ladder[i + 1].three.x;
        }
        round_quad.q_x_1 = ladder[i + 1].q_x_1;
        round_quad.q_x_2 = ladder[i + 1].q_x_2;
        round_quad.q_y_1 = ladder[i + 1].q_y_1;
        round_quad.q_y_2 = ladder[i + 1].q_y_2;

        if (i > 0) {
            ctx->create_fixed_group_add_gate(round_quad);
        } else {
            ctx->create_fixed_group_add_gate_with_init(round_quad, init_quad);
        }
    }

    waffle::add_quad add_quad{ ctx->add_variable(multiplication_transcript[num_quads].x),
                               ctx->add_variable(multiplication_transcript[num_quads].y),
                               ctx->add_variable(x_alpha),
                               ctx->add_variable(accumulator_transcript[num_quads]),
                               barretenberg::fr::field_t::zero,
                               barretenberg::fr::field_t::zero,
                               barretenberg::fr::field_t::zero,
                               barretenberg::fr::field_t::zero,
                               barretenberg::fr::field_t::zero };
    ctx->create_big_add_gate(add_quad);

    note_triple result;
    result.base.x = field_t<waffle::TurboComposer>(ctx);
    result.base.x.witness_index = add_quad.a;
    result.base.y = field_t<waffle::TurboComposer>(ctx);
    result.base.y.witness_index = add_quad.b;
    result.scalar = field_t<waffle::TurboComposer>(ctx);
    result.scalar.witness_index = add_quad.d;

    return result;
}

note compute_commitment(const field_t<waffle::TurboComposer>& view_key,
                        const uint<waffle::TurboComposer, uint32_t>& value)
{
    typedef field_t<waffle::TurboComposer> field_t;

    waffle::TurboComposer* context = value.get_context();

    field_t k = static_cast<uint<waffle::TurboComposer, uint32_t>>(value);

    note_triple p_1 = fixed_base_scalar_mul<32>(k, 0);
    note_triple p_2 = fixed_base_scalar_mul<250>(view_key, 1);

    context->assert_equal(p_2.scalar.witness_index, view_key.witness_index);

    // if k = 0, then k * inv - 1 != 0
    // k * inv - (1 - is_zero)
    field_t one(context, barretenberg::fr::field_t::one);
    bool_t is_zero = k.is_zero();

    // If k = 0, our scalar multiplier is going to be nonsense.
    // We need to conditionally validate that, if k != 0, the constructed scalar multiplier matches our input scalar.
    field_t lhs = p_1.scalar * (one - is_zero);
    field_t rhs = k * (one - is_zero);
    lhs.normalize();
    rhs.normalize();
    context->assert_equal(lhs.witness_index, rhs.witness_index);

    // If k = 0 we want to return p_2.base, as g^{0} = 1
    // If k != 0, we want to return p_1.base + p_2.base
    field_t lambda = (p_2.base.y - p_1.base.y) / (p_2.base.x - p_1.base.x);
    field_t x_3 = (lambda * lambda) - (p_2.base.x - p_1.base.x);
    field_t y_3 = lambda * (p_1.base.x - x_3) - p_1.base.y;

    field_t x_4 = (p_2.base.x - x_3) * is_zero + x_3;
    field_t y_4 = (p_2.base.y - y_3) * is_zero + y_3;
    x_4 = x_4.normalize();
    y_4 = y_4.normalize();

    note result{ { x_4, y_4 } };
    return result;
}

template note_triple fixed_base_scalar_mul<32>(const field_t<waffle::TurboComposer>& in, const size_t generator_index);
template note_triple fixed_base_scalar_mul<250>(const field_t<waffle::TurboComposer>& in, const size_t generator_index);

} // namespace pedersen_note
} // namespace stdlib
} // namespace plonk