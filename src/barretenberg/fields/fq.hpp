#pragma once

#include "stdint.h"
#include "stdio.h"

#include "../assert.hpp"
#include "../types.hpp"

#ifdef NO_FUNNY_BUSINESS 
    #include "fq_impl_int128.hpp"
#else
    #include "fq_impl_asm.hpp"
#endif

namespace fq
{
constexpr field_t curve_b = { .data = { 0x3, 0x0, 0x0, 0x0 } };

// compute a * b, put result in r
inline void mul(const field_t& a, const field_t& b, const field_t& r);

// compute a * b, put result in r. Do not perform final reduction check
inline void mul_without_reduction(const field_t& a, const field_t& b, const field_t& r);

// compute a * a, put result in r
inline void sqr(const field_t& a, const field_t& r);

// compute a * a, put result in r. Do not perform final reduction check
inline void sqr_without_reduction(const field_t& a, const field_t& r);

// compute a + b, put result in r
inline void add(const field_t& a, const field_t& b, field_t& r);

// compute a + b, put result in r. Do not perform final reduction check
inline void add_without_reduction(const field_t& a, const field_t& b, field_t& r);

// quadruple a, perform a reduction check that reduces to either (r mod p) or p + (r mod p)
inline void quad_with_partial_reduction(const field_t& a, const field_t& r);

// compute a - b, put result in r
inline void sub(const field_t& a, const field_t& b, field_t& r);

/**
 * copy src into dest. AVX implementation requires words to be aligned on 32 byte bounary
 **/ 
inline void copy(const field_t& src, field_t& dest);


inline bool gt(const field_t& a, const field_t& b)
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
inline void mul_beta(const field_t& a, field_t& r)
{
    fq::mul(a, beta, r);
}

/**
 * Negate field_t element `a`, mod `q`, place result in `r`
 **/ 
inline void neg(const field_t& a, field_t& r)
{
    fq::sub(modulus, a, r);
}

/**
 * Convert a field element into montgomery form
 **/ 
inline void to_montgomery_form(const field_t& a, field_t& r)
{
    copy(a, r);
    while (gt(r, modulus_plus_one))
    {
        sub(r, modulus, r);
    }
    mul(r, r_squared, r);
}

/**
 * Convert a field element out of montgomery form by performing a modular
 * reduction against 1
 **/ 
inline void from_montgomery_form(const field_t& a, field_t& r)
{
    mul(a, one_raw, r);
}

/**
 * Get the value of a given bit
 **/ 
inline bool get_bit(const field_t& a, size_t bit_index)
{
    size_t idx = bit_index / 64;
    size_t shift = bit_index & 63;
    return bool((a.data[idx] >> shift) & 1);
}

/**
 * compute a^b mod q, return result in r
 **/
inline void pow(const field_t& a, const field_t& b, field_t& r)
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
        fq::sqr_without_reduction(accumulator, accumulator);
        if (get_bit(b, i))
        {
            fq::mul_without_reduction(accumulator, a, accumulator);
        }
    }
    while (gt(accumulator, modulus_plus_one))
    {
        sub(accumulator, modulus, accumulator);
    }
    copy(accumulator, r);
}

/**
 * compute a^{q - 2} mod q, place result in r
 **/ 
inline void invert(field_t& a, field_t& r)
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
inline void sqrt(field_t& a, field_t& r)
{
    // (q + 1) / 2
    constexpr field_t modulus_plus_one_div_two = {
        0x4F082305B61F3F52UL,
        0x65E05AA45A1C72A3UL,
        0x6E14116DA0605617UL,
        0xC19139CB84C680AUL  
    };
    pow(a, modulus_plus_one_div_two, r);
}

/**
 * Get a random field element in montgomery form, place in `r`
 **/ 
inline void random_element(field_t& r)
{
    int got_entropy = getentropy((void *)r.data, 32);
    ASSERT(got_entropy == 0);
    to_montgomery_form(r, r);
}

/**
 * Set `r` to equal 1, in montgomery form
 **/ 
inline void one(field_t& r)
{
    copy(one_mont, r);
}

inline void zero(field_t& r)
{
    r.data[0] = 0;
    r.data[1] = 0;
    r.data[2] = 0;
    r.data[3] = 0;
}
/**
 * print `r`
 **/ 
inline void print(const field_t& a)
{
    printf("fq: [%lx, %lx, %lx, %lx]\n", a.data[0], a.data[1], a.data[2], a.data[3]);
}

inline bool eq(const field_t& a, const field_t& b)
{
    return (a.data[0] == b.data[0]) && (a.data[1] == b.data[1]) && (a.data[2] == b.data[2]) && (a.data[3] == b.data[3]);
}

inline bool iszero(const field_t& a)
{
    return ((a.data[0] == 0) && (a.data[1] == 0) && (a.data[2] == 0) && (a.data[3] == 0));
}
} // namespace fq
