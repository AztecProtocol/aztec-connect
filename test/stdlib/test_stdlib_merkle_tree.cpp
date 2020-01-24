#include <gtest/gtest.h>

#include <barretenberg/waffle/composer/standard_composer.hpp>
#include <barretenberg/waffle/proof_system/preprocess.hpp>
#include <barretenberg/waffle/proof_system/prover/prover.hpp>
#include <barretenberg/waffle/proof_system/verifier/verifier.hpp>
#include <barretenberg/waffle/proof_system/widgets/arithmetic_widget.hpp>

#include <barretenberg/polynomials/polynomial_arithmetic.hpp>

#include <barretenberg/waffle/stdlib/field/field.hpp>
#include <barretenberg/waffle/stdlib/merkle_tree/merkle_tree.hpp>
#include <barretenberg/waffle/stdlib/mimc.hpp>

#include <memory>

using namespace barretenberg;
using namespace plonk;

typedef waffle::StandardComposer Composer;
typedef stdlib::field_t<Composer> field_t;
typedef stdlib::bool_t<Composer> bool_t;
typedef stdlib::merkle_tree::merkle_tree<Composer> merkle_tree;
typedef stdlib::witness_t<Composer> witness_t;

TEST(stdlib_merkle_tree, test_leveldb_update_member)
{
    leveldb::DestroyDB("/tmp/test_leveldb_update_member", leveldb::Options());
    stdlib::merkle_tree::LevelDbStore db("/tmp/test_leveldb_update_member", 3);

    for (size_t i = 0; i < 8; ++i) {
    }
    EXPECT_TRUE(fr::eq(db.get_element(0), { { 0, 0, 0, 0 } }));
    EXPECT_TRUE(fr::eq(db.get_element(1), { { 0, 0, 0, 0 } }));
    EXPECT_TRUE(fr::eq(db.get_element(2), { { 0, 0, 0, 0 } }));

    db.update_element(0, { { 0, 0, 0, 123 } });
    db.update_element(1, { { 0, 0, 0, 456 } });
    db.update_element(2, { { 0, 0, 0, 789 } });

    EXPECT_TRUE(fr::eq(db.get_element(0), { { 0, 0, 0, 123 } }));
    EXPECT_TRUE(fr::eq(db.get_element(1), { { 0, 0, 0, 456 } }));
    EXPECT_TRUE(fr::eq(db.get_element(2), { { 0, 0, 0, 789 } }));

    EXPECT_TRUE(
        fr::eq(db.root(), { { 0x93293aa570a48e82, 0x1f5cfeac4c9845f9, 0x3cdc2a192204d473, 0x0e3c1631c1346211 } }));
}

TEST(stdlib_merkle_tree, test_check_membership)
{
    Composer composer = Composer();

    witness_t zero = witness_t(&composer, 0);
    witness_t one = witness_t(&composer, 1);

    merkle_tree tree = merkle_tree(composer, 3);
    bool_t is_member = tree.check_membership(zero, zero);
    EXPECT_EQ(is_member.get_value(), true);

    waffle::Prover prover = composer.preprocess();
    printf("composer gates = %zu\n", composer.get_num_gates());

    waffle::Verifier verifier = waffle::preprocess(prover);

    waffle::plonk_proof proof = prover.construct_proof();

    bool result = verifier.verify_proof(proof);
    EXPECT_EQ(result, true);
}

TEST(stdlib_merkle_tree, test_assert_check_membership)
{
    Composer composer = Composer();

    witness_t zero = witness_t(&composer, 0);
    witness_t one = witness_t(&composer, 1);

    merkle_tree tree = merkle_tree(composer, 3);
    bool_t is_member = tree.assert_check_membership(one, zero);
    EXPECT_EQ(is_member.get_value(), false);

    waffle::Prover prover = composer.preprocess();

    waffle::Verifier verifier = waffle::preprocess(prover);

    waffle::plonk_proof proof = prover.construct_proof();

    bool result = verifier.verify_proof(proof);
    EXPECT_EQ(result, false);
}

TEST(stdlib_merkle_tree, test_add_member)
{
    Composer composer = Composer();
    size_t size = 8;
    std::vector<field_t> values(size);

    for (size_t i = 0; i < size; ++i) {
        values[i] = witness_t(&composer, i);
    }

    merkle_tree tree = merkle_tree(composer, 3);

    // Check everything is zero.
    for (size_t i = 0; i < size; ++i) {
        EXPECT_EQ(tree.check_membership(values[0], values[i]).get_value(), true);
    }

    // Check everything is not one.
    for (size_t i = 0; i < size; ++i) {
        EXPECT_EQ(tree.check_membership(values[1], values[i]).get_value(), false);
    }

    // Add incremental values.
    for (size_t i = 0; i < size; ++i) {
        tree.add_member(values[i]);
    }

    // Check everything is as expected.
    for (size_t i = 0; i < size; ++i) {
        EXPECT_EQ(tree.check_membership(values[i], values[i]).get_value(), true);
    }

    waffle::Prover prover = composer.preprocess();

    waffle::Verifier verifier = waffle::preprocess(prover);

    waffle::plonk_proof proof = prover.construct_proof();

    bool result = verifier.verify_proof(proof);
    EXPECT_EQ(result, true);
}

TEST(stdlib_merkle_tree, test_update_member)
{
    Composer composer = Composer();
    size_t size = 8;
    std::vector<field_t> values(size);

    for (size_t i = 0; i < size; ++i) {
        values[i] = witness_t(&composer, i);
    }

    merkle_tree tree = merkle_tree(composer, 3);

    // Add incremental values.
    for (size_t i = 0; i < size; ++i) {
        tree.add_member(values[i]);
    }

    // Check everything is as expected.
    for (size_t i = 0; i < size; ++i) {
        EXPECT_EQ(tree.check_membership(values[i], values[i]).get_value(), true);
    }

    // Update the values (reverse them).
    for (size_t i = 0; i < size; ++i) {
        tree.update_member(values[i], values[size - 1 - i]);
    }

    // Check everything is as expected.
    for (size_t i = 0; i < size; ++i) {
        EXPECT_EQ(tree.check_membership(values[i], values[size - 1 - i]).get_value(), true);
    }

    waffle::Prover prover = composer.preprocess();

    waffle::Verifier verifier = waffle::preprocess(prover);

    waffle::plonk_proof proof = prover.construct_proof();

    bool result = verifier.verify_proof(proof);
    EXPECT_EQ(result, true);
}
