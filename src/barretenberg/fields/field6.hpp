#pragma once

namespace barretenberg {
template <typename base_field, typename Fq6Params> class field6 {
  public:
    struct field_t {
        base_field c0;
        base_field c1;
        base_field c2;
    };

    static constexpr field_t zero{ base_field::zero, base_field::zero, base_field::zero };
    static constexpr field_t one{ base_field::one, base_field::zero, base_field::zero };

    static inline void __mul_by_non_residue(const base_field& a, base_field& r)
    {
        Fq6Params::__mul_by_non_residue(a, r);
    }

    static inline void __add(const field_t& a, const field_t& b, field_t& r)
    {
        r.c0 = a.c0 + b.c0;
        r.c1 = a.c1 + b.c1;
        r.c2 = a.c2 + b.c2;
    }

    static inline void __sub(const field_t& a, const field_t& b, field_t& r)
    {
        r.c0 = a.c0 - b.c0;
        r.c1 = a.c1 - b.c1;
        r.c2 = a.c2 - b.c2;
    }

    static inline void __neg(const field_t& a, field_t& r)
    {
        r.c0 = -a.c0;
        r.c1 = -a.c1;
        r.c2 = -a.c2;
    }

    static inline void __mul(const field_t& a, const field_t& b, field_t& r)
    {
        /* Devegili OhEig Scott Dahab --- Multiplication and Squaring on Pairing-Friendly Fields.pdf; Section 4
         * (Karatsuba) */
        base_field T0;
        base_field T1;
        base_field T2;
        base_field T3;
        base_field T4;
        base_field T5;
        base_field T6;

        // T0 = a.c0*b.c0
        T0 = a.c0 * b.c0;

        // T1 = a.c1*b.c1
        T1 = a.c1 * b.c1;

        // T2 = a.c2*b.c2
        T2 = a.c2 * b.c2;

        // T3 = (a.c0 + a.c2)
        T3 = a.c0 + a.c2;

        // T4 = (b.c0 + b.c2)
        T4 = b.c0 + b.c2;

        // T3 = (a.c0 + a.c2)(b.c0 + b.c2)
        T3 *= T4;

        // T4 = (a.c0 + a.c1)
        T4 = a.c0 + a.c1;

        // T5 = (b.c0 + b.c1)
        T5 = b.c0 + b.c1;

        // T4 = (a.c0 + a.c1)(b.c0 + b.c1);
        T4 *= T5;

        // T5 = (a.c1 + a.c2)
        T5 = a.c1 + a.c2;

        // T6 = (b.c1 + b.c2)
        T6 = b.c1 + b.c2;

        // T5 = (a.c1 + a.c2)(b.c1 + b.c2)
        T5 *= T6;

        // T6 = (T1 + T2)
        T6 = T1 + T2;

        // T5 = T5 - (T1 + T2)
        T5 -= T6;

        // T5 = non_residue * T5
        Fq6Params::__mul_by_non_residue(T5, T5);

        // r.c0 = (a.c0*b.c0 + \beta(a.c1*b.c2 + a.c2*b.c1))
        r.c0 = T0 + T5;

        // T5 = (T0 + T1)
        T5 = T0 + T1;

        // T4 = T4 - T5
        T4 -= T5;

        // r.c1 = non_residue * T2
        Fq6Params::__mul_by_non_residue(T2, r.c1);

        // r.c1 = T4 + non_residue * T2
        r.c1 += T4;

        // T4 = (T0 + T2)
        T4 = T0 + T2;

        // T4 = T4 - T1
        T4 -= T1;

        // r.c2 = T3 - T4
        r.c2 = T3 - T4;
    }

    static inline void __sqr(const field_t& a, field_t& r)
    {
        /* Devegili OhEig Scott Dahab --- Multiplication and Squaring on Pairing-Friendly Fields.pdf; Section 4
         * (CH-SQR2) */
        base_field S0;
        base_field S1;
        base_field S2;
        base_field S3;
        base_field S4;
        base_field AB;
        base_field BC;

        // S0 = a.c0*a.c0
        S0 = a.c0.sqr();

        // AB = a.c0*a.c1
        AB = a.c0 * a.c1;

        // S1 = 2AB
        S1 = AB + AB;

        // S2 = a.c0 + a.c2
        S2 = a.c0 + a.c2;

        // S2 = a.c0 + a.c2 - a.c1
        S2 -= a.c1;

        // S2 = S2*S2
        S2.self_sqr();

        // BC = a.c1*a.c2
        BC = a.c1 * a.c2;

        // S3 = 2BC
        S3 = BC + BC;

        // S4 = a.c2*a.c2
        S4 = a.c2.sqr();

        // r.c0 = non_residue * s3
        Fq6Params::__mul_by_non_residue(S3, r.c0);

        // r.c0 = r.c0 + s0
        r.c0 += S0;

        // r.c1 = non_residue * S4
        Fq6Params::__mul_by_non_residue(S4, r.c1);

        // r.c1 = r.c1 + S1
        r.c1 += S1;

        // r.c2 = s1 + s2 + s3 - s0 - s4
        r.c2 = S1 + S2;
        r.c2 += S3;
        r.c2 -= S0;
        r.c2 -= S4;
    }

    static inline void __invert(const field_t& a, field_t& r)
    {
        /* From "High-Speed Software Implementation of the Optimal Ate Pairing over Barreto-Naehrig Curves"; Algorithm
         * 17 */
        base_field T0;
        base_field T1;
        base_field T2;
        base_field T3;
        base_field T4;
        base_field T5;
        base_field C0;
        base_field C1;
        base_field C2;

        // T0 = a.c0*a.c0
        T0 = a.c0.sqr();

        // T1 = a.c1*a.c1
        T1 = a.c1.sqr();

        // T2 = a.c2*a.c2
        T2 = a.c2.sqr();

        // T3 = a.c0*a.c1
        T3 = a.c0 * a.c1;

        // T4 = a.c0*a.c2
        T4 = a.c0 * a.c2;

        // T5 = a.c1*a.c2
        T5 = a.c1 * a.c2;

        // C0 = \beta(a.c1*a.c2)
        Fq6Params::__mul_by_non_residue(T5, C0);

        // C0 = a.c0*a.c0 - \beta(a.c1*a.c2)
        C0 = T0 - C0;

        // C1 = \beta(a.c2*a.c2)
        Fq6Params::__mul_by_non_residue(T2, C1);

        // C1 = \beta(a.c2*a.c2) - a.c0*a.c1
        C1 = C1 - T3;

        // C2 = a.c1*a.c1 - a.c0*a.c2
        C2 = T1 - T4;

        // T0 = a.c2 * (\beta(a.c2*a.c2) - a.c0*a.c1)
        T0 = a.c2 * C1;

        // T1 = a.c1 * (a.c1*a.c1 - a.c0*a.c2)
        T1 = a.c1 * C2;

        // T0 = \beta(T0 + T1)
        T0 += T1;
        Fq6Params::__mul_by_non_residue(T0, T0);

        // T1 = a.c0 * C0
        T1 = a.c0 * C0;

        // T0 = T0 + T1
        T0 += T1;

        // T0 = T0^{-1}
        T0 = T0.invert();

        // r.c0 = T0 * C0
        r.c0 = T0 * C0;

        // r.c1 = T0 * C1
        r.c1 = T0 * C1;

        // r.c2 = T0 * C2
        r.c2 = T0 * C2;
    }

    static inline void __mul_by_fq2(const base_field& a, const field_t& b, field_t& r)
    {
        r.c0 = a * b.c0;
        r.c1 = a * b.c1;
        r.c2 = a * b.c2;
    }

    static inline void frobenius_map_three(const field_t& a, field_t& r)
    {
        base_field T0 = a.c1.frobenius_map();
        base_field T1 = a.c2.frobenius_map();
        r.c0 = a.c0.frobenius_map();
        r.c1 = Fq6Params::frobenius_coeffs_c1_3 * T0;
        r.c2 = Fq6Params::frobenius_coeffs_c2_3 * T1;
    }

    static inline void frobenius_map_two(const field_t& a, field_t& r)
    {
        r.c0 = a.c0;
        r.c1 = Fq6Params::frobenius_coeffs_c1_2 * a.c1;
        r.c2 = Fq6Params::frobenius_coeffs_c2_2 * a.c2;
    }

    static inline void frobenius_map_one(const field_t& a, field_t& r)
    {
        base_field T0 = a.c1.frobenius_map();
        base_field T1 = a.c2.frobenius_map();
        r.c0 = a.c0.frobenius_map();
        r.c1 = T0 * Fq6Params::frobenius_coeffs_c1_1;
        r.c2 = T1 * Fq6Params::frobenius_coeffs_c2_1;
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
        r.c0 = a.c0.to_montgomery_form();
        r.c1 = a.c1.to_montgomery_form();
        r.c2 = a.c2.to_montgomery_form();
    }

    static inline void __from_montgomery_form(const field_t& a, field_t& r)
    {
        r.c0 = a.c0.from_montgomery_form();
        r.c1 = a.c1.from_montgomery_form();
        r.c2 = a.c2.from_montgomery_form();
    }

    static inline void __copy(const field_t& a, field_t& r)
    {
        r.c0 = a.c0;
        r.c1 = a.c1;
        r.c2 = a.c2;
    }

    static inline bool is_zero(const field_t& a) { return a.c0.is_zero() && a.c1.is_zero() && a.c2.is_zero(); }

    static inline bool eq(const field_t& a, const field_t& b)
    {
        return (a.c0 == b.c0) && (a.c1 == b.c1) && (a.c2 == b.c2);
    }
};
} // namespace barretenberg
