#pragma once
#include "../field/field.hpp"
#include "../uint32/uint32.hpp"
#include "leveldb_store.hpp"

namespace plonk {
namespace stdlib {
namespace merkle_tree {

template <typename ComposerContext> class merkle_tree {
  public:
    typedef stdlib::field_t<ComposerContext> field_t;
    typedef stdlib::bool_t<ComposerContext> bool_t;
    typedef stdlib::uint32<ComposerContext> uint32;
    typedef std::vector<std::pair<barretenberg::fr::field_t, barretenberg::fr::field_t>> fr_hash_path;
    typedef std::vector<std::pair<field_t, field_t>> hash_path;

    merkle_tree(ComposerContext& ctx, size_t depth);

    bool_t check_membership(field_t const& input, uint32 const& index);

    bool_t assert_check_membership(field_t const& input, uint32 const& index);

    void add_member(field_t const& input);

    void update_member(field_t const& value, uint32 const& index);

    // void add_tree(merkle_tree<ComposerContext> const& other);

  private:
    hash_path create_witness_hash_path(fr_hash_path const& input);

    bool_t check_membership(field_t const& root, hash_path const& hashes, field_t const& value, uint32 const& index);

    bool_t check_hash_path(field_t const& root, hash_path const& hashes, uint32 const& index);

    void update_membership(field_t const& new_root,
                           hash_path const& new_hashes,
                           field_t const& new_value,
                           field_t const& old_root,
                           hash_path const& old_hashes,
                           uint32 const& index);

    fr_hash_path get_new_hash_path(size_t index, barretenberg::fr::field_t value);

  private:
    ComposerContext& ctx_;
    LevelDbStore store_;
    field_t root_;
    size_t total_size_;
    size_t depth_;
    size_t size_;
};

std::ostream& operator<<(std::ostream& os,
                         std::vector<std::pair<barretenberg::fr::field_t, barretenberg::fr::field_t>> const& path);

} // namespace merkle_tree
} // namespace stdlib
} // namespace plonk

#include "merkle_tree.tcc"