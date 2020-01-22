#include "hash.hpp"

namespace plonk {
namespace stdlib {
namespace merkle_tree {

std::ostream& operator<<(std::ostream& os, typename barretenberg::fr::field_t const& a)
{
    os << std::hex << "field: [" << a.data[0] << ", " << a.data[1] << ", " << a.data[2] << ", " << a.data[3] << "]";
    return os;
}

template <typename ComposerContext>
merkle_tree<ComposerContext>::merkle_tree(ComposerContext& ctx, size_t depth)
    : ctx_(ctx)
    , store_(depth)
    , depth_(depth)
    , size_(0)
{
    ASSERT(depth_ >= 1 && depth <= 256);
    total_size_ = 1ULL << depth_;
    root_ = field_t(witness_t(&ctx_, store_.root()));
}

template <typename ComposerContext>
typename merkle_tree<ComposerContext>::hash_path merkle_tree<ComposerContext>::create_witness_hash_path(
    fr_hash_path const& input)
{
    hash_path result;
    std::transform(input.begin(), input.end(), std::back_inserter(result), [&](auto const& v) {
        return std::make_pair(field_t(witness_t(&ctx_, v.first)), field_t(witness_t(&ctx_, v.second)));
    });
    return result;
}

template <typename ComposerContext>
bool_t<ComposerContext> merkle_tree<ComposerContext>::check_membership(field_t const& input, uint32 const& index)
{
    fr_hash_path hashes = store_.get_hash_path(index.get_value());
    return check_membership(root_, create_witness_hash_path(hashes), input, index);
}

template <typename ComposerContext>
bool_t<ComposerContext> merkle_tree<ComposerContext>::assert_check_membership(field_t const& input, uint32 const& index)
{
    bool_t is_member = check_membership(input, index);
    ctx_.assert_equal_constant(is_member.witness_index, barretenberg::fr::one);
    return is_member;
}

template <typename ComposerContext>
bool_t<ComposerContext> merkle_tree<ComposerContext>::check_hash_path(field_t const& root,
                                                                      hash_path const& hashes,
                                                                      uint32 const& index)
{
    field_t one = witness_t(&ctx_, 1);
    field_t current = mimc7<ComposerContext>({ hashes[0].first, hashes[0].second });
    bool_t is_member = witness_t(&ctx_, true);

    for (size_t i = 1; i < depth_; ++i) {
        bool_t path_bit = index.at(i);
        bool_t is_left = (current == hashes[i].first) & !path_bit;
        bool_t is_right = (current == hashes[i].second) & path_bit;
        is_member &= is_left ^ is_right;
        current = mimc7<ComposerContext>({ hashes[i].first, hashes[i].second });
    }

    is_member &= current == root;
    return is_member;
}

template <typename ComposerContext>
bool_t<ComposerContext> merkle_tree<ComposerContext>::check_membership(field_t const& root,
                                                                       hash_path const& hashes,
                                                                       field_t const& value,
                                                                       uint32 const& index)
{
    field_t one = witness_t(&ctx_, 1);
    field_t current = stdlib::mimc7<ComposerContext>({ value });
    bool_t is_member = witness_t(&ctx_, true);

    for (size_t i = 0; i < depth_; ++i) {
        bool_t path_bit = index.at(i);
        bool_t is_left = (current == hashes[i].first) & !path_bit;
        bool_t is_right = (current == hashes[i].second) & path_bit;
        is_member &= is_left ^ is_right;
        current = mimc7<ComposerContext>({ hashes[i].first, hashes[i].second });
    }

    is_member &= current == root;
    return is_member;
}

template <typename ComposerContext> void merkle_tree<ComposerContext>::add_member(field_t const& input)
{
    ASSERT(size_ < total_size_);
    fr_hash_path old_hashes = store_.get_hash_path(size_);
    fr_hash_path new_hashes = store_.get_new_hash_path(size_, hash({ input.get_value() }));
    field_t new_root = field_t(&ctx_, hash({ new_hashes[depth_ - 1].first, new_hashes[depth_ - 1].second }));
    uint32 index = uint32(witness_t(&ctx_, size_));
    field_t zero(&ctx_, barretenberg::fr::zero);

    // Check we are setting the next available element. Given index should be equal to the public size input.
    ctx_.assert_equal_constant(index.get_witness_index(),
                               barretenberg::fr::to_montgomery_form({ { size_, 0UL, 0UL, 0UL } }));

    update_membership(
        new_root, create_witness_hash_path(new_hashes), input, root_, create_witness_hash_path(old_hashes), index);

    store_.update_hash_path(size_, new_hashes);
    root_ = new_root;
    size_ += 1;
}

template <typename ComposerContext>
void merkle_tree<ComposerContext>::update_member(field_t const& value, uint32 const& index)
{
    uint32_t idx = index.get_value();

    // Can only update an element that already exists.
    ASSERT(idx < size_);

    // TODO: Do we need to enforce a check here that index < size? (operator currently broken)
    // uint32 size = witness_t(&ctx_, size_);
    // ctx_.assert_equal_constant((index < size).witness_index, barretenberg::fr::one);

    fr_hash_path old_hashes = store_.get_hash_path(idx);
    fr_hash_path new_hashes = store_.get_new_hash_path(idx, hash({ value.get_value() }));
    field_t new_root = field_t(&ctx_, hash({ new_hashes[depth_ - 1].first, new_hashes[depth_ - 1].second }));

    update_membership(
        new_root, create_witness_hash_path(new_hashes), value, root_, create_witness_hash_path(old_hashes), index);

    store_.update_hash_path(idx, new_hashes);
    root_ = new_root;
}

template <typename ComposerContext>
void merkle_tree<ComposerContext>::update_membership(field_t const& new_root,
                                                     hash_path const& new_hashes,
                                                     field_t const& new_value,
                                                     field_t const& old_root,
                                                     hash_path const& old_hashes,
                                                     uint32 const& index)
{
    // Check old path hashes lead to the old root. They're used when validating the new path hashes.
    bool_t old_hashes_valid = check_hash_path(old_root, old_hashes, index);
    ctx_.assert_equal_constant(old_hashes_valid.witness_index, barretenberg::fr::one);

    // Check the new path hashes lead from the new value to the new root.
    bool_t new_hashes_valid = check_membership(new_root, new_hashes, new_value, index);
    ctx_.assert_equal_constant(new_hashes_valid.witness_index, barretenberg::fr::one);

    // Check that only the appropriate left or right hash was updated in the new hash path.
    for (size_t i = 0; i < depth_; ++i) {
        bool_t path_bit = index.at(i);
        bool_t share_left = (old_hashes[i].first == new_hashes[i].first) & path_bit;
        bool_t share_right = (old_hashes[i].second == new_hashes[i].second) & !path_bit;
        ctx_.assert_equal_constant((share_left ^ share_right).witness_index, barretenberg::fr::one);
    }
}

std::ostream& operator<<(std::ostream& os,
                         std::vector<std::pair<barretenberg::fr::field_t, barretenberg::fr::field_t>> const& path)
{
    os << "[\n";
    for (size_t i = 0; i < path.size(); ++i) {
        os << "  (" << i << ": " << path[i].first << ", " << path[i].second << ")\n";
    }
    os << "]";
    return os;
}

} // namespace merkle_tree
} // namespace stdlib
} // namespace plonk