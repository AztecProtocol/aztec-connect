#pragma once
#include "../uint/uint.hpp"

namespace plonk {
namespace stdlib {

// template <typename ComposerContext, typename Native> class uintW : public uint<ComposerContext> {
//   public:
//     uintW()
//         : uint<ComposerContext>(sizeof(Native) * 8, static_cast<uint64_t>(0))
//     {}

//     uintW(Native other)
//         : uint<ComposerContext>(sizeof(Native) * 8, other)
//     {}

//     uintW(ComposerContext* parent_context)
//         : uint<ComposerContext>(sizeof(Native) * 8, parent_context)
//     {}

//     uintW(const witness_t<ComposerContext>& value)
//         : uint<ComposerContext>(sizeof(Native) * 8, value)
//     {}

//     uintW(ComposerContext* parent_context, const Native value)
//         : uint<ComposerContext>(sizeof(Native) * 8, parent_context, value)
//     {}

//     uintW(ComposerContext* parent_context, const std::array<bool_t<ComposerContext>, sizeof(Native) * 8>& wires)
//         : uint<ComposerContext>(parent_context, std::vector<bool_t<ComposerContext>>(wires.begin(), wires.end()))
//     {}

//     uintW(const field_t<ComposerContext>& other)
//         : uint<ComposerContext>(sizeof(Native) * 8, other)
//     {}

//     uintW(const uint<ComposerContext>& other)
//         : uint<ComposerContext>(other)
//     {}

//     uintW(const byte_array<ComposerContext>& other)
//         : uint<ComposerContext>(other)
//     {}

//     uintW& operator=(const uintW& other)
//     {
//         uint<ComposerContext>::operator=(other);
//         return *this;
//     }

//     uintW operator+(const uintW& other) { return uint<ComposerContext>::operator+(other); }
//     uintW operator-(const uintW& other) { return uint<ComposerContext>::operator-(other); };
//     uintW operator*(const uintW& other) { return uint<ComposerContext>::operator*(other); };
//     uintW operator/(const uintW& other) { return uint<ComposerContext>::operator/(other); };
//     uintW operator%(const uintW& other) { return uint<ComposerContext>::operator%(other); };
//     uintW operator&(const uintW& other) { return uint<ComposerContext>::operator&(other); };
//     uintW operator|(const uintW& other) { return uint<ComposerContext>::operator|(other); };
//     uintW operator^(const uintW& other) { return uint<ComposerContext>::operator^(other); };
//     uintW operator~() { return uint<ComposerContext>::operator~(); };

//     uintW operator>>(const uint32_t const_shift) { return uint<ComposerContext>::operator>>(const_shift); };
//     uintW operator<<(const uint32_t const_shift) { return uint<ComposerContext>::operator<<(const_shift); };

//     uintW ror(const uint32_t const_rotation) { return uint<ComposerContext>::ror(const_rotation); };
//     uintW rol(const uint32_t const_rotation) { return uint<ComposerContext>::rol(const_rotation); };

//     /*
//         uint32 operator++();
//         uint32 operator--();
//         uint32 operator+=(const uint32& other) { *this = operator+(other); };
//         uint32 operator-=(const uint32& other) { *this = operator-(other); };
//         uint32 operator*=(const uint32& other) { *this = operator*(other); };
//         uint32 operator/=(const uint32& other) { *this = operator/(other); };
//         uint32 operator%=(const uint32& other) { *this = operator%(other); };

//         uint32 operator&=(const uint32& other) { *this = operator&(other); };
//         uint32 operator^=(const uint32& other) { *this = operator^(other); };
//         uint32 operator|=(const uint32& other) { *this = operator|(other); };

//         uint32 operator>>=(const uint32& other) { *this = operator>>(other); };
//         uint32 operator<<=(const uint32& other) { *this = operator<<(other); };
//     */
//     Native get_value() const { return static_cast<Native>(uint<ComposerContext>::get_value()); }
// };

template <typename ComposerContext> using uint64 = uint<ComposerContext, uint64_t>;

template <typename ComposerContext> using uint32 = uint<ComposerContext, uint32_t>;

template <typename ComposerContext> using uint16 = uint<ComposerContext, uint16_t>;

template <typename ComposerContext> using uint8 = uint<ComposerContext, uint8_t>;

} // namespace stdlib
} // namespace plonk
