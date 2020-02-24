#pragma once

namespace barretenberg {
template <typename quadratic_field, typename base_field, typename Fq12Params> class field12 {
  public:
    struct field_t {
        typename base_field::field_t c0;
        typename base_field::field_t c1;
    };

    struct ell_coeffs {
        quadratic_field o;
        quadratic_field vw;
        quadratic_field vv;
    };

    static constexpr field_t zero{ base_field::zero, base_field::zero };
    static constexpr field_t one{ base_field::one, base_field::zero };

    static inline void mul_by_non_residue(const typename base_field::field_t& a, typename base_field::field_t& r)
    {
        quadratic_field T0 = a.c0;
        base_field::__mul_by_non_residue(a.c2, r.c0);
        r.c2 = a.c1;
        r.c1 = T0;
    }

    static inline void add(const field_t& a, const field_t& b, field_t& r)
    {
        base_field::__add(a.c0, b.c0, r.c0);
        base_field::__add(a.c1, b.c1, r.c1);
    }

    static inline void sub(const field_t& a, const field_t& b, field_t& r)
    {
        base_field::__sub(a.c0, b.c0, r.c0);
        base_field::__sub(a.c1, b.c1, r.c1);
    }

    static inline void mul(const field_t& a, const field_t& b, field_t& r)
    {
        typename base_field::field_t T0;
        typename base_field::field_t T1;
        typename base_field::field_t T2;
        typename base_field::field_t T3;
        // T0 = a.c0*b.c0
        base_field::__mul(a.c0, b.c0, T0);

        // T1 = a.c1*b.c1
        base_field::__mul(a.c1, b.c1, T1);

        // T2 = a.c0 + a.c1
        base_field::__add(a.c0, a.c1, T2);

        // T3 = b.c0 + b.c1
        base_field::__add(b.c0, b.c1, T3);

        // r.c0 = \beta(a.c1*b.c1)
        mul_by_non_residue(T1, r.c0);

        // r.c0 = a.c0*b.c0 + \beta(a.c1*b.c1)
        base_field::__add(T0, r.c0, r.c0);

        // T0 = a.c0*b.c0 + a.c1*b.c1
        base_field::__add(T0, T1, T0);

        // r.c1 = (a.c0 + a.c1)(b.c0 + b.c1)
        base_field::__mul(T2, T3, r.c1);

        // r.c1 = (a.c0 + a.c1)(b.c0 + b.c1) - (a.c0*b.c0 + a.c1*b.c1) = a.c0 * b.c1 + a.c1 * b.c0
        base_field::__sub(r.c1, T0, r.c1);
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
        base_field::__mul_by_non_residue(t3, t4);
        r.c0.c0 = t4 + d0;
        t3 = a.c1.c2 * ell.vw;
        s1 += t3;
        t3 += d2;
        base_field::__mul_by_non_residue(t3, t4);
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
        base_field::__mul_by_non_residue(t3, t4);
        t3 = a.c1.c0 * ell.o;
        s1 += t3;
        r.c1.c0 = t3 + t4;

        t3 = a.c1.c2 * ell.vv;
        s1 += t3;
        base_field::__mul_by_non_residue(t3, t4);
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
        typename base_field::field_t T0;
        typename base_field::field_t T1;

        // T0 = a.c0 + a.c1
        base_field::__add(a.c0, a.c1, T0);

        // T1 = \beta * a.c1
        mul_by_non_residue(a.c1, T1);

        // T1 = a.c0 + \beta * a.c1
        base_field::__add(T1, a.c0, T1);

        // T0 = (a.c0 + a.c1)(a.c0 + \beta * a.c1)
        base_field::__mul(T0, T1, T0);

        // T1 = a.c0 * b.c0
        base_field::__mul(a.c0, a.c1, T1);

        // r.c1 = 2(a.c0 * b.c0)
        base_field::__add(T1, T1, r.c1);

        // r.c0 = (a.c0 + a.c1)(a.c0 + \beta * a.c1) - a.c0 * b.c0
        base_field::__sub(T0, T1, r.c0);

        // T1 = \beta(a.c0 * b.c0)
        mul_by_non_residue(T1, T1);

        // r.c0 =  (a.c0 + a.c1)(a.c0 + \beta * a.c1) - a.c0 * b.c0 - \beta(a.c0 * b.c0) = a.c1*a.c0 + \beta * a.c0 *
        // a.c1
        base_field::__sub(r.c0, T1, r.c0);
    }

    static inline void invert(const field_t& a, field_t& r)
    {
        /* From "High-Speed Software Implementation of the Optimal Ate Pairing over Barreto-Naehrig Curves"; Algorithm 8
         */
        typename base_field::field_t T0;
        typename base_field::field_t T1;
        base_field::__sqr(a.c0, T0);
        base_field::__sqr(a.c1, T1);
        mul_by_non_residue(T1, T1);
        base_field::__sub(T0, T1, T0);
        base_field::__invert(T0, T0);
        base_field::__mul(a.c0, T0, r.c0);
        base_field::__mul(a.c1, T0, r.c1);
        base_field::__neg(r.c1, r.c1);
    }

    static inline void frobenius_map_three(const field_t& a, field_t& r)
    {
        typename base_field::field_t T0;
        base_field::frobenius_map_three(a.c1, T0);
        base_field::frobenius_map_three(a.c0, r.c0);
        base_field::__mul_by_fq2(Fq12Params::frobenius_coefficients_3, T0, r.c1);
    }

    static inline void frobenius_map_two(const field_t& a, field_t& r)
    {
        typename base_field::field_t T0;
        base_field::frobenius_map_two(a.c1, T0);
        base_field::frobenius_map_two(a.c0, r.c0);
        base_field::__mul_by_fq2(Fq12Params::frobenius_coefficients_2, T0, r.c1);
    }

    static inline void frobenius_map_one(const field_t& a, field_t& r)
    {
        typename base_field::field_t T0;
        base_field::frobenius_map_one(a.c1, T0);
        base_field::frobenius_map_one(a.c0, r.c0);
        base_field::__mul_by_fq2(Fq12Params::frobenius_coefficients_1, T0, r.c1);
    }

    static inline void cyclotomic_squared(const field_t& a, field_t& r)
    {
        // TODO: write more efficient version...
        sqr(a, r);
    }

    static inline void unitary_inverse(const field_t& a, field_t& r)
    {
        base_field::__copy(a.c0, r.c0);
        base_field::__neg(a.c1, r.c1);
    }

    static inline field_t random_element()
    {
        field_t r;
        r.c0 = base_field::random_element();
        r.c1 = base_field::random_element();
        return r;
    }

    static inline void __to_montgomery_form(const field_t& a, field_t& r)
    {
        base_field::__to_montgomery_form(a.c0, r.c0);
        base_field::__to_montgomery_form(a.c1, r.c1);
    }

    static inline void __from_montgomery_form(const field_t& a, field_t& r)
    {
        base_field::__from_montgomery_form(a.c0, r.c0);
        base_field::__from_montgomery_form(a.c1, r.c1);
    }

    static inline void copy(const field_t& a, field_t& r)
    {
        base_field::__copy(a.c0, r.c0);
        base_field::__copy(a.c1, r.c1);
    }

    static inline bool is_zero(const field_t& a) { return (base_field::is_zero(a.c0) && base_field::is_zero(a.c1)); }

    static inline bool eq(const field_t& a, const field_t& b)
    {
        return (base_field::eq(a.c0, b.c0) && base_field::eq(a.c1, b.c1));
    }
};
} // namespace barretenberg
