#pragma once
#include "../bitarray/bitarray.hpp"
#include "../byte_array/byte_array.hpp"
#include "../field/field.hpp"
#include "../int_utils.hpp"
#include "leveldb_store.hpp"
#include "memory_store.hpp"

namespace waffle {
class TurboComposer;
} // namespace waffle

namespace plonk {
namespace stdlib {
namespace merkle_tree {

using namespace int_utils;

template <typename ComposerContext> class merkle_tree {
  public:
    typedef stdlib::field_t<ComposerContext> field_t;
    typedef stdlib::bool_t<ComposerContext> bool_t;
    typedef stdlib::field_t<ComposerContext> index_t;
    typedef stdlib::byte_array<ComposerContext> value_t;
    typedef stdlib::uint32<ComposerContext> uint32;
    typedef stdlib::bitarray<ComposerContext> bitarray;
    typedef stdlib::byte_array<ComposerContext> byte_array;
    typedef std::vector<std::pair<field_t, field_t>> hash_path;

    merkle_tree(ComposerContext& ctx, LevelDbStore& store);

    bool_t check_membership(value_t const& value, index_t const& index);

    bool_t assert_check_membership(value_t const& value, index_t const& index);

    void add_member(value_t const& value);

    void update_member(value_t const& value, index_t const& index);

  private:
    hash_path create_witness_hash_path(fr_hash_path const& input);

    bool_t check_membership(field_t const& root,
                            hash_path const& hashes,
                            value_t const& value,
                            byte_array const& index);

    bool_t check_hash_path(field_t const& root, hash_path const& hashes, byte_array const& index);

    void update_membership(field_t const& new_root,
                           hash_path const& new_hashes,
                           value_t const& new_value,
                           field_t const& old_root,
                           hash_path const& old_hashes,
                           byte_array const& index);

    field_t compress(field_t const& left, field_t const& right);

  private:
    ComposerContext& ctx_;
    LevelDbStore& store_;
    field_t root_;
    uint128_t total_size_;
    size_t depth_;
    uint128_t size_;
};

extern template class merkle_tree<waffle::TurboComposer>;

} // namespace merkle_tree
} // namespace stdlib
} // namespace plonk