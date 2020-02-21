#include <barretenberg/curves/bn254/fr.hpp>
#include <barretenberg/fields/new_field.hpp>

#include <gtest/gtest.h>

typedef test::field<barretenberg::FrParams> testField;

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

testField get_pseudorandom_element()
{
    testField out{ dist(engine), dist(engine), dist(engine), dist(engine) };
    out.self_reduce_once();
    out.self_reduce_once();
    out.self_reduce_once();
    out.self_reduce_once();
    return out;
}
} // namespace

TEST(test_new_field, subtract)
{
    barretenberg::fr::field_t fb{ 10, 20, 30, 40 };
    barretenberg::fr::field_t fa{ 1, 2, 3, 4 };
    barretenberg::fr::field_t result = fa - fb;
    testField expected = testField{ 1, 2, 3, 4 } - testField{ 10, 20, 30, 40 };
    EXPECT_EQ(result.data[0], expected.data[0]);
    EXPECT_EQ(result.data[1], expected.data[1]);
    EXPECT_EQ(result.data[2], expected.data[2]);
    EXPECT_EQ(result.data[3], expected.data[3]);
}

TEST(test_new_field, mul_512)
{
    barretenberg::fr::field_t a{ 0xaaaaaaaaaaaaaaaa, 0xbbbbbbbbbbbbbbbb, 0xcccccccccccccccc, 0xdddddddddddddddd };
    barretenberg::fr::field_t b{ 0xeeeeeeeeeeeeeeee, 0xffffffffffffffff, 0x9999999999999999, 0x8888888888888888 };
    barretenberg::fr::field_wide_t expected;
    barretenberg::fr::__mul_512(a, b, expected);

    testField fa{ 0xaaaaaaaaaaaaaaaa, 0xbbbbbbbbbbbbbbbb, 0xcccccccccccccccc, 0xdddddddddddddddd };
    testField fb{ 0xeeeeeeeeeeeeeeee, 0xffffffffffffffff, 0x9999999999999999, 0x8888888888888888 };
    test::field<barretenberg::FrParams>::wide_array result = fa.mul_512(fb);

    EXPECT_EQ(result.data[0], expected.data[0]);
    EXPECT_EQ(result.data[1], expected.data[1]);
    EXPECT_EQ(result.data[2], expected.data[2]);
    EXPECT_EQ(result.data[3], expected.data[3]);
    EXPECT_EQ(result.data[4], expected.data[4]);
    EXPECT_EQ(result.data[5], expected.data[5]);
    EXPECT_EQ(result.data[6], expected.data[6]);
    EXPECT_EQ(result.data[7], expected.data[7]);
}

TEST(test_new_field, to_montgomery_form)
{
    barretenberg::fr::field_t result = barretenberg::fr::to_montgomery_form({ { 1, 2, 3, 4 } });
    testField expected{ 1, 2, 3, 4 };
    expected = expected.to_montgomery_form();
    EXPECT_EQ(result.data[0], expected.data[0]);
    EXPECT_EQ(result.data[1], expected.data[1]);
    EXPECT_EQ(result.data[2], expected.data[2]);
    EXPECT_EQ(result.data[3], expected.data[3]);
}

TEST(test_new_field, multiply)
{
    testField a = get_pseudorandom_element();
    testField b = get_pseudorandom_element();

    fr::field_t alt_a{ a.data[0], a.data[1], a.data[2], a.data[3] };
    fr::field_t alt_b{ b.data[0], b.data[1], b.data[2], b.data[3] };

    fr::field_t t0;
    fr::field_t t1;
    t0 = alt_a + alt_b;
    t0.self_sqr();
    t1 = alt_a.sqr();
    t0.self_sub(t1);
    t1 = alt_b.sqr();
    t0.self_sub(t1);
    fr::field_t expected;
    expected = alt_a * alt_b;
    expected.self_add(expected);

    EXPECT_EQ((t0 == expected), true);
    // testField result = a * b;

    // EXPECT_EQ(result.data[0], expected.data[0]);
    // EXPECT_EQ(result.data[1], expected.data[1]);
    // EXPECT_EQ(result.data[2], expected.data[2]);
    // EXPECT_EQ(result.data[3], expected.data[3]);
    testField c = (a + b) * (a + b) - (a * a) - (b * b);
    testField d = (a * b) + (a * b);

    EXPECT_EQ(c.data[0], expected.data[0]);
    EXPECT_EQ(c.data[1], expected.data[1]);
    EXPECT_EQ(c.data[2], expected.data[2]);
    EXPECT_EQ(c.data[3], expected.data[3]);
    EXPECT_EQ(c.from_montgomery_form(), d.from_montgomery_form());
}