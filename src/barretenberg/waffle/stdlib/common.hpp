#ifndef STDLIB_COMMON_HPP
#define STDLIB_COMMON_HPP

#include "../../fields/fr.hpp"

namespace plonk
{
namespace stdlib
{

// from http://supertech.csail.mit.edu/papers/debruijn.pdf
inline uint32_t get_msb(uint32_t v)
{
    static const uint32_t MultiplyDeBruijnBitPosition[32] =
    {
        0, 9, 1, 10, 13, 21, 2, 29, 11, 14, 16, 18, 22, 25, 3, 30,
        8, 12, 20, 28, 15, 17, 24, 7, 19, 27, 23, 6, 26, 5, 4, 31
    };

    v |= v >> 1; // first round down to one less than a power of 2
    v |= v >> 2;
    v |= v >> 4;
    v |= v >> 8;
    v |= v >> 16;

    return MultiplyDeBruijnBitPosition[static_cast<uint32_t>(v * 0x07C4ACDDU) >> 27U];
}

inline bool get_bit(barretenberg::fr::field_t &scalar, size_t bit_position)
{
    /**
     *  we want to take a 128 bit scalar and shift it down by (bit_position).
     * We then wish to mask out `bits` number of bits.
     * Low limb contains first 64 bits, so we wish to shift this limb by (bit_position mod 64), which is also (bit_position & 63)
     * If we require bits from the high limb, these need to be shifted left, not right.
     * Actual bit position of bit in high limb = `b`. Desired position = 64 - (amount we shifted low limb by) = 64 - (bit_position & 63)
     * 
     * So, step 1:
     * get low limb and shift right by (bit_position & 63)
     * get high limb and shift left by (64 - (bit_position & 63))
     * 
     * If low limb == high limb, we know that the high limb will be shifted left by a bit count that moves it out of the result mask
     */
    barretenberg::fr::field_t mont_scalar = barretenberg::fr::from_montgomery_form(scalar);
    size_t bit_idx = bit_position >> 6;
    // size_t lo_idx = bit_position >> 6;
    // size_t hi_idx = (bit_position + 1 - 1) >> 6;
    return (bool)((mont_scalar.data[bit_idx] >> (bit_position & 63UL)) & 1UL);
}

template <typename ComposerContext>
struct witness_t
{
    witness_t(ComposerContext *parent_context, const barretenberg::fr::field_t &in)
    {
        context = parent_context;
        barretenberg::fr::copy(in, witness);
        witness_index = context->add_variable(witness);
    }

    witness_t(ComposerContext *parent_context, const bool in)
    {
        context = parent_context;
        if (in)
        {
            barretenberg::fr::copy(barretenberg::fr::one(), witness);
        }
        else
        {
            barretenberg::fr::copy(barretenberg::fr::zero(), witness);
        }
        witness_index = context->add_variable(witness);
    }

    witness_t(ComposerContext *parent_context, const uint32_t in)
    {
        context = parent_context;
        witness = barretenberg::fr::to_montgomery_form({{ static_cast<uint64_t>(in), 0, 0, 0 }});
        witness_index = context->add_variable(witness);
    }

    barretenberg::fr::field_t witness;
    uint32_t witness_index = static_cast<uint32_t>(-1);
    ComposerContext *context = nullptr;
};   
}
}

#endif