#pragma once
#include "../uint/uint.hpp"

namespace plonk {
namespace stdlib {

template <typename ComposerContext> class uint32 : public uint<ComposerContext> {
  public:
    uint32()
        : uint<ComposerContext>(32, static_cast<uint64_t>(0))
    {}

    uint32(const uint32_t other)
        : uint<ComposerContext>(32, other)
    {}

    uint32(ComposerContext* parent_context)
        : uint<ComposerContext>(32, parent_context)
    {}

    uint32(const witness_t<ComposerContext>& value)
        : uint<ComposerContext>(32, value)
    {}

    uint32(ComposerContext* parent_context, const uint32_t value)
        : uint<ComposerContext>(32, parent_context, value)
    {}

    uint32(ComposerContext* parent_context, const std::array<bool_t<ComposerContext>, 32>& wires)
        : uint<ComposerContext>(parent_context, std::vector<bool_t<ComposerContext>>(wires.begin(), wires.end()))
    {}

    uint32(const field_t<ComposerContext>& other)
        : uint<ComposerContext>(32, other)
    {}

    uint32(const uint<ComposerContext>& other)
        : uint<ComposerContext>(other)
    {}

    uint32& operator=(const uint32& other)
    {
        uint<ComposerContext>::operator=(other);
        return *this;
    }

    uint32 operator+(const uint32& other) { return uint<ComposerContext>::operator+(other); }
    uint32 operator-(const uint32& other) { return uint<ComposerContext>::operator-(other); };
    uint32 operator*(const uint32& other) { return uint<ComposerContext>::operator*(other); };
    uint32 operator/(const uint32& other) { return uint<ComposerContext>::operator/(other); };
    uint32 operator%(const uint32& other) { return uint<ComposerContext>::operator%(other); };
    uint32 operator&(const uint32& other) { return uint<ComposerContext>::operator&(other); };
    uint32 operator|(const uint32& other) { return uint<ComposerContext>::operator|(other); };
    uint32 operator^(const uint32& other) { return uint<ComposerContext>::operator^(other); };
    uint32 operator~() { return uint<ComposerContext>::operator~(); };

    uint32 operator>>(const uint32_t const_shift) { return uint<ComposerContext>::operator>>(const_shift); };
    uint32 operator<<(const uint32_t const_shift) { return uint<ComposerContext>::operator<<(const_shift); };

    uint32 ror(const uint32_t const_rotation) { return uint<ComposerContext>::ror(const_rotation); };
    uint32 rol(const uint32_t const_rotation) { return uint<ComposerContext>::rol(const_rotation); };

    /*
        uint32 operator++();
        uint32 operator--();
        uint32 operator+=(const uint32& other) { *this = operator+(other); };
        uint32 operator-=(const uint32& other) { *this = operator-(other); };
        uint32 operator*=(const uint32& other) { *this = operator*(other); };
        uint32 operator/=(const uint32& other) { *this = operator/(other); };
        uint32 operator%=(const uint32& other) { *this = operator%(other); };

        uint32 operator&=(const uint32& other) { *this = operator&(other); };
        uint32 operator^=(const uint32& other) { *this = operator^(other); };
        uint32 operator|=(const uint32& other) { *this = operator|(other); };

        uint32 operator>>=(const uint32& other) { *this = operator>>(other); };
        uint32 operator<<=(const uint32& other) { *this = operator<<(other); };
    */
    uint32_t get_value() const { return static_cast<uint32_t>(uint<ComposerContext>::get_value()); }
};

} // namespace stdlib
} // namespace plonk
