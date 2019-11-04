#include <gtest/gtest.h>

#include <barretenberg/waffle/composer/standard_composer.hpp>
#include <barretenberg/waffle/proof_system/preprocess.hpp>
#include <barretenberg/waffle/proof_system/widgets/arithmetic_widget.hpp>
#include <barretenberg/waffle/proof_system/prover/prover.hpp>
#include <barretenberg/waffle/proof_system/verifier/verifier.hpp>

#include <barretenberg/polynomials/polynomial_arithmetic.hpp>

#include <barretenberg/waffle/stdlib/common.hpp>
#include <barretenberg/waffle/stdlib/bool/bool.hpp>

#include <memory>


using namespace barretenberg;
using namespace plonk;

typedef stdlib::bool_t<waffle::StandardComposer> bool_t;


TEST(stdlib_bool, test_basic_operations)
{
    waffle::StandardComposer composer = waffle::StandardComposer();
    bool_t a(&composer);
    bool_t b(&composer);
    a = stdlib::witness_t(&composer, barretenberg::fr::one());
    b = stdlib::witness_t(&composer, barretenberg::fr::zero());
    a = a ^ b; // a = 1
    b = !b;   // b = 1 (witness 0)
    bool_t c = (a == b); // c = 1
    bool_t d(&composer); // d = ?
    d = false;           // d = 0
    bool_t e = a | d;   // e = 1 = a
    bool_t f = e ^ b;  // f = 0
    d = (!f) & a; // d = 1
    waffle::Prover prover = composer.preprocess();

    EXPECT_EQ(fr::eq(fr::from_montgomery_form(prover.w_l[0]), {{ 1, 0, 0, 0 }}), true);
    EXPECT_EQ(fr::eq(fr::from_montgomery_form(prover.w_r[0]), {{ 1, 0, 0, 0 }}), true);
    EXPECT_EQ(fr::eq(fr::from_montgomery_form(prover.w_o[0]), {{ 1, 0, 0, 0 }}), true);

    EXPECT_EQ(fr::eq(fr::from_montgomery_form(prover.w_l[1]), {{ 0, 0, 0, 0 }}), true);
    EXPECT_EQ(fr::eq(fr::from_montgomery_form(prover.w_r[1]), {{ 0, 0, 0, 0 }}), true);
    EXPECT_EQ(fr::eq(fr::from_montgomery_form(prover.w_o[1]), {{ 0, 0, 0, 0 }}), true);

    EXPECT_EQ(fr::eq(fr::from_montgomery_form(prover.w_l[2]), {{ 1, 0, 0, 0 }}), true);
    EXPECT_EQ(fr::eq(fr::from_montgomery_form(prover.w_r[2]), {{ 0, 0, 0, 0 }}), true);
    EXPECT_EQ(fr::eq(fr::from_montgomery_form(prover.w_o[2]), {{ 1, 0, 0, 0 }}), true);

    EXPECT_EQ(fr::eq(fr::from_montgomery_form(prover.w_l[3]), {{ 1, 0, 0, 0 }}), true);
    EXPECT_EQ(fr::eq(fr::from_montgomery_form(prover.w_r[3]), {{ 0, 0, 0, 0 }}), true);
    EXPECT_EQ(fr::eq(fr::from_montgomery_form(prover.w_o[3]), {{ 1, 0, 0, 0 }}), true);

    EXPECT_EQ(fr::eq(fr::from_montgomery_form(prover.w_l[4]), {{ 1, 0, 0, 0 }}), true);
    EXPECT_EQ(fr::eq(fr::from_montgomery_form(prover.w_r[4]), {{ 0, 0, 0, 0 }}), true);
    EXPECT_EQ(fr::eq(fr::from_montgomery_form(prover.w_o[4]), {{ 0, 0, 0, 0 }}), true);

    EXPECT_EQ(fr::eq(fr::from_montgomery_form(prover.w_l[5]), {{ 0, 0, 0, 0 }}), true);
    EXPECT_EQ(fr::eq(fr::from_montgomery_form(prover.w_r[5]), {{ 1, 0, 0, 0 }}), true);
    EXPECT_EQ(fr::eq(fr::from_montgomery_form(prover.w_o[5]), {{ 1, 0, 0, 0 }}), true);

    EXPECT_EQ(prover.n, 8UL);
    // waffle::Verifier verifier = waffle::preprocess(prover);

    // waffle::plonk_proof proof = prover.construct_proof();

    // bool result = verifier.verify_proof(proof);
    // EXPECT_EQ(result, true);
}
