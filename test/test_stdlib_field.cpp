#include <gtest/gtest.h>

#include <barretenberg/waffle/composer/standard_composer.hpp>
#include <barretenberg/waffle/proof_system/preprocess.hpp>
#include <barretenberg/waffle/proof_system/widgets/arithmetic_widget.hpp>
#include <barretenberg/waffle/proof_system/prover/prover.hpp>
#include <barretenberg/waffle/proof_system/verifier/verifier.hpp>

#include <barretenberg/polynomials/polynomial_arithmetic.hpp>

#include <barretenberg/waffle/stdlib/field/field.hpp>

#include <memory>


using namespace barretenberg;
using namespace plonk;

typedef stdlib::field_t<waffle::StandardComposer> field_t;

void fibbonaci(waffle::StandardComposer &composer)
{
    field_t a(&composer, stdlib::witness_t(fr::one()));
    field_t b(&composer, stdlib::witness_t(fr::one()));

    field_t c = a + b;
    
    for (size_t i = 0; i < 17; ++i)
    {
        b = a;
        a = c;
        c = a + b;
    }
}

uint64_t fidget(waffle::StandardComposer &composer)
{
    field_t a(&composer, stdlib::witness_t(fr::one())); // a is a legit wire value in our circuit
    field_t b(&composer, (fr::one()));                // b is just a constant, and should not turn up as a wire value in our circuit

     // this shouldn't create a constraint - we just need to scale the addition/multiplication gates that `a` is involved in
     // c should point to the same wire value as a
    field_t c = a + b;
    field_t d(&composer, fr::multiplicative_generator());   // like b, d is just a constant and not a wire value

    // by this point, we shouldn't have added any constraints in our circuit
    for (size_t i = 0; i < 17; ++i)
    {
        c = c * d; // shouldn't create a constraint - just scales up c (which points to same wire value as a)
        c = c - d; // shouldn't create a constraint - just adds a constant term into c's gates
        c = c * a; // will create a constraint - both c and a are wires in our circuit (the same wire actually, so this is a square-ish gate)
    }

    // run the same computation using normal types so we can compare the output
    uint64_t aa = 1;
    uint64_t bb = 1;
    uint64_t cc = aa + bb;
    uint64_t dd = 5;
    for (size_t i = 0; i < 17; ++i)
    {
        cc = cc * dd;
        cc = cc - dd;
        cc = cc * aa;
    }
    return cc;
}

TEST(stdlib_field, test_field_fibbonaci)
{
    waffle::StandardComposer composer = waffle::StandardComposer();

    fibbonaci(composer);

    waffle::Prover prover = composer.preprocess();

    EXPECT_EQ(fr::eq(fr::from_montgomery_form(prover.w_o[16]), {{ 4181, 0, 0, 0}}), true);
    EXPECT_EQ(prover.n, 32UL);
    waffle::Verifier verifier = waffle::preprocess(prover);

    waffle::plonk_proof proof = prover.construct_proof();

    bool result = verifier.verify_proof(proof);
    EXPECT_EQ(result, true);
}

TEST(stdlib_field, test_add_mul_with_constants)
{
    waffle::StandardComposer composer = waffle::StandardComposer();

    uint64_t expected = fidget(composer);

    waffle::Prover prover = composer.preprocess();

    EXPECT_EQ(fr::eq(fr::from_montgomery_form(prover.w_o[16]), {{ expected, 0, 0, 0}}), true);

    EXPECT_EQ(prover.n, 32UL);
    waffle::Verifier verifier = waffle::preprocess(prover);

    waffle::plonk_proof proof = prover.construct_proof();

    bool result = verifier.verify_proof(proof);
    EXPECT_EQ(result, true);
}