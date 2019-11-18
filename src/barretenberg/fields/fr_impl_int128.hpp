#ifndef FR_IMPL_INT128
#define FR_IMPL_INT128
#include "stdint.h"
#include "stdio.h"
#include "unistd.h"

#include "../assert.hpp"

#include "fr.hpp"

namespace barretenberg
{
namespace fr
{
namespace internal
{
__extension__ using uint128_t = unsigned __int128;
constexpr uint128_t lo_mask = 0xffffffffffffffffUL;

constexpr field_t twice_modulus{
    { 0x87c3eb27e0000002UL, 0x5067d090f372e122UL, 0x70a08b6d0302b0baUL, 0x60c89ce5c2634053UL }
};

// compute a + b + carry, returning the carry
inline void addc(const uint64_t a, const uint64_t b, const uint64_t carry_in, uint64_t& r, uint64_t& carry_out)
{
    uint128_t res = (uint128_t)a + (uint128_t)b + (uint128_t)carry_in;
    carry_out = (uint64_t)(res >> 64);
    r = (uint64_t)(res & lo_mask);
}

// compute a - (b + borrow), returning result and updated borrow
inline void sbb(const uint64_t a, const uint64_t b, const uint64_t borrow_in, uint64_t& r, uint64_t& borrow_out)
{
    uint128_t res = (uint128_t)a - ((uint128_t)b + (uint128_t)(borrow_in >> 63));
    borrow_out = (uint64_t)(res >> 64);
    r = (uint64_t)(res & lo_mask);
}

// perform a + (b * c) + carry, putting result in r and returning new carry
inline void mac(
    const uint64_t a, const uint64_t b, const uint64_t c, const uint64_t carry_in, uint64_t& r, uint64_t& carry_out)
{
    uint128_t res = (uint128_t)a + ((uint128_t)b * (uint128_t)c) + (uint128_t)carry_in;
    carry_out = (uint64_t)(res >> 64);
    r = (uint64_t)(res & lo_mask);
}

inline void subtract(const field_t& a, const field_t& b, field_t& r)
{
    uint64_t borrow = 0;
    uint64_t carry = 0;

    sbb(a.data[0], b.data[0], 0, r.data[0], borrow);
    sbb(a.data[1], b.data[1], borrow, r.data[1], borrow);
    sbb(a.data[2], b.data[2], borrow, r.data[2], borrow);
    sbb(a.data[3], b.data[3], borrow, r.data[3], borrow);

    addc(r.data[0], modulus.data[0] & borrow, 0, r.data[0], carry);
    addc(r.data[1], modulus.data[1] & borrow, carry, r.data[1], carry);
    addc(r.data[2], modulus.data[2] & borrow, carry, r.data[2], carry);
    addc(r.data[3], modulus.data[3] & borrow, carry, r.data[3], carry);
}

inline void subtract_coarse(const field_t& a, const field_t& b, field_t& r)
{
    uint64_t borrow = 0;
    uint64_t carry = 0;

    sbb(a.data[0], b.data[0], 0, r.data[0], borrow);
    sbb(a.data[1], b.data[1], borrow, r.data[1], borrow);
    sbb(a.data[2], b.data[2], borrow, r.data[2], borrow);
    sbb(a.data[3], b.data[3], borrow, r.data[3], borrow);

    addc(r.data[0], twice_modulus.data[0] & borrow, 0, r.data[0], carry);
    addc(r.data[1], twice_modulus.data[1] & borrow, carry, r.data[1], carry);
    addc(r.data[2], twice_modulus.data[2] & borrow, carry, r.data[2], carry);
    addc(r.data[3], twice_modulus.data[3] & borrow, carry, r.data[3], carry);
}

inline void montgomery_reduce(field_wide_t& r, field_t& out)
{
    uint64_t carry = 0;
    uint64_t carry_2 = 0;
    uint64_t stub = 0;
    uint64_t k = r.data[0] * internal::r_inv;

    mac(r.data[0], k, modulus.data[0], 0, stub, carry);
    mac(r.data[1], k, modulus.data[1], carry, r.data[1], carry);
    mac(r.data[2], k, modulus.data[2], carry, r.data[2], carry);
    mac(r.data[3], k, modulus.data[3], carry, r.data[3], carry);
    addc(r.data[4], 0, carry, r.data[4], carry_2);

    k = r.data[1] * internal::r_inv;
    mac(r.data[1], k, modulus.data[0], 0, stub, carry);
    mac(r.data[2], k, modulus.data[1], carry, r.data[2], carry);
    mac(r.data[3], k, modulus.data[2], carry, r.data[3], carry);
    mac(r.data[4], k, modulus.data[3], carry, r.data[4], carry);
    addc(r.data[5], carry_2, carry, r.data[5], carry_2);

    k = r.data[2] * internal::r_inv;
    mac(r.data[2], k, modulus.data[0], 0, stub, carry);
    mac(r.data[3], k, modulus.data[1], carry, r.data[3], carry);
    mac(r.data[4], k, modulus.data[2], carry, r.data[4], carry);
    mac(r.data[5], k, modulus.data[3], carry, r.data[5], carry);
    addc(r.data[6], carry_2, carry, r.data[6], carry_2);

    k = r.data[3] * internal::r_inv;
    mac(r.data[3], k, modulus.data[0], 0, stub, carry);
    mac(r.data[4], k, modulus.data[1], carry, r.data[4], carry);
    mac(r.data[5], k, modulus.data[2], carry, r.data[5], carry);
    mac(r.data[6], k, modulus.data[3], carry, r.data[6], carry);
    addc(r.data[7], carry_2, carry, r.data[7], carry_2);

    out.data[0] = r.data[4];
    out.data[1] = r.data[5];
    out.data[2] = r.data[6];
    out.data[3] = r.data[7];
}
} // namespace internal

inline void copy(const field_t& a, field_t& r)
{
    r.data[0] = a.data[0];
    r.data[1] = a.data[1];
    r.data[2] = a.data[2];
    r.data[3] = a.data[3];
}

inline void zero(field_t& a)
{
    a.data[0] = 0;
    a.data[1] = 0;
    a.data[2] = 0;
    a.data[3] = 0;
}

inline void swap(field_t& src, field_t& dest)
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

inline void reduce_once(const field_t& a, field_t& r)
{
    internal::subtract(a, modulus, r);
}

inline void __add_without_reduction(const field_t& a, const field_t& b, field_t& r)
{
    uint64_t carry = 0;
    internal::addc(a.data[0], b.data[0], 0, r.data[0], carry);
    internal::addc(a.data[1], b.data[1], carry, r.data[1], carry);
    internal::addc(a.data[2], b.data[2], carry, r.data[2], carry);
    internal::addc(a.data[3], b.data[3], carry, r.data[3], carry);
}

inline void __add(const field_t& a, const field_t& b, field_t& r)
{
    __add_without_reduction(a, b, r);
    internal::subtract(r, modulus, r);
}

inline void __add_with_coarse_reduction(const field_t& a, const field_t& b, field_t& r)
{
    __add_without_reduction(a, b, r);
    internal::subtract_coarse(r, internal::twice_modulus, r);
}

inline void __sub(const field_t& a, const field_t& b, field_t& r)
{
    internal::subtract(a, b, r);
}

inline void __sub_with_coarse_reduction(const field_t& a, const field_t& b, field_t& r)
{
    internal::subtract_coarse(a, b, r);
}

inline void mul_512(const field_t& a, const field_t& b, field_wide_t& r)
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

inline void __sqr_without_reduction(const field_t& a, field_t& r)
{
    field_wide_t temp;
    mul_512(a, a, temp);
    internal::montgomery_reduce(temp, r);
}

inline void __sqr(const field_t& a, field_t& r)
{
    __sqr_without_reduction(a, r);
    internal::subtract(r, modulus, r);
}

inline void __mul_without_reduction(const field_t& a, const field_t& b, field_t& r)
{
    field_wide_t temp;
    mul_512(a, b, temp);
    internal::montgomery_reduce(temp, r);
}

inline void __mul(const field_t& a, const field_t& b, field_t& r)
{
    __mul_without_reduction(a, b, r);
    internal::subtract(r, modulus, r);
}

inline void __conditional_negate(const field_t& a, field_t& r, const bool predicate)
{
    if (predicate)
    {
        __sub(modulus, a, r);
    }
    else
    {
        copy(modulus, r);
    }
}

inline void __conditionally_subtract_double_modulus(const field_t& a, field_t& r, const uint64_t predicate)
{
    if (predicate)
    {
        __sub(internal::twice_modulus, a, r);
    }
    else
    {
        copy(a, r);
    }
}
} // namespace fr
} // namespace barretenberg

#endif