#include <gtest/gtest.h>

#include <gmp.h>
#include <libff/algebra/curves/alt_bn128/alt_bn128_g1.hpp>
#include <libff/algebra/curves/alt_bn128/alt_bn128_init.hpp>

#include <barretenberg/fq2.hpp>

// namespace
// {
// void to_bigint(uint64_t *a, libff::bigint<4>& a_bigint)
// {
//     a_bigint.data[0] = a[0];
//     a_bigint.data[1] = a[1];
//     a_bigint.data[2] = a[2];
//     a_bigint.data[3] = a[3];
// }
// // uint64_t rdtsc(){
// //     unsigned int lo,hi;
// //     __asm__ __volatile__ ("rdtsc" : "=a" (lo), "=d" (hi));
// //     return ((uint64_t)hi << 32) | lo;
// // }
// }
namespace
{
    libff::alt_bn128_Fq2 to_libff_fq2(fq2::fq2_t a)
    {
        libff::alt_bn128_Fq2 target;
        target.c0.mont_repr.data[0] = a.c0.data[0];
        target.c0.mont_repr.data[1] = a.c0.data[1];
        target.c0.mont_repr.data[2] = a.c0.data[2];
        target.c0.mont_repr.data[3] = a.c0.data[3];
        target.c1.mont_repr.data[0] = a.c1.data[0];
        target.c1.mont_repr.data[1] = a.c1.data[1];
        target.c1.mont_repr.data[2] = a.c1.data[2];
        target.c1.mont_repr.data[3] = a.c1.data[3];
        return target;
    }
}

TEST(fq2, mul)
{
    libff::init_alt_bn128_params();
    constexpr size_t N = 10;
    for (size_t i = 0; i < N; ++i)
    {
        uint64_t inputs[16] = {0};
        int got_entropy = getentropy((void *)&inputs[0], 128);
        EXPECT_EQ(got_entropy, 0);
        fq2::fq2_t a = *(fq2::fq2_t*)(&inputs[0]);
        fq2::fq2_t b = *(fq2::fq2_t*)(&inputs[8]);

        // fq2::fq2_t result;
        // fq2::zero(result);
        
        fq::to_montgomery_form(a.c0, a.c0);
        fq::to_montgomery_form(a.c1, a.c1);
        fq::to_montgomery_form(b.c0, b.c0);
        fq::to_montgomery_form(b.c1, b.c1);

        libff::alt_bn128_Fq2 a_fq2 = to_libff_fq2(a);
        libff::alt_bn128_Fq2 b_fq2 = to_libff_fq2(b);

        fq2::mul(a, b, a);
        libff::alt_bn128_Fq2 c_fq2 = a_fq2 * b_fq2;
        for (size_t j = 0; j < 4; ++j)
        {
            EXPECT_EQ(a.c0.data[j], c_fq2.c0.mont_repr.data[j]);
            EXPECT_EQ(a.c1.data[j], c_fq2.c1.mont_repr.data[j]);
        }
    }
}

TEST(fq2, sqr)
{
    constexpr size_t N = 10;
    for (size_t i = 0; i < N; ++i)
    {
        uint64_t inputs[8] = {0};
        int got_entropy = getentropy((void *)&inputs[0], 64);
        EXPECT_EQ(got_entropy, 0);
        fq2::fq2_t a = *(fq2::fq2_t*)(&inputs[0]);

        fq::to_montgomery_form(a.c0, a.c0);
        fq::to_montgomery_form(a.c1, a.c1);

        // fq2::fq2_t result;
        // fq2::fq2_t expected;
        // // fq2::zero(result);
        // fq2::zero(expected);

        libff::alt_bn128_Fq2 a_fq2 = to_libff_fq2(a);
        libff::alt_bn128_Fq2 expected = a_fq2.squared();
        // fq2::mul(a, a, expected);
        fq2::fq2_t result;
        fq2::sqr(a, result);

        for (size_t j = 0; j < 4; ++j)
        {            
            EXPECT_EQ(result.c0.data[j], expected.c0.mont_repr.data[j]);
            EXPECT_EQ(result.c1.data[j], expected.c1.mont_repr.data[j]);
        }
    }
}


TEST(fq2, add)
{
    uint64_t inputs[16] = {0};
    int got_entropy = getentropy((void *)&inputs[0], 128);
    EXPECT_EQ(got_entropy, 0);

    fq2::fq2_t a = *(fq2::fq2_t*)(&inputs[0]);
    fq2::fq2_t b = *(fq2::fq2_t*)(&inputs[8]);

    fq::to_montgomery_form(a.c0, a.c0);
    fq::to_montgomery_form(a.c1, a.c1);
    fq::to_montgomery_form(b.c0, b.c0);
    fq::to_montgomery_form(b.c1, b.c1);


    libff::alt_bn128_Fq2 a_fq2 = to_libff_fq2(a);
    libff::alt_bn128_Fq2 b_fq2 = to_libff_fq2(b);

    // fq2::fq2_t result;
    // fq2::zero(result);

    fq2::add(a, b, a);
    a_fq2 = a_fq2 + b_fq2;
    for (size_t j = 0; j < 4; ++j)
    {
        EXPECT_EQ(a.c0.data[j], a_fq2.c0.mont_repr.data[j]);
        EXPECT_EQ(a.c1.data[j], a_fq2.c1.mont_repr.data[j]);
    }
}

TEST(fq2, sub)
{
    uint64_t inputs[16] = {0};
    int got_entropy = getentropy((void *)&inputs[0], 128);
    EXPECT_EQ(got_entropy, 0);

    fq2::fq2_t a = *(fq2::fq2_t*)(&inputs[0]);
    fq2::fq2_t b = *(fq2::fq2_t*)(&inputs[8]);

    fq::to_montgomery_form(a.c0, a.c0);
    fq::to_montgomery_form(a.c1, a.c1);
    fq::to_montgomery_form(b.c0, b.c0);
    fq::to_montgomery_form(b.c1, b.c1);


    libff::alt_bn128_Fq2 a_fq2 = to_libff_fq2(a);
    libff::alt_bn128_Fq2 b_fq2 = to_libff_fq2(b);

    // fq2::fq2_t result;
    // fq2::zero(result);

    fq2::sub(a, b, a);
    a_fq2 = a_fq2 - b_fq2;
    for (size_t j = 0; j < 4; ++j)
    {
        EXPECT_EQ(a.c0.data[j], a_fq2.c0.mont_repr.data[j]);
        EXPECT_EQ(a.c1.data[j], a_fq2.c1.mont_repr.data[j]);
    }
}

TEST(fq2, invert_libff_compare)
{
    fq2::fq2_t input;
    fq2::fq2_t result;
    fq::random_element(input.c0);
    fq::random_element(input.c1);
    libff::alt_bn128_Fq2 libff_scalar = to_libff_fq2(input);
    libff::alt_bn128_Fq2 expected = libff_scalar.inverse();

    fq2::invert(input, result);
    for (size_t j = 0; j < 4; ++j)
    {
        EXPECT_EQ(result.c0.data[j], expected.c0.mont_repr.data[j]);
        EXPECT_EQ(result.c1.data[j], expected.c1.mont_repr.data[j]);
    }
}

TEST(fq2, invert)
{
    fq2::fq2_t input;
    fq2::fq2_t inverse;
    fq2::fq2_t result;
    fq::random_element(input.c0);
    fq::random_element(input.c1);
    fq2::invert(input, inverse);
    fq2::mul(input, inverse, result);
    fq2::fq2_t expected;
    fq2::one(expected);
    for (size_t j = 0; j < 4; ++j)
    {
        EXPECT_EQ(result.c0.data[j], expected.c0.data[j]);
        EXPECT_EQ(result.c1.data[j], expected.c1.data[j]);
    }
}
