#include <barretenberg/noir/compiler.hpp>
#include <barretenberg/noir/parse.hpp>
#include <barretenberg/noir/printer.hpp>
#include <barretenberg/waffle/composer/bool_composer.hpp>
#include <gtest/gtest.h>

using namespace barretenberg;

TEST(noir, parses)
{
    auto ast = noir::parse("bool a = ~true;");

    waffle::BoolComposer composer = waffle::BoolComposer();
    auto compiler = noir::code_gen::compiler(composer);
    auto prover = compiler.start(ast);

    EXPECT_EQ(fr::eq(fr::from_montgomery_form(prover.w_l[0]), { { 1, 0, 0, 0 } }), true);
}

TEST(noir, parse_fails)
{
    EXPECT_THROW(noir::parse("1 + 2; blah"), std::runtime_error);
}

TEST(noir, bool)
{
    std::string code = "                      \n\
      bool a = ~true;                         \n\
      bool b = ~false;                        \n\
      a = a ^ b;         // a = 1             \n\
      b = !b;            // b = 1 (witness 0) \n\
      bool c = (a == b); // c = 1             \n\
      bool d = false;    // d = 0             \n\
      bool e = a | d;    // e = 1 = a         \n\
      bool f = e ^ b;    // f = 0             \n\
      d = (!f) & a;      // d = 1             \n\
    ";
    auto ast = noir::parse(code);

    waffle::StandardComposer composer = waffle::StandardComposer();
    auto compiler = noir::code_gen::compiler(composer);
    auto prover = compiler.start(ast);

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

    EXPECT_EQ(prover.n, 16UL);
}
