#pragma once
#include "../field/field.hpp"
#include <vector>

namespace plonk {
namespace stdlib {
namespace merkle_tree {

using namespace barretenberg;
typedef std::vector<std::pair<fr::field_t, fr::field_t>> fr_hash_path;

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
}