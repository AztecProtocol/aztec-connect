#pragma once
#include "../../../misc_crypto/sha256/sha256.hpp"
#include "../../composer/standard_composer.hpp"
#include "../field/field.hpp"
#include "../group/group_utils.hpp"
#include "../mimc.hpp"
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

inline barretenberg::fr::field_t sha256(std::string const& input)
{
    /*
    std::vector<unsigned char> src(input.size() * 32);
    auto src_ptr = (barretenberg::fr::field_t*)&src[0];
    for (size_t i = 0; i < input.size(); ++i) {
        src_ptr[i] = barretenberg::fr::from_montgomery_form(input[i]);
        if (isLittleEndian()) {
            barretenberg::fr::field_t be;
            be.data[0] = __builtin_bswap64(src_ptr[i].data[3]);
            be.data[1] = __builtin_bswap64(src_ptr[i].data[2]);
            be.data[2] = __builtin_bswap64(src_ptr[i].data[1]);
            be.data[3] = __builtin_bswap64(src_ptr[i].data[0]);
            src_ptr[i] = be;
        }
        // TODO: Reverse machine words on BE?
    }
    */
    std::vector<uint8_t> inputv(input.begin(), input.end());
    std::vector<uint8_t> output = sha256::sha256_block(inputv);
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

inline barretenberg::fr::field_t hash_to_index(std::string const& input)
{
    std::vector<uint8_t> inputv(input.begin(), input.end());
    std::vector<uint8_t> output = sha256::sha256(inputv);
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

inline barretenberg::fr::field_t hash(std::vector<barretenberg::fr::field_t> const& input)
{
    return group_utils::compress_native(input[0], input[1]);
}

// inline barretenberg::fr::field_t hash(std::vector<barretenberg::fr::field_t> const& input)
// {
//     waffle::StandardComposer throw_away_composer;
//     std::vector<field_t<waffle::StandardComposer>> inputs;
//     std::transform(input.begin(), input.end(), std::back_inserter(inputs), [&](auto const& v) {
//         return field_t<waffle::StandardComposer>(witness_t(&throw_away_composer, v));
//     });
//     return stdlib::mimc7<waffle::StandardComposer>(inputs).get_value();
// }

} // namespace merkle_tree
} // namespace stdlib
} // namespace plonk