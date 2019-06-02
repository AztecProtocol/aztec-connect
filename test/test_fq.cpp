#include <gtest/gtest.h>

#include <gmp.h>
#include <libff/algebra/fields/fp.hpp>
#include <libff/algebra/curves/alt_bn128/alt_bn128_g1.hpp>
#include <libff/algebra/curves/alt_bn128/alt_bn128_init.hpp>

#include <barretenberg/fq.hpp>

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

TEST(fq, mul)
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

        libff::alt_bn128_Fq a_fq;
        a_fq.mont_repr.data[0] = a[0];
        a_fq.mont_repr.data[1] = a[1];
        a_fq.mont_repr.data[2] = a[2];
        a_fq.mont_repr.data[3] = a[3];

        libff::bigint<4> b_bigint;
        b_bigint.data[0] = b[0];
        b_bigint.data[1] = b[1];
        b_bigint.data[2] = b[2];
        b_bigint.data[3] = b[3];

        fq::mul(a, b, result);
        a_fq.mul_reduce(b_bigint);

        for (size_t j = 0; j < 4; ++j)
        {
            EXPECT_EQ(result[j], a_fq.mont_repr.data[j]);
        }
    }
}

TEST(fq, sqr)
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

        fq::mul(&a[0], &a[0], &expected[0]);
        fq::sqr(&a[0], &result[0]);

        for (size_t j = 0; j < 4; ++j)
        {            
            EXPECT_EQ(result[j], expected[j]);
        }
    }
}

TEST(fq, add)
{
    uint64_t inputs[8] = {0};
    int got_entropy = getentropy((void *)&inputs[0], 64);
    inputs[3] &= 0x7fffffffffffffff;
    inputs[7] &= 0x7fffffffffffffff;
    EXPECT_EQ(got_entropy, 0);
    libff::alt_bn128_Fq a_fq;
    libff::alt_bn128_Fq b_fq;
    to_bigint(&inputs[0], a_fq.mont_repr);
    to_bigint(&inputs[4], b_fq.mont_repr);
    uint64_t* a = &inputs[0];
    uint64_t* b = &inputs[4];
    uint64_t result[4] = {0};

    fq::add(a, b, result);
    a_fq = a_fq + b_fq;
    for (size_t j = 0; j < 4; ++j)
    {
        EXPECT_EQ(result[j], a_fq.mont_repr.data[j]);
    }
}

TEST(fq, sub)
{
    uint64_t inputs[8] = {0};
    int got_entropy = getentropy((void *)&inputs[0], 64);
    inputs[3] &= 0x7fffffffffffffff;
    inputs[7] &= 0x7fffffffffffffff;
    EXPECT_EQ(got_entropy, 0);
    libff::alt_bn128_Fq a_fq;
    libff::alt_bn128_Fq b_fq;
    to_bigint(&inputs[0], a_fq.mont_repr);
    to_bigint(&inputs[4], b_fq.mont_repr);
    uint64_t* a = &inputs[0];
    uint64_t* b = &inputs[4];
    uint64_t result[4] = {0};

    fq::sub(a, b, result);
    a_fq = a_fq - b_fq;
    for (size_t j = 0; j < 4; ++j)
    {
        EXPECT_EQ(result[j], a_fq.mont_repr.data[j]);
    }
}

TEST(fq, beta)
{
    uint64_t x[4] = {0};
    int got_entropy = getentropy((void *)&x[0], 32);
    EXPECT_EQ(got_entropy, 0);
    x[3] &= 0x3fffffffffffffff;
    uint64_t beta_x[4] = { x[0], x[1], x[2], x[3] };
    fq::mul_beta(beta_x, beta_x);

    // compute x^3
    uint64_t x_cubed[4];
    fq::mul(x, x, x_cubed);
    fq::mul(x_cubed, x, x_cubed);

    // compute beta_x^3
    uint64_t beta_x_cubed[4];
    fq::mul(beta_x, beta_x, beta_x_cubed);
    fq::mul(beta_x_cubed, beta_x, beta_x_cubed);

    for (size_t i = 0; i < 4; ++i)
    {
        EXPECT_EQ(x_cubed[i], beta_x_cubed[i]);
    }
}

TEST(fq, to_montgomery_form)
{
    libff::init_alt_bn128_params();
    fq::field_t inputs = { 0 };
    // alignas(32) uint64_t inputs[4] = {0};
    int got_entropy = getentropy((void *)&inputs[0], 32);
    EXPECT_EQ(got_entropy, 0);

    libff::bigint<4> input_bigint;
    to_bigint(&inputs[0], input_bigint);
    libff::alt_bn128_Fq expected = libff::alt_bn128_Fq(input_bigint);
    fq::field_t result = { 0 };
    // alignas(32) uint64_t result[4] = {0};
    fq::one(result);

    fq::to_montgomery_form(inputs, result);

    for (size_t j = 0; j < 4; ++j)
    {
        EXPECT_EQ(result[j], expected.mont_repr.data[j]);
    }
}

TEST(fq, from_montgomery_form)
{
    libff::init_alt_bn128_params();
    fq::field_t inputs = {0};
    int got_entropy = getentropy((void *)&inputs[0], 32);
    EXPECT_EQ(got_entropy, 0);

    libff::bigint<4> input_bigint;
    to_bigint(inputs, input_bigint);
    libff::alt_bn128_Fq libff_fq = libff::alt_bn128_Fq(input_bigint);
    libff::bigint<4> expected_bigint = libff_fq.as_bigint();

    fq::field_t result = {0};
    fq::to_montgomery_form(inputs, result);
    fq::from_montgomery_form(result, result);
    for (size_t j = 0; j < 4; ++j)
    {
        EXPECT_EQ(result[j], expected_bigint.data[j]);
    }
}

TEST(fq, invert_libff_compare)
{
    fq::field_t input;
    fq::field_t result;
    fq::random_element(input);
    libff::alt_bn128_Fq libff_scalar;
    to_bigint(input, libff_scalar.mont_repr);
    libff::alt_bn128_Fq expected = libff_scalar.inverse();

    fq::invert(input, result);
    for (size_t j = 0; j < 4; ++j)
    {
        EXPECT_EQ(result[j], expected.mont_repr.data[j]);
    }
}

TEST(fq, invert)
{
    fq::field_t input;
    fq::field_t inverse;
    fq::field_t result;
    fq::random_element(input);
    fq::invert(input, inverse);
    fq::mul(input, inverse, result);
    printf("mul result = ");
    fq::print(result);
    for (size_t j = 0; j < 4; ++j)
    {
        EXPECT_EQ(result[j], fq::one_mont[j]);
    }
}

TEST(fq, sqrt)
{
    fq::field_t input;
    fq::field_t root;
    fq::field_t result;
    fq::one(input);
    fq::sqrt(input, root);
    fq::sqr(root, result);
    for (size_t j = 0; j < 4; ++j)
    {
        EXPECT_EQ(result[j], input[j]);
    }
}


TEST(fq, sqrt_random)
{
    libff::init_alt_bn128_params();
    libff::alt_bn128_G1 pt = libff::alt_bn128_G1::random_element();
    
    fq::field_t input;
    input[0] = pt.Y.mont_repr.data[0];
    input[1] = pt.Y.mont_repr.data[1];
    input[2] = pt.Y.mont_repr.data[2];
    input[3] = pt.Y.mont_repr.data[3];
    fq::sqr(input, input); // we know that y^2 will have a root in fq
    fq::field_t root;
    fq::field_t result;
    
    fq::sqrt(input, root);
    fq::sqr(root, result);
    for (size_t j = 0; j < 4; ++j)
    {
        EXPECT_EQ(result[j], input[j]);
    }
}