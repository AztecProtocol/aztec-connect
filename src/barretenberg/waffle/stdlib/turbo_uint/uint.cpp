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

template <typename Context, size_t width> uint<Context, width>::operator field_t<Context>() const
{
    normalize();
    field_t<Context> target(context);
    target.witness_index = witness_index;
    target.additive_constant = is_constant() ? fr::field_t(additive_constant) : fr::zero;
    return target;
}

template <typename Composer, size_t width>
uint<Composer, width> uint<Composer, width>::operator+(const uint& other) const
{
    ASSERT(context == other.context || (context != nullptr && other.context == nullptr) ||
           (context == nullptr && other.context != nullptr));
    Composer* ctx = (context == nullptr) ? other.context : context;

    bool lhs_constant = is_constant();
    bool rhs_constant = other.is_constant();

    if (lhs_constant && rhs_constant) {
        return uint<Composer, width>(context, (additive_constant + other.additive_constant) & MASK);
    }
    if (lhs_constant && !rhs_constant) {
        uint<Composer, width> result(other);
        result.additive_constant = (additive_constant + other.additive_constant) & MASK;
        result.witness_status = WitnessStatus::NOT_NORMALIZED;
        return result;
    }
    if (!lhs_constant && rhs_constant) {
        uint<Composer, width> result(*this);
        result.additive_constant = (additive_constant + other.additive_constant) & MASK;
        result.witness_status = WitnessStatus::NOT_NORMALIZED;
        return result;
    }

    const uint256_t lhs = get_unbounded_value();
    const uint256_t rhs = other.get_unbounded_value();
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

template <typename Composer, size_t width>
uint<Composer, width> uint<Composer, width>::operator-(const uint& other) const
{
    ASSERT(context == other.context || (context != nullptr && other.context == nullptr) ||
           (context == nullptr && other.context != nullptr));

    Composer* ctx = (context == nullptr) ? other.context : context;

    bool lhs_constant = is_constant();
    bool rhs_constant = other.is_constant();

    if (lhs_constant && rhs_constant) {
        return uint<Composer, width>(context, (additive_constant - other.additive_constant) & MASK);
    }

    if (!lhs_constant && witness_status == WitnessStatus::NOT_NORMALIZED)
    {
        weak_normalize();
    }
    if (!rhs_constant && other.witness_status == WitnessStatus::NOT_NORMALIZED) {
        other.weak_normalize();
    }

    const uint32_t lhs_idx = lhs_constant ? ctx->zero_idx : witness_index;
    const uint32_t rhs_idx = rhs_constant ? ctx->zero_idx : other.witness_index;

    const uint256_t lhs = ctx->variables[lhs_idx];
    const uint256_t rhs = ctx->variables[rhs_idx];
    const uint256_t constant_term = (additive_constant - other.additive_constant) & MASK;

    const uint256_t difference = CIRCUIT_UINT_MAX_PLUS_ONE + lhs - rhs + constant_term;
    const uint256_t overflow = difference >> width;
    const uint256_t remainder = difference & MASK;

    const waffle::add_quad gate{
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
    result.witness_status = (is_constant() || other.is_constant()) ? WitnessStatus::NOT_NORMALIZED : WitnessStatus::WEAK_NORMALIZED;

    return result;
}

template <typename Composer, size_t width>
uint<Composer, width> uint<Composer, width>::operator*(const uint& other) const
{
    Composer* ctx = (context == nullptr) ? other.context : context;

    const bool lhs_constant = is_constant();
    const bool rhs_constant = other.is_constant();

    if (lhs_constant && rhs_constant) {
        return uint<Composer, width>(context, (additive_constant * other.additive_constant) & MASK);
    }
    if (lhs_constant && !rhs_constant) {
        return other * (*this);
    }

    const uint32_t rhs_idx = other.is_constant() ? ctx->zero_idx : other.witness_index;

    const uint256_t lhs = ctx->variables[witness_index];
    const uint256_t rhs = ctx->variables[rhs_idx];

    const uint256_t constant_term = (additive_constant * other.additive_constant) & MASK;
    const uint256_t product = (lhs * rhs) + (lhs * other.additive_constant) + (rhs * additive_constant) + constant_term;
    const uint256_t overflow = product >> width;
    const uint256_t remainder = product & MASK;

    const waffle::mul_quad gate{
        witness_index,
        rhs_idx,
        ctx->add_variable(remainder),
        ctx->add_variable(overflow),
        fr::one,
        other.additive_constant,
        additive_constant,
        fr::neg_one(),
        fr::neg(CIRCUIT_UINT_MAX_PLUS_ONE),
        constant_term,
    };

    ctx->create_big_mul_gate(gate);

    ctx->create_range_constraint(gate.d, width + 4);

    uint<Composer, width> result(ctx);
    result.witness_index = gate.c;
    result.accumulators = ctx->create_range_constraint(result.witness_index, width);
    result.witness_status = WitnessStatus::OK;

    return result;
}

template <typename Composer, size_t width>
uint<Composer, width> uint<Composer, width>::operator/(const uint& other) const
{
    return divmod(other).first;
}

template <typename Composer, size_t width>
uint<Composer, width> uint<Composer, width>::operator%(const uint& other) const
{
    return divmod(other).second;
}

template <typename Composer, size_t width> uint<Composer, width> uint<Composer, width>::operator&(const uint& other) const
{
    return logic_operator(other, LogicOp::AND);
}

template <typename Composer, size_t width> uint<Composer, width> uint<Composer, width>::operator^(const uint& other) const
{
    return logic_operator(other, LogicOp::XOR);
}

template <typename Composer, size_t width> uint<Composer, width> uint<Composer, width>::operator|(const uint& other) const
{
    return (*this + other) - (*this & other);
}

template <typename Composer, size_t width> uint<Composer, width> uint<Composer, width>::operator~() const
{
    if (!is_constant() && witness_status != WitnessStatus::NOT_NORMALIZED) {
        weak_normalize();
    }
    return uint(context, MASK) - *this;
}

template <typename Composer, size_t width> bool_t<Composer> uint<Composer, width>::operator>(const uint& other) const
{
    Composer* ctx = (context == nullptr) ? other.context : context;

    // we need to gaurantee that these values are 32 bits
    if (!is_constant() && witness_status != WitnessStatus::OK) {
        normalize();
    }
    if (!other.is_constant() && other.witness_status != WitnessStatus::OK) {
        other.normalize();
    }

    /**
     * if (a > b), then (a - b - 1) will be in the range [0, 2**{width}]
     * if !(a > b), then (b - a) will be in the range [0, 2**{width}]
     * if (a > b) = c and (a - b) = d, then this means that the following identity should always hold:
     *
     *          (d - 1).c - d.(1 - c) = 0
     *
     **/
    const uint256_t lhs = get_value();
    const uint256_t rhs = other.get_value();

    if (is_constant() && other.is_constant()) {
        return bool_t<Composer>(ctx, lhs > rhs);
    }

    const fr::field_t a = lhs;
    const fr::field_t b = rhs;
    const fr::field_t diff = fr::sub(a, b);

    const uint32_t lhs_idx = is_constant() ? ctx->zero_idx : witness_index;
    const uint32_t rhs_idx = other.is_constant() ? ctx->zero_idx : other.witness_index;
    const uint32_t diff_idx = ctx->add_variable(diff);

    const waffle::add_triple gate_a{ lhs_idx,
                                     rhs_idx,
                                     diff_idx,
                                     fr::one,
                                     fr::neg_one(),
                                     fr::neg_one(),
                                     fr::sub(additive_constant, other.additive_constant) };

    ctx->create_add_gate(gate_a);

    const uint256_t delta = lhs > rhs ? lhs - rhs - 1 : rhs - lhs;

    bool_t<Composer> result = witness_t(ctx, lhs > rhs);

    const waffle::mul_quad gate_b{ diff_idx,
                                   result.witness_index,
                                   ctx->add_variable(delta),
                                   ctx->zero_idx,
                                   fr::neg(uint256_t(2)),
                                   fr::one,
                                   fr::one,
                                   fr::one,
                                   fr::zero,
                                   fr::zero };
    ctx->create_big_mul_gate(gate_b);

    return result;
}

template <typename Composer, size_t width> bool_t<Composer> uint<Composer, width>::operator<(const uint& other) const
{
    return other > *this;
}

template <typename Composer, size_t width> bool_t<Composer> uint<Composer, width>::operator>=(const uint& other) const
{
    return (!(other > *this)).normalize();
}

template <typename Composer, size_t width> bool_t<Composer> uint<Composer, width>::operator<=(const uint& other) const
{
    return (!(*this > other)).normalize();
}

template <typename Composer, size_t width> bool_t<Composer> uint<Composer, width>::operator==(const uint& other) const
{
    field_t<Composer> lhs = *this;
    field_t<Composer> rhs = other;

    return (lhs == rhs).normalize();
}

template <typename Composer, size_t width> bool_t<Composer> uint<Composer, width>::operator!=(const uint& other) const
{
    return (!(*this == other)).normalize();
}

template <typename Composer, size_t width> bool_t<Composer> uint<Composer, width>::operator!() const
{
    return (!field_t<Composer>(*this).is_zero()).normalize();
}

template <typename Composer, size_t width> uint<Composer, width> uint<Composer, width>::logic_operator(const uint& other, const LogicOp op_type) const
{
    Composer* ctx = (context == nullptr) ? other.context : context;

    // we need to ensure that we can decompose our integers into (width / 2) quads
    // we don't need to completely normalize, however, as our quaternary decomposition will do that by default
    if (!is_constant() && witness_status == WitnessStatus::NOT_NORMALIZED) {
        weak_normalize();
    }
    if (!other.is_constant() && other.witness_status == WitnessStatus::NOT_NORMALIZED) {
        other.weak_normalize();
    }

    const uint256_t lhs = get_value();
    const uint256_t rhs = other.get_value();
    uint256_t out = 0;

    switch (op_type) {
    case AND: {
        out = lhs & rhs;
        break;
    }
    case XOR: {
        out = lhs ^ rhs;
        break;
    }
    default: {}
    }

    if (is_constant() && other.is_constant()) {
        return uint<Composer, width>(ctx, out);
    }

    uint32_t lhs_idx = is_constant() ? ctx->add_variable(lhs) : witness_index;
    uint32_t rhs_idx = other.is_constant() ? ctx->add_variable(rhs) : other.witness_index;

    waffle::accumulator_triple logic_accumulators;
    
    switch (op_type) {
    case AND: {
        logic_accumulators = ctx->create_and_constraint(lhs_idx, rhs_idx, width);
        break;
    }
    case XOR: {
        logic_accumulators = ctx->create_xor_constraint(lhs_idx, rhs_idx, width);
        break;
    }
    default: {}
    }

    uint32_t out_idx = logic_accumulators.out[logic_accumulators.out.size() - 1];

    if (is_constant()) {
        uint32_t constant_idx = ctx->put_constant_variable(additive_constant);
        ctx->assert_equal(lhs_idx, constant_idx);
    }
    else
    {
        accumulators = logic_accumulators.left;
        witness_status = WitnessStatus::OK;
    }

    if (other.is_constant()) {
        uint32_t constant_idx = ctx->put_constant_variable(other.additive_constant);
        ctx->assert_equal(rhs_idx, constant_idx);
    }
    else
    {
        other.accumulators = logic_accumulators.right;
        witness_status = WitnessStatus::OK;
    }

    uint<Composer, width> result(ctx);
    result.witness_index = out_idx;
    result.accumulators = logic_accumulators.out;
    result.witness_status = WitnessStatus::OK;
    return result;
}

template <typename Composer, size_t width>
std::pair<uint<Composer, width>, uint<Composer, width>> uint<Composer, width>::divmod(const uint& other) const
{
    /**
     *  divmod: returns (a / b) and (a % b)
     *  
     *  We want to validate the following:
     *
     *      a = b.q + r
     *
     * Where:
     *
     *      a = dividend witness
     *      b = divisor witness
     *      q = quotient
     *      r = remainder
     *      (b - r) is in the range [0, 2**{width}]
     *
     * The final check validates that r is a geuine remainder term, that does not contain multiples of b
     *
     * We normalize a and b, as we need to be certain these values are within the range [0, 2**{width}]
     **/

    Composer* ctx = (context == nullptr) ? other.context : context;

    // we need to gaurantee that these values are 32 bits
    if (!is_constant() && witness_status != WitnessStatus::OK) {
        normalize();
    }
    if (!other.is_constant() && other.witness_status != WitnessStatus::OK) {
        other.normalize();
    }

    // We want to force the divisor to be non-zero, as this is an error state
    if (other.is_constant() && other.get_value() == 0) {
        // TODO: should have an actual error handler!
        uint32_t one = ctx->add_variable(fr::one);
        ctx->assert_equal_constant(one, fr::zero);
    } else if (!other.is_constant()) {
        bool_t<Composer> is_divisor_zero = field_t<Composer>(other).is_zero();
        ctx->assert_equal_constant(is_divisor_zero.witness_index, fr::zero);
    }

    if (is_constant() && other.is_constant()) {
        uint<Composer, width> remainder(ctx, additive_constant % other.additive_constant);
        uint<Composer, width> quotient(ctx, additive_constant / other.additive_constant);
        return std::make_pair(quotient, remainder);
    } else if (witness_index == other.witness_index) {
        uint<Composer, width> remainder(context, 0);
        uint<Composer, width> quotient(context, 1);
        return std::make_pair(quotient, remainder);
    }

    uint32_t dividend_idx = is_constant() ? ctx->zero_idx : witness_index;
    uint32_t divisor_idx = other.is_constant() ? ctx->zero_idx : other.witness_index;

    uint256_t dividend = get_unbounded_value();
    uint256_t divisor = other.get_unbounded_value();

    uint256_t q = dividend / divisor;
    uint256_t r = dividend % divisor;

    uint32_t quotient_idx = ctx->add_variable(q);
    uint32_t remainder_idx = ctx->add_variable(r);

    waffle::mul_quad division_gate{
        quotient_idx,              // q
        divisor_idx,               // b
        dividend_idx,              // a
        remainder_idx,             // r
        fr::one,                   // q_m.w_1.w_2 = q.b
        other.additive_constant,   // q_l.w_1 = q.b if b const
        fr::zero,                  // q_2.w_2 = 0
        fr::neg_one(),             // q_3.w_3 = -a
        fr::one,                   // q_4.w_4 = r
        fr::neg(additive_constant) // q_c = -a if a const
    };
    ctx->create_big_mul_gate(division_gate);

    // (b + c_b - r) = d
    uint256_t delta = divisor - r;

    uint32_t delta_idx = ctx->add_variable(delta);
    waffle::add_triple delta_gate{
        divisor_idx,             // b
        remainder_idx,           // r
        delta_idx,               // d
        fr::one,                 // q_l = 1
        fr::neg_one(),           // q_r = -1
        fr::neg_one(),           // q_o = -1
        other.additive_constant, // q_c = d if const
    };
    ctx->create_add_gate(delta_gate);

    // validate delta is in the correct range
    ctx->create_range_constraint(delta_idx, width);

    uint<Composer, width> quotient(ctx);
    quotient.witness_index = quotient_idx;
    quotient.accumulators = ctx->create_range_constraint(quotient.witness_index, width);
    quotient.witness_status = WitnessStatus::OK;

    uint<Composer, width> remainder(ctx);
    remainder.witness_index = remainder_idx;
    remainder.accumulators = ctx->create_range_constraint(remainder.witness_index, width);
    remainder.witness_status = WitnessStatus::OK;

    return std::make_pair(quotient, remainder);
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
        witness_status = WitnessStatus::OK;
    }
    if (witness_status == WitnessStatus::NOT_NORMALIZED) {
        weak_normalize();
        accumulators = context->create_range_constraint(witness_index, width);
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