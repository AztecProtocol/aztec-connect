#include "stddef.h"
#include <stdlib.h>

#ifndef NO_MULTITHREADING
#include <omp.h>
#endif

#include "./scalar_multiplication.hpp"
#include "g1.hpp"
#include "wnaf.hpp"
#include "../fields/fr.hpp"
#include "../assert.hpp"

namespace barretenberg
{
namespace scalar_multiplication
{

size_t get_optimal_bucket_width(size_t num_points)
{
    if (num_points >= 0x10000000) // 2^28!
    {
        return 25;
    }
    if (num_points >= 0x1000000) // 2^24
    {
        return 21;
    }
    if (num_points >= 0x400000) // 2^22
    {
        return 18;
    }
    if (num_points >= 0x40000) // 2^18
    {
        return 15;
    }
    if (num_points >= 0x8000) // 2^15
    {
        return 12;
    }
    if (num_points >= 0x4000) // 2^14
    {
        return 11;
    }
    if (num_points >= 0x2000) // 2^13
    {
        return 10;
    }
    if (num_points >= 0x800) // 2^11
    {
        return 9;
    }
    if (num_points >= 0x200) // 2^9
    {
        return 7;
    }
    if (num_points >= 0x100) // 2^8
    {
        return 6;
    }
    if (num_points >= 0x80) // 2^7
    {
        return 5;
    }
    if (num_points >= 0x40) // 2^6
    {
        return 4;
    }
    if (num_points >= 0x10) // 2^4
    {
        return 3;
    }
    if (num_points >= 0x04) // 2^2
    {
        return 2;
    }
    return 1;
}

void compute_next_bucket_index(wnaf_runtime_state &state)
{
    uint32_t wnaf_entry = *state.wnaf_iterator;
    state.next_sign = (wnaf_entry >> 31) & 1;  //(uint64_t)(wnaf_entry >> state.bits_per_wnaf) & 1; // 0 - sign_bit;
    state.next_idx = wnaf_entry & 0x0fffffffU; // ((wnaf_entry ^ sign_mask) /*& state.mask*/) >> 1;
}

void generate_pippenger_point_table(g1::affine_element *points, g1::affine_element *table, size_t num_points)
{
    // iterate backwards, so that `points` and `table` can point to the same memory location
    for (size_t i = num_points - 1; i < num_points; --i)
    {
        g1::copy(&points[i], &table[i * 2]);
        fq::__mul_beta(points[i].x, table[i * 2 + 1].x);
        fq::neg(points[i].y, table[i * 2 + 1].y);
    }
}

g1::element pippenger_low_memory(fr::field_t *scalars, g1::affine_element *points, size_t num_points)
{
    for (size_t i = 0; i < num_points; ++i)
    {
        fr::from_montgomery_form(scalars[i], scalars[i]);
    }
    size_t bits_per_bucket = get_optimal_bucket_width(num_points);
    multiplication_runtime_state state;
    state.num_points = num_points;
    state.num_rounds = WNAF_SIZE(bits_per_bucket + 1);
    state.num_buckets = (1UL << bits_per_bucket);
    wnaf_runtime_state wnaf_state;
    wnaf_state.bits_per_wnaf = bits_per_bucket + 1;

    // allocate space for buckets
    state.buckets = (g1::element *)aligned_alloc(32, sizeof(g1::element) * (state.num_buckets));
    for (size_t i = 0; i < state.num_buckets; ++i)
    {
        g1::set_infinity(state.buckets[i]);
    }
    // allocate space for wnaf table. We need 1 extra entry because our pointer iterator will overflow by 1 in the main loop
    wnaf_state.wnaf_table = (uint32_t *)aligned_alloc(32, sizeof(uint32_t) * (state.num_rounds) * state.num_points * 2 + 2);
    wnaf_state.skew_table = (bool *)aligned_alloc(32, sizeof(bool) * state.num_points * 2 + 2);

    for (size_t i = 0; i < num_points; ++i)
    {
        fr::split_into_endomorphism_scalars(scalars[i], scalars[i], *(fr::field_t *)&scalars[i].data[2]);
        wnaf::fixed_wnaf(&scalars[i].data[0], &wnaf_state.wnaf_table[2 * i], wnaf_state.skew_table[2 * i], state.num_points * 2, bits_per_bucket + 1);
        wnaf::fixed_wnaf(&scalars[i].data[2], &wnaf_state.wnaf_table[2 * i + 1], wnaf_state.skew_table[2 * i + 1], state.num_points * 2, bits_per_bucket + 1);
    }
    g1::set_infinity(state.accumulator);

    wnaf_state.wnaf_iterator = wnaf_state.wnaf_table;
    compute_next_bucket_index(wnaf_state);
    ++wnaf_state.wnaf_iterator;

    for (size_t i = 0; i < state.num_rounds; ++i)
    {
        // handle 0 as special case
        if (i == (state.num_rounds - 1))
        {
            for (size_t j = 0; j < state.num_points; ++j)
            {
                if (wnaf_state.skew_table[j * 2])
                {
                    g1::neg(points[j], state.addition_temporary);
                    g1::mixed_add(state.buckets[0], state.addition_temporary, state.buckets[0]);
                }
                if (wnaf_state.skew_table[j * 2 + 1])
                {
                    // g1::neg(points[j], state.addition_temporary);
                    fq::__mul_beta(points[j].x, state.addition_temporary.x);
                    fq::copy(points[j].y, state.addition_temporary.y);
                    g1::mixed_add(state.buckets[0], state.addition_temporary, state.buckets[0]);
                }
            }
        }
        for (size_t j = 0; j < state.num_points; ++j)
        {
            wnaf_state.current_idx = wnaf_state.next_idx;
            wnaf_state.current_sign = wnaf_state.next_sign;
            // compute the bucket index one step ahead of our current point, so that
            // we can issue a prefetch instruction and cache the bucket
            compute_next_bucket_index(wnaf_state);
            __builtin_prefetch(&state.buckets[wnaf_state.next_idx]);
            __builtin_prefetch(++wnaf_state.wnaf_iterator);
            g1::conditional_negate_affine(&points[j], &state.addition_temporary, wnaf_state.current_sign);
            __builtin_prefetch(&state.buckets[wnaf_state.next_idx].z);
            g1::mixed_add(state.buckets[wnaf_state.current_idx], state.addition_temporary, state.buckets[wnaf_state.current_idx]);

            wnaf_state.current_idx = wnaf_state.next_idx;
            wnaf_state.current_sign = wnaf_state.next_sign;
            compute_next_bucket_index(wnaf_state);
            __builtin_prefetch(&state.buckets[wnaf_state.next_idx]);
            __builtin_prefetch(++wnaf_state.wnaf_iterator);
            g1::conditional_negate_affine(&points[j], &state.addition_temporary, wnaf_state.current_sign);
            fq::__mul_beta(state.addition_temporary.x, state.addition_temporary.x);
            fq::neg(state.addition_temporary.y, state.addition_temporary.y);
            __builtin_prefetch(&state.buckets[wnaf_state.next_idx].z);
            g1::mixed_add(state.buckets[wnaf_state.current_idx], state.addition_temporary, state.buckets[wnaf_state.current_idx]);
        }

        if (i > 0)
        {
            // we want to perform *bits_per_wnaf* number of doublings (i.e. bits_per_bucket + 1)
            // perform all but 1 of the point doubling ops here, we do the last one after accumulating buckets
            for (size_t j = 0; j < bits_per_bucket; ++j)
            {
                g1::dbl(state.accumulator, state.accumulator);
            }
        }
        g1::set_infinity(state.running_sum);
        for (int j = (int)state.num_buckets - 1; j > 0; --j)
        {
            __builtin_prefetch(&state.buckets[(size_t)j - 1]);
            __builtin_prefetch(&state.buckets[(size_t)j - 1].z);
            g1::add(state.running_sum, state.buckets[(size_t)j], state.running_sum);
            g1::add(state.accumulator, state.running_sum, state.accumulator);
            g1::set_infinity(state.buckets[(size_t)j]);
        }
        g1::add(state.running_sum, state.buckets[0], state.running_sum);
        g1::dbl(state.accumulator, state.accumulator);
        g1::add(state.accumulator, state.running_sum, state.accumulator);
        g1::set_infinity(state.buckets[0]);
    }
    free(wnaf_state.wnaf_table);
    free(wnaf_state.skew_table);
    free(state.buckets);
    return state.accumulator;
}

g1::element pippenger_internal(fr::field_t *scalars, g1::affine_element *points, size_t num_initial_points, fr::field_t *endo_scalars)
{
    size_t bits_per_bucket = get_optimal_bucket_width(num_initial_points);
    multiplication_runtime_state state;
    state.num_points = num_initial_points + num_initial_points;
    state.num_rounds = WNAF_SIZE(bits_per_bucket + 1);
    state.num_buckets = (1UL << bits_per_bucket);
    wnaf_runtime_state wnaf_state;
    wnaf_state.bits_per_wnaf = bits_per_bucket + 1;

    // allocate space for buckets
    state.buckets = (g1::element *)aligned_alloc(32, sizeof(g1::element) * (state.num_buckets));
    for (size_t i = 0; i < state.num_buckets; ++i)
    {
        g1::set_infinity(state.buckets[i]);
    }
    // allocate space for wnaf table. We need 1 extra entry because our pointer iterator will overflow by 1 in the main loop
    wnaf_state.wnaf_table = (uint32_t *)aligned_alloc(32, sizeof(uint32_t) * (state.num_rounds) * state.num_points + 1);
    wnaf_state.skew_table = (bool *)aligned_alloc(32, sizeof(bool) * state.num_points + 1);

    for (size_t i = 0; i < num_initial_points; ++i)
    {
        fr::split_into_endomorphism_scalars(scalars[i], endo_scalars[i], *(fr::field_t *)&endo_scalars[i].data[2]);
        wnaf::fixed_wnaf(&endo_scalars[i].data[0], &wnaf_state.wnaf_table[2 * i], wnaf_state.skew_table[2 * i], state.num_points, bits_per_bucket + 1);
        wnaf::fixed_wnaf(&endo_scalars[i].data[2], &wnaf_state.wnaf_table[2 * i + 1], wnaf_state.skew_table[2 * i + 1], state.num_points, bits_per_bucket + 1);
    }
    g1::set_infinity(state.accumulator);

    wnaf_state.wnaf_iterator = wnaf_state.wnaf_table;
    compute_next_bucket_index(wnaf_state);
    ++wnaf_state.wnaf_iterator;

    for (size_t i = 0; i < state.num_rounds; ++i)
    {
        // handle 0 as special case
        if (i == (state.num_rounds - 1))
        {
            for (size_t j = 0; j < state.num_points; ++j)
            {
                if (wnaf_state.skew_table[j])
                {
                    g1::neg(points[j], state.addition_temporary);
                    g1::mixed_add(state.buckets[0], state.addition_temporary, state.buckets[0]);
                }
            }
        }
        for (size_t j = 0; j < state.num_points; ++j)
        {
            wnaf_state.current_idx = wnaf_state.next_idx;
            wnaf_state.current_sign = wnaf_state.next_sign;
            // compute the bucket index one step ahead of our current point, so that
            // we can issue a prefetch instruction and cache the bucket
            compute_next_bucket_index(wnaf_state);
            __builtin_prefetch(&state.buckets[wnaf_state.next_idx]);
            __builtin_prefetch(++wnaf_state.wnaf_iterator);
            g1::conditional_negate_affine(&points[j], &state.addition_temporary, wnaf_state.current_sign);
            __builtin_prefetch(&state.buckets[wnaf_state.next_idx].z);
            g1::mixed_add(state.buckets[wnaf_state.current_idx], state.addition_temporary, state.buckets[wnaf_state.current_idx]);
        }

        if (i > 0)
        {
            // we want to perform *bits_per_wnaf* number of doublings (i.e. bits_per_bucket + 1)
            // perform all but 1 of the point doubling ops here, we do the last one after accumulating buckets
            for (size_t j = 0; j < bits_per_bucket; ++j)
            {
                g1::dbl(state.accumulator, state.accumulator);
            }
        }
        g1::set_infinity(state.running_sum);
        for (int j = (int)state.num_buckets - 1; j > 0; --j)
        {
            __builtin_prefetch(&state.buckets[(size_t)j - 1]);
            __builtin_prefetch(&state.buckets[(size_t)j - 1].z);
            g1::add(state.running_sum, state.buckets[(size_t)j], state.running_sum);
            g1::add(state.accumulator, state.running_sum, state.accumulator);
            g1::set_infinity(state.buckets[(size_t)j]);
        }
        g1::add(state.running_sum, state.buckets[0], state.running_sum);
        g1::dbl(state.accumulator, state.accumulator);
        g1::add(state.accumulator, state.running_sum, state.accumulator);
        g1::set_infinity(state.buckets[0]);
    }

    free(wnaf_state.wnaf_table);
    free(wnaf_state.skew_table);
    free(state.buckets);

    return state.accumulator;
}

g1::element pippenger(fr::field_t *scalars, g1::affine_element *points, size_t num_initial_points)
{
    fr::field_t *endo_scalars = (fr::field_t *)aligned_alloc(32, sizeof(fr::field_t) * (num_initial_points));
    for (size_t i = 0; i < num_initial_points; ++i)
    {
        fr::from_montgomery_form(scalars[i], endo_scalars[i]);
    }
    g1::element res = pippenger_internal(endo_scalars, points, num_initial_points, endo_scalars);
    free(endo_scalars);
    return res;
}

void batched_scalar_multiplications(multiplication_state *mul_state, size_t num_exponentiations)
{
    // When performing a pippenger multi-exponentiation, the runtime is O(n / logn)
    // Therefore, when we are performing multiple multi-exponentiations, we need to
    // consider how to effectively multi-thread.

    // We can't thread the actual pippenger algorithm - two threads writing to the same bucket requires slow mutexing.

    // Splitting up each multi-exponentiation into small batches, and running pippenger on each batch on a thread, is also suboptimal.
    // This is because we have decreased then number of points in each multi-exponentiation (i.e. optimal pippenger for small ranges requires more buckets)

    // To maximize the number of points each thread is working on, we want to perform the all of the multiple multi-exponentiations in parallel

    // E.g. consider 4 multi-exps, each with 2^{20} points, where we have 8 threads
    // If we thread each individual multi-exp, the degree of each thread will be (n / 8)
    // => runtime is O(n/8 / log(n / 8))
    // => total runtime is O(8* 2^17 / 17) = O(2^20 / 17)
    // If we assign 2 threads to each multi-exp,
    // the runtime of each thread is O(n/2 / log(n / 2))
    // => total runtime is O(2^19 / 19) per thread
    // = O(2^20 / 19)
    // With this particular example we get a ~11% speedup

    // We require that each of the multi-exponentiations contains the same number of points
    // TODO: fiddle with this algorithm to remove that requirement
    size_t num_elements = mul_state[0].num_elements;
    for (size_t i = 1; i < num_exponentiations; ++i)
    {
        if (mul_state[i].num_elements != num_elements)
        {
            printf("batched_scalar_multiplications err: each scalar mul must be same size.\n");
            return;
        }
    }

#ifndef NO_MULTITHREADING
    size_t num_threads = (size_t)omp_get_max_threads();
#else
    size_t num_threads = 1;
#endif

    // Step 1: Figure out the optimal number of mini-exponentiations required to
    // divide up all multi-exponentiations amongst available threads
    size_t split = num_threads / num_exponentiations;
    if (split * num_exponentiations != num_threads)
    {
        ++split;
    }

    // once we've allocated point ranges to threads, there is likely to be a spillover term
    // if the number of points in a multi-exp does not evenly divide the # of points in a thread
    // we need to make sure that we allocate this extra 'remainder' term to a thread
    // (when we recurse we want a constant # of exponentiations)
    size_t single_range = num_elements / split;
    if (single_range == 0)
    {
        single_range = 1;
    }
    size_t single_remainder = (num_elements > (single_range * split)) ? num_elements - (single_range * split) : 0;

    multiplication_state threaded_inputs[split * num_exponentiations];

    // Compute the multi-exponentiation parameters for each thread
    for (size_t i = 0; i < num_exponentiations; ++i)
    {
        size_t range_index = 0;
        for (size_t j = 0; j < split; ++j)
        {
            // we want the first threads to each map to a different multi-exponentiation, to deal with the 'remainder' term
            threaded_inputs[j * num_exponentiations + i].scalars = &mul_state[i].scalars[range_index];
            // each 'point' in the point table is actually 2 points (it's endomorphism counterpart), so double range_index
            threaded_inputs[j * num_exponentiations + i].points = &mul_state[i].points[range_index * 2];
            size_t remainder_term = (j == 0) ? single_remainder : 0;
            range_index += single_range + remainder_term;
            threaded_inputs[j * num_exponentiations + i].num_elements = single_range + remainder_term;
        }
    }

// Call pippenger algorithm for each thread
#ifndef NO_MULTITHREADING
#pragma omp parallel for
#endif
    for (size_t i = 0; i < num_threads; ++i)
    {
        threaded_inputs[i].output = pippenger(threaded_inputs[i].scalars, threaded_inputs[i].points, threaded_inputs[i].num_elements);
    }

    // If number of threads does not evenly divide number of exponentiations, we're going to have some spillover terms.
    // (or, the number of multi-exponentiations was larger than the number of threads)
    // Call this method recursively until we've completed all multi-exponentiations
    size_t threshold = split * num_exponentiations;
    if (num_threads < threshold)
    {
        batched_scalar_multiplications(&threaded_inputs[num_threads], threshold - num_threads);
    }

    // great! by this point, all of our group elements should be in threaded_output.
    // all that's left is to concatenate them into the result
    g1::element outputs[num_exponentiations];
    for (size_t i = 0; i < num_exponentiations; ++i)
    {
        g1::copy(&threaded_inputs[i].output, &outputs[i]);
    }
    for (size_t i = 0; i < num_exponentiations; ++i)
    {
        for (size_t j = 1; j < split; ++j)
        {
            g1::add(outputs[i], threaded_inputs[j * num_exponentiations + i].output, outputs[i]);
        }
    }

    // TODO: change batch_normalize interface, so that we don't have to copy points into this `outputs` temp
    // TODO: multi-thread the inversion part?
    g1::batch_normalize(outputs, num_exponentiations); // hmm...
    for (size_t i = 0; i < num_exponentiations; ++i)
    {
        g1::copy(&outputs[i], &mul_state[i].output);
    }
}
} // namespace scalar_multiplication
} // namespace barretenberg