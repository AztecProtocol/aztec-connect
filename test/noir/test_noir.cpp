#include <gtest/gtest.h>

#include <barretenberg/noir/parse.hpp>

TEST(noir, parses) {
    auto ast = noir::parse("var a = 2 + 2;");
    EXPECT_EQ(true, true);
}

/*
TEST(dsl, parse_fails) {
    EXPECT_THROW(evaluate("1 + 2; blah"), std::runtime_error);
}

TEST(dsl, bool) {
    std::string code = "                      \
      bool a = true;                          \
      bool b = false;                         \
      a = a ^ b;         // a = 1             \
      b = !b;            // b = 1 (witness 0) \
      bool c = (a == b); // c = 1             \
      bool d;            // d = ?             \
      d = false;         // d = 0             \
      bool e = a | d;    // e = 1 = a         \
      bool f = e ^ b;    // f = 0             \
      d = (!f) & a;      // d = 1             \
    ";
}
*/