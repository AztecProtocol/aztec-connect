#pragma once

#include <stdint.h>
#include <stddef.h>

namespace wnaf
{
constexpr size_t SCALAR_BITS = 127;


#define WNAF_SIZE(x) ((wnaf::SCALAR_BITS + x - 1) / (x))

inline uint32_t get_wnaf_bits(uint64_t* scalar, size_t bits, size_t bit_position)
{
    size_t lo_word_index = bit_position / 64;
    // size_t hi_word_index = (bit_position + bits - 1) / 64;
    // if (lo_word_index == hi_word_index)
    // {
    //     uint64_t sliced = (scalar[lo_word_index] >> (bit_position & 63)) & ((((uint64_t)1) << bits) - 1);
    //     return sliced;
    // }
    return (uint32_t)((scalar[lo_word_index] >> (bit_position & 63)) | (scalar[lo_word_index + 1] << (64 - (bit_position & 63)))) & ((((uint64_t)1) << bits) - 1);
}


inline void fixed_wnaf(uint64_t* scalar, uint32_t* wnaf, bool& skew_map, size_t num_points, size_t wnaf_bits)
{
    size_t wnaf_entries = (SCALAR_BITS + wnaf_bits - 1) / wnaf_bits;
    skew_map = ((scalar[0] & 1) == 0);

    if (scalar[0] == 0 && scalar[1] == 0)
    {
        skew_map = false;
        for (size_t i = 0; i < wnaf_entries; ++i)
        {
            wnaf[i * num_points] = 0;
        }
        return;
    }

    uint32_t previous = (get_wnaf_bits(scalar, wnaf_bits, 0) + skew_map);
    for (size_t i = 1; i < wnaf_entries - 1; ++i)
    {
        uint32_t slice = get_wnaf_bits(scalar, wnaf_bits, i * wnaf_bits);
        uint32_t predicate = ((slice & 1) == 0);

        // ok, what's going on here?
        // if the wnaf entry is negative, we want to set the most significant bit to 'true'
        // the actual wnaf value is either... (previous), or ((1 << wnaf_bits) - previous)
        // (then divided by two to get a bucket index)
        wnaf[(wnaf_entries - i) * num_points] = (((previous - (predicate << wnaf_bits)) ^ (0 - predicate)) >> 1) | (predicate << 31);
        previous = slice + predicate;
    }
    size_t final_bits = SCALAR_BITS - (SCALAR_BITS / wnaf_bits) * wnaf_bits;
    uint32_t slice = get_wnaf_bits(scalar, final_bits, (wnaf_entries - 1) * wnaf_bits);
    uint32_t predicate = ((slice & 1) == 0);
    wnaf[num_points] = (((previous - (predicate << wnaf_bits)) ^ (0 - predicate)) >> 1) | (predicate << 31);
    wnaf[0] = ((slice + predicate) >> 1);
}

inline void compute_wnaf_5(uint64_t hi, uint64_t lo, uint8_t *wnaf)
{
    size_t count;
    size_t i = 0;

    count = __builtin_ctzll(lo);
    lo >>= count;
    i += count;
    while (i < 60)
    {
        wnaf[i] = (uint8_t)(lo)&0x1f;
        lo += 16;
        lo &= ~(0x1fULL);
        count = __builtin_ctzll(lo);
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
    else if (lo > 0) {
        size_t lo_bits = 64 - i;
        uint64_t hi_mask = (0x01 << (5 - lo_bits)) - 1;
        uint64_t m = (uint8_t)(
            (hi & hi_mask) << lo_bits | lo
        );
        wnaf[i] = m;
        hi += (16 >> lo_bits);
        hi &= ~hi_mask;
    }

    i = 64;

    while (hi > 0)
    {
        count = __builtin_ctzll(hi);
        hi >>= count;
        i += count;
        wnaf[i] = (uint8_t)(hi)&0x1f;
        hi += 16;
        hi &= ~(0x1fULL);
    }
}
}