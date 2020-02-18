#pragma once
#include "../field/field.hpp"
#include "hash_path.hpp"
#include <leveldb/db.h>
#include <leveldb/write_batch.h>

namespace plonk {
namespace stdlib {
namespace merkle_tree {

using namespace barretenberg;

class LevelDbStore {
  public:
    typedef uint128_t index_t;
    typedef std::string value_t;

    LevelDbStore(std::string const& path, size_t depth);

    fr_hash_path get_hash_path(index_t index);

    void update_element(index_t index, value_t const& value);

    value_t get_element(index_t index);

    fr::field_t root() const;

    size_t depth() const { return depth_; }

  private:
    fr::field_t update_element(
        fr::field_t const& root, fr::field_t const& value, index_t index, size_t height, leveldb::WriteBatch& batch);

    fr::field_t get_element(fr::field_t const& root, index_t index, size_t height);

    fr::field_t compute_zero_path_hash(size_t height, index_t index, fr::field_t const& value);

    fr::field_t binary_put(
        index_t a_index, fr::field_t const& a, fr::field_t const& b, size_t height, leveldb::WriteBatch& batch);

    fr::field_t fork_stump(fr::field_t const& value1,
                           index_t index1,
                           fr::field_t const& value2,
                           index_t index2,
                           size_t height,
                           size_t stump_height,
                           leveldb::WriteBatch& batch);

    void put(fr::field_t const& key, fr::field_t const& left, fr::field_t const& right, leveldb::WriteBatch& batch);

    void put_stump(fr::field_t const& key, index_t index, fr::field_t const& value, leveldb::WriteBatch& batch);

  private:
    static constexpr size_t LEAF_BYTES = 64;
    std::unique_ptr<leveldb::DB> db_;
    std::vector<fr::field_t> zero_hashes_;
    size_t depth_;
    size_t total_size_;
    fr::field_t root_;
};

} // namespace merkle_tree
} // namespace stdlib
} // namespace plonk