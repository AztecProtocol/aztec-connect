#pragma once
#include <barretenberg/curves/bn254/fr.hpp>
#include <barretenberg/curves/grumpkin/grumpkin.hpp>

namespace rollup {

struct user_context {
    barretenberg::fr::field_t note_secret;
    grumpkin::fr::field_t private_key;
    grumpkin::g1::affine_element public_key;
};

inline user_context create_user_context()
{
    barretenberg::fr::field_t note_secret = { { 0x11111111, 0x11111111, 0x11111111, 0x11111111 } };
    grumpkin::fr::field_t owner_secret = { { 0x55555555, 0x55555555, 0x55555555, 0x55555555 } };
    grumpkin::g1::affine_element owner_pub_key =
        grumpkin::g1::group_exponentiation(grumpkin::g1::affine_one, owner_secret);
    return { note_secret, owner_secret, owner_pub_key };
}

} // namespace rollup