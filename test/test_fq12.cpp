#include <gtest/gtest.h>

#include <gmp.h>
#include <libff/algebra/curves/alt_bn128/alt_bn128_g1.hpp>
#include <libff/algebra/curves/alt_bn128/alt_bn128_init.hpp>

#include <barretenberg/fq12.hpp>

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

    libff::alt_bn128_Fq12 to_libff_fq12(fq12::fq12_t a)
    {
        libff::alt_bn128_Fq12 target;
        target.c0.c0.c0.mont_repr.data[0] = a.c0.c0.c0.data[0];
        target.c0.c0.c0.mont_repr.data[1] = a.c0.c0.c0.data[1];
        target.c0.c0.c0.mont_repr.data[2] = a.c0.c0.c0.data[2];
        target.c0.c0.c0.mont_repr.data[3] = a.c0.c0.c0.data[3];

        target.c0.c0.c1.mont_repr.data[0] = a.c0.c0.c1.data[0];
        target.c0.c0.c1.mont_repr.data[1] = a.c0.c0.c1.data[1];
        target.c0.c0.c1.mont_repr.data[2] = a.c0.c0.c1.data[2];
        target.c0.c0.c1.mont_repr.data[3] = a.c0.c0.c1.data[3];

        target.c0.c1.c0.mont_repr.data[0] = a.c0.c1.c0.data[0];
        target.c0.c1.c0.mont_repr.data[1] = a.c0.c1.c0.data[1];
        target.c0.c1.c0.mont_repr.data[2] = a.c0.c1.c0.data[2];
        target.c0.c1.c0.mont_repr.data[3] = a.c0.c1.c0.data[3];

        target.c0.c1.c1.mont_repr.data[0] = a.c0.c1.c1.data[0];
        target.c0.c1.c1.mont_repr.data[1] = a.c0.c1.c1.data[1];
        target.c0.c1.c1.mont_repr.data[2] = a.c0.c1.c1.data[2];
        target.c0.c1.c1.mont_repr.data[3] = a.c0.c1.c1.data[3];

        target.c0.c2.c0.mont_repr.data[0] = a.c0.c2.c0.data[0];
        target.c0.c2.c0.mont_repr.data[1] = a.c0.c2.c0.data[1];
        target.c0.c2.c0.mont_repr.data[2] = a.c0.c2.c0.data[2];
        target.c0.c2.c0.mont_repr.data[3] = a.c0.c2.c0.data[3];

        target.c0.c2.c1.mont_repr.data[0] = a.c0.c2.c1.data[0];
        target.c0.c2.c1.mont_repr.data[1] = a.c0.c2.c1.data[1];
        target.c0.c2.c1.mont_repr.data[2] = a.c0.c2.c1.data[2];
        target.c0.c2.c1.mont_repr.data[3] = a.c0.c2.c1.data[3];

        target.c1.c0.c0.mont_repr.data[0] = a.c1.c0.c0.data[0];
        target.c1.c0.c0.mont_repr.data[1] = a.c1.c0.c0.data[1];
        target.c1.c0.c0.mont_repr.data[2] = a.c1.c0.c0.data[2];
        target.c1.c0.c0.mont_repr.data[3] = a.c1.c0.c0.data[3];

        target.c1.c0.c1.mont_repr.data[0] = a.c1.c0.c1.data[0];
        target.c1.c0.c1.mont_repr.data[1] = a.c1.c0.c1.data[1];
        target.c1.c0.c1.mont_repr.data[2] = a.c1.c0.c1.data[2];
        target.c1.c0.c1.mont_repr.data[3] = a.c1.c0.c1.data[3];

        target.c1.c1.c0.mont_repr.data[0] = a.c1.c1.c0.data[0];
        target.c1.c1.c0.mont_repr.data[1] = a.c1.c1.c0.data[1];
        target.c1.c1.c0.mont_repr.data[2] = a.c1.c1.c0.data[2];
        target.c1.c1.c0.mont_repr.data[3] = a.c1.c1.c0.data[3];

        target.c1.c1.c1.mont_repr.data[0] = a.c1.c1.c1.data[0];
        target.c1.c1.c1.mont_repr.data[1] = a.c1.c1.c1.data[1];
        target.c1.c1.c1.mont_repr.data[2] = a.c1.c1.c1.data[2];
        target.c1.c1.c1.mont_repr.data[3] = a.c1.c1.c1.data[3];

        target.c1.c2.c0.mont_repr.data[0] = a.c1.c2.c0.data[0];
        target.c1.c2.c0.mont_repr.data[1] = a.c1.c2.c0.data[1];
        target.c1.c2.c0.mont_repr.data[2] = a.c1.c2.c0.data[2];
        target.c1.c2.c0.mont_repr.data[3] = a.c1.c2.c0.data[3];

        target.c1.c2.c1.mont_repr.data[0] = a.c1.c2.c1.data[0];
        target.c1.c2.c1.mont_repr.data[1] = a.c1.c2.c1.data[1];
        target.c1.c2.c1.mont_repr.data[2] = a.c1.c2.c1.data[2];
        target.c1.c2.c1.mont_repr.data[3] = a.c1.c2.c1.data[3];
        return target;
    }

    void to_mont(fq12::fq12_t& a)
    {
        fq::to_montgomery_form(a.c0.c0.c0, a.c0.c0.c0);
        fq::to_montgomery_form(a.c0.c0.c1, a.c0.c0.c1);
        fq::to_montgomery_form(a.c0.c1.c0, a.c0.c1.c0);
        fq::to_montgomery_form(a.c0.c1.c1, a.c0.c1.c1);
        fq::to_montgomery_form(a.c0.c2.c0, a.c0.c2.c0);
        fq::to_montgomery_form(a.c0.c2.c1, a.c0.c2.c1);

        fq::to_montgomery_form(a.c1.c0.c0, a.c1.c0.c0);
        fq::to_montgomery_form(a.c1.c0.c1, a.c1.c0.c1);
        fq::to_montgomery_form(a.c1.c1.c0, a.c1.c1.c0);
        fq::to_montgomery_form(a.c1.c1.c1, a.c1.c1.c1);
        fq::to_montgomery_form(a.c1.c2.c0, a.c1.c2.c0);
        fq::to_montgomery_form(a.c1.c2.c1, a.c1.c2.c1);
    }
}

TEST(fq12, add)
{
    libff::init_alt_bn128_params();
    constexpr size_t N = 1;
    for (size_t i = 0; i < N; ++i)
    {
        uint64_t inputs[96] = {0};
        int got_entropy = getentropy((void *)&inputs[0], 256);
        EXPECT_EQ(got_entropy, 0);
        got_entropy = getentropy((void *)&inputs[32], 256);
        EXPECT_EQ(got_entropy, 0);
        got_entropy = getentropy((void *)&inputs[64], 256);
        EXPECT_EQ(got_entropy, 0);

        fq12::fq12_t a = *(fq12::fq12_t*)(&inputs[0]);
        fq12::fq12_t b = *(fq12::fq12_t*)(&inputs[48]);
        to_mont(a);
        to_mont(b);

        libff::alt_bn128_Fq12 a_fq12 = to_libff_fq12(a);
        libff::alt_bn128_Fq12 b_fq12 = to_libff_fq12(b);

        fq12::add(a, b, a);
        libff::alt_bn128_Fq12 c_fq12 = a_fq12 + b_fq12;
        for (size_t j = 0; j < 4; ++j)
        {
            EXPECT_EQ(a.c0.c0.c0.data[j], c_fq12.c0.c0.c0.mont_repr.data[j]);
            EXPECT_EQ(a.c0.c0.c1.data[j], c_fq12.c0.c0.c1.mont_repr.data[j]);
            EXPECT_EQ(a.c0.c1.c0.data[j], c_fq12.c0.c1.c0.mont_repr.data[j]);
            EXPECT_EQ(a.c0.c1.c1.data[j], c_fq12.c0.c1.c1.mont_repr.data[j]);
            EXPECT_EQ(a.c0.c2.c0.data[j], c_fq12.c0.c2.c0.mont_repr.data[j]);
            EXPECT_EQ(a.c0.c2.c1.data[j], c_fq12.c0.c2.c1.mont_repr.data[j]);
            EXPECT_EQ(a.c1.c0.c0.data[j], c_fq12.c1.c0.c0.mont_repr.data[j]);
            EXPECT_EQ(a.c1.c0.c1.data[j], c_fq12.c1.c0.c1.mont_repr.data[j]);
            EXPECT_EQ(a.c1.c1.c0.data[j], c_fq12.c1.c1.c0.mont_repr.data[j]);
            EXPECT_EQ(a.c1.c1.c1.data[j], c_fq12.c1.c1.c1.mont_repr.data[j]);
            EXPECT_EQ(a.c1.c2.c0.data[j], c_fq12.c1.c2.c0.mont_repr.data[j]);
            EXPECT_EQ(a.c1.c2.c1.data[j], c_fq12.c1.c2.c1.mont_repr.data[j]);
        }
    }
}

TEST(fq12, sub)
{
    libff::init_alt_bn128_params();
    constexpr size_t N = 1;
    for (size_t i = 0; i < N; ++i)
    {
        uint64_t inputs[96] = {0};
        int got_entropy = getentropy((void *)&inputs[0], 256);
        EXPECT_EQ(got_entropy, 0);
        got_entropy = getentropy((void *)&inputs[32], 256);
        EXPECT_EQ(got_entropy, 0);
        got_entropy = getentropy((void *)&inputs[64], 256);
        EXPECT_EQ(got_entropy, 0);

        fq12::fq12_t a = *(fq12::fq12_t*)(&inputs[0]);
        fq12::fq12_t b = *(fq12::fq12_t*)(&inputs[48]);
        to_mont(a);
        to_mont(b);

        libff::alt_bn128_Fq12 a_fq12 = to_libff_fq12(a);
        libff::alt_bn128_Fq12 b_fq12 = to_libff_fq12(b);

        fq12::sub(a, b, a);
        libff::alt_bn128_Fq12 c_fq12 = a_fq12 - b_fq12;
        for (size_t j = 0; j < 4; ++j)
        {
            EXPECT_EQ(a.c0.c0.c0.data[j], c_fq12.c0.c0.c0.mont_repr.data[j]);
            EXPECT_EQ(a.c0.c0.c1.data[j], c_fq12.c0.c0.c1.mont_repr.data[j]);
            EXPECT_EQ(a.c0.c1.c0.data[j], c_fq12.c0.c1.c0.mont_repr.data[j]);
            EXPECT_EQ(a.c0.c1.c1.data[j], c_fq12.c0.c1.c1.mont_repr.data[j]);
            EXPECT_EQ(a.c0.c2.c0.data[j], c_fq12.c0.c2.c0.mont_repr.data[j]);
            EXPECT_EQ(a.c0.c2.c1.data[j], c_fq12.c0.c2.c1.mont_repr.data[j]);
            EXPECT_EQ(a.c1.c0.c0.data[j], c_fq12.c1.c0.c0.mont_repr.data[j]);
            EXPECT_EQ(a.c1.c0.c1.data[j], c_fq12.c1.c0.c1.mont_repr.data[j]);
            EXPECT_EQ(a.c1.c1.c0.data[j], c_fq12.c1.c1.c0.mont_repr.data[j]);
            EXPECT_EQ(a.c1.c1.c1.data[j], c_fq12.c1.c1.c1.mont_repr.data[j]);
            EXPECT_EQ(a.c1.c2.c0.data[j], c_fq12.c1.c2.c0.mont_repr.data[j]);
            EXPECT_EQ(a.c1.c2.c1.data[j], c_fq12.c1.c2.c1.mont_repr.data[j]);
        }
    }
}

TEST(fq12, mul)
{
    libff::init_alt_bn128_params();
    constexpr size_t N = 1;
    for (size_t i = 0; i < N; ++i)
    {
        uint64_t inputs[96] = {0};
        int got_entropy = getentropy((void *)&inputs[0], 256);
        EXPECT_EQ(got_entropy, 0);
        got_entropy = getentropy((void *)&inputs[32], 256);
        EXPECT_EQ(got_entropy, 0);
        got_entropy = getentropy((void *)&inputs[64], 256);
        EXPECT_EQ(got_entropy, 0);

        fq12::fq12_t a = *(fq12::fq12_t*)(&inputs[0]);
        fq12::fq12_t b = *(fq12::fq12_t*)(&inputs[48]);
        to_mont(a);
        to_mont(b);

        libff::alt_bn128_Fq12 a_fq12 = to_libff_fq12(a);
        libff::alt_bn128_Fq12 b_fq12 = to_libff_fq12(b);

        fq12::mul(a, b, a);
        libff::alt_bn128_Fq12 c_fq12 = a_fq12 * b_fq12;
        for (size_t j = 0; j < 4; ++j)
        {
            EXPECT_EQ(a.c0.c0.c0.data[j], c_fq12.c0.c0.c0.mont_repr.data[j]);
            EXPECT_EQ(a.c0.c0.c1.data[j], c_fq12.c0.c0.c1.mont_repr.data[j]);
            EXPECT_EQ(a.c0.c1.c0.data[j], c_fq12.c0.c1.c0.mont_repr.data[j]);
            EXPECT_EQ(a.c0.c1.c1.data[j], c_fq12.c0.c1.c1.mont_repr.data[j]);
            EXPECT_EQ(a.c0.c2.c0.data[j], c_fq12.c0.c2.c0.mont_repr.data[j]);
            EXPECT_EQ(a.c0.c2.c1.data[j], c_fq12.c0.c2.c1.mont_repr.data[j]);
            EXPECT_EQ(a.c1.c0.c0.data[j], c_fq12.c1.c0.c0.mont_repr.data[j]);
            EXPECT_EQ(a.c1.c0.c1.data[j], c_fq12.c1.c0.c1.mont_repr.data[j]);
            EXPECT_EQ(a.c1.c1.c0.data[j], c_fq12.c1.c1.c0.mont_repr.data[j]);
            EXPECT_EQ(a.c1.c1.c1.data[j], c_fq12.c1.c1.c1.mont_repr.data[j]);
            EXPECT_EQ(a.c1.c2.c0.data[j], c_fq12.c1.c2.c0.mont_repr.data[j]);
            EXPECT_EQ(a.c1.c2.c1.data[j], c_fq12.c1.c2.c1.mont_repr.data[j]);
        }
    }
}

TEST(fq12, sparse_mul)
{
    libff::init_alt_bn128_params();
    constexpr size_t N = 1;
    for (size_t i = 0; i < N; ++i)
    {
        uint64_t inputs[96] = {0};
        int got_entropy = getentropy((void *)&inputs[0], 256);
        EXPECT_EQ(got_entropy, 0);
        got_entropy = getentropy((void *)&inputs[32], 256);
        EXPECT_EQ(got_entropy, 0);
        got_entropy = getentropy((void *)&inputs[64], 256);
        EXPECT_EQ(got_entropy, 0);

        fq12::fq12_t a = *(fq12::fq12_t*)(&inputs[0]);
        fq12::fq12_t b = *(fq12::fq12_t*)(&inputs[48]);

        to_mont(a);
        to_mont(b);

        pairing::ell_coeffs ell; // = { .o = b.c0.c0, .vv = b.c0.c1, .vw = b.c0.c2 };
        ell.o = b.c0.c0;
        ell.vw = b.c0.c1;
        ell.vv = b.c0.c2;
    
        libff::alt_bn128_Fq12 a_fq12 = to_libff_fq12(a);
        libff::alt_bn128_Fq2 ell_0 = to_libff_fq2(ell.o);
        libff::alt_bn128_Fq2 ell_vv = to_libff_fq2(ell.vw);
        libff::alt_bn128_Fq2 ell_vw = to_libff_fq2(ell.vv);

        fq12::sparse_mul(a, ell, a);
        libff::alt_bn128_Fq12 c_fq12 = a_fq12.mul_by_024(ell_0, ell_vv, ell_vw);

        for (size_t j = 0; j < 4; ++j)
        {
            EXPECT_EQ(a.c0.c0.c0.data[j], c_fq12.c0.c0.c0.mont_repr.data[j]);
            EXPECT_EQ(a.c0.c0.c1.data[j], c_fq12.c0.c0.c1.mont_repr.data[j]);
            EXPECT_EQ(a.c0.c1.c0.data[j], c_fq12.c0.c1.c0.mont_repr.data[j]);
            EXPECT_EQ(a.c0.c1.c1.data[j], c_fq12.c0.c1.c1.mont_repr.data[j]);
            EXPECT_EQ(a.c0.c2.c0.data[j], c_fq12.c0.c2.c0.mont_repr.data[j]);
            EXPECT_EQ(a.c0.c2.c1.data[j], c_fq12.c0.c2.c1.mont_repr.data[j]);
            EXPECT_EQ(a.c1.c0.c0.data[j], c_fq12.c1.c0.c0.mont_repr.data[j]);
            EXPECT_EQ(a.c1.c0.c1.data[j], c_fq12.c1.c0.c1.mont_repr.data[j]);
            EXPECT_EQ(a.c1.c1.c0.data[j], c_fq12.c1.c1.c0.mont_repr.data[j]);
            EXPECT_EQ(a.c1.c1.c1.data[j], c_fq12.c1.c1.c1.mont_repr.data[j]);
            EXPECT_EQ(a.c1.c2.c0.data[j], c_fq12.c1.c2.c0.mont_repr.data[j]);
            EXPECT_EQ(a.c1.c2.c1.data[j], c_fq12.c1.c2.c1.mont_repr.data[j]);
        }
    }
}

TEST(fq12, sqr)
{
    libff::init_alt_bn128_params();
    constexpr size_t N = 1;
    for (size_t i = 0; i < N; ++i)
    {
        uint64_t inputs[64] = {0};
        int got_entropy = getentropy((void *)&inputs[0], 256);
        EXPECT_EQ(got_entropy, 0);
        got_entropy = getentropy((void *)&inputs[32], 256);
        EXPECT_EQ(got_entropy, 0);

        fq12::fq12_t a = *(fq12::fq12_t*)(&inputs[0]);
        to_mont(a);

        libff::alt_bn128_Fq12 a_fq12 = to_libff_fq12(a);

        fq12::sqr(a, a);
        libff::alt_bn128_Fq12 c_fq12 = a_fq12.squared();
        for (size_t j = 0; j < 4; ++j)
        {
            EXPECT_EQ(a.c0.c0.c0.data[j], c_fq12.c0.c0.c0.mont_repr.data[j]);
            EXPECT_EQ(a.c0.c0.c1.data[j], c_fq12.c0.c0.c1.mont_repr.data[j]);
            EXPECT_EQ(a.c0.c1.c0.data[j], c_fq12.c0.c1.c0.mont_repr.data[j]);
            EXPECT_EQ(a.c0.c1.c1.data[j], c_fq12.c0.c1.c1.mont_repr.data[j]);
            EXPECT_EQ(a.c0.c2.c0.data[j], c_fq12.c0.c2.c0.mont_repr.data[j]);
            EXPECT_EQ(a.c0.c2.c1.data[j], c_fq12.c0.c2.c1.mont_repr.data[j]);
            EXPECT_EQ(a.c1.c0.c0.data[j], c_fq12.c1.c0.c0.mont_repr.data[j]);
            EXPECT_EQ(a.c1.c0.c1.data[j], c_fq12.c1.c0.c1.mont_repr.data[j]);
            EXPECT_EQ(a.c1.c1.c0.data[j], c_fq12.c1.c1.c0.mont_repr.data[j]);
            EXPECT_EQ(a.c1.c1.c1.data[j], c_fq12.c1.c1.c1.mont_repr.data[j]);
            EXPECT_EQ(a.c1.c2.c0.data[j], c_fq12.c1.c2.c0.mont_repr.data[j]);
            EXPECT_EQ(a.c1.c2.c1.data[j], c_fq12.c1.c2.c1.mont_repr.data[j]);
        }
    }
}

TEST(fq12, inverse)
{
    libff::init_alt_bn128_params();
    constexpr size_t N = 1;
    for (size_t i = 0; i < N; ++i)
    {
        uint64_t inputs[96] = {0};
        int got_entropy = getentropy((void *)&inputs[0], 256);
        EXPECT_EQ(got_entropy, 0);
        got_entropy = getentropy((void *)&inputs[32], 256);
        EXPECT_EQ(got_entropy, 0);
        got_entropy = getentropy((void *)&inputs[64], 256);
        EXPECT_EQ(got_entropy, 0);

        fq12::fq12_t a = *(fq12::fq12_t*)(&inputs[0]);
        to_mont(a);

        libff::alt_bn128_Fq12 a_fq12 = to_libff_fq12(a);

        fq12::invert(a, a);
        libff::alt_bn128_Fq12 c_fq12 = a_fq12.inverse();
        for (size_t j = 0; j < 4; ++j)
        {
            EXPECT_EQ(a.c0.c0.c0.data[j], c_fq12.c0.c0.c0.mont_repr.data[j]);
            EXPECT_EQ(a.c0.c0.c1.data[j], c_fq12.c0.c0.c1.mont_repr.data[j]);
            EXPECT_EQ(a.c0.c1.c0.data[j], c_fq12.c0.c1.c0.mont_repr.data[j]);
            EXPECT_EQ(a.c0.c1.c1.data[j], c_fq12.c0.c1.c1.mont_repr.data[j]);
            EXPECT_EQ(a.c0.c2.c0.data[j], c_fq12.c0.c2.c0.mont_repr.data[j]);
            EXPECT_EQ(a.c0.c2.c1.data[j], c_fq12.c0.c2.c1.mont_repr.data[j]);
            EXPECT_EQ(a.c1.c0.c0.data[j], c_fq12.c1.c0.c0.mont_repr.data[j]);
            EXPECT_EQ(a.c1.c0.c1.data[j], c_fq12.c1.c0.c1.mont_repr.data[j]);
            EXPECT_EQ(a.c1.c1.c0.data[j], c_fq12.c1.c1.c0.mont_repr.data[j]);
            EXPECT_EQ(a.c1.c1.c1.data[j], c_fq12.c1.c1.c1.mont_repr.data[j]);
            EXPECT_EQ(a.c1.c2.c0.data[j], c_fq12.c1.c2.c0.mont_repr.data[j]);
            EXPECT_EQ(a.c1.c2.c1.data[j], c_fq12.c1.c2.c1.mont_repr.data[j]);
        }
    }
}

TEST(fq12, unitary_inverse)
{
    libff::init_alt_bn128_params();
    constexpr size_t N = 1;
    for (size_t i = 0; i < N; ++i)
    {
        uint64_t inputs[96] = {0};
        int got_entropy = getentropy((void *)&inputs[0], 256);
        EXPECT_EQ(got_entropy, 0);
        got_entropy = getentropy((void *)&inputs[32], 256);
        EXPECT_EQ(got_entropy, 0);
        got_entropy = getentropy((void *)&inputs[64], 256);
        EXPECT_EQ(got_entropy, 0);

        fq12::fq12_t a = *(fq12::fq12_t*)(&inputs[0]);
        to_mont(a);

        libff::alt_bn128_Fq12 a_fq12 = to_libff_fq12(a);

        fq12::unitary_inverse(a, a);
        libff::alt_bn128_Fq12 c_fq12 = a_fq12.unitary_inverse();
        for (size_t j = 0; j < 4; ++j)
        {
            EXPECT_EQ(a.c0.c0.c0.data[j], c_fq12.c0.c0.c0.mont_repr.data[j]);
            EXPECT_EQ(a.c0.c0.c1.data[j], c_fq12.c0.c0.c1.mont_repr.data[j]);
            EXPECT_EQ(a.c0.c1.c0.data[j], c_fq12.c0.c1.c0.mont_repr.data[j]);
            EXPECT_EQ(a.c0.c1.c1.data[j], c_fq12.c0.c1.c1.mont_repr.data[j]);
            EXPECT_EQ(a.c0.c2.c0.data[j], c_fq12.c0.c2.c0.mont_repr.data[j]);
            EXPECT_EQ(a.c0.c2.c1.data[j], c_fq12.c0.c2.c1.mont_repr.data[j]);
            EXPECT_EQ(a.c1.c0.c0.data[j], c_fq12.c1.c0.c0.mont_repr.data[j]);
            EXPECT_EQ(a.c1.c0.c1.data[j], c_fq12.c1.c0.c1.mont_repr.data[j]);
            EXPECT_EQ(a.c1.c1.c0.data[j], c_fq12.c1.c1.c0.mont_repr.data[j]);
            EXPECT_EQ(a.c1.c1.c1.data[j], c_fq12.c1.c1.c1.mont_repr.data[j]);
            EXPECT_EQ(a.c1.c2.c0.data[j], c_fq12.c1.c2.c0.mont_repr.data[j]);
            EXPECT_EQ(a.c1.c2.c1.data[j], c_fq12.c1.c2.c1.mont_repr.data[j]);
        }
    }
}

TEST(fq12, frobenius_map_three)
{
    libff::init_alt_bn128_params();
    constexpr size_t N = 1;
    for (size_t i = 0; i < N; ++i)
    {
        uint64_t inputs[96] = {0};
        int got_entropy = getentropy((void *)&inputs[0], 256);
        EXPECT_EQ(got_entropy, 0);
        got_entropy = getentropy((void *)&inputs[32], 256);
        EXPECT_EQ(got_entropy, 0);
        got_entropy = getentropy((void *)&inputs[64], 256);
        EXPECT_EQ(got_entropy, 0);

        fq12::fq12_t a = *(fq12::fq12_t*)(&inputs[0]);
        to_mont(a);

        libff::alt_bn128_Fq12 a_fq12 = to_libff_fq12(a);

        fq12::frobenius_map_three(a, a);
        libff::alt_bn128_Fq12 c_fq12 = a_fq12.Frobenius_map(3);
        for (size_t j = 0; j < 4; ++j)
        {
            EXPECT_EQ(a.c0.c0.c0.data[j], c_fq12.c0.c0.c0.mont_repr.data[j]);
            EXPECT_EQ(a.c0.c0.c1.data[j], c_fq12.c0.c0.c1.mont_repr.data[j]);
            EXPECT_EQ(a.c0.c1.c0.data[j], c_fq12.c0.c1.c0.mont_repr.data[j]);
            EXPECT_EQ(a.c0.c1.c1.data[j], c_fq12.c0.c1.c1.mont_repr.data[j]);
            EXPECT_EQ(a.c0.c2.c0.data[j], c_fq12.c0.c2.c0.mont_repr.data[j]);
            EXPECT_EQ(a.c0.c2.c1.data[j], c_fq12.c0.c2.c1.mont_repr.data[j]);
            EXPECT_EQ(a.c1.c0.c0.data[j], c_fq12.c1.c0.c0.mont_repr.data[j]);
            EXPECT_EQ(a.c1.c0.c1.data[j], c_fq12.c1.c0.c1.mont_repr.data[j]);
            EXPECT_EQ(a.c1.c1.c0.data[j], c_fq12.c1.c1.c0.mont_repr.data[j]);
            EXPECT_EQ(a.c1.c1.c1.data[j], c_fq12.c1.c1.c1.mont_repr.data[j]);
            EXPECT_EQ(a.c1.c2.c0.data[j], c_fq12.c1.c2.c0.mont_repr.data[j]);
            EXPECT_EQ(a.c1.c2.c1.data[j], c_fq12.c1.c2.c1.mont_repr.data[j]);
        }
    }
}


TEST(fq12, frobenius_map_two)
{
    libff::init_alt_bn128_params();
    constexpr size_t N = 1;
    for (size_t i = 0; i < N; ++i)
    {
        uint64_t inputs[96] = {0};
        int got_entropy = getentropy((void *)&inputs[0], 256);
        EXPECT_EQ(got_entropy, 0);
        got_entropy = getentropy((void *)&inputs[32], 256);
        EXPECT_EQ(got_entropy, 0);
        got_entropy = getentropy((void *)&inputs[64], 256);
        EXPECT_EQ(got_entropy, 0);

        fq12::fq12_t a = *(fq12::fq12_t*)(&inputs[0]);
        to_mont(a);

        libff::alt_bn128_Fq12 a_fq12 = to_libff_fq12(a);

        fq12::frobenius_map_two(a, a);
        libff::alt_bn128_Fq12 c_fq12 = a_fq12.Frobenius_map(2);
        for (size_t j = 0; j < 4; ++j)
        {
            EXPECT_EQ(a.c0.c0.c0.data[j], c_fq12.c0.c0.c0.mont_repr.data[j]);
            EXPECT_EQ(a.c0.c0.c1.data[j], c_fq12.c0.c0.c1.mont_repr.data[j]);
            EXPECT_EQ(a.c0.c1.c0.data[j], c_fq12.c0.c1.c0.mont_repr.data[j]);
            EXPECT_EQ(a.c0.c1.c1.data[j], c_fq12.c0.c1.c1.mont_repr.data[j]);
            EXPECT_EQ(a.c0.c2.c0.data[j], c_fq12.c0.c2.c0.mont_repr.data[j]);
            EXPECT_EQ(a.c0.c2.c1.data[j], c_fq12.c0.c2.c1.mont_repr.data[j]);
            EXPECT_EQ(a.c1.c0.c0.data[j], c_fq12.c1.c0.c0.mont_repr.data[j]);
            EXPECT_EQ(a.c1.c0.c1.data[j], c_fq12.c1.c0.c1.mont_repr.data[j]);
            EXPECT_EQ(a.c1.c1.c0.data[j], c_fq12.c1.c1.c0.mont_repr.data[j]);
            EXPECT_EQ(a.c1.c1.c1.data[j], c_fq12.c1.c1.c1.mont_repr.data[j]);
            EXPECT_EQ(a.c1.c2.c0.data[j], c_fq12.c1.c2.c0.mont_repr.data[j]);
            EXPECT_EQ(a.c1.c2.c1.data[j], c_fq12.c1.c2.c1.mont_repr.data[j]);
        }
    }
}


TEST(fq12, frobenius_map_one)
{
    libff::init_alt_bn128_params();
    constexpr size_t N = 1;
    for (size_t i = 0; i < N; ++i)
    {
        uint64_t inputs[96] = {0};
        int got_entropy = getentropy((void *)&inputs[0], 256);
        EXPECT_EQ(got_entropy, 0);
        got_entropy = getentropy((void *)&inputs[32], 256);
        EXPECT_EQ(got_entropy, 0);
        got_entropy = getentropy((void *)&inputs[64], 256);
        EXPECT_EQ(got_entropy, 0);

        fq12::fq12_t a = *(fq12::fq12_t*)(&inputs[0]);
        to_mont(a);

        libff::alt_bn128_Fq12 a_fq12 = to_libff_fq12(a);

        fq12::frobenius_map_one(a, a);
        libff::alt_bn128_Fq12 c_fq12 = a_fq12.Frobenius_map(1);
        for (size_t j = 0; j < 4; ++j)
        {
            EXPECT_EQ(a.c0.c0.c0.data[j], c_fq12.c0.c0.c0.mont_repr.data[j]);
            EXPECT_EQ(a.c0.c0.c1.data[j], c_fq12.c0.c0.c1.mont_repr.data[j]);
            EXPECT_EQ(a.c0.c1.c0.data[j], c_fq12.c0.c1.c0.mont_repr.data[j]);
            EXPECT_EQ(a.c0.c1.c1.data[j], c_fq12.c0.c1.c1.mont_repr.data[j]);
            EXPECT_EQ(a.c0.c2.c0.data[j], c_fq12.c0.c2.c0.mont_repr.data[j]);
            EXPECT_EQ(a.c0.c2.c1.data[j], c_fq12.c0.c2.c1.mont_repr.data[j]);
            EXPECT_EQ(a.c1.c0.c0.data[j], c_fq12.c1.c0.c0.mont_repr.data[j]);
            EXPECT_EQ(a.c1.c0.c1.data[j], c_fq12.c1.c0.c1.mont_repr.data[j]);
            EXPECT_EQ(a.c1.c1.c0.data[j], c_fq12.c1.c1.c0.mont_repr.data[j]);
            EXPECT_EQ(a.c1.c1.c1.data[j], c_fq12.c1.c1.c1.mont_repr.data[j]);
            EXPECT_EQ(a.c1.c2.c0.data[j], c_fq12.c1.c2.c0.mont_repr.data[j]);
            EXPECT_EQ(a.c1.c2.c1.data[j], c_fq12.c1.c2.c1.mont_repr.data[j]);
        }
    }
}