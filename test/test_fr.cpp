#include <gtest/gtest.h>

#include <barretenberg/fields/fr.hpp>

using namespace barretenberg;

TEST(fr, eq)
{
    fr::field_t a = {.data = {0x01, 0x02, 0x03, 0x04}};
    fr::field_t b = {.data = {0x01, 0x02, 0x03, 0x04}};
    fr::field_t c = {.data = {0x01, 0x02, 0x03, 0x05}};
    fr::field_t d = {.data = {0x01, 0x02, 0x04, 0x04}};
    fr::field_t e = {.data = {0x01, 0x03, 0x03, 0x04}};
    fr::field_t f = {.data = {0x02, 0x02, 0x03, 0x04}};
    EXPECT_EQ(fr::eq(a, b), true);
    EXPECT_EQ(fr::eq(a, c), false);
    EXPECT_EQ(fr::eq(a, d), false);
    EXPECT_EQ(fr::eq(a, e), false);
    EXPECT_EQ(fr::eq(a, f), false);
}

TEST(fr, iszero)
{
    fr::field_t a = fr::zero();
    fr::field_t b = fr::zero();
    fr::field_t c = fr::zero();
    fr::field_t d = fr::zero();
    fr::field_t e = fr::zero();

    b.data[0] = 1;
    c.data[1] = 1;
    d.data[2] = 1;
    e.data[3] = 1;
    EXPECT_EQ(fr::iszero(a), true);
    EXPECT_EQ(fr::iszero(b), false);
    EXPECT_EQ(fr::iszero(c), false);
    EXPECT_EQ(fr::iszero(d), false);
    EXPECT_EQ(fr::iszero(e), false);
}

TEST(fr, random_element)
{
    fr::field_t a = fr::random_element();
    fr::field_t b = fr::random_element();

    EXPECT_EQ(fr::eq(a, b), false);
    EXPECT_EQ(fr::iszero(a), false);
    EXPECT_EQ(fr::iszero(b), false);
}

TEST(fr, mul)
{
    fr::field_t a = {.data = {0x192f9ddc938ea63, 0x1db93d61007ec4fe, 0xc89284ec31fa49c0, 0x2478d0ff12b04f0f}};
    fr::field_t b = {.data = {0x7aade4892631231c, 0x8e7515681fe70144, 0x98edb76e689b6fd8, 0x5d0886b15fc835fa}};
    fr::field_t expected = {.data = {0xab961ef46b4756b6, 0xbc6b636fc29678c8, 0xd247391ed6b5bd16, 0x12e8538b3bde6784}};
    fr::field_t result;
    fr::mul(a, b, result);
    EXPECT_EQ(fr::eq(result, expected), true);
}

TEST(fr, sqr)
{
    fr::field_t a = {.data = {0xca82500eceae81c2, 0x9c0bf6cd7e3143f, 0x80a9c4d587797aeb, 0x4ecc6979d0d52e1f}};
    fr::field_t expected = {.data = {0x6decb7ee400af992, 0x49c750b52efb4aac, 0x6c00e3601ece650c, 0x22e3ed5320338284}};
    fr::field_t result;
    fr::sqr(a, result);
    EXPECT_EQ(fr::eq(result, expected), true);
}

TEST(fr, add)
{
    fr::field_t a = {.data = {0x20565a572c565a66, 0x7bccd0f01f5f7bff, 0x63ec2beaad64711f, 0x624953caaf44a814}};
    fr::field_t b = {.data = {0xa17307a2108adeea, 0x74629976c14c5e2b, 0x9ce6f072ab1740ee, 0x398c753702b2bef0}};
    fr::field_t expected = {.data = {0x7de76c654ce1394f, 0xc7fb821e66f26999, 0x4882d6a6d6fa59b0, 0x6b717a8ed0c5c6db}};
    fr::field_t result;
    fr::add(a, b, result);
    EXPECT_EQ(fr::eq(result, expected), true);
}

TEST(fr, sub)
{
    fr::field_t a = {.data = {0xcfbcfcf457cf2d38, 0x7b27af26ce62aa61, 0xf0378e90d48f2b92, 0x4734b22cb21ded}};
    fr::field_t b = {.data = {0x569fdb1db5198770, 0x446ddccef8347d52, 0xef215227182d22a, 0x8281b4fb109306}};
    fr::field_t expected = {.data = {0xbcff176a92b5a5c9, 0x5eedbaa04fe79da0, 0x9995bf24e48db1c5, 0x3029017012d32b11}};
    fr::field_t result;
    fr::sub(a, b, result);
    EXPECT_EQ(fr::eq(result, expected), true);
}

TEST(fr, to_montgomery_form)
{
    fr::field_t result = {.data = {0x01, 0x00, 0x00, 0x00}};
    fr::field_t expected = fr::one();
    fr::to_montgomery_form(result, result);
    EXPECT_EQ(fr::eq(result, expected), true);
}

TEST(fr, from_montgomery_form)
{
    fr::field_t result = fr::one();
    fr::field_t expected = {.data = {0x01, 0x00, 0x00, 0x00}};
    fr::from_montgomery_form(result, result);
    EXPECT_EQ(fr::eq(result, expected), true);
}

TEST(fr, montgomery_consistency_check)
{
    fr::field_t a = fr::random_element();
    fr::field_t b = fr::random_element();
    fr::field_t aR;
    fr::field_t bR;
    fr::field_t aRR;
    fr::field_t bRR;
    fr::field_t bRRR;
    fr::field_t result_a;
    fr::field_t result_b;
    fr::field_t result_c;
    fr::field_t result_d;
    fr::to_montgomery_form(a, aR);
    fr::to_montgomery_form(aR, aRR);
    fr::to_montgomery_form(b, bR);
    fr::to_montgomery_form(bR, bRR);
    fr::to_montgomery_form(bRR, bRRR);
    fr::mul(aRR, bRR, result_a); // abRRR
    fr::mul(aR, bRRR, result_b); // abRRR
    fr::mul(aR, bR, result_c);   // abR
    fr::mul(a, b, result_d);     // abR^-1
    EXPECT_EQ(fr::eq(result_a, result_b), true);
    fr::from_montgomery_form(result_a, result_a); // abRR
    fr::from_montgomery_form(result_a, result_a); // abR
    fr::from_montgomery_form(result_a, result_a); // ab
    fr::from_montgomery_form(result_c, result_c); // ab
    fr::to_montgomery_form(result_d, result_d);   // ab
    EXPECT_EQ(fr::eq(result_a, result_c), true);
    EXPECT_EQ(fr::eq(result_a, result_d), true);
}

TEST(fr, add_mul_consistency)
{
    fr::field_t multiplicand = {.data = {0x09, 0, 0, 0}};
    fr::to_montgomery_form(multiplicand, multiplicand);

    fr::field_t a = fr::random_element();
    fr::field_t result;
    fr::add(a, a, result);           // 2
    fr::add(result, result, result); // 4
    fr::add(result, result, result); // 8
    fr::add(result, a, result);      // 9

    fr::field_t expected;
    fr::mul(a, multiplicand, expected);

    EXPECT_EQ(fr::eq(result, expected), true);
}

TEST(fr, sub_mul_consistency)
{
    fr::field_t multiplicand = {.data = {0x05, 0, 0, 0}};
    fr::to_montgomery_form(multiplicand, multiplicand);

    fr::field_t a = fr::random_element();
    fr::field_t result;
    fr::add(a, a, result);           // 2
    fr::add(result, result, result); // 4
    fr::add(result, result, result); // 8
    fr::sub(result, a, result);      // 7
    fr::sub(result, a, result);      // 6
    fr::sub(result, a, result);      // 5

    fr::field_t expected;
    fr::mul(a, multiplicand, expected);

    EXPECT_EQ(fr::eq(result, expected), true);
}

TEST(fr, lambda)
{
    fr::field_t x = fr::random_element();

    fr::field_t lambda_x = {.data = {x.data[0], x.data[1], x.data[2], x.data[3]}};
    fr::mul_lambda(lambda_x, lambda_x);

    // compute x^3
    fr::field_t x_cubed;
    fr::mul(x, x, x_cubed);
    fr::mul(x_cubed, x, x_cubed);

    // compute lambda_x^3
    fr::field_t lambda_x_cubed;
    fr::mul(lambda_x, lambda_x, lambda_x_cubed);
    fr::mul(lambda_x_cubed, lambda_x, lambda_x_cubed);

    EXPECT_EQ(fr::eq(x_cubed, lambda_x_cubed), true);
}

TEST(fr, invert)
{
    fr::field_t input = fr::random_element();
    fr::field_t inverse;
    fr::field_t result;

    fr::invert(input, inverse);
    fr::mul(input, inverse, result);
    EXPECT_EQ(fr::eq(result, fr::one()), true);
}

TEST(fr, invert_one_is_one)
{
    fr::field_t result = fr::one();
    fr::invert(result, result);
    EXPECT_EQ(fr::eq(result, fr::one()), true);
}

TEST(fr, one_and_zero)
{
    fr::field_t result;
    fr::sub(fr::one(), fr::one(), result);
    EXPECT_EQ(fr::eq(result, fr::zero()), true);
}

TEST(fr, copy)
{
    fr::field_t result = fr::random_element();
    fr::field_t expected;
    fr::copy(result, expected);
    EXPECT_EQ(fr::eq(result, expected), true);
}

TEST(fr, neg)
{
    fr::field_t a = fr::random_element();
    fr::field_t b;
    fr::neg(a, b);
    fr::field_t result;
    fr::add(a, b, result);
    EXPECT_EQ(fr::eq(result, fr::zero()), true);
}

TEST(fr, split_into_endomorphism_scalars)
{
    fr::field_t input = {.data = {0, 0, 0, 0}};
    int got_entropy = getentropy((void *)&input.data[0], 32);
    EXPECT_EQ(got_entropy, 0);
    input.data[3] &= 0x7fffffffffffffff;

    while (gt(input, fr::modulus_plus_one))
    {
        fr::sub(input, fr::modulus, input);
    }
    fr::field_t k = {.data = {input.data[0], input.data[1], input.data[2], input.data[3]}};
    fr::field_t k1 = {.data = {0, 0, 0, 0}};
    fr::field_t k2 = {.data = {0, 0, 0, 0}};

    fr::split_into_endomorphism_scalars(k, k1, k2);

    fr::field_t result = {.data = {0, 0, 0, 0}};

    fr::to_montgomery_form(k1, k1);
    fr::to_montgomery_form(k2, k2);

    fr::mul(k2, fr::lambda, result);
    fr::sub(k1, result, result);

    fr::from_montgomery_form(result, result);
    for (size_t i = 0; i < 4; ++i)
    {
        EXPECT_EQ(result.data[i], k.data[i]);
    }
}

TEST(fr, split_into_endomorphism_scalars_simple)
{

    fr::field_t input = {.data = {1, 0, 0, 0}};
    fr::field_t k = {.data = {0, 0, 0, 0}};
    fr::field_t k1 = {.data = {0, 0, 0, 0}};
    fr::field_t k2 = {.data = {0, 0, 0, 0}};
    fr::copy(input, k);

    fr::split_into_endomorphism_scalars(k, k1, k2);

    fr::field_t result = {.data = {0, 0, 0, 0}};
    fr::to_montgomery_form(k1, k1);
    fr::to_montgomery_form(k2, k2);

    fr::mul(k2, fr::lambda, result);
    fr::sub(k1, result, result);

    fr::from_montgomery_form(result, result);
    for (size_t i = 0; i < 4; ++i)
    {
        EXPECT_EQ(result.data[i], k.data[i]);
    }
}

TEST(fr, batch_invert)
{
    size_t n = 10;
    fr::field_t coeffs[n];
    fr::field_t inverses[n];
    fr::field_t temp[n];
    fr::field_t one;
    fr::one(one);
    for (size_t i = 0; i < n; ++i)
    {
        coeffs[i] = fr::random_element();
        fr::copy(coeffs[i], inverses[i]);
    }
    fr::batch_invert(inverses, n, temp);

    for (size_t i = 0; i < n; ++i)
    {
        fr::mul(coeffs[i], inverses[i], coeffs[i]);
        fr::sub(coeffs[i], one, coeffs[i]);
    }

    for (size_t i = 0; i < n; ++i)
    {
        EXPECT_EQ(coeffs[i].data[0], 0);
        EXPECT_EQ(coeffs[i].data[1], 0);
        EXPECT_EQ(coeffs[i].data[2], 0);
        EXPECT_EQ(coeffs[i].data[3], 0);
    }
}
