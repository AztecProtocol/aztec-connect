#pragma once
#include "../../../misc_crypto/blake2s/blake2s.hpp"
#include "../../../misc_crypto/sha256/sha256.hpp"
#include "../byte_array/byte_array.hpp"
#include "../crypto/hash/blake2s.hpp"
#include "../crypto/hash/sha256.hpp"
#include "../group/group_utils.hpp"
#include <iomanip>
#include <iostream>
#include <vector>

namespace std {
inline std::ostream& operator<<(std::ostream& os, std::vector<unsigned char> const& t)
{
    os << "0x";
    for (auto e : t) {
        os << std::setfill('0') << std::hex << std::setw(2) << (int)e;
    }
    return os;
}
} // namespace std

namespace plonk {
namespace stdlib {
namespace merkle_tree {

inline bool isLittleEndian()
{
    constexpr int num = 42;
    return (*(char*)&num == 42);
}

template <typename ComposerContext> inline field_t<ComposerContext> hash_value(byte_array<ComposerContext> const& input)
{
    ASSERT(input.get_context() != nullptr);
    return stdlib::blake2s(input);
}

inline barretenberg::fr::field_t hash_value_native(std::string const& input)
{
    std::vector<uint8_t> inputv(input.begin(), input.end());
    std::vector<uint8_t> output = blake2::blake2s(inputv);
    barretenberg::fr::field_t result = barretenberg::fr::zero;
    if (isLittleEndian()) {
        result.data[0] = __builtin_bswap64(*(uint64_t*)&output[24]);
        result.data[1] = __builtin_bswap64(*(uint64_t*)&output[16]);
        result.data[2] = __builtin_bswap64(*(uint64_t*)&output[8]);
        result.data[3] = __builtin_bswap64(*(uint64_t*)&output[0]);
    } else {
        result.data[0] = *(uint64_t*)&output[24];
        result.data[1] = *(uint64_t*)&output[16];
        result.data[2] = *(uint64_t*)&output[8];
        result.data[3] = *(uint64_t*)&output[0];
    }
    return barretenberg::fr::to_montgomery_form(result);
}

inline barretenberg::fr::field_t compress_native(std::vector<barretenberg::fr::field_t> const& input)
{
    return group_utils::compress_native(input[0], input[1]);
}

} // namespace merkle_tree
} // namespace stdlib
} // namespace plonk