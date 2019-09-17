#include "stdint.h"
#include "unistd.h"

#include "../assert.hpp"

#include "fq.hpp"

namespace fq
{
namespace
{
using uint128_t = unsigned __int128;
constexpr uint128_t lo_mask = 0xffffffffffffffffUL;


// N.B. Commented data is F_squared for Fr NOT Fq
// 216D0B17F4E44A5 // 8C49833D53BB8085 // 53FE3AB1E35C59E3 // 1BB8E645AE216DA7

constexpr field_t r_squared = { .data = {
    0xF32CFC5B538AFA89UL,
    0xB5E71911D44501FBUL,
    0x47AB1EFF0A417FF6UL,
    0x06D89F71CAB8351FUL,
}};

constexpr field_t one_raw = { .data = { 1, 0, 0, 0 } };

inline bool gt(field_t& a, field_t& b)
{
    bool t0 = a[3] > b[3];
    bool t1 = (a[3] == b[3]) && (a[2] > b[2]);
    bool t2 = (a[3] == b[3]) && (a[2] == b[2]) && (a[1] > b[1]);
    bool t3 = (a[3] == b[3]) && (a[2] == b[2]) && (a[1] == b[1]) && (a[0] > b[0]);
    return (t0 || t1 || t2 || t3);
}

// compute a + b + carry, returning the carry
inline void addc(uint64_t a, uint64_t b, uint64_t carry_in, uint64_t &r, uint64_t &carry_out)
{
    uint128_t res = (uint128_t)a + (uint128_t)b + (uint128_t)carry_in;
    carry_out = (uint64_t)(res >> 64);
    r = (uint64_t)(res & lo_mask);
}

// compute a - (b + borrow), returning result and updated borrow
inline void sbb(uint64_t a, uint64_t b, uint64_t borrow_in, uint64_t &r, uint64_t &borrow_out)
{
    uint128_t res = (uint128_t)a - ((uint128_t)b + (uint128_t)(borrow_in >> 63));
    borrow_out = (uint64_t)(res >> 64);
    r = (uint64_t)(res & lo_mask);
}

// perform a + (b * c) + carry, putting result in r and returning new carry
inline void mac(uint64_t a, uint64_t b, uint64_t c, uint64_t carry_in, uint64_t &r, uint64_t &carry_out)
{
    uint128_t res = (uint128_t)a + ((uint128_t)b * (uint128_t)c) + (uint128_t)carry_in;
    carry_out = (uint64_t)(res >> 64);
    r = (uint64_t)(res & lo_mask);
}

inline void subtract(const field_t& a, const field_t& b, field_t& r)
{
    uint64_t borrow = 0;
    uint64_t carry = 0;

    sbb(a[0], b[0], 0, r[0], borrow);
    sbb(a[1], b[1], borrow, r[1], borrow);
    sbb(a[2], b[2], borrow, r[2], borrow);
    sbb(a[3], b[3], borrow, r[3], borrow);
    addc(r[0], modulus[0] & borrow, 0, r[0], carry);
    addc(r[1], modulus[1] & borrow, carry, r[1], carry);
    addc(r[2], modulus[2] & borrow, carry, r[2], carry);
    addc(r[3], modulus[3] & borrow, carry, r[3], carry);
}

inline void montgomery_reduce(field_t& r, field_t& out)
{
    uint64_t carry = 0;
    uint64_t carry_2 = 0;
    uint64_t stub = 0;
    uint64_t k = r[0] * r_inv;
    mac(r[0], k, modulus[0], 0, stub, carry);
    mac(r[1], k, modulus[1], carry, r[1], carry);
    mac(r[2], k, modulus[2], carry, r[2], carry);
    mac(r[3], k, modulus[3], carry, r[3], carry);
    addc(r[4], 0, carry, r[4], carry_2);

    k = r[1] * r_inv;
    mac(r[1], k, modulus[0], 0, stub, carry);
    mac(r[2], k, modulus[1], carry, r[2], carry);
    mac(r[3], k, modulus[2], carry, r[3], carry);
    mac(r[4], k, modulus[3], carry, r[4], carry);
    addc(r[5], carry_2, carry, r[5], carry_2);

    k = r[2] * r_inv;
    mac(r[2], k, modulus[0], 0, stub, carry);
    mac(r[3], k, modulus[1], carry, r[3], carry);
    mac(r[4], k, modulus[2], carry, r[4], carry);
    mac(r[5], k, modulus[3], carry, r[5], carry);
    addc(r[6], carry_2, carry, r[6], carry_2);

    k = r[3] * r_inv;
    mac(r[3], k, modulus[0], 0, stub, carry);
    mac(r[4], k, modulus[1], carry, r[4], carry);
    mac(r[5], k, modulus[2], carry, r[5], carry);
    mac(r[6], k, modulus[3], carry, r[6], carry);
    addc(r[7], carry_2, carry, r[7], carry_2);

    out[0] = r[4];
    out[1] = r[5];
    out[2] = r[6];
    out[3] = r[7];
    subtract(&r[4], (field_t& )&modulus[0], out);
}
}

inline void add(const field_t& a, const field_t& b, field_t& r)
{
    uint64_t carry = 0;
    addc(a[0], b[0], 0, r[0], carry);
    addc(a[1], b[1], carry, r[1], carry);
    addc(a[2], b[2], carry, r[2], carry);
    addc(a[3], b[3], carry, r[3], carry);
    subtract(r, modulus, r);
}

inline void add_without_reduction(const field_t& a, const field_t& b, field_t& r)
{
    add(a, b, r);
}

inline void mul(field_t& lhs, field_t& rhs, field_t& r)
{
    uint64_t temp[8];
    mul_512(lhs, rhs, &temp[0]);
    montgomery_reduce(&temp[0], r);
}


inline void mul_without_reduction(field_t& lhs, field_t& rhs, field_t& r)
{
    mul(lhs, rhs, r);
}

inline void sqr(field_t& a, field_t& r)
{
    uint64_t temp[8];
    mul_512(a, a, &temp[0]);
    montgomery_reduce(&temp[0], r);
}

inline void sqr_without_reduction(field_t& a, field_t& r)
{
    sqr(a, r);
}

inline void sub(field_t& a, field_t& b, field_t& r)
{
    subtract(a, b, r);
}

inline void mul_512(field_t& a, field_t& b, field_t& r)
{
    uint64_t carry = 0;
    mac(0, a[0], b[0], 0, r[0], carry);
    mac(0, a[0], b[1], carry, r[1], carry);
    mac(0, a[0], b[2], carry, r[2], carry);
    mac(0, a[0], b[3], carry, r[3], r[4]);

    mac(r[1], a[1], b[0], 0, r[1], carry);
    mac(r[2], a[1], b[1], carry, r[2], carry);
    mac(r[3], a[1], b[2], carry, r[3], carry);
    mac(r[4], a[1], b[3], carry, r[4], r[5]);

    mac(r[2], a[2], b[0], 0, r[2], carry);
    mac(r[3], a[2], b[1], carry, r[3], carry);
    mac(r[4], a[2], b[2], carry, r[4], carry);
    mac(r[5], a[2], b[3], carry, r[5], r[6]);

    mac(r[3], a[3], b[0], 0, r[3], carry);
    mac(r[4], a[3], b[1], carry, r[4], carry);
    mac(r[5], a[3], b[2], carry, r[5], carry);
    mac(r[6], a[3], b[3], carry, r[6], r[7]);
}

inline void to_montgomery_form(field_t& a, field_t& r)
{
    while (gt(a, modulus_plus_one))
    {
        sub(a, modulus, a);
    }
    mul(a, &r_squared[0], r);
}

inline void from_montgomery_form(field_t& a, field_t& r)
{
    mul(a, one_raw, r);
}

inline void random_element(field_t& r)
{
    int got_entropy = getentropy((void *)r, 32);
    ASSERT(got_entropy == 0);
    to_montgomery_form(r, r);
}

inline void one(field_t& r)
{
    to_montgomery_form(one_raw, r);
}

inline void copy(const field_t& a, field_t& r)
{
    r.data[0] = a.data[0];
    r.data[1] = a.data[1];
    r.data[2] = a.data[2];
    r.data[3] = a.data[3];
}
} // namespace fq