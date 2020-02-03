
#include "./group_utils.hpp"
#include "../../../curves/grumpkin/grumpkin.hpp"

#ifndef NO_MULTITHREADING
#include <omp.h>
#endif

namespace plonk {
namespace stdlib {
namespace group_utils {
namespace {

static constexpr size_t num_generators = 128;
static constexpr size_t bit_length = 256;
static constexpr size_t quad_length = bit_length / 2;
static std::array<grumpkin::g1::affine_element, num_generators> generators;
static std::array<std::array<fixed_base_ladder, quad_length>, num_generators> ladders;
static std::array<std::array<fixed_base_ladder, quad_length>, num_generators> hash_ladders;

const auto init = []() {
    generators = grumpkin::g1::derive_generators<num_generators>();
    constexpr size_t first_generator_segment = 126;
    constexpr size_t second_generator_segment = 2;
    for (size_t i = 0; i < num_generators; ++i) {
        compute_fixed_base_ladder(generators[i], &ladders[i][0]);
    }
    for (size_t i = 0; i < num_generators / 2; ++i) {
        for (size_t j = 0; j < first_generator_segment; ++j) {
            hash_ladders[i][j] = ladders[i * 2][j + (quad_length - first_generator_segment)];
        }

        for (size_t j = 0; j < second_generator_segment; ++j) {
            hash_ladders[i][j + first_generator_segment] =
                ladders[i * 2 + 1][j + (quad_length - second_generator_segment)];
        }
    }
    return 1;
}();
} // namespace

void compute_fixed_base_ladder(const grumpkin::g1::affine_element& generator, fixed_base_ladder* ladder)
{
    grumpkin::g1::element* ladder_temp =
        static_cast<grumpkin::g1::element*>(aligned_alloc(64, sizeof(grumpkin::g1::element) * (quad_length * 2)));

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
        grumpkin::fq::field_t x_alpha_2 =
            grumpkin::fq::mul(grumpkin::fq::sub(x_beta_times_nine, x_gamma), eight_inverse);

        grumpkin::fq::field_t T0 = grumpkin::fq::sub(x_beta, x_gamma);
        y_denominators[i] = (grumpkin::fq::add(grumpkin::fq::add(T0, T0), T0));

        grumpkin::fq::field_t y_alpha_1 =
            grumpkin::fq::sub(grumpkin::fq::add(grumpkin::fq::add(y_beta, y_beta), y_beta), y_gamma);
        grumpkin::fq::field_t T1 = grumpkin::fq::mul(x_gamma, y_beta);
        T1 = grumpkin::fq::add(grumpkin::fq::add(T1, T1), T1);
        grumpkin::fq::field_t y_alpha_2 = grumpkin::fq::sub(grumpkin::fq::mul(x_beta, y_gamma), T1);

        ladder[i].q_x_1 = x_alpha_1;
        ladder[i].q_x_2 = x_alpha_2;
        ladder[i].q_y_1 = y_alpha_1;
        ladder[i].q_y_2 = y_alpha_2;
    }
    grumpkin::fq::batch_invert(&y_denominators[0], quad_length);
    for (size_t i = 0; i < quad_length; ++i) {
        grumpkin::fq::__mul(ladder[i].q_y_1, y_denominators[i], ladder[i].q_y_1);
        grumpkin::fq::__mul(ladder[i].q_y_2, y_denominators[i], ladder[i].q_y_2);
    }
    free(ladder_temp);
}

const fixed_base_ladder* get_ladder(const size_t generator_index, const size_t num_bits)
{
    // find n, such that 2n + 1 >= num_bits
    size_t n;
    if (num_bits == 0) {
        n = 0;
    } else {
        n = (num_bits - 1) >> 1;
        if (((n << 1) + 1) < num_bits) {
            ++n;
        }
    }
    const fixed_base_ladder* result = &ladders[generator_index][quad_length - n - 1];
    return result;
}

const fixed_base_ladder* get_hash_ladder(const size_t generator_index, const size_t num_bits)
{
    // find n, such that 2n + 1 >= num_bits
    size_t n;
    if (num_bits == 0) {
        n = 0;
    } else {
        n = (num_bits - 1) >> 1;
        if (((n << 1) + 1) < num_bits) {
            ++n;
        }
    }
    const fixed_base_ladder* result = &hash_ladders[generator_index][quad_length - n - 1];
    return result;
}

grumpkin::g1::affine_element get_generator(const size_t generator_index)
{
    return generators[generator_index];
}

using namespace grumpkin;

g1::element& operator+=(g1::element& lhs, g1::element& rhs)
{
    // g1::print(lhs);
    g1::add(lhs, rhs, lhs);
    return lhs;
}

#pragma omp declare reduction(CustomSum : g1::element : omp_out += omp_in) initializer(g1::set_infinity(omp_priv))

grumpkin::g1::element hash_single(const barretenberg::fr::field_t& in, const size_t hash_index)
{
    barretenberg::fr::field_t scalar_multiplier = barretenberg::fr::from_montgomery_form(in);

    constexpr size_t num_bits = 254;
    constexpr size_t num_quads_base = (num_bits - 1) >> 1;
    constexpr size_t num_quads = ((num_quads_base << 1) + 1 < num_bits) ? num_quads_base + 1 : num_quads_base;
    constexpr size_t num_wnaf_bits = (num_quads << 1) + 1;

    const plonk::stdlib::group_utils::fixed_base_ladder* ladder =
        plonk::stdlib::group_utils::get_hash_ladder(hash_index, num_bits);
    grumpkin::g1::affine_element generator = plonk::stdlib::group_utils::get_generator(hash_index * 2 + 1);
    grumpkin::g1::element origin_points[2];
    grumpkin::g1::affine_to_jacobian(ladder[0].one, origin_points[0]);
    grumpkin::g1::mixed_add(origin_points[0], generator, origin_points[1]);

    barretenberg::fr::field_t scalar_multiplier_base = barretenberg::fr::to_montgomery_form(scalar_multiplier);
    if ((scalar_multiplier.data[0] & 1) == 0) {
        barretenberg::fr::field_t two = barretenberg::fr::add(barretenberg::fr::one, barretenberg::fr::one);
        scalar_multiplier_base = barretenberg::fr::sub(scalar_multiplier_base, two);
    }
    scalar_multiplier_base = barretenberg::fr::from_montgomery_form(scalar_multiplier_base);
    uint64_t wnaf_entries[num_quads + 2] = { 0 };
    bool skew = false;
    barretenberg::wnaf::fixed_wnaf<num_wnaf_bits, 1, 2>(&scalar_multiplier_base.data[0], &wnaf_entries[0], skew, 0);

#ifndef NO_MULTITHREADING
    // const size_t num_threads = static_cast<size_t>(omp_get_max_threads());
    const size_t num_threads = 2;
#else
    const size_t num_threads = 1;
#endif
    g1::element accumulator;
    g1::set_infinity(accumulator);
    size_t quads_per_thread = 128 / num_threads;

#ifndef NO_MULTITHREADING
#pragma omp parallel for reduction(CustomSum : accumulator) num_threads(num_threads) firstprivate(quads_per_thread)
#endif
    for (size_t j = 0; j < num_threads; ++j) {
        size_t offset = j * quads_per_thread;
        if (j == num_threads - 1) {
            quads_per_thread -= 1;
        }
        g1::element inner_acc;
        g1::set_infinity(inner_acc);
        for (size_t i = offset; i < offset + quads_per_thread; ++i) {
            uint64_t entry = wnaf_entries[i + 1] & 0xffffff;
            grumpkin::g1::affine_element point_to_add = (entry == 1) ? ladder[i + 1].three : ladder[i + 1].one;
            uint64_t predicate = (wnaf_entries[i + 1] >> 31U) & 1U;
            if (predicate) {
                grumpkin::g1::__neg(point_to_add, point_to_add);
            }
            grumpkin::g1::mixed_add(inner_acc, point_to_add, inner_acc);
        }
        accumulator += inner_acc;
    }

    g1::add(accumulator, (skew == true) ? origin_points[1] : origin_points[0], accumulator);
    return accumulator;
}

grumpkin::fq::field_t compress_native(const grumpkin::fq::field_t& left, const grumpkin::fq::field_t& right)
{
#ifndef NO_MULTITHREADING
    grumpkin::fq::field_t in[2] = { left, right };
    grumpkin::g1::element out[2];
#pragma omp parallel num_threads(2)
    {
        size_t i = (size_t)omp_get_thread_num();
        out[i] = hash_single(in[i], i);
    }
    grumpkin::g1::element r;
    grumpkin::g1::add(out[0], out[1], r);
    r = grumpkin::g1::normalize(r);
    return r.x;
#else
    grumpkin::g1::element r;
    grumpkin::g1::element first = hash_single(left, 0);
    grumpkin::g1::element second = hash_single(right, 1);
    grumpkin::g1::add(first, second, r);
    r = grumpkin::g1::normalize(r);
    return r.x;
#endif
}

} // namespace group_utils
} // namespace stdlib
} // namespace plonk