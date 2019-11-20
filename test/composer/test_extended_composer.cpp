#include <gtest/gtest.h>

#include <barretenberg/waffle/composer/extended_composer.hpp>
#include <barretenberg/waffle/proof_system/preprocess.hpp>
#include <barretenberg/waffle/proof_system/prover/prover.hpp>
#include <barretenberg/waffle/proof_system/verifier/verifier.hpp>
#include <barretenberg/waffle/proof_system/widgets/arithmetic_widget.hpp>

#include <barretenberg/polynomials/polynomial_arithmetic.hpp>
#include <barretenberg/waffle/stdlib/uint32/uint32.hpp>

#include <memory>

using namespace barretenberg;

typedef plonk::stdlib::uint32<waffle::ExtendedComposer> uint32;
typedef plonk::stdlib::witness_t<waffle::ExtendedComposer> witness_t;

TEST(extended_composer, test_combine_linear_relations_basic_add)
{
    waffle::ExtendedComposer composer = waffle::ExtendedComposer();

    fr::field_t wires[7]{ fr::one(), fr::one(), fr::one(), fr::one(), fr::one(), fr::one(), fr::one() };
    uint32_t wire_indices[7]{ composer.add_variable(wires[0]), composer.add_variable(wires[1]),
                              composer.add_variable(wires[2]), composer.add_variable(wires[3]),
                              composer.add_variable(wires[4]), composer.add_variable(wires[5]),
                              composer.add_variable(wires[6]) };
    composer.create_add_gate(
        { wire_indices[0], wire_indices[1], wire_indices[2], fr::one(), fr::one(), fr::neg_one(), fr::zero() });
    composer.create_add_gate(
        { wire_indices[2], wire_indices[3], wire_indices[4], fr::one(), fr::one(), fr::neg_one(), fr::zero() });
    composer.create_add_gate(
        { wire_indices[4], wire_indices[5], wire_indices[6], fr::one(), fr::one(), fr::neg_one(), fr::zero() });

    composer.combine_linear_relations();

    EXPECT_EQ(composer.deleted_gates[0], false);
    EXPECT_EQ(composer.deleted_gates[1], true);
    EXPECT_EQ(composer.deleted_gates[2], false);
    EXPECT_EQ(composer.deleted_gates.size(), 3UL);
}

TEST(extended_composer, test_combine_linear_relations_basic_mul_add)
{
    waffle::ExtendedComposer composer = waffle::ExtendedComposer();

    fr::field_t wires[7]{ fr::one(), fr::one(), fr::one(), fr::one(), fr::one(), fr::one(), fr::one() };
    uint32_t wire_indices[7]{ composer.add_variable(wires[0]), composer.add_variable(wires[1]),
                              composer.add_variable(wires[2]), composer.add_variable(wires[3]),
                              composer.add_variable(wires[4]), composer.add_variable(wires[5]),
                              composer.add_variable(wires[6]) };
    composer.create_mul_gate(
        { wire_indices[0], wire_indices[1], wire_indices[2], fr::one(), fr::neg_one(), fr::zero() });
    composer.create_add_gate(
        { wire_indices[2], wire_indices[3], wire_indices[4], fr::one(), fr::one(), fr::neg_one(), fr::zero() });
    composer.create_add_gate(
        { wire_indices[4], wire_indices[5], wire_indices[6], fr::one(), fr::one(), fr::neg_one(), fr::zero() });

    composer.combine_linear_relations();

    EXPECT_EQ(composer.deleted_gates[0], false);
    EXPECT_EQ(composer.deleted_gates[1], true);
    EXPECT_EQ(composer.deleted_gates[2], false);
    EXPECT_EQ(composer.deleted_gates.size(), 3UL);
}

TEST(extended_composer, test_combine_linear_relations_uint32)
{
    waffle::ExtendedComposer composer = waffle::ExtendedComposer();

    uint32 a = witness_t(&composer, 100U);
    composer.combine_linear_relations();

    EXPECT_EQ(composer.deleted_gates[0], false);
    EXPECT_EQ(composer.deleted_gates[1], true);
    EXPECT_EQ(composer.deleted_gates[2], false);
    EXPECT_EQ(composer.deleted_gates[3], true);
    EXPECT_EQ(composer.deleted_gates[4], false);
    EXPECT_EQ(composer.deleted_gates[5], true);
    EXPECT_EQ(composer.deleted_gates[6], false);
    EXPECT_EQ(composer.deleted_gates[7], true);
    EXPECT_EQ(composer.deleted_gates[8], false);
    EXPECT_EQ(composer.deleted_gates[9], true);
    EXPECT_EQ(composer.deleted_gates[10], false);
    EXPECT_EQ(composer.deleted_gates[11], true);
    EXPECT_EQ(composer.deleted_gates[12], false);
    EXPECT_EQ(composer.deleted_gates[13], true);
    EXPECT_EQ(composer.deleted_gates[14], false);
    EXPECT_EQ(composer.deleted_gates[15], true);
    EXPECT_EQ(composer.deleted_gates[16], false);
    EXPECT_EQ(composer.deleted_gates[17], true);
    EXPECT_EQ(composer.deleted_gates[18], false);
    EXPECT_EQ(composer.deleted_gates[19], true);
    EXPECT_EQ(composer.deleted_gates[20], false);
    EXPECT_EQ(composer.deleted_gates[21], true);
    EXPECT_EQ(composer.deleted_gates[22], false);
    EXPECT_EQ(composer.deleted_gates[23], true);
    EXPECT_EQ(composer.deleted_gates[24], false);
    EXPECT_EQ(composer.deleted_gates[25], true);
    EXPECT_EQ(composer.deleted_gates[26], false);
    EXPECT_EQ(composer.deleted_gates[27], true);
    EXPECT_EQ(composer.deleted_gates[28], false);
    EXPECT_EQ(composer.deleted_gates[29], true);
    EXPECT_EQ(composer.deleted_gates[30], false);

    EXPECT_EQ(fr::from_montgomery_form(composer.q_l[0]).data[0], 1UL);
    EXPECT_EQ(fr::from_montgomery_form(composer.q_r[0]).data[0], 1UL << 1UL);
    EXPECT_EQ(fr::from_montgomery_form(composer.q_o[0]).data[0], 1UL << 2UL);
    EXPECT_EQ(fr::eq(composer.q_oo[0], fr::neg_one()), true);
    for (size_t i = 2; i < 30; i += 2)
    {
        uint64_t shift = static_cast<uint64_t>(i) + 1UL;
        EXPECT_EQ(fr::from_montgomery_form(composer.q_r[i]).data[0], 1UL << shift);
        EXPECT_EQ(fr::from_montgomery_form(composer.q_l[i]).data[0], 1UL << (shift + 1UL));
        EXPECT_EQ(fr::eq(composer.q_o[i], fr::one()), true);
        EXPECT_EQ(fr::eq(composer.q_oo[i], fr::neg_one()), true);
    }
    EXPECT_EQ(fr::eq(composer.q_l[30], fr::neg_one()), true);
    EXPECT_EQ(fr::from_montgomery_form(composer.q_r[30]).data[0], 1UL << 31UL);
    EXPECT_EQ(fr::from_montgomery_form(composer.q_o[30]).data[0], 1UL);
    EXPECT_EQ(fr::eq(composer.q_oo[30], fr::zero()), true);

    EXPECT_EQ(composer.deleted_gates.size(), 31UL);
}