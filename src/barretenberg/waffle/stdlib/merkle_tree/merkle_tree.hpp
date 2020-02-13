#pragma once
#include "../bitarray/bitarray.hpp"
#include "../byte_array/byte_array.hpp"
#include "../crypto/hash/pedersen.hpp"
#include "../field/field.hpp"
#include "../int_utils.hpp"
#include "leveldb_store.hpp"
#include "memory_store.hpp"
#include "sha256_value.hpp"

namespace waffle {
class TurboComposer;
} // namespace waffle

namespace plonk {
namespace stdlib {
namespace merkle_tree {

using namespace int_utils;

template <typename Ctx> using hash_path = std::vector<std::pair<field_t<Ctx>, field_t<Ctx>>>;

/*
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

    // private:
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
                           value_t const& old_value,
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
*/

// TODO: Just use free functions?

template <typename Ctx> hash_path<Ctx> create_witness_hash_path(Ctx& ctx, fr_hash_path const& input)
{
    hash_path<Ctx> result;
    std::transform(input.begin(), input.end(), std::back_inserter(result), [&](auto const& v) {
        return std::make_pair(field_t(witness_t(&ctx, v.first)), field_t(witness_t(&ctx, v.second)));
    });
    return result;
}

fr::field_t get_hash_path_root(fr_hash_path const& input)
{
    return hash({ input[input.size() - 1].first, input[input.size() - 1].second });
}

template <typename Ctx>
bool_t<Ctx> check_membership(Ctx& ctx,
                             field_t<Ctx> const& root,
                             hash_path<Ctx> const& hashes,
                             byte_array<Ctx> const& value,
                             byte_array<Ctx> const& index)
{
    field_t current = sha256_value(value);
    bool_t is_member = witness_t(&ctx, true);

    for (size_t i = 0; i < hashes.size(); ++i) {
        bool_t path_bit = index.get_bit(i);

        bool_t is_left = (current == hashes[i].first) & !path_bit;
        bool_t is_right = (current == hashes[i].second) & path_bit;
        is_member &= is_left ^ is_right;
        if (!is_member.get_value()) {
            std::cout << "failed at height " << i << std::endl;
            std::cout << "is_left " << is_left.get_value() << std::endl;
            std::cout << "is_right " << is_right.get_value() << std::endl;
        }
        current = pedersen::compress(hashes[i].first, hashes[i].second);
        // std::cout << current << " = compress(" << hashes[i].first << ", " << hashes[i].second << ")" << std::endl;
    }

    // std::cout << "root " << root << std::endl;
    std::cout << "current " << current << " root " << root << std::endl;

    is_member &= current == root;
    return is_member;
}

template <typename Ctx>
void assert_check_membership(Ctx& ctx,
                             field_t<Ctx> const& root,
                             hash_path<Ctx> const& hashes,
                             byte_array<Ctx> const& value,
                             byte_array<Ctx> const& index)
{
    auto exists = stdlib::merkle_tree::check_membership(ctx, root, hashes, value, index);
    std::cout << "assert check membership " << exists << std::endl;
    ctx.assert_equal_constant(exists.witness_index, fr::one);
}

template <typename Ctx>
void update_membership(Ctx& ctx,
                       field_t<Ctx> const& new_root,
                       hash_path<Ctx> const& new_hashes,
                       byte_array<Ctx> const& new_value,
                       field_t<Ctx> const& old_root,
                       hash_path<Ctx> const& old_hashes,
                       byte_array<Ctx> const& old_value,
                       byte_array<Ctx> const& index)
{
    // Check old path hashes lead to the old root. They're used when validating the new path hashes.
    bool_t old_hashes_valid = check_membership(ctx, old_root, old_hashes, old_value, index);
    std::cout << "old valid " << old_hashes_valid.get_value() << std::endl;
    ctx.assert_equal_constant(old_hashes_valid.witness_index, barretenberg::fr::one);

    // Check the new path hashes lead from the new value to the new root.
    bool_t new_hashes_valid = check_membership(ctx, new_root, new_hashes, new_value, index);
    std::cout << "new valid " << new_hashes_valid.get_value() << std::endl;
    ctx.assert_equal_constant(new_hashes_valid.witness_index, barretenberg::fr::one);

    // Check that only the appropriate left or right hash was updated in the new hash path.
    for (size_t i = 0; i < new_hashes.size(); ++i) {
        bool_t path_bit = index.get_bit(i);
        bool_t share_left = (old_hashes[i].first == new_hashes[i].first) & path_bit;
        bool_t share_right = (old_hashes[i].second == new_hashes[i].second) & !path_bit;
        ctx.assert_equal_constant((share_left ^ share_right).witness_index, barretenberg::fr::one);
    }
}

} // namespace merkle_tree
} // namespace stdlib
} // namespace plonk