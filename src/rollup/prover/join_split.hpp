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

inline std::ostream& operator<<(std::ostream& os, join_split_tx const& tx)
{
    return os << "public_input: " << tx.public_input << "\n"
              << "public_output: " << tx.public_output << "\n"
              << "in_value1: " << tx.input_note[0].value << "\n"
              << "in_value2: " << tx.input_note[1].value << "\n"
              << "out_value1: " << tx.output_note[0].value << "\n"
              << "out_value2: " << tx.output_note[1].value << "\n"
              << "num_input_notes: " << tx.num_input_notes << "\n";
}

} // namespace rollup