#include "create.hpp"
#include "destroy.hpp"
#include "join.hpp"
#include "join_split.hpp"
#include "split.hpp"
#include <barretenberg/waffle/stdlib/merkle_tree/leveldb_store.hpp>

char const* DATA_DB_PATH = "/tmp/rollup_prover";
char const* NULLIFIER_DB_PATH = "/tmp/rollup_prover_nullifier";

namespace {
using namespace rollup;

user_context create_user_context()
{
    barretenberg::fr::field_t note_secret = { { 0x11111111, 0x11111111, 0x11111111, 0x11111111 } };
    grumpkin::fr::field_t owner_secret = { { 0x11111111, 0x11111111, 0x11111111, 0x11111111 } };
    grumpkin::g1::affine_element owner_pub_key =
        grumpkin::g1::group_exponentiation(grumpkin::g1::affine_one, owner_secret);
    return { note_secret, owner_secret, owner_pub_key };
}

fr::field_t generate_random_secret() {
    fr::field_t secret = fr::from_montgomery_form(fr::random_element());
    secret.data[3] = secret.data[3] & (~0b1111110000000000000000000000000000000000000000000000000000000000ULL);
    return fr::to_montgomery_form(secret);
};

tx_note create_note(user_context const& user, uint32_t value) {
    return { { user.public_key.x, user.public_key.y }, value, user.note_secret };
}

tx_note create_gibberish_note(user_context const& user, uint32_t value) {
    return { { user.public_key.x, user.public_key.y }, value, generate_random_secret() };
}

rollup_context create_rollup_context(Composer& composer)
{
    // TODO: We can't have distinct databases due to requiring atomicity. Change to use a single db with multiple trees.
    leveldb_store data_db(DATA_DB_PATH, 32);
    leveldb_store nullifier_db(NULLIFIER_DB_PATH, 128);

    std::cout << "DB root: " << data_db.root() << " size: " << data_db.size() << std::endl;
    std::cout << "Nullifier root: " << nullifier_db.root() << " size: " << nullifier_db.size() << std::endl;

    return {
        composer,
        std::move(data_db),
        std::move(nullifier_db),
        public_witness_t(&composer, data_db.size()),
        public_witness_t(&composer, data_db.root()),
        public_witness_t(&composer, nullifier_db.root()),
    };
}

bool create(std::vector<std::string> const& args, rollup_context& ctx, user_context const& user)
{
    uint32_t value = (uint32_t)atoi(args[2].c_str());
    tx_note note = { { user.public_key.x, user.public_key.y }, value, user.note_secret };
    return create(ctx, note);
}

bool destroy(std::vector<std::string> const& args, rollup_context& ctx, user_context const& user)
{
    uint32_t index = (uint32_t)atoi(args[2].c_str());
    uint32_t value = (uint32_t)atoi(args[3].c_str());
    tx_note note = create_note(user, value);
    return destroy(ctx, index, note);
}

bool split(std::vector<std::string> const& args, rollup_context& ctx, user_context const& user)
{
    uint32_t index = (uint32_t)atoi(args[2].c_str());
    uint32_t value1 = (uint32_t)atoi(args[3].c_str());
    uint32_t value2 = (uint32_t)atoi(args[4].c_str());
    tx_note in_note = create_note(user, value1 + value2);
    tx_note out_note1 = create_note(user, value1);
    tx_note out_note2 = create_note(user, value2);
    return split(ctx, index, in_note, out_note1, out_note2);
}

bool join(std::vector<std::string> const& args, rollup_context& ctx, user_context const& user)
{
    uint32_t index1 = (uint32_t)atoi(args[2].c_str());
    uint32_t index2 = (uint32_t)atoi(args[3].c_str());
    uint32_t value1 = (uint32_t)atoi(args[4].c_str());
    uint32_t value2 = (uint32_t)atoi(args[5].c_str());
    tx_note in_note1 = create_note(user, value1);
    tx_note in_note2 = create_note(user, value2);
    tx_note out_note = create_note(user, value1 + value2);
    return join(ctx, index1, index2, in_note1, in_note2, out_note);
}

bool join_split(std::vector<std::string> const& args, rollup_context& ctx, user_context const& user)
{
    uint32_t index1 = (uint32_t)atoi(args[2].c_str());
    uint32_t index2 = (uint32_t)atoi(args[3].c_str());
    uint32_t in_value1 = (uint32_t)atoi(args[4].c_str());
    uint32_t in_value2 = (uint32_t)atoi(args[5].c_str());
    uint32_t out_value1 = (uint32_t)atoi(args[6].c_str());
    uint32_t out_value2 = (uint32_t)atoi(args[7].c_str());
    uint32_t public_input = args.size() > 8 ? (uint32_t)atoi(args[8].c_str()) : 0;
    uint32_t public_output = args.size() > 9 ? (uint32_t)atoi(args[9].c_str()) : 0;
    uint32_t num_input_notes = (args[4][0] != '-') + (args[5][0] != '-');

    tx_note in_note1 = num_input_notes < 1 ? create_gibberish_note(user, in_value1) : create_note(user, in_value1);
    tx_note in_note2 = num_input_notes < 2 ? create_gibberish_note(user, in_value2) : create_note(user, in_value2);
    tx_note out_note1 = create_note(user, out_value1);
    tx_note out_note2 = create_note(user, out_value2);

    tx_note notes[4] = { in_note1, in_note2, out_note1, out_note2 };
    std::array<grumpkin::fq::field_t, 8> to_compress;
    for (size_t i = 0; i < 4; ++i) {
        auto encrypted = crypto::pedersen_note::encrypt_note(notes[i]);
        to_compress[i * 2] = encrypted.x;
        to_compress[i * 2 + 1] = encrypted.y;
    }
    fr::field_t compressed = crypto::pedersen::compress_eight_native(to_compress);
    std::vector<uint8_t> message(sizeof(fr::field_t));
    fr::serialize_to_buffer(compressed, &message[0]);
    crypto::schnorr::signature signature =
        crypto::schnorr::construct_signature<Blake2sHasher, grumpkin::fq, grumpkin::fr, grumpkin::g1>(
            std::string(message.begin(), message.end()), { user.private_key, user.public_key });

    join_split_tx tx = {
        public_input,       public_output,          num_input_notes,
        { index1, index2 }, { in_note1, in_note2 }, { out_note1, out_note2 },
        signature,          user.public_key,
    };

    std::cout << "public_input: " << public_input << "\n"
              << "public_output: " << public_output << "\n"
              << "in_value1: " << in_value1 << "\n"
              << "in_value2: " << in_value2 << "\n"
              << "out_value1: " << out_value1 << "\n"
              << "out_value2: " << out_value2 << "\n"
              << "num_input_notes: " << num_input_notes << "\n"
              << std::endl;

    return join_split(ctx, tx);
}

void usage(std::vector<std::string> const& args)
{
    std::cout << "usage: " << args[0] << " [create ...] [destroy ...] [split ...] [join ...] [join-split ...]"
              << std::endl;
}

} // namespace

int main(int argc, char** argv)
{
    std::vector<std::string> args(argv, argv + argc);

    if (args.size() < 2) {
        usage(args);
        return -1;
    }

    std::string cmd = argv[1];

    if (cmd == "reset") {
        leveldb::DestroyDB(DATA_DB_PATH, leveldb::Options());
        leveldb::DestroyDB(NULLIFIER_DB_PATH, leveldb::Options());
        return 0;
    }

    // Composer get's corrupted if we use move ctors. Have to create at top level :/
    Composer composer = Composer();
    rollup_context ctx = create_rollup_context(composer);
    user_context user = create_user_context();
    bool success = false;

    if (cmd == "create") {
        if (args.size() != 3) {
            std::cout << "usage: " << argv[0] << " create <value>" << std::endl;
            return -1;
        }
        success = create(args, ctx, user);
    } else if (cmd == "destroy") {
        if (args.size() != 4) {
            std::cout << "usage: " << argv[0] << " destroy <index> <value>" << std::endl;
            return -1;
        }
        success = destroy(args, ctx, user);
    } else if (cmd == "split") {
        if (args.size() != 5) {
            std::cout << "usage: " << argv[0]
                      << " split <note index to spend> <first new note value> <second new note value>" << std::endl;
            return -1;
        }
        success = split(args, ctx, user);
    } else if (cmd == "join") {
        if (args.size() != 6) {
            std::cout << "usage: " << argv[0]
                      << " join <first note index to join> <second note index to join> <first note value> "
                         " <second note value>"
                      << std::endl;
            return -1;
        }
        success = join(args, ctx, user);
    } else if (cmd == "join-split") {
        if (args.size() < 8) {
            std::cout << "usage: " << argv[0]
                      << " join <first note index to join> <second note index to join> <first input note value>"
                         " <second input note value> <first output note value> <second output note value>"
                         " [public input] [public output]"
                      << std::endl;
            return -1;
        }
        success = join_split(args, ctx, user);
    } else {
        usage(args);
        return -1;
    }

    if (!success) {
        std::cout << "Failed to generate witness data." << std::endl;
        return -1;
    }

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

    return verified ? 0 : 1;
}