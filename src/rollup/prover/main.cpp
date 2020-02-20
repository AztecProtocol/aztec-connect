#include <array>

#include <barretenberg/curves/grumpkin/grumpkin.hpp>
#include <barretenberg/waffle/composer/turbo_composer.hpp>
#include <barretenberg/waffle/stdlib/crypto/commitment/pedersen_note.hpp>
#include <barretenberg/waffle/stdlib/crypto/schnorr/schnorr.hpp>
#include <barretenberg/waffle/stdlib/merkle_tree/merkle_tree.hpp>

using namespace barretenberg;
using namespace plonk;
using namespace int_utils;

typedef waffle::TurboComposer Composer;
typedef stdlib::uint32<Composer> uint32;
typedef stdlib::field_t<Composer> field_t;
typedef stdlib::bool_t<Composer> bool_t;
typedef stdlib::byte_array<Composer> byte_array;
typedef stdlib::bitarray<Composer> bitarray;
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

struct point {
    fr::field_t x;
    fr::field_t y;
};

struct tx_note {
    point owner;
    uint32_t value;
    barretenberg::fr::field_t secret;
};

note_pair create_note_pair(Composer& composer, tx_note const& note)
{
    note_pair result;

    field_t view_key = witness_t(&composer, note.secret);
    field_t note_owner_x = witness_t(&composer, note.owner.x);
    field_t note_owner_y = witness_t(&composer, note.owner.y);
    uint32 witness_value = witness_t(&composer, note.value);
    result.first = { { note_owner_x, note_owner_y }, witness_value, view_key };
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

new_note_context create_new_note_context(rollup_context& ctx, field_t const& index_field, note_pair const& note_data)
{
    uint128_t index_to_create = field_to_uint128(index_field.get_value());

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

bool create(rollup_context& ctx, tx_note const& note)
{
    note_pair note_data = create_note_pair(ctx.composer, note);
    new_note_context note_ctx = create_new_note_context(ctx, ctx.data_size, note_data);
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
    bool_t is_real;
};

destroy_note_context create_destroy_note_context(rollup_context& ctx,
                                                 field_t const& index_field,
                                                 note_pair const& note_data,
                                                 bool_t is_real)
{
    uint128_t index_to_destroy = field_to_uint128(index_field.get_value());
    field_t data_root = ctx.data_root;
    fr_hash_path data_path = ctx.data_db.get_hash_path(index_to_destroy);
    byte_array data_value = create_note_leaf(ctx.composer, note_data.second);

    // We mix in the index and notes secret as part of the value we hash into the tree to ensure notes will always have
    // unique entries.
    byte_array note_hash_data = byte_array(&ctx.composer);
    note_hash_data.write(note_data.second.ciphertext.x)
        .write(byte_array(index_field).slice(28, 4))
        .write(byte_array(note_data.first.secret).slice(4, 28));
    note_hash_data.set_bit(511, is_real);

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
        is_real,
    };

    return note_ctx;
}

void destroy_note(rollup_context& ctx, destroy_note_context const& destroy_ctx)
{
    // Check that the note we want to destroy exists.
    bool_t exists = stdlib::merkle_tree::check_membership(
        ctx.composer, destroy_ctx.data_root, destroy_ctx.data_path, destroy_ctx.data_value, destroy_ctx.data_index);
    ctx.composer.assert_equal(destroy_ctx.is_real.witness_index, exists.witness_index);

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

bool destroy(rollup_context& ctx, uint32_t const index, tx_note const& note)
{
    field_t index_to_destroy_field = witness_t(&ctx.composer, index);
    note_pair note_data = create_note_pair(ctx.composer, note);
    destroy_note_context destroy_ctx =
        create_destroy_note_context(ctx, index_to_destroy_field, note_data, witness_t(&ctx.composer, true));
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

bool split(
    rollup_context& ctx, uint32_t in_index, tx_note const& in_note, tx_note const& out_note1, tx_note const& out_note2)
{
    note_pair in_note_data = create_note_pair(ctx.composer, in_note);
    note_pair out_note1_data = create_note_pair(ctx.composer, out_note1);
    note_pair out_note2_data = create_note_pair(ctx.composer, out_note2);
    field_t in_index_field = witness_t(&ctx.composer, in_index);
    field_t total_output = field_t(out_note1_data.first.value) + field_t(out_note2_data.first.value);

    ctx.composer.assert_equal(in_note_data.first.value.get_witness_index(), total_output.witness_index);

    auto note1 = create_new_note_context(ctx, ctx.data_size, out_note1_data);
    set_note_public(ctx.composer, note1.note_data.second);
    create_note(ctx, note1);

    auto note2 = create_new_note_context(ctx, ctx.data_size, out_note2_data);
    set_note_public(ctx.composer, note2.note_data.second);
    create_note(ctx, note2);

    auto create_note_ctx =
        create_destroy_note_context(ctx, in_index_field, in_note_data, witness_t(&ctx.composer, true));
    destroy_note(ctx, create_note_ctx);

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

bool join(rollup_context& ctx,
          uint32_t in_index1,
          uint32_t in_index2,
          tx_note const& in_note1,
          tx_note const& in_note2,
          tx_note const& out_note)
{
    field_t in_index1_field = witness_t(&ctx.composer, in_index1);
    field_t in_index2_field = witness_t(&ctx.composer, in_index2);
    note_pair in_note1_data = create_note_pair(ctx.composer, in_note1);
    note_pair in_note2_data = create_note_pair(ctx.composer, in_note2);
    note_pair out_note_data = create_note_pair(ctx.composer, out_note);
    field_t total_input = field_t(in_note1_data.first.value) + field_t(in_note2_data.first.value);

    ctx.composer.assert_equal(out_note_data.first.value.get_witness_index(), total_input.witness_index);

    auto new_note = create_new_note_context(ctx, ctx.data_size, out_note_data);
    create_note(ctx, new_note);

    auto note1 = create_destroy_note_context(ctx, in_index1_field, in_note1_data, witness_t(&ctx.composer, true));
    set_note_public(ctx.composer, note1.note_data.second);
    destroy_note(ctx, note1);

    auto note2 = create_destroy_note_context(ctx, in_index2_field, in_note2_data, witness_t(&ctx.composer, true));
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

struct join_split_tx {
    uint32_t public_input;
    uint32_t public_output;
    uint32_t num_input_notes;
    uint32_t input_note_index[2];
    tx_note input_note[2];
    tx_note output_note[2];
    crypto::schnorr::signature signature;
};

#pragma GCC diagnostic ignored "-Wunused-variable"
bool join_split(rollup_context& ctx, join_split_tx const& tx)
{
    uint32 public_input = public_witness_t(&ctx.composer, tx.public_input);
    uint32 public_output = public_witness_t(&ctx.composer, tx.public_output);
    uint32 num_input_notes = witness_t(&ctx.composer, tx.num_input_notes);

    field_t input_note1_index = witness_t(&ctx.composer, tx.input_note_index[0]);
    field_t input_note2_index = witness_t(&ctx.composer, tx.input_note_index[1]);

    note_pair input_note1_data = create_note_pair(ctx.composer, tx.input_note[0]);
    note_pair input_note2_data = create_note_pair(ctx.composer, tx.input_note[1]);

    note_pair output_note1_data = create_note_pair(ctx.composer, tx.output_note[0]);
    note_pair output_note2_data = create_note_pair(ctx.composer, tx.output_note[1]);
    set_note_public(ctx.composer, output_note1_data.second);
    set_note_public(ctx.composer, output_note2_data.second);

    // Verify input and output notes balance. Use field_t to prevent overflow.
    field_t total_in_value =
        field_t(input_note1_data.first.value) + field_t(input_note2_data.first.value) + field_t(public_input);
    field_t total_out_value =
        field_t(output_note1_data.first.value) + field_t(output_note2_data.first.value) + field_t(public_output);
    total_in_value = total_in_value.normalize();
    total_out_value = total_out_value.normalize();
    ctx.composer.assert_equal(total_in_value.witness_index, total_out_value.witness_index);

    // Verify input notes are owned by whoever signed the signature.
    // stdlib::schnorr::signature_bits signature = {
    //     bitarray(&ctx.composer, tx.signature.s),
    //     bitarray(&ctx.composer, tx.signature.e),
    // };
    // byte_array input_note1_message(&ctx.composer);
    // input_note1_message.write(input_note1_data.second.ciphertext.x).write(input_note1_data.second.ciphertext.y);

    auto note1_create_ctx = create_new_note_context(ctx, ctx.data_size, output_note1_data);
    create_note(ctx, note1_create_ctx);

    auto note2_create_ctx = create_new_note_context(ctx, ctx.data_size, output_note2_data);
    create_note(ctx, note2_create_ctx);

    auto note1_destroy_ctx =
        create_destroy_note_context(ctx, input_note1_index, input_note1_data, num_input_notes >= 1);
    destroy_note(ctx, note1_destroy_ctx);

    auto note2_destroy_ctx =
        create_destroy_note_context(ctx, input_note2_index, input_note2_data, num_input_notes >= 2);
    destroy_note(ctx, note2_destroy_ctx);

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
        tx_note note = { { owner_pub_key.x, owner_pub_key.y }, value, note_secret };
        success = create(ctx, note);
    } else if (cmd == "destroy") {
        if (argc != 4) {
            std::cout << "usage: " << argv[0] << " destroy <index> <value>" << std::endl;
            return -1;
        }
        uint32_t index = (uint32_t)atoi(argv[2]);
        uint32_t value = (uint32_t)atoi(argv[3]);
        tx_note note = { { owner_pub_key.x, owner_pub_key.y }, value, note_secret };
        success = destroy(ctx, index, note);
    } else if (cmd == "split") {
        if (argc != 5) {
            std::cout << "usage: " << argv[0]
                      << " split <note index to spend> <first new note value> <second new note value>" << std::endl;
            return -1;
        }
        uint32_t index = (uint32_t)atoi(argv[2]);
        uint32_t value1 = (uint32_t)atoi(argv[3]);
        uint32_t value2 = (uint32_t)atoi(argv[4]);
        tx_note in_note = { { owner_pub_key.x, owner_pub_key.y }, value1 + value2, note_secret };
        tx_note out_note1 = { { owner_pub_key.x, owner_pub_key.y }, value1, note_secret };
        tx_note out_note2 = { { owner_pub_key.x, owner_pub_key.y }, value2, note_secret };
        success = split(ctx, index, in_note, out_note1, out_note2);
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
        tx_note in_note1 = { { owner_pub_key.x, owner_pub_key.y }, value1, note_secret };
        tx_note in_note2 = { { owner_pub_key.x, owner_pub_key.y }, value2, note_secret };
        tx_note out_note = { { owner_pub_key.x, owner_pub_key.y }, value1 + value2, note_secret };
        success = join(ctx, index1, index2, in_note1, in_note2, out_note);
    } else if (cmd == "join-split") {
        if (argc < 8) {
            std::cout << "usage: " << argv[0]
                      << " join <first note index to join> <second note index to join> <first input note value> "
                         "<second input "
                         "note value> <first output note value> <second output note value>"
                      << std::endl;
            return -1;
        }
        uint32_t index1 = (uint32_t)atoi(argv[2]);
        uint32_t index2 = (uint32_t)atoi(argv[3]);
        uint32_t in_value1 = (uint32_t)atoi(argv[4]);
        uint32_t in_value2 = (uint32_t)atoi(argv[5]);
        uint32_t out_value1 = (uint32_t)atoi(argv[6]);
        uint32_t out_value2 = (uint32_t)atoi(argv[7]);
        uint32_t public_input = argc > 8 ? (uint32_t)atoi(argv[8]) : 0;
        uint32_t public_output = argc > 9 ? (uint32_t)atoi(argv[9]) : 0;
        uint32_t num_input_notes = (argv[4][0] != '-') + (argv[5][0] != '-');

        tx_note in_note1 = { { owner_pub_key.x, owner_pub_key.y },
                             in_value1,
                             num_input_notes < 1 ? fr::random_element() : note_secret };
        tx_note in_note2 = { { owner_pub_key.x, owner_pub_key.y },
                             in_value2,
                             num_input_notes < 2 ? fr::random_element() : note_secret };
        tx_note out_note1 = { { owner_pub_key.x, owner_pub_key.y }, out_value1, note_secret };
        tx_note out_note2 = { { owner_pub_key.x, owner_pub_key.y }, out_value2, note_secret };

        crypto::schnorr::signature signature;

        join_split_tx tx = {
            public_input,       public_output,          num_input_notes,
            { index1, index2 }, { in_note1, in_note2 }, { out_note1, out_note2 },
            signature,
        };
        std::cout << "public_input: " << public_input << "\n"
                  << "public_output: " << public_output << "\n"
                  << "in_value1: " << in_value1 << "\n"
                  << "in_value2: " << in_value2 << "\n"
                  << "out_value1: " << out_value1 << "\n"
                  << "out_value2: " << out_value2 << "\n"
                  << "num_input_notes: " << num_input_notes << "\n"
                  << std::endl;
        success = join_split(ctx, tx);
    }

    return success ? 0 : 1;
}