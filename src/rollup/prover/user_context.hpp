#pragma once
#include <barretenberg/curves/bn254/fr.hpp>
#include <barretenberg/curves/grumpkin/grumpkin.hpp>

namespace rollup {

struct user_context {
    barretenberg::fr note_secret;
    grumpkin::fr private_key;
    grumpkin::g1::affine_element public_key;
};

} // namespace rollup