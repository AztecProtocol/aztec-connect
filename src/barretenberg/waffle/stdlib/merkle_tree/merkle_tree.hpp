#pragma once
#include "../field/field.hpp"
#include "../uint32/uint32.hpp"

namespace plonk {
namespace stdlib {

template <typename ComposerContext> class merkle_tree {
  public:
    typedef stdlib::field_t<ComposerContext> field_t;
    typedef stdlib::bool_t<ComposerContext> bool_t;
    typedef stdlib::uint32<ComposerContext> uint32;
    typedef std::vector<std::pair<field_t, field_t>> hash_path;

    merkle_tree(ComposerContext& ctx, size_t depth);

    bool_t check_membership(field_t const& input, uint32 const& index);

    bool_t assert_check_membership(field_t const& input, uint32 const& index);

    void add_member(field_t const& input);

  private:
    barretenberg::fr::field_t hash(std::vector<barretenberg::fr::field_t> const& input);

    bool_t check_membership(
        ComposerContext& ctx, field_t const& root, hash_path const& hashes, field_t const& input, uint32 const& index);

    void update_membership(ComposerContext& ctx,
                           field_t const& new_root,
                           hash_path const& new_hashes,
                           field_t const& old_root,
                           hash_path const& old_hashes,
                           field_t const& input,
                           uint32 const& index);

    hash_path get_hash_path(size_t index);

    hash_path get_new_hash_path(size_t index, barretenberg::fr::field_t value);

    void update_hash_path(size_t index, hash_path path);

  private:
    ComposerContext& ctx_;
    field_t root_;
    size_t total_size_;
    size_t depth_;
    size_t size_;
    std::vector<barretenberg::fr::field_t> hashes_;
};

template <typename ComposerContext>
std::ostream& operator<<(std::ostream& os,
                         std::vector<std::pair<field_t<ComposerContext>, field_t<ComposerContext>>> const& path);

} // namespace stdlib
} // namespace plonk

#include "merkle_tree.tcc"