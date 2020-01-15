#include "../mimc.hpp"

namespace plonk {
namespace stdlib {

template <typename ComposerContext>
merkle_tree<ComposerContext>::merkle_tree(ComposerContext& ctx, size_t depth)
    : ctx_(ctx)
    , depth_(depth)
    , size_(0)
{
    ASSERT(depth_ >= 1);
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

    root_ = field_t(witness_t(&ctx_, current));
}

template <typename ComposerContext>
barretenberg::fr::field_t merkle_tree<ComposerContext>::hash(std::vector<barretenberg::fr::field_t> const& input)
{
    // TODO: Change to pederson hashes.
    // As mimc currently only accepts witness types use a throw away composer to compute the hashes.
    ComposerContext throw_away_composer;
    std::vector<field_t> inputs;
    std::transform(input.begin(), input.end(), std::back_inserter(inputs), [&](auto const& v) {
        return field_t(witness_t(&throw_away_composer, v));
    });
    return stdlib::mimc7<ComposerContext>(inputs).get_value();
}

template <typename ComposerContext>
bool_t<ComposerContext> merkle_tree<ComposerContext>::check_membership(field_t const& input, uint32 const& index)
{
    hash_path hashes = get_hash_path(index.get_value());
    return check_membership(ctx_, root_, hashes, input, index);
}

template <typename ComposerContext>
bool_t<ComposerContext> merkle_tree<ComposerContext>::assert_check_membership(field_t const& input, uint32 const& index)
{
    bool_t is_member = check_membership(input, index);
    ctx_.assert_equal_constant(is_member.witness_index, barretenberg::fr::one);
    return is_member;
}

template <typename ComposerContext>
bool_t<ComposerContext> merkle_tree<ComposerContext>::check_membership(
    ComposerContext& ctx, field_t const& root, hash_path const& hashes, field_t const& input, uint32 const& index)
{
    field_t one = witness_t(&ctx, 1);
    field_t current = stdlib::mimc7<ComposerContext>({ input });
    bool_t is_member(witness_t(&ctx, true));

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
    hash_path old_hashes = get_hash_path(size_ + 1);
    hash_path new_hashes = get_new_hash_path(size_ + 1, input.get_value());
    field_t new_root = field_t(&ctx_, hash({ new_hashes[depth_ - 1].first, new_hashes[depth_ - 1].second }));
    uint32 index = uint32(&ctx_, size_ + 1);
    update_membership(ctx_, new_root, new_hashes, root_, old_hashes, input, index);
}

template <typename ComposerContext>
void merkle_tree<ComposerContext>::update_membership(ComposerContext& ctx,
                                                     field_t const& new_root,
                                                     hash_path const& new_hashes,
                                                     field_t const& old_root,
                                                     hash_path const& old_hashes,
                                                     field_t const& input,
                                                     uint32 const& index)
{
    // Check we are setting the next available element. Given index should be equal to the public size input + 1.
    ctx_.assert_equal_constant(index.witness_index, barretenberg::fr::field_t(size_ + 1));

    // Check old path hashes lead from a 0 element to the old root. They're used when validating the new path hashes.
    field_t zero(&ctx, 0);
    bool_t old_hashes_valid = check_membership(ctx, old_root, old_hashes, zero, index);
    ctx_.assert_equal_constant(old_hashes_valid.witness_index, barretenberg::fr::one);

    // Check the new path hashes lead from the input value to the new root.
    bool_t new_hashes_valid = check_membership(ctx, new_root, new_hashes, input, index);
    ctx_.assert_equal_constant(new_hashes_valid.witness_index, barretenberg::fr::one);

    // Check that only the appropriate left or right hash was updated in the new hash path.
    for (size_t i = 0; i < depth_; ++i) {
        bool_t path_bit = index.at(i);
        bool_t share_left = (old_hashes[i].first == new_hashes[i].first) & path_bit;
        bool_t share_right = (old_hashes[i].second == new_hashes[i].second) & !path_bit;
        ctx_.assert_equal_constant((share_left ^ share_right).witness_index, barretenberg::fr::one);
    }

    update_hash_path(index, new_hashes);
    root_ = new_root;
    size_ += 1;
}

template <typename ComposerContext>
typename merkle_tree<ComposerContext>::hash_path merkle_tree<ComposerContext>::get_hash_path(size_t index)
{
    hash_path path(depth_);
    size_t offset = 0;
    size_t layer_size = total_size_;
    for (size_t i = 0; i < depth_; ++i) {
        index &= 0xFE;
        path[i] =
            std::make_pair(witness_t(&ctx_, hashes_[offset + index]), witness_t(&ctx_, hashes_[offset + index + 1]));
        offset += layer_size;
        layer_size /= 2;
        index /= 2;
    }
    return path;
}

template <typename ComposerContext>
typename merkle_tree<ComposerContext>::hash_path merkle_tree<ComposerContext>::get_new_hash_path(
    size_t index, barretenberg::fr::field_t value)
{
    hash_path path = get_hash_path(index);
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

template <typename ComposerContext>
void merkle_tree<ComposerContext>::update_hash_path(size_t index, typename merkle_tree<ComposerContext>::hash_path path)
{
    size_t offset = 0;
    size_t layer_size = total_size_;
    for (size_t i = 0; i < depth_; ++i) {
        index &= 0xFE;
        hashes_[offset + index] = path[i].first.get_value();
        hashes_[offset + index + 1] = path[i].second.get_value();
        offset += layer_size;
        layer_size /= 2;
        index /= 2;
    }
}

template <typename ComposerContext>
std::ostream& operator<<(std::ostream& os,
                         std::vector<std::pair<field_t<ComposerContext>, field_t<ComposerContext>>> const& path)
{
    os << "[\n";
    for (size_t i = 0; i < path.size(); ++i) {
        os << "  (" << i << ": " << path[i].first << ", " << path[i].second << ")\n";
    }
    os << "]";
    return os;
}

} // namespace stdlib
} // namespace plonk