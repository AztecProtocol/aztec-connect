
#include "../../../curves/grumpkin/grumpkin.hpp"
#include "./group_utils.hpp"

namespace plonk
{
namespace stdlib
{
namespace group_utils
{
namespace
{
    static constexpr size_t num_generators = 128;
    static constexpr size_t bit_length = 254;
    static constexpr size_t quad_length = bit_length / 2;
    static std::array<grumpkin::g1::affine_element, num_generators> generators;
    static std::array<std::array<fixed_base_ladder, quad_length>, num_generators> ladders;

    const auto init = []() {
        generators = grumpkin::g1::derive_generators<num_generators>();
        for (size_t i = 0; i < num_generators; ++i)
        {
            compute_fixed_base_ladder(generators[i], &ladders[i][0]);
        }
        return 1;
    }();
}

void compute_fixed_base_ladder(const grumpkin::g1::affine_element& generator, fixed_base_ladder* ladder)
{
    grumpkin::g1::element* ladder_temp =
        static_cast<grumpkin::g1::element*>(aligned_alloc(64, sizeof(grumpkin::g1::element) * quad_length * 2));
    // grumpkin::g1::element* ladder_3 = static_cast<grumpkin::g1::element*>(aligned_alloc(64,
    // sizeof(grumpkin::g1::element) * quad_length));
    grumpkin::g1::element accumulator;
    grumpkin::g1::affine_to_jacobian(generator, accumulator);
    for (size_t i = 0; i < quad_length; ++i) {
        ladder_temp[i] = accumulator;
        grumpkin::g1::dbl(accumulator, accumulator);
        grumpkin::g1::add(accumulator, ladder_temp[i], ladder_temp[quad_length + i]);
        grumpkin::g1::dbl(accumulator, accumulator);
    }

    grumpkin::g1::batch_normalize(&ladder_temp[0], quad_length * 2);
    for (size_t i = 0; i < quad_length; ++i) {
        grumpkin::fq::__copy(ladder_temp[i].x, ladder[quad_length - 1 - i].one.x);
        grumpkin::fq::__copy(ladder_temp[i].y, ladder[quad_length - 1 - i].one.y);
        grumpkin::fq::__copy(ladder_temp[quad_length + i].x, ladder[quad_length - 1 - i].three.x);
        grumpkin::fq::__copy(ladder_temp[quad_length + i].y, ladder[quad_length - 1 - i].three.y);
    }

    grumpkin::fq::field_t eight_inverse = grumpkin::fq::invert(grumpkin::fq::to_montgomery_form({ { 8, 0, 0, 0 } }));
    std::array<grumpkin::fq::field_t, quad_length> y_denominators;
    for (size_t i = 0; i < quad_length; ++i) {

        grumpkin::fq::field_t x_beta = ladder[i].one.x;
        grumpkin::fq::field_t x_gamma = ladder[i].three.x;

        grumpkin::fq::field_t y_beta = ladder[i].one.y;
        grumpkin::fq::field_t y_gamma = ladder[i].three.y;
        grumpkin::fq::field_t x_beta_times_nine = grumpkin::fq::add(x_beta, x_beta);
        x_beta_times_nine = grumpkin::fq::add(x_beta_times_nine, x_beta_times_nine);
        x_beta_times_nine = grumpkin::fq::add(x_beta_times_nine, x_beta_times_nine);
        x_beta_times_nine = grumpkin::fq::add(x_beta_times_nine, x_beta);

        grumpkin::fq::field_t x_alpha_1 = grumpkin::fq::mul(grumpkin::fq::sub(x_gamma, x_beta), eight_inverse);
        grumpkin::fq::field_t x_alpha_2 = grumpkin::fq::mul(grumpkin::fq::sub(x_beta_times_nine, x_gamma), eight_inverse);

        grumpkin::fq::field_t T0 = grumpkin::fq::sub(x_beta, x_gamma);
        y_denominators[i] = (grumpkin::fq::add(grumpkin::fq::add(T0, T0), T0));

        grumpkin::fq::field_t y_alpha_1 = grumpkin::fq::sub(grumpkin::fq::add(grumpkin::fq::add(y_beta, y_beta), y_beta), y_gamma);
        grumpkin::fq::field_t T1 = grumpkin::fq::mul(x_gamma, y_beta);
        T1 = grumpkin::fq::add(grumpkin::fq::add(T1, T1), T1);
        grumpkin::fq::field_t y_alpha_2 = grumpkin::fq::sub(grumpkin::fq::mul(x_beta, y_gamma), T1);

        ladder[i].q_x_1 = x_alpha_1;
        ladder[i].q_x_2 = x_alpha_2;
        ladder[i].q_y_1 = y_alpha_1;
        ladder[i].q_y_2 = y_alpha_2;
    }
    grumpkin::fq::batch_invert(&y_denominators[0], quad_length);
    for (size_t i = 0; i < quad_length; ++i)
    {
        grumpkin::fq::__mul(ladder[i].q_y_1, y_denominators[i], ladder[i].q_y_1);
        grumpkin::fq::__mul(ladder[i].q_y_2, y_denominators[i], ladder[i].q_y_2);
    }
    free(ladder_temp);
}

const fixed_base_ladder* get_ladder(const size_t generator_index, const size_t num_bits)
{
    // find n, such that 2n + 1 >= num_bits
    size_t n;
    if (num_bits == 0)
    {
        n = 0;
    }
    else
    {
        n = (num_bits - 1) >> 1;
        if (((n << 1) + 1)< num_bits)
        {
            ++n;
        }
    }
    const fixed_base_ladder* result = &ladders[generator_index][quad_length - n - 1];
    return result;
}

grumpkin::g1::affine_element get_generator(const size_t generator_index)
{
    return generators[generator_index];
}
}
}
}