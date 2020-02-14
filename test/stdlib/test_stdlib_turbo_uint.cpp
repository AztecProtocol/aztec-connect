#include <gtest/gtest.h>

#include <barretenberg/waffle/composer/turbo_composer.hpp>
#include <barretenberg/waffle/proof_system/preprocess.hpp>
#include <barretenberg/waffle/proof_system/prover/prover.hpp>
#include <barretenberg/waffle/proof_system/verifier/verifier.hpp>

#include <barretenberg/waffle/stdlib/common.hpp>
#include <barretenberg/waffle/stdlib/turbo_uint/uint.hpp>

#include <iostream>
#include <memory>

using namespace barretenberg;
using namespace plonk;

typedef stdlib::uint<waffle::TurboComposer, 32> uint32;
typedef stdlib::witness_t<waffle::TurboComposer> witness_t;


#include <random>

namespace
{
std::mt19937 engine;
std::uniform_int_distribution<uint32_t> dist{ 0ULL, UINT32_MAX };

const auto init = []() {
    // std::random_device rd{};
    std::seed_seq seed2{ 1, 2, 3, 4, 5, 6, 7, 8 };
    engine = std::mt19937(seed2);
    return 1;
}();

uint32_t get_pseudorandom_uint32()
{
    return dist(engine);
}
}


namespace {
uint32_t get_random_int()
{
    return static_cast<uint32_t>(barretenberg::fr::random_element().data[0]);
}
} // namespace


TEST(stdlib_turbo_uint32, test_add)
{
    waffle::TurboComposer composer = waffle::TurboComposer();

    const auto add_integers = [&composer](bool lhs_constant = false, bool rhs_constant = false)
    {
        uint32_t a_val = get_random_int();
        uint32_t b_val = get_random_int();
        uint32_t expected = a_val + b_val;
        uint32 a = lhs_constant ? uint32(&composer, a_val) : witness_t(&composer, a_val);
        uint32 b = rhs_constant ? uint32(&composer, b_val) : witness_t(&composer, b_val);
        uint32 c = a + b;
        c = c.normalize();

        uint32_t result = uint32_t(c.get_value());

        EXPECT_EQ(result, expected);
    };
        
    add_integers(false, false);
    add_integers(false, true);
    add_integers(true, false);
    add_integers(true, true);


    waffle::TurboProver prover = composer.preprocess();

    printf("composer gates = %zu\n", composer.get_num_gates());
    waffle::TurboVerifier verifier = composer.create_verifier();

    waffle::plonk_proof proof = prover.construct_proof();

    bool proof_result = verifier.verify_proof(proof);
    EXPECT_EQ(proof_result, true);
}


TEST(stdlib_turbo_uint32, test_sub)
{
    waffle::TurboComposer composer = waffle::TurboComposer();

    const auto sub_integers = [&composer](bool lhs_constant = false, bool rhs_constant = false)
    {
        uint32_t a_val = get_random_int();
        uint32_t b_val = get_random_int();
        uint32_t const_shift_val = get_random_int();
        uint32_t expected = a_val - (b_val + const_shift_val);
        uint32 a = lhs_constant ? uint32(&composer, a_val) : witness_t(&composer, a_val);
        uint32 b = rhs_constant ? uint32(&composer, b_val) : witness_t(&composer, b_val);
        uint32 b_shift = uint32(&composer, const_shift_val);
        uint32 c = b + b_shift;
        uint32 d = a - c;
        d = d.normalize();

        uint32_t result = uint32_t(d.get_value());

        EXPECT_EQ(result, expected);
    };
        
    sub_integers(false, false);
    sub_integers(false, true);
    sub_integers(true, false);
    sub_integers(true, true);


    waffle::TurboProver prover = composer.preprocess();

    printf("composer gates = %zu\n", composer.get_num_gates());
    waffle::TurboVerifier verifier = composer.create_verifier();

    waffle::plonk_proof proof = prover.construct_proof();

    bool proof_result = verifier.verify_proof(proof);
    EXPECT_EQ(proof_result, true);
}