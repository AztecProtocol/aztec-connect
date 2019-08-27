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
        fr::field_t inputs[2];
        int got_entropy = getentropy((void *)&inputs[0].data[0], 64);
        EXPECT_EQ(got_entropy, 0);
        inputs[0].data[3] &= 0x7fffffffffffffff;
        inputs[1].data[3] &= 0x7fffffffffffffff;

        fr::field_t result;

        libff::alt_bn128_Fr a_fr;
        a_fr.mont_repr.data[0] = inputs[0].data[0];
        a_fr.mont_repr.data[1] = inputs[0].data[1];
        a_fr.mont_repr.data[2] = inputs[0].data[2];
        a_fr.mont_repr.data[3] = inputs[0].data[3];

        libff::bigint<4> b_bigint;
        b_bigint.data[0] = inputs[1].data[0];
        b_bigint.data[1] = inputs[1].data[1];
        b_bigint.data[2] = inputs[1].data[2];
        b_bigint.data[3] = inputs[1].data[3];

        fr::mul(inputs[0], inputs[1], result);
        a_fr.mul_reduce(b_bigint);

        for (size_t j = 0; j < 4; ++j)
        {
            EXPECT_EQ(result.data[j], a_fr.mont_repr.data[j]);
        }
    }
}

TEST(fr, sqr)
{
    constexpr size_t N = 1;
    for (size_t i = 0; i < N; ++i)
    {
        fr::field_t a;
        int got_entropy = getentropy((void *)&a.data[0], 32);
        EXPECT_EQ(got_entropy, 0);
        a.data[3] &= 0x7fffffffffffffff;

        fr::field_t result;
        fr::field_t expected;

        fr::mul(a, a, expected);
        fr::sqr(a, result);

        for (size_t j = 0; j < 4; ++j)
        {            
            EXPECT_EQ(result.data[j], expected.data[j]);
        }
    }
}

TEST(fr, add)
{
    fr::field_t inputs[2];
    int got_entropy = getentropy((void *)&inputs[0].data[0], 64);
    EXPECT_EQ(got_entropy, 0);
    inputs[0].data[3] &= 0x7fffffffffffffff;
    inputs[1].data[3] &= 0x7fffffffffffffff;
    
    libff::alt_bn128_Fr a_fr;
    libff::alt_bn128_Fr b_fr;
    to_bigint(&inputs[0].data[0], a_fr.mont_repr);
    to_bigint(&inputs[1].data[0], b_fr.mont_repr);

    fr::field_t result;

    fr::add(inputs[0], inputs[1], result);
    a_fr = a_fr + b_fr;
    for (size_t j = 0; j < 4; ++j)
    {
        EXPECT_EQ(result.data[j], a_fr.mont_repr.data[j]);
    }
}

TEST(fr, sub)
{
    fr::field_t inputs[2];
    inputs[0] = { .data = { 0, 0, 0, 0 }};
    inputs[1] = { .data = { 0, 0, 0, 0 }};
    int got_entropy = getentropy((void *)&inputs[0].data[0], 64);
    EXPECT_EQ(got_entropy, 0);
    inputs[0].data[3] &= 0x0ffffffffffffff;
    inputs[1].data[3] &= 0x0ffffffffffffff;
    
    libff::alt_bn128_Fr a_fr;
    libff::alt_bn128_Fr b_fr;
    to_bigint(&inputs[0].data[0], a_fr.mont_repr);
    to_bigint(&inputs[1].data[0], b_fr.mont_repr);

    fr::field_t result;
    fr::print(inputs[0]);
    fr::print(inputs[1]);

    fr::sub(inputs[0], inputs[1], result);

    a_fr = a_fr - b_fr;
    for (size_t j = 0; j < 4; ++j)
    {
        EXPECT_EQ(result.data[j], a_fr.mont_repr.data[j]);
    }
}

TEST(fr, to_montgomery_form)
{
    fr::field_t input;
    int got_entropy = getentropy((void *)&input.data[0], 32);
    EXPECT_EQ(got_entropy, 0);
    input.data[3] &= 0x7fffffffffffffff;
    while(gt(input, fr::modulus_plus_one))
    {
        fr::sub(input, fr::modulus, input);
    }

    libff::bigint<4> input_bigint;
    to_bigint(&input.data[0], input_bigint);
    libff::alt_bn128_Fr expected = libff::alt_bn128_Fr(input_bigint);
    
    fr::field_t result;

    fr::to_montgomery_form(input, result);

    for (size_t j = 0; j < 4; ++j)
    {
        EXPECT_EQ(result.data[j], expected.mont_repr.data[j]);
    }
}

TEST(fr, from_montgomery_form)
{
    fr::field_t input;
    int got_entropy = getentropy((void *)&input.data[0], 32);
    EXPECT_EQ(got_entropy, 0);
    input.data[3] &= 0x7fffffffffffffff;
    while(gt(input, fr::modulus_plus_one))
    {
        fr::sub(input, fr::modulus, input);
    }

    libff::bigint<4> input_bigint;
    to_bigint(&input.data[0], input_bigint);
    libff::alt_bn128_Fr libff_fr = libff::alt_bn128_Fr(input_bigint);
    libff::bigint<4> expected_bigint = libff_fr.as_bigint();

    fr::field_t result;
    fr::to_montgomery_form(input, result);
    fr::from_montgomery_form(result, result);
    for (size_t j = 0; j < 4; ++j)
    {
        EXPECT_EQ(result.data[j], expected_bigint.data[j]);
    }
}


TEST(fr, montgomery_round_trip)
{
    fr::field_t input = { .data = { 0, 0, 0, 0 }};
    int got_entropy = getentropy((void *)&input.data[0], 32);
    EXPECT_EQ(got_entropy, 0);
    input.data[3] &= 0x7fffffffffffffff;

    while(gt(input, fr::modulus_plus_one))
    {
        fr::sub(input, fr::modulus, input);
    }
    // fr::field_t a = { .data = { 0, 0, 0, 0 }};

    fr::field_t a = { .data = { input.data[0], input.data[1], input.data[2], input.data[3] }};
    fr::to_montgomery_form(a, a);
    fr::from_montgomery_form(a, a);

    for (size_t j = 0; j < 4; ++j)
    {
        EXPECT_EQ(a.data[j], input.data[j]);
    }
}

TEST(fr, split_into_endomorphism_scalars)
{
    fr::field_t input = { .data = { 0, 0, 0, 0 }};
    int got_entropy = getentropy((void *)&input.data[0], 32);
    EXPECT_EQ(got_entropy, 0);
    input.data[3] &= 0x7fffffffffffffff;

    while(gt(input, fr::modulus_plus_one))
    {
        fr::sub(input, fr::modulus, input);
    }
    fr::field_t k = { .data = { input.data[0], input.data[1], input.data[2], input.data[3] }};
    fr::field_t k1 = { .data = { 0, 0, 0, 0 }};
    fr::field_t k2 = { .data = { 0, 0, 0, 0 }};
    // fr::copy(input, k);

    // fr::random_element(k);
    fr::split_into_endomorphism_scalars(k, k1, k2);

    fr::field_t result = { .data = { 0, 0, 0, 0 }};
    // uint64_t t[4] = { 0 };
    // fr::to_montgomery_form(k, k);
    fr::to_montgomery_form(k1, k1);
    fr::to_montgomery_form(k2, k2);

    fr::mul(k2, fr::lambda, result);
    fr::sub(k1, result, result);

    // fr::normalize(result, result);
    // fr::from_montgomery_form(result, result);
    fr::from_montgomery_form(result, result);
    for (size_t i = 0; i < 4; ++i)
    {
        EXPECT_EQ(result.data[i], k.data[i]);
    }
}

TEST(fr, split_into_endomorphism_scalars_simple)
{

    fr::field_t input = { .data = { 1, 0, 0, 0 }};
    fr::field_t k = { .data = { 0, 0, 0, 0 }};
    fr::field_t k1 = { .data = { 0, 0, 0, 0 }};
    fr::field_t k2 = { .data = { 0, 0, 0, 0 }};
    fr::copy(input, k);

    // fr::random_element(k);
    fr::split_into_endomorphism_scalars(k, k1, k2);

    fr::field_t result = { .data = { 0, 0, 0, 0 }};
    // uint64_t t[4] = { 0 };
    // fr::to_montgomery_form(k, k);
    fr::to_montgomery_form(k1, k1);
    fr::to_montgomery_form(k2, k2);

    fr::mul(k2, fr::lambda, result);
    fr::sub(k1, result, result);

    // fr::normalize(result, result);
    // fr::from_montgomery_form(result, result);
    fr::from_montgomery_form(result, result);
    for (size_t i = 0; i < 4; ++i)
    {
        EXPECT_EQ(result.data[i], k.data[i]);
    }
}
