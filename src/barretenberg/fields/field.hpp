#pragma once

#include <cinttypes>
#include <cstdint>
#include <cstdio>
#include <unistd.h>

#include "../assert.hpp"
#include "../types.hpp"

// 2: all methods that pass in a reference to the return value should be prefixed by __
// 3: all methods that have a __ prefix, should have a partner method that returns by value

namespace barretenberg
{
template <typename FieldParams> class field
{
  public:
    struct field_t
    {
        alignas(32) uint64_t data[4];
    };

    struct field_wide_t
    {
        alignas(64) uint64_t data[8];
    };

    static constexpr field_t modulus = {
        { FieldParams::modulus_0, FieldParams::modulus_1, FieldParams::modulus_2, FieldParams::modulus_3 }
    };
    static constexpr field_t twice_modulus = { { FieldParams::twice_modulus_0,
                                                 FieldParams::twice_modulus_1,
                                                 FieldParams::twice_modulus_2,
                                                 FieldParams::twice_modulus_3 } };
    static constexpr field_t zero{ { 0x00, 0x00, 0x00, 0x00 } };
    static constexpr field_t two_inv{
        { FieldParams::two_inv_0, FieldParams::two_inv_1, FieldParams::two_inv_2, FieldParams::two_inv_3 }
    };
    static constexpr field_t modulus_plus_one{
        { FieldParams::modulus_0 + 1ULL, FieldParams::modulus_1, FieldParams::modulus_2, FieldParams::modulus_3 }
    };
    static constexpr field_t modulus_minus_two = {
        { FieldParams::modulus_0 - 2ULL, FieldParams::modulus_1, FieldParams::modulus_2, FieldParams::modulus_3 }
    };
    static constexpr field_t sqrt_exponent = { { FieldParams::sqrt_exponent_0,
                                                 FieldParams::sqrt_exponent_1,
                                                 FieldParams::sqrt_exponent_2,
                                                 FieldParams::sqrt_exponent_3 } };
    static constexpr field_t r_squared{
        { FieldParams::r_squared_0, FieldParams::r_squared_1, FieldParams::r_squared_2, FieldParams::r_squared_3 }
    };
    static constexpr field_t one_raw{ { 1ULL, 0ULL, 0ULL, 0ULL } };
    static constexpr field_t one{
        { FieldParams::one_mont_0, FieldParams::one_mont_1, FieldParams::one_mont_2, FieldParams::one_mont_3 }
    };
    static constexpr field_t beta{
        { FieldParams::cube_root_0, FieldParams::cube_root_1, FieldParams::cube_root_2, FieldParams::cube_root_3 }
    };
    static constexpr field_t multiplicative_generator{ { FieldParams::multiplicative_generator_0,
                                                         FieldParams::multiplicative_generator_1,
                                                         FieldParams::multiplicative_generator_2,
                                                         FieldParams::multiplicative_generator_3 } };
    static constexpr field_t multiplicative_generator_inverse{ { FieldParams::multiplicative_generator_inverse_0,
                                                                 FieldParams::multiplicative_generator_inverse_1,
                                                                 FieldParams::multiplicative_generator_inverse_2,
                                                                 FieldParams::multiplicative_generator_inverse_3 } };
    static constexpr field_t alternate_multiplicative_generator{
        { FieldParams::alternate_multiplicative_generator_0,
          FieldParams::alternate_multiplicative_generator_1,
          FieldParams::alternate_multiplicative_generator_2,
          FieldParams::alternate_multiplicative_generator_3 }
    };
    static constexpr field_t root_of_unity{ { FieldParams::primitive_root_0,
                                              FieldParams::primitive_root_1,
                                              FieldParams::primitive_root_2,
                                              FieldParams::primitive_root_3 } };

    /**
     * Arithmetic Methods (with return parameters)
     *
     * We pass in return value as a parameter, so that the input references and
     * the output references can overlap, without affecting performance.
     *
     * The 'without reduction' methods do not perform a conditional check on the result,
     * to determine whether the value exceeds our modulus p.
     *
     * The 'with coarse reduction' methods will constrain the result to be modulo 2p
     **/
    static void __mul(const field_t& a, const field_t& b, field_t& r) noexcept;

    static void __mul_with_coarse_reduction(const field_t& a, const field_t& b, field_t& r) noexcept;
    static void __sqr(const field_t& a, field_t& r) noexcept;
    static void __sqr_with_coarse_reduction(const field_t& a, field_t& r) noexcept;
    static void __add(const field_t& a, const field_t& b, field_t& r) noexcept;
    static void __add_without_reduction(const field_t& a, const field_t& b, field_t& r) noexcept;
    static void __add_with_coarse_reduction(const field_t& a, const field_t& b, field_t& r) noexcept;
    static void __quad_with_coarse_reduction(const field_t& a, field_t& r) noexcept;
    static void __oct_with_coarse_reduction(const field_t& a, field_t& r) noexcept;
    static void __paralell_double_and_add_without_reduction(field_t& x_0,
                                                            const field_t& y_0,
                                                            const field_t& y_1,
                                                            field_t& r) noexcept;
    static void __sub(const field_t& a, const field_t& b, field_t& r) noexcept;
    static void __sub_with_coarse_reduction(const field_t& a, const field_t& b, field_t& r) noexcept;
    static void __conditionally_subtract_double_modulus(const field_t& a,
                                                        field_t& r,
                                                        const uint64_t predicate) noexcept;

    // compute a * b, put 512-bit result in r (do not reduce)
    static void __mul_512(const field_t& a, const field_t& b, field_wide_t& r) noexcept;

    // Multiply field_t `a` by the cube root of unity, modulo `q`. Store result in `r`
    static inline void __mul_beta(const field_t& a, field_t& r) noexcept
    {
        __mul(a, beta, r);
    }
    static inline void __neg(const field_t& a, field_t& r) noexcept
    {
        __sub(modulus, a, r);
    }

    /**
     * Arithmetic Methods (return by value)
     **/

    inline static field_t mul(const field_t& a, const field_t& b) noexcept
    {
        field_t r;
        __mul(a, b, r);
        return r;
    }
    inline static field_t sqr(const field_t& a) noexcept
    {
        field_t r;
        __sqr(a, r);
        return r;
    }
    inline static field_t add(const field_t& a, const field_t& b) noexcept
    {
        field_t r;
        __add(a, b, r);
        return r;
    }
    inline static field_t sub(const field_t& a, const field_t& b) noexcept
    {
        field_t r;
        __sub(a, b, r);
        return r;
    }
    static inline field_t neg(const field_t& a) noexcept
    {
        field_t r;
        __neg(a, r);
        return r;
    }
    static inline field_t neg_one() noexcept
    {
        field_t r = sub(zero, one);
        return r;
    }

    /**
     * Comparison methods and bit operations
     **/
    static inline bool eq(const field_t& a, const field_t& b) noexcept
    {
        return (a.data[0] == b.data[0]) && (a.data[1] == b.data[1]) && (a.data[2] == b.data[2]) &&
               (a.data[3] == b.data[3]);
    }
    static inline bool is_zero(const field_t& a) noexcept
    {
        return ((a.data[0] | a.data[1] | a.data[2] | a.data[3]) == 0);
    }

    static inline bool gt(const field_t& a, const field_t& b) noexcept
    {
        bool t0 = a.data[3] > b.data[3];
        bool t1 = (a.data[3] == b.data[3]) && (a.data[2] > b.data[2]);
        bool t2 = (a.data[3] == b.data[3]) && (a.data[2] == b.data[2]) && (a.data[1] > b.data[1]);
        bool t3 =
            (a.data[3] == b.data[3]) && (a.data[2] == b.data[2]) && (a.data[1] == b.data[1]) && (a.data[0] > b.data[0]);
        return (t0 || t1 || t2 || t3);
    }
    static inline bool get_bit(const field_t& a, size_t bit_index) noexcept
    {
        size_t idx = bit_index >> 6;
        size_t shift = bit_index & 63;
        return bool((a.data[idx] >> shift) & 1);
    }
    static inline bool is_msb_set(const field_t& a) noexcept
    {
        return (a.data[3] >> 63ULL) == 1ULL;
    }
    static inline uint64_t is_msb_set_word(const field_t& a) noexcept
    {
        return a.data[3] >> 63ULL;
    }
    static inline void __set_msb(field_t& a) noexcept
    {
        a.data[3] = 0ULL | (1ULL << 63ULL);
    }

    /**
     * Copy methods
     **/
    static void __swap(field_t& src, field_t& dest) noexcept;

    // AVX implementation requires words to be aligned on 32 byte bounary
    static void __copy(const field_t& a, field_t& r) noexcept;

    static field_t copy(const field_t& src) noexcept
    {
        field_t r;
        __copy(src, r);
        return r;
    }

    /**
     * Montgomery modular reduction methods
     **/
    static void reduce_once(const field_t& a, field_t& r) noexcept;

    static inline void __to_montgomery_form(const field_t& a, field_t& r) noexcept
    {
        __copy(a, r);
        while (gt(r, modulus_plus_one))
        {
            __sub(r, modulus, r);
        }
        __mul(r, r_squared, r);
    }
    static inline void __from_montgomery_form(const field_t& a, field_t& r) noexcept
    {
        __mul(a, one_raw, r);
    }

    static inline field_t to_montgomery_form(const field_t& a) noexcept
    {
        field_t r;
        __to_montgomery_form(a, r);
        return r;
    }
    static inline field_t from_montgomery_form(const field_t& a) noexcept
    {
        field_t r;
        __from_montgomery_form(a, r);
        return r;
    }

    /**
     * Algorithms
     **/

    /**
     * compute a^b mod q, return result in r
     **/
    static inline void pow(const field_t& a, const field_t& b, field_t& r)
    {
        if (eq(a, zero))
        {
            __copy(zero, r);
            return;
        }
        field_t accumulator;
        __copy(a, accumulator);
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
        __copy(accumulator, r);
    }

    static inline void __pow_small(const field_t& a, const size_t exponent, field_t& r)
    {
        if (exponent == 0)
        {
            __copy(one, r);
            return;
        }
        if (exponent == 1)
        {
            __copy(a, r);
            return;
        }
        if (exponent == 2)
        {
            __sqr(a, r);
            return;
        }
        field_t accumulator;
        __copy(a, accumulator);

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
        __copy(accumulator, r);
    }

    static inline field_t pow_small(const field_t& a, const size_t exponent)
    {
        field_t result;
        __pow_small(a, exponent, result);
        return result;
    }
    /**
     * compute a^{q - 2} mod q, place result in r
     **/
    static inline void __invert(const field_t& a, field_t& r)
    {
        pow(a, modulus_minus_two, r);
    }

    static inline field_t invert(const field_t& a)
    {
        field_t r;
        __invert(a, r);
        return r;
    }

    /**
     * compute a^{(q + 1) / 2}, place result in r
     **/
    static inline void __sqrt(const field_t& a, field_t& r)
    {
        pow(a, sqrt_exponent, r);
    }

    /**
     * Get a random field element in montgomery form, place in `r`
     **/
    static inline field_t random_element()
    {
        field_t r;
        int got_entropy = getentropy((void*)r.data, 32);
        ASSERT(got_entropy == 0);
        __to_montgomery_form(r, r);
        return r;
    }

    /**
     * print `r`
     **/
    static inline void print(const field_t& a)
    {
        printf("field: [%" PRIx64 ", %" PRIx64 ", %" PRIx64 ", %" PRIx64 "]\n",
               a.data[0],
               a.data[1],
               a.data[2],
               a.data[3]);
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
    static inline void split_into_endomorphism_scalars(field_t& k, field_t& k1, field_t& k2)
    {
        // uint64_t lambda_reduction[4] = { 0 };
        // __to_montgomery_form(lambda, lambda_reduction);

        // TODO: these parameters only work for the bn254 coordinate field.
        // Need to shift into FieldParams and calculate correct constants for the subgroup field
        constexpr field_t g1 = { { 0x7a7bd9d4391eb18dUL, 0x4ccef014a773d2cfUL, 0x0000000000000002UL, 0 } };

        constexpr field_t g2 = { { 0xd91d232ec7e0b3d7UL, 0x0000000000000002UL, 0, 0 } };

        constexpr field_t minus_b1 = { { 0x8211bbeb7d4f1128UL, 0x6f4d8248eeb859fcUL, 0, 0 } };

        constexpr field_t b2 = { { 0x89d3256894d213e3UL, 0, 0, 0 } };

        field_wide_t c1;
        field_wide_t c2;

        // compute c1 = (g2 * k) >> 256
        __mul_512(g2, k, c1);
        // compute c2 = (g1 * k) >> 256
        __mul_512(g1, k, c2);
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
        __mul_512(c1_hi, minus_b1, q1);
        // compute q2 = c2 * b2
        __mul_512(c2_hi, b2, q2);

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
        __mul(t1, beta, t2);
        // __from_montgomery_form(t2, t2);
        __add(k, t2, t2);

        k2.data[0] = t1.data[0];
        k2.data[1] = t1.data[1];
        k1.data[0] = t2.data[0];
        k1.data[1] = t2.data[1];
    }

    static inline void __get_root_of_unity(const size_t degree, field_t& r)
    {
        __copy(root_of_unity, r);
        for (size_t i = FieldParams::primitive_root_log_size; i > degree; --i)
        {
            __sqr(r, r);
        }
    }

    static inline field_t get_root_of_unity(const size_t degree)
    {
        field_t r;
        __get_root_of_unity(degree, r);
        return r;
    }

    static inline void batch_invert(field_t* coeffs, size_t n)
    {
        field_t* temporaries = (field_t*)aligned_alloc(32, sizeof(field_t) * n);
        field_t accumulator = one;
        for (size_t i = 0; i < n; ++i)
        {
            __copy(accumulator, temporaries[i]);
            __mul(accumulator, coeffs[i], accumulator);
        }
        __invert(accumulator, accumulator);

        field_t T0;
        for (size_t i = n - 1; i < n; --i)
        {
            __mul(accumulator, temporaries[i], T0);
            __mul(accumulator, coeffs[i], accumulator);
            __copy(T0, coeffs[i]);
        }
        aligned_free(temporaries);
    }
}; // class field

} // namespace barretenberg

#ifdef DISABLE_SHENANIGANS
#include "field_impl_int128.tcc"
#else
#include "field_impl_asm.tcc"
#endif
