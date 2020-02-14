#include "./uint.hpp"

#include "../../../curves/bn254/fr.hpp"
#include "../../composer/turbo_composer.hpp"

using namespace barretenberg;

namespace plonk {
namespace stdlib {

template <typename Composer, size_t width>
uint<Composer, width>::uint(const witness_t<Composer>& witness)
    : context(witness.context)
    , witness_index(witness.witness_index)
    , additive_constant(0)
    , witness_status(WitnessStatus::OK)
    , accumulators(context->create_range_constraint(witness_index, width))
{}

template <typename Composer, size_t width>
uint<Composer, width>::uint(Composer* composer, const uint256_t& value)
    : context(composer)
    , witness_index(UINT32_MAX)
    , additive_constant(value)
    , witness_status(WitnessStatus::OK)
    , accumulators()
{}

template <typename Composer, size_t width>
uint<Composer, width> uint<Composer, width>::operator+(const uint& other) const
{
    ASSERT(context == other.context || (context != nullptr && other.context == nullptr) ||
           (context == nullptr && other.context != nullptr));
    Composer* ctx = (context == nullptr) ? other.context : context;

    bool lhs_constant = is_constant();
    bool rhs_constant = other.is_constant();

    if (lhs_constant && rhs_constant)
    {
        return uint<Composer, width>(context, (additive_constant + other.additive_constant) & MASK);
    }
    if (lhs_constant && !rhs_constant)
    {
        return other + *this;
    }
    if (!lhs_constant && rhs_constant)
    {
        uint<Composer, width> result(*this);
        result.additive_constant += other.additive_constant;
        return result;
    }

    const uint256_t lhs = get_value();
    const uint256_t rhs = other.get_value();
    const uint256_t sum = lhs + rhs;
    const uint256_t overflow = sum >> width;
    const uint256_t remainder = sum & MASK;

    waffle::add_quad gate{
        witness_index,
        other.witness_index,
        ctx->add_variable(remainder),
        ctx->add_variable(overflow),
        fr::one,
        fr::one,
        fr::neg_one(),
        fr::neg(CIRCUIT_UINT_MAX_PLUS_ONE),
        (additive_constant + other.additive_constant) & MASK,
    };

    ctx->create_balanced_add_gate(gate);

    uint<Composer, width> result(ctx);
    result.witness_index = gate.c;
    result.witness_status = WitnessStatus::WEAK_NORMALIZED;

    return result;
}

template <typename Composer, size_t width> uint<Composer, width> uint<Composer, width>::operator-(const uint& other) const
{
    ASSERT(context == other.context || (context != nullptr && other.context == nullptr) ||
           (context == nullptr && other.context != nullptr));

    Composer* ctx = (context == nullptr) ? other.context : context;

    bool lhs_constant = is_constant();
    bool rhs_constant = other.is_constant();

    if (lhs_constant && rhs_constant)
    {
        return uint<Composer, width>(context, (additive_constant - other.additive_constant) & MASK);
    }

    if (!rhs_constant && other.witness_status == WitnessStatus::NOT_NORMALIZED)
    {
        other.weak_normalize();
    }

    uint32_t lhs_idx = lhs_constant ? ctx->add_variable(fr::zero) : witness_index;
    uint32_t rhs_idx = rhs_constant ? ctx->add_variable(fr::zero) : other.witness_index;

    uint256_t lhs = ctx->variables[lhs_idx];
    uint256_t rhs = ctx->variables[rhs_idx];
    uint256_t constant_term = (additive_constant - other.additive_constant) & MASK;

    uint256_t difference = CIRCUIT_UINT_MAX_PLUS_ONE + lhs - rhs + constant_term;
    uint256_t overflow = difference >> width;
    uint256_t remainder = difference & MASK;

    waffle::add_quad gate{
        lhs_idx,
        rhs_idx,
        ctx->add_variable(remainder),
        ctx->add_variable(overflow),
        fr::one,
        fr::neg_one(),
        fr::neg_one(),
        fr::neg(CIRCUIT_UINT_MAX_PLUS_ONE),
        CIRCUIT_UINT_MAX_PLUS_ONE + constant_term,
    };

    ctx->create_balanced_add_gate(gate);

    uint<Composer, width> result(ctx);
    result.witness_index = gate.c;
    result.witness_status = WitnessStatus::WEAK_NORMALIZED;

    return result;
}


template <typename Composer, size_t width>
uint<Composer, width> uint<Composer, width>::weak_normalize() const
{
    if (!context || is_constant())
    {
        return *this;
    }
    if (witness_status == WitnessStatus::WEAK_NORMALIZED)
    {
        return *this;
    }
    if (witness_status == WitnessStatus::NOT_NORMALIZED)
    {
        uint256_t value = get_value();
        uint256_t overflow = value >> width;
        uint256_t remainder = value & MASK;
        waffle::add_quad gate{
            witness_index,
            context->add_variable(overflow),
            context->add_variable(remainder),
            context->zero_idx,
            fr::one,
            fr::neg_one(),
            fr::neg_one(),
            fr::zero,
            CIRCUIT_UINT_MAX_PLUS_ONE + ((additive_constant) & MASK),
        };

        context->create_big_add_gate(gate);

        witness_index = gate.c;
        witness_status = WitnessStatus::WEAK_NORMALIZED;
    }
    return *this;
}


template <typename Composer, size_t width>
uint<Composer, width> uint<Composer, width>::normalize() const
{
    if (!context || is_constant())
    {
        return *this;
    }
    if (witness_status == WitnessStatus::WEAK_NORMALIZED)
    {
        accumulators = context->create_range_constraint(witness_index, width);
        witness_status = WitnessStatus::OK;
    }
    if (witness_status == WitnessStatus::NOT_NORMALIZED)
    {
        accumulators = context->create_range_constraint(witness_index, width + 2);
        witness_status = WitnessStatus::OK;
    }
    return *this;
}

template <typename Composer, size_t width>
uint256_t uint<Composer, width>::get_value() const
{
    if (!context || is_constant())
    {
        return additive_constant & MASK;
    }
    return (uint256_t(context->get_variable(witness_index)) + additive_constant);
}

template class uint<waffle::TurboComposer, 8UL>;
template class uint<waffle::TurboComposer, 16UL>;
template class uint<waffle::TurboComposer, 32UL>;
template class uint<waffle::TurboComposer, 64UL>;

}
} // namespace plonk