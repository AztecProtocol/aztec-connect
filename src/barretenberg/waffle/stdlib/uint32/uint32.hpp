#pragma once

#include <array>
#include <numeric>
#include <vector>

#include "../../../assert.hpp"
#include "../../../curves/bn254/fr.hpp"

#include "../bool/bool.hpp"
#include "../common.hpp"
#include "../field/field.hpp"
#include "../int_utils.hpp"

namespace plonk
{
namespace stdlib
{
template <typename ComposerContext> class uint32
{
  public:
    uint32();
    uint32(const uint32_t other);
    uint32(ComposerContext* parent_context);
    uint32(const witness_t<ComposerContext>& value);
    uint32(ComposerContext* parent_context, const uint32_t value);
    uint32(ComposerContext* parent_context, const std::array<bool_t<ComposerContext>, 32>& wires);

    uint32(const field_t<ComposerContext>& other);
    uint32(const uint32& other);

    operator field_t<ComposerContext>();

    uint32& operator=(const uint32& other);

    uint32 operator+(const uint32& other);
    uint32 operator-(const uint32& other);
    uint32 operator*(const uint32& other);
    uint32 operator/(const uint32& other);
    uint32 operator%(const uint32& other);
    uint32 operator&(const uint32& other);
    uint32 operator|(const uint32& other);
    uint32 operator^(const uint32& other);
    uint32 operator~();

    uint32 operator>>(const uint32_t const_shift);
    uint32 operator<<(const uint32_t const_shift);

    uint32 ror(const uint32_t const_rotation);
    uint32 rol(const uint32_t const_rotation);

    bool_t<ComposerContext> operator>(const uint32& other);
    bool_t<ComposerContext> operator<(const uint32& other);
    bool_t<ComposerContext> operator>=(const uint32& other);
    bool_t<ComposerContext> operator<=(const uint32& other);
    bool_t<ComposerContext> operator==(const uint32& other);
    bool_t<ComposerContext> operator!=(const uint32& other);

    uint32 operator++()
    {
        return operator+(uint32(context, barretenberg::fr::one));
    };
    uint32 operator--()
    {
        return operator-(uint32(context, barretenberg::fr::one));
    };
    uint32 operator+=(const uint32& other)
    {
        *this = operator+(other);
    };
    uint32 operator-=(const uint32& other)
    {
        *this = operator-(other);
    };
    uint32 operator*=(const uint32& other)
    {
        *this = operator*(other);
    };
    uint32 operator/=(const uint32& other)
    {
        *this = operator/(other);
    };
    uint32 operator%=(const uint32& other)
    {
        *this = operator%(other);
    };

    uint32 operator&=(const uint32& other)
    {
        *this = operator&(other);
    };
    uint32 operator^=(const uint32& other)
    {
        *this = operator^(other);
    };
    uint32 operator|=(const uint32& other)
    {
        *this = operator|(other);
    };

    uint32 operator>>=(const uint32& other)
    {
        *this = operator>>(other);
    };
    uint32 operator<<=(const uint32& other)
    {
        *this = operator<<(other);
    };

    uint32_t get_witness_index()
    {
        normalize();
        return witness_index;
    }

    uint32_t get_value()
    {
        if (context == nullptr)
        {
            return additive_constant;
        }
        if (witness_status == IN_BINARY_FORM)
        {
            return std::accumulate(bool_wires.rbegin(), bool_wires.rend(), 0U, [](auto acc, auto wire) {
                return (acc + acc + wire.get_value());
            });
        }
        uint32_t base =
            static_cast<uint32_t>(barretenberg::fr::from_montgomery_form(context->get_variable(witness_index)).data[0]);
        return (base * multiplicative_constant + additive_constant);
    }

    uint32_t get_additive_constant() const
    {
        return additive_constant;
    }

    uint32_t get_multiplicative_constant() const
    {
        return multiplicative_constant;
    }

    ComposerContext* get_context() const
    {
        return context;
    }

    bool_t<ComposerContext> at(const size_t bit_index) const;

  private:
    enum WitnessStatus
    {
        OK,                    // has both valid binary wires, and a valid native representation
        NOT_NORMALIZED,        // has a native representation, that needs to be normalised (is > 2^32)
        IN_NATIVE_FORM,        // witness is a valid uint32, but has no binary wires
        IN_BINARY_FORM,        // only has valid binary wires, but no witness that is a fully constructed uint32
        QUEUED_LOGIC_OPERATION // we have queued up a logic operation. We can efficiently output IN_NATIVE_FORM or
                               // IN_BINARY_FORM, but not both. So we queue up the logic operation until we know whether
                               // the next operation will be native or binary
    };

    struct LogicOperation
    {
        bool_t<ComposerContext> operand_wires[32];
        bool_t<ComposerContext> (*method)(bool_t<ComposerContext>, bool_t<ComposerContext>) = nullptr;
    };

    void prepare_for_arithmetic_operations() const;
    void prepare_for_logic_operations() const;

    // TODO: change the naming scheme for this
    // 'concatenate' will use + gates to create a witness out of boolean 'field wires'
    // 'decompose' will use + and bool gates to create boolean 'field wires' from a witness
    void concatenate() const;
    void decompose() const;
    void normalize(); // ensures uint32 both has valid binary wires and a valid witness

    uint32<ComposerContext> internal_logic_operation(const uint32<ComposerContext>& right,
                                                     bool_t<ComposerContext> (*wire_logic_op)(bool_t<ComposerContext>,
                                                                                              bool_t<ComposerContext>));

    void internal_logic_operation_binary(const bool_t<ComposerContext> operand_wires[32],
                                         bool_t<ComposerContext> (*wire_logic_op)(bool_t<ComposerContext>,
                                                                                  bool_t<ComposerContext>)) const;

    void internal_logic_operation_native(const bool_t<ComposerContext> operand_wires[32],
                                         bool_t<ComposerContext> (*wire_logic_op)(bool_t<ComposerContext>,
                                                                                  bool_t<ComposerContext>)) const;

    uint32 ternary_operator(const bool_t<ComposerContext>& predicate, const uint32& lhs, const uint32& rhs);

    ComposerContext* context;

    mutable uint32_t witness_index;
    mutable uint32_t additive_constant;
    mutable uint32_t multiplicative_constant;
    mutable WitnessStatus witness_status;
    mutable std::array<bool_t<ComposerContext>, 32> bool_wires;
    LogicOperation queued_logic_operation;

    // Tracks the maximum value that this uint32 can potentially represent. We want to be able to use 'lazy reduction'
    // techniques, whereby we only constrain the value of this object to be in the range [0, 2^{32}] only when
    // necessary. e.g. for comparisons, or logic operations. For example, consider the situation where three addition
    // operations are chained together. Instead of performing a range check on each addition sum (via calling
    // 'decompose'), we can perform a single range check on the result of the three additions. However, we now need to
    // know how many 'bits' this overloaded variable can contain (33). Which is why we have a maximum value field, so
    // that we know precisely how many bits are required to represent a given overloaded uint32
    mutable int_utils::uint128_t maximum_value;

    static constexpr size_t MAXIMUM_BIT_LENGTH = 65UL;
};
} // namespace stdlib
} // namespace plonk

#include "./uint32.tcc"
