#include "../bitarray/bitarray.hpp"
#include "../field/field.hpp"

namespace plonk {
namespace stdlib {
namespace merkle_tree {

template <typename ComposerContext> field_t<ComposerContext> sha256_value(field_t<ComposerContext> const& input)
{
    ASSERT(input.context != nullptr);
    auto ctx = input.context;

    fr::field_t two = barretenberg::fr::to_montgomery_form({ { 2, 0, 0, 0 } });

    fr::field_t value = barretenberg::fr::from_montgomery_form(input.get_value());
    bitarray arr(ctx, 256);
    field_t<ComposerContext> validator(ctx, barretenberg::fr::zero);
    for (size_t i = 0; i < 256; ++i) {
        bool_t bit = witness_t(ctx, fr::get_bit(value, i));
        arr[i] = bit;
        fr::field_t scaling_factor_value = barretenberg::fr::pow_small(two, i);
        field_t<ComposerContext> scaling_factor(ctx, scaling_factor_value);
        validator = validator + (scaling_factor * bit);
    }
    ctx->assert_equal(validator.witness_index, input.witness_index);

    bitarray output = stdlib::sha256(arr);

    field_t<ComposerContext> result(nullptr, barretenberg::fr::zero);
    for (size_t i = 0; i < output.size(); ++i) {
        field_t<ComposerContext> temp(output[i].context);
        temp.witness_index = output[i].witness_index;
        fr::field_t scaling_factor_value = barretenberg::fr::pow_small(two, i);
        field_t<ComposerContext> scaling_factor(output[i].context, scaling_factor_value);
        result = result + (scaling_factor * temp);
    }
    return result;
}

} // namespace merkle_tree
} // namespace stdlib
} // namespace plonk