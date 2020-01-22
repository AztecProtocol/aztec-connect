#include "leveldb_store.hpp"
#include "hash.hpp"
#include <leveldb/db.h>

namespace plonk {
namespace stdlib {
namespace merkle_tree {

LevelDbStore::LevelDbStore(size_t depth)
    : depth_(depth)
{
    ASSERT(depth_ >= 1 && depth <= 256);
    total_size_ = 1ULL << depth_;
    hashes_.resize(total_size_ * 2 - 2);

    // Build the entire tree.
    auto current = hash({ barretenberg::fr::zero });
    size_t layer_size = total_size_;
    for (size_t offset = 0; offset < hashes_.size(); offset += layer_size, layer_size /= 2) {
        for (size_t i = 0; i < layer_size; ++i) {
            hashes_[offset + i] = current;
        }
        current = hash({ current, current });
    }

    root_ = current;

    leveldb::DB* db;
    leveldb::Options options;
    options.create_if_missing = true;
    leveldb::Status status = leveldb::DB::Open(options, "/tmp/testdb", &db);
    assert(status.ok());
}

typename LevelDbStore::fr_hash_path LevelDbStore::get_hash_path(size_t index)
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

typename LevelDbStore::fr_hash_path LevelDbStore::get_new_hash_path(size_t index, barretenberg::fr::field_t value)
{
    fr_hash_path path = get_hash_path(index);
    size_t offset = 0;
    size_t layer_size = total_size_;
    barretenberg::fr::field_t current = value;
    for (size_t i = 0; i < depth_; ++i) {
        bool path_bit = index & 0x1;
        if (path_bit) {
            path[i].second = current;
        } else {
            path[i].first = current;
        }
        current = hash({ path[i].first, path[i].second });
        offset += layer_size;
        layer_size /= 2;
        index /= 2;
    }
    return path;
}

void LevelDbStore::update_hash_path(size_t index, typename LevelDbStore::fr_hash_path path)
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

} // namespace merkle_tree
} // namespace stdlib
} // namespace plonk