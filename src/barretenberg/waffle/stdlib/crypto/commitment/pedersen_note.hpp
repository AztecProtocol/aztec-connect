#pragma once

#include "../../../composer/turbo_composer.hpp"
#include "../../field/field.hpp"
#include "../../uint/uint.hpp"
#include "../crypto.hpp"

#include "../../group/group_utils.hpp"
#include "../../../../curves/grumpkin/grumpkin.hpp"

namespace plonk {
namespace stdlib {
namespace pedersen_note {

struct note
{
    point ciphertext;
};

struct note_triple
{
    point base;
    field_t<waffle::TurboComposer> scalar;
};

template <size_t num_bits>
note_triple fixed_base_scalar_mul(const field_t<waffle::TurboComposer>& in, const size_t generator_index);

note compute_commitment(const field_t<waffle::TurboComposer>& view_key, const uint<waffle::TurboComposer, uint32_t>& value);


extern template note_triple fixed_base_scalar_mul<32>(const field_t<waffle::TurboComposer>& in, const size_t generator_index);
extern template note_triple fixed_base_scalar_mul<250>(const field_t<waffle::TurboComposer>& in, const size_t generator_index);

}
} // namespace stdlib
} // namespace plonk