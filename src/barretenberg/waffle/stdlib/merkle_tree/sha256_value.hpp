#pragma once
#include "../bitarray/bitarray.hpp"
#include "../byte_array/byte_array.hpp"
#include "../crypto/hash/sha256.hpp"
#include "../field/field.hpp"

namespace plonk {
namespace stdlib {
namespace merkle_tree {

template <typename ComposerContext>
inline byte_array<ComposerContext> sha256_value(byte_array<ComposerContext> const& input)
{
    ASSERT(input.get_context() != nullptr);
    return stdlib::sha256(bitarray<ComposerContext>(input));
}

} // namespace merkle_tree
} // namespace stdlib
} // namespace plonk