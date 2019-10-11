#include <gtest/gtest.h>

#include <barretenberg/fields/fq.hpp>

using namespace barretenberg;

TEST(fq, eq)
{
    fq::field_t a = { .data = { 0x01, 0x02, 0x03, 0x04 } };
    fq::field_t b = { .data = { 0x01, 0x02, 0x03, 0x04 } };
    fq::field_t c = { .data = { 0x01, 0x02, 0x03, 0x05 } };
    fq::field_t d = { .data = { 0x01, 0x02, 0x04, 0x04 } };
    fq::field_t e = { .data = { 0x01, 0x03, 0x03, 0x04 } };
    fq::field_t f = { .data = { 0x02, 0x02, 0x03, 0x04 } };
    EXPECT_EQ(fq::eq(a, b), true);
    EXPECT_EQ(fq::eq(a, c), false);
    EXPECT_EQ(fq::eq(a, d), false);
    EXPECT_EQ(fq::eq(a, e), false);
    EXPECT_EQ(fq::eq(a, f), false);
}

TEST(fq, iszero)
{
    fq::field_t a = fq::zero();
    fq::field_t b = fq::zero();
    fq::field_t c = fq::zero();
    fq::field_t d = fq::zero();
    fq::field_t e = fq::zero();

    b.data[0] = 1;
    c.data[1] = 1;
    d.data[2] = 1;
    e.data[3] = 1;
    EXPECT_EQ(fq::iszero(a), true);
    EXPECT_EQ(fq::iszero(b), false);
    EXPECT_EQ(fq::iszero(c), false);
    EXPECT_EQ(fq::iszero(d), false);
    EXPECT_EQ(fq::iszero(e), false);
}

TEST(fq, random_element)
{
    fq::field_t a = fq::random_element();
    fq::field_t b = fq::random_element();

    EXPECT_EQ(fq::eq(a, b), false);
    EXPECT_EQ(fq::iszero(a), false);
    EXPECT_EQ(fq::iszero(b), false);
}

TEST(fq, mul_check_against_constants)
{
    // test against some randomly generated test data
    fq::field_t a = { .data = { 0x2523b6fa3956f038, 0x158aa08ecdd9ec1d, 0xf48216a4c74738d4, 0x2514cc93d6f0a1bf } };
    fq::field_t a_copy = { .data = { 0x2523b6fa3956f038, 0x158aa08ecdd9ec1d, 0xf48216a4c74738d4, 0x2514cc93d6f0a1bf } };
    fq::field_t b = { .data = { 0xb68aee5e4c8fc17c, 0xc5193de7f401d5e8, 0xb8777d4dde671db3, 0xe513e75c087b0bb } };
    fq::field_t b_copy = { .data = { 0xb68aee5e4c8fc17c, 0xc5193de7f401d5e8, 0xb8777d4dde671db3, 0xe513e75c087b0bb } };
    fq::field_t expected = { .data = { 0x7ed4174114b521c4, 0x58f5bd1d4279fdc2, 0x6a73ac09ee843d41, 0x687a76ae9b3425c } };
    fq::field_t result = { .data = { 0,0,0,0 } };
    fq::__mul(a, b, result);

    EXPECT_EQ(fq::eq(result, expected), true);
    EXPECT_EQ(fq::eq(a, a_copy), true);
    EXPECT_EQ(fq::eq(b, b_copy), true);
}

// validate that zero-value limbs don't cause any problems
TEST(fq, mul_short_integers)
{
    fq::field_t a = { .data = { 0xa, 0, 0, 0 } };
    fq::field_t b = { .data = { 0xb, 0, 0, 0 } };
    fq::field_t expected =  { .data = { 0x65991a6dc2f3a183, 0xe3ba1f83394a2d08, 0x8401df65a169db3f, 0x1727099643607bba } };
    fq::field_t result;
    fq::__mul(a, b, result);
    for (size_t i = 0; i < 4; ++i)
    {
        EXPECT_EQ(result.data[i], expected.data[i]);
    }
}

TEST(fq, mul_sqr_consistency)
{
    fq::field_t a = fq::random_element();
    fq::field_t b = fq::random_element();
    fq::field_t t1;
    fq::field_t t2;
    fq::field_t mul_result;
    fq::field_t sqr_result;
    fq::__sub(a, b, t1);
    fq::__add(a, b, t2);
    fq::__mul(t1, t2, mul_result);
    fq::__sqr(a, t1);
    fq::__sqr(b, t2);
    fq::__sub(t1, t2, sqr_result);

    for (size_t i = 0; i < 4; ++i)
    {
        EXPECT_EQ(mul_result.data[i], sqr_result.data[i]);
    }
}

TEST(fq, sqr_check_against_constants)
{
    fq::field_t a = { .data = { 0x329596aa978981e8, 0x8542e6e254c2a5d0, 0xc5b687d82eadb178, 0x2d242aaf48f56b8a } };
    fq::field_t expected = { .data = { 0xbf4fb34e120b8b12, 0xf64d70efbf848328, 0xefbb6a533f2e7d89, 0x1de50f941425e4aa } };
    fq::field_t result;
    fq::__sqr(a, result);
    for (size_t i = 0; i < 4; ++i)
    {
        EXPECT_EQ(result.data[i], expected.data[i]);
    }
}

TEST(fq, add_check_against_constants)
{
    fq::field_t a = { .data = { 0x7d2e20e82f73d3e8, 0x8e50616a7a9d419d, 0xcdc833531508914b, 0xd510253a2ce62c } };
    fq::field_t b = { .data = { 0x2829438b071fd14e, 0xb03ef3f9ff9274e, 0x605b671f6dc7b209, 0x8701f9d971fbc9 } };
    fq::field_t expected = { .data = { 0xa55764733693a536, 0x995450aa1a9668eb, 0x2e239a7282d04354, 0x15c121f139ee1f6 } };
    fq::field_t result;
    fq::__add(a, b, result);
    EXPECT_EQ(fq::eq(result, expected), true);
}


TEST(fq, sub_check_against_constants)
{
    fq::field_t a = { .data = { 0xd68d01812313fb7c, 0x2965d7ae7c6070a5, 0x08ef9af6d6ba9a48, 0x0cb8fe2108914f53 } };
    fq::field_t b = { .data = { 0x2cd2a2a37e9bf14a, 0xebc86ef589c530f6, 0x75124885b362b8fe, 0x1394324205c7a41d } };
    fq::field_t expected = { .data = { 0xe5daeaf47cf50779, 0xd51ed34a5b0d0a3c, 0x4c2d9827a4d939a6, 0x29891a51e3fb4b5f } };
    fq::field_t result;
    fq::__sub(a, b, result);
    printf("sub result =:\n");
    fq::print(result);
    EXPECT_EQ(fq::eq(result, expected), true);
}

TEST(fq, to_montgomery_form)
{
    fq::field_t result = { .data = { 0x01, 0x00, 0x00, 0x00 } };
    fq::field_t expected = fq::one();
    fq::__to_montgomery_form(result, result);
    EXPECT_EQ(fq::eq(result, expected), true);
}

TEST(fq, from_montgomery_form)
{
    fq::field_t result = fq::one();
    fq::field_t expected = { .data = { 0x01, 0x00, 0x00, 0x00 } };
    fq::__from_montgomery_form(result, result);
    EXPECT_EQ(fq::eq(result, expected), true);
}

TEST(fq, montgomery_consistency_check)
{
    fq::field_t a = fq::random_element();
    fq::field_t b = fq::random_element();
    fq::field_t aR;
    fq::field_t bR;
    fq::field_t aRR;
    fq::field_t bRR;
    fq::field_t bRRR;
    fq::field_t result_a;
    fq::field_t result_b;
    fq::field_t result_c;
    fq::field_t result_d;
    fq::__to_montgomery_form(a, aR);
    fq::__to_montgomery_form(aR, aRR);
    fq::__to_montgomery_form(b, bR);
    fq::__to_montgomery_form(bR, bRR);
    fq::__to_montgomery_form(bRR, bRRR);
    fq::__mul(aRR, bRR, result_a); // abRRR
    fq::__mul(aR, bRRR, result_b); // abRRR
    fq::__mul(aR, bR, result_c);   // abR
    fq::__mul(a, b, result_d);     // abR^-1
    EXPECT_EQ(fq::eq(result_a, result_b), true);
    fq::__from_montgomery_form(result_a, result_a); // abRR
    fq::__from_montgomery_form(result_a, result_a); // abR
    fq::__from_montgomery_form(result_a, result_a); // ab
    fq::__from_montgomery_form(result_c, result_c); // ab
    fq::__to_montgomery_form(result_d, result_d);   // ab
    EXPECT_EQ(fq::eq(result_a, result_c), true);
    EXPECT_EQ(fq::eq(result_a, result_d), true);
}

TEST(fq, add_mul_consistency)
{
    fq::field_t multiplicand = { .data = { 0x09, 0, 0, 0 } };
    fq::__to_montgomery_form(multiplicand, multiplicand);

    fq::field_t a = fq::random_element();
    fq::field_t result;
    fq::__add(a, a, result);             // 2
    fq::__add(result, result, result);   // 4
    fq::__add(result, result, result);   // 8
    fq::__add(result, a, result);        // 9

    fq::field_t expected;
    fq::__mul(a, multiplicand, expected);

    EXPECT_EQ(fq::eq(result, expected), true);
}


TEST(fq, sub_mul_consistency)
{
    fq::field_t multiplicand = { .data = { 0x05, 0, 0, 0 } };
    fq::__to_montgomery_form(multiplicand, multiplicand);

    fq::field_t a = fq::random_element();
    fq::field_t result;
    fq::__add(a, a, result);             // 2
    fq::__add(result, result, result);   // 4
    fq::__add(result, result, result);   // 8
    fq::__sub(result, a, result);        // 7
    fq::__sub(result, a, result);        // 6
    fq::__sub(result, a, result);        // 5

    fq::field_t expected;
    fq::__mul(a, multiplicand, expected);

    EXPECT_EQ(fq::eq(result, expected), true);  
}

TEST(fq, beta)
{
    fq::field_t x = fq::random_element();

    fq::field_t beta_x = { .data = { x.data[0], x.data[1], x.data[2], x.data[3] } };
    fq::__mul_beta(beta_x, beta_x);

    // compute x^3
    fq::field_t x_cubed;
    fq::__mul(x, x, x_cubed);
    fq::__mul(x_cubed, x, x_cubed);

    // compute beta_x^3
    fq::field_t beta_x_cubed;
    fq::__mul(beta_x, beta_x, beta_x_cubed);
    fq::__mul(beta_x_cubed, beta_x, beta_x_cubed);

    EXPECT_EQ(fq::eq(x_cubed, beta_x_cubed), true);
}

TEST(fq, invert)
{
    fq::field_t input = fq::random_element();
    fq::field_t inverse;
    fq::field_t result;

    fq::__invert(input, inverse);
    fq::__mul(input, inverse, result);
    EXPECT_EQ(fq::eq(result, fq::one()), true);
}

TEST(fq, invert_one_is_one)
{
    fq::field_t result = fq::one();
    fq::__invert(result, result);
    EXPECT_EQ(fq::eq(result, fq::one()), true);
}

TEST(fq, sqrt)
{
    fq::field_t input = fq::one();
    fq::field_t root;
    fq::field_t result;
    fq::__sqrt(input, root);
    fq::__sqr(root, result);
    for (size_t j = 0; j < 4; ++j)
    {
        EXPECT_EQ(result.data[j], input.data[j]);
    }
}

TEST(fq, sqrt_random)
{
    bool found_a_root = false;
    size_t n = 1024;
    for (size_t i = 0; i < n; ++i)
    {
        fq::field_t input = fq::random_element();
        fq::field_t root_test;
        fq::__sqrt(input, root_test);
        fq::__sqr(root_test, root_test);
        if (fq::eq(root_test, input))
        {
            found_a_root = true;
        }
    }
    EXPECT_EQ(found_a_root, true);
}

TEST(fq, one_and_zero)
{
    fq::field_t result;
    fq::__sub(fq::one(), fq::one(), result);
    EXPECT_EQ(fq::eq(result, fq::zero()), true);
}

TEST(fq, copy)
{
    fq::field_t result = fq::random_element();
    fq::field_t expected;
    fq::copy(result, expected);
    EXPECT_EQ(fq::eq(result, expected), true);
}

TEST(fq, neg)
{
    fq::field_t a = fq::random_element();
    fq::field_t b;
    fq::neg(a, b);
    fq::field_t result;
    fq::__add(a, b, result);
    EXPECT_EQ(fq::eq(result, fq::zero()), true);
}