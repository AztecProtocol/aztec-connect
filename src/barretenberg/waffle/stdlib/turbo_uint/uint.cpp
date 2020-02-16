#include "./uint.hpp"

#include "../../../curves/bn254/fr.hpp"
#include "../../composer/turbo_composer.hpp"

#include "../bool/bool.hpp"
#include "../field/field.hpp"

using namespace barretenberg;

namespace plonk {
namespace stdlib {

template <typename Composer, size_t width>
uint<Composer, width>::uint(const witness_t<Composer>& witness)
    : context(witness.context)
    , additive_constant(0)
    , witness_status(WitnessStatus::OK)
    , accumulators(context->create_range_constraint(witness.witness_index, width))
    , witness_index(accumulators[(width >> 1) - 1])
{}

template <typename Composer, size_t width>
uint<Composer, width>::uint(Composer* composer, const uint256_t& value)
    : context(composer)
    , additive_constant(value)
    , witness_status(WitnessStatus::OK)
    , accumulators()
    , witness_index(UINT32_MAX)
{}

template <typename Composer, size_t width>
uint<Composer, width>::uint(const byte_array<Composer>& other)
    : context(other.get_context())
    , additive_constant(0)
    , witness_status(WitnessStatus::WEAK_NORMALIZED)
    , accumulators()
    , witness_index(UINT32_MAX)
{
    field_t<Composer> accumulator(context, fr::zero);
    field_t<Composer> scaling_factor(context, fr::one);
    for (size_t i = other.bits().size() - 1; i < other.bits().size(); --i)
    {
        accumulator = accumulator + scaling_factor * other.get_bit(i);
        scaling_factor = scaling_factor + scaling_factor;
    }
    if (accumulator.witness_index == UINT32_MAX)
    {
        additive_constant = uint256_t(accumulator.additive_constant);
    }
    else
    {
        witness_index = accumulator.witness_index;
    }
}

template <typename Context, size_t width> uint<Context, width>::operator byte_array<Context>() const
{
    if (is_constant())
    {
        std::vector<bool_t<Context> > bits;
        bits.reserve(width);
        for (size_t i = width - 1; i < width; --i)
        {
            bool_t<Context> bit(context, additive_constant.get_bit(i));
            bits.emplace_back(bit);
        }
        return byte_array(context, bits);
    }

    if (witness_status == WitnessStatus::NOT_NORMALIZED)
    {
        weak_normalize();
    }
    // TODO: we should create a native type that works with packed data or quads, to 
    // take advantage of our range constraint

    std::vector<bool_t<Context> > bits;
    bits.resize(width);
    uint256_t target = get_value();
    uint256_t accumulator = 0;
    uint256_t scale_factor = 1;
    uint32_t accumulator_idx = context->zero_idx;
    for (size_t i = 0; i < width; i += 2)
    {
        bool lo_val = target.get_bit(i);
        bool hi_val = target.get_bit(i + 1);
        bool_t lo = witness_t(context, lo_val);
        bool_t hi = witness_t(context, hi_val);

        uint256_t next_accumulator = accumulator + (lo_val ? scale_factor : 0) + (hi_val ? scale_factor + scale_factor : 0 );
        waffle::add_quad gate{
            lo.witness_index,
            hi.witness_index,
            accumulator_idx,
            context->add_variable(next_accumulator),
            scale_factor,
            scale_factor + scale_factor,
            fr::one,
            fr::neg_one(),
            fr::zero
        };

        context->create_big_add_gate(gate);

        accumulator = next_accumulator;
        accumulator_idx = gate.d;
        scale_factor = scale_factor + scale_factor;
        scale_factor = scale_factor + scale_factor;

        bits[width - 1 - i] = hi;
        bits[width - 2 - i] = lo;
    }
    
    return byte_array(context, bits);
}

template <typename Context, size_t width> uint<Context, width>::operator field_t<Context>() const
{
    normalize();
    field_t<Context> target(context);
    target.witness_index = witness_index;
    target.additive_constant = is_constant() ? fr::field_t(additive_constant) : fr::zero;
    return target;
}

template <typename Composer, size_t width> uint<Composer, width> uint<Composer, width>::weak_normalize() const
{
    if (!context || is_constant()) {
        return *this;
    }
    if (witness_status == WitnessStatus::WEAK_NORMALIZED) {
        return *this;
    }
    if (witness_status == WitnessStatus::NOT_NORMALIZED) {
        const uint256_t value = get_unbounded_value();
        const uint256_t overflow = value >> width;
        const uint256_t remainder = value & MASK;
        const waffle::add_quad gate{
            witness_index,
            context->zero_idx,
            context->add_variable(remainder),
            context->add_variable(overflow),
            fr::one,
            fr::zero,
            fr::neg_one(),
            fr::neg(CIRCUIT_UINT_MAX_PLUS_ONE),
            (additive_constant & MASK),
        };

        context->create_balanced_add_gate(gate);

        witness_index = gate.c;
        witness_status = WitnessStatus::WEAK_NORMALIZED;
        additive_constant = 0;
    }
    return *this;
}

template <typename Composer, size_t width> uint<Composer, width> uint<Composer, width>::normalize() const
{
    if (!context || is_constant()) {
        return *this;
    }

    if (witness_status == WitnessStatus::WEAK_NORMALIZED) {
        accumulators = context->create_range_constraint(witness_index, width);
        witness_index = accumulators[(width >> 1) - 1];
        witness_status = WitnessStatus::OK;
    }
    if (witness_status == WitnessStatus::NOT_NORMALIZED) {
        weak_normalize();
        accumulators = context->create_range_constraint(witness_index, width);
        witness_index = accumulators[(width >> 1) - 1];
        witness_status = WitnessStatus::OK;
    }
    return *this;
}

template <typename Composer, size_t width> uint256_t uint<Composer, width>::get_value() const
{
    if (!context || is_constant()) {
        return additive_constant;
    }
    return (uint256_t(context->get_variable(witness_index)) + additive_constant) & MASK;
}

template <typename Composer, size_t width> uint256_t uint<Composer, width>::get_unbounded_value() const
{
    if (!context || is_constant()) {
        return additive_constant;
    }
    return (uint256_t(context->get_variable(witness_index)) + additive_constant);
}

template class uint<waffle::TurboComposer, 8UL>;
template class uint<waffle::TurboComposer, 16UL>;
template class uint<waffle::TurboComposer, 32UL>;
template class uint<waffle::TurboComposer, 64UL>;

} // namespace stdlib
} // namespace plonk