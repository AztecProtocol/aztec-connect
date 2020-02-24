#pragma once

namespace barretenberg {
template <typename quadratic_field, typename base_field, typename Fq12Params> class field12 {
  public:
    struct field_t {
        base_field c0;
        base_field c1;
    };

    struct ell_coeffs {
        quadratic_field o;
        quadratic_field vw;
        quadratic_field vv;
    };

    static constexpr field_t zero{ base_field::zero, base_field::zero };
    static constexpr field_t one{ base_field::one, base_field::zero };

    static inline void mul_by_non_residue(const base_field& a, base_field& r)
    {
        quadratic_field T0 = a.c0;
        r.c0 = base_field::mul_by_non_residue(a.c2);
        r.c2 = a.c1;
        r.c1 = T0;
    }

    static inline void add(const field_t& a, const field_t& b, field_t& r) { r = { a.c0 + b.c0, a.c1 + b.c1 }; }

    static inline void sub(const field_t& a, const field_t& b, field_t& r) { r = { a.c0 - b.c0, a.c1 - b.c1 }; }

    static inline void mul(const field_t& a, const field_t& b, field_t& r)
    {
        base_field T0;
        base_field T1;
        base_field T2;
        base_field T3;
        // T0 = a.c0*b.c0
        T0 = a.c0 * b.c0;
        T1 = a.c1 * b.c1;
        T2 = a.c0 + a.c1;
        T3 = b.c0 + b.c1;

        // r.c0 = \beta(a.c1*b.c1)
        mul_by_non_residue(T1, r.c0);

        r.c0 += T0;
        T0 += T1;
        r.c1 = T2 * T3;
        r.c1 -= T0;
    }

    static inline void sparse_mul(const field_t& a, const ell_coeffs& ell, field_t& r)
    {
        // multiplicand is sparse fp12 element (ell.0, 0, ell.vv) + \beta(0, ell.vw, 0)
        quadratic_field d0;
        quadratic_field d2;
        quadratic_field d4;
        quadratic_field t2;
        quadratic_field t1;
        quadratic_field t0;
        quadratic_field s0;
        quadratic_field s1;
        quadratic_field t3;
        quadratic_field t4;

        d0 = a.c0.c0 * ell.o;
        d2 = a.c0.c2 * ell.vv;
        d4 = a.c1.c1 * ell.vw;
        t2 = a.c0.c0 + a.c1.c1;
        t1 = a.c0.c0 + a.c0.c2;
        s0 = a.c0.c1 + a.c1.c0;
        s0 += a.c1.c2;

        s1 = a.c0.c1 * ell.vv;
        t3 = s1 + d4;
        t4 = base_field::mul_by_non_residue(t3);
        r.c0.c0 = t4 + d0;
        t3 = a.c1.c2 * ell.vw;
        s1 += t3;
        t3 += d2;
        t4 = base_field::mul_by_non_residue(t3);
        t3 = a.c0.c1 * ell.o;
        s1 += t3;
        r.c0.c1 = t4 + t3;

        t0 = ell.o + ell.vv;
        t3 = t1 * t0;
        t3 -= d0;
        t3 -= d2;
        t4 = a.c1.c0 * ell.vw;
        s1 += t4;

        t0 = a.c0.c2 + a.c1.c1;
        r.c0.c2 = t3 + t4;

        t1 = ell.vv + ell.vw;
        t3 = t0 * t1;
        t3 -= d2;
        t3 -= d4;
        t4 = base_field::mul_by_non_residue(t3);
        t3 = a.c1.c0 * ell.o;
        s1 += t3;
        r.c1.c0 = t3 + t4;

        t3 = a.c1.c2 * ell.vv;
        s1 += t3;
        t4 = base_field::mul_by_non_residue(t3);
        t0 = ell.o + ell.vw;
        t3 = t0 * t2;
        t3 -= d0;
        t3 -= d4;
        r.c1.c1 = t3 + t4;

        t0 = ell.o + ell.vv;
        t0 += ell.vw;
        t3 = s0 * t0;
        r.c1.c2 = t3 - s1;
    }

    static inline void sqr(const field_t& a, field_t& r)
    {
        base_field T0;
        base_field T1;

        // T0 = a.c0 + a.c1
        T0 = a.c0 + a.c1;

        // T1 = \beta * a.c1
        mul_by_non_residue(a.c1, T1);

        // T1 = a.c0 + \beta * a.c1
        T1 += a.c0;

        // T0 = (a.c0 + a.c1)(a.c0 + \beta * a.c1)
        T0 *= T1;

        // T1 = a.c0 * b.c0
        T1 = a.c0 * a.c1;

        // r.c1 = 2(a.c0 * b.c0)
        r.c1 = T1 + T1;

        // r.c0 = (a.c0 + a.c1)(a.c0 + \beta * a.c1) - a.c0 * b.c0
        r.c0 = T0 - T1;

        // T1 = \beta(a.c0 * b.c0)
        mul_by_non_residue(T1, T1);

        // r.c0 =  (a.c0 + a.c1)(a.c0 + \beta * a.c1) - a.c0 * b.c0 - \beta(a.c0 * b.c0) = a.c1*a.c0 + \beta * a.c0 *
        // a.c1
        r.c0 -= T1;
    }

    static inline void invert(const field_t& a, field_t& r)
    {
        /* From "High-Speed Software Implementation of the Optimal Ate Pairing over Barreto-Naehrig Curves"; Algorithm 8
         */
        base_field T0 = a.c0.sqr();
        base_field T1 = a.c1.sqr();
        mul_by_non_residue(T1, T1);
        T0 -= T1;
        T0 = T0.invert();
        r.c0 = a.c0 * T0;
        r.c1 = -(a.c1 * T0);
    }

    static inline void frobenius_map_three(const field_t& a, field_t& r)
    {
        base_field T0 = a.c1.frobenius_map_three();
        r.c0 = a.c0.frobenius_map_three();
        r.c1 = T0.mul_by_fq2(Fq12Params::frobenius_coefficients_3);
    }

    static inline void frobenius_map_two(const field_t& a, field_t& r)
    {
        base_field T0 = a.c1.frobenius_map_two();
        r.c0 = a.c0.frobenius_map_two();
        r.c1 = T0.mul_by_fq2(Fq12Params::frobenius_coefficients_2);
    }

    static inline void frobenius_map_one(const field_t& a, field_t& r)
    {
        base_field T0 = a.c1.frobenius_map_one();
        r.c0 = a.c0.frobenius_map_one();
        r.c1 = T0.mul_by_fq2(Fq12Params::frobenius_coefficients_1);
    }

    static inline void cyclotomic_squared(const field_t& a, field_t& r)
    {
        // TODO: write more efficient version...
        sqr(a, r);
    }

    static inline void unitary_inverse(const field_t& a, field_t& r) { r = { a.c0, -a.c1 }; }

    static inline field_t random_element()
    {
        field_t r;
        r.c0 = base_field::random_element();
        r.c1 = base_field::random_element();
        return r;
    }

    static inline void __to_montgomery_form(const field_t& a, field_t& r)
    {
        r = { a.c0.to_montgomery_form(), a.c1.to_montgomery_form() };
    }

    static inline void __from_montgomery_form(const field_t& a, field_t& r)
    {
        r = { a.c0.from_montgomery_form(), a.c1.from_montgomery_form() };
    }

    static inline void copy(const field_t& a, field_t& r)
    {
        r.c0 = a.c0;
        r.c1 = a.c1;
    }

    static inline bool is_zero(const field_t& a) { return a.c0.is_zero() && a.c1.is_zero(); }

    static inline bool eq(const field_t& a, const field_t& b) { return (a.c0 == b.c0) && (a.c1 == b.c1); }
};
} // namespace barretenberg
