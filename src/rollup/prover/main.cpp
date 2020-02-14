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

note_pair create_note_pair(Composer* composer, uint32 const& value)
{
    note_pair result;

    field_t view_key = witness_t(composer, note_secret);
    field_t note_owner_x = witness_t(composer, owner_pub_key.x);
    field_t note_owner_y = witness_t(composer, owner_pub_key.y);
    result.first = { { note_owner_x, note_owner_y }, value, view_key };
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

void create_at_index(stdlib::merkle_tree::LevelDbStore& db,
                     Composer& composer,
                     field_t const& index_field,
                     uint32 const& value)
{
    uint128_t index_to_create = field_to_uint128(index_field.get_value());
    field_t old_note_x(&composer, fr::zero);
    field_t old_note_y(&composer, fr::zero);

    note_pair note_data = create_note_pair(&composer, value);
    field_t new_note_x = note_data.second.ciphertext.x;
    field_t new_note_y = note_data.second.ciphertext.y;
    composer.set_public_input(new_note_x.witness_index);
    composer.set_public_input(new_note_y.witness_index);

    stdlib::merkle_tree::fr_hash_path old_path = db.get_hash_path(index_to_create);
    fr::field_t old_root = db.root();

    // TODO: Compress point.
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
    byte_array index_byte_array = index_field;

    stdlib::merkle_tree::update_membership(composer,
                                           new_root_field,
                                           new_path_field,
                                           new_value_byte_array,
                                           old_root_field,
                                           old_path_field,
                                           old_value_byte_array,
                                           index_byte_array);

    db.update_element(db.size(), new_value_byte_array.get_value());
}

void destroy_at_index(stdlib::merkle_tree::LevelDbStore& db,
                      stdlib::merkle_tree::LevelDbStore& nullifier_db,
                      Composer& composer,
                      field_t const index_to_destroy_field,
                      uint32 const& value)
{
    uint128_t index_to_destroy = field_to_uint128(index_to_destroy_field.get_value());
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

    nullifier_db.update_element(nullifier_index, new_value_byte_array.get_value());
}

void create(LevelDbStore& db, Composer& composer, uint32_t const value)
{
    field_t data_size_field = public_witness_t(&composer, db.size());
    // field_t data_root_field = public_witness_t(&composer, db.root());
    uint32 value_uint = witness_t(&composer, value);

    create_at_index(db, composer, data_size_field, value_uint);

    auto prover = composer.preprocess();
    printf("composer gates = %zu\n", composer.get_num_gates());
    waffle::plonk_proof proof = prover.construct_proof();

    auto verifier = composer.create_verifier();
    bool verified = verifier.verify_proof(proof);

    std::cout << "Verified: " << verified << std::endl;

    if (verified) {
        db.commit();
    }
}

void destroy(
    LevelDbStore& db, LevelDbStore& nullifier_db, Composer& composer, uint32_t const index, uint32_t const value)
{
    // field_t data_size_field = public_witness_t(&composer, db.size());
    // field_t data_root_field = public_witness_t(&composer, db.root());
    // field_t nullifier_root_field = public_witness_t(&composer, nullifier_db.root());
    field_t index_to_destroy_field = witness_t(&composer, index);
    uint32 value_uint = witness_t(&composer, value);

    destroy_at_index(db, nullifier_db, composer, index_to_destroy_field, value_uint);

    auto prover = composer.preprocess();
    printf("composer gates = %zu\n", composer.get_num_gates());
    waffle::plonk_proof proof = prover.construct_proof();

    auto verifier = composer.create_verifier();
    bool verified = verifier.verify_proof(proof);

    std::cout << "Verified: " << verified << std::endl;

    if (verified) {
        nullifier_db.commit();
    }
}

void split(stdlib::merkle_tree::LevelDbStore& db,
           stdlib::merkle_tree::LevelDbStore& nullifier_db,
           Composer& composer,
           uint32_t in_index,
           uint32_t out_value1,
           uint32_t out_value2)
{
    // field_t data_root_field = public_witness_t(&composer, db.root());
    // field_t nullifier_root_field = public_witness_t(&composer, nullifier_db.root());
    field_t data_size_field = public_witness_t(&composer, db.size());
    field_t in_index_field = witness_t(&composer, in_index);
    uint32 out_value1_uint = witness_t(&composer, out_value1);
    uint32 out_value2_uint = witness_t(&composer, out_value2);
    uint32 in_value_uint = out_value1_uint + out_value2_uint;

    auto new_note1_idx = data_size_field;
    auto new_note2_idx = new_note1_idx + 1;
    new_note2_idx = new_note2_idx.normalize();
    create_at_index(db, composer, new_note1_idx, out_value1_uint);
    create_at_index(db, composer, new_note2_idx, out_value2_uint);

    destroy_at_index(db, nullifier_db, composer, in_index_field, in_value_uint);

    auto prover = composer.preprocess();
    printf("composer gates = %zu\n", composer.get_num_gates());
    waffle::plonk_proof proof = prover.construct_proof();

    auto verifier = composer.create_verifier();
    bool verified = verifier.verify_proof(proof);

    std::cout << "Verified: " << verified << std::endl;

    if (verified) {
        db.commit();
        nullifier_db.commit();
    }
}

void join(stdlib::merkle_tree::LevelDbStore& db,
          stdlib::merkle_tree::LevelDbStore& nullifier_db,
          Composer& composer,
          uint32_t in_index1,
          uint32_t in_index2,
          uint32_t in_value1,
          uint32_t in_value2)
{
    // field_t data_root_field = public_witness_t(&composer, db.root());
    // field_t nullifier_root_field = public_witness_t(&composer, nullifier_db.root());
    field_t data_size_field = public_witness_t(&composer, db.size());
    field_t in_index1_field = witness_t(&composer, in_index1);
    field_t in_index2_field = witness_t(&composer, in_index2);
    uint32 in_value1_uint = witness_t(&composer, in_value1);
    uint32 in_value2_uint = witness_t(&composer, in_value2);
    uint32 out_value_uint = in_value1_uint + in_value2_uint;

    create_at_index(db, composer, data_size_field, out_value_uint);
    destroy_at_index(db, nullifier_db, composer, in_index1_field, in_value1_uint);
    destroy_at_index(db, nullifier_db, composer, in_index2_field, in_value2_uint);

    auto prover = composer.preprocess();
    printf("composer gates = %zu\n", composer.get_num_gates());
    waffle::plonk_proof proof = prover.construct_proof();

    auto verifier = composer.create_verifier();
    bool verified = verifier.verify_proof(proof);

    std::cout << "Verified: " << verified << std::endl;

    if (verified) {
        db.commit();
        nullifier_db.commit();
    }
}

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
        if (argc != 5) {
            std::cout << "usage: " << argv[0]
                      << " split <note index to spend> <first new note value> <second new note value>" << std::endl;
            return -1;
        }
        uint32_t index = (uint32_t)atoi(argv[2]);
        uint32_t value1 = (uint32_t)atoi(argv[3]);
        uint32_t value2 = (uint32_t)atoi(argv[4]);
        split(db, nullifier_db, composer, index, value1, value2);
    } else if (cmd == "join") {
        if (argc != 6) {
            std::cout
                << "usage: " << argv[0]
                << " join <first note index to join> <second note index to join> <first note value> <second note value>"
                << std::endl;
            return -1;
        }
        uint32_t index1 = (uint32_t)atoi(argv[2]);
        uint32_t index2 = (uint32_t)atoi(argv[3]);
        uint32_t value1 = (uint32_t)atoi(argv[4]);
        uint32_t value2 = (uint32_t)atoi(argv[5]);
        join(db, nullifier_db, composer, index1, index2, value1, value2);
    }

    return 0;
}