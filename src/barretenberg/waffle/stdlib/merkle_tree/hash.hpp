#pragma once
#include "../../composer/standard_composer.hpp"
#include "../crypto/hash/picosha2.hpp"
#include "../field/field.hpp"
#include "../group/group_utils.hpp"
#include "../mimc.hpp"
#include <vector>

namespace plonk {
namespace stdlib {
namespace merkle_tree {

/*
inline barretenberg::fr::field_t hash(std::vector<barretenberg::fr::field_t> const& input)
{
    // TODO: Change to pederson hashes.
    // As mimc currently only accepts witness types use a throw away composer to compute the hashes.
    waffle::StandardComposer throw_away_composer;
    std::vector<field_t<waffle::StandardComposer>> inputs;
    std::transform(input.begin(), input.end(), std::back_inserter(inputs), [&](auto const& v) {
        return field_t<waffle::StandardComposer>(witness_t(&throw_away_composer, v));
    });
    return stdlib::mimc7<waffle::StandardComposer>(inputs).get_value();
}

*/

inline bool isLittleEndian()
{
    constexpr int num = 42;
    return (*(char*)&num == 42);
}

inline barretenberg::fr::field_t sha256(std::vector<barretenberg::fr::field_t> const& input)
{
    std::vector<unsigned char> src((unsigned char*)&input[0], (unsigned char*)(&input[0] + input.size()));
    std::vector<unsigned char> output(picosha2::k_digest_size);
    picosha2::hash256(src.begin(), src.end(), output.begin(), output.end());
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

} // namespace merkle_tree
} // namespace stdlib
} // namespace plonk