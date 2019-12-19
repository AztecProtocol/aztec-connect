#pragma once

#include <cstdint>

#include "../../curves/bn254/fr.hpp"

namespace plonk {
namespace stdlib {

inline barretenberg::fr::field_t set_bit(const barretenberg::fr::field_t& scalar, const size_t bit_position)
{
    barretenberg::fr::field_t result = scalar;
    size_t limb_idx = bit_position / 64;
    size_t limb_bit_position = bit_position - (limb_idx * 64);
    result.data[limb_idx] = result.data[limb_idx] + (1UL << limb_bit_position);
    return result;
}

template <typename ComposerContext> struct witness_t {
    witness_t(ComposerContext* parent_context, const barretenberg::fr::field_t& in)
    {
        context = parent_context;
        barretenberg::fr::__copy(in, witness);
        witness_index = context->add_variable(witness);
    }

    witness_t(ComposerContext* parent_context, const bool in)
    {
        context = parent_context;
        if (in) {
            barretenberg::fr::__copy(barretenberg::fr::one, witness);
        } else {
            barretenberg::fr::__copy(barretenberg::fr::zero, witness);
        }
        witness_index = context->add_variable(witness);
    }

    template <typename T>
    witness_t(ComposerContext* parent_context, T const in)
    {
        context = parent_context;
        witness = barretenberg::fr::to_montgomery_form({ { static_cast<uint64_t>(in), 0, 0, 0 } });
        witness_index = context->add_variable(witness);
    }

    barretenberg::fr::field_t witness;
    uint32_t witness_index = static_cast<uint32_t>(-1);
    ComposerContext* context = nullptr;
};
} // namespace stdlib
} // namespace plonk