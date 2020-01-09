#pragma once

#include <cstdint>
#include <unistd.h>

#include "../assert.hpp"

namespace barretenberg {
namespace internal {
__extension__ using uint128_t = unsigned __int128;
constexpr uint128_t lo_mask = 0xffffffffffffffffUL;

#if defined(__SIZEOF_INT128__) && !defined(__wasm__)
#else
inline void mul_wide(uint64_t a, uint64_t b, uint64_t& out_lo, uint64_t& out_hi) noexcept
{
    const uint64_t a_lo = a & 0xffffffffULL;
    const uint64_t a_hi = a >> 32ULL;
    const uint64_t b_lo = b & 0xffffffffULL;
    const uint64_t b_hi = b >> 32ULL;

    const uint64_t lo_lo = a_lo * b_lo;
    const uint64_t hi_lo = a_hi * b_lo;
    const uint64_t lo_hi = a_lo * b_hi;
    const uint64_t hi_hi = a_hi * b_hi;

    const uint64_t cross = (lo_lo >> 32ULL) + (hi_lo & 0xffffffffULL) + lo_hi;

    out_lo = (cross << 32ULL) | (lo_lo & 0xffffffffULL);
    out_hi = (hi_lo >> 32ULL) + (cross >> 32ULL) + hi_hi;
}
#endif

inline void mac(const uint64_t a,
                const uint64_t b,
                const uint64_t c,
                const uint64_t carry_in,
                uint64_t& r,
                uint64_t& carry_out) noexcept
{
#if defined(__SIZEOF_INT128__) && !defined(__wasm__)
    uint128_t res = (uint128_t)a + ((uint128_t)b * (uint128_t)c) + (uint128_t)carry_in;
    carry_out = (uint64_t)(res >> 64);
    r = (uint64_t)(res & lo_mask);
#else
    mul_wide(b, c, r, carry_out);
    r = r + a;
    const uint64_t overflow_c = (r < a);
    r = r + carry_in;
    const uint64_t overflow_carry = (r < carry_in);
    carry_out += (overflow_c + overflow_carry);
#endif
}

// compute a + b + carry, returning the carry
inline void addc(const uint64_t a, const uint64_t b, const uint64_t carry_in, uint64_t& r, uint64_t& carry_out) noexcept
{
#if defined(__SIZEOF_INT128__) && !defined(__wasm__)
    uint128_t res = (uint128_t)a + (uint128_t)b + (uint128_t)carry_in;
    carry_out = (uint64_t)(res >> 64);
    r = (uint64_t)(res & lo_mask);
#else
    r = a + b;
    uint64_t carry_temp = r < a;
    r += carry_in;
    carry_out = carry_temp + (r < carry_in);
#endif
}

// compute a - (b + borrow), returning result and updated borrow
inline void sbb(
    const uint64_t a, const uint64_t b, const uint64_t borrow_in, uint64_t& r, uint64_t& borrow_out) noexcept
{
#if defined(__SIZEOF_INT128__) && !defined(__wasm__)
    uint128_t res = (uint128_t)a - ((uint128_t)b + (uint128_t)(borrow_in >> 63));
    borrow_out = (uint64_t)(res >> 64);
    r = (uint64_t)(res & lo_mask);
#else
    uint64_t t_1 = a - (borrow_in >> 63ULL);
    uint64_t borrow_temp_1 = t_1 > a;
    uint64_t t_2 = t_1 - b;
    uint64_t borrow_temp_2 = t_2 > t_1;

    r = t_2;
    borrow_out = 0ULL - (borrow_temp_1 | borrow_temp_2);
    // uint64_t borrow_temp_2 = r > a;
#endif
}

template <typename FieldParams>
inline void subtract(const typename field<FieldParams>::field_t& a,
                     const typename field<FieldParams>::field_t& b,
                     typename field<FieldParams>::field_t& r) noexcept
{
    uint64_t borrow = 0;
    uint64_t carry = 0;

    sbb(a.data[0], b.data[0], 0, r.data[0], borrow);
    sbb(a.data[1], b.data[1], borrow, r.data[1], borrow);
    sbb(a.data[2], b.data[2], borrow, r.data[2], borrow);
    sbb(a.data[3], b.data[3], borrow, r.data[3], borrow);
    addc(r.data[0], FieldParams::modulus_0 & borrow, 0, r.data[0], carry);
    addc(r.data[1], FieldParams::modulus_1 & borrow, carry, r.data[1], carry);
    addc(r.data[2], FieldParams::modulus_2 & borrow, carry, r.data[2], carry);
    addc(r.data[3], FieldParams::modulus_3 & borrow, carry, r.data[3], carry);
}

template <typename FieldParams>
inline void subtract_coarse(const typename field<FieldParams>::field_t& a,
                            const typename field<FieldParams>::field_t& b,
                            typename field<FieldParams>::field_t& r) noexcept
{
    uint64_t borrow = 0;
    uint64_t carry = 0;

    sbb(a.data[0], b.data[0], 0, r.data[0], borrow);
    sbb(a.data[1], b.data[1], borrow, r.data[1], borrow);
    sbb(a.data[2], b.data[2], borrow, r.data[2], borrow);
    sbb(a.data[3], b.data[3], borrow, r.data[3], borrow);
    addc(r.data[0], FieldParams::twice_modulus_0 & borrow, 0, r.data[0], carry);
    addc(r.data[1], FieldParams::twice_modulus_1 & borrow, carry, r.data[1], carry);
    addc(r.data[2], FieldParams::twice_modulus_2 & borrow, carry, r.data[2], carry);
    addc(r.data[3], FieldParams::twice_modulus_3 & borrow, carry, r.data[3], carry);
}

template <typename FieldParams>
void montgomery_reduce(typename field<FieldParams>::field_wide_t& r, typename field<FieldParams>::field_t& out) noexcept
{
    uint64_t carry = 0;
    uint64_t carry_2 = 0;
    uint64_t stub = 0;
    uint64_t k = r.data[0] * FieldParams::r_inv;
    mac(r.data[0], k, FieldParams::modulus_0, 0, stub, carry);
    mac(r.data[1], k, FieldParams::modulus_1, carry, r.data[1], carry);
    mac(r.data[2], k, FieldParams::modulus_2, carry, r.data[2], carry);
    mac(r.data[3], k, FieldParams::modulus_3, carry, r.data[3], carry);
    addc(r.data[4], 0, carry, r.data[4], carry_2);

    k = r.data[1] * FieldParams::r_inv;
    mac(r.data[1], k, FieldParams::modulus_0, 0, stub, carry);
    mac(r.data[2], k, FieldParams::modulus_1, carry, r.data[2], carry);
    mac(r.data[3], k, FieldParams::modulus_2, carry, r.data[3], carry);
    mac(r.data[4], k, FieldParams::modulus_3, carry, r.data[4], carry);
    addc(r.data[5], carry_2, carry, r.data[5], carry_2);

    k = r.data[2] * FieldParams::r_inv;
    mac(r.data[2], k, FieldParams::modulus_0, 0, stub, carry);
    mac(r.data[3], k, FieldParams::modulus_1, carry, r.data[3], carry);
    mac(r.data[4], k, FieldParams::modulus_2, carry, r.data[4], carry);
    mac(r.data[5], k, FieldParams::modulus_3, carry, r.data[5], carry);
    addc(r.data[6], carry_2, carry, r.data[6], carry_2);

    k = r.data[3] * FieldParams::r_inv;
    mac(r.data[3], k, FieldParams::modulus_0, 0, stub, carry);
    mac(r.data[4], k, FieldParams::modulus_1, carry, r.data[4], carry);
    mac(r.data[5], k, FieldParams::modulus_2, carry, r.data[5], carry);
    mac(r.data[6], k, FieldParams::modulus_3, carry, r.data[6], carry);
    addc(r.data[7], carry_2, carry, r.data[7], carry_2);

    out.data[0] = r.data[4];
    out.data[1] = r.data[5];
    out.data[2] = r.data[6];
    out.data[3] = r.data[7];
}

} // namespace internal

template <typename FieldParams>
inline void field<FieldParams>::__mul_512(const field_t& a, const field_t& b, field_wide_t& r) noexcept
{
    uint64_t carry = 0;
    internal::mac(0, a.data[0], b.data[0], 0, r.data[0], carry);
    internal::mac(0, a.data[0], b.data[1], carry, r.data[1], carry);
    internal::mac(0, a.data[0], b.data[2], carry, r.data[2], carry);
    internal::mac(0, a.data[0], b.data[3], carry, r.data[3], r.data[4]);

    internal::mac(r.data[1], a.data[1], b.data[0], 0, r.data[1], carry);
    internal::mac(r.data[2], a.data[1], b.data[1], carry, r.data[2], carry);
    internal::mac(r.data[3], a.data[1], b.data[2], carry, r.data[3], carry);
    internal::mac(r.data[4], a.data[1], b.data[3], carry, r.data[4], r.data[5]);

    internal::mac(r.data[2], a.data[2], b.data[0], 0, r.data[2], carry);
    internal::mac(r.data[3], a.data[2], b.data[1], carry, r.data[3], carry);
    internal::mac(r.data[4], a.data[2], b.data[2], carry, r.data[4], carry);
    internal::mac(r.data[5], a.data[2], b.data[3], carry, r.data[5], r.data[6]);

    internal::mac(r.data[3], a.data[3], b.data[0], 0, r.data[3], carry);
    internal::mac(r.data[4], a.data[3], b.data[1], carry, r.data[4], carry);
    internal::mac(r.data[5], a.data[3], b.data[2], carry, r.data[5], carry);
    internal::mac(r.data[6], a.data[3], b.data[3], carry, r.data[6], r.data[7]);
}

template <typename FieldParams> inline void field<FieldParams>::__copy(const field_t& a, field_t& r) noexcept
{
    r.data[0] = a.data[0];
    r.data[1] = a.data[1];
    r.data[2] = a.data[2];
    r.data[3] = a.data[3];
}

template <typename FieldParams> inline void field<FieldParams>::reduce_once(const field_t& a, field_t& r) noexcept
{
    internal::subtract<FieldParams>(a, modulus, r);
}

template <typename FieldParams>
inline void field<FieldParams>::__add(const field_t& a, const field_t& b, field_t& r) noexcept
{
    __add_without_reduction(a, b, r);
    internal::subtract<FieldParams>(r, modulus, r);
}

template <typename FieldParams>
inline void field<FieldParams>::__add_with_coarse_reduction(const field_t& a, const field_t& b, field_t& r) noexcept
{
    __add_without_reduction(a, b, r);
    internal::subtract_coarse<FieldParams>(r, twice_modulus, r);
}

template <typename FieldParams>
inline void field<FieldParams>::__add_without_reduction(const field_t& a, const field_t& b, field_t& r) noexcept
{
    uint64_t carry = 0;
    internal::addc(a.data[0], b.data[0], 0, r.data[0], carry);
    internal::addc(a.data[1], b.data[1], carry, r.data[1], carry);
    internal::addc(a.data[2], b.data[2], carry, r.data[2], carry);
    internal::addc(a.data[3], b.data[3], carry, r.data[3], carry);
}

template <typename FieldParams>
inline void field<FieldParams>::__quad_with_coarse_reduction(const field_t& a, field_t& r) noexcept
{
    __add_without_reduction(a, a, r);
    internal::subtract_coarse<FieldParams>(r, twice_modulus, r);
    __add_without_reduction(r, r, r);
    internal::subtract_coarse<FieldParams>(r, twice_modulus, r);
}

template <typename FieldParams>
inline void field<FieldParams>::__oct_with_coarse_reduction(const field_t& a, field_t& r) noexcept
{
    __add_without_reduction(a, a, r);
    internal::subtract_coarse<FieldParams>(r, twice_modulus, r);
    __add_without_reduction(r, r, r);
    internal::subtract_coarse<FieldParams>(r, twice_modulus, r);
    __add_without_reduction(r, r, r);
    internal::subtract_coarse<FieldParams>(r, twice_modulus, r);
}

template <typename FieldParams>
inline void field<FieldParams>::__paralell_double_and_add_without_reduction(field_t& x_0,
                                                                            const field_t& y_0,
                                                                            const field_t& y_1,
                                                                            field_t& r) noexcept
{
    __add_without_reduction(x_0, x_0, x_0);
    __add_without_reduction(y_0, y_1, r);
}

template <typename FieldParams>
inline void field<FieldParams>::__sub(const field_t& a, const field_t& b, field_t& r) noexcept
{
    internal::subtract<FieldParams>(a, b, r);
}

template <typename FieldParams>
inline void field<FieldParams>::__sub_with_coarse_reduction(const field_t& a, const field_t& b, field_t& r) noexcept
{
    internal::subtract_coarse<FieldParams>(a, b, r);
}

template <typename FieldParams>
inline void field<FieldParams>::__conditionally_subtract_from_double_modulus(const field_t& a,
                                                                             field_t& r,
                                                                             const uint64_t predicate) noexcept
{
    if (predicate) {
        __sub(twice_modulus, a, r);
    } else {
        __copy(a, r);
    }
}
template <typename FieldParams>
inline void field<FieldParams>::__conditionally_negate_self(field_t& r, const uint64_t predicate) noexcept
{
    if (predicate) {
        __sub(modulus, r, r);
    } else {
        __copy(r, r);
    }
}
template <typename FieldParams> inline void field<FieldParams>::__sqr(const field_t& a, field_t& r) noexcept
{
    field<FieldParams>::field_wide_t temp;
    __mul_512(a, a, temp);
    internal::montgomery_reduce<FieldParams>(temp, r);
    internal::subtract<FieldParams>(r, modulus, r);
}

template <typename FieldParams>
inline void field<FieldParams>::__sqr_with_coarse_reduction(const field_t& a, field_t& r) noexcept
{
    field_wide_t temp;
    __mul_512(a, a, temp);
    internal::montgomery_reduce<FieldParams>(temp, r);
}

template <typename FieldParams>
inline void field<FieldParams>::__mul(const field_t& lhs, const field_t& rhs, field_t& r) noexcept
{
    field_wide_t temp;
    __mul_512(lhs, rhs, temp);
    internal::montgomery_reduce<FieldParams>(temp, r);
    internal::subtract<FieldParams>(r, modulus, r);
}

template <typename FieldParams>
inline void field<FieldParams>::__mul_with_coarse_reduction(const field_t& lhs, const field_t& rhs, field_t& r) noexcept
{
    field_wide_t temp;
    __mul_512(lhs, rhs, temp);
    internal::montgomery_reduce<FieldParams>(temp, r);
}

template <typename FieldParams> inline void field<FieldParams>::__swap(field_t& src, field_t& dest) noexcept
{
    uint64_t t[4] = { src.data[0], src.data[1], src.data[2], src.data[3] };
    src.data[0] = dest.data[0];
    src.data[1] = dest.data[1];
    src.data[2] = dest.data[2];
    src.data[3] = dest.data[3];
    dest.data[0] = t[0];
    dest.data[1] = t[1];
    dest.data[2] = t[2];
    dest.data[3] = t[3];
}
} // namespace barretenberg
