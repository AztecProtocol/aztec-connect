#pragma once

#include "stdint.h"
#include "stdlib.h"

#include "../types.hpp"
#include "../fields/fr.hpp"
#include "../fields/fq.hpp"
#include "../assert.hpp"
#include "./wnaf.hpp"

namespace barretenberg
{
namespace g1
{
inline void print(affine_element &p)
{
    printf("p.x: [%llx, %llx, %llx, %llx]\n", p.x.data[0], p.x.data[1], p.x.data[2], p.x.data[3]);
    printf("p.y: [%llx, %llx, %llx, %llx]\n", p.y.data[0], p.y.data[1], p.y.data[2], p.y.data[3]);
}

inline void print(element &p)
{
    printf("p.x: [%llx, %llx, %llx, %llx]\n", p.x.data[0], p.x.data[1], p.x.data[2], p.x.data[3]);
    printf("p.y: [%llx, %llx, %llx, %llx]\n", p.y.data[0], p.y.data[1], p.y.data[2], p.y.data[3]);
    printf("p.z: [%llx, %llx, %llx, %llx]\n", p.z.data[0], p.z.data[1], p.z.data[2], p.z.data[3]);
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
        fq::__sqr(x, yy);
        fq::__mul(x, yy, yy);
        fq::__add(yy, b_mont, yy);
        // compute sqrt(y)
        fq::__sqrt(yy, y);
        fq::__sqr(y, t0);
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
    output.z = fq::random_element();
    fq::field_t zz;
    fq::field_t zzz;
    fq::__sqr(output.z, zz);
    fq::__mul(output.z, zz, zzz);
    fq::__mul(output.x, zz, output.x);
    fq::__mul(output.y, zzz, output.y);
    return output;
}

inline element one()
{
    element output;
    output.x = fq::one();
    output.y = fq::one();
    output.z = fq::one();
    fq::__add(output.y, output.y, output.y);
    return output;
}

inline affine_element affine_one()
{
    affine_element output;
    output.x = fq::one();
    output.y = fq::one();
    fq::__add(output.y, output.y, output.y);
    return output;
}

inline bool is_point_at_infinity(const affine_element &p)
{
    return (bool)((p.y.data[3] >> 63) & 1);
}

inline bool is_point_at_infinity(const element &p)
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
    fq::__add_without_reduction(p1.z, p1.z, p2.z);
    fq::__mul_without_reduction(p2.z, p1.y, p2.z);
    fq::reduce_once(p2.z, p2.z);

    // T0 = x*x
    fq::__sqr_without_reduction(p1.x, T0);

    // T1 = y*y
    fq::__sqr_without_reduction(p1.y, T1);

    // T2 = T2*T1 = y*y*y*y
    fq::__sqr_without_reduction(T1, T2);

    // T1 = T1 + x = x + y*y
    fq::__add_with_coarse_reduction(T1, p1.x, T1);

    // T1 = T1 * T1
    fq::__sqr_without_reduction(T1, T1);

    // T3 = T0 + T2 = xx + y*y*y*y
    fq::__add_with_coarse_reduction(T0, T2, T3);

    // T1 = T1 - T3 = x*x + y*y*y*y + 2*x*x*y*y*y*y - x*x - 7*y*y*y = 2*x*x*y*y*y*y = 2*S
    fq::__sub_with_coarse_reduction(T1, T3, T1);

    // T1 = 2T1 = 4*S
    fq::__add_with_coarse_reduction(T1, T1, T1);

    // T3 = 3T0
    fq::__add_with_coarse_reduction(T0, T0, T3);
    fq::__add_with_coarse_reduction(T3, T0, T3);

    // T0 = 2T1
    fq::__add_with_coarse_reduction(T1, T1, T0);

    // x2 = T3*T3
    fq::__sqr_without_reduction(T3, p2.x);
    // x2 = x2 - 2T1
    fq::__sub_with_coarse_reduction(p2.x, T0, p2.x);
    fq::reduce_once(p2.x, p2.x);

    // T2 = 8T2
    fq::oct_with_coarse_reduction(T2, T2);

    // y2 = T1 - x2
    fq::__sub_with_coarse_reduction(T1, p2.x, p2.y);

    // y2 = y2 * T3 - T2
    fq::__mul_without_reduction(p2.y, T3, p2.y);
    fq::__sub_with_coarse_reduction(p2.y, T2, p2.y);
    fq::reduce_once(p2.y, p2.y);
}

inline void mixed_add_inner(element &p1, const affine_element &p2, element &p3)
{
    fq::field_t T0;
    fq::field_t T1;
    fq::field_t T2;
    fq::field_t T3;

    // T0 = z1.z1
    // fq::__sqr(p1.z, T0);
    fq::__sqr_without_reduction(p1.z, T0);

    // T1 = x2.t0 - x1 = x2.z1.z1 - x1
    fq::__mul(p2.x, T0, T1);
    fq::__sub(T1, p1.x, T1);

    // T2 = T0.z1 = z1.z1.z1
    fq::__mul_without_reduction(p1.z, T0, T2);

    // // T2 = T2.y2 - y1 = y2.z1.z1.z1 - y1
    fq::__mul(T2, p2.y, T2);
    fq::__sub(T2, p1.y, T2);

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

    // T2 = 2T2 = 2(y2.z1.z1.z1 - y1) = R
    // z3 = z1 + H
    fq::paralell_double_and_add_without_reduction(T2, p1.z, T1, p3.z);

    // T3 = T1*T1 = HH
    fq::__sqr_without_reduction(T1, T3);

    // z3 = z3 - z1z1 - HH
    fq::__add_with_coarse_reduction(T0, T3, T0);

    // z3 = (z1 + H)*(z1 + H)
    fq::__sqr_without_reduction(p3.z, p3.z);
    fq::__sub_with_coarse_reduction(p3.z, T0, p3.z);
    fq::reduce_once(p3.z, p3.z);

    // T3 = 4HH
    fq::quad_with_coarse_reduction(T3, T3);

    // T1 = T1*T3 = 4HHH
    fq::__mul_without_reduction(T1, T3, T1);

    // T3 = T3 * x1 = 4HH*x1
    fq::__mul_without_reduction(T3, p1.x, T3);

    // T0 = 2T3
    fq::__add_with_coarse_reduction(T3, T3, T0);

    // T0 = T0 + T1 = 2(4HH*x1) + 4HHH
    fq::__add_with_coarse_reduction(T0, T1, T0);
    fq::__sqr_without_reduction(T2, p3.x);

    // x3 = x3 - T0 = R*R - 8HH*x1 -4HHH
    fq::__sub_with_coarse_reduction(p3.x, T0, p3.x);

    // T3 = T3 - x3 = 4HH*x1 - x3
    fq::__sub_with_coarse_reduction(T3, p3.x, T3);
    fq::reduce_once(p3.x, p3.x);

    fq::__mul_without_reduction(T1, p1.y, T1);
    fq::__add_with_coarse_reduction(T1, T1, T1);

    // T3 = T2 * T3 = R*(4HH*x1 - x3)
    fq::__mul_without_reduction(T3, T2, T3);

    // y3 = T3 - T1
    fq::__sub_with_coarse_reduction(T3, T1, p3.y);
    fq::reduce_once(p3.y, p3.y);
}

inline void mixed_add(element &p1, const affine_element &p2, element &p3)
{
    // TODO: quantitavely check if __builtin_expect helps here
    // if (__builtin_expect(((p1.y.data[3] >> 63)), 0))

    // N.B. we implicitly assume p2 is not a point at infinity, as it will be coming from a lookup table of constants
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
    if (__builtin_expect((long)((p1.y.data[3] >> 63UL)), true))
    {
        fq::copy(p2.x, p3.x);
        fq::copy(p2.y, p3.y);
        fq::copy(fq::one_mont, p3.z);
        return;
    }
    mixed_add_inner(p1, p2, p3);
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
    fq::__sqr_without_reduction(p1.z, Z1Z1);
    // Z2Z2 = Z2*Z2
    fq::__sqr_without_reduction(p2.z, Z2Z2);
    // U1 = Z2Z2*X1
    fq::__mul_without_reduction(p1.x, Z2Z2, U1);
    // U2 = Z1Z1*X2
    fq::__mul_without_reduction(p2.x, Z1Z1, U2);
    // S1 = Z2*Z2*Z2
    fq::__mul_without_reduction(p2.z, Z2Z2, S1);
    // S2 = Z1*Z1*Z1
    fq::__mul_without_reduction(p1.z, Z1Z1, S2);
    // S1 = Z2*Z2*Z2*Y1
    fq::__mul_without_reduction(S1, p1.y, S1);
    // S2 = Z1*Z1*Z1*Y2
    fq::__mul_without_reduction(S2, p2.y, S2);
    // H = U2 - U1
    fq::__sub_with_coarse_reduction(U2, U1, H);
    fq::reduce_once(H, H);
    // F = S2 - S1
    fq::__sub_with_coarse_reduction(S2, S1, F);
    fq::reduce_once(F, F);

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
    // I = 2*H
    // perform both additions in tandem, so that we can take
    // advantage of ADCX/ADOX addition chain
    fq::paralell_double_and_add_without_reduction(F, H, H, I);

    // I = I * I = 4*H*H
    fq::__sqr_without_reduction(I, I);

    // J = H * I = 4*H*H*H
    fq::__mul_without_reduction(H, I, J);

    // U1 (V) = U1*I
    fq::__mul_without_reduction(U1, I, U1);

    // U2 (W) = 2*V
    fq::__add_with_coarse_reduction(U1, U1, U2);
    // W = W + J = 2*V + 4*H*H*H
    fq::__add_with_coarse_reduction(U2, J, U2);

    // // X3 = F*F = 4(S2 - S1)(S2 - S1)
    fq::__sqr_without_reduction(F, p3.x);

    // // X3 = X3 - w = 4(S2 - S1)(S2 - S1) - 2*V - 4*H*H*H
    fq::__sub_with_coarse_reduction(p3.x, U2, p3.x);
    fq::reduce_once(p3.x, p3.x); // ensure p3.x < p

    // // J = J*S1
    fq::__mul_without_reduction(J, S1, J);
    // // J = 2J
    fq::__add_with_coarse_reduction(J, J, J);

    // Y3 = V - X3
    fq::__sub_with_coarse_reduction(U1, p3.x, p3.y);

    // // Y3 = Y3 * F
    fq::__mul_without_reduction(p3.y, F, p3.y);
    // // Y3 = Y3 - J
    fq::__sub_with_coarse_reduction(p3.y, J, p3.y);
    fq::reduce_once(p3.y, p3.y); // ensure p3.y < p

    // Z3 = Z1 + Z2
    fq::__add_with_coarse_reduction(p1.z, p2.z, p3.z);

    // Z3 = Z3 - (Z1Z1 + Z2Z2)
    fq::__add_with_coarse_reduction(Z1Z1, Z2Z2, Z1Z1);

    // // Z3 = (Z1 + Z2)(Z1 + Z2)
    fq::__sqr_without_reduction(p3.z, p3.z);
    fq::__sub_with_coarse_reduction(p3.z, Z1Z1, p3.z);
    fq::__mul(p3.z, H, p3.z);
}

// copies src into dest, inverting y-coordinate if 'predicate' is true
// n.b. requires src and dest to be aligned on 32 byte boundary
inline void conditional_negate_affine(affine_element *src, affine_element *dest, uint64_t predicate)
{
#if defined __AVX__ && defined USE_AVX
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
#else
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
#endif
}

// copies src into dest. n.b. both src and dest must be aligned on 32 byte boundaries
inline void copy(affine_element *src, affine_element *dest)
{
#if defined __AVX__ && defined USE_AVX
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
#if defined __AVX__ && defined USE_AVX
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

    fq::__invert(src.z, z_inv);
    fq::__sqr(z_inv, zz_inv);
    fq::__mul(z_inv, zz_inv, zzz_inv);
    fq::__mul(src.x, zz_inv, dest.x);
    fq::__mul(src.y, zzz_inv, dest.y);
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
        fq::__mul(accumulator, points[i].z, accumulator);
    }
    // For the rest of this method I'll refer to the product of all z-coordinates as the 'global' z-coordinate
    // Invert the global z-coordinate and store in `accumulator`
    fq::__invert(accumulator, accumulator);

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
        fq::__mul(accumulator, temporaries[i], z_inv);
        fq::__sqr(z_inv, zz_inv);
        fq::__mul(z_inv, zz_inv, zzz_inv);
        fq::__mul(points[i].x, zz_inv, points[i].x);
        fq::__mul(points[i].y, zzz_inv, points[i].y);
        fq::__mul(accumulator, points[i].z, accumulator);
        points[i].z = fq::one();
    }

    free(temporaries);
}

inline bool on_curve(affine_element &pt)
{
    if (is_point_at_infinity(pt))
    {
        return false;
    }
    fq::field_t b_mont;
    fq::to_montgomery_form(fq::curve_b, b_mont);
    fq::field_t yy;
    fq::field_t xxx;
    fq::__sqr(pt.x, xxx);
    fq::__mul(pt.x, xxx, xxx);
    fq::__add(xxx, b_mont, xxx);
    fq::__sqr(pt.y, yy);
    fq::from_montgomery_form(xxx, xxx);
    fq::from_montgomery_form(yy, yy);
    return fq::eq(xxx, yy);
}

inline bool on_curve(element &pt)
{
    if (is_point_at_infinity(pt))
    {
        return false;
    }
    fq::field_t b_mont;
    fq::to_montgomery_form(fq::curve_b, b_mont);
    fq::field_t yy;
    fq::field_t xxx;
    fq::field_t zz;
    fq::field_t bz_6;
    fq::__sqr(pt.z, zz);
    fq::__sqr(zz, bz_6);
    fq::__mul(zz, bz_6, bz_6);
    fq::__mul(bz_6, b_mont, bz_6);
    fq::__sqr(pt.x, xxx);
    fq::__mul(pt.x, xxx, xxx);
    fq::__add(xxx, bz_6, xxx);
    fq::__sqr(pt.y, yy);
    return fq::eq(xxx, yy);
}

inline void neg(const element &a, element &r)
{
    fq::copy(a.x, r.x);
    fq::copy(a.y, r.y);
    fq::copy(a.z, r.z);
    fq::neg(r.y, r.y);
}

inline void neg(const affine_element &a, affine_element &r)
{
    fq::copy(a.x, r.x);
    fq::neg(a.y, r.y);
}

inline void affine_to_jacobian(const affine_element &a, element &r)
{
    fq::copy(a.x, r.x);
    fq::copy(a.y, r.y);
    r.z = fq::one();
}

inline void jacobian_to_affine(element &a, affine_element &r)
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

inline element group_exponentiation(const element &a, const fr::field_t &scalar)
{
    fr::field_t converted_scalar;

    fr::from_montgomery_form(scalar, converted_scalar);

    if (fr::eq(converted_scalar, fr::zero()))
    {
        element result;
        result.x = fq::zero();
        result.y = fq::zero();
        result.z = fq::zero();
        set_infinity(result);
        return result;
    }
    element &point = const_cast<element &>(a);

    constexpr size_t lookup_size = 8;
    constexpr size_t num_rounds = 32;
    constexpr size_t num_wnaf_bits = 4;
    element *precomp_table = (element *)(aligned_alloc(64, sizeof(element) * lookup_size));
    affine_element *lookup_table = (affine_element *)(aligned_alloc(64, sizeof(element) * lookup_size));

    element d2;
    copy(&point, &precomp_table[0]); // 1
    dbl(point, d2);                  // 2
    for (size_t i = 1; i < lookup_size; ++i)
    {
        add(precomp_table[i - 1], d2, precomp_table[i]);
    }
    batch_normalize(precomp_table, lookup_size);
    for (size_t i = 0; i < lookup_size; ++i)
    {
        fq::copy(precomp_table[i].x, lookup_table[i].x);
        fq::copy(precomp_table[i].y, lookup_table[i].y);
    }

    uint32_t wnaf_table[num_rounds * 2];
    fr::field_t endo_scalar;
    fr::split_into_endomorphism_scalars(converted_scalar, endo_scalar, *(fr::field_t *)&endo_scalar.data[2]);
    bool skew = false;
    bool endo_skew = false;
    wnaf::fixed_wnaf(&endo_scalar.data[0], &wnaf_table[0], skew, 2, num_wnaf_bits);
    wnaf::fixed_wnaf(&endo_scalar.data[2], &wnaf_table[1], endo_skew, 2, num_wnaf_bits);

    element work_element = one();
    element dummy_element = one();
    affine_element temporary;
    set_infinity(work_element);

    uint32_t wnaf_entry;
    uint32_t index;
    bool sign;
    for (size_t i = 0; i < num_rounds; ++i)
    {
        wnaf_entry = wnaf_table[2 * i];
        index = wnaf_entry & 0x0fffffffU;
        sign = static_cast<bool>((wnaf_entry >> 31) & 1);
        copy(&lookup_table[index], &temporary);
        conditional_negate_affine(&lookup_table[index], &temporary, sign);
        mixed_add(work_element, temporary, work_element);
        wnaf_entry = wnaf_table[2 * i + 1];
        index = wnaf_entry & 0x0fffffffU;
        sign = static_cast<bool>((wnaf_entry >> 31) & 1);
        copy(&lookup_table[index], &temporary);
        conditional_negate_affine(&lookup_table[index], &temporary, !sign);
        fq::__mul_beta(temporary.x, temporary.x);
        mixed_add(work_element, temporary, work_element);

        if (i != num_rounds - 1)
        {
            dbl(work_element, work_element);
            dbl(work_element, work_element);
            dbl(work_element, work_element);
            dbl(work_element, work_element);
        }
    }
    neg(lookup_table[0], temporary);
    if (skew)
    {
        mixed_add(work_element, temporary, work_element);
    }
    else
    {
        // grotty attempt at making this constant-time
        mixed_add(dummy_element, temporary, dummy_element);
    }
    copy(&lookup_table[0], &temporary);
    fq::__mul_beta(temporary.x, temporary.x);
    if (endo_skew)
    {
        mixed_add(work_element, temporary, work_element);
    }
    else
    {
        // grotty attempt at making this constant-time
        mixed_add(dummy_element, temporary, dummy_element);
    }

    free(precomp_table);
    free(lookup_table);
    return work_element;
}

inline element group_exponentiation_inner(const affine_element &a, const fr::field_t &scalar)
{
    element point;
    affine_to_jacobian(a, point);
    return group_exponentiation(point, scalar);
}

inline affine_element group_exponentiation(const affine_element &a, const fr::field_t &scalar)
{
    element output = group_exponentiation_inner(a, scalar);
    affine_element result;
    if (is_point_at_infinity(output))
    {
        result.x = fq::zero();
        result.y = fq::zero();
        set_infinity(result);
    }
    else
    {
        batch_normalize(&output, 1);
        fq::copy(output.x, result.x);
        fq::copy(output.y, result.y);
    }
    return result;
}

inline bool eq(const element &a, const element &b)
{
    bool both_infinity = is_point_at_infinity(a) && is_point_at_infinity(b);

    fq::field_t a_zz;
    fq::field_t a_zzz;
    fq::field_t b_zz;
    fq::field_t b_zzz;

    fq::__sqr(a.z, a_zz);
    fq::__mul(a.z, a_zz, a_zzz);

    fq::__sqr(b.z, b_zz);
    fq::__mul(b.z, b_zz, b_zzz);

    fq::field_t T0;
    fq::field_t T1;
    fq::field_t T2;
    fq::field_t T3;
    fq::__mul(a.x, b_zz, T0);
    fq::__mul(a.y, b_zzz, T1);
    fq::__mul(b.x, a_zz, T2);
    fq::__mul(b.y, a_zzz, T3);

    return both_infinity || ((fq::eq(T0, T2) && fq::eq(T1, T3)));
}

inline bool eq(const affine_element &a, const affine_element &b)
{
    element a_ele;
    element b_ele;
    affine_to_jacobian(a, a_ele);
    affine_to_jacobian(b, b_ele);
    return eq(a_ele, b_ele);
}

} // namespace g1
} // namespace barretenberg
