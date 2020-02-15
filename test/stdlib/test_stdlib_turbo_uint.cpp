#include <gtest/gtest.h>

#include <barretenberg/waffle/composer/turbo_composer.hpp>
#include <barretenberg/waffle/proof_system/preprocess.hpp>
#include <barretenberg/waffle/proof_system/prover/prover.hpp>
#include <barretenberg/waffle/proof_system/verifier/verifier.hpp>

#include <barretenberg/waffle/stdlib/common.hpp>
#include <barretenberg/waffle/stdlib/turbo_uint/uint.hpp>
#include <barretenberg/waffle/stdlib/bool/bool.hpp>

#include <iostream>
#include <memory>

using namespace barretenberg;
using namespace plonk;

typedef stdlib::bool_t<waffle::TurboComposer> bool_t;
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


TEST(stdlib_turbo_uint32, test_mul)
{
    waffle::TurboComposer composer = waffle::TurboComposer();

    const auto mul_integers = [&composer](bool lhs_constant = false, bool rhs_constant = false)
    {
        uint32_t a_val = get_random_int();
        uint32_t b_val = get_random_int();
        uint32_t const_a = get_random_int();
        uint32_t const_b = get_random_int();
        uint32_t expected = (a_val + const_a) * (b_val + const_b);
        uint32 a = lhs_constant ? uint32(&composer, a_val) : witness_t(&composer, a_val);
        uint32 b = rhs_constant ? uint32(&composer, b_val) : witness_t(&composer, b_val);
        uint32 a_shift = uint32(&composer, const_a);
        uint32 b_shift = uint32(&composer, const_b);
        uint32 c = a + a_shift;
        uint32 d = b + b_shift;
        uint32 e = c * d;
        e = e.normalize();

        uint32_t result = uint32_t(e.get_value());

        EXPECT_EQ(result, expected);
    };
        
    mul_integers(false, false);
    mul_integers(false, true);
    mul_integers(true, false);
    mul_integers(true, true);


    waffle::TurboProver prover = composer.preprocess();

    printf("composer gates = %zu\n", composer.get_num_gates());
    waffle::TurboVerifier verifier = composer.create_verifier();

    waffle::plonk_proof proof = prover.construct_proof();

    bool proof_result = verifier.verify_proof(proof);
    EXPECT_EQ(proof_result, true);
}


TEST(stdlib_turbo_uint32, test_gt)
{
    waffle::TurboComposer composer = waffle::TurboComposer();

    const auto compare_integers = [&composer](bool force_equal = false, bool force_gt = false, bool force_lt = false)
    {
        uint32_t const_a = get_random_int();
        uint32_t const_b = get_random_int();
        uint32_t a_val = get_random_int();
        uint32_t b_val;
        if (force_equal)
        {
            b_val = a_val + const_a - const_b;
        }
        else if (force_lt)
        {
            b_val = (a_val + const_a - const_b) ? a_val + const_a - const_b - 1 : const_a - const_b + (a_val++);
        }
        else if (force_gt)
        {
            b_val = (a_val + const_a - const_b) == UINT32_MAX ? const_a - const_b + (a_val--) : a_val - const_b + const_a + 1;
        }
        else
        {
            b_val = get_random_int();
        }
        bool expected = (b_val + const_b) > (a_val + const_a); 
        uint32 a = witness_t(&composer, a_val);
        uint32 b = witness_t(&composer, b_val);
        uint32 a_shift = uint32(&composer, const_a);
        uint32 b_shift = uint32(&composer, const_b);
        uint32 c = a + a_shift;
        uint32 d = b + b_shift;
        bool_t e = d > c;
        bool result = bool(e.get_value());

        EXPECT_EQ(result, expected);
    };

    compare_integers(false, false, false);
    compare_integers(false, false, false);
    compare_integers(false, false, false);
    compare_integers(false, false, false);
    compare_integers(false, false, true);
    compare_integers(false, true, false);
    compare_integers(true, false, false);
    compare_integers(false, false, true);
    compare_integers(false, true, false);
    compare_integers(true, false, false);

    waffle::TurboProver prover = composer.preprocess();

    printf("composer gates = %zu\n", composer.get_num_gates());
    waffle::TurboVerifier verifier = composer.create_verifier();

    waffle::plonk_proof proof = prover.construct_proof();

    bool proof_result = verifier.verify_proof(proof);
    EXPECT_EQ(proof_result, true);
}