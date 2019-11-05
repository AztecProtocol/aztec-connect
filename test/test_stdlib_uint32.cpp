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
    for (size_t i = 0; i < 100; ++i)
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

TEST(stdlib_uint32, test_xor)
{
    waffle::StandardComposer composer = waffle::StandardComposer();

    witness_t first_input(&composer, 0xa3b10422);
    witness_t second_input(&composer, 0xeac21343);

    uint32 a = first_input;
    uint32 b = second_input;
    uint32 c = a ^ b;
    for (size_t i = 0; i < 32; ++i)
    {
        b = a;
        a = c;
        c = a + b;
        a = c ^ a;
    }
    waffle::Prover prover = composer.preprocess();

    printf("prover gates = %lu\n", prover.n);
 
    waffle::Verifier verifier = waffle::preprocess(prover);

    waffle::plonk_proof proof = prover.construct_proof();

    bool result = verifier.verify_proof(proof);
    EXPECT_EQ(result, true);
}

TEST(stdlib_uint32s, test_and)
{
    waffle::StandardComposer composer = waffle::StandardComposer();

    witness_t first_input(&composer, 0xa3b10422);
    witness_t second_input(&composer, 0xeac21343);

    uint32 a = first_input;
    uint32 b = second_input;
    uint32 c = a + b;
    for (size_t i = 0; i <32; ++i)
    {
        b = a;
        a = c;
        c = a + b;
        a = c & a;
    }
    waffle::Prover prover = composer.preprocess();

    printf("prover gates = %lu\n", prover.n);
 
    waffle::Verifier verifier = waffle::preprocess(prover);

    waffle::plonk_proof proof = prover.construct_proof();

    bool result = verifier.verify_proof(proof);
    EXPECT_EQ(result, true);
}

TEST(stdlib_uint32, test_or)
{
    waffle::StandardComposer composer = waffle::StandardComposer();

    witness_t first_input(&composer, 0xa3b10422);
    witness_t second_input(&composer, 0xeac21343);

    uint32 a = first_input;
    uint32 b = second_input;
    uint32 c = a ^ b;
    for (size_t i = 0; i < 32; ++i)
    {
        b = a;
        a = c;
        c = a + b;
        a = c | a;
    }
    waffle::Prover prover = composer.preprocess();

    printf("prover gates = %lu\n", prover.n);
 
    waffle::Verifier verifier = waffle::preprocess(prover);

    waffle::plonk_proof proof = prover.construct_proof();

    bool result = verifier.verify_proof(proof);
    EXPECT_EQ(result, true);
}


TEST(stdlib_uint32, test_simple_circuit)
{
    waffle::StandardComposer composer = waffle::StandardComposer();

    witness_t inputs[8]{
        witness_t(&composer, 0x01020304U),
        witness_t(&composer, 0x0a0b0c0dU),
        witness_t(&composer, 0x1a2b3e4dU),
        witness_t(&composer, 0x03951bd3U),
        witness_t(&composer, 0x0e0fa3feU),
        witness_t(&composer, 0x01000000U),
        witness_t(&composer, 0x0f0eeea1U),
        witness_t(&composer, 0x12345678U)
    };
    std::vector<uint32> w;
    for (size_t i = 0; i < 64; ++i)
    {
        barretenberg::fr::field_t temp = barretenberg::fr::random_element();
        w.emplace_back(uint32(witness_t(&composer, static_cast<uint32_t>(temp.data[0]))));
    }
    uint32 zero_uint32(&composer, 0x00000000U);
    uint32 a = inputs[0];
    uint32 b = inputs[1];
    uint32 c = inputs[2];
    uint32 d = inputs[3];
    uint32 e = inputs[4];
    uint32 f = inputs[5];
    uint32 g = inputs[6];
    uint32 h = inputs[7];
    for (size_t i = 0; i < 64; ++i)
    {
        uint32 t0 = e.ror(7U);
        uint32 t1 = e.ror(11U);
        uint32 t2 = e.ror(25U);
        uint32 t3 = t0 ^ t1;
        uint32 S1 = t3 ^ t2;
        uint32 t4 = e & f;
        uint32 t5 = (~e) & g;
        uint32 ch = t4 ^ t5;

        uint32 temp1 = h + S1;
        temp1 = temp1 + ch;
        temp1 = temp1 + zero_uint32;
        temp1 = temp1 + w[i];

        uint32 t6 = a.ror(2U);
        uint32 t7 = a.ror(13U);
        uint32 t8 = a.ror(22U);

        uint32 t9 = t6 ^ t7;
        uint32 S0 = t9 ^ t8;

        uint32 t10 = a & b;
        uint32 t11 = a & c;
        uint32 t12 = b & c;
        uint32 t13 = t10 ^ t11;
        uint32 maj = t13 ^ t12;
        uint32 temp2 = S0 + maj;

        h = g;
        g = f;
        f = e;
        e = d + temp1;
        d = c;
        c = b;
        b = a;
        a = temp1 + temp2;
    }
    waffle::Prover prover = composer.preprocess();

    printf("prover gates = %lu\n", prover.n);
 
    waffle::Verifier verifier = waffle::preprocess(prover);

    waffle::plonk_proof proof = prover.construct_proof();

    bool result = verifier.verify_proof(proof);
    EXPECT_EQ(result, true);
}