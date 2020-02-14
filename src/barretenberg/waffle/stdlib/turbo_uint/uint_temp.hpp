#pragma once

#include <vector>
#include <iostream>

#include "../../../uint256/uint256.hpp"
#include "../bool/bool.hpp"
#include "../byte_array/byte_array.hpp"
#include "../common.hpp"
#include "../int_utils.hpp"

namespace waffle
{
    class TurboComposer;
}

namespace plonk {
namespace stdlib {

template <typename ComposerContext> class field_t;

template <typename ComposerContext, size_t num_bits> class uint {
  public:
    // explicit uint(size_t width);
    
    uint(const uint64_t other);
    uint(ComposerContext* parent_context);
    uint(const witness_t<ComposerContext>& value);
    uint(ComposerContext* parent_context, const uint64_t value);
    uint(const field_t<ComposerContext>& other);
    uint(ComposerContext* parent_context, const std::vector<bool_t<ComposerContext>>& wires);
    uint(const uint& other);
    // uint(const byte_array<ComposerContext>& other);

    uint(const uint8_t v);
    uint(const char v);
    uint(const uint16_t v);
    uint(const uint32_t v);
    uint(const uint64_t v);
    uint(const uint256_t v);
    uint(uint&& other);

    //~uint(){};

    // operator byte_array<ComposerContext>();

    operator field_t<ComposerContext>();

    uint& operator=(const uint& other);

    uint operator+(const uint& other) const;
    uint operator-(const uint& other) const;
    uint operator*(const uint& other) const;
    uint operator/(const uint& other) const;
    uint operator%(const uint& other) const;
    uint operator&(const uint& other) const;
    uint operator|(const uint& other) const;
    uint operator^(const uint& other) const;
    uint operator~() const;

    uint operator>>(const uint64_t const_shift) const;
    uint operator<<(const uint64_t const_shift) const;

    uint ror(const uint64_t const_rotation) const;
    uint rol(const uint64_t const_rotation) const;

    bool_t<ComposerContext> operator>(const uint& other) const;
    bool_t<ComposerContext> operator<(const uint& other) const;
    bool_t<ComposerContext> operator>=(const uint& other) const;
    bool_t<ComposerContext> operator<=(const uint& other) const;
    bool_t<ComposerContext> operator==(const uint& other) const;
    bool_t<ComposerContext> operator!=(const uint& other) const;

    uint operator++() { return operator+(uint(width(), context, 1)); };
    uint operator--() { return operator-(uint(width(), context, 1)); };
    uint operator+=(const uint& other) { *this = operator+(other); return *this; };
    uint operator-=(const uint& other) { *this = operator-(other); return *this; };
    uint operator*=(const uint& other) { *this = operator*(other); return *this; };
    uint operator/=(const uint& other) { *this = operator/(other); return *this; };
    uint operator%=(const uint& other) { *this = operator%(other); return *this; };

    uint operator&=(const uint& other) { *this = operator&(other); return *this; };
    uint operator^=(const uint& other) { *this = operator^(other); return *this; };
    uint operator|=(const uint& other) { *this = operator|(other); return *this; };

    uint operator>>=(const uint64_t const_shift) { *this = operator>>(const_shift); return *this; };
    uint operator<<=(const uint64_t const_shift) { *this = operator<<(const_shift); return *this; };

    bool is_constant() const { return witness_index == static_cast<uint32_t>(-1); }

    uint32_t get_witness_index() const
    {
        normalize();
        return witness_index;
    }

    uint256_t get_value() const;

    uint256_t get_additive_constant() const { return additive_constant; }

    ComposerContext* get_context() const { return context; }

    bool_t<ComposerContext> at(const size_t bit_index) const;

    void set_wire(bool_t<ComposerContext> const& bit, size_t bit_index);

    size_t width() const { return bool_wires.size(); }
  protected:
     ComposerContext* context;

    enum WitnessStatus {
        OK,                       // witness index points to a valid <w> bit unsigned integer (or is const)
        NOT_NORMALIZED,           // native value is up to 2 bits greater than target bit width
        WEAKLY_NORMALIZED,        // native value will be in range for honest provers. Sufficient to use as 
                                  // input into a constraint that requires range-constraint integers for correctness
                                  // (e.g. our logic constraints)
        QUEUED_ROTATE_OPERATION   // we have queued up a rotate operation. If we chain '+ >>>' operations together,
                                  // our uint will not have valid accumulators after the '+' operation. We defer
                                  // execution of the rotate operation, as any subsequent operation that performs an
                                  // implicit quaternary reduction (e.g. & ^) will allow us to retro-actively validate the 
                                  // bit rotation
    };

    void decompose() const;
    void weak_normalize() const; // ensures that the uint *can* be within range
    void normalize() const; // ensures uint witness is constraint within the valid range


    uint ternary_operator(const bool_t<ComposerContext>& predicate, const uint& lhs, const uint& rhs);

    mutable uint32_t witness_index;
    mutable uint256_t additive_constant;
    mutable WitnessStatus witness_status;
    mutable std::vector<uint32_t> accumulators;
    mutable std::vector<uint64_t> queued_rotations;

    // Tracks the maximum value that this uint can potentially represent. We want to be able to use 'lazy reduction'
    // techniques, whereby we only constrain the value of this object to be in the range [0, 2^{32}] only when
    // necessary. e.g. for comparisons, or logic operations. For example, consider the situation where three addition
    // operations are chained together. Instead of performing a range check on each addition sum (via calling
    // 'decompose'), we can perform a single range check on the result of the three additions. However, we now need to
    // know how many 'bits' this overloaded variable can contain (33). Which is why we have a maximum value field, so
    // that we know precisely how many bits are required to represent a given overloaded uint
    mutable uint256_t maximum_value;

    constexpr uint256_t mask = (uint256_t(1) << uint256_t(width)) - uint256_t(1);
    constexpr uint256_t negation_constant = (uint256_t(1) << uint256_t(width + 1))
    static constexpr size_t MAXIMUM_BIT_LENGTH = 120UL;
};

template <typename T> inline std::ostream& operator<<(std::ostream& os, uint<T> const& v)
{
    return os << v.get_value();
}

extern template class uint<waffle::TurboComposer, 8>;
extern template class uint<waffle::TurboComposer, 16>;
extern template class uint<waffle::TurboComposer, 32>;
extern template class uint<waffle::TurboComposer, 64>;

} // namespace stdlib
} // namespace plonk
