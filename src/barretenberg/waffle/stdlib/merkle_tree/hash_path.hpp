#pragma once
#include "../field/field.hpp"
#include "../int_utils.hpp"
#include "hash.hpp"
#include <iostream>
#include <vector>

namespace plonk {
namespace stdlib {
namespace merkle_tree {

using namespace barretenberg;
using namespace int_utils;
typedef std::vector<std::pair<fr::field_t, fr::field_t>> fr_hash_path;

inline fr_hash_path get_new_hash_path(fr_hash_path const& old_path, uint128_t index, std::string const& value)
{
    fr_hash_path path = old_path;
    barretenberg::fr::field_t current = sha256(value);
    for (size_t i = 0; i < old_path.size(); ++i) {
        bool path_bit = index & 0x1;
        if (path_bit) {
            path[i].second = current;
        } else {
            path[i].first = current;
        }
        current = hash({ path[i].first, path[i].second });
        index /= 2;
    }
    return path;
}

} // namespace merkle_tree
} // namespace stdlib
} // namespace plonk

// We add to std namespace as fr_hash_path is actually a std::vector, and this is the only way
// to achieve effective ADL.
namespace std {
inline std::ostream& operator<<(std::ostream& os, plonk::stdlib::merkle_tree::fr_hash_path const& path)
{
    os << "[\n";
    for (size_t i = 0; i < path.size(); ++i) {
        os << "  (" << i << ": " << path[i].first << ", " << path[i].second << ")\n";
    }
    os << "]";
    return os;
}
} // namespace std