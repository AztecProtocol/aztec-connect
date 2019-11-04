#include <gtest/gtest.h>

#include <barretenberg/waffle/composer/standard_composer.hpp>
#include <barretenberg/waffle/proof_system/preprocess.hpp>
#include <barretenberg/waffle/proof_system/widgets/arithmetic_widget.hpp>
#include <barretenberg/waffle/proof_system/prover/prover.hpp>
#include <barretenberg/waffle/proof_system/verifier/verifier.hpp>

#include <barretenberg/polynomials/polynomial_arithmetic.hpp>

#include <barretenberg/waffle/stdlib/common.hpp>
#include <barretenberg/waffle/stdlib/uint32/uint32.hpp>

#include <memory>


using namespace barretenberg;
using namespace plonk;

typedef stdlib::uint32<waffle::StandardComposer> uint32;
typedef stdlib::witness_t<waffle::StandardComposer> witness_t;

TEST(stdlib_uint32, test_add)
{
    waffle::StandardComposer composer = waffle::StandardComposer();

    witness_t first_input(&composer, 1U);
    witness_t second_input(&composer, 0U);

    uint32 a = first_input;
    uint32 b = second_input;
    uint32 c = a + b;
    for (size_t i = 0; i < 32; ++i)
    {
        b = a;
        a = c;
        c = a + b;
    }
    waffle::Prover prover = composer.preprocess();

    printf("prover gates = %lu\n", prover.n);
 
    waffle::Verifier verifier = waffle::preprocess(prover);

    waffle::plonk_proof proof = prover.construct_proof();

    bool result = verifier.verify_proof(proof);
    EXPECT_EQ(result, true);
}


TEST(stdlib_uint32, test_mul)
{
    waffle::StandardComposer composer = waffle::StandardComposer();

    witness_t first_input(&composer, 1U);
    witness_t second_input(&composer, 2U);

    uint32 a = first_input;
    uint32 b = second_input;
    uint32 c = a + b;
    for (size_t i = 0; i < 32; ++i)
    {
        b = a;
        a = c;
        c = a * b;
    }
    waffle::Prover prover = composer.preprocess();

    printf("prover gates = %lu\n", prover.n);
 
    waffle::Verifier verifier = waffle::preprocess(prover);

    waffle::plonk_proof proof = prover.construct_proof();

    bool result = verifier.verify_proof(proof);
    EXPECT_EQ(result, true);
}
