#include <array>

#include <barretenberg/curves/grumpkin/grumpkin.hpp>
#include <barretenberg/waffle/composer/turbo_composer.hpp>
#include <barretenberg/waffle/stdlib/crypto/commitment/pedersen_note.hpp>
#include <barretenberg/waffle/stdlib/merkle_tree/merkle_tree.hpp>
#include <barretenberg/waffle/stdlib/merkle_tree/sha256_value.hpp>

using namespace barretenberg;
using namespace plonk;
using namespace int_utils;

typedef waffle::TurboComposer Composer;
typedef stdlib::uint32<Composer> uint32;
typedef stdlib::field_t<Composer> field_t;
typedef stdlib::bool_t<Composer> bool_t;
typedef stdlib::byte_array<Composer> byte_array;
typedef stdlib::merkle_tree::fr_hash_path fr_hash_path;
typedef stdlib::merkle_tree::hash_path<Composer> hash_path;
typedef stdlib::merkle_tree::LevelDbStore LevelDbStore;
typedef stdlib::witness_t<Composer> witness_t;
typedef stdlib::public_witness_t<Composer> public_witness_t;
typedef std::pair<stdlib::pedersen_note::private_note, stdlib::pedersen_note::public_note> note_pair;

barretenberg::fr::field_t note_secret;
grumpkin::fr::field_t owner_secret;
grumpkin::g1::affine_element owner_pub_key;

const auto init = []() {
    note_secret = { { 0x11111111, 0x11111111, 0x11111111, 0x11111111 } };
    owner_secret = { { 0x11111111, 0x11111111, 0x11111111, 0x11111111 } };
    owner_pub_key = grumpkin::g1::group_exponentiation(grumpkin::g1::affine_one, owner_secret);
    return true;
}();

note_pair create_note_pair(Composer* composer, const uint32_t value)
{
    note_pair result;

    field_t view_key = witness_t(composer, note_secret);
    field_t note_owner_x = witness_t(composer, owner_pub_key.x);
    field_t note_owner_y = witness_t(composer, owner_pub_key.y);
    uint32 value_witness = witness_t(composer, value);
    result.first = { { note_owner_x, note_owner_y }, value_witness, view_key };
    result.second = plonk::stdlib::pedersen_note::encrypt_note(result.first);
    return result;
}

byte_array create_note_leaf(Composer& composer, stdlib::pedersen_note::public_note const& public_note_data)
{
    field_t new_note_x = public_note_data.ciphertext.x;
    field_t new_note_y = public_note_data.ciphertext.y;
    composer.set_public_input(new_note_x.witness_index);
    composer.set_public_input(new_note_y.witness_index);

    byte_array value_byte_array(&composer);
    value_byte_array.write(new_note_x).write(new_note_y);
    return value_byte_array;
}

byte_array create_at_index(stdlib::merkle_tree::LevelDbStore& db,
                           Composer& composer,
                           uint32_t index_to_create,
                           uint32_t const value)
{
    field_t old_note_x(&composer, fr::zero);
    field_t old_note_y(&composer, fr::zero);

    note_pair note_data = create_note_pair(&composer, value);
    field_t new_note_x = note_data.second.ciphertext.x;
    field_t new_note_y = note_data.second.ciphertext.y;
    composer.set_public_input(new_note_x.witness_index);
    composer.set_public_input(new_note_y.witness_index);

    stdlib::merkle_tree::fr_hash_path old_path = db.get_hash_path(index_to_create);
    fr::field_t old_root = db.root();

    // TODO: Compress point. Add index.
    std::string new_element = std::string(64, 0);
    fr::serialize_to_buffer(new_note_x.get_value(), (uint8_t*)(&new_element[0]));
    fr::serialize_to_buffer(new_note_y.get_value(), (uint8_t*)(&new_element[32]));
    stdlib::merkle_tree::fr_hash_path new_path =
        stdlib::merkle_tree::get_new_hash_path(old_path, index_to_create, new_element);
    fr::field_t new_root = stdlib::merkle_tree::get_hash_path_root(new_path);

    byte_array old_value_byte_array(&composer);
    old_value_byte_array.write(field_t(0ULL)).write(field_t(0ULL));

    byte_array new_value_byte_array(&composer);
    new_value_byte_array.write(new_note_x).write(new_note_y);

    hash_path old_path_field = stdlib::merkle_tree::create_witness_hash_path(composer, old_path);
    hash_path new_path_field = stdlib::merkle_tree::create_witness_hash_path(composer, new_path);
    field_t new_root_field = public_witness_t(&composer, new_root);
    field_t old_root_field = public_witness_t(&composer, old_root);
    field_t index_field = public_witness_t(&composer, index_to_create);
    byte_array index_byte_array = index_field;

    stdlib::merkle_tree::update_membership(composer,
                                           new_root_field,
                                           new_path_field,
                                           new_value_byte_array,
                                           old_root_field,
                                           old_path_field,
                                           old_value_byte_array,
                                           index_byte_array);

    return new_value_byte_array;
}

void destroy_at_index(stdlib::merkle_tree::LevelDbStore& db,
                      stdlib::merkle_tree::LevelDbStore& nullifier_db,
                      Composer& composer,
                      uint32_t const index_to_destroy,
                      uint32_t const value)
{
    field_t index_to_destroy_field = witness_t(&composer, index_to_destroy);
    note_pair note_data = create_note_pair(&composer, value);
    byte_array value_byte_array = create_note_leaf(composer, note_data.second);
    field_t data_root_field = public_witness_t(&composer, db.root());
    hash_path path = stdlib::merkle_tree::create_witness_hash_path(composer, db.get_hash_path(index_to_destroy));

    // Check that the note we want to destroy exists.
    stdlib::merkle_tree::assert_check_membership<Composer>(
        composer, data_root_field, path, value_byte_array, index_to_destroy_field);

    // Compute old and new leaves in nullifier tree.
    byte_array old_value_byte_array(&composer);
    old_value_byte_array.write(field_t(0ULL)).write(field_t(0ULL));
    byte_array new_value_byte_array(&composer);
    new_value_byte_array.write(field_t(1ULL)).write(field_t(0ULL));

    // We mix in the index and notes secret as part of the value we hash into the tree to ensure notes will always have
    // unique entries.
    value_byte_array.write(index_to_destroy_field).write(note_data.first.secret);

    field_t note_hash = stdlib::merkle_tree::sha256_value(value_byte_array);
    uint128_t nullifier_index = field_to_uint128(note_hash.get_value());
    byte_array nullifier_index_byte_array = note_hash;
    field_t nullifier_old_root_field = public_witness_t(&composer, nullifier_db.root());
    fr_hash_path nullifier_old_path = nullifier_db.get_hash_path(nullifier_index);
    hash_path nullifier_old_path_field = stdlib::merkle_tree::create_witness_hash_path(composer, nullifier_old_path);
    fr_hash_path nullifier_new_path =
        stdlib::merkle_tree::get_new_hash_path(nullifier_old_path, nullifier_index, new_value_byte_array.get_value());
    // std::cout << nullifier_new_path << std::endl;
    hash_path nullifier_new_path_field = stdlib::merkle_tree::create_witness_hash_path(composer, nullifier_new_path);
    fr::field_t nullifier_new_root = stdlib::merkle_tree::get_hash_path_root(nullifier_new_path);
    field_t nullifier_new_root_field = public_witness_t(&composer, nullifier_new_root);

    stdlib::merkle_tree::update_membership(composer,
                                           nullifier_new_root_field,
                                           nullifier_new_path_field,
                                           new_value_byte_array,
                                           nullifier_old_root_field,
                                           nullifier_old_path_field,
                                           old_value_byte_array,
                                           nullifier_index_byte_array);
}

void create(LevelDbStore& db, Composer& composer, uint32_t const value)
{
    uint32_t index_to_create = (uint32_t)db.size();
    byte_array new_note = create_at_index(db, composer, index_to_create, value);

    auto prover = composer.preprocess();
    printf("composer gates = %zu\n", composer.get_num_gates());
    waffle::plonk_proof proof = prover.construct_proof();

    auto verifier = composer.create_verifier();
    bool verified = verifier.verify_proof(proof);

    std::cout << "Verified: " << verified << std::endl;

    if (verified) {
        db.update_element(index_to_create, new_note.get_value());
    }
}

void destroy(
    LevelDbStore& db, LevelDbStore& nullifier_db, Composer& composer, uint32_t const index, uint32_t const value)
{
    destroy_at_index(db, nullifier_db, composer, index, value);

    auto prover = composer.preprocess();
    printf("composer gates = %zu\n", composer.get_num_gates());
    waffle::plonk_proof proof = prover.construct_proof();

    auto verifier = composer.create_verifier();
    bool verified = verifier.verify_proof(proof);

    std::cout << "Verified: " << verified << std::endl;

    if (verified) {
        note_pair note_data = create_note_pair(&composer, value);
        std::string element = create_note_leaf(composer, note_data.second)
                                  .write(field_t(index))
                                  .write(note_data.first.secret)
                                  .get_value();
        auto note_hash = stdlib::merkle_tree::sha256(element);
        std::cout << "post note_hash " << note_hash << std::endl;
        auto index = field_to_uint128(note_hash);
        byte_array new_value_byte_array(&composer);
        new_value_byte_array.write(field_t(1ULL)).write(field_t(0ULL));
        nullifier_db.update_element(index, new_value_byte_array.get_value());
    }
}

/*
void split(stdlib::merkle_tree::LevelDbStore& db,
           stdlib::merkle_tree::LevelDbStore& nullifier_db,
           Composer& composer,
           uint32_t in_index,
           uint32_t in_value,
           uint32_t out_value1,
           uint32_t out_value2)
{
    std::string spend_element = db.get_element(in_index);

    auto new_note1_idx = db.size();
    auto new_note2_idx = new_note1_idx + 1;
    auto new_note1 = create_at_index(db, composer, new_note1_idx, out_value1);
    auto new_note2 = create_at_index(db, composer, new_note2_idx, out_value2);

    // Insert into nullifier.

    auto prover = composer.preprocess();
    printf("composer gates = %zu\n", composer.get_num_gates());
    waffle::plonk_proof proof = prover.construct_proof();

    auto verifier = composer.create_verifier();
    bool verified = verifier.verify_proof(proof);

    std::cout << "Verified: " << verified << std::endl;

    if (verified) {
        db.update_element(new_note1_idx, new_note1.get_value());
        db.update_element(new_note2_idx, new_note2.get_value());
    }
}
*/

int main(int argc, char** argv)
{
    if (argc < 2) {
        std::cout << "usage: " << argv[0] << " [create ...] [split ...]" << std::endl;
    }

    std::string cmd = argv[1];

    if (cmd == "reset") {
        leveldb::DestroyDB("/tmp/rollup_prover", leveldb::Options());
        leveldb::DestroyDB("/tmp/rollup_prover_nullifier", leveldb::Options());
        return 0;
    }

    stdlib::merkle_tree::LevelDbStore db("/tmp/rollup_prover", 32);
    stdlib::merkle_tree::LevelDbStore nullifier_db("/tmp/rollup_prover_nullifier", 128);
    Composer composer = Composer();

    std::cout << "DB root: " << db.root() << " size: " << db.size() << std::endl;
    std::cout << "Nullifier root: " << nullifier_db.root() << " size: " << nullifier_db.size() << std::endl;

    if (cmd == "create") {
        if (argc != 3) {
            std::cout << "usage: " << argv[0] << " create <value>" << std::endl;
            return -1;
        }
        uint32_t value = (uint32_t)atoi(argv[2]);
        create(db, composer, value);
    } else if (cmd == "destroy") {
        if (argc != 4) {
            std::cout << "usage: " << argv[0] << " destroy <index> <value>" << std::endl;
            return -1;
        }
        uint32_t index = (uint32_t)atoi(argv[2]);
        uint32_t value = (uint32_t)atoi(argv[3]);
        destroy(db, nullifier_db, composer, index, value);
    } else if (cmd == "split") {
        if (argc != 4) {
            std::cout
                << "usage: " << argv[0]
                << " split <note index to spend> <note value to spend> <first new note value> <second new note value>"
                << std::endl;
            return -1;
        }
    }

    return 0;
}