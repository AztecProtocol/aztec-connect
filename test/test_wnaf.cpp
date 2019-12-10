#include <barretenberg/fields/fr.hpp>
#include <barretenberg/groups/wnaf.hpp>

#include <gtest/gtest.h>

using namespace barretenberg;

namespace
{

void recover_fixed_wnaf(uint32_t* wnaf, bool skew, uint64_t& hi, uint64_t& lo, size_t wnaf_bits)
{
    size_t wnaf_entries = (127 + wnaf_bits - 1) / wnaf_bits;
    unsigned __int128 scalar = 0; // (unsigned __int128)(skew);
    for (int i = (int)0; i < (int)wnaf_entries; ++i)
    {
        uint32_t entry_formatted = wnaf[(size_t)i];
        bool negative = entry_formatted >> 31;
        uint32_t entry = ((entry_formatted & 0x0fffffffU) << 1) + 1;
        if (negative)
        {
            scalar -= (unsigned __int128)((unsigned __int128)entry) << (unsigned __int128)(wnaf_bits * (wnaf_entries - 1 - (size_t)i)); 
        }
        else
        {
            scalar += (unsigned __int128)((unsigned __int128)entry) << (unsigned __int128)(wnaf_bits * (wnaf_entries - 1 - (size_t)i));
        }
    }
    scalar -= (unsigned __int128)(skew);
    hi = (uint64_t)(unsigned __int128)(scalar >> (unsigned __int128)(64));
    lo = (uint64_t)(unsigned __int128)(scalar & (unsigned __int128)0xffffffffffffffff);
}
}

TEST(wnaf, wnaf_zero)
{
    uint64_t buffer[2]{ 0, 0 };
    uint32_t wnaf[WNAF_SIZE(5)] = { 0 };
    bool skew =  false;
    wnaf::fixed_wnaf(buffer, wnaf, skew, 1, 5);
    uint64_t recovered_hi;
    uint64_t recovered_lo;
    recover_fixed_wnaf(wnaf, skew, recovered_hi, recovered_lo, 5);
    EXPECT_EQ(recovered_lo, 0UL);
    EXPECT_EQ(recovered_hi, 0UL);
    EXPECT_EQ(buffer[0], recovered_lo);
    EXPECT_EQ(buffer[1], recovered_hi);
}


TEST(wnaf, wnaf_fixed)
{
    uint64_t rand_buffer[2]{ 0 };
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

TEST(wnaf, wnaf_fixed_simple_lo)
{
    uint64_t rand_buffer[2]{ 1, 0 };
    uint32_t wnaf[WNAF_SIZE(5)]{ 0 };
    bool skew =  false;
    wnaf::fixed_wnaf(rand_buffer, wnaf, skew, 1, 5);
    uint64_t recovered_hi;
    uint64_t recovered_lo;
    recover_fixed_wnaf(wnaf, skew, recovered_hi, recovered_lo, 5);
    EXPECT_EQ(rand_buffer[0], recovered_lo);
    EXPECT_EQ(rand_buffer[1], recovered_hi);
}

TEST(wnaf_foo, wnaf_fixed_simple_hi)
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

TEST(wnaf, wnaf_fixed_with_endo_split)
{
    uint64_t rand_buffer[4];
    int got_entropy = getentropy((void*)&rand_buffer[0], 32);
    EXPECT_EQ(got_entropy, 0);
    rand_buffer[3] &= 0x0fffffffffffffffUL;


    fr::field_t k{{ 0, 0, 0, 0 }};
    fr::__copy(*(fr::field_t*)&rand_buffer[0], k);
    // fr::__to_montgomery_form(k, k);
    fr::field_t k1{{ 0, 0, 0, 0 }};;
    fr::field_t k2{{ 0, 0, 0, 0 }};;
 

    fr::split_into_endomorphism_scalars(k, k1, k2);
    uint32_t wnaf[WNAF_SIZE(5)] = { 0 };
    uint32_t endo_wnaf[WNAF_SIZE(5)] = { 0 };
    bool skew = false;
    bool endo_skew = false;
    wnaf::fixed_wnaf(&k1.data[0], wnaf, skew, 1, 5);
    wnaf::fixed_wnaf(&k2.data[0], endo_wnaf, endo_skew, 1, 5);

    fr::field_t k1_recovered{{ 0, 0, 0, 0 }};;
    fr::field_t k2_recovered{{ 0, 0, 0, 0 }};;


    recover_fixed_wnaf(wnaf, skew, k1_recovered.data[1], k1_recovered.data[0], 5);
    recover_fixed_wnaf(endo_wnaf, endo_skew, k2_recovered.data[1], k2_recovered.data[0], 5);

    fr::field_t result;
    fr::__mul_beta(k2_recovered, result);
    fr::__sub(k1_recovered, result, result);

    EXPECT_EQ(result.data[0], k.data[0]);
    EXPECT_EQ(result.data[1], k.data[1]);
    EXPECT_EQ(result.data[2], k.data[2]);
    EXPECT_EQ(result.data[3], k.data[3]);
}