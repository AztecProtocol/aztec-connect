#pragma once
#include <stddef.h>
#include <stdint.h>
#include <numeric/uint256/uint256.hpp>
#include <ecc/curves/grumpkin/grumpkin.hpp>

namespace rollup {

constexpr size_t DATA_TREE_DEPTH = 32;
constexpr size_t NULL_TREE_DEPTH = 256;
constexpr size_t ROOT_TREE_DEPTH = 28;
constexpr size_t DEFI_TREE_DEPTH = 30;

constexpr size_t MAX_NO_WRAP_INTEGER_BIT_LENGTH = grumpkin::MAX_NO_WRAP_INTEGER_BIT_LENGTH;
constexpr size_t MAX_TXS_BIT_LENGTH = 10;
constexpr size_t TX_FEE_BIT_LENGTH = MAX_NO_WRAP_INTEGER_BIT_LENGTH - MAX_TXS_BIT_LENGTH;

constexpr size_t NUM_ASSETS_BIT_LENGTH = 4;
constexpr size_t NUM_ASSETS = 1 << NUM_ASSETS_BIT_LENGTH;
constexpr size_t ASSET_ID_BIT_LENGTH = 30;
constexpr size_t MAX_NUM_ASSETS_BIT_LENGTH = 30;
constexpr size_t MAX_NUM_ASSETS = 1 << MAX_NUM_ASSETS_BIT_LENGTH;
constexpr size_t ALIAS_HASH_BIT_LENGTH = 224;

constexpr uint32_t NUM_BRIDGE_CALLS_PER_BLOCK = 32;
constexpr uint32_t NUM_INTERACTION_RESULTS_PER_BLOCK = 32;

namespace circuit_gate_count {

/*
The boolean is_circuit_change_expected should be set to 0 by default. When there is an expected circuit change, the
developer can quickly check whether the circuit gate counts are in allowed range i.e., below the next power of two
limit, by setting it to one. However, while merging the corresponding PR, the developer should set
is_circuit_change_expected to zero and change the modified circuit gate counts accordingly.
*/
constexpr bool is_circuit_change_expected = 0;
/* The below constants are only used for regression testing; to identify accidental changes to circuit
 constraints. They need to be changed when there is a circuit change. */
constexpr uint32_t ACCOUNT = 23967;
constexpr uint32_t JOIN_SPLIT = 64047;
constexpr uint32_t CLAIM = 23050;
constexpr uint32_t ROLLUP = 1173221;
constexpr uint32_t ROOT_ROLLUP = 5481327;
constexpr uint32_t ROOT_VERIFIER = 7435892;
}; // namespace circuit_gate_count

namespace circuit_gate_next_power_of_two {
/* The below constants are used in tests to detect undesirable circuit changes. They should not be changed unless we
want to exceed the next power of two limit. */
constexpr uint32_t ACCOUNT = 32768;
constexpr uint32_t JOIN_SPLIT = 65536;
constexpr uint32_t CLAIM = 32768;
constexpr uint32_t ROLLUP = 2097152;
constexpr uint32_t ROOT_ROLLUP = 8388608;
constexpr uint32_t ROOT_VERIFIER = 8388608;
}; // namespace circuit_gate_next_power_of_two

namespace circuit_vk_hash {
/* These below constants are only used for regression testing; to identify accidental changes to circuit
 constraints. They need to be changed when there is a circuit change. Note that they are written in the reverse order
 to comply with the from_buffer<>() method. */
constexpr auto ACCOUNT = uint256_t(0xcd6d70c733eaf823, 0x6505d3402817ad3d, 0xbf9e2b6a262589cf, 0xafcc546b55cc45e3);
constexpr auto JOIN_SPLIT = uint256_t(0xb23c7772f47bc823, 0x5493625d4f08603c, 0x21ac50a5929576f9, 0xb7b3113c131460e5);
constexpr auto CLAIM = uint256_t(0xa753ce523719749e, 0x80216aff7f8bc9ce, 0xa9b0f69bbd24ac33, 0xae17c5fb7d488138);
constexpr auto ROLLUP = uint256_t(0x5f2f6590e5553f19, 0x62c287e01b897621, 0xf32d03437085e2d, 0x567b0be24dc99966);
constexpr auto ROOT_ROLLUP = uint256_t(0x64e5e03cf9534ed6, 0x7fdc871935b9e4fe, 0xd2b81e990cc15f3d, 0x47f00f76d92e5e4d);
;
constexpr auto ROOT_VERIFIER =
    uint256_t(0xb4349747ae6ea507, 0xfaafa0f2e384c984, 0x9325870bcc594daf, 0x50163a2572c67363);
}; // namespace circuit_vk_hash

namespace ProofIds {
enum { PADDING = 0, DEPOSIT = 1, WITHDRAW = 2, SEND = 3, ACCOUNT = 4, DEFI_DEPOSIT = 5, DEFI_CLAIM = 6 };
};

} // namespace rollup