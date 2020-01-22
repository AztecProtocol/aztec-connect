#pragma once
#include "../field/field.hpp"

namespace plonk {
namespace stdlib {
namespace merkle_tree {

class MerkleTreeMemoryStore {
  public:
    typedef std::vector<std::pair<barretenberg::fr::field_t, barretenberg::fr::field_t>> fr_hash_path;

    MerkleTreeMemoryStore(size_t depth);

    fr_hash_path get_hash_path(size_t index);

    fr_hash_path get_new_hash_path(size_t index, barretenberg::fr::field_t value);

    void update_hash_path(size_t index, fr_hash_path path);

    barretenberg::fr::field_t root() const { return root_; }

  private:
    size_t depth_;
    size_t total_size_;
    barretenberg::fr::field_t root_;
    std::vector<barretenberg::fr::field_t> hashes_;
};

} // namespace merkle_tree
} // namespace stdlib
} // namespace plonk