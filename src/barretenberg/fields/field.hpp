#pragma once

#include <cinttypes>
#include <cstdint>
#include <cstdio>
#include <unistd.h>

#include "../assert.hpp"
#include "../types.hpp"

// 2: all methods that pass in a reference to the return value should be prefixed by __
// 3: all methods that have a __ prefix, should have a partner method that returns by value

namespace barretenberg {
template <typename FieldParams> class field {
  public:
    struct field_t {
        alignas(32) uint64_t data[4];
    };

    struct field_wide_t {
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

    static constexpr field_t coset_generators[15]{
        {{ FieldParams::coset_generators_0[0], FieldParams::coset_generators_1[0], FieldParams::coset_generators_2[0], FieldParams::coset_generators_3[0] }},
        {{ FieldParams::coset_generators_0[1], FieldParams::coset_generators_1[1], FieldParams::coset_generators_2[1], FieldParams::coset_generators_3[1] }},
        {{ FieldParams::coset_generators_0[2], FieldParams::coset_generators_1[2], FieldParams::coset_generators_2[2], FieldParams::coset_generators_3[2] }},
        {{ FieldParams::coset_generators_0[3], FieldParams::coset_generators_1[3], FieldParams::coset_generators_2[3], FieldParams::coset_generators_3[3] }},
        {{ FieldParams::coset_generators_0[4], FieldParams::coset_generators_1[4], FieldParams::coset_generators_2[4], FieldParams::coset_generators_3[4] }},
        {{ FieldParams::coset_generators_0[5], FieldParams::coset_generators_1[5], FieldParams::coset_generators_2[5], FieldParams::coset_generators_3[5] }},
        {{ FieldParams::coset_generators_0[6], FieldParams::coset_generators_1[6], FieldParams::coset_generators_2[6], FieldParams::coset_generators_3[6] }},
        {{ FieldParams::coset_generators_0[7], FieldParams::coset_generators_1[7], FieldParams::coset_generators_2[7], FieldParams::coset_generators_3[7] }},
        {{ FieldParams::coset_generators_0[8], FieldParams::coset_generators_1[8], FieldParams::coset_generators_2[8], FieldParams::coset_generators_3[8] }},
        {{ FieldParams::coset_generators_0[9], FieldParams::coset_generators_1[9], FieldParams::coset_generators_2[9], FieldParams::coset_generators_3[9] }},
        {{ FieldParams::coset_generators_0[10], FieldParams::coset_generators_1[10], FieldParams::coset_generators_2[10], FieldParams::coset_generators_3[10] }},
        {{ FieldParams::coset_generators_0[11], FieldParams::coset_generators_1[11], FieldParams::coset_generators_2[11], FieldParams::coset_generators_3[11] }},
        {{ FieldParams::coset_generators_0[12], FieldParams::coset_generators_1[12], FieldParams::coset_generators_2[12], FieldParams::coset_generators_3[12] }},
        {{ FieldParams::coset_generators_0[13], FieldParams::coset_generators_1[13], FieldParams::coset_generators_2[13], FieldParams::coset_generators_3[13] }},
        {{ FieldParams::coset_generators_0[14], FieldParams::coset_generators_1[14], FieldParams::coset_generators_2[14], FieldParams::coset_generators_3[14] }},
    };
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
    static void __conditionally_subtract_from_double_modulus(const field_t& a,
                                                             field_t& r,
                                                             const uint64_t predicate) noexcept;
    static void __conditionally_negate_self(field_t& r, const uint64_t predicate) noexcept;
    // compute a * b, put 512-bit result in r (do not reduce)
    static void __mul_512(const field_t& a, const field_t& b, field_wide_t& r) noexcept;

    // Multiply field_t `a` by the cube root of unity, modulo `q`. Store result in `r`
    static inline void __mul_beta(const field_t& a, field_t& r) noexcept { __mul(a, beta, r); }
    static inline void __neg(const field_t& a, field_t& r) noexcept { __sub(modulus, a, r); }

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
    static inline bool is_msb_set(const field_t& a) noexcept { return (a.data[3] >> 63ULL) == 1ULL; }
    static inline uint64_t is_msb_set_word(const field_t& a) noexcept { return a.data[3] >> 63ULL; }
    static inline void __set_msb(field_t& a) noexcept { a.data[3] = 0ULL | (1ULL << 63ULL); }

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
        while (gt(r, modulus_plus_one)) {
            __sub(r, modulus, r);
        }
        __mul(r, r_squared, r);
    }
    static inline void __from_montgomery_form(const field_t& a, field_t& r) noexcept { __mul(a, one_raw, r); }

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
    static inline void __pow(const field_t& a, const field_t& b, field_t& r)
    {
        if (eq(a, zero)) {
            __copy(zero, r);
            return;
        }
        field_t accumulator;
        __copy(a, accumulator);
        bool found_one = false;
        size_t i = 255;
        while (!found_one) {
            found_one = get_bit(b, i);
            --i;
        }
        size_t sqr_count = 0;
        for (; i < 256; --i) {
            sqr_count++;
            __sqr(accumulator, accumulator);
            if (get_bit(b, i)) {
                __mul(accumulator, a, accumulator);
            }
        }
        while (gt(accumulator, modulus_plus_one)) {
            __sub(accumulator, modulus, accumulator);
        }
        __copy(accumulator, r);
    }

    static inline void __pow_small(const field_t& a, const uint64_t exponent, field_t& r)
    {
        if (exponent == 0) {
            __copy(one, r);
            return;
        }
        if (exponent == 1) {
            __copy(a, r);
            return;
        }
        if (exponent == 2) {
            __sqr(a, r);
            return;
        }
        field_t accumulator;
        __copy(a, accumulator);

        bool found_one = false;
        size_t i = 63;
        while (!found_one) {
            found_one = (exponent >> (i)) & 1;
            --i;
        }
        size_t sqr_count = 0;
        for (; i < 64; --i) {
            sqr_count++;
            __sqr(accumulator, accumulator);
            bool bit = (exponent >> (i)) & 1;
            if (bit) {
                __mul(accumulator, a, accumulator);
            }
        }
        while (gt(accumulator, modulus_plus_one)) {
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
    static inline void __invert(const field_t& a, field_t& r) { __pow(a, modulus_minus_two, r); }

    static inline field_t invert(const field_t& a)
    {
        field_t r;
        __invert(a, r);
        return r;
    }

    static inline void __tonelli_shanks_sqrt(const field_t& a, field_t& r)
    {
        // Tonelli-shanks algorithm begins by finding a field element Q and integer S,
        // such that (p - 1) = Q.2^{s}

        // We can compute the square root of a, by considering a^{(Q + 1) / 2} = R
        // Once we have found such an R, we have
        // R^{2} = a^{Q + 1} = a^{Q}a
        // If a^{Q} = 1, we have found our square root.
        // Otherwise, we have a^{Q} = t, where t is a 2^{s-1}'th root of unity.
        // This is because t^{2^{s-1}} = a^{Q.2^{s-1}}.
        // We know that (p - 1) = Q.w^{s}, therefore t^{2^{s-1}} = a^{(p - 1) / 2}
        // From Euler's criterion, if a is a quadratic residue, a^{(p - 1) / 2} = 1
        // i.e. t^{2^{s-1}} = 1

        // To proceed with computing our square root, we want to transform t into a smaller subgroup,
        // specifically, the (s-2)'th roots of unity.
        // We do this by finding some value b,such that
        // (t.b^2)^{2^{s-2}} = 1 and R' = R.b
        // Finding such a b is trivial, because from Euler's criterion, we know that,
        // for any quadratic non-residue z, z^{(p - 1) / 2} = -1
        // i.e. z^{Q.2^{s-1}} = -1
        // => z^Q is a 2^{s-1}'th root of -1
        // => z^{Q^2} is a 2^{s-2}'th root of -1
        // Since t^{2^{s-1}} = 1, we know that t^{2^{s - 2}} = -1
        // => t.z^{Q^2} is a 2^{s - 2}'th root of unity.

        // We can iteratively transform t into ever smaller subgroups, until t = 1.
        // At each iteration, we need to find a new value for b, which we can obtain
        // by repeatedly squaring z^{Q}
        field_t Q_minus_one_over_two{ { FieldParams::Q_minus_one_over_two_0,
                                        FieldParams::Q_minus_one_over_two_1,
                                        FieldParams::Q_minus_one_over_two_2,
                                        FieldParams::Q_minus_one_over_two_3 } };
        // __to_montgomery_form(Q_minus_one_over_two, Q_minus_one_over_two);
        field_t z = multiplicative_generator; // the generator is a non-residue
        field_t b;
        __pow(a, Q_minus_one_over_two, b); // compute a^{(Q - 1 )/ 2}
        r = mul(a, b);                     // r = a^{(Q + 1) / 2}
        field_t t = mul(r, b);             // t = a^{(Q - 1) / 2 + (Q + 1) / 2} = a^{Q}

        // check if t is a square with euler's criterion
        // if not, we don't have a quadratic residue and a has no square root!
        field_t check = t;
        for (size_t i = 0; i < FieldParams::primitive_root_log_size - 1; ++i) {
            __sqr(check, check);
        }
        if (!eq(check, one)) {
            r = zero;
            return;
        }
        field_t t1;
        __pow(z, Q_minus_one_over_two, t1);
        field_t t2 = mul(t1, z);
        field_t c = mul(t2, t1); // z^Q

        size_t m = FieldParams::primitive_root_log_size;
        while (!eq(t, one)) {
            size_t i = 0;
            field_t t2m = t;

            // find the smallest value of m, such that t^{2^m} = 1
            while (!eq(t2m, one)) {
                __sqr(t2m, t2m);
                i += 1;
            }

            size_t j = m - i - 1;
            b = c;
            while (j > 0) {
                __sqr(b, b);
                --j;
            } // b = z^2^(m-i-1)

            c = sqr(b);
            t = mul(t, c);
            r = mul(r, b);
            m = i;
        }
    }

    /**
     * compute a^{(q + 1) / 4}, place result in r
     **/
    static inline void __sqrt(const field_t& a, field_t& r)
    {
        // if p = 3 mod 4, use exponentiation trick
        if constexpr ((FieldParams::modulus_0 & 0x3UL) == 0x3UL) {
            __pow(a, sqrt_exponent, r);
        } else {
            __tonelli_shanks_sqrt(a, r);
        }
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
        constexpr field_t endo_g1 = {
            { FieldParams::endo_g1_lo, FieldParams::endo_g1_mid, FieldParams::endo_g1_hi, 0 }
        };

        constexpr field_t endo_g2 = { { FieldParams::endo_g2_lo, FieldParams::endo_g2_mid, 0, 0 } };

        constexpr field_t endo_minus_b1 = { { FieldParams::endo_minus_b1_lo, FieldParams::endo_minus_b1_mid, 0, 0 } };

        constexpr field_t endo_b2 = { { FieldParams::endo_b2_lo, FieldParams::endo_b2_mid, 0, 0 } };

        field_wide_t c1;
        field_wide_t c2;

        // compute c1 = (g2 * k) >> 256
        __mul_512(endo_g2, k, c1);
        // compute c2 = (g1 * k) >> 256
        __mul_512(endo_g1, k, c2);
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
        __mul_512(c1_hi, endo_minus_b1, q1);
        // compute q2 = c2 * b2
        __mul_512(c2_hi, endo_b2, q2);

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
        for (size_t i = FieldParams::primitive_root_log_size; i > degree; --i) {
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
        for (size_t i = 0; i < n; ++i) {
            __copy(accumulator, temporaries[i]);
            __mul(accumulator, coeffs[i], accumulator);
        }
        __invert(accumulator, accumulator);

        field_t T0;
        for (size_t i = n - 1; i < n; --i) {
            __mul(accumulator, temporaries[i], T0);
            __mul(accumulator, coeffs[i], accumulator);
            __copy(T0, coeffs[i]);
        }
        aligned_free(temporaries);
    }


    static inline void compute_coset_generators(const size_t n, const uint64_t subgroup_size, field_t* result)
    {
        if (n > 0)
        {
            result[0] = (multiplicative_generator);
        }
        field_t work_variable = add(multiplicative_generator, one);

        size_t count = 1;
        while (count < n)
        {
            // work_variable contains a new field element, and we need to test that, for all previous vector elements,
            // result[i] / work_variable is not a member of our subgroup
            field_t work_inverse = invert(work_variable);
            bool valid = true;
            for (size_t j = 0; j < count; ++j)
            {
                field_t target_element = mul(result[j], work_inverse);
                field_t subgroup_check = pow_small(target_element, subgroup_size);
                if (eq(subgroup_check, one))
                {
                    valid = false;
                    break;
                }
            }
            if (valid)
            {
                result[count] = (work_variable);
                ++count;
            }
            __add(work_variable, one, work_variable);
        }
    }
}; // class field

} // namespace barretenberg

#ifdef DISABLE_SHENANIGANS
#include "field_impl_int128.tcc"
#else
#include "field_impl_asm.tcc"
#endif
