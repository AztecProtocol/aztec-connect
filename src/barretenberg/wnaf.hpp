#pragma once

#include <gmp.h>

#include <stdint.h>
#include <stddef.h>
#include <math.h>


namespace wnaf
{
constexpr size_t SCALAR_BITS = 127;


#define WNAF_SIZE(x) ((wnaf::SCALAR_BITS + x - 1) / (x))

inline uint64_t get_wnaf_bits(uint64_t* scalar, size_t bits, size_t bit_position)
{
    size_t lo_word_index = bit_position / 64;
    // size_t hi_word_index = (bit_position + bits - 1) / 64;
    // if (lo_word_index == hi_word_index)
    // {
    //     uint64_t sliced = (scalar[lo_word_index] >> (bit_position & 63)) & ((((uint64_t)1) << bits) - 1);
    //     return sliced;
    // }
    return ((scalar[lo_word_index] >> (bit_position & 63)) | (scalar[lo_word_index + 1] << (64 - (bit_position & 63)))) & ((((uint64_t)1) << bits) - 1);
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
    wnaf[(wnaf_entries - 1) * num_points] = (get_wnaf_bits(scalar, wnaf_bits, 0) + skew_map);

    for (size_t i = 1; i < wnaf_entries - 1; ++i)
    {
        uint64_t slice = get_wnaf_bits(scalar, wnaf_bits, i * wnaf_bits);
        uint64_t predicate = ((slice & 1) == 0);
        wnaf[(wnaf_entries - i) * num_points] -= (predicate << wnaf_bits);
        wnaf[(wnaf_entries - 1 - i) * num_points] = (uint32_t)(slice + predicate);
        // if ((slice & 1) == 0)
        // {
        //     wnaf[(wnaf_entries - i) * num_points] -= (1 << wnaf_bits);
        //     wnaf[(wnaf_entries - 1 - i) * num_points] = (uint32_t)(slice + 1);
        // }
        // else
        // {
        //     wnaf[(wnaf_entries - 1 - i) * num_points] = (uint32_t)(slice);
        // }
    }
    size_t final_bits = SCALAR_BITS - (SCALAR_BITS / wnaf_bits) * wnaf_bits;
    uint64_t slice = get_wnaf_bits(scalar, final_bits, (wnaf_entries - 1) * wnaf_bits);
    if ((slice & 1) == 0)
    {
        wnaf[num_points] -= (1 << wnaf_bits);
        wnaf[0] = (uint32_t)(slice + 1);
    }
    else
    {
        wnaf[0] = (uint32_t)(slice);
    }
}

inline void fixed_wnaf_26(uint64_t* scalar, uint32_t* wnaf, bool& skew_map, size_t num_points)
{
    uint64_t lo = scalar[0];
    uint64_t hi = scalar[1];
    bool is_even = (lo & 1) == 0;
    if ((lo == 0) && (hi == 0))
    {
        wnaf[4 * num_points] = 0;
        wnaf[3 * num_points] = 0;
        wnaf[2 * num_points] = 0;
        wnaf[1 * num_points] = 0;
        wnaf[0] = 0;
        skew_map = false;
        return;
    }
    wnaf[4 * num_points] = (lo & 0x03FFFFFF) + (is_even);
    skew_map = is_even;
    lo >>= 26;
    uint64_t slice = (lo & 0x03FFFFFF);
    if ((slice & 1) == 0)
    {
        wnaf[4 * num_points] -= (1 << 26);
        wnaf[3 * num_points] = (uint32_t)(slice + 1);
    }
    else
    {
        wnaf[3 * num_points] = (uint32_t)slice;
    }

    lo >>= 26;
    slice = (lo & 0x03FFFFFF);
    slice += ((hi & ((1 << 14) - 1)) << 12);
    if ((slice & 1) == 0)
    {
        wnaf[3 * num_points] -= (1 << 26);
        wnaf[2 * num_points] = (uint32_t)(slice + 1);
    }
    else
    {
        wnaf[2 * num_points] = (uint32_t)slice;
    }
    hi >>= 14;

    slice = (hi & 0x03FFFFFF);
    if ((slice & 1) == 0)
    {
        wnaf[2 * num_points] -= (1 << 26);
        wnaf[1 * num_points] = (uint32_t)(slice + 1);
    }
    else
    {
        wnaf[1 * num_points] = (uint32_t)slice;
    }

    hi >>= 26;
    slice = (hi & 0x03FFFFFF);
    if ((slice & 1) == 0)
    {
        wnaf[1 * num_points] -= (1 << 26);
        wnaf[0] = (uint32_t)(slice + 1);
    }
    else
    {
        wnaf[0] = (uint32_t)slice;
    }
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