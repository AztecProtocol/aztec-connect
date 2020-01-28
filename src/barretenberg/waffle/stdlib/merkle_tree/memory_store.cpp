#include "memory_store.hpp"
#include "hash.hpp"

namespace plonk {
namespace stdlib {
namespace merkle_tree {

MemoryStore::MemoryStore(size_t depth)
    : depth_(depth)
{
    ASSERT(depth_ >= 1 && depth <= 256);
    total_size_ = 1ULL << depth_;
    hashes_.resize(total_size_ * 2 - 2);

    // Build the entire tree.
    auto current = barretenberg::fr::zero;
    size_t layer_size = total_size_;
    for (size_t offset = 0; offset < hashes_.size(); offset += layer_size, layer_size /= 2) {
        for (size_t i = 0; i < layer_size; ++i) {
            hashes_[offset + i] = current;
        }
        current = hash({ current, current });
    }

    root_ = current;
}

typename MemoryStore::fr_hash_path MemoryStore::get_hash_path(size_t index)
{
    fr_hash_path path(depth_);
    size_t offset = 0;
    size_t layer_size = total_size_;
    for (size_t i = 0; i < depth_; ++i) {
        index &= 0xFE;
        path[i] = std::make_pair(hashes_[offset + index], hashes_[offset + index + 1]);
        offset += layer_size;
        layer_size /= 2;
        index /= 2;
    }
    return path;
}

void MemoryStore::update_element(size_t index, fr::field_t const& value)
{
    size_t offset = 0;
    size_t layer_size = total_size_;
    fr::field_t current = value;
    for (size_t i = 0; i < depth_; ++i) {
        hashes_[offset + index] = current;
        index &= 0xFE;
        current = hash({ hashes_[offset + index], hashes_[offset + index + 1] });
        offset += layer_size;
        layer_size /= 2;
        index /= 2;
    }
    root_ = current;
}

fr::field_t MemoryStore::get_element(size_t index)
{
    return hashes_[index];
}

/*
void MerkleTreeMemoryStore::update_hash_path(size_t index, typename MerkleTreeMemoryStore::fr_hash_path path)
{
    size_t offset = 0;
    size_t layer_size = total_size_;
    for (size_t i = 0; i < depth_; ++i) {
        index &= 0xFE;
        hashes_[offset + index] = path[i].first;
        hashes_[offset + index + 1] = path[i].second;
        offset += layer_size;
        layer_size /= 2;
        index /= 2;
    }
}
*/

} // namespace merkle_tree
} // namespace stdlib
} // namespace plonk