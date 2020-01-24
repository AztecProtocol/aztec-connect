#pragma once
#include "../field/field.hpp"
#include <leveldb/db.h>

namespace plonk {
namespace stdlib {
namespace merkle_tree {

typedef struct {
    uint64_t data[8];
} value_t;

typedef std::vector<std::pair<barretenberg::fr::field_t, barretenberg::fr::field_t>> fr_hash_path;

class LevelDbStore {
  public:
    LevelDbStore(std::string const& path, size_t depth);

    fr_hash_path get_hash_path(size_t index);

    void update_hash_path(size_t index, fr_hash_path path);

    void update_element(size_t index, fr::field_t value);

    barretenberg::fr::field_t root() const;

  private:
    fr::field_t update_element(fr::field_t const& root, fr::field_t const& value, size_t index, size_t height);

  private:
    std::unique_ptr<leveldb::DB> db_;
    std::vector<barretenberg::fr::field_t> zero_hashes_;
    size_t depth_;
    size_t total_size_;
    std::string root_;
};

} // namespace merkle_tree
} // namespace stdlib
} // namespace plonk