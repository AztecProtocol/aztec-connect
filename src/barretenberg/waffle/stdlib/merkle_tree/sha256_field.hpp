#include "../bitarray/bitarray.hpp"
#include "../field/field.hpp"

namespace plonk {
namespace stdlib {
namespace merkle_tree {

template <typename ComposerContext> field_t<ComposerContext> sha256_field(field_t<ComposerContext> const& input)
{
    uint a(256, input);
    bitarray arr(a);
    bitarray output = stdlib::sha256(arr);
    field_t<ComposerContext> result(nullptr, barretenberg::fr::zero);
    fr::field_t two = barretenberg::fr::to_montgomery_form({ { 2, 0, 0, 0 } });
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