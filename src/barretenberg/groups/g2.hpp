#ifndef G2
#define G2

#include "../fields/fq2.hpp"
#include "../fields/fr.hpp"
#include "../types.hpp"

namespace barretenberg
{
namespace g2
{
constexpr fq::field_t xc0 = {.data = {0x8e83b5d102bc2026, 0xdceb1935497b0172, 0xfbb8264797811adf, 0x19573841af96503b}};
constexpr fq::field_t xc1 = {.data = {0xafb4737da84c6140, 0x6043dd5a5802d8c4, 0x09e950fc52a02f86, 0x14fef0833aea7b6b}};
constexpr fq::field_t yc0 = {.data = {0x619dfa9d886be9f6, 0xfe7fd297f59e9b78, 0xff9e1a62231b7dfe, 0x28fd7eebae9e4206}};
constexpr fq::field_t yc1 = {.data = {0x64095b56c71856ee, 0xdc57f922327d3cbb, 0x55f935be33351076, 0x0da4a0e693fd6482}};

constexpr fq2::fq2_t twist_mul_by_q_x = {
    .c0 = {.data = {0xb5773b104563ab30, 0x347f91c8a9aa6454, 0x7a007127242e0991, 0x1956bcd8118214ec}},
    .c1 = {.data = {0x6e849f1ea0aa4757, 0xaa1c7b6d89f89141, 0xb6e713cdfae0ca3a, 0x26694fbb4e82ebc3}}};

constexpr fq2::fq2_t twist_mul_by_q_y = {
    .c0 = {.data = {0xe4bbdd0c2936b629, 0xbb30f162e133bacb, 0x31a9d1b6f9645366, 0x253570bea500f8dd}},
    .c1 = {.data = {0xa1d77ce45ffe77c7, 0x07affd117826d1db, 0x6d16bd27bb7edc6b, 0x2c87200285defecc}}};

inline element one()
{
    element result;
    result.x.c0 = xc0;
    result.x.c1 = xc1;
    result.y.c0 = yc0;
    result.y.c1 = yc1;
    result.z.c0 = fq::one();
    result.z.c1 = fq::zero();
    return result;
}

inline affine_element affine_one()
{
    affine_element result;
    result.x.c0 = xc0;
    result.x.c1 = xc1;
    result.y.c0 = yc0;
    result.y.c1 = yc1;
    return result;
}

inline bool is_point_at_infinity(const element& p)
{
    return (bool)((p.y.c0.data[3] >> 63) & 1);
}

inline bool is_point_at_infinity(const affine_element& p)
{
    return (bool)((p.y.c0.data[3] >> 63) & 1);
}

inline void set_infinity(element &p)
{
    p.y.c0.data[3] |= (1UL << 63);
}

inline void set_infinity(affine_element &p)
{
    p.y.c0.data[3] |= (1UL << 63);
}

inline void dbl(element &p1, element &p2)
{
    if (p1.y.c0.data[3] >> 63 == 1)
    {
        set_infinity(p2);
        return;
    }
    fq2::fq2_t T0; // = { c0: { 0, 0, 0, 0 }, c1: { 0, 0, 0, 0} };
    fq2::fq2_t T1; // = { c0: { 0, 0, 0, 0 }, c1: { 0, 0, 0, 0} };
    fq2::fq2_t T2; // = { c0: { 0, 0, 0, 0 }, c1: { 0, 0, 0, 0} };
    fq2::fq2_t T3; // = { c0: { 0, 0, 0, 0 }, c1: { 0, 0, 0, 0} };

    // z2 = 2*y*z
    fq2::add(p1.z, p1.z, p2.z);
    fq2::mul(p2.z, p1.y, p2.z);

    // T0 = x*x
    fq2::sqr(p1.x, T0);

    // T1 = y*y
    fq2::sqr(p1.y, T1);

    // T2 = T2*T1 = y*y*y*y
    fq2::sqr(T1, T2);

    // T1 = T1 + x = x + y*y
    fq2::add(T1, p1.x, T1);

    // T1 = T1 * T1
    fq2::sqr(T1, T1);

    // T3 = T0 + T2 = xx + y*y*y*y
    fq2::add(T0, T2, T3);

    // T1 = T1 - T3 = x*x + y*y*y*y + 2*x*x*y*y*y*y - x*x - y*y*y*y = 2*x*x*y*y*y*y = 2*S
    fq2::sub(T1, T3, T1);

    // T1 = 2T1 = 4*S
    fq2::add(T1, T1, T1);

    // T3 = 3T0
    fq2::add(T0, T0, T3);
    fq2::add(T3, T0, T3);

    // x2 = T3*T3
    fq2::sqr(T3, p2.x);

    // T0 = 2T1
    fq2::add(T1, T1, T0);

    // x2 = x2 - 2T1
    fq2::sub(p2.x, T0, p2.x);
    // T2 = 8T2
    fq2::add(T2, T2, T2);
    fq2::add(T2, T2, T2);
    fq2::add(T2, T2, T2);

    // y2 = T1 - x2
    fq2::sub(T1, p2.x, p2.y);
    // y2 = y2 * T3
    fq2::mul(p2.y, T3, p2.y);
    // y2 = y2 - T2
    fq2::sub(p2.y, T2, p2.y);
}

inline void mixed_add_inner(element &p1, affine_element &p2, element &p3)
{
    fq2::fq2_t T0;
    fq2::fq2_t T1;
    fq2::fq2_t T2;
    fq2::fq2_t T3;

    // T0 = z1.z1
    fq2::sqr(p1.z, T0);

    // T1 = x2.t0 = x2.z1.z1
    fq2::mul(p2.x, T0, T1);

    // T1 = T1 - x1 = x2.z1.z1 - x1 (H)
    fq2::sub(T1, p1.x, T1);

    // T2 = T0.z1 = z1.z1.z1
    fq2::mul(p1.z, T0, T2);

    // T2 = T2.y2 = y2.z1.z1.z1
    fq2::mul(T2, p2.y, T2);

    // T2 = T2 - y1 = y2.z1.z1.z1 - y1
    fq2::sub(T2, p1.y, T2);

    if (__builtin_expect(((T1.c0.data[0] | T1.c0.data[1] | T1.c0.data[2] | T1.c0.data[3] | T1.c1.data[0] | T1.c1.data[1] | T1.c1.data[2] | T1.c1.data[3]) == 0), 0))
    {
        if ((T2.c0.data[0] | T2.c0.data[1] | T2.c0.data[2] | T2.c0.data[3] | T2.c1.data[0] | T2.c1.data[1] | T2.c1.data[2] | T2.c1.data[3]) == 0)
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
    fq2::add(T2, T2, T2);

    // T3 = T1*T1 = HH
    fq2::sqr(T1, T3);

    // z3 = z1 + H
    fq2::add(p1.z, T1, p3.z);

    // z3 = (z1 + H)*(z1 + H)
    fq2::sqr(p3.z, p3.z);

    // z3 = z3 - z1z1 - HH
    fq2::add(T0, T3, T0);
    fq2::sub(p3.z, T0, p3.z);

    // T3 = 4HH
    fq2::add(T3, T3, T3);
    fq2::add(T3, T3, T3);

    // T1 = T1*T3 = 4HHH
    fq2::mul(T1, T3, T1);

    // T3 = T3 * x1 = 4HH*x1
    fq2::mul(T3, p1.x, T3);

    // T0 = 2T3
    fq2::add(T3, T3, T0);

    // T0 = T0 * T1 = 2(4HH*x1) + 4HHH
    fq2::add(T0, T1, T0);

    // x3 = T2*T2 = R*R
    fq2::sqr(T2, p3.x);

    // x3 = x3 - T0 = R*R - 8HH*x1 -4HHH
    fq2::sub(p3.x, T0, p3.x);

    // T3 = T3 - x3 = 4HH*x1 - x3
    fq2::sub(T3, p3.x, T3);

    // T3 = T2 * T3 = R*(4HH*x1 - x3)
    fq2::mul(T3, T2, T3);

    // T1 = T1 * y1 = 4HHH*y1
    fq2::mul(T1, p1.y, T1);
    // T1 = 2T1 = 8HHH*y1
    fq2::add(T1, T1, T1);
    // y3 = T3 - T1
    fq2::sub(T3, T1, p3.y);
}

inline void mixed_add(element &p1, affine_element &p2, element &p3)
{
    // TODO: quantitavely check if __builtin_expect helps here
    // if (__builtin_expect(((p1.y.data[3] >> 63)), 0))
    if (p1.y.c0.data[3] >> 63)
    {
        fq2::copy(p2.x, p3.x);
        fq2::copy(p2.y, p3.y);
        p3.z = fq2::one();
        return;
    }
    mixed_add_inner(p1, p2, p3);
}

inline void mixed_add_expect_empty(element &p1, affine_element &p2, element &p3)
{
    if (__builtin_expect(int((p1.y.c0.data[3] >> 63UL)), 1))
    {
        fq2::copy(p2.x, p3.x);
        fq2::copy(p2.y, p3.y);
        p3.z = fq2::one();
        return;
    }
    mixed_add_inner(p1, p2, p3);
}

inline void add(element &p1, element &p2, element &p3)
{
    bool p1_zero = (p1.y.c0.data[3] >> 63) == 1;
    bool p2_zero = (p2.y.c0.data[3] >> 63) == 1; // ((p2.z.data[0] | p2.z.data[1] | p2.z.data[2] | p2.z.data[3]) == 0);
    if (__builtin_expect((p1_zero || p2_zero), 0))
    {
        if (p1_zero && !p2_zero)
        {
            fq2::copy(p2.x, p3.x);
            fq2::copy(p2.y, p3.y);
            fq2::copy(p2.z, p3.z);
            return;
        }
        if (p2_zero && !p1_zero)
        {
            fq2::copy(p1.x, p3.x);
            fq2::copy(p1.y, p3.y);
            fq2::copy(p1.z, p3.z);
            return;
        }
        set_infinity(p3);
        return;
    }
    fq2::fq2_t Z1Z1;
    fq2::fq2_t Z2Z2;
    fq2::fq2_t U1;
    fq2::fq2_t U2;
    fq2::fq2_t S1;
    fq2::fq2_t S2;
    fq2::fq2_t F;
    fq2::fq2_t H;
    fq2::fq2_t I;
    fq2::fq2_t J;

    // Z1Z1 = Z1*Z1
    fq2::sqr(p1.z, Z1Z1);
    // Z2Z2 = Z2*Z2
    fq2::sqr(p2.z, Z2Z2);
    // U1 = Z2Z2*X1
    fq2::mul(p1.x, Z2Z2, U1);
    // U2 = Z1Z1*X2
    fq2::mul(p2.x, Z1Z1, U2);
    // S1 = Z2*Z2*Z2
    fq2::mul(p2.z, Z2Z2, S1);
    // S2 = Z1*Z1*Z1
    fq2::mul(p1.z, Z1Z1, S2);
    // S1 = Z2*Z2*Z2*Y1
    fq2::mul(S1, p1.y, S1);
    // S2 = Z1*Z1*Z1*Y2
    fq2::mul(S2, p2.y, S2);
    // H = U2 - U1
    fq2::sub(U2, U1, H);
    // F = S2 - S1
    fq2::sub(S2, S1, F);

    if (__builtin_expect(((H.c0.data[0] | H.c0.data[1] | H.c0.data[2] | H.c0.data[3] | H.c1.data[0] | H.c1.data[1] | H.c1.data[2] | H.c1.data[3]) == 0), 0))
    {
        if ((F.c0.data[0] | F.c0.data[1] | F.c0.data[2] | F.c0.data[3] | F.c1.data[0] | F.c1.data[1] | F.c1.data[2] | F.c1.data[3]) == 0)
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
    fq2::add(F, F, F);
    // I = 2*H
    fq2::add(H, H, I);
    // I = I * I = 4*H*H
    fq2::sqr(I, I);
    // J = H * I = 4*H*H*H
    fq2::mul(H, I, J);
    // U1 (V) = U1*I
    fq2::mul(U1, I, U1);
    // U2 (W) = 2*V
    fq2::add(U1, U1, U2);
    // W = W + J = 2*V + 4*H*H*H
    fq2::add(U2, J, U2);
    // X3 = F*F = 4(S2 - S1)(S2 - S1)
    fq2::sqr(F, p3.x);
    // X3 = X3 - w = 4(S2 - S1)(S2 - S1) - 2*V - 4*H*H*H
    fq2::sub(p3.x, U2, p3.x);
    // J = J*S1
    fq2::mul(J, S1, J);
    // J = 2J
    fq2::add(J, J, J);

    // Y3 = V - X3
    fq2::sub(U1, p3.x, p3.y);
    // Y3 = Y3 * F
    fq2::mul(p3.y, F, p3.y);
    // Y3 = Y3 - J
    fq2::sub(p3.y, J, p3.y);

    // Z3 = Z1 + Z2
    fq2::add(p1.z, p2.z, p3.z);
    // Z3 = (Z1 + Z2)(Z1 + Z2)
    fq2::sqr(p3.z, p3.z);
    // Z3 = Z3 - (Z1Z1 + Z2Z2)
    fq2::add(Z1Z1, Z2Z2, Z1Z1);
    fq2::sub(p3.z, Z1Z1, p3.z);
    fq2::mul(p3.z, H, p3.z);
}

inline void mul_by_q(const element &a, element &r)
{
    fq2::fq2_t T0;
    fq2::fq2_t T1;
    fq2::frobenius_map(a.x, T0);
    fq2::frobenius_map(a.y, T1);
    fq2::mul(twist_mul_by_q_x, T0, r.x);
    fq2::mul(twist_mul_by_q_y, T1, r.y);
    fq2::frobenius_map(a.z, r.z);
}

inline void neg(const element &a, element &r)
{
    fq2::copy(a.x, r.x);
    fq2::copy(a.y, r.y);
    fq2::neg(r.y, r.y);
}

inline void copy(const element &a, element &r)
{
    fq2::copy(a.x, r.x);
    fq2::copy(a.y, r.y);
    fq2::copy(a.z, r.z);
}

inline void copy_affine(const affine_element &a, affine_element &r)
{
    fq2::copy(a.x, r.x);
    fq2::copy(a.y, r.y);
}


inline element normalize(element &src)
{
    element dest;
    fq2::fq2_t z_inv;
    fq2::fq2_t zz_inv;
    fq2::fq2_t zzz_inv;

    fq2::invert(src.z, z_inv);
    fq2::sqr(z_inv, zz_inv);
    fq2::mul(z_inv, zz_inv, zzz_inv);
    fq2::mul(src.x, zz_inv, dest.x);
    fq2::mul(src.y, zzz_inv, dest.y);
    dest.z = fq2::one();
    return dest;
}

/**
     * Normalize a batch of affine points via Montgomery's trick, so that their z-coordinate's are equal to unity
     * Requires: 6 mul, 1 sqr per point, plus 1 inverse
     **/
inline void batch_normalize(element *points, size_t num_points)
{
    fq2::fq2_t *temporaries = (fq2::fq2_t *)(aligned_alloc(32, sizeof(fq2::fq2_t) * num_points));
    fq2::fq2_t accumulator = fq2::one();
    fq2::fq2_t z_inv;
    fq2::fq2_t zz_inv;
    fq2::fq2_t zzz_inv;

    // Iterate over the points, computing the product of their z-coordinates.
    // At each iteration, store the currently-accumulated z-coordinate in `temporaries`
    for (size_t i = 0; i < num_points; ++i)
    {
        fq2::copy(accumulator, temporaries[i]);
        fq2::mul(accumulator, points[i].z, accumulator);
    }
    // For the rest of this method I'll refer to the product of all z-coordinates as the 'global' z-coordinate
    // Invert the global z-coordinate and store in `accumulator`
    fq2::invert(accumulator, accumulator);

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
        fq2::mul(accumulator, temporaries[i], z_inv);
        fq2::sqr(z_inv, zz_inv);
        fq2::mul(z_inv, zz_inv, zzz_inv);
        fq2::mul(points[i].x, zz_inv, points[i].x);
        fq2::mul(points[i].y, zzz_inv, points[i].y);
        fq2::mul(accumulator, points[i].z, accumulator);
        points[i].z = fq2::one();
    }

    free(temporaries);
}

inline bool on_curve(affine_element &pt)
{
    if (is_point_at_infinity(pt)) {
        return false;
    }
    fq2::fq2_t yy;
    fq2::fq2_t xxx;
    fq2::sqr(pt.x, xxx);
    fq2::mul(pt.x, xxx, xxx);
    fq2::add(xxx, fq2::twist_coeff_b, xxx);
    fq2::sqr(pt.y, yy);
    fq2::from_montgomery_form(xxx, xxx);
    fq2::from_montgomery_form(yy, yy);
    return fq2::eq(xxx, yy);
}

inline bool on_curve(element &pt)
{
    if (is_point_at_infinity(pt)) {
        return false;
    }
    fq2::fq2_t yy;
    fq2::fq2_t xxx;
    fq2::fq2_t zz;
    fq2::fq2_t bz_6;
    fq2::sqr(pt.z, zz);
    fq2::sqr(zz, bz_6);
    fq2::mul(zz, bz_6, bz_6);
    fq2::mul(bz_6, fq2::twist_coeff_b, bz_6);
    fq2::sqr(pt.x, xxx);
    fq2::mul(pt.x, xxx, xxx);
    fq2::add(xxx, bz_6, xxx);
    fq2::sqr(pt.y, yy);
    return fq2::eq(xxx, yy);
}

inline void jacobian_to_affine(element &a, affine_element &r)
{
    a = normalize(a);
    fq2::copy(a.x, r.x);
    fq2::copy(a.y, r.y);
}

inline void affine_to_jacobian(const affine_element &a, element &r)
{
    fq2::copy(a.x, r.x);
    fq2::copy(a.y, r.y);
    r.z = fq2::one();
}

inline element group_exponentiation_inner(const affine_element &a, const fr::field_t &scalar)
{
    if (fr::eq(scalar, fr::zero()))
    {
        element result;
        result.x = fq2::zero();
        result.y = fq2::zero();
        result.z = fq2::zero();
        set_infinity(result);
        return result;
    }
    element work_element;
    element point;
    affine_to_jacobian(a, work_element);
    affine_to_jacobian(a, point);
    fr::field_t converted_scalar;
    fr::from_montgomery_form(scalar, converted_scalar);
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

inline affine_element group_exponentiation(const affine_element& a, const fr::field_t& scalar)
{
    element output = group_exponentiation_inner(a, scalar);
    affine_element result;
    if (is_point_at_infinity(output))
    {
        result.x = fq2::zero();
        result.y = fq2::zero();
        set_infinity(result);
    }
    else
    {
        batch_normalize(&output, 1);
        fq2::copy(output.x, result.x);
        fq2::copy(output.y, result.y);
    }
    return result;
}

inline element random_element()
{
    fr::field_t scalar = fr::random_element();
    affine_element res = affine_one();
    res = group_exponentiation(res, scalar);
    element out;
    affine_to_jacobian(res, out);
    return out;
}

inline affine_element random_affine_element()
{
    element ele = random_element();
    affine_element result;
    jacobian_to_affine(ele, result);
    return result;
}

inline bool eq(const element& a, const element& b)
{
    bool both_infinity = is_point_at_infinity(a) && is_point_at_infinity(b);

    fq2::fq2_t a_zz;
    fq2::fq2_t a_zzz;
    fq2::fq2_t b_zz;
    fq2::fq2_t b_zzz;

    fq2::sqr(a.z, a_zz);
    fq2::mul(a.z, a_zz, a_zzz);

    fq2::sqr(b.z, b_zz);
    fq2::mul(b.z, b_zz, b_zzz);

    fq2::fq2_t T0;
    fq2::fq2_t T1;
    fq2::fq2_t T2;
    fq2::fq2_t T3;
    fq2::mul(a.x, b_zz, T0);
    fq2::mul(a.y, b_zzz, T1);
    fq2::mul(b.x, a_zz, T2);
    fq2::mul(b.y, a_zzz, T3);

    return both_infinity || ((fq2::eq(T0, T2) && fq2::eq(T1, T3)));
}

inline bool eq(const affine_element& a, const affine_element& b)
{
    element a_ele;
    element b_ele;
    affine_to_jacobian(a, a_ele);
    affine_to_jacobian(b, b_ele);
    return eq(a_ele, b_ele);
}

inline void print(element &a)
{
    printf("g2: \n x: ");
    fq2::print(a.x);
    printf("y: \n");
    fq2::print(a.y);
    printf("z: \n");
    fq2::print(a.z);
}
} // namespace g2
} // namespace barretenberg

#endif