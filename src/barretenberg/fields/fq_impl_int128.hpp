#ifndef FQ_IMPL_INT128
#define FQ_IMPL_INT128

#include "stdint.h"
#include "unistd.h"

#include "../assert.hpp"

#include "fq.hpp"

namespace barretenberg
{
namespace fq
{
namespace internal
{
using uint128_t = unsigned __int128;
constexpr uint128_t lo_mask = 0xffffffffffffffffUL;

// N.B. Commented data is F_squared for Fr NOT Fq
// 216D0B17F4E44A5 // 8C49833D53BB8085 // 53FE3AB1E35C59E3 // 1BB8E645AE216DA7

constexpr field_t r_squared = {
    .data = {0xF32CFC5B538AFA89UL, 0xB5E71911D44501FBUL, 0x47AB1EFF0A417FF6UL, 0x06D89F71CAB8351FUL}};

constexpr field_t one_raw = {.data = {1, 0, 0, 0}};

constexpr field_t twice_modulus = {
    .data = {0x7841182db0f9fa8eUL, 0x2f02d522d0e3951aUL, 0x70a08b6d0302b0bbUL, 0x60c89ce5c2634053UL}};

inline bool gt(field_t& a, field_t& b)
{
    bool t0 = a.data[3] > b.data[3];
    bool t1 = (a.data[3] == b.data[3]) && (a.data[2] > b.data[2]);
    bool t2 = (a.data[3] == b.data[3]) && (a.data[2] == b.data[2]) && (a.data[1] > b.data[1]);
    bool t3 =
        (a.data[3] == b.data[3]) && (a.data[2] == b.data[2]) && (a.data[1] == b.data[1]) && (a.data[0] > b.data[0]);
    return (t0 || t1 || t2 || t3);
}

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
inline void
mac(const uint64_t a, const uint64_t b, const uint64_t c, const uint64_t carry_in, uint64_t& r, uint64_t& carry_out)
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

inline void mul_512(const field_t& a, const field_t& b, field_wide_t& r)
{
    uint64_t carry = 0;
    mac(0, a.data[0], b.data[0], 0, r.data[0], carry);
    mac(0, a.data[0], b.data[1], carry, r.data[1], carry);
    mac(0, a.data[0], b.data[2], carry, r.data[2], carry);
    mac(0, a.data[0], b.data[3], carry, r.data[3], r.data[4]);

    mac(r.data[1], a.data[1], b.data[0], 0, r.data[1], carry);
    mac(r.data[2], a.data[1], b.data[1], carry, r.data[2], carry);
    mac(r.data[3], a.data[1], b.data[2], carry, r.data[3], carry);
    mac(r.data[4], a.data[1], b.data[3], carry, r.data[4], r.data[5]);

    mac(r.data[2], a.data[2], b.data[0], 0, r.data[2], carry);
    mac(r.data[3], a.data[2], b.data[1], carry, r.data[3], carry);
    mac(r.data[4], a.data[2], b.data[2], carry, r.data[4], carry);
    mac(r.data[5], a.data[2], b.data[3], carry, r.data[5], r.data[6]);

    mac(r.data[3], a.data[3], b.data[0], 0, r.data[3], carry);
    mac(r.data[4], a.data[3], b.data[1], carry, r.data[4], carry);
    mac(r.data[5], a.data[3], b.data[2], carry, r.data[5], carry);
    mac(r.data[6], a.data[3], b.data[3], carry, r.data[6], r.data[7]);
}
} // namespace internal

inline void copy(const field_t& a, field_t& r)
{
    r.data[0] = a.data[0];
    r.data[1] = a.data[1];
    r.data[2] = a.data[2];
    r.data[3] = a.data[3];
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

inline void quad_with_coarse_reduction(const field_t& a, field_t& r)
{
    __add_without_reduction(a, a, r);
    internal::subtract_coarse(r, internal::twice_modulus, r);
    __add_without_reduction(r, r, r);
    internal::subtract_coarse(r, internal::twice_modulus, r);
}

inline void oct_with_coarse_reduction(const field_t& a, field_t& r)
{
    __add_without_reduction(a, a, r);
    internal::subtract_coarse(r, internal::twice_modulus, r);
    __add_without_reduction(r, r, r);
    internal::subtract_coarse(r, internal::twice_modulus, r);
    __add_without_reduction(r, r, r);
    internal::subtract_coarse(r, internal::twice_modulus, r);
}

inline void paralell_double_and_add_without_reduction(field_t& x_0, const field_t& y_0, const field_t& y_1, field_t& r)
{
    __add_without_reduction(x_0, x_0, x_0);
    __add_without_reduction(y_0, y_1, r);
}

inline void __sub(const field_t& a, const field_t& b, field_t& r)
{
    internal::subtract(a, b, r);
}

inline void __sub_with_coarse_reduction(const field_t& a, const field_t& b, field_t& r)
{
    internal::subtract_coarse(a, b, r);
}

inline void __mul(const field_t& lhs, const field_t& rhs, field_t& r)
{
    field_wide_t temp;
    internal::mul_512(lhs, rhs, temp);
    internal::montgomery_reduce(temp, r);
    internal::subtract(r, modulus, r);
}

inline void __mul_without_reduction(const field_t& lhs, const field_t& rhs, field_t& r)
{
    field_wide_t temp;
    internal::mul_512(lhs, rhs, temp);
    internal::montgomery_reduce(temp, r);
}

inline void __sqr(const field_t& a, field_t& r)
{
    field_wide_t temp;
    internal::mul_512(a, a, temp);
    internal::montgomery_reduce(temp, r);
    internal::subtract(r, modulus, r);
}

inline void __sqr_without_reduction(const field_t& a, field_t& r)
{
    field_wide_t temp;
    internal::mul_512(a, a, temp);
    internal::montgomery_reduce(temp, r);
}

inline void mul_then_sub(const field_t& a, const field_t& b, const field_t& c, field_t& r)
{
    __mul(a, b, r);
    __sub(r, c, r);
}
} // namespace fq
} // namespace barretenberg

#endif