#include <array>

#include <barretenberg/curves/grumpkin/grumpkin.hpp>
#include <barretenberg/waffle/composer/turbo_composer.hpp>
#include <barretenberg/waffle/stdlib/crypto/commitment/pedersen_note.hpp>
#include <barretenberg/waffle/stdlib/merkle_tree/merkle_tree.hpp>

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
typedef stdlib::merkle_tree::LevelDbStore leveldb_store;
typedef stdlib::witness_t<Composer> witness_t;
typedef stdlib::public_witness_t<Composer> public_witness_t;
typedef std::pair<stdlib::pedersen_note::private_note, stdlib::pedersen_note::public_note> note_pair;

barretenberg::fr::field_t note_secret;
grumpkin::fr::field_t owner_secret;
grumpkin::g1::affine_element owner_pub_key;

struct rollup_context {
    Composer& composer;
    leveldb_store& data_db;
    leveldb_store& nullifier_db;
    field_t data_size;
    field_t data_root;
    field_t nullifier_root;
};

const auto init = []() {
    note_secret = { { 0x11111111, 0x11111111, 0x11111111, 0x11111111 } };
    owner_secret = { { 0x11111111, 0x11111111, 0x11111111, 0x11111111 } };
    owner_pub_key = grumpkin::g1::group_exponentiation(grumpkin::g1::affine_one, owner_secret);
    return true;
}();

note_pair create_note_pair(Composer& composer, uint32 const& value)
{
    note_pair result;

    field_t view_key = witness_t(&composer, note_secret);
    field_t note_owner_x = witness_t(&composer, owner_pub_key.x);
    field_t note_owner_y = witness_t(&composer, owner_pub_key.y);
    result.first = { { note_owner_x, note_owner_y }, value, view_key };
    result.second = plonk::stdlib::pedersen_note::encrypt_note(result.first);
    return result;
}

void set_note_public(Composer& composer, stdlib::pedersen_note::public_note const& note)
{
    composer.set_public_input(note.ciphertext.x.witness_index);
    composer.set_public_input(note.ciphertext.y.witness_index);
}

byte_array create_note_leaf(Composer& composer, stdlib::pedersen_note::public_note const& note)
{
    byte_array value_byte_array(&composer);
    value_byte_array.write(note.ciphertext.x).write(note.ciphertext.y);
    return value_byte_array;
}

std::string create_note_db_element(stdlib::pedersen_note::public_note const& note)
{
    // TODO: Compress point.
    std::string new_element = std::string(64, 0);
    fr::serialize_to_buffer(note.ciphertext.x.get_value(), (uint8_t*)(&new_element[0]));
    fr::serialize_to_buffer(note.ciphertext.y.get_value(), (uint8_t*)(&new_element[32]));
    return new_element;
}

struct new_note_context {
    byte_array note_index;
    note_pair note_data;
    hash_path old_path;
    hash_path new_path;
    field_t old_root;
    field_t new_root;
    byte_array value;
};

new_note_context create_new_note_context(rollup_context& ctx, field_t const& index_field, uint32 const& value)
{
    uint128_t index_to_create = field_to_uint128(index_field.get_value());

    note_pair note_data = create_note_pair(ctx.composer, value);

    std::string new_element = create_note_db_element(note_data.second);

    fr_hash_path old_path = ctx.data_db.get_hash_path(index_to_create);
    fr_hash_path new_path = stdlib::merkle_tree::get_new_hash_path(old_path, index_to_create, new_element);

    byte_array new_value_byte_array(&ctx.composer);
    new_value_byte_array.write(note_data.second.ciphertext.x).write(note_data.second.ciphertext.y);

    field_t old_root = ctx.data_root;
    field_t new_root = witness_t(&ctx.composer, stdlib::merkle_tree::get_hash_path_root(new_path));

    new_note_context note_ctx = {
        index_field,
        note_data,
        stdlib::merkle_tree::create_witness_hash_path(ctx.composer, old_path),
        stdlib::merkle_tree::create_witness_hash_path(ctx.composer, new_path),
        old_root,
        new_root,
        new_value_byte_array,
    };

    return note_ctx;
}

void create_note(rollup_context& ctx, new_note_context const& note_ctx)
{
    stdlib::merkle_tree::update_membership(ctx.composer,
                                           note_ctx.new_root,
                                           note_ctx.new_path,
                                           note_ctx.value,
                                           note_ctx.old_root,
                                           note_ctx.old_path,
                                           byte_array(&ctx.composer, 64),
                                           note_ctx.note_index);

    ctx.data_db.update_element(ctx.data_db.size(), note_ctx.value.get_value());

    ctx.data_size = (ctx.data_size + 1).normalize();
    ctx.data_root = note_ctx.new_root;
}

bool create(rollup_context& ctx, uint32_t const value)
{
    uint32 value_uint = witness_t(&ctx.composer, value);
    new_note_context note_ctx = create_new_note_context(ctx, ctx.data_size, value_uint);
    set_note_public(ctx.composer, note_ctx.note_data.second);

    create_note(ctx, note_ctx);

    ctx.composer.set_public_input(ctx.data_root.witness_index);

    auto prover = ctx.composer.preprocess();
    printf("composer gates = %zu\n", ctx.composer.get_num_gates());
    waffle::plonk_proof proof = prover.construct_proof();

    auto verifier = ctx.composer.create_verifier();
    bool verified = verifier.verify_proof(proof);

    std::cout << "Verified: " << verified << std::endl;

    if (verified) {
        ctx.data_db.commit();
    }

    return verified;
}

struct destroy_note_context {
    note_pair note_data;
    byte_array data_index;
    field_t data_root;
    hash_path data_path;
    byte_array data_value;
    field_t nullifier_index;
    hash_path nullifier_old_path;
    hash_path nullifier_new_path;
    field_t nullifier_old_root;
    field_t nullifier_new_root;
    byte_array nullifier_value;
};

destroy_note_context create_destroy_note_context(rollup_context& ctx, field_t const& index_field, uint32 const& value)
{
    uint128_t index_to_destroy = field_to_uint128(index_field.get_value());
    note_pair note_data = create_note_pair(ctx.composer, value);
    field_t data_root = ctx.data_root;
    fr_hash_path data_path = ctx.data_db.get_hash_path(index_to_destroy);
    byte_array data_value = create_note_leaf(ctx.composer, note_data.second);

    // We mix in the index and notes secret as part of the value we hash into the tree to ensure notes will always have
    // unique entries.
    byte_array note_hash_data = byte_array(&ctx.composer);
    note_hash_data.write(note_data.second.ciphertext.x)
        .write(byte_array(index_field).slice(28, 4))
        .write(byte_array(note_data.first.secret).slice(4, 28));

    // We have to convert the byte_array into a field_t to get the montgomery form. Can we avoid this?
    field_t nullifier_index = stdlib::merkle_tree::hash_value(note_hash_data);
    uint128_t nullifier_index_raw = field_to_uint128(nullifier_index.get_value());

    byte_array nullifier_value(&ctx.composer);
    nullifier_value.write(field_t(1ULL)).write(field_t(uint64_t(0)));

    fr_hash_path nullifier_old_path = ctx.nullifier_db.get_hash_path(nullifier_index_raw);
    fr_hash_path nullifier_new_path =
        stdlib::merkle_tree::get_new_hash_path(nullifier_old_path, nullifier_index_raw, nullifier_value.get_value());

    field_t nullifier_old_root = ctx.nullifier_root;
    field_t nullifier_new_root = witness_t(&ctx.composer, stdlib::merkle_tree::get_hash_path_root(nullifier_new_path));

    destroy_note_context note_ctx = {
        note_data,
        index_field,
        data_root,
        stdlib::merkle_tree::create_witness_hash_path(ctx.composer, data_path),
        data_value,
        nullifier_index,
        stdlib::merkle_tree::create_witness_hash_path(ctx.composer, nullifier_old_path),
        stdlib::merkle_tree::create_witness_hash_path(ctx.composer, nullifier_new_path),
        nullifier_old_root,
        nullifier_new_root,
        nullifier_value,
    };

    return note_ctx;
}

void destroy_note(rollup_context& ctx, destroy_note_context const& destroy_ctx)
{
    // Check that the note we want to destroy exists.
    stdlib::merkle_tree::assert_check_membership(
        ctx.composer, destroy_ctx.data_root, destroy_ctx.data_path, destroy_ctx.data_value, destroy_ctx.data_index);

    stdlib::merkle_tree::update_membership(ctx.composer,
                                           destroy_ctx.nullifier_new_root,
                                           destroy_ctx.nullifier_new_path,
                                           destroy_ctx.nullifier_value,
                                           destroy_ctx.nullifier_old_root,
                                           destroy_ctx.nullifier_old_path,
                                           byte_array(&ctx.composer, 64),
                                           static_cast<byte_array>(destroy_ctx.nullifier_index));

    ctx.nullifier_db.update_element(field_to_uint128(destroy_ctx.nullifier_index.get_value()),
                                    destroy_ctx.nullifier_value.get_value());

    ctx.nullifier_root = destroy_ctx.nullifier_new_root;
}

bool destroy(rollup_context& ctx, uint32_t const index, uint32_t const value)
{
    field_t index_to_destroy_field = witness_t(&ctx.composer, index);
    uint32 value_uint = witness_t(&ctx.composer, value);
    destroy_note_context destroy_ctx = create_destroy_note_context(ctx, index_to_destroy_field, value_uint);
    set_note_public(ctx.composer, destroy_ctx.note_data.second);

    destroy_note(ctx, destroy_ctx);

    ctx.composer.set_public_input(ctx.nullifier_root.witness_index);

    auto prover = ctx.composer.preprocess();
    printf("composer gates = %zu\n", ctx.composer.get_num_gates());
    waffle::plonk_proof proof = prover.construct_proof();

    auto verifier = ctx.composer.create_verifier();
    bool verified = verifier.verify_proof(proof);

    std::cout << "Verified: " << verified << std::endl;

    if (verified) {
        ctx.nullifier_db.commit();
    }

    return verified;
}

bool split(rollup_context& ctx, uint32_t in_index, uint32_t out_value1, uint32_t out_value2)
{
    uint32 out_value1_uint = witness_t(&ctx.composer, out_value1);
    uint32 out_value2_uint = witness_t(&ctx.composer, out_value2);
    field_t in_index_field = witness_t(&ctx.composer, in_index);
    uint32 in_value_uint = out_value1_uint + out_value2_uint;

    auto note1 = create_new_note_context(ctx, ctx.data_size, out_value1_uint);
    set_note_public(ctx.composer, note1.note_data.second);
    create_note(ctx, note1);

    auto note2 = create_new_note_context(ctx, ctx.data_size, out_value2_uint);
    set_note_public(ctx.composer, note2.note_data.second);
    create_note(ctx, note2);

    auto in_note = create_destroy_note_context(ctx, in_index_field, in_value_uint);
    destroy_note(ctx, in_note);

    ctx.composer.set_public_input(ctx.data_root.witness_index);
    ctx.composer.set_public_input(ctx.nullifier_root.witness_index);

    auto prover = ctx.composer.preprocess();
    printf("composer gates = %zu\n", ctx.composer.get_num_gates());
    waffle::plonk_proof proof = prover.construct_proof();

    auto verifier = ctx.composer.create_verifier();
    bool verified = verifier.verify_proof(proof);

    std::cout << "Verified: " << verified << std::endl;

    if (verified) {
        ctx.data_db.commit();
        ctx.nullifier_db.commit();
    }

    return verified;
}

bool join(rollup_context& ctx, uint32_t in_index1, uint32_t in_index2, uint32_t in_value1, uint32_t in_value2)
{
    field_t in_index1_field = witness_t(&ctx.composer, in_index1);
    field_t in_index2_field = witness_t(&ctx.composer, in_index2);
    uint32 in_value1_uint = witness_t(&ctx.composer, in_value1);
    uint32 in_value2_uint = witness_t(&ctx.composer, in_value2);
    uint32 out_value_uint = in_value1_uint + in_value2_uint;

    auto new_note = create_new_note_context(ctx, ctx.data_size, out_value_uint);
    create_note(ctx, new_note);

    auto note1 = create_destroy_note_context(ctx, in_index1_field, in_value1_uint);
    set_note_public(ctx.composer, note1.note_data.second);
    destroy_note(ctx, note1);

    auto note2 = create_destroy_note_context(ctx, in_index2_field, in_value2_uint);
    set_note_public(ctx.composer, note2.note_data.second);
    destroy_note(ctx, note2);

    ctx.composer.set_public_input(ctx.data_root.witness_index);
    ctx.composer.set_public_input(ctx.nullifier_root.witness_index);

    auto prover = ctx.composer.preprocess();
    printf("composer gates = %zu\n", ctx.composer.get_num_gates());
    waffle::plonk_proof proof = prover.construct_proof();

    auto verifier = ctx.composer.create_verifier();
    bool verified = verifier.verify_proof(proof);

    std::cout << "Verified: " << verified << std::endl;

    if (verified) {
        ctx.data_db.commit();
        ctx.nullifier_db.commit();
    }

    return verified;
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

    stdlib::merkle_tree::LevelDbStore data_db("/tmp/rollup_prover", 32);
    stdlib::merkle_tree::LevelDbStore nullifier_db("/tmp/rollup_prover_nullifier", 128);
    Composer composer = Composer();

    std::cout << "DB root: " << data_db.root() << " size: " << data_db.size() << std::endl;
    std::cout << "Nullifier root: " << nullifier_db.root() << " size: " << nullifier_db.size() << std::endl;

    rollup_context ctx = {
        composer,
        data_db,
        nullifier_db,
        public_witness_t(&composer, data_db.size()),
        public_witness_t(&composer, data_db.root()),
        public_witness_t(&composer, nullifier_db.root()),
    };

    bool success = false;

    if (cmd == "create") {
        if (argc != 3) {
            std::cout << "usage: " << argv[0] << " create <value>" << std::endl;
            return -1;
        }
        uint32_t value = (uint32_t)atoi(argv[2]);
        success = create(ctx, value);
    } else if (cmd == "destroy") {
        if (argc != 4) {
            std::cout << "usage: " << argv[0] << " destroy <index> <value>" << std::endl;
            return -1;
        }
        uint32_t index = (uint32_t)atoi(argv[2]);
        uint32_t value = (uint32_t)atoi(argv[3]);
        success = destroy(ctx, index, value);
    } else if (cmd == "split") {
        if (argc != 5) {
            std::cout << "usage: " << argv[0]
                      << " split <note index to spend> <first new note value> <second new note value>" << std::endl;
            return -1;
        }
        uint32_t index = (uint32_t)atoi(argv[2]);
        uint32_t value1 = (uint32_t)atoi(argv[3]);
        uint32_t value2 = (uint32_t)atoi(argv[4]);
        success = split(ctx, index, value1, value2);
    } else if (cmd == "join") {
        if (argc != 6) {
            std::cout << "usage: " << argv[0]
                      << " join <first note index to join> <second note index to join> <first note value> <second "
                         "note value>"
                      << std::endl;
            return -1;
        }
        uint32_t index1 = (uint32_t)atoi(argv[2]);
        uint32_t index2 = (uint32_t)atoi(argv[3]);
        uint32_t value1 = (uint32_t)atoi(argv[4]);
        uint32_t value2 = (uint32_t)atoi(argv[5]);
        success = join(ctx, index1, index2, value1, value2);
    }

    return success ? 0 : 1;
}