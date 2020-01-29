#include <gtest/gtest.h>

#include <barretenberg/waffle/composer/standard_composer.hpp>
#include <barretenberg/waffle/composer/turbo_composer.hpp>
#include <barretenberg/waffle/proof_system/preprocess.hpp>
#include <barretenberg/waffle/proof_system/prover/prover.hpp>
#include <barretenberg/waffle/proof_system/verifier/verifier.hpp>
#include <barretenberg/waffle/proof_system/widgets/arithmetic_widget.hpp>

#include <barretenberg/polynomials/polynomial_arithmetic.hpp>

#include <barretenberg/waffle/stdlib/crypto/hash/pedersen.hpp>
#include <barretenberg/waffle/stdlib/field/field.hpp>
#include <barretenberg/waffle/stdlib/merkle_tree/hash.hpp>
#include <barretenberg/waffle/stdlib/merkle_tree/merkle_tree.hpp>

#include <memory>

using namespace barretenberg;
using namespace plonk;

typedef waffle::TurboComposer Composer;
typedef stdlib::field_t<Composer> field_t;
typedef stdlib::bool_t<Composer> bool_t;
typedef stdlib::merkle_tree::merkle_tree<Composer> merkle_tree;
typedef stdlib::witness_t<Composer> witness_t;
using stdlib::merkle_tree::sha256;

TEST(stdlib_merkle_tree, test_memory_store)
{
    fr::field_t e00 = sha256({ { 0, 0, 0, 1 } });
    fr::field_t e01 = sha256({ { 0, 0, 0, 2 } });
    fr::field_t e02 = sha256({ { 0, 0, 0, 3 } });
    fr::field_t e03 = sha256({ { 0, 0, 0, 4 } });
    fr::field_t e10 = stdlib::merkle_tree::hash({ e00, e01 });
    fr::field_t e11 = stdlib::merkle_tree::hash({ e02, e03 });
    fr::field_t root = stdlib::merkle_tree::hash({ e10, e11 });

    stdlib::merkle_tree::MemoryStore db(2);

    for (size_t i = 0; i < 4; ++i) {
        db.update_element(i, { { 0, 0, 0, i + 1 } });
    }

    for (size_t i = 0; i < 4; ++i) {
        EXPECT_TRUE(fr::eq(db.get_element(i), { 0, 0, 0, i + 1 }));
    }

    stdlib::merkle_tree::fr_hash_path expected = {
        std::make_pair(e00, e01),
        std::make_pair(e10, e11),
    };

    EXPECT_EQ(db.get_hash_path(0), expected);
    EXPECT_EQ(db.get_hash_path(1), expected);

    expected = {
        std::make_pair(e02, e03),
        std::make_pair(e10, e11),
    };

    EXPECT_EQ(db.get_hash_path(2), expected);
    EXPECT_EQ(db.get_hash_path(3), expected);
    EXPECT_EQ(db.root(), root);
}

TEST(stdlib_merkle_tree, test_leveldb_update_member)
{
    stdlib::merkle_tree::MemoryStore memdb(3);

    leveldb::DestroyDB("/tmp/leveldb_test", leveldb::Options());
    stdlib::merkle_tree::LevelDbStore db("/tmp/leveldb_test", 3);

    for (size_t i = 0; i < 8; ++i) {
        EXPECT_TRUE(fr::eq(db.get_element(i), { { 0, 0, 0, 0 } }));
    }
    for (size_t i = 0; i < 8; ++i) {
        memdb.update_element(i, { { 0, 0, 0, i } });
        db.update_element(i, { { 0, 0, 0, i } });
    }
    for (size_t i = 0; i < 8; ++i) {
        EXPECT_TRUE(fr::eq(db.get_element(i), { { 0, 0, 0, i } }));
    }

    EXPECT_TRUE(fr::eq(db.root(), memdb.root()));
}

TEST(stdlib_merkle_tree, test_leveldb_get_hash_path)
{
    stdlib::merkle_tree::MemoryStore memdb(3);

    leveldb::DestroyDB("/tmp/leveldb_test", leveldb::Options());
    stdlib::merkle_tree::LevelDbStore db("/tmp/leveldb_test", 3);

    EXPECT_EQ(memdb.get_hash_path(2), db.get_hash_path(2));

    for (size_t i = 0; i < 3; ++i) {
        memdb.update_element(i, { { 0, 0, 0, i } });
        db.update_element(i, { { 0, 0, 0, i } });
    }

    EXPECT_EQ(db.get_hash_path(2), memdb.get_hash_path(2));
}

TEST(stdlib_merkle_tree, bug)
{
    fr::field_t x = {{ 0x5ec473eb273a8014, 0x50160109385471ca, 0x2f3095267e02607d, 0x02586f4a39e69b86 }};
    Composer composer = Composer();
    witness_t y = witness_t(&composer, x);
    auto z = plonk::stdlib::pedersen::compress(y, y);
    auto zz = stdlib::group_utils::compress_native(x, x);
    std::cout << z.get_value() << std::endl;
    std::cout << zz << std::endl;
    EXPECT_TRUE(fr::eq(z.get_value(), zz));
}

TEST(stdlib_merkle_tree, test_check_membership)
{
    Composer composer = Composer();

    witness_t zero = witness_t(&composer, fr::zero);
    witness_t one = witness_t(&composer, fr::one);

    merkle_tree tree = merkle_tree(composer, 3);
    bool_t is_member = tree.check_membership(zero, zero);
    EXPECT_EQ(is_member.get_value(), true);

    auto prover = composer.preprocess();
    printf("composer gates = %zu\n", composer.get_num_gates());

    auto verifier = waffle::preprocess(prover);

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

    auto prover = composer.preprocess();

    auto verifier = waffle::preprocess(prover);

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

    auto prover = composer.preprocess();

    auto verifier = waffle::preprocess(prover);

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

    auto prover = composer.preprocess();

    auto verifier = waffle::preprocess(prover);

    waffle::plonk_proof proof = prover.construct_proof();

    bool result = verifier.verify_proof(proof);
    EXPECT_EQ(result, true);
}
