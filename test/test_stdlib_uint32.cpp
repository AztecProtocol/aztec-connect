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
    uint32_t a_expected = 1U;
    uint32_t b_expected = 2U;
    uint32_t c_expected = a_expected + b_expected;
    for (size_t i = 0; i < 100; ++i)
    {
        b_expected = a_expected;
        a_expected = c_expected;
        c_expected = a_expected * b_expected;
    }

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
    c.decompose();
    uint32_t c_result = static_cast<uint32_t>(barretenberg::fr::from_montgomery_form(composer.get_variable(c.witness_index)).data[0]);
    EXPECT_EQ(c_result, c_expected);
    waffle::Prover prover = composer.preprocess();

    printf("prover gates = %lu\n", prover.n);
 
    waffle::Verifier verifier = waffle::preprocess(prover);

    waffle::plonk_proof proof = prover.construct_proof();

    bool result = verifier.verify_proof(proof);
    EXPECT_EQ(result, true);
}

TEST(stdlib_uint32, test_xor)
{
    uint32_t a_expected = 0xa3b10422;
    uint32_t b_expected = 0xeac21343;
    uint32_t c_expected = a_expected ^ b_expected;
    for (size_t i = 0; i < 32; ++i)
    {
        b_expected = a_expected;
        a_expected = c_expected;
        c_expected = a_expected + b_expected;
        a_expected = c_expected ^ a_expected;
    }

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
    a.concatenate();
    uint32_t a_result = static_cast<uint32_t>(barretenberg::fr::from_montgomery_form(composer.get_variable(a.witness_index)).data[0]);
    EXPECT_EQ(a_result, a_expected);
    waffle::Prover prover = composer.preprocess();

    printf("prover gates = %lu\n", prover.n);
 
    waffle::Verifier verifier = waffle::preprocess(prover);

    waffle::plonk_proof proof = prover.construct_proof();

    bool result = verifier.verify_proof(proof);
    EXPECT_EQ(result, true);
}

TEST(stdlib_uint32s, test_and)
{
    uint32_t a_expected = 0xa3b10422;
    uint32_t b_expected = 0xeac21343;
    uint32_t c_expected = a_expected + b_expected;
    for (size_t i = 0; i < 32; ++i)
    {
        b_expected = a_expected;
        a_expected = c_expected;
        c_expected = a_expected + b_expected;
        a_expected = c_expected & a_expected;
    }

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
    a.concatenate();
    uint32_t a_result = static_cast<uint32_t>(barretenberg::fr::from_montgomery_form(composer.get_variable(a.witness_index)).data[0]);
    EXPECT_EQ(a_result, a_expected);

    waffle::Prover prover = composer.preprocess();

    printf("prover gates = %lu\n", prover.n);
 
    waffle::Verifier verifier = waffle::preprocess(prover);

    waffle::plonk_proof proof = prover.construct_proof();

    bool result = verifier.verify_proof(proof);
    EXPECT_EQ(result, true);
}

TEST(stdlib_uint32, test_or)
{
    uint32_t a_expected = 0xa3b10422;
    uint32_t b_expected = 0xeac21343;
    uint32_t c_expected = a_expected ^ b_expected;
    for (size_t i = 0; i < 32; ++i)
    {
        b_expected = a_expected;
        a_expected = c_expected;
        c_expected = a_expected + b_expected;
        a_expected = c_expected | a_expected;
    }

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
    a.concatenate();
    uint32_t a_result = static_cast<uint32_t>(barretenberg::fr::from_montgomery_form(composer.get_variable(a.witness_index)).data[0]);
    EXPECT_EQ(a_result, a_expected);

    waffle::Prover prover = composer.preprocess();

    printf("prover gates = %lu\n", prover.n);
 
    waffle::Verifier verifier = waffle::preprocess(prover);

    waffle::plonk_proof proof = prover.construct_proof();

    bool result = verifier.verify_proof(proof);
    EXPECT_EQ(result, true);
}


uint32_t rotate(uint32_t value, size_t rotation)
{
    return (value >> rotation) + (value << (32 - rotation));
}

TEST(stdlib_uint32, test_ror)
{
    uint32_t a_expected = 0xa3b10422;
    uint32_t b_expected = 0xeac21343;
    uint32_t c_expected = a_expected ^ b_expected;
    for (size_t i = 0; i < 32; ++i)
    {
        b_expected = a_expected;
        a_expected = c_expected;
        c_expected = a_expected + b_expected;
        a_expected = rotate(c_expected, i % 31) + rotate(a_expected, (i + 1) % 31);
    }

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
        a = c.ror(static_cast<uint32_t>(i % 31)) + a.ror(static_cast<uint32_t>((i + 1) % 31));
    }
    a.decompose();
    uint32_t a_result = static_cast<uint32_t>(barretenberg::fr::from_montgomery_form(composer.get_variable(a.witness_index)).data[0]);
    EXPECT_EQ(a_result, a_expected);

    waffle::Prover prover = composer.preprocess();

    printf("prover gates = %lu\n", prover.n);
 
    waffle::Verifier verifier = waffle::preprocess(prover);

    waffle::plonk_proof proof = prover.construct_proof();

    bool result = verifier.verify_proof(proof);
    EXPECT_EQ(result, true);
}

uint32_t k_constants[64]{
   0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
   0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
   0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
   0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
   0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
   0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
   0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
   0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
};

TEST(stdlib_uint32, test_sha256_rounds)
{
    waffle::StandardComposer composer = waffle::StandardComposer();

    std::vector<uint32> w;
    std::vector<uint32> k;
    for (size_t i = 0; i < 64; ++i)
    {
        w.emplace_back(uint32(witness_t(&composer, static_cast<uint32_t>(barretenberg::fr::random_element().data[0]))));
        k.emplace_back(uint32(&composer, k_constants[i]));
    }
    uint32 a = witness_t(&composer, 0x01020304U);
    uint32 b = witness_t(&composer, 0x0a0b0c0dU);
    uint32 c = witness_t(&composer, 0x1a2b3e4dU);
    uint32 d = witness_t(&composer, 0x03951bd3U);
    uint32 e = witness_t(&composer, 0x0e0fa3feU);
    uint32 f = witness_t(&composer, 0x01000000U);
    uint32 g = witness_t(&composer, 0x0f0eeea1U);
    uint32 h = witness_t(&composer, 0x12345678U);
    for (size_t i = 0; i < 64; ++i)
    {
        uint32 S1 = e.ror(7U) ^ e.ror(11U) ^ e.ror(25U);
        uint32 ch = (e & f) ^ ((~e) & g);
        uint32 temp1 = h + S1 + ch + k[i] + w[i];

        uint32 S0 = a.ror(2U) ^ a.ror(13U) ^ a.ror(22U);
        uint32 maj = (a & b) ^ (a & c) ^ (b & c);
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