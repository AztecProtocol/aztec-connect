#include <gtest/gtest.h>

#include <barretenberg/curves/bn254/fq.hpp>
#include <random>

using namespace barretenberg;

namespace {
std::mt19937 engine;
std::uniform_int_distribution<uint64_t> dist{ 0ULL, UINT64_MAX };

const auto init = []() {
    // std::random_device rd{};
    std::seed_seq seed2{ 1, 2, 3, 4, 5, 6, 7, 8 };
    engine = std::mt19937(seed2);
    return 1;
}();

fq::field_t get_pseudorandom_element()
{
    fq::field_t out{ dist(engine), dist(engine), dist(engine), dist(engine) };
    out.self_reduce_once();
    out.self_reduce_once();
    out.self_reduce_once();
    out.self_reduce_once();
    return out;
}
} // namespace
TEST(fq, eq)
{
    constexpr fq::field_t a{ 0x01, 0x02, 0x03, 0x04 };
    constexpr fq::field_t b{ 0x01, 0x02, 0x03, 0x04 };
    constexpr fq::field_t c{ 0x01, 0x02, 0x03, 0x05 };
    constexpr fq::field_t d{ 0x01, 0x02, 0x04, 0x04 };
    constexpr fq::field_t e{ 0x01, 0x03, 0x03, 0x04 };
    constexpr fq::field_t f{ 0x02, 0x02, 0x03, 0x04 };
    static_assert(a == b);
    static_assert(!(a == c));
    static_assert(!(a == d));
    static_assert(!(a == e));
    static_assert(!(a == f));

    fq::field_t a_var;
    fq::field_t b_var;
    fq::field_t c_var;
    fq::field_t d_var;
    fq::field_t e_var;
    fq::field_t f_var;
    memcpy((void*)a_var.data, (void*)a.data, 32);
    memcpy((void*)b_var.data, (void*)b.data, 32);
    memcpy((void*)c_var.data, (void*)c.data, 32);
    memcpy((void*)d_var.data, (void*)d.data, 32);
    memcpy((void*)e_var.data, (void*)e.data, 32);
    memcpy((void*)f_var.data, (void*)f.data, 32);

    EXPECT_EQ(a_var == a_var, true);
    EXPECT_EQ(a_var == b_var, true);
    EXPECT_EQ(a_var == c_var, false);
    EXPECT_EQ(a_var == d_var, false);
    EXPECT_EQ(a_var == e_var, false);
    EXPECT_EQ(a_var == f_var, false);
}

TEST(fq, is_zero)
{
    fq::field_t a = fq::zero;
    fq::field_t b = fq::zero;
    fq::field_t c = fq::zero;
    fq::field_t d = fq::zero;
    fq::field_t e = fq::zero;

    b.data[0] = 1;
    c.data[1] = 1;
    d.data[2] = 1;
    e.data[3] = 1;
    EXPECT_EQ(a.is_zero(), true);
    EXPECT_EQ(b.is_zero(), false);
    EXPECT_EQ(c.is_zero(), false);
    EXPECT_EQ(d.is_zero(), false);
    EXPECT_EQ(e.is_zero(), false);
}

TEST(fq, random_element)
{
    fq::field_t a = fq::random_element();
    fq::field_t b = fq::random_element();

    EXPECT_EQ(a == b, false);
    EXPECT_EQ(a.is_zero(), false);
    EXPECT_EQ(a.is_zero(), false);
}

TEST(fq, mul_check_against_constants)
{
    // test against some randomly generated test data
    constexpr fq::field_t a{ 0x2523b6fa3956f038, 0x158aa08ecdd9ec1d, 0xf48216a4c74738d4, 0x2514cc93d6f0a1bf };
    constexpr fq::field_t a_copy{ 0x2523b6fa3956f038, 0x158aa08ecdd9ec1d, 0xf48216a4c74738d4, 0x2514cc93d6f0a1bf };
    constexpr fq::field_t b{ 0xb68aee5e4c8fc17c, 0xc5193de7f401d5e8, 0xb8777d4dde671db3, 0xe513e75c087b0bb };
    constexpr fq::field_t b_copy = { 0xb68aee5e4c8fc17c, 0xc5193de7f401d5e8, 0xb8777d4dde671db3, 0xe513e75c087b0bb };
    constexpr fq::field_t const_expected{
        0x7ed4174114b521c4, 0x58f5bd1d4279fdc2, 0x6a73ac09ee843d41, 0x687a76ae9b3425c
    };
    constexpr fq::field_t const_result = a * b;

    static_assert(const_result == const_expected);
    static_assert(a == a_copy);
    static_assert(b == b_copy);

    fq::field_t c;
    fq::field_t d;
    memcpy((void*)c.data, (void*)a.data, 32);
    memcpy((void*)d.data, (void*)b.data, 32);
    EXPECT_EQ(c * d, const_expected);
}

// validate that zero-value limbs don't cause any problems
TEST(fq, mul_short_integers)
{
    constexpr fq::field_t a{ 0xa, 0, 0, 0 };
    constexpr fq::field_t b{ 0xb, 0, 0, 0 };
    constexpr fq::field_t const_expected = {
        0x65991a6dc2f3a183, 0xe3ba1f83394a2d08, 0x8401df65a169db3f, 0x1727099643607bba
    };
    constexpr fq::field_t const_result = a * b;
    static_assert(const_result == const_expected);

    fq::field_t c;
    fq::field_t d;
    memcpy((void*)c.data, (void*)a.data, 32);
    memcpy((void*)d.data, (void*)b.data, 32);
    EXPECT_EQ(c * d, const_expected);
}

TEST(fq, mul_sqr_consistency)
{
    fq::field_t a = fq::random_element();
    fq::field_t b = fq::random_element();
    fq::field_t t1;
    fq::field_t t2;
    fq::field_t mul_result;
    fq::field_t sqr_result;
    t1 = a - b;
    t2 = a + b;
    mul_result = t1 * t2;
    t1 = a.sqr();
    t2 = b.sqr();
    sqr_result = t1 - t2;
    EXPECT_EQ(mul_result, sqr_result);
}

TEST(fq, sqr_check_against_constants)
{
    constexpr fq::field_t a{ 0x329596aa978981e8, 0x8542e6e254c2a5d0, 0xc5b687d82eadb178, 0x2d242aaf48f56b8a };
    constexpr fq::field_t expected{ 0xbf4fb34e120b8b12, 0xf64d70efbf848328, 0xefbb6a533f2e7d89, 0x1de50f941425e4aa };
    constexpr fq::field_t result = a.sqr();
    static_assert(result == expected);

    fq::field_t b;
    memcpy((void*)b.data, (void*)a.data, 32);
    fq::field_t c = b.sqr();
    EXPECT_EQ(result, c);
}

TEST(fq, add_check_against_constants)
{
    constexpr fq::field_t a{ 0x7d2e20e82f73d3e8, 0x8e50616a7a9d419d, 0xcdc833531508914b, 0xd510253a2ce62c };
    constexpr fq::field_t b{ 0x2829438b071fd14e, 0xb03ef3f9ff9274e, 0x605b671f6dc7b209, 0x8701f9d971fbc9 };
    constexpr fq::field_t const_expected{
        0xa55764733693a536, 0x995450aa1a9668eb, 0x2e239a7282d04354, 0x15c121f139ee1f6
    };
    constexpr fq::field_t const_result = a + b;
    static_assert(const_result == const_expected);

    fq::field_t c;
    fq::field_t d;
    memcpy((void*)c.data, (void*)a.data, 32);
    memcpy((void*)d.data, (void*)b.data, 32);
    EXPECT_EQ(c + d, const_expected);
}

TEST(fq, sub_check_against_constants)
{
    constexpr fq::field_t a{ 0xd68d01812313fb7c, 0x2965d7ae7c6070a5, 0x08ef9af6d6ba9a48, 0x0cb8fe2108914f53 };
    constexpr fq::field_t b{ 0x2cd2a2a37e9bf14a, 0xebc86ef589c530f6, 0x75124885b362b8fe, 0x1394324205c7a41d };
    constexpr fq::field_t const_expected{
        0xe5daeaf47cf50779, 0xd51ed34a5b0d0a3c, 0x4c2d9827a4d939a6, 0x29891a51e3fb4b5f
    };
    constexpr fq::field_t const_result = a - b;
    static_assert(const_result == const_expected);

    fq::field_t c;
    fq::field_t d;
    memcpy((void*)c.data, (void*)a.data, 32);
    memcpy((void*)d.data, (void*)b.data, 32);
    EXPECT_EQ(c - d, const_expected);
}

TEST(fq, const_coarse_equivalence_check)
{
    constexpr fq::field_t a{ 0xd68d01812313fb7c, 0x2965d7ae7c6070a5, 0x08ef9af6d6ba9a48, 0x0cb8fe2108914f53 };
    constexpr fq::field_t b{ 0x2cd2a2a37e9bf14a, 0xebc86ef589c530f6, 0x75124885b362b8fe, 0x1394324205c7a41d };

    constexpr fq::field_t c = a * b;
    constexpr fq::field_t d = a.mul_with_coarse_reduction(b).reduce_once();

    constexpr fq::field_t e = [b]() {
        fq::field_t temp{ 0xd68d01812313fb7c, 0x2965d7ae7c6070a5, 0x08ef9af6d6ba9a48, 0x0cb8fe2108914f53 };
        temp.self_mul(b);
        return temp;
    }();

    constexpr fq::field_t f = [b]() {
        fq::field_t temp{ 0xd68d01812313fb7c, 0x2965d7ae7c6070a5, 0x08ef9af6d6ba9a48, 0x0cb8fe2108914f53 };
        temp.self_mul_with_coarse_reduction(b);
        temp.self_reduce_once();
        return temp;
    }();

    static_assert(c == d);
    static_assert(c == e);
    static_assert(c == f);

    fq::field_t c_val = a * b;
    fq::field_t d_val = a.mul_with_coarse_reduction(b).reduce_once();
    fq::field_t e_val = b;
    e_val.self_mul(a);
    fq::field_t f_val = b;
    f_val.self_mul_with_coarse_reduction(a);
    f_val.self_reduce_once();

    EXPECT_EQ(c, c_val);
    EXPECT_EQ(c, d_val);
    EXPECT_EQ(c, e_val);
    EXPECT_EQ(c, f_val);
}

TEST(fq, coarse_equivalence_checks)
{
    fq::field_t a = get_pseudorandom_element();
    fq::field_t b = get_pseudorandom_element();

    fq::field_t c = (a * b) + a - b;

    fq::field_t d =
        a.mul_with_coarse_reduction(b).add_with_coarse_reduction(a).sub_with_coarse_reduction(b).reduce_once();

    EXPECT_EQ(c, d);
}

TEST(fq, to_montgomery_form)
{
    fq::field_t result = fq::field_t{ 0x01, 0x00, 0x00, 0x00 }.to_montgomery_form();
    fq::field_t expected = fq::one;
    EXPECT_EQ(result, expected);
}

TEST(fq, from_montgomery_form)
{
    constexpr fq::field_t t0 = fq::one;
    constexpr fq::field_t result = t0.from_montgomery_form();
    constexpr fq::field_t expected{ 0x01, 0x00, 0x00, 0x00 };
    EXPECT_EQ(result, expected);
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
    aR = a.to_montgomery_form();
    aRR = aR.to_montgomery_form();
    bR = b.to_montgomery_form();
    bRR = bR.to_montgomery_form();
    bRRR = bRR.to_montgomery_form();
    result_a = aRR * bRR; // abRRR
    result_b = aR * bRRR; // abRRR
    result_c = aR * bR;   // abR
    result_d = a * b;     // abR^-1
    EXPECT_EQ((result_a == result_b), true);
    result_a.self_from_montgomery_form(); // abRR
    result_a.self_from_montgomery_form(); // abR
    result_a.self_from_montgomery_form(); // ab
    result_c.self_from_montgomery_form(); // ab
    result_d.self_to_montgomery_form();   // ab
    EXPECT_EQ((result_a == result_c), true);
    EXPECT_EQ((result_a == result_d), true);
}

TEST(fq, add_mul_consistency)
{
    fq::field_t multiplicand = { 0x09, 0, 0, 0 };
    multiplicand.self_to_montgomery_form();

    fq::field_t a = fq::random_element();
    fq::field_t result;
    result = a + a;          // 2
    result.self_add(result); // 4
    result.self_add(result); // 8
    result.self_add(a);      // 9

    fq::field_t expected;
    expected = a * multiplicand;

    EXPECT_EQ((result == expected), true);
}

TEST(fq, sub_mul_consistency)
{
    fq::field_t multiplicand = { 0x05, 0, 0, 0 };
    multiplicand.self_to_montgomery_form();

    fq::field_t a = fq::random_element();
    fq::field_t result;
    result = a + a;          // 2
    result.self_add(result); // 4
    result.self_add(result); // 8
    result.self_sub(a);      // 7
    result.self_sub(a);      // 6
    result.self_sub(a);      // 5

    fq::field_t expected;
    expected = a * multiplicand;

    EXPECT_EQ((result == expected), true);
}

TEST(fq, beta)
{
    fq::field_t x = fq::random_element();

    fq::field_t beta_x = { x.data[0], x.data[1], x.data[2], x.data[3] };
    beta_x = beta_x * fq::beta;

    // compute x^3
    fq::field_t x_cubed;
    x_cubed = x * x;
    x_cubed.self_mul(x);

    // compute beta_x^3
    fq::field_t beta_x_cubed;
    beta_x_cubed = beta_x * beta_x;
    beta_x_cubed.self_mul(beta_x);

    EXPECT_EQ((x_cubed == beta_x_cubed), true);
}

TEST(fq, invert)
{
    fq::field_t input = fq::random_element();
    fq::field_t inverse = input.invert();
    fq::field_t result = input * inverse;
    result.self_reduce_once();
    result.self_reduce_once();
    EXPECT_EQ(result, fq::one);
}

TEST(fq, invert_one_is_one)
{
    fq::field_t result = fq::one;
    result = result.invert();
    EXPECT_EQ((result == fq::one), true);
}

TEST(fq, sqrt)
{
    fq::field_t input = fq::one;
    fq::field_t root = input.sqrt();
    fq::field_t result = root.sqr();
    EXPECT_EQ(result, input);
}

TEST(fq, sqrt_random)
{
    size_t n = 1024;
    for (size_t i = 0; i < n; ++i) {
        fq::field_t input = fq::random_element().sqr();
        fq::field_t root_test = input.sqrt().sqr();
        EXPECT_EQ(root_test, input);
    }
}

TEST(fq, one_and_zero)
{
    fq::field_t result;
    result = fq::one - fq::one;
    EXPECT_EQ((result == fq::zero), true);
}

TEST(fq, copy)
{
    fq::field_t result = fq::random_element();
    fq::field_t expected;
    fq::__copy(result, expected);
    EXPECT_EQ((result == expected), true);
}

TEST(fq, neg)
{
    fq::field_t a = fq::random_element();
    fq::field_t b;
    b = a.neg();
    fq::field_t result;
    result = a + b;
    EXPECT_EQ((result == fq::zero), true);
}

TEST(fq, split_into_endomorphism_scalars)
{
    fq::field_t input = 0;
    int got_entropy = getentropy((void*)&input.data[0], 32);
    EXPECT_EQ(got_entropy, 0);
    input.data[3] &= 0x7fffffffffffffff;

    while (input > fq::modulus_plus_one) {
        input.self_sub(fq::modulus);
    }
    printf("input data = [%lx, %lx, %lx, %lx] \n", input.data[0], input.data[1], input.data[2], input.data[3]);
    fq::field_t k = { input.data[0], input.data[1], input.data[2], input.data[3] };
    printf("k = [%lx, %lx, %lx, %lx] \n", k.data[0], k.data[1], k.data[2], k.data[3]);
    fq::field_t k1 = 0;
    fq::field_t k2 = 0;

    fq::field_t::split_into_endomorphism_scalars(k, k1, k2);

    fq::field_t result = 0;

    k1.self_to_montgomery_form();
    k2.self_to_montgomery_form();

    result = k2 * fq::beta;
    result = k1 - result;

    result.self_from_montgomery_form();
    for (size_t i = 0; i < 4; ++i) {
        EXPECT_EQ(result.data[i], k.data[i]);
    }
}

TEST(fq, split_into_endomorphism_scalars_simple)
{

    fq::field_t input = { 1, 0, 0, 0 };
    fq::field_t k = { 0, 0, 0, 0 };
    fq::field_t k1 = { 0, 0, 0, 0 };
    fq::field_t k2 = { 0, 0, 0, 0 };
    fq::__copy(input, k);

    fq::field_t::split_into_endomorphism_scalars(k, k1, k2);

    fq::field_t result{ 0, 0, 0, 0 };
    k1.self_to_montgomery_form();
    k2.self_to_montgomery_form();

    result = k2 * fq::beta;
    result = k1 - result;

    result.self_from_montgomery_form();
    for (size_t i = 0; i < 4; ++i) {
        EXPECT_EQ(result.data[i], k.data[i]);
    }
}

TEST(fq, coset_generator_consistency)
{
    size_t num_generators = 15;
    std::vector<fq::field_t> generators(num_generators);
    fq::compute_coset_generators(num_generators, 1 << 30, &generators[0]);
    EXPECT_EQ(generators.size() == num_generators, true);
    for (size_t i = 0; i < generators.size(); ++i) {
        EXPECT_EQ((generators[i] == fq::coset_generators[i]), true);
    }
}

TEST(fq, serialize_to_buffer)
{
    uint8_t buffer[32];
    fq::field_t a = { 0x1234567876543210, 0x2345678987654321, 0x3456789a98765432, 0x006789abcba98765 };
    a = a.to_montgomery_form();

    fq::serialize_to_buffer(a, &buffer[0]);

    EXPECT_EQ(buffer[31], 0x10);
    EXPECT_EQ(buffer[30], 0x32);
    EXPECT_EQ(buffer[29], 0x54);
    EXPECT_EQ(buffer[28], 0x76);
    EXPECT_EQ(buffer[27], 0x78);
    EXPECT_EQ(buffer[26], 0x56);
    EXPECT_EQ(buffer[25], 0x34);
    EXPECT_EQ(buffer[24], 0x12);

    EXPECT_EQ(buffer[23], 0x21);
    EXPECT_EQ(buffer[22], 0x43);
    EXPECT_EQ(buffer[21], 0x65);
    EXPECT_EQ(buffer[20], 0x87);
    EXPECT_EQ(buffer[19], 0x89);
    EXPECT_EQ(buffer[18], 0x67);
    EXPECT_EQ(buffer[17], 0x45);
    EXPECT_EQ(buffer[16], 0x23);

    EXPECT_EQ(buffer[15], 0x32);
    EXPECT_EQ(buffer[14], 0x54);
    EXPECT_EQ(buffer[13], 0x76);
    EXPECT_EQ(buffer[12], 0x98);
    EXPECT_EQ(buffer[11], 0x9a);
    EXPECT_EQ(buffer[10], 0x78);
    EXPECT_EQ(buffer[9], 0x56);
    EXPECT_EQ(buffer[8], 0x34);

    EXPECT_EQ(buffer[7], 0x65);
    EXPECT_EQ(buffer[6], 0x87);
    EXPECT_EQ(buffer[5], 0xa9);
    EXPECT_EQ(buffer[4], 0xcb);
    EXPECT_EQ(buffer[3], 0xab);
    EXPECT_EQ(buffer[2], 0x89);
    EXPECT_EQ(buffer[1], 0x67);
    EXPECT_EQ(buffer[0], 0x00);
}

TEST(fq, serialize_from_buffer)
{
    uint8_t buffer[32];
    fq::field_t expected = { 0x1234567876543210, 0x2345678987654321, 0x3456789a98765432, 0x006789abcba98765 };

    fq::serialize_to_buffer(expected, &buffer[0]);

    fq::field_t result = fq::serialize_from_buffer(&buffer[0]);

    EXPECT_EQ((result == expected), true);
}