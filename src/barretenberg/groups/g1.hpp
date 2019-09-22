#pragma once

#include "stdint.h"
#include "stdlib.h"

#include "../types.hpp"
#include "../fields/fr.hpp"
#include "../fields/fq.hpp"
#include "../assert.hpp"

namespace barretenberg
{
namespace g1
{
inline void print(g1::affine_element &p)
{
    printf("p.x: [%lx, %lx, %lx, %lx]\n", p.x.data[0], p.x.data[1], p.x.data[2], p.x.data[3]);
    printf("p.y: [%lx, %lx, %lx, %lx]\n", p.y.data[0], p.y.data[1], p.y.data[2], p.y.data[3]);
}

inline void print(g1::element &p)
{
    printf("p.x: [%lx, %lx, %lx, %lx]\n", p.x.data[0], p.x.data[1], p.x.data[2], p.x.data[3]);
    printf("p.y: [%lx, %lx, %lx, %lx]\n", p.y.data[0], p.y.data[1], p.y.data[2], p.y.data[3]);
    printf("p.z: [%lx, %lx, %lx, %lx]\n", p.z.data[0], p.z.data[1], p.z.data[2], p.z.data[3]);
}

inline void random_coordinates_on_curve(fq::field_t &x, fq::field_t &y)
{
    bool found_one = false;
    fq::field_t yy;
    fq::field_t t0;

    fq::field_t b_mont;
    fq::to_montgomery_form(fq::curve_b, b_mont);
    while (!found_one)
    {
        // generate a random x-coordinate
        x = fq::random_element();
        // derive y^2 = x^3 + b
        fq::sqr(x, yy);
        fq::mul(x, yy, yy);
        fq::add(yy, b_mont, yy);
        // compute sqrt(y)
        fq::sqrt(yy, y);
        fq::sqr(y, t0);
        // does yy have a valid quadratic residue? is y a valid square root?
        fq::from_montgomery_form(yy, yy);
        fq::from_montgomery_form(t0, t0);
        found_one = fq::eq(yy, t0);
    }
}

inline affine_element random_affine_element()
{
    affine_element output;
    random_coordinates_on_curve(output.x, output.y);
    return output;
}

inline element random_element()
{
    element output;
    random_coordinates_on_curve(output.x, output.y);
    output.z = fq::one();
    return output;
}

inline element one()
{
    element output;
    output.x = fq::one();
    output.y = fq::one();
    output.z = fq::one();
    fq::add(output.y, output.y, output.y);
    return output;
}

inline affine_element affine_one()
{
    affine_element output;
    output.x = fq::one();
    output.y = fq::one();
    fq::add(output.y, output.y, output.y);
    return output;
}

inline bool is_point_at_infinity(element &p)
{
    return (bool)((p.y.data[3] >> 63) & 1);
}

inline void set_infinity(element &p)
{
    p.y.data[3] = 0 | (1UL << 63);
}

inline void set_infinity(affine_element &p)
{
    p.y.data[3] = 0 | (1UL << 63);
}

inline void dbl(element &p1, element &p2)
{
    if (p1.y.data[3] >> 63 == 1)
    {
        set_infinity(p2);
        return;
    }
    fq::field_t T0;
    fq::field_t T1;
    fq::field_t T2;
    fq::field_t T3;

    // z2 = 2*y*z
    fq::add_without_reduction(p1.z, p1.z, p2.z);
    fq::mul(p2.z, p1.y, p2.z);
    // T0 = x*x
    fq::sqr(p1.x, T0);

    // T1 = y*y
    fq::sqr(p1.y, T1);

    // T2 = T2*T1 = y*y*y*y
    fq::sqr(T1, T2);

    // T1 = T1 + x = x + y*y
    fq::add_without_reduction(T1, p1.x, T1);

    // T1 = T1 * T1
    fq::sqr(T1, T1);

    // T3 = T0 + T2 = xx + y*y*y*y
    fq::add(T0, T2, T3);

    // T1 = T1 - T3 = x*x + y*y*y*y + 2*x*x*y*y*y*y - x*x - 7*y*y*y = 2*x*x*y*y*y*y = 2*S
    fq::sub(T1, T3, T1);

    // T1 = 2T1 = 4*S
    fq::add(T1, T1, T1);

    // T3 = 3T0
    fq::double_with_add_with_coarse_reduction(T0, T0, T3);
    // fq::add(T0, T0, T3);
    // fq::add(T3, T0, T3);

    // T0 = 2T1
    fq::add(T1, T1, T0);

    fq::sqr_then_sub(T3, T0, p2.x);
    // // x2 = T3*T3
    // fq::sqr(T3, p2.x);
    // // x2 = x2 - 2T1
    // fq::sub(p2.x, T0, p2.x);

    // T2 = 8T2
    // fq::add(T2, T2, T2);
    // fq::add(T2, T2, T2);
    // fq::add(T2, T2, T2);
    fq::oct(T2, T2);
    // y2 = T1 - x2
    fq::sub(T1, p2.x, p2.y);

    fq::mul_then_sub(p2.y, T3, T2, p2.y);
    // // y2 = y2 * T3
    // fq::mul(p2.y, T3, p2.y);
    // // y2 = y2 - T2
    // fq::sub(p2.y, T2, p2.y);
}

inline void mixed_add_inner(element &p1, const affine_element &p2, element &p3)
{
    fq::field_t T0;
    fq::field_t T1;
    fq::field_t T2;
    fq::field_t T3;

    // T0 = z1.z1
    fq::sqr(p1.z, T0);

    fq::mul_then_sub(p2.x, T0, p1.x, T1);
    // // T1 = x2.t0 = x2.z1.z1
    // fq::mul(p2.x, T0, T1);

    // // T1 = T1 - x1 = x2.z1.z1 - x1 (H)
    // fq::sub(T1, p1.x, T1);

    // T2 = T0.z1 = z1.z1.z1
    fq::mul_without_reduction(p1.z, T0, T2);

    fq::mul_then_sub(T2, p2.y, p1.y, T2);
    // // T2 = T2.y2 = y2.z1.z1.z1
    // fq::mul(T2, p2.y, T2);
    // // T2 = T2 - y1 = y2.z1.z1.z1 - y1
    // fq::sub(T2, p1.y, T2);

    if (__builtin_expect(((T1.data[0] | T1.data[1] | T1.data[2] | T1.data[3]) == 0), 0))
    {
        if ((T2.data[0] | T2.data[1] | T2.data[2] | T2.data[3]) == 0)
        {
            // y2 equals y1, x2 equals x1, double x1
            dbl(p1, p3);
            return;
        }
        else
        {
            set_infinity(p3);
            return;
        }
    }

    fq::double_add_twinned_without_reduction(T2, p1.z, T1, p3.z);
    // // T2 = 2T2 = 2(y2.z1.z1.z1 - y1) = R
    // fq::add_without_reduction(T2, T2, T2);
    // // z3 = z1 + H
    // fq::add_without_reduction(p1.z, T1, p3.z);

    // T3 = T1*T1 = HH
    fq::sqr(T1, T3);
    // z3 = z3 - z1z1 - HH
    fq::add(T0, T3, T0);

    // z3 = (z1 + H)*(z1 + H)
    fq::sqr_then_sub(p3.z, T0, p3.z);
    // fq::sqr(p3.z, p3.z);
    // fq::sub(p3.z, T0, p3.z);

    // T3 = 4HH
    fq::quad_with_partial_reduction(T3, T3);
    // fq::add(T3, T3, T3);
    // fq::add_without_reduction(T3, T3, T3);

    // T1 = T1*T3 = 4HHH
    fq::mul(T1, T3, T1);

    // T3 = T3 * x1 = 4HH*x1
    fq::mul(T3, p1.x, T3);

    fq::double_with_add(T3, T1, T0);
    // // T0 = 2T3
    // fq::add(T3, T3, T0);

    // // T0 = T0 + T1 = 2(4HH*x1) + 4HHH
    // fq::add(T0, T1, T0);
    fq::sqr_then_sub(T2, T0, p3.x);
    // // x3 = T2*T2 = R*R
    // fq::sqr(T2, p3.x);

    // // x3 = x3 - T0 = R*R - 8HH*x1 -4HHH
    // fq::sub(p3.x, T0, p3.x);

    // T3 = T3 - x3 = 4HH*x1 - x3
    fq::sub(T3, p3.x, T3);

    fq::mul_then_double(T1, p1.y, T1);
    // // T1 = T1 * y1 = 4HHH*y1
    // fq::mul(T1, p1.y, T1);
    // // T1 = 2T1 = 8HHH*y1
    // fq::add(T1, T1, T1);
    // T3 = T2 * T3 = R*(4HH*x1 - x3)
    // fq::mul(T3, T2, T3);
    // y3 = T3 - T1
    // fq::sub(T3, T1, p3.y);
    fq::mul_then_sub(T3, T2, T1, p3.y);
}

inline void mixed_add(element &p1, const affine_element &p2, element &p3)
{
    // TODO: quantitavely check if __builtin_expect helps here
    // if (__builtin_expect(((p1.y.data[3] >> 63)), 0))
    if (p1.y.data[3] >> 63)
    {
        fq::copy(p2.x, p3.x);
        fq::copy(p2.y, p3.y);
        fq::copy(fq::one_mont, p3.z);
        return;
    }
    mixed_add_inner(p1, p2, p3);
}

inline void mixed_add_expect_empty(element &p1, affine_element &p2, element &p3)
{
    if (__builtin_expect(((p1.y.data[3] >> 63)), 1))
    {
        fq::copy(p2.x, p3.x);
        fq::copy(p2.y, p3.y);
        fq::copy(fq::one_mont, p3.z);
        return;
    }
    mixed_add_inner(p1, p2, p3);
}

inline void mixed_sub(element &p1, affine_element &p2, element &p3)
{
    if (__builtin_expect(((p1.y.data[3] >> 63) == 1), 0))
    {
        fq::copy(p2.x, p3.x);
        fq::copy(p2.y, p3.y);
        fq::copy(fq::one_mont, p3.z);
        fq::sub(fq::modulus, p3.y, p3.y);
        return;
    }
    fq::field_t T0;
    fq::field_t T1;
    fq::field_t T2;
    fq::field_t T3;

    // T0 = z1.z1
    fq::sqr(p1.z, T0);

    // T1 = x2.t0 = x2.z1.z1
    fq::mul(p2.x, T0, T1);

    // T1 = T1 - x1 = x2.z1.z1 - x1 (H)
    fq::sub(T1, p1.x, T1);

    // T2 = T0.z1 = z1.z1.z1
    fq::mul(p1.z, T0, T2);

    fq::sub(fq::modulus, p2.y, T3);
    // T2 = T2.y2 = y2.z1.z1.z1
    fq::mul(T2, T3, T2);
    // T2 = T2 - y1 = y2.z1.z1.z1 - y1
    fq::sub(T2, p1.y, T2);

    if (__builtin_expect(((T1.data[0] | T1.data[1] | T1.data[2] | T1.data[3]) == 0), 0))
    {
        if ((T2.data[0] | T2.data[1] | T2.data[2] | T2.data[3]) == 0)
        {
            dbl(p1, p3);
            return;
        }
        else
        {
            // y2 equals y1, x2 equals x1, double x1
            set_infinity(p3);
            return;
        }
    }

    // T2 = 2T2 = 2(y2.z1.z1.z1 - y1) = R
    fq::add(T2, T2, T2);

    // T3 = T1*T1 = HH
    fq::sqr(T1, T3);

    // z3 = z1 + H
    fq::add(p1.z, T1, p3.z);

    // z3 = (z1 + H)*(z1 + H)
    fq::sqr(p3.z, p3.z);

    // z3 = z3 - z1z1 - HH
    fq::sub(p3.z, T0, p3.z);
    fq::sub(p3.z, T3, p3.z);

    // T3 = 4HH
    fq::add(T3, T3, T3);
    fq::add(T3, T3, T3);

    // T1 = T1*T3 = 4HHH
    fq::mul(T1, T3, T1);

    // T3 = T3 * x1 = 4HH*x1
    fq::mul(T3, p1.x, T3);

    // T0 = 2T3
    fq::add(T3, T3, T0);

    // T0 = T0 * T1 = 2(4HH*x1) + 4HHH
    fq::add(T0, T1, T0);

    // x3 = T2*T2 = R*R
    fq::sqr(T2, p3.x);

    // x3 = x3 - T0 = R*R - 8HH*x1 -4HHH
    fq::sub(p3.x, T0, p3.x);

    // T3 = T3 - x3 = 4HH*x1 - x3
    fq::sub(T3, p3.x, T3);

    // T3 = T2 * T3 = R*(4HH*x1 - x3)
    fq::mul(T3, T2, T3);

    // T1 = T1 * y1 = 4HHH*y1
    fq::mul(T1, p1.y, T1);
    // T1 = 2T1 = 8HHH*y
    fq::add(T1, T1, T1);
    // y3 = T3 - T1
    fq::sub(T3, T1, p3.y);
}

inline void add(element &p1, element &p2, element &p3)
{
    bool p1_zero = (p1.y.data[3] >> 63) == 1;
    bool p2_zero = (p2.y.data[3] >> 63) == 1; // ((p2.z.data[0] | p2.z.data[1] | p2.z.data[2] | p2.z.data[3]) == 0);
    if (__builtin_expect((p1_zero || p2_zero), 0))
    {
        if (p1_zero && !p2_zero)
        {
            fq::copy(p2.x, p3.x);
            fq::copy(p2.y, p3.y);
            fq::copy(p2.z, p3.z);
            return;
        }
        if (p2_zero && !p1_zero)
        {
            fq::copy(p1.x, p3.x);
            fq::copy(p1.y, p3.y);
            fq::copy(p1.z, p3.z);
            return;
        }
        set_infinity(p3);
        return;
    }
    fq::field_t Z1Z1;
    fq::field_t Z2Z2;
    fq::field_t U1;
    fq::field_t U2;
    fq::field_t S1;
    fq::field_t S2;
    fq::field_t F;
    fq::field_t H;
    fq::field_t I;
    fq::field_t J;

    // Z1Z1 = Z1*Z1
    fq::sqr(p1.z, Z1Z1);
    // Z2Z2 = Z2*Z2
    fq::sqr(p2.z, Z2Z2);
    // U1 = Z2Z2*X1
    fq::mul(p1.x, Z2Z2, U1);
    // U2 = Z1Z1*X2
    fq::mul(p2.x, Z1Z1, U2);
    // S1 = Z2*Z2*Z2
    fq::mul(p2.z, Z2Z2, S1);
    // S2 = Z1*Z1*Z1
    fq::mul(p1.z, Z1Z1, S2);
    // S1 = Z2*Z2*Z2*Y1
    fq::mul(S1, p1.y, S1);
    // S2 = Z1*Z1*Z1*Y2
    fq::mul(S2, p2.y, S2);
    // H = U2 - U1
    fq::sub(U2, U1, H);
    // F = S2 - S1
    fq::sub(S2, S1, F);

    if (__builtin_expect((H.data[0] | H.data[1] | H.data[2] | H.data[3]) == 0, 0))
    {
        if ((F.data[0] | F.data[1] | F.data[2] | F.data[3]) == 0)
        {
            // y2 equals y1, x2 equals x1, double x1
            dbl(p1, p3);
            return;
        }
        else
        {
            set_infinity(p3);
            return;
        }
    }

    // F = 2F = 2(S2 - S1)
    // fq::add_without_reduction(F, F, F);
    // // I = 2*H
    // fq::add_without_reduction(H, H, I);
    fq::double_add_twinned_without_reduction(F, H, H, I);
    // I = I * I = 4*H*H
    fq::sqr(I, I);
    // J = H * I = 4*H*H*H
    fq::mul(H, I, J);
    // U1 (V) = U1*I
    fq::mul(U1, I, U1);
    // U2 (W) = 2*V
    // fq::add(U1, U1, U2);
    // W = W + J = 2*V + 4*H*H*H
    // fq::add(U2, J, U2);
    fq::double_with_add(U1, J, U2);

    fq::sqr_then_sub(F, U2, p3.x);
    // // X3 = F*F = 4(S2 - S1)(S2 - S1)
    // fq::sqr(F, p3.x);
    // // X3 = X3 - w = 4(S2 - S1)(S2 - S1) - 2*V - 4*H*H*H
    // fq::sub(p3.x, U2, p3.x);

    fq::mul_then_double(J, S1, J);
    // // J = J*S1
    // fq::mul(J, S1, J);
    // // J = 2J
    // fq::add(J, J, J);

    // Y3 = V - X3
    fq::sub(U1, p3.x, p3.y);

    fq::mul_then_sub(p3.y, F, J, p3.y);
    // // Y3 = Y3 * F
    // fq::mul(p3.y, F, p3.y);
    // // Y3 = Y3 - J
    // fq::sub(p3.y, J, p3.y);

    // Z3 = Z1 + Z2
    fq::add(p1.z, p2.z, p3.z);

    // Z3 = Z3 - (Z1Z1 + Z2Z2)
    fq::add(Z1Z1, Z2Z2, Z1Z1);

    fq::sqr_then_sub(p3.z, Z1Z1, p3.z);
    // // Z3 = (Z1 + Z2)(Z1 + Z2)
    // fq::sqr(p3.z, p3.z);
    // fq::sub(p3.z, Z1Z1, p3.z);
    fq::mul(p3.z, H, p3.z);
}

#ifdef __AVX__
// copies src into dest, inverting y-coordinate if 'predicate' is true
// n.b. requires src and dest to be aligned on 32 byte boundary
inline void conditional_negate_affine(affine_element *src, affine_element *dest, uint64_t predicate)
{
    ASSERT((((uintptr_t)src & 0x1f) == 0));
    ASSERT((((uintptr_t)dest & 0x1f) == 0));
    __asm__ __volatile__(
        "xorq %%r8, %%r8                              \n\t"
        "movq 32(%0), %%r8                            \n\t"
        "movq 40(%0), %%r9                            \n\t"
        "movq 48(%0), %%r10                          \n\t"
        "movq 56(%0), %%r11                          \n\t"
        "movq $0x3c208c16d87cfd47, %%r12                  \n\t"
        "movq $0x97816a916871ca8d, %%r13                  \n\t"
        "movq $0xb85045b68181585d, %%r14                  \n\t"
        "movq $0x30644e72e131a029, %%r15                  \n\t"
        "subq %%r8, %%r12                               \n\t"
        "sbbq %%r9, %%r13                               \n\t"
        "sbbq %%r10, %%r14                              \n\t"
        "sbbq %%r11, %%r15                              \n\t"
        "btq $0, %2                                   \n\t"
        "cmovcq %%r12, %%r8                               \n\t"
        "cmovcq %%r13, %%r9                               \n\t"
        "cmovcq %%r14, %%r10                              \n\t"
        "cmovcq %%r15, %%r11                              \n\t"
        "vmovdqa 0(%0), %%ymm0                         \n\t"
        "vmovdqa %%ymm0, 0(%1)                      \n\t"
        "movq %%r8, 32(%1)                             \n\t"
        "movq %%r9, 40(%1)                             \n\t"
        "movq %%r10, 48(%1)                           \n\t"
        "movq %%r11, 56(%1)                           \n\t"
        :
        : "r"(src), "r"(dest), "r"(predicate)
        : "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "%ymm0", "memory", "cc");
}
#else
// copies src into dest, inverting y-coordinate if 'predicate' is true
// n.b. requires src and dest to be aligned on 32 byte boundary
inline void conditional_negate_affine(affine_element *src, affine_element *dest, uint64_t predicate)
{
    __asm__ __volatile__(
        "xorq %%r8, %%r8                              \n\t"
        "movq 32(%0), %%r8                            \n\t"
        "movq 40(%0), %%r9                            \n\t"
        "movq 48(%0), %%r10                          \n\t"
        "movq 56(%0), %%r11                          \n\t"
        "movq $0x3c208c16d87cfd47, %%r12                  \n\t"
        "movq $0x97816a916871ca8d, %%r13                  \n\t"
        "movq $0xb85045b68181585d, %%r14                  \n\t"
        "movq $0x30644e72e131a029, %%r15                  \n\t"
        "subq %%r8, %%r12                               \n\t"
        "sbbq %%r9, %%r13                               \n\t"
        "sbbq %%r10, %%r14                              \n\t"
        "sbbq %%r11, %%r15                              \n\t"
        "btq $0, %2                                   \n\t"
        "cmovcq %%r12, %%r8                               \n\t"
        "cmovcq %%r13, %%r9                               \n\t"
        "cmovcq %%r14, %%r10                              \n\t"
        "cmovcq %%r15, %%r11                              \n\t"
        "movq 0(%0), %%r12                            \n\t"
        "movq 8(%0), %%r13                            \n\t"
        "movq 16(%0), %%r14                          \n\t"
        "movq 24(%0), %%r15                          \n\t"
        "movq %%r8, 32(%1)                             \n\t"
        "movq %%r9, 40(%1)                             \n\t"
        "movq %%r10, 48(%1)                           \n\t"
        "movq %%r11, 56(%1)                           \n\t"
        "movq %%r12, 0(%1)                              \n\t"
        "movq %%r13, 8(%1)                          \n\t"
        "movq %%r14, 16(%1)                          \n\t"
        "movq %%r15, 24(%1)                          \n\t"
        :
        : "r"(src), "r"(dest), "r"(predicate)
        : "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "memory", "cc");
}
#endif

// copies src into dest. n.b. both src and dest must be aligned on 32 byte boundaries
inline void copy(affine_element *src, affine_element *dest)
{
#ifdef __AVX__
    ASSERT((((uintptr_t)src & 0x1f) == 0));
    ASSERT((((uintptr_t)dest & 0x1f) == 0));
    __asm__ __volatile__(
        "vmovdqa 0(%0), %%ymm0              \n\t"
        "vmovdqa 32(%0), %%ymm1             \n\t"
        "vmovdqa %%ymm0, 0(%1)              \n\t"
        "vmovdqa %%ymm1, 32(%1)             \n\t"
        :
        : "r"(src), "r"(dest)
        : "%ymm0", "%ymm1", "memory");
#else
    fq::copy(src->x, dest->x);
    fq::copy(src->y, dest->y);
#endif
}

// copies src into dest. n.b. both src and dest must be aligned on 32 byte boundaries
inline void copy(element *src, element *dest)
{
#ifdef __AVX__
    ASSERT((((uintptr_t)src & 0x1f) == 0));
    ASSERT((((uintptr_t)dest & 0x1f) == 0));
    __asm__ __volatile__(
        "vmovdqa 0(%0), %%ymm0              \n\t"
        "vmovdqa 32(%0), %%ymm1             \n\t"
        "vmovdqa 64(%0), %%ymm2             \n\t"
        "vmovdqa %%ymm0, 0(%1)              \n\t"
        "vmovdqa %%ymm1, 32(%1)             \n\t"
        "vmovdqa %%ymm2, 64(%1)             \n\t"
        :
        : "r"(src), "r"(dest)
        : "%ymm0", "%ymm1", "%ymm2", "memory");
#else
    fq::copy(src->x, dest->x);
    fq::copy(src->y, dest->y);
    fq::copy(src->z, dest->z);
#endif
}

inline element normalize(element &src)
{
    element dest;
    fq::field_t z_inv;
    fq::field_t zz_inv;
    fq::field_t zzz_inv;

    fq::invert(src.z, z_inv);
    fq::sqr(z_inv, zz_inv);
    fq::mul(z_inv, zz_inv, zzz_inv);
    fq::mul(src.x, zz_inv, dest.x);
    fq::mul(src.y, zzz_inv, dest.y);
    dest.z = fq::one();
    return dest;
}

/**
     * Normalize a batch of affine points via Montgomery's trick, so that their z-coordinate's are equal to unity
     * Requires: 6 mul, 1 sqr per point, plus 1 inverse
     **/
inline void batch_normalize(element *points, size_t num_points)
{
    fq::field_t *temporaries = (fq::field_t *)(aligned_alloc(32, sizeof(fq::field_t) * num_points));
    fq::field_t accumulator = fq::one();
    fq::field_t z_inv;
    fq::field_t zz_inv;
    fq::field_t zzz_inv;

    // Iterate over the points, computing the product of their z-coordinates.
    // At each iteration, store the currently-accumulated z-coordinate in `temporaries`
    for (size_t i = 0; i < num_points; ++i)
    {
        fq::copy(accumulator, temporaries[i]);
        fq::mul(accumulator, points[i].z, accumulator);
    }
    // For the rest of this method I'll refer to the product of all z-coordinates as the 'global' z-coordinate
    // Invert the global z-coordinate and store in `accumulator`
    fq::invert(accumulator, accumulator);

    /**
        * We now proceed to iterate back down the array of points.
        * At each iteration we update the accumulator to contain the z-coordinate of the currently worked-upon z-coordinate.
        * We can then multiply this accumulator with `temporaries`, to get a scalar that is equal to
        * the inverse of the z-coordinate of the point at the next iteration cycle
        * e.g. Imagine we have 4 points, such that:
        *
        * accumulator = 1 / z.data[0]*z.data[1]*z.data[2]*z.data[3]
        * temporaries[3] = z.data[0]*z.data[1]*z.data[2]
        * temporaries[2] = z.data[0]*z.data[1]
        * temporaries[1] = z.data[0]
        * temporaries[0] = 1
        *
        * At the first iteration, accumulator * temporaries[3] = z.data[0]*z.data[1]*z.data[2] / z.data[0]*z.data[1]*z.data[2]*z.data[3]  = (1 / z.data[3])
        * We then update accumulator, such that:
        *
        * accumulator = accumulator * z.data[3] = 1 / z.data[0]*z.data[1]*z.data[2]
        *
        * At the second iteration, accumulator * temporaries[2] = z.data[0]*z.data[1] / z.data[0]*z.data[1]*z.data[2] = (1 / z.data[2])
        * And so on, until we have computed every z-inverse!
        * 
        * We can then convert out of Jacobian form (x = X / Z^2, y = Y / Z^3) with 4 muls and 1 square.
        **/
    for (size_t i = num_points - 1; i < num_points; --i)
    {
        fq::mul(accumulator, temporaries[i], z_inv);
        fq::sqr(z_inv, zz_inv);
        fq::mul(z_inv, zz_inv, zzz_inv);
        fq::mul(points[i].x, zz_inv, points[i].x);
        fq::mul(points[i].y, zzz_inv, points[i].y);
        fq::mul(accumulator, points[i].z, accumulator);
        points[i].z = fq::one();
    }

    free(temporaries);
}

inline bool on_curve(g1::affine_element &pt)
{
    fq::field_t b_mont;
    fq::to_montgomery_form(fq::curve_b, b_mont);
    fq::field_t yy;
    fq::field_t xxx;
    fq::sqr(pt.x, xxx);
    fq::mul(pt.x, xxx, xxx);
    fq::add(xxx, b_mont, xxx);
    fq::sqr(pt.y, yy);
    fq::from_montgomery_form(xxx, xxx);
    fq::from_montgomery_form(yy, yy);
    return fq::eq(xxx, yy);
}

inline bool on_curve(g1::element &pt)
{
    fq::field_t b_mont;
    fq::to_montgomery_form(fq::curve_b, b_mont);
    fq::field_t yy;
    fq::field_t xxx;
    fq::field_t zz;
    fq::field_t bz_6;
    fq::sqr(pt.z, zz);
    fq::sqr(zz, bz_6);
    fq::mul(zz, bz_6, bz_6);
    fq::mul(bz_6, b_mont, bz_6);
    fq::sqr(pt.x, xxx);
    fq::mul(pt.x, xxx, xxx);
    fq::add(xxx, bz_6, xxx);
    fq::sqr(pt.y, yy);
    return fq::eq(xxx, yy);
}

inline void neg(const element &a, element &r)
{
    fq::copy(a.x, r.x);
    fq::copy(a.y, r.y);
    fq::copy(a.z, r.z);
    fq::neg(r.y, r.y);
}

inline void copy_from_affine(const affine_element &a, element &r)
{
    fq::copy(a.x, r.x);
    fq::copy(a.y, r.y);
    r.z = fq::one();
}

inline void copy_to_affine(element &a, affine_element &r)
{
    a = normalize(a);
    fq::copy(a.x, r.x);
    fq::copy(a.y, r.y);
}

inline void copy_affine(const affine_element &a, affine_element &r)
{
    fq::copy(a.x, r.x);
    fq::copy(a.y, r.y);
}

inline g1::element group_exponentiation_inner(const affine_element &a, const fr::field_t &scalar)
{
    // TODO: if we need to speed up G2, use a fixed-window WNAF
    element work_element;
    element point;
    copy_from_affine(a, work_element);
    copy_from_affine(a, point);
    fr::field_t converted_scalar;
    // TODO ADD BACK IN!
    fr::from_montgomery_form(scalar, converted_scalar);
    // fr::copy(scalar, converted_scalar);
    bool scalar_bits[256] = {0};
    for (size_t i = 0; i < 64; ++i)
    {
        scalar_bits[i] = (bool)((converted_scalar.data[0] >> i) & 0x1);
        scalar_bits[64 + i] = (bool)((converted_scalar.data[1] >> i) & 0x1);
        scalar_bits[128 + i] = (bool)((converted_scalar.data[2] >> i) & 0x1);
        scalar_bits[192 + i] = (bool)((converted_scalar.data[3] >> i) & 0x1);
    }

    bool found = false;
    size_t i = 255;
    while (!found)
    {
        found = scalar_bits[i] == true;
        --i;
    }

    for (; i < (size_t)(-1); --i)
    {
        dbl(work_element, work_element);
        if (scalar_bits[i] == true)
        {
            add(work_element, point, work_element);
        }
    }

    return work_element;
}

inline affine_element group_exponentiation(const affine_element &a, const fr::field_t &scalar)
{
    element res = group_exponentiation_inner(a, scalar);
    affine_element result;
    if (is_point_at_infinity(res))
    {
        result.x = fq::zero();
        result.y = fq::zero();
        set_infinity(result);
    }
    else
    {
        batch_normalize(&res, 1);
        fq::copy(res.x, result.x);
        fq::copy(res.y, result.y);
    }
    return result;
}

inline bool eq(const affine_element &a, const affine_element &b)
{
    return (fq::eq(a.x, b.x) && fq::eq(a.y, b.y));
}
} // namespace g1
} // namespace barretenberg