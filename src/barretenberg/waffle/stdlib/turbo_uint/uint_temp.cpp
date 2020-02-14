#include "./uint.hpp"

#include <algorithm>
#include <cmath>
#include <numeric>

#include "../../../assert.hpp"
#include "../../../curves/bn254/fr.hpp"

#include "../../composer/bool_composer.hpp"
#include "../../composer/extended_composer.hpp"
#include "../../composer/mimc_composer.hpp"
#include "../../composer/standard_composer.hpp"
#include "../../composer/turbo_composer.hpp"

#include "../field/field.hpp"

namespace plonk {
namespace stdlib {
// ### Internal methods


template <typename ComposerContext, size_t width>
uint<ComposerContext, width>::uint(ComposerContext* parent_context)
    : context(parent_context)
    , witness_index(static_cast<uint32_t>(-1))
    , additive_constant(0)
    , witness_status(WitnessStatus::OK)
    , maximum_value(0)
{
    // TODO: Pretty sure this assert is right.
    // ASSERT(parent_context != nullptr);
}

template <typename ComposerContext, size_t width>
uint<ComposerContext>::uint(const witness_t<ComposerContext>& value)
    : context(value.context)
    , witness_index(value.witness_index)
    , additive_constant(0)
    , witness_status(WitnessStatus::OK)
    , maximum_value((uint256_t(1) << uint256_t(width)) - 1ULL)
{
    ASSERT(context != nullptr);
    accumulators = context->create_range_constraint(value.witness_index, width);
}

template <typename ComposerContext, size_t width>
uint<ComposerContext>::uint(const uint256_t value)
    : context(nullptr)
    , witness_index(static_cast<uint32_t>(-1))
    , additive_constant(value)
    , witness_status(WitnessStatus::OK)
    , maximum_value(value)
{}

template <typename ComposerContext, size_t width>
uint<ComposerContext>::uint(ComposerContext* parent_context, const uint256_t value)
    : context(parent_context)
    , witness_index(static_cast<uint32_t>(-1))
    , additive_constant(value)
    , witness_status(WitnessStatus::OK)
    , maximum_value(value)
{
    ASSERT(context != nullptr);
}

template <typename ComposerContext, size_t width>
uint<ComposerContext>::uint(const field_t<ComposerContext>& other)
    : context(other.context)
    , witness_index(other.witness_index)
    , additive_constant(other.additive_constant)
    , witness_status(WitnessStatus::OK)
    , maximum_value((1ULL << width) - 1ULL)
{
    ASSERT(context != nullptr);
    additive_constant = additive_constant & maximum_value;
}

template <typename ComposerContext>
uint<ComposerContext>::uint(const uint& other)
    : context(other.context)
    , witness_index(other.witness_index)
    , additive_constant(other.additive_constant)
    , witness_status(other.witness_status)
    , accumulators(other.accumulators)
    , maximum_value(other.maximum_value)
{
}

template <typename ComposerContext>
uint<ComposerContext>::uint(uint&& other)
    : context(std::move(other.context))
    , witness_index(std::move(other.witness_index))
    , additive_constant(other.additive_constant)
    , witness_status(std::move(other.witness_status))
    , accumulators(std::move(other.accumulators))
    , maximum_value(other.maximum_value)
{
    // ASSERT(context != nullptr);
}

// template <typename ComposerContext>
// uint<ComposerContext>::uint(ComposerContext* parent_context, const std::vector<bool_t<ComposerContext>>& wires)
//     : context(parent_context)
//     , witness_index(static_cast<uint32_t>(-1))
//     , additive_constant(0)
//     , multiplicative_constant(1)
//     , witness_status(WitnessStatus::IN_BINARY_FORM)
//     , bool_wires(wires)
//     , queued_logic_operation(wires.size())
//     , maximum_value(0)
// {}

// template <typename ComposerContext>
// uint<ComposerContext>::uint(const byte_array<ComposerContext>& other)
//     : context(other.get_context())
//     , witness_index(static_cast<uint32_t>(-1))
//     , additive_constant(0)
//     , multiplicative_constant(1)
//     , witness_status(WitnessStatus::IN_BINARY_FORM)
//     , bool_wires(other.bits())
//     , queued_logic_operation(bool_wires.size())
//     , maximum_value(0)
// {}

template <typename ComposerContext, size_t width> uint<ComposerContext, width>& uint<ComposerContext, width>::operator=(const uint& other)
{
    ASSERT(other.width() == width());
    context = other.context;
    witness_index = other.witness_index;
    additive_constant = other.additive_constant;
    witness_status = other.witness_status;
    maximum_value = other.maximum_value;
    
    accumulators = std::vector<uint32_t>(other.accumulators.size());
    std::copy(other.accumulators.begin(), other.accumulators.end(), std::back_inserter(accumulators));
    // ASSERT(context != nullptr);

    return *this;
}

template <typename ComposrContext, size_t width> void uint<ComposerContext, width>::weak_normalize() const
{
    uint256_t input = get_value();

    uint256_t output = input + additive_constant;
    uint256_t overflow = output >> (2 * width);
    uint256_t remainder = output - (overflow << (2 * width));

    ComposerBase::add_quad gate{
        witness_index,
        composer->zero_idx,
        composer->add_variable(fr::from_uint256(remainder)),
        composer->add_variable(fr::from_uint256(overflow)),
        fr::one,
        fr::zero,
        fr::neg_one(),
        fr::neg(fr::from_uint256(negation_constant)),
        fr::from_uint256(additive_constant),
    };

    composer->create_balaned_add_gate(add_quad);
    ASSERT(overflow < 4);
}

template <typename ComposerContext, size_t width> void uint<ComposerContext, width>::normalize() const
{
    if (is_constant())
    {
        return;
    }
    if (additive_constant != 0)
    {
        weak_normalize();
    }
    if (witness_status == WitnessStatus::QUEUED_ROTATE_OPERATION)
    {
        // todo: deal with this :/
    }
    if (witness_status == WitnessStatus::WEAK_NORMALIZED || witness_status == WitnessStatus::NOT_NORMALIZED)
    {
        accumulators = context->create_range_constraint(witness_index, width);
    }
}

template <typename ComposerContext, size_t width> uint<ComposerContext, width>::operator field_t<ComposerContext>()
{
    normalize();
    const auto get_field_element = [ctx = context](
                                       const uint32_t w_idx, const uint64_t add_const, const uint64_t mul_const) {
        field_t<ComposerContext> target;
        if (w_idx == static_cast<uint32_t>(-1)) {
            target = field_t<ComposerContext>(ctx, barretenberg::fr::to_montgomery_form({ { add_const, 0, 0, 0 } }));
        } else {
            target = witness_t<ComposerContext>(ctx, ctx->get_variable(w_idx));
            target.witness_index = w_idx;
            target.additive_constant = fr::zero;
            target.multiplicative_constant = fr::one;
        }
        return target;
    };
    return get_field_element(witness_index, additive_constant, multiplicative_constant);
}

// template <typename ComposerContext> uint<ComposerContext>::operator byte_array<ComposerContext>()
// {
//     normalize();
//     return byte_array<ComposerContext>(context, bool_wires);
// }


template <typename ComposerContext, size_t width> uint<ComposerContext, size_t width> uint<ComposerContext, size_t width>::operator+(const uint& other) const
{
    ASSERT(context == other.context || (context != nullptr && other.context == nullptr) ||
           (context == nullptr && other.context != nullptr));
    ComposerContext* ctx = (context == nullptr) ? other.context : context;
    uint<ComposerContext> result = uint<ComposerContext>(width(), ctx);
    bool lhs_constant = is_constant();
    bool rhs_constant = other.is_constant();

    if (lhs_constant && rhs_constant)
    {
        return uint<ComposerContext, width>(context, additive_constant + other.additive_constant);
    }
    if (lhs_constant && !rhs_constant)
    {
        return other + *this;
    }
    if (!lhs_constant && rhs_constant)
    {
        uint<ComposerContext, width> result(*this);
        result.additive_constant += other.additive_constant;
        return result;
    }

    const uint256_t to_add = (additive_constant + other.additive_constant) & mask;
    const uint256_t lhs = get_value();
    const uint256_t rhs = other.get_value();
    const uint256_t result = lhs + rhs + to_add;
    const uint256_t overflow = result >> width;
    const uint256_t remainder = result & mask;

    ComposerBase::add_quad gate{
        witness_index,
        other->witness_index,
        composer->add_variable(fr::from_uint256(remainder)),
        composer->add_variable(fr::from_uint256(overflow)),
        fr::one,
        fr::one,
        fr::neg_one(),
        fr::neg(fr::from_uint256(negation_constant)),
        fr::from_uint256(to_add),
    };

    ctx->create_balanced_add_gate(add_quad);

    uint<ComposerContext, width> result(ctx);
    result.witness_index = gate.c;
    result.witness_status = WitnessStatus::WEAK_NORMALIZED;

    return result;
}

template <typename ComposerContext, size_t width> uint<ComposerContext, width> uint<ComposerContext, width>::operator-(const uint& other)
{
    ASSERT(context == other.context || (context != nullptr && other.context == nullptr) ||
           (context == nullptr && other.context != nullptr));

    ComposerContext* ctx = (context == nullptr) ? other.context : context;

    bool lhs_constant = is_constant();
    bool rhs_constant = other.is_constant();

    if (lhs_constant && rhs_constant)
    {
        return uint<ComposerContext, width>(context, additive_constant - other.additive_constant);
    }

    if (!rhs_constant && other.witness_status == WitnessStatus::NOT_NORMALIZED)
    {
        other = other.weak_normalize();
    }

    uint32_t lhs_idx = lhs_constant ? ctx->zero_idx : witness_index;
    uint32_t rhs_idx = rhs_constant ? ctx->zero_idx : other.witness_idx;

    uint256_t lhs = lhs_constant ? 0 : get_value();
    uint256_t rhs = rhs_constant ? 0 : other.get_value();

    uint256_t to_add = additive_constant + negation_constant;

    uint256_t result = lhs + to_add - rhs;

    uint256_t overflow = result >> width;
    uint256_t remainder = result & mask;

    ComposerBase::add_quad gate{
        lhs_idx,
        rhs_idx,
        composer->add_variable(fr::from_uint256(remainder)),
        composer->add_variable(fr::from_uint256(overflow)),
        fr::one,
        fr::neg_one(),
        fr::neg_one(),
        fr::neg(fr::from_uint256(negation_constant)),
        fr::from_uint256(to_add),
    };

    ctx->create_balanced_add_gate(add_quad);

    uint<ComposerContext, width> result(ctx);
    result.witness_index = gate.c;
    result.witness_status = WitnessStatus::WEAK_NORMALIZED;

    return result;
}

template <typename ComposerContext, size_t width> uint<ComposerContext, width> uint<ComposerContext, width>::operator*(const uint& other)
{
    ComposerContext* ctx = (context == nullptr) ? other.context : context;

    bool lhs_constant = is_constant();
    bool rhs_constant = other.is_constant();

    if (lhs_constant && rhs_constant) {
        return uint<ComposerContext, width>(context, additive_constant * other.additive_constant);
    } 
    if (lhs_constant && !rhs_constant) {
        return other * (*this);
    }

    uint32_t rhs_idx = other.is_constant() ? ctx->zero_idx : other.witness_index;

    uint256_t lhs = get_value() + additive_constant;
    uint256_t rhs = other.additive_constant + (other.is_constant() ? 0 : other.get_value());
    
    uint256_t result = lhs * rhs;

    uint256_t oveflow = result >> width;
    uint256_t remainder = reuslt & mask;


    ComposerBase::mul_quad gate{
        witness_idx,
        rhs_idx,
        composer->add_variable(fr::from_uint256(remainder)),
        composer->add_variable(fr::from_uint256(overflow)),
        fr::from_uint256(other.additive_constant),
        additive_constant,
        fr::neg_one(),
        fr::neg(fr::from_uint256(negation_constant)),
        fr::from_uint256((additive_constant * other.additive_constant) & mask),
    };

    ctx->create_big_mul_gate(gate);

    ctx->create_range_constraint(gate.d, width + 4);

    uint<ComposerContext, width> result(ctx);
    result.witness_index = gate.c;
    result.accumulators = ctx->create_range_constraint(result.witness_index, width);
    result.witness_status = WitnessStatus::OK;

    return result;
}

// TODO: fix this, need to test and refactor...
template <typename ComposerContext> std::pair<uint<ComposerContext>, uint<ComposerContext>> uint<ComposerContext>::divmod(const uint& other)
{
    ComposerContext* ctx = (context == nullptr) ? other.context : context;
    uint<ComposerContext> result(width(), ctx);

    bool lhs_constant = is_constant();
    bool rhs_constant = other.is_constant();

    if (lhs_constant && rhs_constant)
    {
        uint<ComposerContext, width> remainder(context, additive_constant % other.additive_constant);
        uint<ComposerContext, width> quotient(context, additive_constant / other.additive_constant);
        return std::make_pair<uint<ComposerContext, width>, uint<ComposerContext, width>>(quotient, remainder);
    }
    if (!lhs_constant && !rhs_constant && (witness_index == other.witness_index)) {
        uint<ComposerContext, width> remainder(context, 0);
        uint<ComposerContext, width> quotient(context, 1);
        return std::make_pair<uint<ComposerContext, width>, uint<ComposerContext, width>>(quotient, remainder);
    }

    uint32_t lhs_idx = is_constant() ? ctx->zero_idx : witness_index;
    uint32_t rhs_idx = other.is_constant() ? ctx->zero_idx : other.witness_index;

    if (!is_constant() && witness_status == WitnessStatus::NOT_NORMALIZED)
    {
        *this = weak_normalize();
    }
    if (is_constant())
    {
        *this = force_witness(ctx);
    }
    if (!other.is_constant() && witness_status == WitnessStatus::NOT_NORMALIZED)
    {
        other = other.weak_normalize();
    }
    if (other.is_constant())
    {
        other = other.force_witness(ctx);
    }

    /**
     *  (a / b) = q.b + r
     * 
     * => a = q.b^2 + r.b
     * 
     * => b(q.b + r) - a = 0
     **/

    uint256_t dividend = is_constant() ? 0 : get_value();
    uint256_t divisor = other.is_constant() ? 0 : other.get_value();

    uint256_t quotient = dividend / divisor;
    uint256_t remainder = dividend % divisor;

    uint256_t q_b_plus_r = quotient * divisor + remainder;

    uint32_t quotient_index = ctx->add_variable(quotient);
    uint32_t remainder_index = ctx->add_variable(remainder);
    uint32_t product_index = ctx->add_variable(q_b_plus_r);

    ComposerBase::mul_quad inner_gate{
        quotient_index,
        other.witness_index,
        remainder.witness_index,
        product_index,
        fr::zero,
        fr::zero,
        fr::one,
        fr::neg_one(),
        fr::zero,
    };

    ctx->create_big_mul_gate(inner_gate);

    ComposerBase::mul_triple outer_gate{
        product_index,
        other.witness_index,
        witness_index,
        fr::one,
        fr::neg_one(),
        fr::zero
    };

    ctx->create_mul_gate(outer_gate);

    uint<ComposerContext, width> quotient(ctx);
    quotient.witness_index = quotient_index;
    quotient.accumulators =  ctx->create_range_constraint(quotient.witness_index, width);
    quotient.witness_status = WitnessStatus::OK;

    uint<ComposerContext, width> remainder(ctx);
    remainder.witness_index = remainder_index;
    remainder.accumulators = ctx->create_range_constraint(remainder.witness_index, width);
    remainder.witness_status = WitnessStatus::OK;

    return std::make_pair<uint<ComposerContext, width>, uint<ComposerContext, width>>(quotient, remainder);
}

// TODO: fix this, need to test and refactor...
template <typename ComposerContext> uint<ComposerContext> uint<ComposerContext>::operator/(const uint& other)
{
    return divmod(other).first;
}

// TODO: fix this, need to test and refactor...
template <typename ComposerContext> uint<ComposerContext> uint<ComposerContext>::operator%(const uint& other)
{
    return divmod(other).second;
}

template <typename ComposerContext> bool_t<ComposerContext> uint<ComposerContext>::operator<(const uint& other) const
{
    prepare_for_arithmetic_operations();
    other.prepare_for_arithmetic_operations();

    if (maximum_value >= (1ULL << 32ULL)) {
        decompose();
    }
    if (other.maximum_value >= (1ULL << 32ULL)) {
        decompose();
    }
    if (is_constant() && other.is_constant()) {
        return bool_t<ComposerContext>(nullptr, additive_constant < other.additive_constant);
    }

    ComposerContext* ctx = (context == nullptr) ? other.context : nullptr;

    const auto get_field_element = [ctx](const uint32_t w_idx, const uint64_t add_const, const uint64_t mul_const) {
        field_t<ComposerContext> target;
        if (w_idx == static_cast<uint32_t>(-1)) {
            target = field_t<ComposerContext>(ctx, barretenberg::fr::to_montgomery_form({ { add_const, 0, 0, 0 } }));
        } else {
            target = witness_t<ComposerContext>(ctx, ctx->get_variable(w_idx));
            target.witness_index = w_idx;
            target.additive_constant = barretenberg::fr::to_montgomery_form({ { add_const, 0, 0, 0 } });
            target.multiplicative_constant = barretenberg::fr::to_montgomery_form({ { mul_const, 0, 0, 0 } });
        }
        return target;
    };

    field_t<ComposerContext> left = get_field_element(witness_index, additive_constant, multiplicative_constant);
    field_t<ComposerContext> right =
        get_field_element(other.witness_index, other.additive_constant, other.multiplicative_constant);

    uint64_t lhs = get_value();
    uint64_t rhs = other.get_value();
    bool predicate_bool = lhs < rhs;
    bool_t<ComposerContext> predicate = witness_t<ComposerContext>(ctx, predicate_bool);

    field_t<ComposerContext> difference = left - right;
    uint<ComposerContext> delta(width(),
                                field_t<ComposerContext>((field_t<ComposerContext>(predicate) * 2 - 1) * difference));
    delta.decompose();
    return predicate;
}

template <typename ComposerContext> bool_t<ComposerContext> uint<ComposerContext>::operator<=(const uint& other) const
{
    prepare_for_arithmetic_operations();
    other.prepare_for_arithmetic_operations();

    // this <= other === this < (other + 1)
    uint<ComposerContext> rhs = (other);
    rhs = rhs + uint<ComposerContext>(width(), context, 1U);
    return operator<(rhs);
}

template <typename ComposerContext> bool_t<ComposerContext> uint<ComposerContext>::operator>(const uint& other) const
{
    return (other < *this);
}

template <typename ComposerContext> bool_t<ComposerContext> uint<ComposerContext>::operator>=(const uint& other) const
{
    return (other <= *this);
}

// TODO refactor, this is broken!
template <typename ComposerContext> bool_t<ComposerContext> uint<ComposerContext>::operator!=(const uint& other) const
{
    prepare_for_arithmetic_operations();
    other.prepare_for_arithmetic_operations();

    if (maximum_value >= (1ULL << 32ULL)) {
        decompose();
    }
    if (other.maximum_value >= (1ULL << 32ULL)) {
        decompose();
    }

    uint<ComposerContext> difference = uint(*this) - other;
    difference.decompose();

    field_t<ComposerContext> numerator = field_t<ComposerContext>(difference.bool_wires[31]);
    // field_t<ComposerContext> numerator(context, 1);

    // x * xinv - 1 = 0
    // x * xinv - (predicate) = 0
    barretenberg::fr::field_t inverse;
    if (barretenberg::fr::eq(numerator.get_value(), barretenberg::fr::zero)) {
        inverse = barretenberg::fr::zero;
    } else {
        inverse = barretenberg::fr::invert(numerator.get_value());
    }
    field_t<ComposerContext> denominator(witness_t(context, inverse));

    field_t<ComposerContext> predicate = numerator * denominator;

    return (static_cast<bool_t<ComposerContext>>(predicate));
}

template <typename ComposerContext> bool_t<ComposerContext> uint<ComposerContext>::operator==(const uint& other) const
{
    return !(operator!=(other));
}

template <typename ComposerContext> uint<ComposerContext> uint<ComposerContext>::operator&(const uint& other)
{
    return internal_logic_operation(other, &internal_and);
}

template <typename ComposerContext> uint<ComposerContext> uint<ComposerContext>::operator^(const uint& other)
{
    return internal_logic_operation(other, &internal_xor);
}

template <typename ComposerContext> uint<ComposerContext> uint<ComposerContext>::operator|(const uint& other)
{
    return internal_logic_operation(other, &internal_or);
}

template <typename ComposerContext> uint<ComposerContext> uint<ComposerContext>::operator~()
{
    prepare_for_logic_operations();

    uint<ComposerContext> result = (*this);

    for (size_t i = 0; i < width(); ++i) {
        result.bool_wires[i] = ~(result.bool_wires[i]);
    }
    result.witness_status = WitnessStatus::IN_BINARY_FORM;
    return result;
}

template <typename ComposerContext> uint<ComposerContext> uint<ComposerContext>::operator>>(const uint64_t shift_)
{
    size_t shift = static_cast<size_t>(shift_);
    if (shift == 0) {
        return (*this);
    }
    if (shift >= width()) {
        return uint<ComposerContext>(width(), context, 0);
    }

    prepare_for_logic_operations();

    uint<ComposerContext> result(width(), context);
    for (size_t i = 0; i < width() - shift; ++i) {
        result.bool_wires[i] = bool_wires[i + shift];
    }
    for (size_t i = width() - shift; i < width(); ++i) {
        result.bool_wires[i] = bool_t<ComposerContext>(context, false);
    }
    result.witness_status = WitnessStatus::IN_BINARY_FORM;
    result.additive_constant = 0;
    result.multiplicative_constant = 1;
    result.witness_index = static_cast<uint32_t>(-1);
    return result;
}

template <typename ComposerContext> uint<ComposerContext> uint<ComposerContext>::operator<<(const uint64_t shift)
{
    if (shift == 0) {
        return (*this);
    }
    if (shift >= width()) {
        return uint<ComposerContext>(width(), context, 0);
    }

    prepare_for_logic_operations();

    uint<ComposerContext> result(width(), context);
    for (size_t i = 0; i < shift; ++i) {
        result.bool_wires[i] = bool_t<ComposerContext>(context, false);
    }
    for (size_t i = static_cast<size_t>(shift); i < width(); ++i) {
        result.bool_wires[i] = bool_wires[i - static_cast<size_t>(shift)];
    }
    result.witness_status = WitnessStatus::IN_BINARY_FORM;
    result.additive_constant = 0;
    result.multiplicative_constant = 1;
    result.witness_index = static_cast<uint32_t>(-1);
    return result;
}

template <typename ComposerContext> uint<ComposerContext> uint<ComposerContext>::ror(const uint64_t const_rotation)
{
    ASSERT(const_rotation < width());
    if (const_rotation == 0) {
        return (*this);
    }
    prepare_for_logic_operations();
    uint<ComposerContext> result(width(), context);

    for (size_t i = 0; i < width() - const_rotation; ++i) {
        result.bool_wires[i] = bool_wires[i + static_cast<size_t>(const_rotation)];
    }
    for (size_t i = 0; i < const_rotation; ++i) {
        result.bool_wires[width() - static_cast<size_t>(const_rotation) + i] = bool_wires[i];
    }
    result.witness_status = WitnessStatus::IN_BINARY_FORM;
    return result;
}

template <typename ComposerContext> uint<ComposerContext> uint<ComposerContext>::rol(const uint64_t const_rotation)
{
    if (const_rotation == 0) {
        return (*this);
    }
    ASSERT(const_rotation < width());

    return ror(width() - const_rotation);
}

template <typename ComposerContext> uint256_t uint<ComposerContext>::get_value() const
{
    if (context == nullptr || is_constant()) {
        return additive_constant & mask;
    }
    return uint256_t(context->get_variable(witness_index)) * (additive_constant & mask);
}


template class uint<waffle::TurboComposer, 8>;
template class uint<waffle::TurboComposer, 16>;
template class uint<waffle::TurboComposer, 32>;
template class uint<waffle::TurboComposer, 64>;

} // namespace stdlib
} // namespace plonk
