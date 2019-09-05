#include <barretenberg/fields/fr.hpp>

#include <gtest/gtest.h>
#include "stdint.h"
#include "stdio.h"

#include <barretenberg/groups/wnaf.hpp>

namespace
{

void recover_fixed_wnaf(uint32_t* wnaf, bool skew, uint64_t& hi, uint64_t& lo, size_t wnaf_bits)
{
    size_t wnaf_entries = (127 + wnaf_bits - 1) / wnaf_bits;
    unsigned __int128 scalar = 0; // (unsigned __int128)(skew);
    for (int i = wnaf_entries - 1; i >= 0; --i)
    {
        uint32_t entry_formatted = wnaf[(size_t)i];
        bool negative = entry_formatted >> 31;
        uint32_t entry = ((entry_formatted & 0x0fffffffU) << 1) + 1;
        if (negative)
        {
            scalar -= (unsigned __int128)((unsigned __int128)entry) << (unsigned __int128)(wnaf_bits * (wnaf_entries - 1 - i)); 
        }
        else
        {
            scalar += (unsigned __int128)((unsigned __int128)entry) << (unsigned __int128)(wnaf_bits * (wnaf_entries - 1 - i));
        }
    }
    scalar -= (unsigned __int128)(skew);
    hi = (uint64_t)(unsigned __int128)(scalar >> (unsigned __int128)(64));
    lo = (uint64_t)(unsigned __int128)(scalar & (unsigned __int128)0xffffffffffffffff);
}

void naive_wnaf(uint64_t hi, uint64_t lo, uint8_t* wnaf)
{
    unsigned __int128 scalar = 0;
    scalar += lo;
    scalar += ((unsigned __int128)(hi) << 64);

    size_t i = 0;
    while (scalar > 0)
    {
        if ((scalar & (unsigned __int128)0x01) == 1)
        {
            unsigned __int128 m = scalar & 0x1f;
            wnaf[i] = (uint8_t)m;
            scalar -= m;
            if (m > 16)
            {
                scalar += 32;
            }
        }
        scalar >>= 1;
        i += 1;
    }
}
}

TEST(barretenberg, wnaf_5)
{
    uint64_t rand_buffer[2] = { 0 };
    int got_entropy = getentropy((void*)&rand_buffer[0], 16);
    EXPECT_EQ(got_entropy, 0);
    uint64_t hi = rand_buffer[0];
    uint64_t lo = rand_buffer[1];
    hi &= 0x7fffffffffffffffUL;
    uint8_t wnaf[128] = { 0 };
    uint8_t expected[128] = { 0 };
    wnaf::compute_wnaf_5(hi, lo, &wnaf[0]);
    naive_wnaf(hi, lo, &expected[0]);

    for (size_t i = 0; i < 128; ++i)
    {
        EXPECT_EQ(wnaf[i], expected[i]);
    }
}

TEST(barretenberg, wnaf_fixed)
{
    uint64_t rand_buffer[2] = { 0 };
    int got_entropy = getentropy((void*)&rand_buffer[0], 16);
    EXPECT_EQ(got_entropy, 0);
    rand_buffer[1] &= 0x7fffffffffffffffUL;
    uint32_t wnaf[WNAF_SIZE(5)] = { 0 };
    bool skew =  false;
    wnaf::fixed_wnaf(rand_buffer, wnaf, skew, 1, 5);
    uint64_t recovered_hi;
    uint64_t recovered_lo;
    recover_fixed_wnaf(wnaf, skew, recovered_hi, recovered_lo, 5);
    EXPECT_EQ(rand_buffer[0], recovered_lo);
    EXPECT_EQ(rand_buffer[1], recovered_hi);
}

TEST(barretenberg, wnaf_fixed_simple_lo)
{
    uint64_t rand_buffer[2] = { 1, 0 };
    uint32_t wnaf[WNAF_SIZE(5)] = { 0 };
    bool skew =  false;
    wnaf::fixed_wnaf(rand_buffer, wnaf, skew, 1, 5);
    uint64_t recovered_hi;
    uint64_t recovered_lo;
    recover_fixed_wnaf(wnaf, skew, recovered_hi, recovered_lo, 5);
    EXPECT_EQ(rand_buffer[0], recovered_lo);
    EXPECT_EQ(rand_buffer[1], recovered_hi);
}

TEST(barretenberg, wnaf_fixed_simple_hi)
{
    uint64_t rand_buffer[2] = { 0, 1 };
    uint32_t wnaf[WNAF_SIZE(5)] = { 0 };
    bool skew =  false;
    wnaf::fixed_wnaf(rand_buffer, wnaf, skew, 1, 5);
    uint64_t recovered_hi;
    uint64_t recovered_lo;
    recover_fixed_wnaf(wnaf, skew, recovered_hi, recovered_lo, 5);
    EXPECT_EQ(rand_buffer[0], recovered_lo);
    EXPECT_EQ(rand_buffer[1], recovered_hi);
}

TEST(barretenberg, wnaf_fixed_with_endo_split)
{
    uint64_t rand_buffer[4];
    int got_entropy = getentropy((void*)&rand_buffer[0], 32);
    EXPECT_EQ(got_entropy, 0);
    rand_buffer[3] &= 0x0fffffffffffffffUL;


    fr::field_t k = { .data = { 0, 0, 0, 0 }};
    fr::copy(*(fr::field_t*)&rand_buffer[0], k);
    // fr::to_montgomery_form(k, k);
    fr::field_t k1 = { .data = { 0, 0, 0, 0 }};;
    fr::field_t k2 = { .data = { 0, 0, 0, 0 }};;
 

    fr::split_into_endomorphism_scalars(k, k1, k2);
    uint32_t wnaf[WNAF_SIZE(5)] = { 0 };
    uint32_t endo_wnaf[WNAF_SIZE(5)] = { 0 };
    bool skew = false;
    bool endo_skew = false;
    wnaf::fixed_wnaf(&k1.data[0], wnaf, skew, 1, 5);
    wnaf::fixed_wnaf(&k2.data[0], endo_wnaf, endo_skew, 1, 5);

    fr::field_t k1_recovered = { .data = { 0, 0, 0, 0 }};;
    fr::field_t k2_recovered = { .data = { 0, 0, 0, 0 }};;


    recover_fixed_wnaf(wnaf, skew, k1_recovered.data[1], k1_recovered.data[0], 5);
    recover_fixed_wnaf(endo_wnaf, endo_skew, k2_recovered.data[1], k2_recovered.data[0], 5);

    fr::field_t result;
    fr::mul_lambda(k2_recovered, result);
    fr::sub(k1_recovered, result, result);

    EXPECT_EQ(result.data[0], k.data[0]);
    EXPECT_EQ(result.data[1], k.data[1]);
    EXPECT_EQ(result.data[2], k.data[2]);
    EXPECT_EQ(result.data[3], k.data[3]);
}