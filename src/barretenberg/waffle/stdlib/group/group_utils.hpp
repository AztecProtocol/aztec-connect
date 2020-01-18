#pragma once

#include "../../../curves/grumpkin/grumpkin.hpp"
namespace plonk
{
namespace stdlib
{
namespace group_utils
{
    struct fixed_base_ladder
    {
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

}
}
}
