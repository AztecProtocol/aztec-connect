#pragma once
#include "types.hpp"
#include <barretenberg/misc_crypto/schnorr/schnorr.hpp>

namespace rollup {

struct join_split_tx {
    uint32_t public_input;
    uint32_t public_output;
    uint32_t num_input_notes;
    uint32_t input_note_index[2];
    tx_note input_note[2];
    tx_note output_note[2];
    crypto::schnorr::signature signature;
    grumpkin::g1::affine_element owner_pub_key;
};

bool join_split(rollup_context& ctx, join_split_tx const& tx);

}