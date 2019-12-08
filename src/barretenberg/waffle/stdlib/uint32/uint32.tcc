#ifndef STDLIB_UINT32_TCC
#define STDLIB_UINT32_TCC

#include "math.h"

#include "../common.hpp"
#include "../int_utils.hpp"

#include "./uint32.hpp"

#include "../../../assert.hpp"
#include "../../../fields/fr.hpp"

#include "../../composer/composer_base.hpp"

#include "../bool/bool.hpp"
#include "../field/field.hpp"

#include <numeric>

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
} // namespace

template <typename ComposerContext>
uint32<ComposerContext> uint32<ComposerContext>::internal_logic_operation(
    const uint32<ComposerContext>& right,
    bool_t<ComposerContext> (*wire_logic_op)(bool_t<ComposerContext>, bool_t<ComposerContext>))
{
    prepare_for_logic_operations();
    right.prepare_for_logic_operations();
    ComposerContext* ctx = (context == nullptr) ? right.context : context;
    uint32<ComposerContext> result(*this);
    result.context = ctx;
    for (size_t i = 0; i < 32; ++i)
    {
        result.queued_logic_operation.operand_wires[i] = bool_t<ComposerContext>(right.field_wires[i]);
    }
    result.queued_logic_operation.method = wire_logic_op;
    result.witness_status = WitnessStatus::QUEUED_LOGIC_OPERATION;
    return result;
}

// internal_logic_operation_native
template <typename ComposerContext>
void uint32<ComposerContext>::internal_logic_operation_native(
    const bool_t<ComposerContext> operand_wires[32],
    bool_t<ComposerContext> (*wire_logic_op)(bool_t<ComposerContext>, bool_t<ComposerContext>)) const
{
    ASSERT(witness_status == WitnessStatus::IN_BINARY_FORM || witness_status == WitnessStatus::OK);
    // TODO: shouldn't need these?
    // prepare_for_logic_operations();
    // right.prepare_for_logic_operations();

    // field_t<ComposerContext> field_accumulator = 0;
    // field_t<ComposerContext> const_multiplier = 0;

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
    maximum_value = 0;
    field_t<ComposerContext> const_mul(context, barretenberg::fr::one());
    field_t<ComposerContext> accumulator(context, barretenberg::fr::zero());

    for (size_t i = 0; i < 32; ++i)
    {
        // this is very hacky at the moment!
        // We can combine a logic operation on a single bit, with an accumulation of that bit into a sum.
        // But to get the optimizer to pick this up, we need to interleave bit accumulations between logic ops in the
        // following pattern: (logic on bit i) (accumulate bit i) (accumulate bit i + 1) (logic on bit i + 1) (logic on
        // bit i + 2) ... etc i.e. bit accumulations need to be back to back.
        // TODO: We should improve the optimizer to pick up on this pattern without needing this peculiar interleaving
        // nonsense (right now the optimizer is rather simple, and will only investigate adjacent gates to see if an
        // addition gate can be elided out)
        if (i == 0)
        {
            field_wires[i] = wire_logic_op(field_wires[i], operand_wires[i]);
            accumulator = field_t<ComposerContext>(field_wires[i]);
        }
        else
        {
            field_wires[i] = wire_logic_op(field_wires[i], operand_wires[i]);
            accumulator = accumulator + (const_mul * field_wires[i]);
        }
        const_mul = const_mul + const_mul;

        bool maximum_bool = (field_wires[i].witness_index == static_cast<uint32_t>(-1)) ? field_wires[i].get_witness_value() : true;
        maximum_value = maximum_value + (static_cast<int_utils::uint128_t>(maximum_bool) << i);
    }
    if (accumulator.witness_index == static_cast<uint32_t>(-1))
    {
        additive_constant =
            static_cast<uint32_t>(barretenberg::fr::from_montgomery_form(accumulator.additive_constant).data[0]);
        multiplicative_constant = 1;
    }
    else
    {
        additive_constant = 0;
        multiplicative_constant = 1;
    }

    witness_index = accumulator.witness_index;
    witness_status = uint32<ComposerContext>::WitnessStatus::IN_NATIVE_FORM;
}

// internal_logic_operation_native
template <typename ComposerContext>
void uint32<ComposerContext>::internal_logic_operation_binary(
    const bool_t<ComposerContext> operand_wires[32],
    bool_t<ComposerContext> (*wire_logic_op)(bool_t<ComposerContext>, bool_t<ComposerContext>)) const
{
    ASSERT(witness_status == WitnessStatus::IN_BINARY_FORM || witness_status == WitnessStatus::OK);
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
    field_t<ComposerContext> const_mul(context, barretenberg::fr::one());
    for (size_t i = 0; i < 32; ++i)
    {
        field_wires[i] = wire_logic_op(field_wires[i], operand_wires[i]);
    }
    witness_index = static_cast<uint32_t>(-1);
    witness_status = uint32<ComposerContext>::WitnessStatus::IN_BINARY_FORM;
}

template <typename ComposerContext>
uint32<ComposerContext>::uint32()
    : context(nullptr)
    , witness_index(static_cast<uint32_t>(-1))
    , additive_constant(0)
    , multiplicative_constant(1)
    , witness_status(WitnessStatus::OK)
    , maximum_value(0)
{
    for (size_t i = 0; i < 32; ++i)
    {
        field_wires[i] = bool_t<ComposerContext>();
    }
}

template <typename ComposerContext>
uint32<ComposerContext>::uint32(ComposerContext* parent_context)
    : context(parent_context)
    , witness_index(static_cast<uint32_t>(-1))
    , additive_constant(0)
    , multiplicative_constant(1)
    , witness_status(WitnessStatus::OK)
    , maximum_value(0)
{
    ASSERT(parent_context != nullptr);
    field_t<ComposerContext> zero_wire = field_t<ComposerContext>(parent_context, barretenberg::fr::zero());
    for (size_t i = 0; i < 32; ++i)
    {
        field_wires[i] = bool_t<ComposerContext>(parent_context, false);
    }
}

template <typename ComposerContext>
uint32<ComposerContext>::uint32(const witness_t<ComposerContext>& value)
    : context(value.context)
    , witness_index(value.witness_index)
    , additive_constant(0)
    , multiplicative_constant(1)
    , witness_status(WitnessStatus::NOT_NORMALIZED)
    , maximum_value((1UL << 32UL) - 1UL)
{
    ASSERT(context != nullptr);
}

template <typename ComposerContext>
uint32<ComposerContext>::uint32(const uint32_t value)
    : context(nullptr)
    , witness_index(static_cast<uint32_t>(-1))
    , additive_constant(value)
    , multiplicative_constant(1)
    , witness_status(WitnessStatus::NOT_NORMALIZED)
    , maximum_value(value)
{
}

template <typename ComposerContext>
uint32<ComposerContext>::uint32(ComposerContext* parent_context, const uint32_t value)
    : context(parent_context)
    , witness_index(static_cast<uint32_t>(-1))
    , additive_constant(value)
    , multiplicative_constant(1)
    , witness_status(WitnessStatus::NOT_NORMALIZED)
    , maximum_value(value)
{
    ASSERT(context != nullptr);
}

template <typename ComposerContext>
uint32<ComposerContext>::uint32(const field_t<ComposerContext>& other)
    : context(other.context)
    , witness_index(other.witness_index)
    , witness_status(WitnessStatus::NOT_NORMALIZED)
    , maximum_value((1UL << 32UL) - 1UL)
{
    ASSERT(context != nullptr);
    uint64_t additive_temp = barretenberg::fr::from_montgomery_form(other.additive_constant).data[0];
    uint64_t multiplicative_temp = barretenberg::fr::from_montgomery_form(other.multiplicative_constant).data[0];
    ASSERT(additive_temp < (1 << 32));
    ASSERT(multiplicative_temp < (1 << 32));
    additive_constant = static_cast<uint32_t>(additive_temp);
    multiplicative_constant = static_cast<uint32_t>(multiplicative_temp);
}

template <typename ComposerContext>
uint32<ComposerContext>::uint32(const uint32& other)
    : context(other.context)
    , witness_index(other.witness_index)
    , additive_constant(other.additive_constant)
    , multiplicative_constant(other.multiplicative_constant)
    , witness_status(other.witness_status)
    , maximum_value(other.maximum_value)
{
    ASSERT(context != nullptr);

    if (other.queued_logic_operation.method != nullptr)
    {
        queued_logic_operation.method = other.queued_logic_operation.method;
    }
    for (size_t i = 0; i < 32; ++i)
    {
        field_wires[i] = (other.field_wires[i]);
        if (other.queued_logic_operation.method != nullptr)
        {
            queued_logic_operation.operand_wires[i] = other.queued_logic_operation.operand_wires[i];
        }
    }
}

template <typename ComposerContext> uint32<ComposerContext>& uint32<ComposerContext>::operator=(const uint32& other)
{
    context = other.context;
    witness_index = other.witness_index;
    additive_constant = other.additive_constant;
    multiplicative_constant = other.multiplicative_constant;
    witness_status = other.witness_status;
    maximum_value = other.maximum_value;
    ASSERT(context != nullptr);

    if (other.queued_logic_operation.method != nullptr)
    {
        queued_logic_operation.method = other.queued_logic_operation.method;
    }
    for (size_t i = 0; i < 32; ++i)
    {
        field_wires[i] = (other.field_wires[i]);
        if (other.queued_logic_operation.method != nullptr)
        {
            queued_logic_operation.operand_wires[i] = other.queued_logic_operation.operand_wires[i];
        }
    }
    return *this;
}

template <typename ComposerContext> uint32<ComposerContext>& uint32<ComposerContext>::operator=(const uint32_t value)
{
    witness_index = static_cast<uint32_t>(-1);
    additive_constant = value;
    multiplicative_constant = 1;
    witness_status = WitnessStatus::NOT_NORMALIZED;
    maximum_value = value;
    return *this;
}

template <typename ComposerContext>
uint32<ComposerContext>& uint32<ComposerContext>::operator=(const witness_t<ComposerContext>& value)
{
    ASSERT((context == value.context) || (context == nullptr && value.context != nullptr));
    context = value.context;
    witness_index = value.witness_index;
    additive_constant = 0;
    multiplicative_constant = 1;
    witness_status = WitnessStatus::NOT_NORMALIZED;
    maximum_value = (1UL << 32UL) - 1UL;
    return *this;
}

template <typename ComposerContext>
uint32<ComposerContext>::uint32(ComposerContext *parent_context, const std::array<bool_t<ComposerContext>, 32> &wires)
{
    context = parent_context;
    additive_constant = 0;
    multiplicative_constant = 1;
    witness_status = WitnessStatus::IN_BINARY_FORM;
    witness_index = static_cast<uint32_t>(-1);
    maximum_value = 0;
    for (size_t i = 0; i < 32; ++i)
    {
        field_wires[i] = wires[i];
    }
}


template <typename ComposerContext> void uint32<ComposerContext>::concatenate() const
{
    typedef bool_t<ComposerContext> bool_t;

    ASSERT(witness_status = WitnessStatus::IN_BINARY_FORM);
    ASSERT(additive_constant == 0);
    ASSERT(multiplicative_constant == 1);

    field_t<ComposerContext> constant_multiplier(context, barretenberg::fr::one());
    field_t<ComposerContext> accumulator(context, barretenberg::fr::zero());

    maximum_value = std::accumulate(field_wires.rbegin(), field_wires.rend(), 0UL, [](auto acc, auto wire)
    {
        bool maximum_bool = (wire.witness_index == static_cast<uint32_t>(-1) ? wire.get_witness_value() : 1);
        return acc + acc + static_cast<uint64_t>(maximum_bool);
    });

    auto sum_wires = [&constant_multiplier](const field_t<ComposerContext> &old, const bool_t &wire)
    {
        field_t<ComposerContext> out = old + (constant_multiplier * wire);
        constant_multiplier = constant_multiplier + constant_multiplier;
        return out;
    };
    accumulator = std::accumulate(field_wires.begin(), field_wires.end(), accumulator, sum_wires);

    additive_constant = (accumulator.witness_index == static_cast<uint32_t>(-1)) ? static_cast<uint32_t>(maximum_value) : 0;
    multiplicative_constant = 1;
    witness_index = accumulator.witness_index;
    witness_status = WitnessStatus::OK;
}

// Decompose will take the top-level witness value and split it into its constituent binary wire values.
// This allows us to defer 'decompositions' until neccessary - which in turn allows us to chain together multiple
// additions.
template <typename ComposerContext> void uint32<ComposerContext>::decompose() const
{
    typedef bool_t<ComposerContext> bool_t;
    typedef witness_t<ComposerContext> witness_t;

    size_t num_bits = int_utils::get_msb(maximum_value) + 1;
    bool is_constant = witness_index == static_cast<uint32_t>(-1);
    int_utils::uint128_t value = is_constant ? 0UL : barretenberg::fr::from_montgomery_form(context->get_variable(witness_index)).data[0];
    value = value * multiplicative_constant + additive_constant;

    const auto compute_field_wire = [ctx = context, is_constant, &value]()
    {
        bool bit = static_cast<bool>(value & 1UL);
        value = value >> 1UL;
        bool_t result = is_constant ? bool_t(ctx, bit) : witness_t(ctx, static_cast<uint32_t>(bit));
        return result;
    };
    std::vector<bool_t> overhead_wires(static_cast<size_t>(std::max(0, static_cast<int>(num_bits) - 32)));
    std::generate(field_wires.begin(), field_wires.end(), compute_field_wire);
    std::generate(overhead_wires.begin(), overhead_wires.end(), compute_field_wire);

    maximum_value = std::accumulate(field_wires.rbegin(), field_wires.rend(), 0UL, [](auto acc, auto wire)
    {
        acc = acc + acc;
        bool maximum_bool = (wire.witness_index == static_cast<uint32_t>(-1) ? wire.get_witness_value() : 1);
        acc = acc + static_cast<uint64_t>(maximum_bool);
        return acc;
    });

    field_t<ComposerContext> constant_multiplier(context, barretenberg::fr::one());
    field_t<ComposerContext> accumulator(context, barretenberg::fr::zero());
    field_t<ComposerContext> overhead_accumulator(context, barretenberg::fr::zero());
    auto sum_wires = [&constant_multiplier](const field_t<ComposerContext> &old, const bool_t &wire)
    {
        field_t<ComposerContext> out = old + (constant_multiplier * wire);
        constant_multiplier = constant_multiplier + constant_multiplier;
        return out;
    };

    accumulator = std::accumulate(field_wires.begin(), field_wires.end(), accumulator, sum_wires);
    overhead_accumulator = std::accumulate(overhead_wires.begin(), overhead_wires.end(), overhead_accumulator, sum_wires);

    if (accumulator.witness_index != static_cast<uint32_t>(-1))
    {
        field_t<ComposerContext> res = accumulator + overhead_accumulator;
        field_t<ComposerContext> normalized = witness_t(context, context->get_variable(witness_index));
        normalized.witness_index = witness_index;
        if (additive_constant != 0 || multiplicative_constant != 1)
        {
            field_t<ComposerContext> T0 = static_cast<uint64_t>(additive_constant);
            field_t<ComposerContext> T1 = static_cast<uint64_t>(multiplicative_constant);
            normalized = (normalized * T1) + T0;
            normalized = normalized.normalize();
        }
        context->assert_equal((res).witness_index, normalized.witness_index);
        witness_index = accumulator.witness_index;
        additive_constant = 0;
        multiplicative_constant = 1;
    }
    else
    {
        witness_index = static_cast<uint32_t>(-1);
        additive_constant = static_cast<uint32_t>(maximum_value);
    }

    multiplicative_constant = 1;
    witness_status = WitnessStatus::OK;
}

template <typename ComposerContext> void uint32<ComposerContext>::normalize()
{
    if (witness_status == WitnessStatus::QUEUED_LOGIC_OPERATION)
    {
        internal_logic_operation_binary(queued_logic_operation.operand_wires, queued_logic_operation.method);
        concatenate();
    }
    if (witness_status == WitnessStatus::IN_BINARY_FORM)
    {
        concatenate();
    }
    else if (witness_status == WitnessStatus::NOT_NORMALIZED || witness_status == WitnessStatus::IN_NATIVE_FORM)
    {
        decompose();
    }
}

template <typename ComposerContext> uint32<ComposerContext>::operator field_t<ComposerContext>()
{
    normalize();
    const auto get_field_element = [ctx = context](const uint32_t w_idx, const uint32_t add_const, const uint32_t mul_const)
    {
        field_t<ComposerContext> target;
        if (w_idx == static_cast<uint32_t>(-1))
        {
            target = field_t<ComposerContext>(ctx, barretenberg::fr::to_montgomery_form({{ add_const, 0, 0, 0 }}));
        }
        else
        {
            target = witness_t<ComposerContext>(ctx, ctx->get_variable(w_idx));
            target.witness_index = w_idx;
            target.additive_constant = barretenberg::fr::to_montgomery_form({{ add_const, 0, 0, 0 }});
            target.multiplicative_constant = barretenberg::fr::to_montgomery_form({{ mul_const, 0, 0, 0 }});
        }
        return target;
    };
    return get_field_element(witness_index, additive_constant, multiplicative_constant);
}

template <typename ComposerContext> void uint32<ComposerContext>::prepare_for_arithmetic_operations() const
{
    if (witness_status == WitnessStatus::QUEUED_LOGIC_OPERATION)
    {
        internal_logic_operation_native(queued_logic_operation.operand_wires, queued_logic_operation.method);
    }
    if (witness_status == WitnessStatus::IN_BINARY_FORM)
    {
        concatenate();
    }
    ASSERT(witness_status == WitnessStatus::OK || witness_status == WitnessStatus::NOT_NORMALIZED ||
           witness_status == WitnessStatus::IN_NATIVE_FORM);
}

template <typename ComposerContext> void uint32<ComposerContext>::prepare_for_logic_operations() const
{
    if (witness_status == WitnessStatus::QUEUED_LOGIC_OPERATION)
    {
        internal_logic_operation_binary(queued_logic_operation.operand_wires, queued_logic_operation.method);
    }
    if (witness_status == WitnessStatus::NOT_NORMALIZED || witness_status == WitnessStatus::IN_NATIVE_FORM)
    {
        decompose();
    }

    ASSERT(witness_status == WitnessStatus::OK || witness_status == WitnessStatus::IN_BINARY_FORM);
}

template <typename ComposerContext> uint32<ComposerContext> uint32<ComposerContext>::operator+(const uint32& other)
{
    prepare_for_arithmetic_operations();
    other.prepare_for_arithmetic_operations();
    ASSERT(context == other.context || (context != nullptr && other.context == nullptr) ||
           (context == nullptr && other.context != nullptr));
    ComposerContext *ctx =  (context == nullptr) ? other.context : context;
    uint32<ComposerContext> result = uint32<ComposerContext>(ctx);
    bool lhs_constant = witness_index == static_cast<uint32_t>(-1);
    bool rhs_constant = other.witness_index == static_cast<uint32_t>(-1);
    if (!lhs_constant && !rhs_constant && (witness_index == other.witness_index))
    {
        result = *this;
        result.multiplicative_constant *= 2;
        result.additive_constant = additive_constant + other.additive_constant;
        result.maximum_value = (maximum_value - additive_constant) + (other.maximum_value - other.additive_constant) + result.additive_constant;
        result.witness_status = WitnessStatus::NOT_NORMALIZED;
    }
    else if (lhs_constant && rhs_constant)
    {
        result.additive_constant = additive_constant + other.additive_constant;
        result.witness_status = WitnessStatus::NOT_NORMALIZED;
        result.maximum_value = result.additive_constant;
        result.decompose();
    }
    else if (!lhs_constant && rhs_constant)
    {
        result = uint32(*this);
        result.additive_constant = additive_constant + other.additive_constant;
        result.maximum_value = (maximum_value - additive_constant) + (other.maximum_value - other.additive_constant) + result.additive_constant;
        result.witness_status = WitnessStatus::NOT_NORMALIZED;
    }
    else if (lhs_constant && !rhs_constant)
    {
        result = uint32(other);
        result.additive_constant = additive_constant + other.additive_constant;
        result.maximum_value = (maximum_value - additive_constant) + (other.maximum_value - other.additive_constant) + result.additive_constant;
        result.witness_status = WitnessStatus::NOT_NORMALIZED;
    }
    else
    {
        result.additive_constant = 0U;
        result.multiplicative_constant = 1U;

        uint32_t qc_32 = additive_constant + other.additive_constant;
        uint32_t ql_32 = multiplicative_constant;
        uint32_t qr_32 = other.multiplicative_constant;

        result.maximum_value = maximum_value + other.maximum_value - additive_constant - other.additive_constant + qc_32;

        barretenberg::fr::field_t q_l =
            barretenberg::fr::to_montgomery_form({ { static_cast<uint64_t>(ql_32), 0, 0, 0 } });
        barretenberg::fr::field_t q_r =
            barretenberg::fr::to_montgomery_form({ { static_cast<uint64_t>(qr_32), 0, 0, 0 } });
        barretenberg::fr::field_t q_c =
            barretenberg::fr::to_montgomery_form({ { static_cast<uint64_t>(qc_32), 0, 0, 0 } });

        barretenberg::fr::field_t T0 = barretenberg::fr::mul(ctx->get_variable(witness_index), q_l);
        barretenberg::fr::field_t T1 = barretenberg::fr::mul(ctx->get_variable(other.witness_index), q_r);

        barretenberg::fr::field_t value = barretenberg::fr::add(barretenberg::fr::add(T0, T1), q_c);
        result.witness_index = result.context->add_variable(value);
        const waffle::add_triple gate_coefficients{
            witness_index, other.witness_index, result.witness_index, q_l, q_r, barretenberg::fr::neg_one(), q_c
        };
        result.context->create_add_gate(gate_coefficients);
        result.witness_status = WitnessStatus::NOT_NORMALIZED;

        if (int_utils::get_msb(result.maximum_value) >= MAXIMUM_BIT_LENGTH)
        {
            result.decompose();
        }
    }
    return result;
}

template <typename ComposerContext> uint32<ComposerContext> uint32<ComposerContext>::operator-(const uint32& other)
{
    prepare_for_arithmetic_operations();
    other.prepare_for_arithmetic_operations();

    ASSERT(context == other.context || (context != nullptr && other.context == nullptr) ||
           (context == nullptr && other.context != nullptr));

    ComposerContext *ctx = (context == nullptr) ? other.context : context;
    uint32<ComposerContext> result = uint32<ComposerContext>(ctx);

    bool lhs_constant = witness_index == static_cast<uint32_t>(-1);
    bool rhs_constant = other.witness_index == static_cast<uint32_t>(-1);

    size_t left_shift = int_utils::get_msb(other.maximum_value) + 1UL;
    int_utils::uint128_t negation_constant = static_cast<int_utils::uint128_t>(1UL) << static_cast<int_utils::uint128_t>(left_shift);

    if (!lhs_constant && !rhs_constant && (witness_index == other.witness_index))
    {
        if (additive_constant == other.additive_constant && multiplicative_constant == other.multiplicative_constant)
        {
            result = uint32<ComposerContext>(result.context, 0);
            result.witness_status = WitnessStatus::NOT_NORMALIZED;
        }
        else
        {
            result = *this;
            result.additive_constant = additive_constant - other.additive_constant;
            result.multiplicative_constant = multiplicative_constant - other.multiplicative_constant;
            result.maximum_value = maximum_value - other.maximum_value;
        }
    }
    else if (lhs_constant && rhs_constant)
    {
        result.additive_constant = additive_constant - other.additive_constant;
        result.maximum_value = result.additive_constant;
        result.witness_status = WitnessStatus::NOT_NORMALIZED;
    }
    else if (!lhs_constant && rhs_constant)
    {
        result = *this;
        result.additive_constant = additive_constant - other.additive_constant;
        result.witness_status = WitnessStatus::NOT_NORMALIZED;
        result.maximum_value = negation_constant + maximum_value - other.additive_constant;
    }
    else if (lhs_constant && !rhs_constant)
    {
        result = other;
        field_t<ComposerContext> normalized = witness_t<ComposerContext>(ctx, ctx->get_variable(other.witness_index));
        normalized.witness_index = other.witness_index;
        normalized.additive_constant = set_bit(normalized.additive_constant, left_shift);
        normalized.additive_constant = barretenberg::fr::add(normalized.additive_constant, {{ additive_constant, 0, 0, 0 }});
        normalized.additive_constant = barretenberg::fr::sub(normalized.additive_constant, {{ other.additive_constant, 0, 0, 0 }});
        normalized.additive_constant = barretenberg::fr::to_montgomery_form(normalized.additive_constant);
    
        normalized.multiplicative_constant = barretenberg::fr::to_montgomery_form({{ other.multiplicative_constant, 0, 0, 0 }});
        normalized.multiplicative_constant = barretenberg::fr::neg(normalized.multiplicative_constant);
        normalized = normalized.normalize();

        result.witness_index = normalized.witness_index;
        result.additive_constant = 0;
        result.multiplicative_constant = 1;
        result.witness_status = WitnessStatus::NOT_NORMALIZED; // TODO: should really rename some of these methods
        result.maximum_value = negation_constant + maximum_value - other.maximum_value;
    }
    else
    {
        result.additive_constant = 0U;
        result.multiplicative_constant = 1U;

        // TODO: replace all of these zero(), one() function calls with constexpr constants
        barretenberg::fr::field_t q_c = set_bit(barretenberg::fr::zero(), left_shift);
        q_c = barretenberg::fr::add(q_c, {{ additive_constant, 0, 0, 0 }});
        q_c = barretenberg::fr::sub(q_c, {{ other.additive_constant, 0, 0, 0 }});
        q_c = barretenberg::fr::to_montgomery_form(q_c);

        barretenberg::fr::field_t q_l = barretenberg::fr::to_montgomery_form({{ multiplicative_constant, 0, 0, 0 }});
        barretenberg::fr::field_t q_r = barretenberg::fr::to_montgomery_form({{ other.multiplicative_constant, 0, 0, 0 }});
        q_r = barretenberg::fr::neg(q_r);

        barretenberg::fr::field_t T0 = barretenberg::fr::mul(q_l, ctx->get_variable(witness_index));
        barretenberg::fr::field_t T1 = barretenberg::fr::mul(q_r, ctx->get_variable(other.witness_index));

        barretenberg::fr::field_t value = barretenberg::fr::add(barretenberg::fr::add(T0, T1), q_c);
        result.witness_index = ctx->add_variable(value);
        const waffle::add_triple gate_coefficients{
            witness_index, other.witness_index, result.witness_index, q_l, q_r, barretenberg::fr::neg_one(), q_c
        };
        ctx->create_add_gate(gate_coefficients);
        result.witness_status = WitnessStatus::NOT_NORMALIZED;
        result.maximum_value = negation_constant + maximum_value + other.maximum_value;
    }
    return result;
}

template <typename ComposerContext> uint32<ComposerContext> uint32<ComposerContext>::operator*(const uint32& other)
{
    prepare_for_arithmetic_operations();
    other.prepare_for_arithmetic_operations();

    ComposerContext *ctx = (context == nullptr) ? other.context : context;
    uint32<ComposerContext> result = uint32<ComposerContext>(ctx);

    bool lhs_constant = witness_index == static_cast<uint32_t>(-1);
    bool rhs_constant = other.witness_index == static_cast<uint32_t>(-1);

    if (lhs_constant && rhs_constant)
    {
        result = *this;
        result.additive_constant = additive_constant * other.additive_constant;
        result.maximum_value = result.additive_constant;
    }
    else if (!lhs_constant && rhs_constant)
    {
        result = (*this);
        result.additive_constant = additive_constant * other.additive_constant;
        result.multiplicative_constant = multiplicative_constant * other.additive_constant;
        result.maximum_value = maximum_value * other.additive_constant;
    }
    else if (lhs_constant && !rhs_constant)
    {
        result = (other);
        result.additive_constant = additive_constant * other.additive_constant;
        result.multiplicative_constant = other.multiplicative_constant * additive_constant;
        result.maximum_value = other.maximum_value * additive_constant;
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

        barretenberg::fr::field_t left = ctx->get_variable(witness_index);
        barretenberg::fr::field_t right = ctx->get_variable(other.witness_index);
        barretenberg::fr::field_t value = barretenberg::fr::mul(left, right); 
        barretenberg::fr::__mul(value, q_m, value);
        barretenberg::fr::__mul(left, q_l, T0);
        barretenberg::fr::__add(value, T0, value);
        barretenberg::fr::__mul(right, q_r, T0);
        barretenberg::fr::__add(value, T0, value);
        barretenberg::fr::__add(value, q_c, value);

        result.witness_index = context->add_variable(value);
        const waffle::poly_triple gate_coefficients{
            witness_index, other.witness_index, result.witness_index, q_m, q_l, q_r, barretenberg::fr::neg_one(), q_c
        };
        context->create_poly_gate(gate_coefficients);
        result.witness_status = WitnessStatus::NOT_NORMALIZED;
        result.maximum_value = maximum_value * other.maximum_value;
        result.decompose();
    }
    return result;
}


// TODO: fix this, need to test and refactor...
template <typename ComposerContext> uint32<ComposerContext> uint32<ComposerContext>::operator/(const uint32& other)
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

    ComposerContext *ctx = (context == nullptr) ? other.context : context;
    uint32<ComposerContext> result(ctx);

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
        if (maximum_value > (1UL << 32UL))
        {
            decompose();
        }
        if (other.maximum_value > (1UL << 32UL))
        {
            other.decompose();
        }
        // (m1.x + a1) = (m2.y + a2) * z
        // m1.x + a1 = m2.y.z + a2.z
        // m2.y.z + a2.z - m1.x - a1 = 0 mod 2^32
        // m2.y.z + a2.z - t1 = 0
        // (uint32 t1) - m1.x - a1 = 0
        // output = first input
        // left = second input
        // right = new witness
        uint32_t numerator_witness = static_cast<uint32_t>(barretenberg::fr::from_montgomery_form(ctx->get_variable(witness_index)).data[0]);
        uint32_t denominator_witness =
            static_cast<uint32_t>(barretenberg::fr::from_montgomery_form(ctx->get_variable(other.witness_index)).data[0]);

        uint32_t numerator_uint = (numerator_witness * (multiplicative_constant)) + additive_constant;
        uint32_t denominator_uint = (denominator_witness * (other.multiplicative_constant)) + other.additive_constant;

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

template <typename ComposerContext> bool_t<ComposerContext> uint32<ComposerContext>::operator<(const uint32& other)
{
    prepare_for_arithmetic_operations();
    other.prepare_for_arithmetic_operations();

    if (maximum_value >= (1UL << 32UL))
    {
        decompose();
    }
    if (other.maximum_value >= (1UL << 32UL))
    {
        decompose();
    }
    if (witness_index == static_cast<uint32_t>(-1) && other.witness_index == static_cast<uint32_t>(-1))
    {
        return bool_t(nullptr, additive_constant < other.additive_constant);
    }

    ComposerContext *ctx = (context == nullptr) ? other.context : nullptr;

    const auto get_field_element = [ctx](const uint32_t w_idx, const uint32_t add_const, const uint32_t mul_const)
    {
        field_t<ComposerContext> target;
        if (w_idx == static_cast<uint32_t>(-1))
        {
            target = field_t<ComposerContext>(ctx, barretenberg::fr::to_montgomery_form({{ add_const, 0, 0, 0 }}));
        }
        else
        {
            target = witness_t<ComposerContext>(ctx, ctx->get_variable(w_idx));
            target.witness_index = w_idx;
            target.additive_constant = barretenberg::fr::to_montgomery_form({{ add_const, 0, 0, 0 }});
            target.multiplicative_constant = barretenberg::fr::to_montgomery_form({{ mul_const, 0, 0, 0 }});
        }
        return target;
    };

    field_t<ComposerContext> left = get_field_element(witness_index, additive_constant, multiplicative_constant);
    field_t<ComposerContext> right = get_field_element(other.witness_index, other.additive_constant, other.multiplicative_constant);

    uint32_t lhs = get_witness_value();
    uint32_t rhs = other.get_witness_value();
    bool predicate_bool = lhs < rhs;
    bool_t<ComposerContext> predicate = witness_t<ComposerContext>(ctx, predicate_bool);

    field_t<ComposerContext> difference = left - right;
    uint32<ComposerContext> delta(field_t<ComposerContext>((field_t<ComposerContext>(predicate) * 2 - 1) * difference));
    delta.decompose();
    return predicate;
}

template <typename ComposerContext> bool_t<ComposerContext> uint32<ComposerContext>::operator<=(const uint32& other)
{
    prepare_for_arithmetic_operations();
    other.prepare_for_arithmetic_operations();

    // this <= other === this < (other + 1)
    uint32<ComposerContext> rhs = (other);
    rhs = rhs + uint32<ComposerContext>(context, 1U);
    return operator<(rhs);
}

template <typename ComposerContext> bool_t<ComposerContext> uint32<ComposerContext>::operator>(const uint32& other)
{
    return (other < *this);
}

template <typename ComposerContext> bool_t<ComposerContext> uint32<ComposerContext>::operator>=(const uint32& other)
{
    return (other <= *this);
}

// TODO refactor, this is broken!
template <typename ComposerContext> bool_t<ComposerContext> uint32<ComposerContext>::operator!=(const uint32& other)
{
    prepare_for_arithmetic_operations();
    other.prepare_for_arithmetic_operations();

    if (maximum_value >= (1UL << 32UL))
    {
        decompose();
    }
    if (other.maximum_value >= (1UL << 32UL))
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

template <typename ComposerContext> bool_t<ComposerContext> uint32<ComposerContext>::operator==(const uint32& other)
{
    return !(operator!=(other));
}

template <typename ComposerContext> uint32<ComposerContext> uint32<ComposerContext>::operator&(const uint32& other)
{
    return internal_logic_operation(other, &internal_and);
}

template <typename ComposerContext> uint32<ComposerContext> uint32<ComposerContext>::operator^(const uint32& other)
{
    return internal_logic_operation(other, &internal_xor);
}

template <typename ComposerContext> uint32<ComposerContext> uint32<ComposerContext>::operator|(const uint32& other)
{
    return internal_logic_operation(other, &internal_or);
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
    result.additive_constant = 0;
    result.multiplicative_constant = 1;
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
    result.additive_constant = 0;
    result.multiplicative_constant = 1;
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

template <typename ComposerContext>
bool_t<ComposerContext> uint32<ComposerContext>::at(const size_t bit_index) const
{
    ASSERT(bit_index < 32);
    prepare_for_logic_operations();
    return field_wires[bit_index % 32];
}

} // namespace stdlib
} // namespace plonk
#endif