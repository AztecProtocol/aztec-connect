#include <barretenberg/noir/ast.hpp>
#include <barretenberg/noir/compiler/compiler.hpp>
#include <barretenberg/noir/parse.hpp>
#include <barretenberg/waffle/proof_system/preprocess.hpp>
#include <barretenberg/waffle/proof_system/verifier/verifier.hpp>
#include <fstream>
#include <gtest/gtest.h>

using namespace barretenberg;
using namespace noir::parser;
using namespace noir::code_gen;

TEST(noir, format_string)
{
    EXPECT_EQ(format("hello %s %d", "world", 123), "hello world 123");
}

TEST(noir, parse_fails)
{
    EXPECT_THROW(parse("1 + 2; blah"), std::runtime_error);
}

TEST(noir, uint_sizes)
{
    auto ast = parse("          \n\
        uint2 my_int2 = 0;      \n\
        uint3 my_int3 = 0;      \n\
        uint32 my_int32 = 0;    \n\
        uint64 my_int64 = 0;    \n\
    ");

    auto type_id = boost::get<noir::ast::variable_declaration>(ast[0]).type;
    auto int_type = boost::get<noir::ast::int_type>(type_id.type);
    EXPECT_EQ(int_type.size, 2UL);
}

TEST(noir, uint1_fail)
{
    EXPECT_THROW(parse("uint1 my_int1 = 0;"), std::runtime_error);
}

TEST(noir, uint65_fail)
{
    EXPECT_THROW(parse("uint65 my_int65 = 0;"), std::runtime_error);
}

TEST(noir, uint_indexing)
{
    std::string code = "            \n\
        uint32 main(uint32 a) {     \n\
            a[3 + 4] = true;        \n\
            a[30] = false;          \n\
            return a;               \n\
        }                           \n\
    ";
    auto ast = parse(code);

    auto composer = Composer();
    auto compiler = Compiler(composer);
    std::vector<var_t> inputs = { uint32(witness_t(&composer, 7ULL)) };
    auto r = compiler.start(ast, inputs);
    EXPECT_EQ(boost::get<noir::code_gen::uint>(r.first.value).get_value(), 16777221ULL);
}

TEST(noir, uint_vector_bit_indexing)
{
    std::string code = "            \n\
        uint32 main() {             \n\
            uint32[1] a = [0];      \n\
            a[0][31] = true;        \n\
            return a[0];            \n\
        }                           \n\
    ";
    auto ast = parse(code);

    auto composer = Composer();
    auto compiler = Compiler(composer);
    auto r = compiler.start(ast, {});
    EXPECT_EQ(boost::get<noir::code_gen::uint>(r.first.value).get_value(), 1ULL);
}

TEST(noir, function_definition)
{
    parse("uint32 my_function(uint32 arg1, bool arg2) {}");
}

TEST(noir, function_call)
{
    parse("bool x = my_function(arg1, 3+5+(x));");
}

TEST(noir, array_variable_definition)
{
    parse("uint32[4] my_var = [0x1, 0x12, 0x123, 0x1234];");
}

TEST(noir, array_expressions)
{
    parse_function_statements("uint32[4] my_var = [func_call(), 13, true];");
}

TEST(noir, array_index)
{
    parse_function_statements("my_var = some_array[5*3][1+2];");
}

TEST(noir, unary)
{
    parse_function_statements("my_var = !x;");
}

/*
TEST(noir, function_copy_by_value)
{
    // TODO: Include mutable keyword on b declaration.
    std::string code = "            \n\
        bool[2] main(bool[2] a) {   \n\
            bool[2] b = a;          \n\
            b[0] = true;            \n\
            return b;               \n\
        }                           \n\
    ";
    auto ast = parse(code);

    auto composer = Composer();
    auto compiler = Compiler(composer);
    std::vector<var_t> inputs = { std::vector<var_t>(2, bool_t(witness_t(&composer, false))) };
    auto r = compiler.start(ast, inputs);
    EXPECT_EQ(boost::get<bool_t>(inputs[0].value).value(), false);
}
*/

TEST(noir, bool_circuit)
{
    std::string code = "                      \n\
    bool main(bool a, bool b) {               \n\
      a = a ^ b;         // a = 1             \n\
      b = !b;            // b = 1 (witness 0) \n\
      bool c = (a == b); // c = 1             \n\
      bool d;            // d = ?             \n\
      d = false;         // d = 0             \n\
      bool e = a | d;    // e = 1 = a         \n\
      bool f = e ^ b;    // f = 0             \n\
      d = (!f) & a;      // d = 1             \n\
    }                                         \n\
    ";
    auto ast = parse(code);

    auto composer = Composer();
    auto compiler = Compiler(composer);
    std::vector<var_t> inputs = { bool_t(witness_t(&composer, true)), bool_t(witness_t(&composer, false)) };
    auto r = compiler.start(ast, inputs);
    auto prover = std::move(r.second);

    EXPECT_EQ(fr::eq(fr::from_montgomery_form(prover.w_l[0]), { { 1, 0, 0, 0 } }), true);
    EXPECT_EQ(fr::eq(fr::from_montgomery_form(prover.w_r[0]), { { 1, 0, 0, 0 } }), true);
    EXPECT_EQ(fr::eq(fr::from_montgomery_form(prover.w_o[0]), { { 1, 0, 0, 0 } }), true);

    EXPECT_EQ(fr::eq(fr::from_montgomery_form(prover.w_l[1]), { { 0, 0, 0, 0 } }), true);
    EXPECT_EQ(fr::eq(fr::from_montgomery_form(prover.w_r[1]), { { 0, 0, 0, 0 } }), true);
    EXPECT_EQ(fr::eq(fr::from_montgomery_form(prover.w_o[1]), { { 0, 0, 0, 0 } }), true);

    EXPECT_EQ(fr::eq(fr::from_montgomery_form(prover.w_l[2]), { { 1, 0, 0, 0 } }), true);
    EXPECT_EQ(fr::eq(fr::from_montgomery_form(prover.w_r[2]), { { 0, 0, 0, 0 } }), true);
    EXPECT_EQ(fr::eq(fr::from_montgomery_form(prover.w_o[2]), { { 1, 0, 0, 0 } }), true);

    EXPECT_EQ(fr::eq(fr::from_montgomery_form(prover.w_l[3]), { { 1, 0, 0, 0 } }), true);
    EXPECT_EQ(fr::eq(fr::from_montgomery_form(prover.w_r[3]), { { 0, 0, 0, 0 } }), true);
    EXPECT_EQ(fr::eq(fr::from_montgomery_form(prover.w_o[3]), { { 1, 0, 0, 0 } }), true);

    EXPECT_EQ(fr::eq(fr::from_montgomery_form(prover.w_l[4]), { { 1, 0, 0, 0 } }), true);
    EXPECT_EQ(fr::eq(fr::from_montgomery_form(prover.w_r[4]), { { 0, 0, 0, 0 } }), true);
    EXPECT_EQ(fr::eq(fr::from_montgomery_form(prover.w_o[4]), { { 0, 0, 0, 0 } }), true);

    EXPECT_EQ(fr::eq(fr::from_montgomery_form(prover.w_l[5]), { { 0, 0, 0, 0 } }), true);
    EXPECT_EQ(fr::eq(fr::from_montgomery_form(prover.w_r[5]), { { 1, 0, 0, 0 } }), true);
    EXPECT_EQ(fr::eq(fr::from_montgomery_form(prover.w_o[5]), { { 1, 0, 0, 0 } }), true);

    EXPECT_EQ(prover.n, 8UL);
}

TEST(noir, sha256)
{
    std::ifstream file("../test/noir/sha256.noir");
    std::string code((std::istreambuf_iterator<char>(file)), std::istreambuf_iterator<char>());
    auto ast = parse(code);

    auto composer = Composer();
    std::string nist1_str = "abc";

    std::vector<var_t> nist1;
    std::transform(nist1_str.begin(), nist1_str.end(), std::back_inserter(nist1), [&](char c) {
        return noir::code_gen::uint(8, witness_t(&composer, c));
    });

    std::cout << "circuit inputs " << nist1 << std::endl;

    auto compiler = Compiler(composer);
    auto r = compiler.start(ast, { var_t(nist1) });
    auto output_vars = boost::get<std::vector<var_t>>(r.first.value);
    std::vector<uint8_t> output;
    std::transform(output_vars.begin(), output_vars.end(), std::back_inserter(output), [](var_t const& v) {
        return static_cast<uint8_t>(boost::get<noir::code_gen::uint>(v.value).get_value());
    });

    std::vector<uint8_t> expected = {
        0xBA, 0x78, 0x16, 0xBF, 0x8F, 0x01, 0xCF, 0xEA, 0x41, 0x41, 0x40, 0xDE, 0x5D, 0xAE, 0x22, 0x23,
        0xB0, 0x03, 0x61, 0xA3, 0x96, 0x17, 0x7A, 0x9C, 0xB4, 0x10, 0xFF, 0x61, 0xF2, 0x00, 0x15, 0xAD,
    };

    EXPECT_EQ(output, expected);

    waffle::Verifier verifier = waffle::preprocess(r.second);
    waffle::plonk_proof proof = r.second.construct_proof();

    bool result = verifier.verify_proof(proof);
    EXPECT_EQ(result, true);
}