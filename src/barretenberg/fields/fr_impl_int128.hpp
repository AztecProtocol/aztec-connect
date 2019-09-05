#include <stdint.h>
#include <unistd.h>
#include <stdio.h>

#include "../assert.hpp"

#include "fr.hpp"

namespace fr
{
namespace
{
using uint128_t = unsigned __int128;
constexpr uint128_t lo_mask = 0xffffffffffffffffUL;
} // namespace


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

inline void subtract(field_t& a, field_t& b, field_t& r)
{
    uint64_t borrow = 0;
    uint64_t carry = 0;

    sbb(a.data[0], b.data[0], 0, r.data[0], borrow);
    sbb(a.data[1], b.data[1], borrow, r.data[1], borrow);
    sbb(a.data[2], b.data[2], borrow, r.data[2], borrow);
    sbb(a.data[3], b.data[3], borrow, r.data[3], borrow);

    addc(r.data[0], modulus[0] & borrow, 0, r.data[0], carry);
    addc(r.data[1], modulus[1] & borrow, carry, r.data[1], carry);
    addc(r.data[2], modulus[2] & borrow, carry, r.data[2], carry);
    addc(r.data[3], modulus[3] & borrow, carry, r.data[3], carry);
}

inline void add(field_t& a, field_t& b, field_t& r)
{
    uint64_t carry = 0;
    addc(a.data[0], b.data[0], 0, r.data[0], carry);
    addc(a.data[1], b.data[1], carry, r.data[1], carry);
    addc(a.data[2], b.data[2], carry, r.data[2], carry);
    addc(a.data[3], b.data[3], carry, r.data[3], carry);
    subtract(r, modulus, r);
}

inline void sub(field_t& a, field_t& b, field_t& r)
{
    subtract(a, b, r);
}

inline void mul_512(field_t& a, field_t& b, field_t& r)
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

inline void montgomery_reduce(field_t& r, field_t& out)
{
    uint64_t carry = 0;
    uint64_t carry_2 = 0;
    uint64_t stub = 0;
    uint64_t k = r.data[0] * r_inv;
    mac(r.data[0], k, modulus[0], 0, stub, carry);
    mac(r.data[1], k, modulus[1], carry, r.data[1], carry);
    mac(r.data[2], k, modulus[2], carry, r.data[2], carry);
    mac(r.data[3], k, modulus[3], carry, r.data[3], carry);
    addc(r.data[4], 0, carry, r.data[4], carry_2);

    k = r.data[1] * r_inv;
    mac(r.data[1], k, modulus[0], 0, stub, carry);
    mac(r.data[2], k, modulus[1], carry, r.data[2], carry);
    mac(r.data[3], k, modulus[2], carry, r.data[3], carry);
    mac(r.data[4], k, modulus[3], carry, r.data[4], carry);
    addc(r.data[5], carry_2, carry, r.data[5], carry_2);

    k = r.data[2] * r_inv;
    mac(r.data[2], k, modulus[0], 0, stub, carry);
    mac(r.data[3], k, modulus[1], carry, r.data[3], carry);
    mac(r.data[4], k, modulus[2], carry, r.data[4], carry);
    mac(r.data[5], k, modulus[3], carry, r.data[5], carry);
    addc(r.data[6], carry_2, carry, r.data[6], carry_2);

    k = r.data[3] * r_inv;
    mac(r.data[3], k, modulus[0], 0, stub, carry);
    mac(r.data[4], k, modulus[1], carry, r.data[4], carry);
    mac(r.data[5], k, modulus[2], carry, r.data[5], carry);
    mac(r.data[6], k, modulus[3], carry, r.data[6], carry);
    addc(r.data[7], carry_2, carry, r.data[7], carry_2);

    out[0] = r.data[4];
    out[1] = r.data[5];
    out[2] = r.data[6];
    out[3] = r.data[7];
    subtract(&r.data[4], (field_t& )&modulus[0], out);
}

inline void sqr(field_t& a, field_t& r)
{
    uint64_t temp[8];
    mul_512(a, a, &temp[0]);
    montgomery_reduce(&temp[0], r);
}

inline void copy(const field_t& a, field_t& r)
{
    r.data[0] = a.data[0];
    r.data[1] = a.data[1];
    r.data[2] = a.data[2];
    r.data[3] = a.data[3];
}
} // namespace fr
