#pragma once

#include "../assert.hpp"
#include "../keccak/keccak.h"
#include "../types.hpp"
#include "./wnaf.hpp"
#include <array>
#include <cinttypes>
#include <cstdint>
#include <cstdio>
#include <cstdlib>

#include "./affine_group.hpp"
#include "./new_group.hpp"
namespace barretenberg {
template <typename coordinate_field, typename subgroup_field, typename GroupParams> class group {
  public:
    typedef test::element<coordinate_field, subgroup_field, GroupParams> element;
    typedef test::affine_element<coordinate_field, subgroup_field, GroupParams> affine_element;
    // struct affine_element {
    //     coordinate_field x;
    //     coordinate_field y;

    //     // bool operator=(const affine_element& other) const
    //     // {
    //     //     bool both_infinity = is_point_at_infinity(*this) && is_point_at_infinity(other);
    //     //     return both_infinity || ((x == other.x) && (y == other.y));
    //     // }
    // };

    // struct element {
    //     coordinate_field x;
    //     coordinate_field y;
    //     coordinate_field z;

    //     // bool operator=(const affine_element& other) const
    //     // {
    //     //     bool both_infinity = is_point_at_infinity(*this) && is_point_at_infinity(other);

    //     //     coordinate_field a_zz = z.sqr();
    //     //     coordinate_field a_zzz = a_zz * z;
    //     //     coordinate_field b_zz = other.z.sqr();
    //     //     coordinate_field b_zzz = b_zz * other.z;

    //     //     coordinate_field T0 = x * b_zz;
    //     //     coordinate_field T1 = y * b_zzz;
    //     //     coordinate_field T2 = other.x * a_zz;
    //     //     coordinate_field T3 = other.y * a_zzz;

    //     //     return both_infinity || ((T0 == T2) && (T1 == T3));
    //     // }
    // };

    static constexpr element one{ GroupParams::one_x, GroupParams::one_y, coordinate_field::one };
    static constexpr affine_element affine_one{ GroupParams::one_x, GroupParams::one_y };

    static constexpr coordinate_field curve_b = GroupParams::b;

    static inline void random_coordinates_on_curve(coordinate_field& x, coordinate_field& y)
    {
        bool found_one = false;
        coordinate_field yy;
        coordinate_field t0;

        while (!found_one) {
            // generate a random x-coordinate
            x = coordinate_field::random_element();
            // derive y^2 = x^3 + b
            yy = x.sqr() * x + GroupParams::b;
            // coordinate_field::__sqr(x, yy);
            // coordinate_field::__mul(x, yy, yy);
            // coordinate_field::__add(yy, GroupParams::b, yy);
            // compute sqrt(y)
            y = yy.sqrt();
            t0 = y.sqr();
            found_one = (yy == t0);
        }
    }

    static inline element random_element()
    {
        return element::random_element();
        // if constexpr (GroupParams::can_hash_to_curve) {
        //     element output;
        //     random_coordinates_on_curve(output.x, output.y);
        //     output.z = coordinate_field::random_element();
        //     coordinate_field zz = output.z.sqr();
        //     coordinate_field zzz = zz * output.z;
        //     output.x *= zz;
        //     output.y *= zzz;
        //     return output;
        // } else {
        //     subgroup_field scalar = subgroup_field::random_element();
        //     affine_element res = affine_one;
        //     res = group_exponentiation(res, scalar);
        //     element result;
        //     affine_to_jacobian(res, result);
        //     return result;
        // }
    }

    static inline affine_element random_affine_element()
    {
        if constexpr (GroupParams::can_hash_to_curve) {
            affine_element output;
            random_coordinates_on_curve(output.x, output.y);
            return output;
        } else {
            element ele = random_element();
            affine_element out;
            jacobian_to_affine(ele, out);
            return out;
        }
    }

    static inline affine_element hash_to_curve(uint64_t seed)
    {
        return affine_element::hash_to_curve(seed);
        // coordinate_field input = coordinate_field::zero;
        // input.data[0] = seed;
        // keccak256 c = hash_field_element((uint64_t*)&input.data[0]);
        // coordinate_field compressed{ c.word64s[0], c.word64s[1], c.word64s[2], c.word64s[3] };
        // return decompress(compressed);
    }

    template <size_t N> static inline std::array<affine_element, N> derive_generators()
    {
        std::array<affine_element, N> generators;
        size_t count = 0;
        size_t seed = 0;
        while (count < N) {
            ++seed;
            affine_element candidate = hash_to_curve(seed);
            if (on_curve(candidate)) {
                copy(candidate, generators[count]);
                ++count;
            }
        }

        return generators;
    }

    static inline bool is_point_at_infinity(const affine_element& p) { return p.is_point_at_infinity(); }

    static inline bool is_point_at_infinity(const element& p) { return p.is_point_at_infinity(); }

    static inline void set_infinity(element& p) { p.self_set_infinity(); }

    static inline void set_infinity(affine_element& p) { p.self_set_infinity(); }

    static inline void dbl(const element& p1, element& p2) noexcept
    {
        p2 = p1.dbl();
        // if (p1.y.is_msb_set_word()) {
        //     set_infinity(p2);
        //     return;
        // }
        // // z2 = 2*y*z
        // p2.z = p1.z + p1.z;
        // p2.z *= p1.y;

        // // T0 = x*x
        // coordinate_field T0 = p1.x.sqr();

        // // T1 = y*y
        // coordinate_field T1 = p1.y.sqr();

        // // T2 = T2*T1 = y*y*y*y
        // coordinate_field T2 = T1.sqr();

        // // T1 = T1 + x = x + y*y
        // T1 += p1.x;

        // // T1 = T1 * T1
        // T1.self_sqr();

        // // T3 = T0 + T2 = xx + y*y*y*y
        // coordinate_field T3 = T0 + T2;

        // // T1 = T1 - T3 = x*x + y*y*y*y + 2*x*x*y*y*y*y - x*x - y*y*y*y = 2*x*x*y*y*y*y = 2*S
        // T1 -= T3;

        // // T1 = 2T1 = 4*S
        // T1 += T1;

        // // T3 = 3T0
        // T3 = T0 + T0;
        // T3 += T0;

        // // T0 = 2T1
        // T0 = T1 + T1;

        // // x2 = T3*T3
        // p2.x = T3.sqr();

        // // x2 = x2 - 2T1
        // p2.x -= T0;

        // // T2 = 8T2
        // T2 += T2;
        // T2 += T2;
        // T2 += T2;

        // // y2 = T1 - x2
        // p2.y = T1 - p2.x;

        // // y2 = y2 * T3 - T2
        // p2.y *= T3;
        // p2.y -= T2;
    }

    static inline void mixed_add_inner(const element& p1, const affine_element& p2, element& p3) noexcept
    {
        // T0 = z1.z1
        coordinate_field T0 = p1.z.sqr();

        // T1 = x2.t0 - x1 = x2.z1.z1 - x1
        coordinate_field T1 = p2.x * T0;
        T1 -= p1.x;

        // T2 = T0.z1 = z1.z1.z1
        // T2 = T2.y2 - y1 = y2.z1.z1.z1 - y1
        coordinate_field T2 = p1.z * T0;
        T2 *= p2.y;
        T2 -= p1.y;

        if (__builtin_expect(T1.is_zero(), 0)) {
            if (T2.is_zero()) {
                // y2 equals y1, x2 equals x1, double x1
                dbl(p1, p3);
                return;
            } else {
                set_infinity(p3);
                return;
            }
        }

        // T2 = 2T2 = 2(y2.z1.z1.z1 - y1) = R
        // z3 = z1 + H
        T2 += T2;
        p3.z = T1 + p1.z;

        // T3 = T1*T1 = HH
        coordinate_field T3 = T1.sqr();

        // z3 = z3 - z1z1 - HH
        T0 += T3;

        // z3 = (z1 + H)*(z1 + H)
        p3.z.self_sqr();
        p3.z -= T0;

        // T3 = 4HH
        T3 += T3;
        T3 += T3;

        // T1 = T1*T3 = 4HHH
        T1 *= T3;

        // T3 = T3 * x1 = 4HH*x1
        T3 *= p1.x;

        // T0 = 2T3
        T0 = T3 + T3;

        // T0 = T0 + T1 = 2(4HH*x1) + 4HHH
        T0 += T1;
        p3.x = T2.sqr();

        // x3 = x3 - T0 = R*R - 8HH*x1 -4HHH
        p3.x -= T0;

        // T3 = T3 - x3 = 4HH*x1 - x3
        T3 -= p3.x;

        T1 *= p1.y;
        T1 += T1;

        // T3 = T2 * T3 = R*(4HH*x1 - x3)
        T3 *= T2;

        // y3 = T3 - T1
        p3.y = T3 - T1;
    }
    // add: 10 mul_w_o_reduction 1 mul, 5 sqr

    static inline void mixed_add_or_sub_inner(const element& p1,
                                              const affine_element& p2,
                                              element& p3,
                                              const uint64_t predicate) noexcept
    {

        // T0 = z1.z1
        coordinate_field T0 = p1.z.sqr();

        // T1 = x2.t0 - x1 = x2.z1.z1 - x1
        coordinate_field T1 = p2.x * T0;
        T1 -= p1.x;

        // T2 = T0.z1 = z1.z1.z1
        // T2 = T2.y2 - y1 = y2.z1.z1.z1 - y1
        coordinate_field T2 = p1.z * T0;
        T2 *= p2.y;
        T2.self_conditional_negate(predicate);
        T2 -= p1.y;

        if (__builtin_expect(T1.is_zero(), 0)) {
            if (T2.is_zero()) {
                // y2 equals y1, x2 equals x1, double x1
                dbl(p1, p3);
                return;
            } else {
                set_infinity(p3);
                return;
            }
        }

        // T2 = 2T2 = 2(y2.z1.z1.z1 - y1) = R
        // z3 = z1 + H
        T2 += T2;
        p3.z = T1 + p1.z;

        // T3 = T1*T1 = HH
        coordinate_field T3 = T1.sqr();

        // z3 = z3 - z1z1 - HH
        T0 += T3;

        // z3 = (z1 + H)*(z1 + H)
        p3.z.self_sqr();
        p3.z -= T0;

        // T3 = 4HH
        T3 += T3;
        T3 += T3;

        // T1 = T1*T3 = 4HHH
        T1 *= T3;

        // T3 = T3 * x1 = 4HH*x1
        T3 *= p1.x;

        // T0 = 2T3
        T0 = T3 + T3;

        // T0 = T0 + T1 = 2(4HH*x1) + 4HHH
        T0 += T1;
        p3.x = T2.sqr();

        // x3 = x3 - T0 = R*R - 8HH*x1 -4HHH
        p3.x -= T0;

        // T3 = T3 - x3 = 4HH*x1 - x3
        T3 -= p3.x;

        T1 *= p1.y;
        T1 += T1;

        // T3 = T2 * T3 = R*(4HH*x1 - x3)
        T3 *= T2;

        // y3 = T3 - T1
        p3.y = T3 - T1;
    }

    static inline void mixed_add(const element& p1, const affine_element& p2, element& p3) noexcept
    {
        // TODO: quantitavely check if __builtin_expect helps here
        // if (__builtin_expect(((p1.y.data[3] >> 63)), 0))

        // N.B. we implicitly assume p2 is not a point at infinity, as it will be coming from a lookup table of
        // constants
        p3 = p1 + p2;
        // if (p1.y.is_msb_set_word()) {
        //     p3.x = p2.x;
        //     p3.y = p2.y;
        //     p3.z = coordinate_field::one;
        //     return;
        // }

        // mixed_add_inner(p1, p2, p3);
    }

    static inline void mixed_add_or_sub(const element& p1,
                                        const affine_element& p2,
                                        element& p3,
                                        const uint64_t predicate) noexcept
    {
        // TODO: quantitavely check if __builtin_expect helps here
        // if (__builtin_expect(((p1.y.data[3] >> 63)), 0))
        p3 = p1;
        p3.self_mixed_add_or_sub(p2, predicate);
        // N.B. we implicitly assume p2 is not a point at infinity, as it will be coming from a lookup table of
        // constants
        // if (p1.y.is_msb_set_word()) {
        //     conditional_negate_affine(&p2, (affine_element*)&p3, predicate);
        //     p3.z = coordinate_field::one;
        //     return;
        // }

        // mixed_add_or_sub_inner(p1, p2, p3, predicate);
    }

    static inline void add(const element& p1, const element& p2, element& p3) { p3 = p1 + p2; }

    static inline element normalize(const element& src)
    {
        element dest;
        coordinate_field z_inv = src.z.invert();
        coordinate_field zz_inv = z_inv.sqr();
        coordinate_field zzz_inv = zz_inv * z_inv;

        dest.x = src.x * zz_inv;
        dest.y = src.y * zzz_inv;
        dest.z = coordinate_field::one;
        if (is_point_at_infinity(src)) {
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
        coordinate_field* temporaries =
            (coordinate_field*)(aligned_alloc(32, sizeof(coordinate_field) * num_points * 2));
        coordinate_field accumulator = coordinate_field::one;
        coordinate_field z_inv;
        coordinate_field zz_inv;
        coordinate_field zzz_inv;

        // Iterate over the points, computing the product of their z-coordinates.
        // At each iteration, store the currently-accumulated z-coordinate in `temporaries`
        for (size_t i = 0; i < num_points; ++i) {
            temporaries[i] = accumulator;
            if (!is_point_at_infinity(points[i])) {
                accumulator *= points[i].z;
            }
        }
        // For the rest of this method I'll refer to the product of all z-coordinates as the 'global' z-coordinate
        // Invert the global z-coordinate and store in `accumulator`
        accumulator = accumulator.invert();

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
        for (size_t i = num_points - 1; i < num_points; --i) {
            if (!is_point_at_infinity(points[i])) {
                z_inv = accumulator * temporaries[i];
                zz_inv = z_inv.sqr();
                zzz_inv = zz_inv * z_inv;
                points[i].x *= zz_inv;
                points[i].y *= zzz_inv;
                accumulator *= points[i].z;
            }
            points[i].z = coordinate_field::one;
        }

        aligned_free(temporaries);
    }

    static inline bool on_curve(const affine_element& pt) { return pt.on_curve(); }

    static inline bool on_curve(const element& pt) { return pt.on_curve(); }

    static inline void __neg(const element& a, element& r) { r = -a; }

    static inline void __neg(const affine_element& a, affine_element& r) { r = { a.x, -a.y }; }

    static inline void affine_to_jacobian(const affine_element& a, element& r)
    {
        r = { a.x, a.y, coordinate_field::one };
    }

    static inline element affine_to_jacobian(const affine_element& a) { return element{ a.x, a.y, a.z }; }

    static inline void jacobian_to_affine(const element& a, affine_element& r)
    {
        element temp = normalize(a);
        r = { temp.x, temp.y };
    }

    static inline void copy_affine(const affine_element& a, affine_element& r) { r = { a.x, a.y }; }

    static inline element group_exponentiation_no_endo(const element& a, const subgroup_field& scalar)
    {
        return a * scalar;
    }

    static inline element group_exponentiation_endo(const element& a, const subgroup_field& scalar)
    {
        return a * scalar;
    }

    static inline element group_exponentiation(const element& a, const subgroup_field& scalar) { return a * scalar; }
    static inline element group_exponentiation_inner(const affine_element& a, const subgroup_field& scalar)
    {
        return element(a) * scalar;
    }

    static inline affine_element group_exponentiation(const affine_element& a, const subgroup_field& scalar)
    {
        element output = element(a) * scalar;
        affine_element result;
        if (is_point_at_infinity(output)) {
            result.x = coordinate_field::zero;
            result.y = coordinate_field::zero;
            set_infinity(result);
        } else {
            batch_normalize(&output, 1);
            result = { output.x, output.y };
        }
        return result;
    }

    static inline bool eq(const element& a, const element& b) { return a == b; }

    static inline bool eq(const affine_element& a, const affine_element& b) { return a == b; }

    // copies src into dest. n.b. both src and dest must be aligned on 32 byte boundaries
    static void copy(const affine_element* src, affine_element* dest);

    static inline void copy(const affine_element& src, affine_element& dest) { dest = src; }
    // copies src into dest. n.b. both src and dest must be aligned on 32 byte boundaries
    static void copy(const element* src, element* dest);

    static inline void copy(const element& src, element& dest) { dest = src; }

    static void conditional_negate_affine(const affine_element* src, affine_element* dest, uint64_t predicate);

    static inline void serialize_to_buffer(const affine_element& value, uint8_t* buffer)
    {
        coordinate_field::serialize_to_buffer(value.y, buffer);
        coordinate_field::serialize_to_buffer(value.x, buffer + sizeof(coordinate_field));
        if (!on_curve(value)) {
            buffer[0] = buffer[0] | (1 << 7);
        }
    }

    static inline affine_element serialize_from_buffer(uint8_t* buffer)
    {
        affine_element result;
        result.y = coordinate_field::serialize_from_buffer(buffer);
        result.x = coordinate_field::serialize_from_buffer(buffer + sizeof(coordinate_field));
        if (((buffer[0] >> 7) & 1) == 1) {
            set_infinity(result);
        }
        return result;
    }
}; // class group
} // namespace barretenberg

#ifdef DISABLE_SHENANIGANS
#include "group_impl_int128.tcc"
#else
#include "group_impl_asm.tcc"
#endif
