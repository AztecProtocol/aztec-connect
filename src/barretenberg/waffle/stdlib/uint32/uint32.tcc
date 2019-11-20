#ifndef STDLIB_UINT32_TCC
#define STDLIB_UINT32_TCC

#include "math.h"

#include "../common.hpp"
#include "./uint32.hpp"

#include "../../../assert.hpp"
#include "../../../fields/fr.hpp"

#include "../../composer/composer_base.hpp"

#include "../bool/bool.hpp"
#include "../field/field.hpp"

namespace plonk
{
namespace stdlib
{
// ### Internal methods
namespace
{
template <typename ComposerContext>
bool_t<ComposerContext> internal_and(bool_t<ComposerContext> left, bool_t<ComposerContext> right)
{
    return left & right;
}

template <typename ComposerContext>
bool_t<ComposerContext> internal_xor(bool_t<ComposerContext> left, bool_t<ComposerContext> right)
{
    return left ^ right;
}

template <typename ComposerContext>
bool_t<ComposerContext> internal_or(bool_t<ComposerContext> left, bool_t<ComposerContext> right)
{
    return left | right;
}

template <typename ComposerContext>
uint32<ComposerContext> internal_logic_operation(uint32<ComposerContext>& left,
                                                 uint32<ComposerContext>& right,
                                                 bool_t<ComposerContext> (*wire_logic_op)(bool_t<ComposerContext>,
                                                                                          bool_t<ComposerContext>))
{
    ASSERT(left.context == right.context || (left.context == nullptr && right.context != nullptr) ||
           (right.context == nullptr && left.context != nullptr));
    ComposerContext* context = left.context == nullptr ? right.context : left.context;
    left.prepare_for_logic_operations();
    right.prepare_for_logic_operations();

    uint32<ComposerContext> result(context);

    field_t<ComposerContext> field_accumulator = 0;
    field_t<ComposerContext> const_multiplier = 0;

    // when evaluating our logical AND, also accumulate wire values into a sum.
    // When using the extended arithmetisation widget, this can be done for only +1 extra gate.
    // i.e. vector of left, right, output wires are structured as:
    /**
     *      /                 \
     *      |x_1, y_1,     1  |
     *      |x_2, y_2, sum_1  |
     *      |x_3, y_3, sum_2  |
     *      :                 :
     *      :                 :
     *      |x_n, y_n, sum_n-1|
     *      | - ,  - , sum_n  |
     *      \                 /
     **/
    // TODO: We could remove the +1 extra gate if we could tap the *previous* gate in the circuit...
    // OR: start in reverse order :/
    for (size_t i = 0; i < 32; ++i)
    {
        result.field_wires[i] = wire_logic_op(left.field_wires[i], right.field_wires[i]);
        if (context->supports_feature(waffle::ComposerBase::Features::EXTENDED_ARITHMETISATION))
        {
            if (i > 0)
            {
                result.accumulators[i] = result.accumulators[i - 1] + (const_multiplier * result.field_wires[i]);
            }
            else
            {
                result.accumulators[0] = field_t<ComposerContext>(result.field_wires[i]);
            }
            const_multiplier = const_multiplier + const_multiplier;
        }
    }
    result.num_witness_bits = 32;
    if (context->supports_feature(waffle::ComposerBase::Features::EXTENDED_ARITHMETISATION))
    {
        result.witness = result.accumulators[31].witness;
        result.witness_index = result.accumulators[31].witness_index;
        result.witness_status = uint32<ComposerContext>::WitnessStatus::OK;
    }
    else
    {
        result.witness_status = uint32<ComposerContext>::WitnessStatus::IN_BINARY_FORM;
    }
    return result;
}
} // namespace

template <typename ComposerContext>
uint32<ComposerContext>::uint32()
    : context(nullptr)
    , witness(barretenberg::fr::zero())
    , witness_index(static_cast<uint32_t>(-1))
    , additive_constant(0)
    , multiplicative_constant(1)
    , witness_status(WitnessStatus::OK)
    , num_witness_bits(32)
{
    for (size_t i = 0; i < 32; ++i)
    {
        field_wires[i] = bool_t<ComposerContext>();
        accumulators[i] = field_t<ComposerContext>();
    }
}

template <typename ComposerContext>
uint32<ComposerContext>::uint32(ComposerContext* parent_context)
    : context(parent_context)
    , witness(barretenberg::fr::zero())
    , witness_index(static_cast<uint32_t>(-1))
    , additive_constant(0)
    , multiplicative_constant(1)
    , witness_status(WitnessStatus::OK)
    , num_witness_bits(32)
{
    ASSERT(parent_context != nullptr);
    field_t<ComposerContext> zero_wire = field_t<ComposerContext>(parent_context, barretenberg::fr::zero());
    for (size_t i = 0; i < 32; ++i)
    {
        field_wires[i] = bool_t<ComposerContext>(parent_context, false);
        accumulators[i] = field_t<ComposerContext>(parent_context, barretenberg::fr::zero());
    }
}

template <typename ComposerContext>
uint32<ComposerContext>::uint32(const witness_t<ComposerContext>& value)
    : context(value.context)
    , witness(value.witness)
    , witness_index(value.witness_index)
    , additive_constant(0)
    , multiplicative_constant(1)
    , witness_status(WitnessStatus::NOT_NORMALIZED)
    , num_witness_bits(32)
{
    ASSERT(context != nullptr);
    decompose();
}

template <typename ComposerContext>
uint32<ComposerContext>::uint32(ComposerContext* parent_context, const uint32_t value)
    : context(parent_context)
    , witness(barretenberg::fr::zero())
    , witness_index(static_cast<uint32_t>(-1))
    , additive_constant(value)
    , multiplicative_constant(1)
    , witness_status(WitnessStatus::NOT_NORMALIZED)
    , num_witness_bits(32)
{
    ASSERT(context != nullptr);
    decompose();
}

template <typename ComposerContext>
uint32<ComposerContext>::uint32(const field_t<ComposerContext>& other)
    : context(other.context)
    , witness(other.witness)
    , witness_index(other.witness_index)
    , witness_status(WitnessStatus::NOT_NORMALIZED)
    , num_witness_bits(32)
{
    ASSERT(context != nullptr);
    uint64_t additive_temp = barretenberg::fr::from_montgomery_form(other.additive_constant).data[0];
    uint64_t multiplicative_temp = barretenberg::fr::from_montgomery_form(other.multiplicative_constant).data[0];
    ASSERT(additive_temp < (1 << 32));
    ASSERT(multiplicative_temp < (1 << 32));
    additive_constant = static_cast<uint32_t>(additive_temp);
    multiplicative_constant = static_cast<uint32_t>(multiplicative_temp);

    size_t additive_bits = static_cast<size_t>(get_msb(additive_constant));
    num_witness_bits = (32 + static_cast<size_t>(get_msb(multiplicative_constant)));
    num_witness_bits =
        std::max(num_witness_bits, additive_bits) + static_cast<uint32_t>(num_witness_bits == additive_bits);

    decompose();
}

template <typename ComposerContext>
uint32<ComposerContext>::uint32(const uint32& other)
    : context(other.context)
    , witness(other.witness)
    , witness_index(other.witness_index)
    , additive_constant(other.additive_constant)
    , multiplicative_constant(other.multiplicative_constant)
    , witness_status(other.witness_status)
    , num_witness_bits(other.num_witness_bits)
{
    ASSERT(context != nullptr);
    for (size_t i = 0; i < 32; ++i)
    {
        field_wires[i] = (other.field_wires[i]);
        accumulators[i] = (other.accumulators[i]);
    }
}

template <typename ComposerContext>
uint32<ComposerContext>::uint32(uint32&& other)
    : context(other.context)
    , witness(other.witness)
    , witness_index(other.witness_index)
    , additive_constant(other.additive_constant)
    , multiplicative_constant(other.multiplicative_constant)
    , witness_status(other.witness_status)
    , num_witness_bits(other.num_witness_bits)
{
    ASSERT(context != nullptr);
    for (size_t i = 0; i < 32; ++i)
    {
        field_wires[i] = (other.field_wires[i]);
        accumulators[i] = (other.accumulators[i]);
    }
}

template <typename ComposerContext> uint32<ComposerContext>& uint32<ComposerContext>::operator=(const uint32& other)
{
    context = other.context;
    witness = other.witness;
    witness_index = other.witness_index;
    additive_constant = other.additive_constant;
    multiplicative_constant = other.multiplicative_constant;
    witness_status = other.witness_status;
    num_witness_bits = other.num_witness_bits;
    ASSERT(context != nullptr);
    for (size_t i = 0; i < 32; ++i)
    {
        field_wires[i] = (other.field_wires[i]);
        accumulators[i] = (other.accumulators[i]);
    }
    return *this;
}

template <typename ComposerContext> uint32<ComposerContext>& uint32<ComposerContext>::operator=(uint32&& other)
{
    context = other.context;
    witness = other.witness;
    witness_index = other.witness_index;
    additive_constant = other.additive_constant;
    multiplicative_constant = other.multiplicative_constant;
    witness_status = other.witness_status;
    num_witness_bits = other.num_witness_bits;
    ASSERT(context != nullptr);
    for (size_t i = 0; i < 32; ++i)
    {
        field_wires[i] = (other.field_wires[i]);
        accumulators[i] = (other.accumulators[i]);
    }
    return *this;
}

template <typename ComposerContext> uint32<ComposerContext>& uint32<ComposerContext>::operator=(const uint32_t value)
{
    witness = barretenberg::fr::zero();
    witness_index = static_cast<uint32_t>(-1);
    additive_constant = value;
    multiplicative_constant = 1;
    witness_status = WitnessStatus::NOT_NORMALIZED;
    num_witness_bits = 32;
    decompose();
    return *this;
}

template <typename ComposerContext>
uint32<ComposerContext>& uint32<ComposerContext>::operator=(const witness_t<ComposerContext>& value)
{
    ASSERT((context == value.context) || (context == nullptr && value.context != nullptr));
    context = value.context;
    witness = value.witness;
    witness_index = value.witness_index;
    additive_constant = 0;
    multiplicative_constant = 1;
    witness_status = WitnessStatus::NOT_NORMALIZED;
    num_witness_bits = 32;
    decompose();
    return *this;
}

template <typename ComposerContext> void uint32<ComposerContext>::concatenate()
{
    ASSERT(num_witness_bits == 32);
    ASSERT(witness_status = WitnessStatus::IN_BINARY_FORM);
    ASSERT(additive_constant == 0);
    ASSERT(multiplicative_constant == 1);

    // if we have advanced addition gates, this should be optimized at the composer level
    field_t<ComposerContext> const_mul(context, barretenberg::fr::one());
    accumulators[0] = field_wires[0];
    const_mul = const_mul + const_mul;
    for (size_t i = 1; i < 32; ++i)
    {
        accumulators[i] = accumulators[i - 1] + (const_mul * field_wires[i]);
        const_mul = const_mul + const_mul;
    }

    witness = accumulators[31].witness;
    witness_index = accumulators[31].witness_index;
    witness_status = WitnessStatus::OK;
}

// Decompose will take the top-level witness value and split it into its constituent binary wire values.
// This allows us to defer 'decompositions' until neccessary - which in turn allows us to chain together multiple
// additions.
template <typename ComposerContext> void uint32<ComposerContext>::decompose()
{
    std::vector<bool_t<ComposerContext>> overhead_wires;
    field_t<ComposerContext> normalized(context);

    // hacky special case for constants - we don't want to add any constraints in this scenario
    if (witness_index == static_cast<uint32_t>(-1))
    {
        for (size_t i = 0; i < 32; ++i)
        {
            bool bit = static_cast<bool>((additive_constant >> i) & 1);
            field_wires[i] = bool_t<ComposerContext>(context, bit);
        }
    }
    else
    {
        normalized.witness = witness;
        normalized.witness_index = witness_index;
        if (additive_constant != 0 || multiplicative_constant != 1)
        {
            normalized.additive_constant =
                barretenberg::fr::to_montgomery_form({ { static_cast<uint64_t>(additive_constant), 0, 0, 0 } });
            normalized.multiplicative_constant =
                barretenberg::fr::to_montgomery_form({ { static_cast<uint64_t>(multiplicative_constant), 0, 0, 0 } });
            normalized = normalized.normalize();
        }
        barretenberg::fr::field_t test_scalar = barretenberg::fr::from_montgomery_form(normalized.witness);
        for (size_t i = 0; i < num_witness_bits; ++i)
        {
            bool bit = get_bit(test_scalar, i);
            if (i < 32)
            {
                field_wires[i] = bool_t<ComposerContext>(witness_t(context, bit));
            }
            else
            {
                overhead_wires.emplace_back(bool_t<ComposerContext>(witness_t(context, bit)));
            }
        }
    }

    // if our uint is a constant, none of the following should add any constraints
    field_t<ComposerContext> const_mul(context, barretenberg::fr::one());
    accumulators[0] = field_t<ComposerContext>(field_wires[0]);
    const_mul = const_mul + const_mul;
    for (size_t i = 1; i < 32; ++i)
    {
        accumulators[i] = accumulators[i - 1] + (const_mul * field_wires[i]);
        const_mul = const_mul + const_mul;
    }

    if (num_witness_bits > 32)
    {
        field_t<ComposerContext> overhead_accumulator = const_mul * overhead_wires[0];

        const_mul = const_mul + const_mul;
        for (size_t i = 33; i < num_witness_bits; ++i)
        {
            overhead_accumulator = overhead_accumulator + (const_mul * overhead_wires[i - 32]);
            const_mul = const_mul + const_mul;
        }
        if (witness_index != static_cast<uint32_t>(-1))
        {
            context->assert_equal((accumulators[31] + overhead_accumulator).witness_index, normalized.witness_index);
        }
    }
    else
    {
        if (witness_index != static_cast<uint32_t>(-1))
        {
            context->assert_equal(accumulators[31].witness_index, normalized.witness_index);
        }
    }

    witness = accumulators[31].witness;
    witness_index = accumulators[31].witness_index;
    num_witness_bits = 32;
    witness_status = WitnessStatus::OK;
}

template <typename ComposerContext> void uint32<ComposerContext>::normalize()
{
    if (witness_status == WitnessStatus::IN_BINARY_FORM)
    {
        concatenate();
    }
    else if (witness_status == WitnessStatus::NOT_NORMALIZED)
    {
        decompose();
    }
}

template <typename ComposerContext> uint32<ComposerContext>::operator field_t<ComposerContext>()
{
    normalize();
    return accumulators[31];
}

template <typename ComposerContext> void uint32<ComposerContext>::prepare_for_arithmetic_operations()
{
    if (witness_status == WitnessStatus::IN_BINARY_FORM)
    {
        concatenate();
    }
    ASSERT(witness_status == WitnessStatus::OK || witness_status == WitnessStatus::NOT_NORMALIZED);
}

template <typename ComposerContext> void uint32<ComposerContext>::prepare_for_logic_operations()
{
    if (witness_status == WitnessStatus::NOT_NORMALIZED)
    {
        decompose();
    }
    ASSERT(witness_status == WitnessStatus::OK || witness_status == WitnessStatus::IN_BINARY_FORM);
}

template <typename ComposerContext> uint32<ComposerContext> uint32<ComposerContext>::operator+(uint32& other)
{
    prepare_for_arithmetic_operations();
    other.prepare_for_arithmetic_operations();
    ASSERT(context == other.context || (context != nullptr && other.context == nullptr) ||
           (context == nullptr && other.context != nullptr));
    uint32<ComposerContext> result = uint32<ComposerContext>();
    result.context = (context == nullptr) ? other.context : context;

    bool lhs_constant = witness_index == static_cast<uint32_t>(-1);
    bool rhs_constant = other.witness_index == static_cast<uint32_t>(-1);

    if (!lhs_constant && !rhs_constant && (witness_index == other.witness_index))
    {
        result = *this;
        result.multiplicative_constant *= 2;
        result.additive_constant = additive_constant + other.additive_constant;
        result.num_witness_bits = static_cast<size_t>(get_msb((result.multiplicative_constant))) + num_witness_bits;
        result.witness_status = WitnessStatus::NOT_NORMALIZED;
    }
    else if (lhs_constant && rhs_constant)
    {
        result.additive_constant = additive_constant + other.additive_constant;
        result.num_witness_bits = num_witness_bits + 1;
        result.witness_status = WitnessStatus::OK;
    }
    else if (!lhs_constant && rhs_constant)
    {
        result = uint32(*this);
        result.additive_constant = additive_constant + other.additive_constant;
        result.num_witness_bits = num_witness_bits + 1;
        result.witness_status = WitnessStatus::NOT_NORMALIZED;
    }
    else if (lhs_constant && !rhs_constant)
    {
        result = uint32(other);
        result.additive_constant = additive_constant + other.additive_constant;
        result.num_witness_bits = num_witness_bits + 1;
        result.witness_status = WitnessStatus::NOT_NORMALIZED;
    }
    else
    {
        result.additive_constant = 0U;
        result.multiplicative_constant = 1U;

        uint32_t qc_32 = additive_constant + other.additive_constant;
        uint32_t ql_32 = multiplicative_constant;
        uint32_t qr_32 = other.multiplicative_constant;

        barretenberg::fr::field_t q_l =
            barretenberg::fr::to_montgomery_form({ { static_cast<uint64_t>(ql_32), 0, 0, 0 } });
        barretenberg::fr::field_t q_r =
            barretenberg::fr::to_montgomery_form({ { static_cast<uint64_t>(qr_32), 0, 0, 0 } });
        barretenberg::fr::field_t q_c =
            barretenberg::fr::to_montgomery_form({ { static_cast<uint64_t>(qc_32), 0, 0, 0 } });

        barretenberg::fr::field_t T0 = barretenberg::fr::mul(witness, q_l);
        barretenberg::fr::field_t T1 = barretenberg::fr::mul(other.witness, q_r);
        result.witness = barretenberg::fr::add(barretenberg::fr::add(T0, T1), q_c);
        result.witness_index = result.context->add_variable(result.witness);
        const waffle::add_triple gate_coefficients{
            witness_index, other.witness_index, result.witness_index, q_l, q_r, barretenberg::fr::neg_one(), q_c
        };

        size_t left_bit_length = static_cast<size_t>(get_msb((ql_32))) + num_witness_bits;
        size_t right_bit_length = static_cast<size_t>(get_msb((qr_32))) + other.num_witness_bits;
        // size_t constant_bit_length = static_cast<size_t>(get_msb((qc_32)));

        size_t output_bit_length = std::max(left_bit_length, right_bit_length) + 1;
        result.num_witness_bits = output_bit_length;
        result.context->create_add_gate(gate_coefficients);
        result.witness_status = WitnessStatus::NOT_NORMALIZED;
        if (output_bit_length >= MAXIMUM_BIT_LENGTH)
        {
            result.decompose();
        }
    }
    return result;
}

template <typename ComposerContext> uint32<ComposerContext> uint32<ComposerContext>::operator-(uint32& other)
{
    prepare_for_arithmetic_operations();
    other.prepare_for_arithmetic_operations();
    if (witness_status == WitnessStatus::NOT_NORMALIZED)
    {
        decompose();
    }
    if (other.witness_status == WitnessStatus::NOT_NORMALIZED)
    {
        other.decompose();
    }
    ASSERT(context == other.context || (context != nullptr && other.context == nullptr) ||
           (context == nullptr && other.context != nullptr));
    uint32<ComposerContext> result = uint32<ComposerContext>();
    result.context = (context == nullptr) ? other.context : context;

    bool lhs_constant = witness_index == static_cast<uint32_t>(-1);
    bool rhs_constant = other.witness_index == static_cast<uint32_t>(-1);

    if (!lhs_constant && !rhs_constant && (witness_index == other.witness_index))
    {
        result = uint32<ComposerContext>(result.context, 0);
    }
    else if (lhs_constant && rhs_constant)
    {
        result.additive_constant = additive_constant - other.additive_constant;
    }
    else if (!lhs_constant && rhs_constant)
    {
        result = *this;
        result.additive_constant = additive_constant - other.additive_constant;
    }
    else if (lhs_constant && !rhs_constant)
    {
        result = *this;
        result.additive_constant = additive_constant - other.additive_constant;
    }
    else
    {
        result.additive_constant = 0U;
        result.multiplicative_constant = 1U;

        uint32_t qc_32 = additive_constant + other.additive_constant;
        uint32_t ql_32 = multiplicative_constant;
        uint32_t qr_32 = other.multiplicative_constant;

        barretenberg::fr::field_t q_l =
            barretenberg::fr::to_montgomery_form({ { static_cast<uint64_t>(ql_32), 0, 0, 0 } });
        barretenberg::fr::field_t q_r =
            barretenberg::fr::to_montgomery_form({ { static_cast<uint64_t>(qr_32), 0, 0, 0 } });
        barretenberg::fr::field_t q_c =
            barretenberg::fr::to_montgomery_form({ { static_cast<uint64_t>(qc_32), 0, 0, 0 } });

        q_r = barretenberg::fr::neg(q_r);
        q_c = barretenberg::fr::add(q_c, uint32_max);
        barretenberg::fr::field_t T0 = barretenberg::fr::mul(witness, q_l);
        barretenberg::fr::field_t T1 = barretenberg::fr::mul(other.witness, q_r);

        result.witness = barretenberg::fr::add(barretenberg::fr::add(T0, T1), q_c);
        result.witness_index = result.context->add_variable(result.witness);
        const waffle::add_triple gate_coefficients{
            witness_index, other.witness_index, result.witness_index, q_l, q_r, barretenberg::fr::neg_one(), q_c
        };

        size_t left_bit_length = static_cast<size_t>(get_msb((ql_32))) + num_witness_bits;
        size_t right_bit_length = static_cast<size_t>(get_msb((qr_32))) + other.num_witness_bits;

        size_t output_bit_length = std::max(left_bit_length, right_bit_length) + 1;
        result.num_witness_bits = output_bit_length;
        result.context->create_add_gate(gate_coefficients);
        // result.decompose();
    }
    return result;
}

// um...those constant coefficients...
// are a bit ugly
// e.g. (qm1.x + qc1) * (qm2.y + qc2)
// = (qm1.qm2.xy + qm1.qc2.x + qm2.qc1.y + qc1.qc2)
// the output of this needs to be a uint32!
// (we know that xy is at most 64 bits, x, y at most 32 bits)
// (we can convert qm1.qm2 to qm3*(2^32) + qm4)
// (and therefore we only care about qm4.xy, which is now 96 bits)
// (ditto for qm1.qc2 and qm2.qc1)
// (qm5.x + qm6.y + qm4.xy + qm7)
// this creates a 96 bit result

template <typename ComposerContext> uint32<ComposerContext> uint32<ComposerContext>::operator*(uint32& other)
{
    prepare_for_arithmetic_operations();
    other.prepare_for_arithmetic_operations();

    uint32<ComposerContext> result = uint32<ComposerContext>();
    result.context = (context == nullptr) ? other.context : context;

    bool lhs_constant = witness_index == static_cast<uint32_t>(-1);
    bool rhs_constant = other.witness_index == static_cast<uint32_t>(-1);

    // TODO: fix up bit lengths for constant terms
    if (lhs_constant && rhs_constant)
    {
        result = (*this);
        result.additive_constant = additive_constant * other.additive_constant;
    }
    else if (!lhs_constant && rhs_constant)
    {
        result = (*this);
        result.additive_constant = additive_constant * other.additive_constant;
        multiplicative_constant = multiplicative_constant * other.additive_constant;
    }
    else if (lhs_constant && !rhs_constant)
    {
        result = (other);
        result.additive_constant = additive_constant * other.additive_constant;
        multiplicative_constant = other.multiplicative_constant * additive_constant;
    }
    else
    {
        result.additive_constant = 0;
        result.multiplicative_constant = 1;

        // both inputs map to circuit varaibles - create a * constraint
        // we have (m1.x + a1).(m2.y + a2)
        // = m1.m2.x.y + m1.a2.x + m2.a1.y + a1.a2
        uint32_t qm_32 = multiplicative_constant * other.multiplicative_constant;
        uint32_t ql_32 = multiplicative_constant * other.additive_constant;
        uint32_t qr_32 = other.multiplicative_constant * additive_constant;
        uint32_t qc_32 = additive_constant * other.additive_constant;

        barretenberg::fr::field_t T0;
        barretenberg::fr::field_t q_m =
            barretenberg::fr::to_montgomery_form({ { static_cast<uint64_t>(qm_32), 0, 0, 0 } });
        barretenberg::fr::field_t q_l =
            barretenberg::fr::to_montgomery_form({ { static_cast<uint64_t>(ql_32), 0, 0, 0 } });
        barretenberg::fr::field_t q_r =
            barretenberg::fr::to_montgomery_form({ { static_cast<uint64_t>(qr_32), 0, 0, 0 } });
        barretenberg::fr::field_t q_c =
            barretenberg::fr::to_montgomery_form({ { static_cast<uint64_t>(qc_32), 0, 0, 0 } });

        barretenberg::fr::__mul(witness, other.witness, result.witness);
        barretenberg::fr::__mul(result.witness, q_m, result.witness);
        barretenberg::fr::__mul(witness, q_l, T0);
        barretenberg::fr::__add(result.witness, T0, result.witness);
        barretenberg::fr::__mul(other.witness, q_r, T0);
        barretenberg::fr::__add(result.witness, T0, result.witness);
        barretenberg::fr::__add(result.witness, q_c, result.witness);

        result.witness_index = context->add_variable(result.witness);
        const waffle::poly_triple gate_coefficients{
            witness_index, other.witness_index, result.witness_index, q_m, q_l, q_r, barretenberg::fr::neg_one(), q_c
        };
        context->create_poly_gate(gate_coefficients);

        size_t multiplicative_bit_length = static_cast<size_t>(get_msb(multiplicative_constant)) +
                                           static_cast<size_t>(get_msb(other.multiplicative_constant));
        multiplicative_bit_length = multiplicative_bit_length > 32 ? 32 : multiplicative_bit_length;
        multiplicative_bit_length += (num_witness_bits + other.num_witness_bits);
        size_t left_bit_length = num_witness_bits + static_cast<size_t>(get_msb(additive_constant));
        size_t right_bit_length = other.num_witness_bits + static_cast<size_t>(get_msb(other.additive_constant));
        size_t linear_bit_length =
            std::max(left_bit_length, right_bit_length) + static_cast<size_t>(left_bit_length == right_bit_length);
        size_t output_bit_length = std::max(multiplicative_bit_length, linear_bit_length) +
                                   static_cast<size_t>(multiplicative_bit_length == linear_bit_length);
        result.num_witness_bits = output_bit_length;
        result.witness_status = WitnessStatus::NOT_NORMALIZED;
        if (result.num_witness_bits >= MAXIMUM_BIT_LENGTH)
        {
            result.decompose();
        }
    }
    return result;
}

template <typename ComposerContext> uint32<ComposerContext> uint32<ComposerContext>::operator/(uint32& other)
{
    // a / b = c
    // => c * b = a
    // (c)(qm1.b + qc1) - (qm2.a + qc2) = 0
    // this seems rather tricky, especially as a uint32 :/
    // find a 32-bit value `c`, such that
    // `c` * b - a = d
    // and d's first 32 bit values are 0

    prepare_for_arithmetic_operations();
    other.prepare_for_arithmetic_operations();

    uint32<ComposerContext> result;
    result.context = (context == nullptr) ? other.context : context;

    bool lhs_constant = witness_index == static_cast<uint32_t>(-1);
    bool rhs_constant = other.witness_index == static_cast<uint32_t>(-1);

    if (!lhs_constant && !rhs_constant && (witness_index == other.witness_index))
    {
        result = 1U;
    }
    if (lhs_constant && rhs_constant)
    {
        result = (*this);
        result.additive_constant = additive_constant / other.additive_constant;
    }
    else if (!lhs_constant && rhs_constant)
    {
        // (qm.a + qc1) / qc2
        result = (*this);
        result.additive_constant = additive_constant / other.additive_constant;
        result.multiplicative_constant = multiplicative_constant / other.additive_constant;
    }
    else
    {
        // TODO: can remove this requirement with proper bigint arithmetic
        // TODO: handle constants in decomposition!
        if (num_witness_bits > 32)
        {
            decompose();
        }
        if (other.num_witness_bits > 32)
        {
            other.decompose();
        }
        // result.logic_witness_index = static_cast<uint32_t>(-1);
        // result.witness_uint32 = static_cast<uint32_t>(-1);
        // result.is_logic_concatenated = false;
        // result.is_concatenated = false;
        // result.additive_constant = barretenberg::fr::zero();
        // result.multiplicative_constant = barretenberg::fr::one();

        // (m1.x + a1) = (m2.y + a2) * z
        // m1.x + a1 = m2.y.z + a2.z
        // m2.y.z + a2.z - m1.x - a1 = 0 mod 2^32
        // m2.y.z + a2.z - t1 = 0
        // (uint32 t1) - m1.x - a1 = 0
        // output = first input
        // left = second input
        // right = new witness
        uint32_t numerator_witness = static_cast<uint32_t>(barretenberg::fr::from_montgomery_form(witness).data[0]);
        // uint32_t denominator_witness =
        //     static_cast<uint32_t>(barretenberg::fr::from_montgomery_form(other.witness).data[0]);

        uint32_t numerator_uint = (numerator_witness * (multiplicative_constant)) + additive_constant;
        uint32_t denominator_uint = (denominator_uint * (other.multiplicative_constant)) + other.additive_constant;

        uint32_t quotient_uint = numerator_uint / denominator_uint;
        // uint32_t remainder_uint = numerator_uint - (quotient_uint * denominator_uint);

        // field_t<ComposerContext> numerator = field_wires[31];
        // numerator = numerator * multiplicative_constant;
        // numerator = numerator + additive_constant;
        // field_t<ComposreContext> denominator = other.field_wires[31];
        // denominator = denominator * multiplicative_constant;
        // denominator = denominator + additive_constant;
        result = uint32<ComposerContext>(witness_t(context, quotient_uint));
        uint32<ComposerContext> remainder = *this - (other * result);
        bool_t left = remainder < other;
        bool_t right(witness_t(context, true));
        context->assert_equal(left.witness_index, right.witness_index);
    }
    return result;
}

template <typename ComposerContext> bool_t<ComposerContext> uint32<ComposerContext>::operator<(uint32& other)
{
    prepare_for_arithmetic_operations();
    other.prepare_for_arithmetic_operations();

    if (num_witness_bits > 32)
    {
        decompose();
    }
    if (other.num_witness_bits > 32)
    {
        decompose();
    }
    // ok
    // this < other ? true : false
    // if this < other
    // then other - this = (uint32)
    // (other - this) * predicate + (this - other) * (1 - predicate) = val
    // (other) * (2 * predicate) - (this) * (2 * predicate) + this - other = val
    // (other - this) * (2 * predicate) - (other - this) = val
    // diff (2 * predicate - 1) = val
    uint32_t lhs = static_cast<uint32_t>(barretenberg::fr::from_montgomery_form(witness).data[0]);
    uint32_t rhs = static_cast<uint32_t>(barretenberg::fr::from_montgomery_form(other.witness).data[0]);
    bool predicate_bool = lhs < rhs;
    bool_t<ComposerContext> predicate(witness_t<ComposerContext>(context, predicate_bool));

    field_t<ComposerContext> left = other.accumulators[31];
    left.multiplicative_constant =
        barretenberg::fr::to_montgomery_form({ { static_cast<uint64_t>(other.multiplicative_constant), 0, 0, 0 } });
    left.additive_constant =
        barretenberg::fr::to_montgomery_form({ { static_cast<uint64_t>(other.additive_constant), 0, 0, 0 } });
    field_t<ComposerContext> right = accumulators[31];
    right.multiplicative_constant =
        barretenberg::fr::to_montgomery_form({ { static_cast<uint64_t>(multiplicative_constant), 0, 0, 0 } });
    right.additive_constant =
        barretenberg::fr::to_montgomery_form({ { static_cast<uint64_t>(additive_constant), 0, 0, 0 } });

    field_t<ComposerContext> difference = left - right;
    uint32<ComposerContext> delta(field_t<ComposerContext>((field_t<ComposerContext>(predicate) * 2 - 1) * difference));
    delta.decompose();
    return predicate;
}

template <typename ComposerContext> bool_t<ComposerContext> uint32<ComposerContext>::operator<=(uint32& other)
{
    prepare_for_arithmetic_operations();
    other.prepare_for_arithmetic_operations();

    // this <= other === this < (other + 1)
    uint32<ComposerContext> rhs = (other);
    rhs = rhs + uint32<ComposerContext>(context, 1U);
    return operator<(rhs);
}

template <typename ComposerContext> bool_t<ComposerContext> uint32<ComposerContext>::operator>(uint32& other)
{
    return (other < *this);
}

template <typename ComposerContext> bool_t<ComposerContext> uint32<ComposerContext>::operator>=(uint32& other)
{
    return (other <= *this);
}

template <typename ComposerContext> bool_t<ComposerContext> uint32<ComposerContext>::operator!=(uint32& other)
{
    prepare_for_arithmetic_operations();
    other.prepare_for_arithmetic_operations();

    if (num_witness_bits > 32)
    {
        decompose();
    }
    if (other.num_witness_bits > 32)
    {
        decompose();
    }

    uint32<ComposerContext> difference = operator-(other);
    difference.decompose();

    field_t<ComposerContext> numerator = field_t<ComposerContext>(difference.field_wires[31]);
    // field_t<ComposerContext> numerator(context, 1);

    // x * xinv - 1 = 0
    // x * xinv - (predicate) = 0
    barretenberg::fr::field_t inverse;
    if (barretenberg::fr::eq(numerator, barretenberg::fr::zero()))
    {
        inverse = barretenberg::fr::zero();
    }
    else
    {
        inverse = barretenberg::fr::invert(numerator);
    }
    field_t<ComposerContext> denominator(witness_t(context, inverse));

    field_t<ComposerContext> predicate = numerator * inverse;

    return (static_cast<bool_t<ComposerContext>>(predicate));
}

template <typename ComposerContext> bool_t<ComposerContext> uint32<ComposerContext>::operator==(uint32& other)
{
    return !(operator!=(other));
}

template <typename ComposerContext> uint32<ComposerContext> uint32<ComposerContext>::operator&(uint32& other)
{
    return internal_logic_operation(*this, other, &internal_and);
}

template <typename ComposerContext> uint32<ComposerContext> uint32<ComposerContext>::operator^(uint32& other)
{
    return internal_logic_operation(*this, other, &internal_xor);
}

template <typename ComposerContext> uint32<ComposerContext> uint32<ComposerContext>::operator|(uint32& other)
{
    return internal_logic_operation(*this, other, &internal_or);
}

template <typename ComposerContext> uint32<ComposerContext> uint32<ComposerContext>::operator~()
{
    prepare_for_logic_operations();

    uint32<ComposerContext> result = (*this);

    for (size_t i = 0; i < 32; ++i)
    {
        result.field_wires[i] = ~(result.field_wires[i]);
    }
    result.witness_status = WitnessStatus::IN_BINARY_FORM;
    return result;
}

template <typename ComposerContext> uint32<ComposerContext> uint32<ComposerContext>::operator>>(const uint32_t shift)
{
    if (shift == 0)
    {
        return (*this);
    }
    if (shift >= 32)
    {
        return uint32<ComposerContext>(context, 0);
    }

    // TODO: there's a method to get the actual witness of this uint basically for free
    // but it requires tracking variable-additive terms that are added into each accumulator,
    // as well as a constant multiplicative term that each accumulator is multiplied by.
    // We then bump into the thorny issue, that when performing chained logical ops, we don't
    // need the accumulated witness, so burning 1-2 constraints to evaluate it is pointless.
    // Which means we need to distinguish between THOSE conditions and...blah! Just blah.
    prepare_for_logic_operations();

    uint32<ComposerContext> result(context);
    for (size_t i = 0; i < 32 - shift; ++i)
    {
        result.field_wires[i] = field_wires[i + shift];
    }
    for (size_t i = 32 - shift; i < 32; ++i)
    {
        result.field_wires[i] = bool_t<ComposerContext>(context, false);
    }
    result.witness_status = WitnessStatus::IN_BINARY_FORM;
    result.num_witness_bits = 32;
    result.additive_constant = 0;
    result.multiplicative_constant = 1;
    result.witness = barretenberg::fr::zero();
    result.witness_index = static_cast<uint32_t>(-1);
    return result;
}

template <typename ComposerContext> uint32<ComposerContext> uint32<ComposerContext>::operator<<(const uint32_t shift)
{
    if (shift == 0)
    {
        return (*this);
    }
    if (shift >= 32)
    {
        return uint32<ComposerContext>(context, 0);
    }

    prepare_for_logic_operations();

    uint32<ComposerContext> result(context);
    for (size_t i = 0; i < shift; ++i)
    {
        result.field_wires[i] = bool_t<ComposerContext>(context, false);
    }
    for (size_t i = shift; i < 32; ++i)
    {
        result.field_wires[i] = field_wires[i - shift];
    }
    result.witness_status = WitnessStatus::IN_BINARY_FORM;
    result.num_witness_bits = 32;
    result.additive_constant = 0;
    result.multiplicative_constant = 1;
    result.witness = barretenberg::fr::zero();
    result.witness_index = static_cast<uint32_t>(-1);
    return result;
}

template <typename ComposerContext> uint32<ComposerContext> uint32<ComposerContext>::ror(const uint32_t const_rotation)
{
    ASSERT(const_rotation < 32);
    if (const_rotation == 0)
    {
        return (*this);
    }
    prepare_for_logic_operations();

    uint32<ComposerContext> result(context);

    for (size_t i = 0; i < 32 - const_rotation; ++i)
    {
        result.field_wires[i] = field_wires[i + const_rotation];
    }
    for (size_t i = 0; i < const_rotation; ++i)
    {
        result.field_wires[32 - const_rotation + i] = field_wires[i];
    }
    result.witness_status = WitnessStatus::IN_BINARY_FORM;
    return result;
}

template <typename ComposerContext> uint32<ComposerContext> uint32<ComposerContext>::rol(const uint32_t const_rotation)
{
    if (const_rotation == 0)
    {
        return (*this);
    }
    ASSERT(const_rotation < 32);

    return ror(32 - const_rotation);
}
} // namespace stdlib
} // namespace plonk
#endif