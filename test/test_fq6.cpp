#include <gtest/gtest.h>

#include <gmp.h>
#include <libff/algebra/curves/alt_bn128/alt_bn128_g1.hpp>
#include <libff/algebra/curves/alt_bn128/alt_bn128_init.hpp>

#include <barretenberg/fq6.hpp>

namespace
{
    libff::alt_bn128_Fq6 to_libff_fq6(fq6::fq6_t a)
    {
        libff::alt_bn128_Fq6 target;
        target.c0.c0.mont_repr.data[0] = a.c0.c0.data[0];
        target.c0.c0.mont_repr.data[1] = a.c0.c0.data[1];
        target.c0.c0.mont_repr.data[2] = a.c0.c0.data[2];
        target.c0.c0.mont_repr.data[3] = a.c0.c0.data[3];

        target.c0.c1.mont_repr.data[0] = a.c0.c1.data[0];
        target.c0.c1.mont_repr.data[1] = a.c0.c1.data[1];
        target.c0.c1.mont_repr.data[2] = a.c0.c1.data[2];
        target.c0.c1.mont_repr.data[3] = a.c0.c1.data[3];

        target.c1.c0.mont_repr.data[0] = a.c1.c0.data[0];
        target.c1.c0.mont_repr.data[1] = a.c1.c0.data[1];
        target.c1.c0.mont_repr.data[2] = a.c1.c0.data[2];
        target.c1.c0.mont_repr.data[3] = a.c1.c0.data[3];

        target.c1.c1.mont_repr.data[0] = a.c1.c1.data[0];
        target.c1.c1.mont_repr.data[1] = a.c1.c1.data[1];
        target.c1.c1.mont_repr.data[2] = a.c1.c1.data[2];
        target.c1.c1.mont_repr.data[3] = a.c1.c1.data[3];

        target.c2.c0.mont_repr.data[0] = a.c2.c0.data[0];
        target.c2.c0.mont_repr.data[1] = a.c2.c0.data[1];
        target.c2.c0.mont_repr.data[2] = a.c2.c0.data[2];
        target.c2.c0.mont_repr.data[3] = a.c2.c0.data[3];

        target.c2.c1.mont_repr.data[0] = a.c2.c1.data[0];
        target.c2.c1.mont_repr.data[1] = a.c2.c1.data[1];
        target.c2.c1.mont_repr.data[2] = a.c2.c1.data[2];
        target.c2.c1.mont_repr.data[3] = a.c2.c1.data[3];
        return target;
    }
}

TEST(fq6, add)
{
    libff::init_alt_bn128_params();
    constexpr size_t N = 1;
    for (size_t i = 0; i < N; ++i)
    {
        uint64_t inputs[48] = {0};
        int got_entropy = getentropy((void *)&inputs[0], 128);
        EXPECT_EQ(got_entropy, 0);
        got_entropy = getentropy((void *)&inputs[16], 128);
        EXPECT_EQ(got_entropy, 0);
        got_entropy = getentropy((void *)&inputs[32], 128);
        EXPECT_EQ(got_entropy, 0);

        fq6::fq6_t a = *(fq6::fq6_t*)(&inputs[0]);
        fq6::fq6_t b = *(fq6::fq6_t*)(&inputs[24]);

        
        fq::to_montgomery_form(a.c0.c0, a.c0.c0);
        fq::to_montgomery_form(a.c0.c1, a.c0.c1);
        fq::to_montgomery_form(a.c1.c0, a.c1.c0);
        fq::to_montgomery_form(a.c1.c1, a.c1.c1);
        fq::to_montgomery_form(a.c2.c0, a.c2.c0);
        fq::to_montgomery_form(a.c2.c1, a.c2.c1);
        fq::to_montgomery_form(b.c0.c0, b.c0.c0);
        fq::to_montgomery_form(b.c0.c1, b.c0.c1);
        fq::to_montgomery_form(b.c1.c0, b.c1.c0);
        fq::to_montgomery_form(b.c1.c1, b.c1.c1);
        fq::to_montgomery_form(b.c2.c0, b.c2.c0);
        fq::to_montgomery_form(b.c2.c1, b.c2.c1);
        libff::alt_bn128_Fq6 a_fq6 = to_libff_fq6(a);
        libff::alt_bn128_Fq6 b_fq6 = to_libff_fq6(b);

        fq6::add(a, b, a);
        libff::alt_bn128_Fq6 c_fq6 = a_fq6 + b_fq6;
        for (size_t j = 0; j < 4; ++j)
        {
            EXPECT_EQ(a.c0.c0.data[j], c_fq6.c0.c0.mont_repr.data[j]);
            EXPECT_EQ(a.c0.c1.data[j], c_fq6.c0.c1.mont_repr.data[j]);
            EXPECT_EQ(a.c1.c0.data[j], c_fq6.c1.c0.mont_repr.data[j]);
            EXPECT_EQ(a.c1.c1.data[j], c_fq6.c1.c1.mont_repr.data[j]);
            EXPECT_EQ(a.c2.c0.data[j], c_fq6.c2.c0.mont_repr.data[j]);
            EXPECT_EQ(a.c2.c1.data[j], c_fq6.c2.c1.mont_repr.data[j]);
        }
    }
}


TEST(fq6, sub)
{
    libff::init_alt_bn128_params();
    constexpr size_t N = 1;
    for (size_t i = 0; i < N; ++i)
    {
        uint64_t inputs[48] = {0};
        int got_entropy = getentropy((void *)&inputs[0], 128);
        EXPECT_EQ(got_entropy, 0);
        got_entropy = getentropy((void *)&inputs[16], 128);
        EXPECT_EQ(got_entropy, 0);
        got_entropy = getentropy((void *)&inputs[32], 128);
        EXPECT_EQ(got_entropy, 0);

        fq6::fq6_t a = *(fq6::fq6_t*)(&inputs[0]);
        fq6::fq6_t b = *(fq6::fq6_t*)(&inputs[24]);

        
        fq::to_montgomery_form(a.c0.c0, a.c0.c0);
        fq::to_montgomery_form(a.c0.c1, a.c0.c1);
        fq::to_montgomery_form(a.c1.c0, a.c1.c0);
        fq::to_montgomery_form(a.c1.c1, a.c1.c1);
        fq::to_montgomery_form(a.c2.c0, a.c2.c0);
        fq::to_montgomery_form(a.c2.c1, a.c2.c1);
        fq::to_montgomery_form(b.c0.c0, b.c0.c0);
        fq::to_montgomery_form(b.c0.c1, b.c0.c1);
        fq::to_montgomery_form(b.c1.c0, b.c1.c0);
        fq::to_montgomery_form(b.c1.c1, b.c1.c1);
        fq::to_montgomery_form(b.c2.c0, b.c2.c0);
        fq::to_montgomery_form(b.c2.c1, b.c2.c1);
        libff::alt_bn128_Fq6 a_fq6 = to_libff_fq6(a);
        libff::alt_bn128_Fq6 b_fq6 = to_libff_fq6(b);

        fq6::sub(a, b, a);
        libff::alt_bn128_Fq6 c_fq6 = a_fq6 - b_fq6;
        for (size_t j = 0; j < 4; ++j)
        {
            EXPECT_EQ(a.c0.c0.data[j], c_fq6.c0.c0.mont_repr.data[j]);
            EXPECT_EQ(a.c0.c1.data[j], c_fq6.c0.c1.mont_repr.data[j]);
            EXPECT_EQ(a.c1.c0.data[j], c_fq6.c1.c0.mont_repr.data[j]);
            EXPECT_EQ(a.c1.c1.data[j], c_fq6.c1.c1.mont_repr.data[j]);
            EXPECT_EQ(a.c2.c0.data[j], c_fq6.c2.c0.mont_repr.data[j]);
            EXPECT_EQ(a.c2.c1.data[j], c_fq6.c2.c1.mont_repr.data[j]);
        }
    }
}


TEST(fq6, mul)
{
    libff::init_alt_bn128_params();
    constexpr size_t N = 1;
    for (size_t i = 0; i < N; ++i)
    {
        uint64_t inputs[48] = {0};
        int got_entropy = getentropy((void *)&inputs[0], 128);
        EXPECT_EQ(got_entropy, 0);
        got_entropy = getentropy((void *)&inputs[16], 128);
        EXPECT_EQ(got_entropy, 0);
        got_entropy = getentropy((void *)&inputs[32], 128);
        EXPECT_EQ(got_entropy, 0);

        fq6::fq6_t a = *(fq6::fq6_t*)(&inputs[0]);
        fq6::fq6_t b = *(fq6::fq6_t*)(&inputs[24]);

        
        fq::to_montgomery_form(a.c0.c0, a.c0.c0);
        fq::to_montgomery_form(a.c0.c1, a.c0.c1);
        fq::to_montgomery_form(a.c1.c0, a.c1.c0);
        fq::to_montgomery_form(a.c1.c1, a.c1.c1);
        fq::to_montgomery_form(a.c2.c0, a.c2.c0);
        fq::to_montgomery_form(a.c2.c1, a.c2.c1);
        fq::to_montgomery_form(b.c0.c0, b.c0.c0);
        fq::to_montgomery_form(b.c0.c1, b.c0.c1);
        fq::to_montgomery_form(b.c1.c0, b.c1.c0);
        fq::to_montgomery_form(b.c1.c1, b.c1.c1);
        fq::to_montgomery_form(b.c2.c0, b.c2.c0);
        fq::to_montgomery_form(b.c2.c1, b.c2.c1);
        libff::alt_bn128_Fq6 a_fq6 = to_libff_fq6(a);
        libff::alt_bn128_Fq6 b_fq6 = to_libff_fq6(b);

        fq6::mul(a, b, a);
        libff::alt_bn128_Fq6 c_fq6 = a_fq6 * b_fq6;
        for (size_t j = 0; j < 4; ++j)
        {
            EXPECT_EQ(a.c0.c0.data[j], c_fq6.c0.c0.mont_repr.data[j]);
            EXPECT_EQ(a.c0.c1.data[j], c_fq6.c0.c1.mont_repr.data[j]);
            EXPECT_EQ(a.c1.c0.data[j], c_fq6.c1.c0.mont_repr.data[j]);
            EXPECT_EQ(a.c1.c1.data[j], c_fq6.c1.c1.mont_repr.data[j]);
            EXPECT_EQ(a.c2.c0.data[j], c_fq6.c2.c0.mont_repr.data[j]);
            EXPECT_EQ(a.c2.c1.data[j], c_fq6.c2.c1.mont_repr.data[j]);
        }
    }
}


TEST(fq6, sqr)
{
    libff::init_alt_bn128_params();
    constexpr size_t N = 1;
    for (size_t i = 0; i < N; ++i)
    {
        uint64_t inputs[48] = {0};
        int got_entropy = getentropy((void *)&inputs[0], 128);
        EXPECT_EQ(got_entropy, 0);
        got_entropy = getentropy((void *)&inputs[16], 128);
        EXPECT_EQ(got_entropy, 0);
        got_entropy = getentropy((void *)&inputs[32], 128);
        EXPECT_EQ(got_entropy, 0);

        fq6::fq6_t a = *(fq6::fq6_t*)(&inputs[0]);

        
        fq::to_montgomery_form(a.c0.c0, a.c0.c0);
        fq::to_montgomery_form(a.c0.c1, a.c0.c1);
        fq::to_montgomery_form(a.c1.c0, a.c1.c0);
        fq::to_montgomery_form(a.c1.c1, a.c1.c1);
        fq::to_montgomery_form(a.c2.c0, a.c2.c0);
        fq::to_montgomery_form(a.c2.c1, a.c2.c1);

        libff::alt_bn128_Fq6 a_fq6 = to_libff_fq6(a);

        fq6::sqr(a, a);
        libff::alt_bn128_Fq6 c_fq6 = a_fq6.squared();
        for (size_t j = 0; j < 4; ++j)
        {
            EXPECT_EQ(a.c0.c0.data[j], c_fq6.c0.c0.mont_repr.data[j]);
            EXPECT_EQ(a.c0.c1.data[j], c_fq6.c0.c1.mont_repr.data[j]);
            EXPECT_EQ(a.c1.c0.data[j], c_fq6.c1.c0.mont_repr.data[j]);
            EXPECT_EQ(a.c1.c1.data[j], c_fq6.c1.c1.mont_repr.data[j]);
            EXPECT_EQ(a.c2.c0.data[j], c_fq6.c2.c0.mont_repr.data[j]);
            EXPECT_EQ(a.c2.c1.data[j], c_fq6.c2.c1.mont_repr.data[j]);
        }
    }
}


TEST(fq6, invert)
{
    fq6::fq6_t input;
    fq6::fq6_t result;
    fq::random_element(input.c0.c0);
    fq::random_element(input.c0.c1);
    fq::random_element(input.c1.c1);
    fq::random_element(input.c1.c1);
    fq::random_element(input.c2.c1);
    fq::random_element(input.c2.c1);

    fq6::invert(input, result);

    libff::alt_bn128_Fq6 libff_scalar = to_libff_fq6(input);
    libff::alt_bn128_Fq6 expected = libff_scalar.inverse();


    for (size_t j = 0; j < 4; ++j)
    {
        EXPECT_EQ(result.c0.c0.data[j], expected.c0.c0.mont_repr.data[j]);
        EXPECT_EQ(result.c0.c1.data[j], expected.c0.c1.mont_repr.data[j]);
        EXPECT_EQ(result.c1.c0.data[j], expected.c1.c0.mont_repr.data[j]);
        EXPECT_EQ(result.c1.c1.data[j], expected.c1.c1.mont_repr.data[j]);
        EXPECT_EQ(result.c2.c0.data[j], expected.c2.c0.mont_repr.data[j]);
        EXPECT_EQ(result.c2.c1.data[j], expected.c2.c1.mont_repr.data[j]);
    }
}
