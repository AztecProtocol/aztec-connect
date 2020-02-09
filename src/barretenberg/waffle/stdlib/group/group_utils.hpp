#pragma once

#include "../../../curves/grumpkin/grumpkin.hpp"

namespace plonk {
namespace stdlib {
namespace group_utils {
struct fixed_base_ladder {
    grumpkin::g1::affine_element one;
    grumpkin::g1::affine_element three;
    grumpkin::fq::field_t q_x_1;
    grumpkin::fq::field_t q_x_2;
    grumpkin::fq::field_t q_y_1;
    grumpkin::fq::field_t q_y_2;
};
void compute_fixed_base_ladder(const grumpkin::g1::affine_element& generator, fixed_base_ladder* ladder);

const fixed_base_ladder* get_ladder(const size_t generator_index, const size_t num_bits);
const fixed_base_ladder* get_hash_ladder(const size_t generator_index, const size_t num_bits);
grumpkin::g1::affine_element get_generator(const size_t generator_index);

grumpkin::fq::field_t compress_native(const grumpkin::fq::field_t& left, const grumpkin::fq::field_t& right);

template <size_t num_bits>
grumpkin::g1::element fixed_base_scalar_mul(const barretenberg::fr::field_t& in, const size_t generator_index)
{
    barretenberg::fr::field_t scalar_multiplier = barretenberg::fr::from_montgomery_form(in);

    constexpr size_t num_quads_base = (num_bits - 1) >> 1;
    constexpr size_t num_quads = ((num_quads_base << 1) + 1 < num_bits) ? num_quads_base + 1 : num_quads_base;
    constexpr size_t num_wnaf_bits = (num_quads << 1) + 1;

    const plonk::stdlib::group_utils::fixed_base_ladder* ladder =
        plonk::stdlib::group_utils::get_ladder(generator_index, num_bits);

    barretenberg::fr::field_t scalar_multiplier_base = barretenberg::fr::to_montgomery_form(scalar_multiplier);
    if ((scalar_multiplier.data[0] & 1) == 0) {
        barretenberg::fr::field_t two = barretenberg::fr::add(barretenberg::fr::one, barretenberg::fr::one);
        scalar_multiplier_base = barretenberg::fr::sub(scalar_multiplier_base, two);
    }
    scalar_multiplier_base = barretenberg::fr::from_montgomery_form(scalar_multiplier_base);
    uint64_t wnaf_entries[num_quads + 2] = { 0 };
    bool skew = false;
    barretenberg::wnaf::fixed_wnaf<num_wnaf_bits, 1, 2>(&scalar_multiplier_base.data[0], &wnaf_entries[0], skew, 0);

    grumpkin::g1::element accumulator;
    grumpkin::g1::affine_to_jacobian(ladder[0].one, accumulator);
    if (skew) {
        grumpkin::g1::mixed_add(accumulator, plonk::stdlib::group_utils::get_generator(generator_index), accumulator);
    }

    for (size_t i = 0; i < num_quads; ++i) {
        uint64_t entry = wnaf_entries[i + 1];
        ;
        const grumpkin::g1::affine_element& point_to_add =
            ((entry & 0xffffff) == 1) ? ladder[i + 1].three : ladder[i + 1].one;
        uint64_t predicate = (entry >> 31U) & 1U;
        grumpkin::g1::mixed_add_or_sub(accumulator, point_to_add, accumulator, predicate);
    }
    return accumulator;
}
} // namespace group_utils
} // namespace stdlib
} // namespace plonk
