#include "../prover/join_split_tx.hpp"
#include "../prover/user_context.hpp"
#include <iostream>

namespace {
using namespace barretenberg;
using namespace rollup;

typedef crypto::pedersen_note::private_note tx_note;

user_context create_user_context()
{
    barretenberg::fr note_secret = { { 0x11111111, 0x11111111, 0x11111111, 0x11111111 } };
    grumpkin::fr owner_secret = { { 0x11111111, 0x11111111, 0x11111111, 0x11111111 } };
    grumpkin::g1::affine_element owner_pub_key(grumpkin::g1::one * owner_secret);
    return { note_secret, owner_secret, owner_pub_key };
}

fr generate_random_secret()
{
    fr secret = fr::random_element().from_montgomery_form();
    secret.data[3] = secret.data[3] & (~0b1111110000000000000000000000000000000000000000000000000000000000ULL);
    return secret.to_montgomery_form();
};

tx_note create_note(user_context const& user, uint32_t value)
{
    return { { user.public_key.x, user.public_key.y }, value, user.note_secret };
}

tx_note create_gibberish_note(user_context const& user, uint32_t value)
{
    return { { user.public_key.x, user.public_key.y }, value, generate_random_secret() };
}

crypto::schnorr::signature sign_notes(std::array<tx_note, 4> const& notes, user_context const& user)
{
    std::array<grumpkin::fq, 8> to_compress;
    for (size_t i = 0; i < 4; ++i) {
        auto encrypted = crypto::pedersen_note::encrypt_note(notes[i]);
        to_compress[i * 2] = encrypted.x;
        to_compress[i * 2 + 1] = encrypted.y;
    }
    fr compressed = crypto::pedersen::compress_eight_native(to_compress);
    std::vector<uint8_t> message(sizeof(fr));
    fr::serialize_to_buffer(compressed, &message[0]);
    crypto::schnorr::signature signature =
        crypto::schnorr::construct_signature<Blake2sHasher, grumpkin::fq, grumpkin::fr, grumpkin::g1>(
            std::string(message.begin(), message.end()), { user.private_key, user.public_key });
    return signature;
}

join_split_tx create_join_split_tx(std::vector<std::string> const& args, user_context const& user)
{
    uint32_t index1 = (uint32_t)atoi(args[0].c_str());
    uint32_t index2 = (uint32_t)atoi(args[1].c_str());
    uint32_t in_value1 = (uint32_t)atoi(args[2].c_str());
    uint32_t in_value2 = (uint32_t)atoi(args[3].c_str());
    uint32_t out_value1 = (uint32_t)atoi(args[4].c_str());
    uint32_t out_value2 = (uint32_t)atoi(args[5].c_str());
    uint32_t public_input = args.size() > 6 ? (uint32_t)atoi(args[6].c_str()) : 0;
    uint32_t public_output = args.size() > 7 ? (uint32_t)atoi(args[7].c_str()) : 0;
    uint32_t num_input_notes = (uint32_t)(args[2][0] != '-') + (uint32_t)(args[3][0] != '-');

    tx_note in_note1 = num_input_notes < 1 ? create_gibberish_note(user, in_value1) : create_note(user, in_value1);
    tx_note in_note2 = num_input_notes < 2 ? create_gibberish_note(user, in_value2) : create_note(user, in_value2);
    tx_note out_note1 = create_note(user, out_value1);
    tx_note out_note2 = create_note(user, out_value2);

    auto signature = sign_notes({ in_note1, in_note2, out_note1, out_note2 }, user);

    return {
        user.public_key,
        public_input,
        public_output,
        num_input_notes,
        {
            index1,
            index2,
        },
        {
            in_note1,
            in_note2,
        },
        {
            out_note1,
            out_note2,
        },
        signature,
    };
}

} // namespace

int main(int argc, char** argv)
{
    std::vector<std::string> args(argv, argv + argc);

    if (args.size() < 2) {
        std::cout << "usage: " << args[0] << " <num transactions>" << std::endl;
        return -1;
    }

    user_context user = create_user_context();
    size_t num_txs = (size_t)atoi(args[1].c_str());

    join_split_tx tx = create_join_split_tx({ "0", "0", "-", "-", "50", "50", "100", "0" }, user);
    write(std::cout, tx);

    for (size_t i = 0; i < num_txs - 1; ++i) {
        auto index1 = std::to_string(i * 2);
        auto index2 = std::to_string(i * 2 + 1);
        join_split_tx tx = create_join_split_tx({ index1, index2, "50", "50", "50", "50", "0", "0" }, user);
        write(std::cout, tx);
    }

    return 0;
}
