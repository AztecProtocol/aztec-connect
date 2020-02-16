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

    // discard the high bits
    ctx->create_range_constraint(gate.d, width + 4);

    uint<Composer, width> result(ctx);
    result.accumulators = ctx->create_range_constraint(gate.c, width);
    result.witness_index = result.accumulators[(width >> 1) - 1];
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

template <typename Composer, size_t width> uint<Composer, width> uint<Composer, width>::operator>>(const uint64_t shift) const
{
    if (shift >= width)
    {
        return uint(context, 0);
    }
    if (is_constant())
    {
        return uint(context, additive_constant >> shift);
    }

    if (witness_status != WitnessStatus::OK)
    {
        normalize();
    }

    if (shift == 0)
    {
        return *this;
    }

   /**
    * bit shifts...
    * 
    * We represent uints using a set of accumulating base-4 sums,
    * which adds complexity to bit shifting.
    * 
    * Right shifts by even values are trivial - for a shift of 'x',
    * we return accumulator[(x - width - 1) / 2]
    * 
    * Shifts by odd values are harder as we only have quads to work with.
    * 
    * To recap accumulators. Our uint A can be described via a sum of its quads (a_0, ..., a_{width - 1})
    * (we use w as shorthand for 'width)
    *
    *      w - 1
    *      ===
    *      \          i
    * A =  /    a  . 4
    *      ===   i
    *     i = 0
    *
    * Our range constraint will represent A via its accumulating sums (A_0, ..., A_{w-1}), where
    *
    *         i
    *        ===
    *        \                             j
    * A   =  /    a                     . 4
    *  i     ===   ((w - 2/ 2) - i + j)
    *       j = 0
    *
    * 
    * To compute (A >> x), we want the following value:
    * 
    *    (w - x - 2) / 2
    *      ===
    *      \                 j
    * R =  /    a         . 4
    *      ===   (x + j)
    *     j = 0
    *
    * 
    * From this, we can see that if x is even, R = A
    *                                               w - x - 1
    * 
    * If x is odd, then we want to obtain the following:
    * 
    *           (w - x - 2) / 2
    *             ===
    *             \                 j
    * R = b   2 . /    a         . 4
    *      x      ===   (x + j)
    *           j = 0
    *
    * Where b   is the most significant bit of A            - 4. A
    *        x                                  (x + 2) / 2       (x / 2)
    * 
    * We have a special selector configuration in our arithmetic widget,
    * that will extract 6.b  from two accumulators for us.
    *                      x
    * The factor of 6 is for efficiency reasons,
    * we need to scale our other gate coefficients by 6 to accomodate this
     **/ 

    if ((shift & 1) == 0)
    {
        uint result(context);
        result.witness_index = accumulators[((width >> 1) - 1 - (shift >> 1))];
        result.witness_status = WitnessStatus::WEAK_NORMALIZED;
        return result;
    }

    uint256_t output = get_value() >> shift;

    // get accumulator index
    uint64_t x = ((width >> 1) - 1 - (shift >> 1));

    // this >> shift = 2 * a[x - 1] + high bit of (a[x] - 4 * a[x - 1])
    // our add-with-bit-extract gate will pull out the high bit of ^^
    // if we place a[x] in column 3 and a[x - 1] in column 4
    // (but it actually extracts 6 * high_bit for efficiency reasons)
    // so we need to scale everything else accordingly
    uint32_t right_index = accumulators[x];
    uint32_t left_index = shift == 31 ? context->zero_idx : accumulators[x - 1];

    const waffle::add_quad gate{
        context->zero_idx,
        context->add_variable(output),
        right_index,
        left_index,
        fr::zero,
        fr::neg(fr::to_montgomery_form({{ 6, 0, 0, 0 }})),
        fr::zero,
        fr::to_montgomery_form({{ 12, 0, 0, 0 }}),
        fr::zero,
    };

    context->create_big_add_gate_with_bit_extraction(gate);

    uint result(context);
    result.witness_index = gate.b;
    result.witness_status = WitnessStatus::WEAK_NORMALIZED;

    return result;
}


template <typename Composer, size_t width> uint<Composer, width> uint<Composer, width>::operator<<(const uint64_t shift) const
{
    if (shift >= width)
    {
        return uint(context, 0);
    }

    if (is_constant())
    {
        return uint(context, (additive_constant << shift) & MASK);
    }

    if (witness_status != WitnessStatus::OK)
    {
        normalize();
    }

    if (shift == 0)
    {
        return *this;
    }

    if ((shift & 1) == 0)
    {
        uint64_t x = (shift >> 1);
        uint32_t right_idx = accumulators[x - 1];
        uint32_t base_idx = witness_index;

        uint256_t base_shift_factor = uint256_t(1) << (x * 2);
        uint256_t right_shift_factor = uint256_t(1) << (width);

        uint256_t output = (get_value() << shift) & MASK;

        waffle::add_triple gate{
            base_idx,
            right_idx,
            context->add_variable(output),
            base_shift_factor,
            fr::neg(right_shift_factor),
            fr::neg_one(),
            fr::zero
        };

        context->create_add_gate(gate);
    
        uint result(context);
        result.witness_index = gate.c;
        result.witness_status = WitnessStatus::WEAK_NORMALIZED;
        return result;
    }

    uint256_t output = (get_value() << shift) & MASK;

    // get accumulator index
    uint64_t x = (shift >> 1);

    uint32_t right_index = shift == 1 ? context->zero_idx : accumulators[x - 1];
    uint32_t left_index = accumulators[x];
    uint32_t base_index = witness_index;

    uint256_t base_shift_factor = ((uint256_t(1) << (x * 2 + 1)));
    uint256_t b_hi_shift_factor = CIRCUIT_UINT_MAX_PLUS_ONE;
    uint256_t right_shift_factor = b_hi_shift_factor + b_hi_shift_factor;

    base_shift_factor *= 6;
    right_shift_factor *= 6;

    fr::field_t q_1 = uint256_t(6);
    fr::field_t q_2 = base_shift_factor;
    fr::field_t q_3 = right_shift_factor;

    fr::field_t denominator = b_hi_shift_factor;
    fr::__neg(denominator, denominator);
    fr::__invert(denominator, denominator);

    fr::__mul(q_1, denominator, q_1);
    fr::__mul(q_2, denominator, q_2);
    fr::__mul(q_3, denominator, q_3);

    const waffle::add_quad gate{
        context->add_variable(output),
        base_index,
        left_index,
        right_index,
        fr::neg(q_1),
        q_2,
        fr::zero,
        fr::neg(q_3),
        fr::zero,
    };

    context->create_big_add_gate_with_bit_extraction(gate);

    uint result(context);
    result.witness_index = gate.a;
    result.witness_status = WitnessStatus::WEAK_NORMALIZED;

    return result;
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
    // casting to a field type will ensure that lhs / rhs are both normalized
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
    return (field_t<Composer>(*this).is_zero()).normalize();
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

    if (is_constant()) {
        uint32_t constant_idx = ctx->put_constant_variable(additive_constant);
        ctx->assert_equal(lhs_idx, constant_idx);
    }
    else
    {
        accumulators = logic_accumulators.left;
        witness_index = accumulators[(width >> 1) - 1];
        witness_status = WitnessStatus::OK;
    }

    if (other.is_constant()) {
        uint32_t constant_idx = ctx->put_constant_variable(other.additive_constant);
        ctx->assert_equal(rhs_idx, constant_idx);
    }
    else
    {
        other.accumulators = logic_accumulators.right;
        other.witness_index = other.accumulators[(width >> 1) - 1];
        witness_status = WitnessStatus::OK;
    }

    uint<Composer, width> result(ctx);
    result.accumulators = logic_accumulators.out;
    result.witness_index = result.accumulators[(width >> 1) - 1];
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
    quotient.accumulators = ctx->create_range_constraint(quotient_idx, width);
    quotient.witness_index = quotient.accumulators[(width >> 1) - 1];
    quotient.witness_status = WitnessStatus::OK;

    uint<Composer, width> remainder(ctx);
    remainder.accumulators = ctx->create_range_constraint(remainder_idx, width);
    remainder.witness_index = remainder.accumulators[(width >> 1) - 1];
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