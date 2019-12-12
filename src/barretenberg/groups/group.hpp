#pragma once

#include <cinttypes>
#include <cstdint>
#include <cstdio>
#include <cstdlib>

#include "../assert.hpp"
#include "../types.hpp"
#include "./wnaf.hpp"

namespace barretenberg
{
template <typename coordinate_field, typename subgroup_field, typename GroupParams> class group
{
  public:
    struct affine_element
    {
        typename coordinate_field::field_t x;
        typename coordinate_field::field_t y;
    };

    struct element
    {
        typename coordinate_field::field_t x;
        typename coordinate_field::field_t y;
        typename coordinate_field::field_t z;
    };

    static inline void print(affine_element& p)
    {
        printf("p.x: ");
        coordinate_field::print(p.x);
        printf("p.y: ");
        coordinate_field::print(p.y);
    }

    static inline void print(element& p)
    {
        printf("p.x: ");
        coordinate_field::print(p.x);
        printf("p.y: ");
        coordinate_field::print(p.y);
        printf("p.z: ");
        coordinate_field::print(p.z);
    }

    static inline void random_coordinates_on_curve(typename coordinate_field::field_t& x,
                                                   typename coordinate_field::field_t& y)
    {
        bool found_one = false;
        typename coordinate_field::field_t yy;
        typename coordinate_field::field_t t0;

        while (!found_one)
        {
            // generate a random x-coordinate
            x = coordinate_field::random_element();
            // derive y^2 = x^3 + b
            coordinate_field::__sqr(x, yy);
            coordinate_field::__mul(x, yy, yy);
            coordinate_field::__add(yy, GroupParams::b, yy);
            // compute sqrt(y)
            coordinate_field::__sqrt(yy, y);
            coordinate_field::__sqr(y, t0);
            // does yy have a valid quadratic residue? is y a valid square root?
            coordinate_field::__from_montgomery_form(yy, yy);
            coordinate_field::__from_montgomery_form(t0, t0);
            found_one = coordinate_field::eq(yy, t0);
        }
    }

    static inline element random_element()
    {
        if constexpr (GroupParams::can_hash_to_curve)
        {
            element output;
            random_coordinates_on_curve(output.x, output.y);
            output.z = coordinate_field::random_element();
            typename coordinate_field::field_t zz;
            typename coordinate_field::field_t zzz;
            coordinate_field::__sqr(output.z, zz);
            coordinate_field::__mul(output.z, zz, zzz);
            coordinate_field::__mul(output.x, zz, output.x);
            coordinate_field::__mul(output.y, zzz, output.y);
            return output;
        }
        else
        {
            typename subgroup_field::field_t scalar = subgroup_field::random_element();
            affine_element res = affine_one();
            res = group_exponentiation(res, scalar);
            element result;
            affine_to_jacobian(res, result);
            return result;
        }
    }

    static inline affine_element random_affine_element()
    {
        if constexpr (GroupParams::can_hash_to_curve)
        {
            affine_element output;
            random_coordinates_on_curve(output.x, output.y);
            return output;
        }
        else
        {
            element ele = random_element();
            affine_element out;
            jacobian_to_affine(ele, out);
            return out;
        }
    }

    static inline element one()
    {
        element output;
        output.x = GroupParams::one_x;
        output.y = GroupParams::one_y;
        output.z = coordinate_field::one;
        return output;
    }

    static inline affine_element affine_one()
    {
        affine_element output;
        output.x = GroupParams::one_x;
        output.y = GroupParams::one_y;
        return output;
    }

    static inline bool is_point_at_infinity(const affine_element& p)
    {
        return coordinate_field::is_msb_set(p.y);
    }

    static inline bool is_point_at_infinity(const element& p)
    {
        return coordinate_field::is_msb_set(p.y);
    }

    static inline void set_infinity(element& p)
    {
        coordinate_field::__set_msb(p.y);
    }

    static inline void set_infinity(affine_element& p)
    {
        coordinate_field::__set_msb(p.y);
    }

    static inline void dbl(element& p1, element& p2) noexcept
    {
        if (coordinate_field::is_msb_set_word(p1.y))
        {
            set_infinity(p2);
            return;
        }
        typename coordinate_field::field_t T0;
        typename coordinate_field::field_t T1;
        typename coordinate_field::field_t T2;
        typename coordinate_field::field_t T3;

        // z2 = 2*y*z
        coordinate_field::__add_without_reduction(p1.z, p1.z, p2.z);
        coordinate_field::__mul_with_coarse_reduction(p2.z, p1.y, p2.z);
        coordinate_field::reduce_once(p2.z, p2.z);

        // T0 = x*x
        coordinate_field::__sqr_with_coarse_reduction(p1.x, T0);

        // T1 = y*y
        coordinate_field::__sqr_with_coarse_reduction(p1.y, T1);

        // T2 = T2*T1 = y*y*y*y
        coordinate_field::__sqr_with_coarse_reduction(T1, T2);

        // T1 = T1 + x = x + y*y
        coordinate_field::__add_with_coarse_reduction(T1, p1.x, T1);

        // T1 = T1 * T1
        coordinate_field::__sqr_with_coarse_reduction(T1, T1);

        // T3 = T0 + T2 = xx + y*y*y*y
        coordinate_field::__add_with_coarse_reduction(T0, T2, T3);

        // T1 = T1 - T3 = x*x + y*y*y*y + 2*x*x*y*y*y*y - x*x - 7*y*y*y = 2*x*x*y*y*y*y = 2*S
        coordinate_field::__sub_with_coarse_reduction(T1, T3, T1);

        // T1 = 2T1 = 4*S
        coordinate_field::__add_with_coarse_reduction(T1, T1, T1);

        // T3 = 3T0
        coordinate_field::__add_with_coarse_reduction(T0, T0, T3);
        coordinate_field::__add_with_coarse_reduction(T3, T0, T3);

        // T0 = 2T1
        coordinate_field::__add_with_coarse_reduction(T1, T1, T0);

        // x2 = T3*T3
        coordinate_field::__sqr_with_coarse_reduction(T3, p2.x);
        // x2 = x2 - 2T1
        coordinate_field::__sub_with_coarse_reduction(p2.x, T0, p2.x);
        coordinate_field::reduce_once(p2.x, p2.x);

        // T2 = 8T2
        coordinate_field::__oct_with_coarse_reduction(T2, T2);

        // y2 = T1 - x2
        coordinate_field::__sub_with_coarse_reduction(T1, p2.x, p2.y);

        // y2 = y2 * T3 - T2
        coordinate_field::__mul_with_coarse_reduction(p2.y, T3, p2.y);
        coordinate_field::__sub_with_coarse_reduction(p2.y, T2, p2.y);
        coordinate_field::reduce_once(p2.y, p2.y);
    }

    static inline void mixed_add_inner(element& p1, const affine_element& p2, element& p3) noexcept
    {
        typename coordinate_field::field_t T0;
        typename coordinate_field::field_t T1;
        typename coordinate_field::field_t T2;
        typename coordinate_field::field_t T3;

        // T0 = z1.z1
        // coordinate_field::__sqr(p1.z, T0);
        coordinate_field::__sqr_with_coarse_reduction(p1.z, T0);

        // T1 = x2.t0 - x1 = x2.z1.z1 - x1
        coordinate_field::__mul(p2.x, T0, T1);
        coordinate_field::__sub(T1, p1.x, T1);

        // T2 = T0.z1 = z1.z1.z1
        coordinate_field::__mul_with_coarse_reduction(p1.z, T0, T2);

        // // T2 = T2.y2 - y1 = y2.z1.z1.z1 - y1
        coordinate_field::__mul(T2, p2.y, T2);
        coordinate_field::__sub(T2, p1.y, T2);

        if (__builtin_expect(coordinate_field::is_zero(T1), 0))
        {
            if (coordinate_field::is_zero(T2))
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
        coordinate_field::__paralell_double_and_add_without_reduction(T2, p1.z, T1, p3.z);

        // T3 = T1*T1 = HH
        coordinate_field::__sqr_with_coarse_reduction(T1, T3);

        // z3 = z3 - z1z1 - HH
        coordinate_field::__add_with_coarse_reduction(T0, T3, T0);

        // z3 = (z1 + H)*(z1 + H)
        coordinate_field::__sqr_with_coarse_reduction(p3.z, p3.z);
        coordinate_field::__sub_with_coarse_reduction(p3.z, T0, p3.z);
        coordinate_field::reduce_once(p3.z, p3.z);

        // T3 = 4HH
        coordinate_field::__quad_with_coarse_reduction(T3, T3);

        // T1 = T1*T3 = 4HHH
        coordinate_field::__mul_with_coarse_reduction(T1, T3, T1);

        // T3 = T3 * x1 = 4HH*x1
        coordinate_field::__mul_with_coarse_reduction(T3, p1.x, T3);

        // T0 = 2T3
        coordinate_field::__add_with_coarse_reduction(T3, T3, T0);

        // T0 = T0 + T1 = 2(4HH*x1) + 4HHH
        coordinate_field::__add_with_coarse_reduction(T0, T1, T0);
        coordinate_field::__sqr_with_coarse_reduction(T2, p3.x);

        // x3 = x3 - T0 = R*R - 8HH*x1 -4HHH
        coordinate_field::__sub_with_coarse_reduction(p3.x, T0, p3.x);

        // T3 = T3 - x3 = 4HH*x1 - x3
        coordinate_field::__sub_with_coarse_reduction(T3, p3.x, T3);
        coordinate_field::reduce_once(p3.x, p3.x);

        coordinate_field::__mul_with_coarse_reduction(T1, p1.y, T1);
        coordinate_field::__add_with_coarse_reduction(T1, T1, T1);

        // T3 = T2 * T3 = R*(4HH*x1 - x3)
        coordinate_field::__mul_with_coarse_reduction(T3, T2, T3);

        // y3 = T3 - T1
        coordinate_field::__sub_with_coarse_reduction(T3, T1, p3.y);
        coordinate_field::reduce_once(p3.y, p3.y);
    }
    // add: 10 mul_w_o_reduction 1 mul, 5 sqr

    static inline void mixed_add(element& p1, const affine_element& p2, element& p3) noexcept
    {
        // TODO: quantitavely check if __builtin_expect helps here
        // if (__builtin_expect(((p1.y.data[3] >> 63)), 0))

        // N.B. we implicitly assume p2 is not a point at infinity, as it will be coming from a lookup table of
        // constants
        if (coordinate_field::is_msb_set_word(p1.y))
        {
            coordinate_field::__copy(p2.x, p3.x);
            coordinate_field::__copy(p2.y, p3.y);
            coordinate_field::__copy(coordinate_field::one, p3.z);
            return;
        }

        mixed_add_inner(p1, p2, p3);
    }

    static inline void add(element& p1, element& p2, element& p3)
    {
        bool p1_zero = coordinate_field::is_msb_set(p1.y); // (p1.y.data[3] >> 63) == 1;
        bool p2_zero = coordinate_field::is_msb_set(
            p2.y); // (p2.y.data[3] >> 63) == 1; // ((p2.z.data[0] | p2.z.data[1] | p2.z.data[2] | p2.z.data[3]) == 0);
        if (__builtin_expect((p1_zero || p2_zero), 0))
        {
            if (p1_zero && !p2_zero)
            {
                coordinate_field::__copy(p2.x, p3.x);
                coordinate_field::__copy(p2.y, p3.y);
                coordinate_field::__copy(p2.z, p3.z);
                return;
            }
            if (p2_zero && !p1_zero)
            {
                coordinate_field::__copy(p1.x, p3.x);
                coordinate_field::__copy(p1.y, p3.y);
                coordinate_field::__copy(p1.z, p3.z);
                return;
            }
            set_infinity(p3);
            return;
        }
        typename coordinate_field::field_t Z1Z1;
        typename coordinate_field::field_t Z2Z2;
        typename coordinate_field::field_t U1;
        typename coordinate_field::field_t U2;
        typename coordinate_field::field_t S1;
        typename coordinate_field::field_t S2;
        typename coordinate_field::field_t F;
        typename coordinate_field::field_t H;
        typename coordinate_field::field_t I;
        typename coordinate_field::field_t J;

        // Z1Z1 = Z1*Z1
        coordinate_field::__sqr_with_coarse_reduction(p1.z, Z1Z1);
        // Z2Z2 = Z2*Z2
        coordinate_field::__sqr_with_coarse_reduction(p2.z, Z2Z2);
        // U1 = Z2Z2*X1
        coordinate_field::__mul_with_coarse_reduction(p1.x, Z2Z2, U1);
        // U2 = Z1Z1*X2
        coordinate_field::__mul_with_coarse_reduction(p2.x, Z1Z1, U2);
        // S1 = Z2*Z2*Z2
        coordinate_field::__mul_with_coarse_reduction(p2.z, Z2Z2, S1);
        // S2 = Z1*Z1*Z1
        coordinate_field::__mul_with_coarse_reduction(p1.z, Z1Z1, S2);
        // S1 = Z2*Z2*Z2*Y1
        coordinate_field::__mul_with_coarse_reduction(S1, p1.y, S1);
        // S2 = Z1*Z1*Z1*Y2
        coordinate_field::__mul_with_coarse_reduction(S2, p2.y, S2);
        // H = U2 - U1
        coordinate_field::__sub_with_coarse_reduction(U2, U1, H);
        coordinate_field::reduce_once(H, H);
        // F = S2 - S1
        coordinate_field::__sub_with_coarse_reduction(S2, S1, F);
        coordinate_field::reduce_once(F, F);

        if (__builtin_expect(coordinate_field::is_zero(H), 0))
        {
            if (coordinate_field::is_zero(F))
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
        coordinate_field::__paralell_double_and_add_without_reduction(F, H, H, I);

        // I = I * I = 4*H*H
        coordinate_field::__sqr_with_coarse_reduction(I, I);

        // J = H * I = 4*H*H*H
        coordinate_field::__mul_with_coarse_reduction(H, I, J);

        // U1 (V) = U1*I
        coordinate_field::__mul_with_coarse_reduction(U1, I, U1);

        // U2 (W) = 2*V
        coordinate_field::__add_with_coarse_reduction(U1, U1, U2);
        // W = W + J = 2*V + 4*H*H*H
        coordinate_field::__add_with_coarse_reduction(U2, J, U2);

        // // X3 = F*F = 4(S2 - S1)(S2 - S1)
        coordinate_field::__sqr_with_coarse_reduction(F, p3.x);

        // // X3 = X3 - w = 4(S2 - S1)(S2 - S1) - 2*V - 4*H*H*H
        coordinate_field::__sub_with_coarse_reduction(p3.x, U2, p3.x);
        coordinate_field::reduce_once(p3.x, p3.x); // ensure p3.x < p

        // // J = J*S1
        coordinate_field::__mul_with_coarse_reduction(J, S1, J);
        // // J = 2J
        coordinate_field::__add_with_coarse_reduction(J, J, J);

        // Y3 = V - X3
        coordinate_field::__sub_with_coarse_reduction(U1, p3.x, p3.y);

        // // Y3 = Y3 * F
        coordinate_field::__mul_with_coarse_reduction(p3.y, F, p3.y);
        // // Y3 = Y3 - J
        coordinate_field::__sub_with_coarse_reduction(p3.y, J, p3.y);
        coordinate_field::reduce_once(p3.y, p3.y); // ensure p3.y < p

        // Z3 = Z1 + Z2
        coordinate_field::__add_with_coarse_reduction(p1.z, p2.z, p3.z);

        // Z3 = Z3 - (Z1Z1 + Z2Z2)
        coordinate_field::__add_with_coarse_reduction(Z1Z1, Z2Z2, Z1Z1);

        // // Z3 = (Z1 + Z2)(Z1 + Z2)
        coordinate_field::__sqr_with_coarse_reduction(p3.z, p3.z);
        coordinate_field::__sub_with_coarse_reduction(p3.z, Z1Z1, p3.z);
        coordinate_field::__mul(p3.z, H, p3.z);
    }

    static inline element normalize(element& src)
    {
        element dest;
        typename coordinate_field::field_t z_inv;
        typename coordinate_field::field_t zz_inv;
        typename coordinate_field::field_t zzz_inv;

        coordinate_field::__invert(src.z, z_inv);
        coordinate_field::__sqr(z_inv, zz_inv);
        coordinate_field::__mul(z_inv, zz_inv, zzz_inv);
        coordinate_field::__mul(src.x, zz_inv, dest.x);
        coordinate_field::__mul(src.y, zzz_inv, dest.y);
        dest.z = coordinate_field::one;
        if (is_point_at_infinity(src))
        {
            set_infinity(dest);
        }
        return dest;
    }

    /**
     * Normalize a batch of affine points via Montgomery's trick, so that their z-coordinate's are equal to unity
     * Requires: 6 mul, 1 sqr per point, plus 1 inverse
     **/
    static inline void batch_normalize(element* points, size_t num_points)
    {
        typename coordinate_field::field_t* temporaries = (typename coordinate_field::field_t*)(aligned_alloc(
            32, sizeof(typename coordinate_field::field_t) * num_points * 2));
        typename coordinate_field::field_t accumulator = coordinate_field::one;
        typename coordinate_field::field_t z_inv;
        typename coordinate_field::field_t zz_inv;
        typename coordinate_field::field_t zzz_inv;

        // Iterate over the points, computing the product of their z-coordinates.
        // At each iteration, store the currently-accumulated z-coordinate in `temporaries`
        for (size_t i = 0; i < num_points; ++i)
        {
            coordinate_field::__copy(accumulator, temporaries[i]);
            if (!is_point_at_infinity(points[i]))
            {
                coordinate_field::__mul(accumulator, points[i].z, accumulator);
            }
        }
        // For the rest of this method I'll refer to the product of all z-coordinates as the 'global' z-coordinate
        // Invert the global z-coordinate and store in `accumulator`
        coordinate_field::__invert(accumulator, accumulator);

        /**
         * We now proceed to iterate back down the array of points.
         * At each iteration we update the accumulator to contain the z-coordinate of the currently worked-upon
         *z-coordinate. We can then multiply this accumulator with `temporaries`, to get a scalar that is equal to the
         *inverse of the z-coordinate of the point at the next iteration cycle e.g. Imagine we have 4 points, such that:
         *
         * accumulator = 1 / z.data[0]*z.data[1]*z.data[2]*z.data[3]
         * temporaries[3] = z.data[0]*z.data[1]*z.data[2]
         * temporaries[2] = z.data[0]*z.data[1]
         * temporaries[1] = z.data[0]
         * temporaries[0] = 1
         *
         * At the first iteration, accumulator * temporaries[3] = z.data[0]*z.data[1]*z.data[2] /
         *z.data[0]*z.data[1]*z.data[2]*z.data[3]  = (1 / z.data[3]) We then update accumulator, such that:
         *
         * accumulator = accumulator * z.data[3] = 1 / z.data[0]*z.data[1]*z.data[2]
         *
         * At the second iteration, accumulator * temporaries[2] = z.data[0]*z.data[1] / z.data[0]*z.data[1]*z.data[2] =
         *(1 z.data[2]) And so on, until we have computed every z-inverse!
         *
         * We can then convert out of Jacobian form (x = X / Z^2, y = Y / Z^3) with 4 muls and 1 square.
         **/
        for (size_t i = num_points - 1; i < num_points; --i)
        {
            if (!is_point_at_infinity(points[i]))
            {
                coordinate_field::__mul(accumulator, temporaries[i], z_inv);
                coordinate_field::__sqr(z_inv, zz_inv);
                coordinate_field::__mul(z_inv, zz_inv, zzz_inv);
                coordinate_field::__mul(points[i].x, zz_inv, points[i].x);
                coordinate_field::__mul(points[i].y, zzz_inv, points[i].y);
                coordinate_field::__mul(accumulator, points[i].z, accumulator);
            }
            points[i].z = coordinate_field::one;
        }

        aligned_free(temporaries);
    }

    static inline bool on_curve(const affine_element& pt)
    {
        if (is_point_at_infinity(pt))
        {
            return false;
        }
        typename coordinate_field::field_t yy;
        typename coordinate_field::field_t xxx;
        coordinate_field::__sqr(pt.x, xxx);
        coordinate_field::__mul(pt.x, xxx, xxx);
        coordinate_field::__add(xxx, GroupParams::b, xxx);
        coordinate_field::__sqr(pt.y, yy);
        coordinate_field::__from_montgomery_form(xxx, xxx);
        coordinate_field::__from_montgomery_form(yy, yy);
        return coordinate_field::eq(xxx, yy);
    }

    static inline bool on_curve(const element& pt)
    {
        if (is_point_at_infinity(pt))
        {
            return false;
        }
        typename coordinate_field::field_t yy;
        typename coordinate_field::field_t xxx;
        typename coordinate_field::field_t zz;
        typename coordinate_field::field_t bz_6;
        coordinate_field::__sqr(pt.z, zz);
        coordinate_field::__sqr(zz, bz_6);
        coordinate_field::__mul(zz, bz_6, bz_6);
        coordinate_field::__mul(bz_6, GroupParams::b, bz_6);
        coordinate_field::__sqr(pt.x, xxx);
        coordinate_field::__mul(pt.x, xxx, xxx);
        coordinate_field::__add(xxx, bz_6, xxx);
        coordinate_field::__sqr(pt.y, yy);
        return coordinate_field::eq(xxx, yy);
    }

    static inline void __neg(const element& a, element& r)
    {
        coordinate_field::__copy(a.x, r.x);
        coordinate_field::__copy(a.y, r.y);
        coordinate_field::__copy(a.z, r.z);
        coordinate_field::__neg(r.y, r.y);
    }

    static inline void __neg(const affine_element& a, affine_element& r)
    {
        coordinate_field::__copy(a.x, r.x);
        coordinate_field::__neg(a.y, r.y);
    }

    static inline void affine_to_jacobian(const affine_element& a, element& r)
    {
        coordinate_field::__copy(a.x, r.x);
        coordinate_field::__copy(a.y, r.y);
        r.z = coordinate_field::one;
    }

    static inline void jacobian_to_affine(element& a, affine_element& r)
    {
        a = normalize(a);
        coordinate_field::__copy(a.x, r.x);
        coordinate_field::__copy(a.y, r.y);
    }

    static inline void copy_affine(const affine_element& a, affine_element& r)
    {
        coordinate_field::__copy(a.x, r.x);
        coordinate_field::__copy(a.y, r.y);
    }

    static inline element group_exponentiation_no_endo(const element& a, const typename subgroup_field::field_t& scalar)
    {
        if (subgroup_field::eq(scalar, subgroup_field::zero))
        {
            element result;
            result.x = coordinate_field::zero;
            result.y = coordinate_field::zero;
            result.z = coordinate_field::zero;
            set_infinity(result);
            return result;
        }
        element work_element = a;
        element point = a;

        typename subgroup_field::field_t converted_scalar;
        subgroup_field::__from_montgomery_form(scalar, converted_scalar);
        bool scalar_bits[256] = { 0 };
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


    static inline element group_exponentiation_endo(const element& a, const typename subgroup_field::field_t& scalar)
    {
        typename subgroup_field::field_t converted_scalar;

        subgroup_field::__from_montgomery_form(scalar, converted_scalar);

        if (subgroup_field::eq(converted_scalar, subgroup_field::zero))
        {
            element result;
            result.x = coordinate_field::zero;
            result.y = coordinate_field::zero;
            result.z = coordinate_field::zero;
            set_infinity(result);
            return result;
        }
        element point = a;

        constexpr size_t lookup_size = 8;
        constexpr size_t num_rounds = 32;
        constexpr size_t num_wnaf_bits = 4;
        element* precomp_table = (element*)(aligned_alloc(64, sizeof(element) * lookup_size));
        affine_element* lookup_table = (affine_element*)(aligned_alloc(64, sizeof(element) * lookup_size));

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
            coordinate_field::__copy(precomp_table[i].x, lookup_table[i].x);
            coordinate_field::__copy(precomp_table[i].y, lookup_table[i].y);
        }

        uint32_t wnaf_table[num_rounds * 2];
        typename subgroup_field::field_t endo_scalar;
        subgroup_field::split_into_endomorphism_scalars(
            converted_scalar, endo_scalar, *(typename subgroup_field::field_t*)&endo_scalar.data[2]);

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
            coordinate_field::__mul_beta(temporary.x, temporary.x);
            mixed_add(work_element, temporary, work_element);

            if (i != num_rounds - 1)
            {
                dbl(work_element, work_element);
                dbl(work_element, work_element);
                dbl(work_element, work_element);
                dbl(work_element, work_element);
            }
        }
        __neg(lookup_table[0], temporary);
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
        coordinate_field::__mul_beta(temporary.x, temporary.x);
        if (endo_skew)
        {
            mixed_add(work_element, temporary, work_element);
        }
        else
        {
            // grotty attempt at making this constant-time
            mixed_add(dummy_element, temporary, dummy_element);
        }


        aligned_free(precomp_table);
        aligned_free(lookup_table);
        return work_element;
    }

    static inline element group_exponentiation(const element& a, const typename subgroup_field::field_t& scalar)
    {
        if constexpr (GroupParams::USE_ENDOMORPHISM)
        {
            return group_exponentiation_endo(a, scalar);
        }
        else
        {
            return group_exponentiation_no_endo(a, scalar);
        }
    }
    static inline element group_exponentiation_inner(const affine_element& a,
                                                     const typename subgroup_field::field_t& scalar)
    {
        element point;
        affine_to_jacobian(a, point);
        return group_exponentiation(point, scalar);
    }

    static inline affine_element group_exponentiation(const affine_element& a,
                                                      const typename subgroup_field::field_t& scalar)
    {
        element output = group_exponentiation_inner(a, scalar);
        affine_element result;
        if (is_point_at_infinity(output))
        {
            result.x = coordinate_field::zero;
            result.y = coordinate_field::zero;
            set_infinity(result);
        }
        else
        {
            batch_normalize(&output, 1);
            coordinate_field::__copy(output.x, result.x);
            coordinate_field::__copy(output.y, result.y);
        }
        return result;
    }

    static inline bool eq(const element& a, const element& b)
    {
        bool both_infinity = is_point_at_infinity(a) && is_point_at_infinity(b);

        typename coordinate_field::field_t a_zz;
        typename coordinate_field::field_t a_zzz;
        typename coordinate_field::field_t b_zz;
        typename coordinate_field::field_t b_zzz;

        coordinate_field::__sqr(a.z, a_zz);
        coordinate_field::__mul(a.z, a_zz, a_zzz);

        coordinate_field::__sqr(b.z, b_zz);
        coordinate_field::__mul(b.z, b_zz, b_zzz);

        typename coordinate_field::field_t T0;
        typename coordinate_field::field_t T1;
        typename coordinate_field::field_t T2;
        typename coordinate_field::field_t T3;
        coordinate_field::__mul(a.x, b_zz, T0);
        coordinate_field::__mul(a.y, b_zzz, T1);
        coordinate_field::__mul(b.x, a_zz, T2);
        coordinate_field::__mul(b.y, a_zzz, T3);

        return both_infinity || ((coordinate_field::eq(T0, T2) && coordinate_field::eq(T1, T3)));
    }

    static inline bool eq(const affine_element& a, const affine_element& b)
    {
        element a_ele;
        element b_ele;
        affine_to_jacobian(a, a_ele);
        affine_to_jacobian(b, b_ele);
        return eq(a_ele, b_ele);
    }

    // copies src into dest. n.b. both src and dest must be aligned on 32 byte boundaries
    static void copy(affine_element* src, affine_element* dest);

    static inline void copy(const affine_element& src, affine_element& dest)
    {
        coordinate_field::__copy(src.x, dest.x);
        coordinate_field::__copy(src.y, dest.y);
    }
    // copies src into dest. n.b. both src and dest must be aligned on 32 byte boundaries
    static void copy(element* src, element* dest);

    static inline void copy(const element& src, element& dest)
    {
        coordinate_field::__copy(src.x, dest.x);
        coordinate_field::__copy(src.y, dest.y);
        coordinate_field::__copy(src.z, dest.z);
    }

    static void conditional_negate_affine(affine_element* src, affine_element* dest, uint64_t predicate);

}; // class group
} // namespace barretenberg

#ifdef DISABLE_SHENANIGANS
#include "group_impl_int128.tcc"
#else
#include "group_impl_asm.tcc"
#endif
