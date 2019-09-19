#pragma once

#include "fq6.hpp"

namespace fq12
{
constexpr fq2::fq2_t frobenius_coefficients_one = {
    .c0 = {.data = {0xaf9ba69633144907, 0xca6b1d7387afb78a, 0x11bded5ef08a2087, 0x02f34d751a1f3a7c}},
    .c1 = {.data = {0xa222ae234c492d72, 0xd00f02a4565de15b, 0xdc2ff3a253dfc926, 0x10a75716b3899551}}};

constexpr fq2::fq2_t frobenius_coefficients_two = {
    .c0 = {.data = {0xca8d800500fa1bf2, 0xf0c5d61468b39769, 0x0e201271ad0d4418, 0x04290f65bad856e6}},
    .c1 = {.data = {0, 0, 0, 0}}};

constexpr fq2::fq2_t frobenius_coefficients_three = {
    .c0 = {.data = {0x365316184e46d97d, 0x0af7129ed4c96d9f, 0x659da72fca1009b5, 0x08116d8983a20d23}},
    .c1 = {.data = {0xb1df4af7c39c1939, 0x3d9f02878a73bf7f, 0x9b2220928caf0ae0, 0x26684515eff054a6}}};

inline void one(fq12_t &r)
{
    fq::one(r.c0.c0.c0);
    fq::zero(r.c0.c0.c1);
    fq::zero(r.c0.c1.c0);
    fq::zero(r.c0.c1.c1);
    fq::zero(r.c0.c2.c0);
    fq::zero(r.c0.c2.c1);
    fq::zero(r.c1.c0.c0);
    fq::zero(r.c1.c0.c1);
    fq::zero(r.c1.c1.c0);
    fq::zero(r.c1.c1.c1);
    fq::zero(r.c1.c2.c0);
    fq::zero(r.c1.c2.c1);
}

inline void mul_by_non_residue(const fq6::fq6_t &a, fq6::fq6_t &r)
{
    fq2::fq2_t T0;
    fq2::copy(a.c0, T0);
    fq6::mul_by_non_residue(a.c2, r.c0);
    fq2::copy(a.c1, r.c2);
    fq2::copy(T0, r.c1);
}

inline void add(const fq12_t &a, const fq12_t &b, fq12_t &r)
{
    fq6::add(a.c0, b.c0, r.c0);
    fq6::add(a.c1, b.c1, r.c1);
}

inline void sub(const fq12_t &a, const fq12_t &b, fq12_t &r)
{
    fq6::sub(a.c0, b.c0, r.c0);
    fq6::sub(a.c1, b.c1, r.c1);
}

inline void mul(const fq12_t &a, const fq12_t &b, fq12_t &r)
{
    fq6::fq6_t T0;
    fq6::fq6_t T1;
    fq6::fq6_t T2;
    fq6::fq6_t T3;
    // T0 = a.c0*b.c0
    fq6::mul(a.c0, b.c0, T0);

    // T1 = a.c1*b.c1
    fq6::mul(a.c1, b.c1, T1);

    // T2 = a.c0 + a.c1
    fq6::add(a.c0, a.c1, T2);

    // T3 = b.c0 + b.c1
    fq6::add(b.c0, b.c1, T3);

    // r.c0 = \beta(a.c1*b.c1)
    fq12::mul_by_non_residue(T1, r.c0);

    // r.c0 = a.c0*b.c0 + \beta(a.c1*b.c1)
    fq6::add(T0, r.c0, r.c0);

    // T0 = a.c0*b.c0 + a.c1*b.c1
    fq6::add(T0, T1, T0);

    // r.c1 = (a.c0 + a.c1)(b.c0 + b.c1)
    fq6::mul(T2, T3, r.c1);

    // r.c1 = (a.c0 + a.c1)(b.c0 + b.c1) - (a.c0*b.c0 + a.c1*b.c1) = a.c0 * b.c1 + a.c1 * b.c0
    fq6::sub(r.c1, T0, r.c1);
}

inline void sparse_mul(const fq12_t &a, const pairing::ell_coeffs &ell, fq12_t &r)
{
    // multiplicand is sparse fp12 element (ell.0, 0, ell.vv) + \beta(0, ell.vw, 0)
    fq2::fq2_t d0;
    fq2::fq2_t d2;
    fq2::fq2_t d4;
    fq2::fq2_t t2;
    fq2::fq2_t t1;
    fq2::fq2_t t0;
    fq2::fq2_t s0;
    fq2::fq2_t s1;
    fq2::fq2_t t3;
    fq2::fq2_t t4;

    fq2::mul(a.c0.c0, ell.o, d0);
    fq2::mul(a.c0.c2, ell.vv, d2);
    fq2::mul(a.c1.c1, ell.vw, d4);
    fq2::add(a.c0.c0, a.c1.c1, t2);
    fq2::add(a.c0.c0, a.c0.c2, t1);
    fq2::add(a.c0.c1, a.c1.c0, s0);
    fq2::add(s0, a.c1.c2, s0);

    fq2::mul(a.c0.c1, ell.vv, s1);
    fq2::add(s1, d4, t3);
    fq6::mul_by_non_residue(t3, t4);
    fq2::add(t4, d0, r.c0.c0);

    // let z0 = t4;

    fq2::mul(a.c1.c2, ell.vw, t3);
    fq2::add(s1, t3, s1);
    fq2::add(t3, d2, t3);
    fq6::mul_by_non_residue(t3, t4);
    fq2::mul(a.c0.c1, ell.o, t3);
    fq2::add(s1, t3, s1);
    fq2::add(t4, t3, r.c0.c1);

    fq2::add(ell.o, ell.vv, t0);
    fq2::mul(t1, t0, t3);
    fq2::sub(t3, d0, t3);
    fq2::sub(t3, d2, t3);
    fq2::mul(a.c1.c0, ell.vw, t4);
    fq2::add(s1, t4, s1);

    fq2::add(a.c0.c2, a.c1.c1, t0);
    fq2::add(t3, t4, r.c0.c2);

    fq2::add(ell.vv, ell.vw, t1);
    fq2::mul(t0, t1, t3);
    fq2::sub(t3, d2, t3);
    fq2::sub(t3, d4, t3);
    fq6::mul_by_non_residue(t3, t4);
    fq2::mul(a.c1.c0, ell.o, t3);
    fq2::add(s1, t3, s1);
    fq2::add(t4, t3, r.c1.c0);

    fq2::mul(a.c1.c2, ell.vv, t3);
    fq2::add(s1, t3, s1);
    fq6::mul_by_non_residue(t3, t4);
    fq2::add(ell.o, ell.vw, t0);
    fq2::mul(t2, t0, t3);
    fq2::sub(t3, d0, t3);
    fq2::sub(t3, d4, t3);
    fq2::add(t4, t3, r.c1.c1);

    fq2::add(ell.o, ell.vv, t0);
    fq2::add(t0, ell.vw, t0);
    fq2::mul(s0, t0, t3);
    fq2::sub(t3, s1, r.c1.c2);
}

inline void sqr(const fq12_t &a, fq12_t &r)
{
    fq6::fq6_t T0;
    fq6::fq6_t T1;

    // T0 = a.c0 + a.c1
    fq6::add(a.c0, a.c1, T0);

    // T1 = \beta * a.c1
    fq12::mul_by_non_residue(a.c1, T1);

    // T1 = a.c0 + \beta * a.c1
    fq6::add(T1, a.c0, T1);

    // T0 = (a.c0 + a.c1)(a.c0 + \beta * a.c1)
    fq6::mul(T0, T1, T0);

    // T1 = a.c0 * b.c0
    fq6::mul(a.c0, a.c1, T1);

    // r.c1 = 2(a.c0 * b.c0)
    fq6::add(T1, T1, r.c1);

    // r.c0 = (a.c0 + a.c1)(a.c0 + \beta * a.c1) - a.c0 * b.c0
    fq6::sub(T0, T1, r.c0);

    // T1 = \beta(a.c0 * b.c0)
    fq12::mul_by_non_residue(T1, T1);

    // r.c0 =  (a.c0 + a.c1)(a.c0 + \beta * a.c1) - a.c0 * b.c0 - \beta(a.c0 * b.c0) = a.c1*a.c0 + \beta * a.c0 * a.c1
    fq6::sub(r.c0, T1, r.c0);
}

inline void invert(const fq12_t &a, fq12_t &r)
{
    /* From "High-Speed Software Implementation of the Optimal Ate Pairing over Barreto-Naehrig Curves"; Algorithm 8 */
    fq6::fq6_t T0;
    fq6::fq6_t T1;
    fq6::sqr(a.c0, T0);
    fq6::sqr(a.c1, T1);
    fq12::mul_by_non_residue(T1, T1);
    fq6::sub(T0, T1, T0);
    fq6::invert(T0, T0);
    fq6::mul(a.c0, T0, r.c0);
    fq6::mul(a.c1, T0, r.c1);
    fq6::neg(r.c1, r.c1);
}

inline void frobenius_map_three(const fq12_t &a, fq12_t &r)
{
    fq6::fq6_t T0;
    fq6::frobenius_map_three(a.c1, T0);
    fq6::frobenius_map_three(a.c0, r.c0);
    fq6::mul_by_fq2(frobenius_coefficients_three, T0, r.c1);
}

inline void frobenius_map_two(const fq12_t &a, fq12_t &r)
{
    fq6::fq6_t T0;
    fq6::frobenius_map_two(a.c1, T0);
    fq6::frobenius_map_two(a.c0, r.c0);
    fq6::mul_by_fq2(frobenius_coefficients_two, T0, r.c1);
}

inline void frobenius_map_one(const fq12_t &a, fq12_t &r)
{
    fq6::fq6_t T0;
    fq6::frobenius_map_one(a.c1, T0);
    fq6::frobenius_map_one(a.c0, r.c0);
    fq6::mul_by_fq2(frobenius_coefficients_one, T0, r.c1);
}

inline void cyclotomic_squared(const fq12_t &a, fq12_t &r)
{
    // TODO: write more efficient version...
    fq12::sqr(a, r);
}

inline void unitary_inverse(const fq12_t &a, fq12_t &r)
{
    fq6::copy(a.c0, r.c0);
    fq6::neg(a.c1, r.c1);
}

inline void random_element(fq12_t &r)
{
    fq6::random_element(r.c0);
    fq6::random_element(r.c1);
}

inline void from_montgomery_form(const fq12_t &a, fq12_t &r)
{
    fq6::from_montgomery_form(a.c0, r.c0);
    fq6::from_montgomery_form(a.c1, r.c1);
}

inline void copy(const fq12_t &a, fq12_t &r)
{
    fq6::copy(a.c0, r.c0);
    fq6::copy(a.c1, r.c1);
}

inline void print(const fq12_t &a)
{
    printf("fq12:\n");
    printf("c0:\n");
    fq6::print(a.c0);
    printf("c1: \n");
    fq6::print(a.c1);
}

inline bool iszero(const fq12_t &a)
{
    return (iszero(a.c0) && iszero(a.c1));
}
} // namespace fq12
