#pragma once

#include <numeric>
#include <vector>

#include "../../../assert.hpp"
#include "../../../curves/bn254/fr.hpp"

#include "../bool/bool.hpp"
#include "../common.hpp"
#include "../field/field.hpp"
#include "../int_utils.hpp"

namespace plonk {
namespace stdlib {

template <typename ComposerContext> class uint {
  public:
    // explicit uint(size_t width);
    uint(size_t width, const uint64_t other);
    uint(size_t width, ComposerContext* parent_context);
    uint(size_t width, const witness_t<ComposerContext>& value);
    uint(size_t width, ComposerContext* parent_context, const uint64_t value);
    uint(size_t width, const field_t<ComposerContext>& other);
    uint(ComposerContext* parent_context, const std::vector<bool_t<ComposerContext>>& wires);
    uint(const uint& other);

    uint(char v)
        : uint(8, static_cast<uint64_t>(v))
    {}

    uint(uint16_t v)
        : uint(16, static_cast<uint64_t>(v))
    {}

    uint(uint32_t v)
        : uint(32, static_cast<uint64_t>(v))
    {}

    uint(uint64_t v)
        : uint(64, static_cast<uint64_t>(v))
    {}

    // uint(uint&& other);

    //~uint(){};

    operator field_t<ComposerContext>();

    uint& operator=(const uint& other);

    uint operator+(const uint& other);
    uint operator-(const uint& other);
    uint operator*(const uint& other);
    uint operator/(const uint& other);
    uint operator%(const uint& other);
    uint operator&(const uint& other);
    uint operator|(const uint& other);
    uint operator^(const uint& other);
    uint operator~();

    uint operator>>(const uint64_t const_shift);
    uint operator<<(const uint64_t const_shift);

    uint ror(const uint64_t const_rotation);
    uint rol(const uint64_t const_rotation);

    bool_t<ComposerContext> operator>(const uint& other) const;
    bool_t<ComposerContext> operator<(const uint& other) const;
    bool_t<ComposerContext> operator>=(const uint& other) const;
    bool_t<ComposerContext> operator<=(const uint& other) const;
    bool_t<ComposerContext> operator==(const uint& other) const;
    bool_t<ComposerContext> operator!=(const uint& other) const;

    uint operator++() { return operator+(uint(context, barretenberg::fr::one)); };
    uint operator--() { return operator-(uint(context, barretenberg::fr::one)); };
    uint operator+=(const uint& other) { *this = operator+(other); };
    uint operator-=(const uint& other) { *this = operator-(other); };
    uint operator*=(const uint& other) { *this = operator*(other); };
    uint operator/=(const uint& other) { *this = operator/(other); };
    uint operator%=(const uint& other) { *this = operator%(other); };

    uint operator&=(const uint& other) { *this = operator&(other); };
    uint operator^=(const uint& other) { *this = operator^(other); };
    uint operator|=(const uint& other) { *this = operator|(other); };

    uint operator>>=(const uint& other) { *this = operator>>(other); };
    uint operator<<=(const uint& other) { *this = operator<<(other); };

    bool is_constant() const { return witness_index == static_cast<uint32_t>(-1); }

    uint32_t get_witness_index()
    {
        normalize();
        return witness_index;
    }

    uint64_t get_value() const
    {
        if (context == nullptr) {
            return additive_constant;
        }
        if (witness_status == IN_BINARY_FORM) {
            return std::accumulate(bool_wires.rbegin(), bool_wires.rend(), 0U, [](auto acc, auto wire) {
                return (acc + acc + wire.get_value());
            });
        }
        normalize();
        if (is_constant()) {
            return (multiplicative_constant * additive_constant);
        }
        uint64_t base =
            static_cast<uint64_t>(barretenberg::fr::from_montgomery_form(context->get_variable(witness_index)).data[0]);
        return (base * multiplicative_constant + additive_constant);
    }

    uint64_t get_additive_constant() const { return additive_constant; }

    uint64_t get_multiplicative_constant() const { return multiplicative_constant; }

    ComposerContext* get_context() const { return context; }

    bool_t<ComposerContext> at(const size_t bit_index) const;

    void set_wire(bool_t<ComposerContext> const& bit, size_t bit_index);

    size_t width() const { return bool_wires.size(); }

  private:
    enum WitnessStatus {
        OK,                    // has both valid binary wires, and a valid native representation
        NOT_NORMALIZED,        // has a native representation, that needs to be normalised (is > 2^32)
        IN_NATIVE_FORM,        // witness is a valid uint, but has no binary wires
        IN_BINARY_FORM,        // only has valid binary wires, but no witness that is a fully constructed uint
        QUEUED_LOGIC_OPERATION // we have queued up a logic operation. We can efficiently output IN_NATIVE_FORM or
                               // IN_BINARY_FORM, but not both. So we queue up the logic operation until we know whether
                               // the next operation will be native or binary
    };

    struct LogicOperation {
        LogicOperation(size_t width)
            : operand_wires(width)
        {}
        std::vector<bool_t<ComposerContext>> operand_wires;
        bool_t<ComposerContext> (*method)(bool_t<ComposerContext>, bool_t<ComposerContext>) = nullptr;
    };

    void prepare_for_arithmetic_operations() const;
    void prepare_for_logic_operations() const;

    // TODO: change the naming scheme for this
    // 'concatenate' will use + gates to create a witness out of boolean 'field wires'
    // 'decompose' will use + and bool gates to create boolean 'field wires' from a witness
    void concatenate() const;
    void decompose() const;
    void normalize() const; // ensures uint both has valid binary wires and a valid witness

    uint<ComposerContext> internal_logic_operation(
        const uint<ComposerContext>& right,
        bool_t<ComposerContext> (*wire_logic_op)(bool_t<ComposerContext>, bool_t<ComposerContext>)) const;

    void internal_logic_operation_binary(std::vector<bool_t<ComposerContext>> const& operand_wires,
                                         bool_t<ComposerContext> (*wire_logic_op)(bool_t<ComposerContext>,
                                                                                  bool_t<ComposerContext>)) const;

    void internal_logic_operation_native(std::vector<bool_t<ComposerContext>> const& operand_wires,
                                         bool_t<ComposerContext> (*wire_logic_op)(bool_t<ComposerContext>,
                                                                                  bool_t<ComposerContext>)) const;

    uint ternary_operator(const bool_t<ComposerContext>& predicate, const uint& lhs, const uint& rhs);

    ComposerContext* context;

    mutable uint32_t witness_index;
    mutable uint64_t additive_constant;
    mutable uint64_t multiplicative_constant;
    mutable WitnessStatus witness_status;
    mutable std::vector<bool_t<ComposerContext>> bool_wires;
    LogicOperation queued_logic_operation;

    // Tracks the maximum value that this uint can potentially represent. We want to be able to use 'lazy reduction'
    // techniques, whereby we only constrain the value of this object to be in the range [0, 2^{32}] only when
    // necessary. e.g. for comparisons, or logic operations. For example, consider the situation where three addition
    // operations are chained together. Instead of performing a range check on each addition sum (via calling
    // 'decompose'), we can perform a single range check on the result of the three additions. However, we now need to
    // know how many 'bits' this overloaded variable can contain (33). Which is why we have a maximum value field, so
    // that we know precisely how many bits are required to represent a given overloaded uint
    mutable int_utils::uint128_t maximum_value;

    static constexpr size_t MAXIMUM_BIT_LENGTH = 65UL;
};

template <typename T> inline std::ostream& operator<<(std::ostream& os, uint<T> const& v)
{
    return os << v.get_value();
}

} // namespace stdlib
} // namespace plonk

#include "./uint.tcc"
