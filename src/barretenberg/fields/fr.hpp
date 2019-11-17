#ifndef FR
#define FR

#include "inttypes.h"
#include "stdint.h"
#include "stdio.h"
#include "stdlib.h"

#include "../types.hpp"

namespace barretenberg
{
namespace fr
{
constexpr field_t modulus{ { 0x43E1F593F0000001UL, 0x2833E84879B97091UL, 0xB85045B68181585DUL, 0x30644E72E131A029UL } };
namespace internal
{
constexpr uint64_t r_inv = 0xc2e1f593efffffffUL;
}
} // namespace fr
} // namespace barretenberg

#ifdef DISABLE_SHENANIGANS
#include "fr_impl_int128.hpp"
#else
#include "fr_impl_asm.hpp"
#endif

namespace barretenberg
{
namespace fr
{
constexpr field_t r_squared{
    { 0x1BB8E645AE216DA7UL, 0x53FE3AB1E35C59E3UL, 0x8C49833D53BB8085UL, 0x216D0B17F4E44A5UL }
};

// lambda = curve root of unity modulo n, converted to montgomery form
constexpr field_t lambda{ { 0x93e7cede4a0329b3UL, 0x7d4fdca77a96c167UL, 0x8be4ba08b19a750aUL, 0x1cbd5653a5661c25UL } };

constexpr field_t modulus_plus_one{
    { 0x43E1F593F0000002UL, 0x2833E84879B97091UL, 0xB85045B68181585DUL, 0x30644E72E131A029UL }
};

constexpr field_t one_raw{ { 1, 0, 0, 0 } };

constexpr field_t root_of_unity = {
    { 0x636e735580d13d9c, 0xa22bf3742445ffd6, 0x56452ac01eb203d8, 0x1860ef942963f9e7 }
};

constexpr size_t S = 28; // 2^S = maximum degree of a polynomial that's amenable to radix-2 FFT

inline void print(const field_t& a)
{
    printf("fr: [%" PRIx64 ", %" PRIx64 ", %" PRIx64 ", %" PRIx64 "]\n", a.data[0], a.data[1], a.data[2], a.data[3]);
}

// compute a * b mod p, put result in r
inline void __mul(const field_t& a, const field_t& b, field_t& r);

// compute a * b, put result in r. Do not perform final reduction check
inline void __mul_without_reduction(const field_t& a, const field_t& b, const field_t& r);

// compute a * b, put 512-bit result in r
inline void mul_512(const field_t& a, const field_t& b, const field_wide_t& r);

// compute a * a, put result in r
inline void __sqr(const field_t& a, field_t& r);

// compute a * a, put result in r. Do not perform final reduction check
inline void __sqr_without_reduction(const field_t& a, const field_t& r);

// compute a + b, put result in r
inline void __add(const field_t& a, const field_t& b, field_t& r);

// compute a + b, put result in r. Do not perform final reduction check
inline void __add_without_reduction(const field_t& a, const field_t& b, field_t& r);

// compute a + b, put result in r. Do not perform final reduction check
inline void __add_with_coarse_reduction(const field_t& a, const field_t& b, field_t& r);

// compute a - b, put result in r
inline void __sub(const field_t& a, const field_t& b, field_t& r);

// compute a - b, put result in r
inline void __sub_with_coarse_reduction(const field_t& a, const field_t& b, field_t& r);

inline void __conditionally_subtract_double_modulus(const field_t& a, field_t& r, const uint64_t predicate);

inline void __conditional_negate(const fr::field_t& a, field_t& r, const bool predicate);

inline void mul_512(const field_t& a, const field_t& b, field_wide_t& r);

inline field_t add(const field_t& a, const field_t& b)
{
    field_t r;
    __add(a, b, r);
    return r;
}

inline field_t sub(const field_t& a, const field_t& b)
{
    field_t r;
    __sub(a, b, r);
    return r;
}

inline field_t sqr(const field_t& a)
{
    field_t r;
    __sqr(a, r);
    return r;
}

inline field_t mul(const field_t& a, const field_t& b)
{
    field_t r;
    __mul(a, b, r);
    return r;
}

inline void zero(field_t& r);

/**
 * copy src into dest. AVX implementation requires words to be aligned on 32 byte bounary
 **/
inline void copy(const field_t& src, field_t& dest);

inline bool gt(field_t& a, const field_t& b)
{
    bool t0 = a.data[3] > b.data[3];
    bool t1 = (a.data[3] == b.data[3]) && (a.data[2] > b.data[2]);
    bool t2 = (a.data[3] == b.data[3]) && (a.data[2] == b.data[2]) && (a.data[1] > b.data[1]);
    bool t3 =
        (a.data[3] == b.data[3]) && (a.data[2] == b.data[2]) && (a.data[1] == b.data[1]) && (a.data[0] > b.data[0]);
    return (t0 || t1 || t2 || t3);
}

/**
 * Convert a field element into montgomery form
 **/
inline void __to_montgomery_form(const field_t& a, field_t& r)
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
inline void __from_montgomery_form(const field_t& a, field_t& r)
{
    __mul(a, one_raw, r);
    // while (gt(r, modulus_plus_one))
    // {
    //     sub(r, modulus, r);
    // }
}

inline field_t from_montgomery_form(const field_t& a)
{
    field_t r;
    __from_montgomery_form(a, r);
    return r;
}

inline field_t to_montgomery_form(const field_t& a)
{
    field_t r;
    __to_montgomery_form(a, r);
    return r;
}
/**
 * For short Weierstrass curves y^2 = x^3 + b mod r, if there exists a cube root of unity mod r,
 * we can take advantage of an enodmorphism to decompose a 254 bit scalar into 2 128 bit scalars.
 * \beta = cube root of 1, mod q (q = order of fq)
 * \lambda = cube root of 1, mod r (r = order of fr)
 *
 * For a point P1 = (X, Y), where Y^2 = X^3 + b, we know that
 * the point P2 = (X * \beta, Y) is also a point on the curve
 * We can represent P2 as a scalar multiplication of P1, where P2 = \lambda * P1
 *
 * For a generic multiplication of P1 by a 254 bit scalar k, we can decompose k
 * into 2 127 bit scalars (k1, k2), such that k = k1 - (k2 * \lambda)
 *
 * We can now represent (k * P1) as (k1 * P1) - (k2 * P2), where P2 = (X * \beta, Y).
 * As k1, k2 have half the bit length of k, we have reduced the number of loop iterations of our
 * scalar multiplication algorithm in half
 *
 * To find k1, k2, We use the extended euclidean algorithm to find 4 short scalars [a1, a2], [b1, b2] such that
 * modulus = (a1 * b2) - (b1 * a2)
 * We then compube scalars c1 = round(b2 * k / r), c2 = round(b1 * k / r), where
 * k1 = (c1 * a1) + (c2 * a2), k2 = -((c1 * b1) + (c2 * b2))
 * We pre-compute scalars g1 = (2^256 * b1) / n, g2 = (2^256 * b2) / n, to avoid having to perform long division
 * on 512-bit scalars
 **/
inline void split_into_endomorphism_scalars(field_t& k, field_t& k1, field_t& k2)
{
    // uint64_t lambda_reduction[4] = { 0 };
    // __to_montgomery_form(lambda, lambda_reduction);

    constexpr field_t g1 = { { 0x7a7bd9d4391eb18dUL, 0x4ccef014a773d2cfUL, 0x0000000000000002UL, 0 } };

    constexpr field_t g2 = { { 0xd91d232ec7e0b3d7UL, 0x0000000000000002UL, 0, 0 } };

    constexpr field_t minus_b1 = { { 0x8211bbeb7d4f1128UL, 0x6f4d8248eeb859fcUL, 0, 0 } };

    constexpr field_t b2 = { { 0x89d3256894d213e3UL, 0, 0, 0 } };

    field_wide_t c1;
    field_wide_t c2;

    // compute c1 = (g2 * k) >> 256
    mul_512(g2, k, c1);
    // compute c2 = (g1 * k) >> 256
    mul_512(g1, k, c2);
    // (the bit shifts are implicit, as we only utilize the high limbs of c1, c2

    field_wide_t q1;
    field_wide_t q2;
    // TODO remove data duplication
    field_t c1_hi = {
        { c1.data[4], c1.data[5], c1.data[6], c1.data[7] }
    }; // *(field_t*)((uintptr_t)(&c1) + (4 * sizeof(uint64_t)));
    field_t c2_hi = {
        { c2.data[4], c2.data[5], c2.data[6], c2.data[7] }
    }; // *(field_t*)((uintptr_t)(&c2) + (4 * sizeof(uint64_t)));

    // compute q1 = c1 * -b1
    mul_512(c1_hi, minus_b1, q1);
    // compute q2 = c2 * b2
    mul_512(c2_hi, b2, q2);

    field_t t1 = { {
        0,
        0,
        0,
        0,
    } };
    field_t t2 = { {
        0,
        0,
        0,
        0,
    } };
    // TODO: this doesn't have to be a 512-bit multiply...
    field_t q1_lo = {
        { q1.data[0], q1.data[1], q1.data[2], q1.data[3] }
    }; // *(field_t*)((uintptr_t)(&q1) + (4 * sizeof(uint64_t)));
    field_t q2_lo = {
        { q2.data[0], q2.data[1], q2.data[2], q2.data[3] }
    }; // *(field_t*)((uintptr_t)(&q2) + (4 * sizeof(uint64_t)));

    __sub(q2_lo, q1_lo, t1);

    // if k = k'.R
    // and t2 = t2'.R...so, k2 = t1'.R, k1 = t2'.R?
    // __to_montgomery_form(t1, t1);
    __mul(t1, lambda, t2);
    // __from_montgomery_form(t2, t2);
    __add(k, t2, t2);

    k2.data[0] = t1.data[0];
    k2.data[1] = t1.data[1];
    k1.data[0] = t2.data[0];
    k1.data[1] = t2.data[1];
}

inline void normalize(field_t& a, field_t& r)
{
    r.data[0] = a.data[0];
    r.data[1] = a.data[1];
    r.data[2] = a.data[2];
    r.data[3] = a.data[3];
    while (gt(r, modulus_plus_one))
    {
        __sub(r, modulus, r);
    }
}

inline void __mul_lambda(field_t& a, field_t& r)
{
    __mul(a, lambda, r);
}

/**
 * Negate field_t element `a`, mod `q`, place result in `r`
 **/
inline void __neg(const field_t& a, field_t& r)
{
    __sub(modulus, a, r);
}

/**
 * Negate field_t element `a`, mod `q`, place result in `r`
 **/
inline field_t neg(const field_t& a)
{
    field_t r;
    __neg(a, r);
    return r;
}

/**
 * Get a random field element in montgomery form, place in `r`
 **/
inline field_t random_element()
{
    fr::field_t r;
    int got_entropy = getentropy((void*)r.data, 32);
    ASSERT(got_entropy == 0);
    __to_montgomery_form(r, r);
    return r;
}

inline field_t zero()
{
    fr::field_t r;
    fr::zero(r);
    return r;
}

inline bool eq(const field_t& a, const field_t& b)
{
    return (a.data[0] == b.data[0]) && (a.data[1] == b.data[1]) && (a.data[2] == b.data[2]) && (a.data[3] == b.data[3]);
}

inline bool iszero(const field_t& r)
{
    return (r.data[0] == 0) && (r.data[1] == 0) && (r.data[2] == 0) & (r.data[3] == 0);
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
    if (eq(a, zero()))
    {
        copy(zero(), r);
        return;
    }
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
        __sqr(accumulator, accumulator);
        if (get_bit(b, i))
        {
            __mul(accumulator, a, accumulator);
        }
    }
    while (gt(accumulator, modulus_plus_one))
    {
        __sub(accumulator, modulus, accumulator);
    }
    copy(accumulator, r);
}

/**
 * Set `r` to equal 1, in montgomery form
 **/
inline void one(field_t& r)
{
    __to_montgomery_form(one_raw, r);
}

inline void __pow_small(const field_t& a, const size_t exponent, field_t& r)
{
    if (exponent == 0)
    {
        fr::one(r);
        return;
    }
    if (exponent == 1)
    {
        fr::copy(a, r);
        return;
    }
    if (exponent == 2)
    {
        fr::__sqr(a, r);
        return;
    }
    field_t accumulator;
    copy(a, accumulator);

    bool found_one = false;
    size_t i = 63;
    while (!found_one)
    {
        found_one = (exponent >> (i)) & 1;
        --i;
    }
    size_t sqr_count = 0;
    for (; i < 64; --i)
    {
        sqr_count++;
        __sqr(accumulator, accumulator);
        bool bit = (exponent >> (i)) & 1;
        if (bit)
        {
            __mul(accumulator, a, accumulator);
        }
    }
    while (gt(accumulator, modulus_plus_one))
    {
        __sub(accumulator, modulus, accumulator);
    }
    copy(accumulator, r);
}

inline field_t pow_small(const field_t& a, const size_t exponent)
{
    field_t result;
    __pow_small(a, exponent, result);
    return result;
}
/**
 * compute a^{q - 2} mod q, place result in r
 **/
inline void __invert(const field_t& a, field_t& r)
{
    // q - 2
    constexpr field_t modulus_minus_two = {
        0x43E1F593EFFFFFFFUL, 0x2833E84879B97091UL, 0xB85045B68181585DUL, 0x30644E72E131A029UL
    };
    pow(a, modulus_minus_two, r);
}

inline field_t invert(const field_t& a)
{
    field_t r;
    __invert(a, r);
    return r;
}

// TODO: MAKE THESE CONSTEXPR constants
inline field_t one()
{
    fr::field_t r;
    one(r);
    return r;
}

inline field_t neg_one()
{
    fr::field_t r = fr::sub(fr::zero(), fr::one());
    return r;
}

inline field_t multiplicative_generator()
{
    return to_montgomery_form({ { 5, 0, 0, 0 } });
}

inline field_t multiplicative_generator_inverse()
{
    return invert(multiplicative_generator());
}

inline field_t alternate_multiplicative_generator()
{
    return to_montgomery_form({ { 7, 0, 0, 0 } });
}

inline void __get_root_of_unity(const size_t degree, field_t& r)
{
    copy(root_of_unity, r);
    for (size_t i = S; i > degree; --i)
    {
        __sqr(r, r);
    }
}

inline field_t get_root_of_unity(const size_t degree)
{
    field_t r;
    __get_root_of_unity(degree, r);
    return r;
}

inline void batch_invert(field_t* coeffs, size_t n)
{
    fr::field_t* temporaries = (fr::field_t*)aligned_alloc(32, sizeof(fr::field_t) * n);
    field_t accumulator;
    one(accumulator);
    for (size_t i = 0; i < n; ++i)
    {
        copy(accumulator, temporaries[i]);
        __mul(accumulator, coeffs[i], accumulator);
    }
    __invert(accumulator, accumulator);

    field_t T0;
    for (size_t i = n - 1; i < n; --i)
    {
        __mul(accumulator, temporaries[i], T0);
        __mul(accumulator, coeffs[i], accumulator);
        copy(T0, coeffs[i]);
    }
    aligned_free(temporaries);
}

} // namespace fr
} // namespace barretenberg

#endif