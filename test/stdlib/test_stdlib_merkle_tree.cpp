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
    leveldb::DestroyDB("/tmp/leveldb_test", leveldb::Options());
    stdlib::merkle_tree::LevelDbStore db("/tmp/leveldb_test", 3);

    for (size_t i = 0; i < 8; ++i) {
        EXPECT_TRUE(fr::eq(db.get_element(i), { { 0, 0, 0, 0 } }));
    }
    for (size_t i = 0; i < 8; ++i) {
        db.update_element(i, { { 0, 0, 0, i } });
    }
    for (size_t i = 0; i < 8; ++i) {
        EXPECT_TRUE(fr::eq(db.get_element(i), { { 0, 0, 0, i } }));
    }

    EXPECT_TRUE(
        fr::eq(db.root(), { { 0x75f56594b1aae0e9, 0xa84b6452228fd63b, 0x3002f084002e5d1c, 0x68324932099e5111 } }));
}

TEST(stdlib_merkle_tree, test_leveldb_get_hash_path)
{
    leveldb::DestroyDB("/tmp/leveldb_test", leveldb::Options());
    stdlib::merkle_tree::LevelDbStore db("/tmp/leveldb_test", 3);

    auto zero_path = db.get_hash_path(2);

    stdlib::merkle_tree::fr_hash_path expected_zero = {
        std::make_pair(fr::zero, fr::zero),
        std::make_pair<fr::field_t, fr::field_t>(
            { { 0xcdd3f776b62832ad, 0x96f1173f44a58442, 0xb2400ab391e4362b, 0xb55fba97e5495840 } },
            { { 0xcdd3f776b62832ad, 0x96f1173f44a58442, 0xb2400ab391e4362b, 0xb55fba97e5495840 } }),
        std::make_pair<fr::field_t, fr::field_t>(
            { { 0x7c99d71190c2a3f9, 0x37940856d6a0ea5b, 0xd52d0dd66c7cd231, 0x0979e8915a6f0114 } },
            { { 0x7c99d71190c2a3f9, 0x37940856d6a0ea5b, 0xd52d0dd66c7cd231, 0x0979e8915a6f0114 } }),
    };

    EXPECT_EQ(zero_path, expected_zero);

    db.update_element(0, { { 0, 0, 0, 123 } });
    db.update_element(1, { { 0, 0, 0, 456 } });
    db.update_element(2, { { 0, 0, 0, 789 } });

    auto path = db.get_hash_path(2);

    stdlib::merkle_tree::fr_hash_path expected = {
        std::make_pair<fr::field_t, fr::field_t>(
            { { 0x0000000000000000, 0x0000000000000000, 0x0000000000000000, 0x0000000000000315 } },
            { { 0x0000000000000000, 0x0000000000000000, 0x0000000000000000, 0x0000000000000000 } }),
        std::make_pair<fr::field_t, fr::field_t>(
            { { 0xfc5051a692aa5072, 0xd9091aea5258cacc, 0x8fea0544a849f777, 0x15f5c47e72c6fbcb } },
            { { 0x88c3c504da66e3ac, 0xcb72647cf04131d6, 0xdab1a12d5fca8659, 0x2dd5f9ba4642ddc1 } }),
        std::make_pair<fr::field_t, fr::field_t>(
            { { 0x1f2d0c61a3e736e7, 0x2e8f38f1d153e81b, 0x9ff9c1d10f465e36, 0x562bfc13f505833e } },
            { { 0x7c99d71190c2a3f9, 0x37940856d6a0ea5b, 0xd52d0dd66c7cd231, 0x0979e8915a6f0114 } }),
    };

    EXPECT_EQ(path, expected);
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
