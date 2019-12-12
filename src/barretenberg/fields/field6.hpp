#pragma once

namespace barretenberg
{
template <typename base_field, typename Fq6Params> class field6
{
  public:
    struct field_t
    {
        typename base_field::field_t c0;
        typename base_field::field_t c1;
        typename base_field::field_t c2;
    };

    static constexpr field_t zero{ base_field::zero, base_field::zero, base_field::zero };
    static constexpr field_t one{ base_field::one, base_field::zero, base_field::zero };

    static inline void __mul_by_non_residue(const typename base_field::field_t& a, typename base_field::field_t& r)
    {
        Fq6Params::__mul_by_non_residue(a, r);
    }

    static inline void __add(const field_t& a, const field_t& b, field_t& r)
    {
        base_field::__add(a.c0, b.c0, r.c0);
        base_field::__add(a.c1, b.c1, r.c1);
        base_field::__add(a.c2, b.c2, r.c2);
    }

    static inline void __sub(const field_t& a, const field_t& b, field_t& r)
    {
        base_field::__sub(a.c0, b.c0, r.c0);
        base_field::__sub(a.c1, b.c1, r.c1);
        base_field::__sub(a.c2, b.c2, r.c2);
    }

    static inline void __neg(const field_t& a, field_t& r)
    {
        base_field::__neg(a.c0, r.c0);
        base_field::__neg(a.c1, r.c1);
        base_field::__neg(a.c2, r.c2);
    }

    static inline void __mul(const field_t& a, const field_t& b, field_t& r)
    {
        /* Devegili OhEig Scott Dahab --- Multiplication and Squaring on Pairing-Friendly Fields.pdf; Section 4
         * (Karatsuba) */
        typename base_field::field_t T0;
        typename base_field::field_t T1;
        typename base_field::field_t T2;
        typename base_field::field_t T3;
        typename base_field::field_t T4;
        typename base_field::field_t T5;
        typename base_field::field_t T6;

        // T0 = a.c0*b.c0
        base_field::__mul(a.c0, b.c0, T0);

        // T1 = a.c1*b.c1
        base_field::__mul(a.c1, b.c1, T1);

        // T2 = a.c2*b.c2
        base_field::__mul(a.c2, b.c2, T2);

        // T3 = (a.c0 + a.c2)
        base_field::__add(a.c0, a.c2, T3);

        // T4 = (b.c0 + b.c2)
        base_field::__add(b.c0, b.c2, T4);

        // T3 = (a.c0 + a.c2)(b.c0 + b.c2)
        base_field::__mul(T3, T4, T3);

        // T4 = (a.c0 + a.c1)
        base_field::__add(a.c0, a.c1, T4);

        // T5 = (b.c0 + b.c1)
        base_field::__add(b.c0, b.c1, T5);

        // T4 = (a.c0 + a.c1)(b.c0 + b.c1);
        base_field::__mul(T4, T5, T4);

        // T5 = (a.c1 + a.c2)
        base_field::__add(a.c1, a.c2, T5);

        // T6 = (b.c1 + b.c2)
        base_field::__add(b.c1, b.c2, T6);

        // T5 = (a.c1 + a.c2)(b.c1 + b.c2)
        base_field::__mul(T5, T6, T5);

        // T6 = (T1 + T2)
        base_field::__add(T1, T2, T6);

        // T5 = T5 - (T1 + T2)
        base_field::__sub(T5, T6, T5);

        // T5 = non_residue * T5
        Fq6Params::__mul_by_non_residue(T5, T5);

        // r.c0 = (a.c0*b.c0 + \beta(a.c1*b.c2 + a.c2*b.c1))
        base_field::__add(T0, T5, r.c0);

        // T5 = (T0 + T1)
        base_field::__add(T0, T1, T5);

        // T4 = T4 - T5
        base_field::__sub(T4, T5, T4);

        // r.c1 = non_residue * T2
        Fq6Params::__mul_by_non_residue(T2, r.c1);

        // r.c1 = T4 + non_residue * T2
        base_field::__add(r.c1, T4, r.c1);

        // T4 = (T0 + T2)
        base_field::__add(T0, T2, T4);

        // T4 = T4 - T1
        base_field::__sub(T4, T1, T4);

        // r.c2 = T3 - T4
        base_field::__sub(T3, T4, r.c2);
    }

    static inline void __sqr(const field_t& a, field_t& r)
    {
        /* Devegili OhEig Scott Dahab --- Multiplication and Squaring on Pairing-Friendly Fields.pdf; Section 4
         * (CH-SQR2) */
        typename base_field::field_t S0;
        typename base_field::field_t S1;
        typename base_field::field_t S2;
        typename base_field::field_t S3;
        typename base_field::field_t S4;
        typename base_field::field_t AB;
        typename base_field::field_t BC;

        // S0 = a.c0*a.c0
        base_field::__sqr(a.c0, S0);

        // AB = a.c0*a.c1
        base_field::__mul(a.c0, a.c1, AB);

        // S1 = 2AB
        base_field::__add(AB, AB, S1);

        // S2 = a.c0 + a.c2
        base_field::__add(a.c0, a.c2, S2);

        // S2 = a.c0 + a.c2 - a.c1
        base_field::__sub(S2, a.c1, S2);

        // S2 = S2*S2
        base_field::__sqr(S2, S2);

        // BC = a.c1*a.c2
        base_field::__mul(a.c1, a.c2, BC);

        // S3 = 2BC
        base_field::__add(BC, BC, S3);

        // S4 = a.c2*a.c2
        base_field::__sqr(a.c2, S4);

        // r.c0 = non_residue * s3
        Fq6Params::__mul_by_non_residue(S3, r.c0);

        // r.c0 = r.c0 + s0
        base_field::__add(r.c0, S0, r.c0);

        // r.c1 = non_residue * S4
        Fq6Params::__mul_by_non_residue(S4, r.c1);

        // r.c1 = r.c1 + S1
        base_field::__add(r.c1, S1, r.c1);

        // r.c2 = s1 + s2 + s3 - s0 - s4
        base_field::__add(S1, S2, r.c2);
        base_field::__add(r.c2, S3, r.c2);
        base_field::__sub(r.c2, S0, r.c2);
        base_field::__sub(r.c2, S4, r.c2);
    }

    static inline void __invert(const field_t& a, field_t& r)
    {
        /* From "High-Speed Software Implementation of the Optimal Ate Pairing over Barreto-Naehrig Curves"; Algorithm
         * 17 */
        typename base_field::field_t T0;
        typename base_field::field_t T1;
        typename base_field::field_t T2;
        typename base_field::field_t T3;
        typename base_field::field_t T4;
        typename base_field::field_t T5;
        typename base_field::field_t C0;
        typename base_field::field_t C1;
        typename base_field::field_t C2;

        // T0 = a.c0*a.c0
        base_field::__sqr(a.c0, T0);

        // T1 = a.c1*a.c1
        base_field::__sqr(a.c1, T1);

        // T2 = a.c2*a.c2
        base_field::__sqr(a.c2, T2);

        // T3 = a.c0*a.c1
        base_field::__mul(a.c0, a.c1, T3);

        // T4 = a.c0*a.c2
        base_field::__mul(a.c0, a.c2, T4);

        // T5 = a.c1*a.c2
        base_field::__mul(a.c1, a.c2, T5);

        // C0 = \beta(a.c1*a.c2)
        Fq6Params::__mul_by_non_residue(T5, C0);

        // C0 = a.c0*a.c0 - \beta(a.c1*a.c2)
        base_field::__sub(T0, C0, C0);

        // C1 = \beta(a.c2*a.c2)
        Fq6Params::__mul_by_non_residue(T2, C1);

        // C1 = \beta(a.c2*a.c2) - a.c0*a.c1
        base_field::__sub(C1, T3, C1);

        // C2 = a.c1*a.c1 - a.c0*a.c2
        base_field::__sub(T1, T4, C2);

        // T0 = a.c2 * (\beta(a.c2*a.c2) - a.c0*a.c1)
        base_field::__mul(a.c2, C1, T0);

        // T1 = a.c1 * (a.c1*a.c1 - a.c0*a.c2)
        base_field::__mul(a.c1, C2, T1);

        // T0 = \beta(T0 + T1)
        base_field::__add(T0, T1, T0);
        Fq6Params::__mul_by_non_residue(T0, T0);

        // T1 = a.c0 * C0
        base_field::__mul(a.c0, C0, T1);

        // T0 = T0 + T1
        base_field::__add(T0, T1, T0);

        // T0 = T0^{-1}
        base_field::__invert(T0, T0);

        // r.c0 = T0 * C0
        base_field::__mul(T0, C0, r.c0);

        // r.c1 = T0 * C1
        base_field::__mul(T0, C1, r.c1);

        // r.c2 = T0 * C2
        base_field::__mul(T0, C2, r.c2);
    }

    static inline void __mul_by_fq2(const typename base_field::field_t& a, const field_t& b, field_t& r)
    {
        base_field::__mul(a, b.c0, r.c0);
        base_field::__mul(a, b.c1, r.c1);
        base_field::__mul(a, b.c2, r.c2);
    }

    static inline void frobenius_map_three(const field_t& a, field_t& r)
    {
        typename base_field::field_t T0;
        typename base_field::field_t T1;
        base_field::frobenius_map(a.c1, T0);
        base_field::frobenius_map(a.c2, T1);
        base_field::frobenius_map(a.c0, r.c0);
        base_field::__mul(Fq6Params::frobenius_coeffs_c1_3, T0, r.c1);
        base_field::__mul(Fq6Params::frobenius_coeffs_c2_3, T1, r.c2);
    }

    static inline void frobenius_map_two(const field_t& a, field_t& r)
    {
        base_field::__copy(a.c0, r.c0);
        base_field::__mul(Fq6Params::frobenius_coeffs_c1_2, a.c1, r.c1);
        base_field::__mul(Fq6Params::frobenius_coeffs_c2_2, a.c2, r.c2);
    }

    static inline void frobenius_map_one(const field_t& a, field_t& r)
    {
        typename base_field::field_t T0;
        typename base_field::field_t T1;
        base_field::frobenius_map(a.c1, T0);
        base_field::frobenius_map(a.c2, T1);
        base_field::frobenius_map(a.c0, r.c0);
        base_field::__mul(Fq6Params::frobenius_coeffs_c1_1, T0, r.c1);
        base_field::__mul(Fq6Params::frobenius_coeffs_c2_1, T1, r.c2);
    }

    static inline field_t random_element()
    {
        field_t r;
        r.c0 = base_field::random_element();
        r.c1 = base_field::random_element();
        r.c2 = base_field::random_element();
        return r;
    }

    static inline void __to_montgomery_form(const field_t& a, field_t& r)
    {
        base_field::__to_montgomery_form(a.c0, r.c0);
        base_field::__to_montgomery_form(a.c1, r.c1);
        base_field::__to_montgomery_form(a.c2, r.c2);
    }

    static inline void __from_montgomery_form(const field_t& a, field_t& r)
    {
        base_field::__from_montgomery_form(a.c0, r.c0);
        base_field::__from_montgomery_form(a.c1, r.c1);
        base_field::__from_montgomery_form(a.c2, r.c2);
    }

    static inline void __copy(const field_t& a, field_t& r)
    {
        base_field::__copy(a.c0, r.c0);
        base_field::__copy(a.c1, r.c1);
        base_field::__copy(a.c2, r.c2);
    }

    static inline void print(const field_t& a)
    {
        printf("fq6:\n");
        printf("c0:\n");
        base_field::print(a.c0);
        printf("c1: \n");
        base_field::print(a.c1);
        printf("c2: \n");
        base_field::print(a.c2);
    }

    static inline bool is_zero(const field_t& a)
    {
        return (base_field::is_zero(a.c0) && base_field::is_zero(a.c1) && base_field::is_zero(a.c2));
    }

    static inline bool eq(const field_t& a, const field_t& b)
    {
        return (base_field::eq(a.c0, b.c0) && base_field::eq(a.c1, b.c1) && base_field::eq(a.c2, b.c2));
    }
};
} // namespace barretenberg
