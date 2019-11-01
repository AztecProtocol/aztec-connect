#ifndef FQ
#define FQ

#include "stdint.h"
#include "stdio.h"

#include "../assert.hpp"
#include "../types.hpp"

namespace barretenberg
{
namespace fq
{
constexpr field_t modulus = {.data = {
                                 0x3C208C16D87CFD47UL,
                                 0x97816a916871ca8dUL,
                                 0xb85045b68181585dUL,
                                 0x30644e72e131a029UL}};

namespace internal
{
constexpr uint64_t r_inv = 0x87d20782e4866389UL;
}
} // namespace fq
} // namespace barretenberg

#ifdef DISABLE_SHENANIGANS
#include "fq_impl_int128.hpp"
#else
#include "fq_impl_asm.hpp"
#endif

namespace barretenberg
{
namespace fq
{
constexpr field_t __zero = {.data = {0x00, 0x00, 0x00, 0x00}};

constexpr field_t curve_b = {.data = {0x3, 0x0, 0x0, 0x0}};

constexpr field_t two_inv = {.data = {0x87bee7d24f060572, 0xd0fd2add2f1c6ae5, 0x8f5f7492fcfd4f44, 0x1f37631a3d9cbfac}};

constexpr field_t modulus_plus_one = {.data = {
                                          0x3C208C16D87CFD48UL,
                                          0x97816a916871ca8dUL,
                                          0xb85045b68181585dUL,
                                          0x30644e72e131a029UL}};

constexpr field_t r_squared = {.data = {
                                   0xF32CFC5B538AFA89UL,
                                   0xB5E71911D44501FBUL,
                                   0x47AB1EFF0A417FF6UL,
                                   0x06D89F71CAB8351FUL}};

constexpr field_t one_raw = {.data = {1, 0, 0, 0}};

constexpr field_t one_mont = {.data = {
                                  0xd35d438dc58f0d9d,
                                  0x0a78eb28f5c70b3d,
                                  0x666ea36f7879462c,
                                  0x0e0a77c19a07df2f}};

// cube root of unity modulo (modulus), converted into montgomery form
constexpr field_t beta = {.data = {
                              0x71930c11d782e155UL,
                              0xa6bb947cffbe3323UL,
                              0xaa303344d4741444UL,
                              0x2c3b3f0d26594943UL}};

// compute a * b, put result in r
inline void __mul(const field_t &a, const field_t &b, const field_t &r);

// compute a * b, put result in r. Do not perform final reduction check
inline void __mul_without_reduction(const field_t &a, const field_t &b, const field_t &r);

// compute a * a, put result in r
inline void __sqr(const field_t &a, const field_t &r);

// compute a * a, put result in r. Do not perform final reduction check
inline void __sqr_without_reduction(const field_t &a, const field_t &r);

// compute a + b, put result in r
inline void __add(const field_t &a, const field_t &b, field_t &r);

// compute a + b, put result in r. Do not perform final reduction check
inline void __add_without_reduction(const field_t &a, const field_t &b, field_t &r);

// quadruple a, perform a reduction check that reduces to either (r mod p) or p + (r mod p)
inline void quad_with_partial_reduction(const field_t &a, const field_t &r);

// compute a - b, put result in r
inline void __sub(const field_t &a, const field_t &b, field_t &r);

/**
 * copy src into dest. AVX implementation requires words to be aligned on 32 byte bounary
 **/
inline void copy(const field_t &src, field_t &dest);

inline bool gt(const field_t &a, const field_t &b)
{
    bool t0 = a.data[3] > b.data[3];
    bool t1 = (a.data[3] == b.data[3]) && (a.data[2] > b.data[2]);
    bool t2 = (a.data[3] == b.data[3]) && (a.data[2] == b.data[2]) && (a.data[1] > b.data[1]);
    bool t3 = (a.data[3] == b.data[3]) && (a.data[2] == b.data[2]) && (a.data[1] == b.data[1]) && (a.data[0] > b.data[0]);
    return (t0 || t1 || t2 || t3);
}

/**
 * Multiply field_t `a` by the cube root of unity, modulo `q`. Store result in `r`
 **/
inline void __mul_beta(const field_t &a, field_t &r)
{
    fq::__mul(a, beta, r);
}

/**
 * Negate field_t element `a`, mod `q`, place result in `r`
 **/
inline void neg(const field_t &a, field_t &r)
{
    fq::__sub(modulus, a, r);
}

/**
 * Convert a field element into montgomery form
 **/
inline void to_montgomery_form(const field_t &a, field_t &r)
{
    copy(a, r);
    while (gt(r, modulus_plus_one))
    {
        __sub(r, modulus, r);
    }
    __mul(r, r_squared, r);
}

/**
 * Convert a field element out of montgomery form by performing a modular
 * reduction against 1
 **/
inline void from_montgomery_form(const field_t &a, field_t &r)
{
    __mul(a, one_raw, r);
}

/**
 * Get the value of a given bit
 **/
inline bool get_bit(const field_t &a, size_t bit_index)
{
    size_t idx = bit_index / 64;
    size_t shift = bit_index & 63;
    return bool((a.data[idx] >> shift) & 1);
}

/**
 * compute a^b mod q, return result in r
 **/
inline void pow(const field_t &a, const field_t &b, field_t &r)
{
    field_t accumulator;
    copy(a, accumulator);

    bool found_one = false;
    size_t i = 255;
    while (!found_one)
    {
        found_one = get_bit(b, i);
        --i;
    }
    size_t sqr_count = 0;
    for (; i < 256; --i)
    {
        sqr_count++;
        fq::__sqr_without_reduction(accumulator, accumulator);
        if (get_bit(b, i))
        {
            fq::__mul_without_reduction(accumulator, a, accumulator);
        }
    }
    while (gt(accumulator, modulus_plus_one))
    {
        __sub(accumulator, modulus, accumulator);
    }
    copy(accumulator, r);
}

/**
 * compute a^{q - 2} mod q, place result in r
 **/
inline void __invert(field_t &a, field_t &r)
{
    // q - 2
    constexpr field_t modulus_minus_two = {
        0x3C208C16D87CFD45UL,
        0x97816a916871ca8dUL,
        0xb85045b68181585dUL,
        0x30644e72e131a029UL};
    pow(a, modulus_minus_two, r);
}

/**
 * compute a^{(q + 1) / 2}, place result in r
 **/
inline void __sqrt(field_t &a, field_t &r)
{
    // (q + 1) / 2
    constexpr field_t modulus_plus_one_div_two = {
        0x4F082305B61F3F52UL,
        0x65E05AA45A1C72A3UL,
        0x6E14116DA0605617UL,
        0xC19139CB84C680AUL};
    pow(a, modulus_plus_one_div_two, r);
}

/**
 * Get a random field element in montgomery form, place in `r`
 **/
inline field_t random_element()
{
    fq::field_t r;
    int got_entropy = getentropy((void *)r.data, 32);
    ASSERT(got_entropy == 0);
    to_montgomery_form(r, r);
    return r;
}

/**
 * Set `r` to equal 1, in montgomery form
 **/
inline field_t one()
{
    return one_mont;
}

inline field_t zero()
{
    return __zero;
}

/**
 * print `r`
 **/
inline void print(const field_t &a)
{
    printf("fq: [%llx, %llx, %llx, %llx]\n", a.data[0], a.data[1], a.data[2], a.data[3]);
}

inline bool eq(const field_t &a, const field_t &b)
{
    return (a.data[0] == b.data[0]) && (a.data[1] == b.data[1]) && (a.data[2] == b.data[2]) && (a.data[3] == b.data[3]);
}

inline bool iszero(const field_t &a)
{
    return ((a.data[0] == 0) && (a.data[1] == 0) && (a.data[2] == 0) && (a.data[3] == 0));
}
} // namespace fq
} // namespace barretenberg

#endif