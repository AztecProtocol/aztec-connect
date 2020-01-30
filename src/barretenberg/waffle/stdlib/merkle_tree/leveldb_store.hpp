#pragma once
#include "../field/field.hpp"
#include "hash_path.hpp"
#include <leveldb/db.h>
#include <leveldb/write_batch.h>

namespace plonk {
namespace stdlib {
namespace merkle_tree {

using namespace barretenberg;

typedef struct {
    uint64_t data[8];
} value_t;

class LevelDbStore {
  public:
    LevelDbStore(std::string const& path, size_t depth);

    fr_hash_path get_hash_path(size_t index);

    void update_element(size_t index, fr::field_t const& value);

    fr::field_t get_element(size_t index);

    fr::field_t root() const;

  private:
    fr::field_t update_element(
        fr::field_t const& root, fr::field_t const& value, size_t index, size_t height, leveldb::WriteBatch& batch);

    fr::field_t get_element(fr::field_t const& root, size_t index, size_t height);

    fr::field_t compute_zero_path_hash(size_t height, size_t index, fr::field_t const& value);

    fr::field_t binary_put(
        size_t a_index, fr::field_t const& a, fr::field_t const& b, size_t height, leveldb::WriteBatch& batch);

    fr::field_t fork_stump(fr::field_t const& value1,
                           size_t index1,
                           fr::field_t const& value2,
                           size_t index2,
                           size_t height,
                           size_t stump_height,
                           leveldb::WriteBatch& batch);

    void put(fr::field_t key, fr::field_t left, fr::field_t right, leveldb::WriteBatch& batch);

    void put_stump(fr::field_t key, size_t index, fr::field_t value, leveldb::WriteBatch& batch);

  private:
    std::unique_ptr<leveldb::DB> db_;
    std::vector<fr::field_t> zero_hashes_;
    size_t depth_;
    size_t total_size_;
    fr::field_t root_;
};

} // namespace merkle_tree
} // namespace stdlib
} // namespace plonk