#include <gtest/gtest.h>
#include <memory>

#include <barretenberg/waffle/composer/bool_composer.hpp>
#include <barretenberg/waffle/proof_system/preprocess.hpp>
#include <barretenberg/waffle/proof_system/prover/prover.hpp>
#include <barretenberg/waffle/proof_system/verifier/verifier.hpp>
#include <barretenberg/waffle/proof_system/widgets/arithmetic_widget.hpp>

#include <barretenberg/polynomials/polynomial_arithmetic.hpp>

#include <barretenberg/waffle/stdlib/bitarray/bitarray.hpp>
#include <barretenberg/waffle/stdlib/byte_array/byte_array.hpp>
#include <barretenberg/waffle/stdlib/common.hpp>
#include <barretenberg/waffle/stdlib/field/field.hpp>
#include <barretenberg/waffle/stdlib/uint32/uint32.hpp>

using namespace barretenberg;
using namespace plonk;

typedef stdlib::bool_t<waffle::BoolComposer> bool_t;
typedef stdlib::field_t<waffle::BoolComposer> field_t;
typedef stdlib::uint32<waffle::BoolComposer> uint32;
typedef stdlib::witness_t<waffle::BoolComposer> witness_t;
typedef stdlib::byte_array<waffle::BoolComposer> byte_array;

namespace {
inline uint32_t get_random_int()
{
    return static_cast<uint32_t>(barretenberg::fr::random_element().data[0]);
}
} // namespace

TEST(stdlib_byte_array, test_uint32)
{
    waffle::BoolComposer composer = waffle::BoolComposer();
    uint32 a = witness_t(&composer, 1UL);
    std::string expected = { 0x00, 0x00, 0x00, 0x01 };
    byte_array arr(&composer);
    arr.write(a);

    EXPECT_EQ(arr.size(), 4UL);
    EXPECT_EQ(arr.get_value(), expected);
}

TEST(stdlib_byte_array, test_reverse)
{
    waffle::BoolComposer composer = waffle::BoolComposer();
    uint32 a = witness_t(&composer, 1UL);
    std::string expected = { 0x04, 0x03, 0x02, 0x01 };
    byte_array arr(&composer, std::vector<uint8_t>{ 0x01, 0x02, 0x03, 0x04 });

    EXPECT_EQ(arr.size(), 4UL);
    EXPECT_EQ(arr.reverse().get_value(), expected);
}

TEST(stdlib_byte_array, test_uint32_input_output_consistency)
{
    waffle::BoolComposer composer = waffle::BoolComposer();

    uint32_t a_expected = get_random_int();
    uint32_t b_expected = get_random_int();

    uint32 a = witness_t(&composer, a_expected);
    uint32 b = witness_t(&composer, b_expected);

    byte_array arr(&composer);

    arr.write(a);
    arr.write(b);

    EXPECT_EQ(arr.size(), 8UL);

    uint32 a_result(arr.slice(0, 4));
    uint32 b_result(arr.slice(4));

    EXPECT_EQ(a_result.get_value(), a_expected);
    EXPECT_EQ(b_result.get_value(), b_expected);
}

TEST(stdlib_byte_array, test_field_t_input_output_consistency)
{
    waffle::BoolComposer composer = waffle::BoolComposer();

    fr::field_t a_expected = fr::random_element();
    fr::field_t b_expected = fr::random_element();

    field_t a = witness_t(&composer, a_expected);
    field_t b = witness_t(&composer, b_expected);

    byte_array arr(&composer);

    arr.write(a);
    arr.write(b);

    EXPECT_EQ(arr.size(), 64UL);

    field_t a_result(arr.slice(0, 32));
    field_t b_result(arr.slice(32));

    EXPECT_EQ(a_result.get_value(), a_expected);
    EXPECT_EQ(b_result.get_value(), b_expected);
}

TEST(stdlib_byte_array, test_string_constructor)
{
    waffle::BoolComposer composer = waffle::BoolComposer();
    std::string a = "ascii";
    byte_array arr(&composer, a);
    EXPECT_EQ(arr.get_value(), a);
}

TEST(stdlib_byte_array, test_ostream_operator)
{
    waffle::BoolComposer composer = waffle::BoolComposer();
    std::string a = "\1\2\3a";
    byte_array arr(&composer, a);
    std::ostringstream os;
    os << arr;
    EXPECT_EQ(os.str(), "[ 01 02 03 61 ]");
}
