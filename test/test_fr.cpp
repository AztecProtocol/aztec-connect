#include <gtest/gtest.h>

#include <gmp.h>
#include <libff/algebra/fields/fp.hpp>
#include <libff/algebra/curves/alt_bn128/alt_bn128_g1.hpp>
#include <libff/algebra/curves/alt_bn128/alt_bn128_init.hpp>

#include <barretenberg/fr.hpp>

namespace
{
void to_bigint(uint64_t *a, libff::bigint<4>& a_bigint)
{
    a_bigint.data[0] = a[0];
    a_bigint.data[1] = a[1];
    a_bigint.data[2] = a[2];
    a_bigint.data[3] = a[3];
}
// uint64_t rdtsc(){
//     unsigned int lo,hi;
//     __asm__ __volatile__ ("rdtsc" : "=a" (lo), "=d" (hi));
//     return ((uint64_t)hi << 32) | lo;
// }
}

TEST(fr, mul)
{
    libff::init_alt_bn128_params();
    constexpr size_t N = 10;
    for (size_t i = 0; i < N; ++i)
    {
        uint64_t inputs[8] = {0};
        int got_entropy = getentropy((void *)&inputs[0], 64);
        EXPECT_EQ(got_entropy, 0);
        uint64_t *a = &inputs[0];
        uint64_t *b = &inputs[4];
        // uint64_t a[4] = { 1, 0, 0, 0 };
        // uint64_t b[4] = { 2, 0, 0, 0 };
        uint64_t result[4] = {0};
        a[3] &= 0x7fffffffffffffff;
        b[3] &= 0x7fffffffffffffff;

        libff::alt_bn128_Fr a_fr;
        a_fr.mont_repr.data[0] = a[0];
        a_fr.mont_repr.data[1] = a[1];
        a_fr.mont_repr.data[2] = a[2];
        a_fr.mont_repr.data[3] = a[3];

        libff::bigint<4> b_bigint;
        b_bigint.data[0] = b[0];
        b_bigint.data[1] = b[1];
        b_bigint.data[2] = b[2];
        b_bigint.data[3] = b[3];

        fr::mul(a, b, result);
        a_fr.mul_reduce(b_bigint);

        for (size_t j = 0; j < 4; ++j)
        {
            EXPECT_EQ(result[j], a_fr.mont_repr.data[j]);
        }
    }
}

TEST(fr, sqr)
{
    constexpr size_t N = 1;
    for (size_t i = 0; i < N; ++i)
    {
        uint64_t inputs[8] = {0};
        int got_entropy = getentropy((void *)&inputs[0], 64);
        EXPECT_EQ(got_entropy, 0);
        uint64_t *a = &inputs[0];
        a[3] &= 0x7fffffffffffffff;
        // uint64_t modulus[4] = {
        //     uint256::modulus[0],
        //     uint256::modulus[1],
        //     uint256::modulus[2],
        //     uint256::modulus[3]
        // };
        // for (size_t j = 0; j < 4; ++j)
        // {
        //     uint256::subtract(a, &modulus[0], a);
        // }


        uint64_t result[4] = { 0, 0, 0, 0  };
        uint64_t expected[4] = { 0, 0, 0, 0 };

        fr::mul(&a[0], &a[0], &expected[0]);
        fr::sqr(&a[0], &result[0]);

        for (size_t j = 0; j < 4; ++j)
        {            
            EXPECT_EQ(result[j], expected[j]);
        }
    }
}

TEST(fr, add)
{
    uint64_t inputs[8] = {0};
    int got_entropy = getentropy((void *)&inputs[0], 64);
    inputs[3] &= 0x7fffffffffffffff;
    inputs[7] &= 0x7fffffffffffffff;
    EXPECT_EQ(got_entropy, 0);
    libff::alt_bn128_Fr a_fr;
    libff::alt_bn128_Fr b_fr;
    to_bigint(&inputs[0], a_fr.mont_repr);
    to_bigint(&inputs[4], b_fr.mont_repr);
    uint64_t* a = &inputs[0];
    uint64_t* b = &inputs[4];
    uint64_t result[4] = {0};

    fr::add(a, b, result);
    a_fr = a_fr + b_fr;
    for (size_t j = 0; j < 4; ++j)
    {
        EXPECT_EQ(result[j], a_fr.mont_repr.data[j]);
    }
}

TEST(fr, sub)
{
    uint64_t inputs[8] = {0};
    int got_entropy = getentropy((void *)&inputs[0], 64);
    inputs[3] &= 0x7fffffffffffffff;
    inputs[7] &= 0x7fffffffffffffff;
    EXPECT_EQ(got_entropy, 0);
    libff::alt_bn128_Fr a_fr;
    libff::alt_bn128_Fr b_fr;
    to_bigint(&inputs[0], a_fr.mont_repr);
    to_bigint(&inputs[4], b_fr.mont_repr);
    uint64_t* a = &inputs[0];
    uint64_t* b = &inputs[4];
    uint64_t result[4] = {0};

    fr::sub(a, b, result);
    a_fr = a_fr - b_fr;
    for (size_t j = 0; j < 4; ++j)
    {
        EXPECT_EQ(result[j], a_fr.mont_repr.data[j]);
    }
}

TEST(fr, to_montgomery_form)
{
    libff::init_alt_bn128_params();
    uint64_t inputs[4] = {0};
    int got_entropy = getentropy((void *)&inputs[0], 32);
    EXPECT_EQ(got_entropy, 0);

    libff::bigint<4> input_bigint;
    to_bigint(&inputs[0], input_bigint);
    libff::alt_bn128_Fr expected = libff::alt_bn128_Fr(input_bigint);
    
    uint64_t result[4] = {0};

    fr::to_montgomery_form(inputs, result);

    for (size_t j = 0; j < 4; ++j)
    {
        EXPECT_EQ(result[j], expected.mont_repr.data[j]);
    }
}

TEST(fr, from_montgomery_form)
{
    libff::init_alt_bn128_params();
    uint64_t inputs[4] = {0};
    int got_entropy = getentropy((void *)&inputs[0], 32);
    EXPECT_EQ(got_entropy, 0);

    libff::bigint<4> input_bigint;
    to_bigint(inputs, input_bigint);
    libff::alt_bn128_Fr libff_fr = libff::alt_bn128_Fr(input_bigint);
    libff::bigint<4> expected_bigint = libff_fr.as_bigint();

    uint64_t result[4] = {0};
    fr::to_montgomery_form(inputs, result);
    fr::from_montgomery_form(result, result);
    for (size_t j = 0; j < 4; ++j)
    {
        EXPECT_EQ(result[j], expected_bigint.data[j]);
    }
}

TEST(fr, montgomery_round_trip_libff)
{
    libff::init_alt_bn128_params();
    uint64_t inputs[4] = {0};
    int got_entropy = getentropy((void *)&inputs[0], 32);
    inputs[3] &= 0x0fffffffffffffff;

    EXPECT_EQ(got_entropy, 0);

    libff::bigint<4> input_bigint;
    to_bigint(inputs, input_bigint);
    libff::alt_bn128_Fr libff_fr = libff::alt_bn128_Fr(input_bigint);
    libff::bigint<4> expected_bigint = libff_fr.as_bigint();

    for (size_t j = 0; j < 4; ++j)
    {
        EXPECT_EQ(expected_bigint.data[j], inputs[j]);
    }
}

TEST(fr, montgomery_round_trip)
{
    libff::init_alt_bn128_params();
    uint64_t inputs[4] = {0};
    int got_entropy = getentropy((void *)&inputs[0], 32);
    EXPECT_EQ(got_entropy, 0);
    inputs[3] &= 0x0fffffffffffffff;

    uint64_t a[4] = { inputs[0], inputs[1], inputs[2], inputs[3] };
    fr::to_montgomery_form(a, a);
    fr::from_montgomery_form(a, a);

    for (size_t j = 0; j < 4; ++j)
    {
        EXPECT_EQ(a[j], inputs[j]);
    }
}

TEST(fr, split_into_endomorphism_scalars)
{
    static uint64_t lambda[4] = {
        0x93e7cede4a0329b3UL,
        0x7d4fdca77a96c167UL,
        0x8be4ba08b19a750aUL,
        0x1cbd5653a5661c25UL
    };

    // static uint64_t normal_lambda[4] = {
    //     0x8b17ea66b99c90dd,
    //     0x5bfc41088d8daaa7,
    //     0xb3c4d79d41a91758,
    //     0x00
    // };

    uint64_t inputs[4] = {0};
    int got_entropy = getentropy((void *)&inputs[0], 32);
    EXPECT_EQ(got_entropy, 0);
    inputs[3] &= 0x0fffffffffffffff;

    uint64_t k[4] = { inputs[0], inputs[1], inputs[2], inputs[3] };
    uint64_t k1[4] = { 0 };
    uint64_t k2[4] = { 0 };
    
    // fr::random_element(k);
    fr::split_into_endomorphism_scalars(k, k1, k2);

    uint64_t result[4] = { 0 };
    // uint64_t t[4] = { 0 };
    // fr::to_montgomery_form(k, k);
    fr::to_montgomery_form(k1, k1);
    fr::to_montgomery_form(k2, k2);

    fr::mul(k2, lambda, result);
    fr::sub(k1, result, result);

    // fr::normalize(result, result);
    // fr::from_montgomery_form(result, result);
    fr::from_montgomery_form(result, result);
    for (size_t i = 0; i < 4; ++i)
    {
        EXPECT_EQ(result[i], k[i]);
    }
}

TEST(fr, split_into_endomorphism_scalars_simple)
{
    static uint64_t lambda[4] = {
        0x93e7cede4a0329b3UL,
        0x7d4fdca77a96c167UL,
        0x8be4ba08b19a750aUL,
        0x1cbd5653a5661c25UL
    };

    uint64_t k[4] = { 1, 0, 0, 0 };
    uint64_t k1[4] = { 0 };
    uint64_t k2[4] = { 0 };
    
    fr::random_element(k);
    fr::split_into_endomorphism_scalars(k, k1, k2);

    uint64_t result[4] = { 0 };
    fr::mul(k2, lambda, result);
    fr::sub(k1, result, result);

    for (size_t i = 0; i < 4; ++i)
    {
        EXPECT_EQ(result[i], k[i]);
    }
}
/*
TEST(uint256, convert_to_fr)
{
    libff::init_alt_bn128_params()./;
    constexpr size_t N = 10;
    for (size_t i = 0; i < N; ++i)
    {
        uint64_t inputs[4] = { 0 };
        int got_entropy = getentropy((void*)&inputs[0], 32);
        EXPECT_EQ(got_entropy, 0);

        libff::bigint<4> input_bigint;
        input_bigint.data[0] = inputs[0];
        input_bigint.data[1] = inputs[1];
        input_bigint.data[2] = inputs[2];
        input_bigint.data[3] = inputs[3];
        libff::alt_bn128_Fr expected = libff::alt_bn128_Fr(input_bigint);

        uint64_t result[4] = { 0 };
        uint256::convert_to_fr(&inputs[0], &result[0]);

        for (size_t j = 0; j < 4; ++j)
        {
            EXPECT_EQ(result[j], expected.mont_repr.data[j]);
        }
    }
}
*/