#pragma once

#include <stdint.h>
#include <stdio.h>

#include "assert.hpp"
#include "types.hpp"

#ifdef NO_FUNNY_BUSINESS 
    #include "fq_impl_int128.hpp"
#else
    #include "fq_impl_asm.hpp"
#endif

namespace fq
{
constexpr field_t curve_b = { 0x3, 0x0, 0x0, 0x0 };

// compute a * b, put result in r
inline void mul(const uint64_t* a, const uint64_t* b, uint64_t* r);

// compute a * a, put result in r
inline void sqr(const uint64_t* a, const uint64_t* r);

// compute a + b, put result in r
inline void add(const uint64_t* a, const uint64_t* b, uint64_t* r);

// compute a - b, put result in r
inline void sub(const uint64_t* a, const uint64_t* b, uint64_t* r);

/**
 * copy src into dest. AVX implementation requires words to be aligned on 32 byte bounary
 **/ 
inline void copy(const uint64_t* src, uint64_t* dest);

/**
 * Multiply field_t `a` by the cube root of unity, modulo `q`. Store result in `r`
 **/ 
inline void mul_beta(const uint64_t* a, uint64_t* r)
{
    fq::mul(a, beta, r);
}

/**
 * Negate field_t element `a`, mod `q`, place result in `r`
 **/ 
inline void neg(const uint64_t* a, uint64_t* r)
{
    fq::sub(modulus, a, r);
}

/**
 * Convert a field element into montgomery form
 **/ 
inline void to_montgomery_form(const uint64_t *a, uint64_t *r)
{
    copy(a, r);
    while (gt(r, modulus_plus_one))
    {
        sub(r, modulus, r);
    }
    mul(r, &r_squared[0], r);
}

/**
 * Convert a field element out of montgomery form by performing a modular
 * reduction against 1
 **/ 
inline void from_montgomery_form(const uint64_t *a, uint64_t *r)
{
    mul(a, one_raw, r);
}

/**
 * Get the value of a given bit
 **/ 
inline bool get_bit(const uint64_t* a, size_t bit_index)
{
    size_t idx = bit_index / 64;
    size_t shift = bit_index & 63;
    return bool((a[idx] >> shift) & 1);
}

/**
 * compute a^b mod q, return result in r
 **/
inline void pow(const uint64_t* a, const uint64_t* b, uint64_t* r)
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
        fq::sqr(accumulator, accumulator);
        if (get_bit(b, i))
        {
            fq::mul(accumulator, a, accumulator);
        }
    }
    copy(accumulator, r);
}

/**
 * compute a^{q - 2} mod q, place result in r
 **/ 
inline void invert(uint64_t* a, uint64_t* r)
{
    // q - 2
    constexpr field_t modulus_minus_two = {
        0x3C208C16D87CFD45UL,
        0x97816a916871ca8dUL,
        0xb85045b68181585dUL,
        0x30644e72e131a029UL};
     pow(a, modulus_minus_two, r);
}
// 21888242871839275222246405745257275088696311157297823662689037894645226208584
/**
 * compute a^{(q + 1) / 2}, place result in r
 **/ 
inline void sqrt(uint64_t* a, uint64_t* r)
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
inline void random_element(uint64_t* r)
{
    int got_entropy = getentropy((void *)r, 32);
    ASSERT(got_entropy == 0);
    to_montgomery_form(r, r);
}

/**
 * Set `r` to equal 1, in montgomery form
 **/ 
inline void one(uint64_t *r)
{
    copy(one_mont, r);
}

/**
 * print `r`
 **/ 
inline void print(uint64_t* a)
{
    printf("fq: [%lx, %lx, %lx, %lx]\n", a[0], a[1], a[2], a[3]);
}

inline bool eq(uint64_t* a, uint64_t* b)
{
    return (a[0] == b[0]) && (a[1] == b[1]) && (a[2] == b[2]) && (a[3] == b[3]);
}
} // namespace fq
