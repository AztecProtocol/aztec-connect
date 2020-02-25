#pragma once
#include <barretenberg/curves/bn254/fr.hpp>
#include <barretenberg/curves/grumpkin/grumpkin.hpp>

namespace rollup {

struct user_context {
    barretenberg::fr::field_t note_secret;
    grumpkin::fr::field_t private_key;
    grumpkin::g1::affine_element public_key;
};

} // namespace rollup