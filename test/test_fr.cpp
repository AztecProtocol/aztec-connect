#include <gtest/gtest.h>

#include <barretenberg/curves/bn254/fr.hpp>

using namespace barretenberg;

TEST(fr, eq)
{
    fr::field_t a{ { 0x01, 0x02, 0x03, 0x04 } };
    fr::field_t b{ { 0x01, 0x02, 0x03, 0x04 } };
    fr::field_t c{ { 0x01, 0x02, 0x03, 0x05 } };
    fr::field_t d{ { 0x01, 0x02, 0x04, 0x04 } };
    fr::field_t e{ { 0x01, 0x03, 0x03, 0x04 } };
    fr::field_t f{ { 0x02, 0x02, 0x03, 0x04 } };
    EXPECT_EQ(fr::eq(a, b), true);
    EXPECT_EQ(fr::eq(a, c), false);
    EXPECT_EQ(fr::eq(a, d), false);
    EXPECT_EQ(fr::eq(a, e), false);
    EXPECT_EQ(fr::eq(a, f), false);
}

TEST(fr, is_zero)
{
    fr::field_t a = fr::zero;
    fr::field_t b = fr::zero;
    fr::field_t c = fr::zero;
    fr::field_t d = fr::zero;
    fr::field_t e = fr::zero;

    b.data[0] = 1;
    c.data[1] = 1;
    d.data[2] = 1;
    e.data[3] = 1;
    EXPECT_EQ(fr::is_zero(a), true);
    EXPECT_EQ(fr::is_zero(b), false);
    EXPECT_EQ(fr::is_zero(c), false);
    EXPECT_EQ(fr::is_zero(d), false);
    EXPECT_EQ(fr::is_zero(e), false);
}

TEST(fr, random_element)
{
    fr::field_t a = fr::random_element();
    fr::field_t b = fr::random_element();

    EXPECT_EQ(fr::eq(a, b), false);
    EXPECT_EQ(fr::is_zero(a), false);
    EXPECT_EQ(fr::is_zero(b), false);
}

TEST(fr, mul)
{
    fr::field_t a{ { 0x192f9ddc938ea63, 0x1db93d61007ec4fe, 0xc89284ec31fa49c0, 0x2478d0ff12b04f0f } };
    fr::field_t b{ { 0x7aade4892631231c, 0x8e7515681fe70144, 0x98edb76e689b6fd8, 0x5d0886b15fc835fa } };
    fr::field_t expected{ { 0xab961ef46b4756b6, 0xbc6b636fc29678c8, 0xd247391ed6b5bd16, 0x12e8538b3bde6784 } };
    fr::field_t result;
    fr::__mul(a, b, result);
    EXPECT_EQ(fr::eq(result, expected), true);
}

TEST(fr, sqr)
{
    fr::field_t a{ { 0x95f946723a1fc34f, 0x641ec0482fc40bb9, 0xb8d645bc49dd513d, 0x1c1bffd317599dbc } };
    fr::field_t expected{ { 0xc787f7d9e2c72714, 0xcf21cf53d8f65f67, 0x8db109903dac0008, 0x26ab4dd65f46be5f } };
    fr::field_t result;
    fr::__sqr(a, result);
    EXPECT_EQ(fr::eq(result, expected), true);
}

TEST(fr, add)
{
    fr::field_t a{ { 0x20565a572c565a66, 0x7bccd0f01f5f7bff, 0x63ec2beaad64711f, 0x624953caaf44a814 } };
    fr::field_t b{ { 0xa17307a2108adeea, 0x74629976c14c5e2b, 0x9ce6f072ab1740ee, 0x398c753702b2bef0 } };
    fr::field_t expected{ { 0x7de76c654ce1394f, 0xc7fb821e66f26999, 0x4882d6a6d6fa59b0, 0x6b717a8ed0c5c6db } };
    fr::field_t result;
    fr::__add(a, b, result);
    EXPECT_EQ(fr::eq(result, expected), true);
}

TEST(fr, sub)
{
    fr::field_t a{ { 0xcfbcfcf457cf2d38, 0x7b27af26ce62aa61, 0xf0378e90d48f2b92, 0x4734b22cb21ded } };
    fr::field_t b{ { 0x569fdb1db5198770, 0x446ddccef8347d52, 0xef215227182d22a, 0x8281b4fb109306 } };
    fr::field_t expected{ { 0xbcff176a92b5a5c9, 0x5eedbaa04fe79da0, 0x9995bf24e48db1c5, 0x3029017012d32b11 } };
    fr::field_t result;
    fr::__sub(a, b, result);
    EXPECT_EQ(fr::eq(result, expected), true);
}

TEST(fr, to_montgomery_form)
{
    fr::field_t result{ { 0x01, 0x00, 0x00, 0x00 } };
    fr::field_t expected = fr::one;
    fr::__to_montgomery_form(result, result);
    EXPECT_EQ(fr::eq(result, expected), true);
}

TEST(fr, from_montgomery_form)
{
    fr::field_t result = fr::one;
    fr::field_t expected{ { 0x01, 0x00, 0x00, 0x00 } };
    fr::__from_montgomery_form(result, result);
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
    fr::__to_montgomery_form(a, aR);
    fr::__to_montgomery_form(aR, aRR);
    fr::__to_montgomery_form(b, bR);
    fr::__to_montgomery_form(bR, bRR);
    fr::__to_montgomery_form(bRR, bRRR);
    fr::__mul(aRR, bRR, result_a); // abRRR
    fr::__mul(aR, bRRR, result_b); // abRRR
    fr::__mul(aR, bR, result_c);   // abR
    fr::__mul(a, b, result_d);     // abR^-1
    EXPECT_EQ(fr::eq(result_a, result_b), true);
    fr::__from_montgomery_form(result_a, result_a); // abRR
    fr::__from_montgomery_form(result_a, result_a); // abR
    fr::__from_montgomery_form(result_a, result_a); // ab
    fr::__from_montgomery_form(result_c, result_c); // ab
    fr::__to_montgomery_form(result_d, result_d);   // ab
    EXPECT_EQ(fr::eq(result_a, result_c), true);
    EXPECT_EQ(fr::eq(result_a, result_d), true);
}

TEST(fr, add_mul_consistency)
{
    fr::field_t multiplicand = { { 0x09, 0, 0, 0 } };
    fr::__to_montgomery_form(multiplicand, multiplicand);

    fr::field_t a = fr::random_element();
    fr::field_t result;
    fr::__add(a, a, result);           // 2
    fr::__add(result, result, result); // 4
    fr::__add(result, result, result); // 8
    fr::__add(result, a, result);      // 9

    fr::field_t expected;
    fr::__mul(a, multiplicand, expected);

    EXPECT_EQ(fr::eq(result, expected), true);
}

TEST(fr, sub_mul_consistency)
{
    fr::field_t multiplicand = { { 0x05, 0, 0, 0 } };
    fr::__to_montgomery_form(multiplicand, multiplicand);

    fr::field_t a = fr::random_element();
    fr::field_t result;
    fr::__add(a, a, result);           // 2
    fr::__add(result, result, result); // 4
    fr::__add(result, result, result); // 8
    fr::__sub(result, a, result);      // 7
    fr::__sub(result, a, result);      // 6
    fr::__sub(result, a, result);      // 5

    fr::field_t expected;
    fr::__mul(a, multiplicand, expected);

    EXPECT_EQ(fr::eq(result, expected), true);
}

TEST(fr, lambda)
{
    fr::field_t x = fr::random_element();

    fr::field_t lambda_x = { { x.data[0], x.data[1], x.data[2], x.data[3] } };
    fr::__mul_beta(lambda_x, lambda_x);

    // compute x^3
    fr::field_t x_cubed;
    fr::__mul(x, x, x_cubed);
    fr::__mul(x_cubed, x, x_cubed);

    // compute lambda_x^3
    fr::field_t lambda_x_cubed;
    fr::__mul(lambda_x, lambda_x, lambda_x_cubed);
    fr::__mul(lambda_x_cubed, lambda_x, lambda_x_cubed);

    EXPECT_EQ(fr::eq(x_cubed, lambda_x_cubed), true);
}

TEST(fr, invert)
{
    fr::field_t input = fr::random_element();
    fr::field_t inverse = input.invert();
    fr::field_t result = input * inverse;

    EXPECT_EQ(fr::eq(result, fr::one), true);
}

TEST(fr, invert_one_is_one)
{
    fr::field_t result = fr::one;
    fr::__invert(result, result);
    EXPECT_EQ(fr::eq(result, fr::one), true);
}

TEST(fr, sqrt)
{
    fr::field_t input = fr::one;
    fr::field_t root;
    fr::field_t result;
    fr::__sqrt(input, root);
    fr::__sqr(root, result);
    for (size_t j = 0; j < 4; ++j) {
        EXPECT_EQ(result.data[j], input.data[j]);
    }
}

TEST(fr, sqrt_random)
{
    size_t n = 1024;
    for (size_t i = 0; i < n; ++i) {
        fr::field_t input = fr::random_element();
        fr::__sqr(input, input);
        fr::field_t root_test;
        fr::__sqrt(input, root_test);
        fr::__sqr(root_test, root_test);
        EXPECT_EQ(fr::eq(root_test, input), true);
    }
}

TEST(fr, one_and_zero)
{
    fr::field_t result;
    fr::__sub(fr::one, fr::one, result);
    EXPECT_EQ(fr::eq(result, fr::zero), true);
}

TEST(fr, copy)
{
    fr::field_t result = fr::random_element();
    fr::field_t expected;
    fr::__copy(result, expected);
    EXPECT_EQ(fr::eq(result, expected), true);
}

TEST(fr, neg)
{
    fr::field_t a = fr::random_element();
    fr::field_t b;
    fr::__neg(a, b);
    fr::field_t result;
    fr::__add(a, b, result);
    EXPECT_EQ(fr::eq(result, fr::zero), true);
}

TEST(fr, split_into_endomorphism_scalars)
{
    fr::field_t input = { { 0, 0, 0, 0 } };
    int got_entropy = getentropy((void*)&input.data[0], 32);
    EXPECT_EQ(got_entropy, 0);
    input.data[3] &= 0x7fffffffffffffff;

    while (fr::gt(input, fr::modulus_plus_one)) {
        fr::__sub(input, fr::modulus, input);
    }
    fr::field_t k = { { input.data[0], input.data[1], input.data[2], input.data[3] } };
    fr::field_t k1 = { { 0, 0, 0, 0 } };
    fr::field_t k2 = { { 0, 0, 0, 0 } };

    fr::split_into_endomorphism_scalars(k, k1, k2);

    fr::field_t result{ { 0, 0, 0, 0 } };

    fr::__to_montgomery_form(k1, k1);
    fr::__to_montgomery_form(k2, k2);

    fr::__mul(k2, fr::beta, result);
    fr::__sub(k1, result, result);

    fr::__from_montgomery_form(result, result);
    for (size_t i = 0; i < 4; ++i) {
        EXPECT_EQ(result.data[i], k.data[i]);
    }
}

TEST(fr, split_into_endomorphism_scalars_simple)
{

    fr::field_t input = { { 1, 0, 0, 0 } };
    fr::field_t k = { { 0, 0, 0, 0 } };
    fr::field_t k1 = { { 0, 0, 0, 0 } };
    fr::field_t k2 = { { 0, 0, 0, 0 } };
    fr::__copy(input, k);

    fr::split_into_endomorphism_scalars(k, k1, k2);

    fr::field_t result{ { 0, 0, 0, 0 } };
    fr::__to_montgomery_form(k1, k1);
    fr::__to_montgomery_form(k2, k2);

    fr::__mul(k2, fr::beta, result);
    fr::__sub(k1, result, result);

    fr::__from_montgomery_form(result, result);
    for (size_t i = 0; i < 4; ++i) {
        EXPECT_EQ(result.data[i], k.data[i]);
    }
}

TEST(fr, batch_invert)
{
    size_t n = 10;
    fr::field_t coeffs[n];
    fr::field_t inverses[n];
    fr::field_t one = fr::one;
    for (size_t i = 0; i < n; ++i) {
        coeffs[i] = fr::random_element();
        fr::__copy(coeffs[i], inverses[i]);
    }
    fr::batch_invert(inverses, n);

    for (size_t i = 0; i < n; ++i) {
        fr::__mul(coeffs[i], inverses[i], coeffs[i]);
        fr::__sub(coeffs[i], one, coeffs[i]);
    }

    for (size_t i = 0; i < n; ++i) {
        EXPECT_EQ(coeffs[i].data[0], 0UL);
        EXPECT_EQ(coeffs[i].data[1], 0UL);
        EXPECT_EQ(coeffs[i].data[2], 0UL);
        EXPECT_EQ(coeffs[i].data[3], 0UL);
    }
}

TEST(fr, coset_generator_consistency)
{
    size_t num_generators = 15;
    std::vector<fr::field_t> generators(num_generators);
    fr::compute_coset_generators(num_generators, 1 << 30, &generators[0]);
    EXPECT_EQ(generators.size() == num_generators, true);
    for (size_t i = 0; i < generators.size(); ++i) {
        EXPECT_EQ(fr::eq(generators[i], fr::coset_generators[i]), true);
    }
}