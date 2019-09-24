#pragma once

#include "stdint.h"
#include "stddef.h"

namespace barretenberg
{
namespace wnaf
{
constexpr size_t SCALAR_BITS = 127;

#define WNAF_SIZE(x) ((wnaf::SCALAR_BITS + x - 1) / (x))

inline uint32_t get_wnaf_bits(uint64_t *scalar, size_t bits, size_t bit_position)
{
    /**
     *  we want to take a 128 bit scalar and shift it down by (bit_position).
     * We then wish to mask out `bits` number of bits.
     * Low limb contains first 64 bits, so we wish to shift this limb by (bit_position mod 64), which is also (bit_position & 63)
     * If we require bits from the high limb, these need to be shifted left, not right.
     * Actual bit position of bit in high limb = `b`. Desired position = 64 - (amount we shifted low limb by) = 64 - (bit_position & 63)
     * 
     * So, step 1:
     * get low limb and shift right by (bit_position & 63)
     * get high limb and shift left by (64 - (bit_position & 63))
     * 
     * If low limb == high limb, we know that the high limb will be shifted left by a bit count that moves it out of the result mask
     */
    size_t lo_idx = bit_position >> 6;
    size_t hi_idx = (bit_position + bits - 1) >> 6;
    uint32_t lo = (uint32_t)(scalar[lo_idx] >> (bit_position & 63UL));
    uint32_t hi = (uint32_t)(scalar[hi_idx] << (64UL - (bit_position & 63UL)));
    return (lo | hi) & ((1U << (uint32_t)bits) - 1U);
}

inline void fixed_wnaf(uint64_t *scalar, uint32_t *wnaf, bool &skew_map, size_t num_points, size_t wnaf_bits)
{
    size_t wnaf_entries = (SCALAR_BITS + wnaf_bits - 1) / wnaf_bits;
    skew_map = ((scalar[0] & 1) == 0);

    uint32_t previous = get_wnaf_bits(scalar, wnaf_bits, 0) + (uint32_t)skew_map;
    for (size_t i = 1; i < wnaf_entries - 1; ++i)
    {
        uint32_t slice = get_wnaf_bits(scalar, wnaf_bits, i * wnaf_bits);
        uint32_t predicate = ((slice & 1) == 0);

        // ok, what's going on here?
        // if the wnaf entry is negative, we want to set the most significant bit to 'true'
        // the actual wnaf value is either... (previous), or ((1 << wnaf_bits) - previous)
        // (then divided by two to get a bucket index)
        wnaf[(wnaf_entries - i) * num_points] = (((previous - (predicate << ((uint32_t)wnaf_bits /*+ 1*/))) ^ (0U - predicate)) >> 1U) | (predicate << 31U);
        previous = slice + predicate;
    }
    size_t final_bits = SCALAR_BITS - (SCALAR_BITS / wnaf_bits) * wnaf_bits;
    uint32_t slice = get_wnaf_bits(scalar, final_bits, (wnaf_entries - 1) * wnaf_bits);
    uint32_t predicate = ((slice & 1) == 0);
    wnaf[num_points] = (((previous - (predicate << ((uint32_t)wnaf_bits /*+ 1*/))) ^ (0U - predicate)) >> 1U) | (predicate << 31);
    wnaf[0] = ((slice + predicate) >> 1);
}

inline void compute_wnaf_5(uint64_t hi, uint64_t lo, uint8_t *wnaf)
{
    size_t count;
    size_t i = 0;

    count = (size_t)__builtin_ctzll(lo);
    lo >>= count;
    i += count;
    while (i < 60)
    {
        wnaf[i] = (uint8_t)(lo)&0x1f;
        lo += 16;
        lo &= ~(0x1fULL);
        count = (size_t)__builtin_ctzll(lo);
        lo >>= count;
        i += count;
    }

    // between 60 <= i <= 64 we need to transition between lo and hi
    // if i == 64, then lo is either 0 or 1 and we can directly add lo to hi (overflow)
    // if (i < 64) and (lo > 0), the next wnaf entry has both a lo and hi component,
    // we also need to add the overflow flag into hi
    if (i == 64)
    {
        hi += lo;
    }
    else if (lo > 0)
    {
        size_t lo_bits = 64UL - i;
        uint64_t hi_mask = (1UL << (5UL - lo_bits)) - 1UL;
        uint8_t m = (uint8_t)((hi & hi_mask) << lo_bits | lo);
        wnaf[i] = m;
        hi += (16UL >> lo_bits);
        hi &= ~hi_mask;
    }

    i = 64;

    while (hi > 0)
    {
        count = (size_t)__builtin_ctzll(hi);
        hi >>= count;
        i += count;
        wnaf[i] = (uint8_t)(hi)&0x1f;
        hi += 16;
        hi &= ~(0x1fULL);
    }
}
} // namespace wnaf
} // namespace barretenberg