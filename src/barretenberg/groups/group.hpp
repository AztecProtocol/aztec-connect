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

    static inline affine_element decompress(const coordinate_field& compressed)
    {
        uint64_t y_sign = compressed.data[3] >> 63UL;
        affine_element result{ compressed.to_montgomery_form(), coordinate_field::zero };

        result.x.data[3] = result.x.data[3] & 0x7fffffffffffffffUL;

        coordinate_field xxx = result.x.sqr() * result.x;

        coordinate_field yy = xxx + GroupParams::b;

        result.y = yy.sqrt();

        coordinate_field y_test = result.y.from_montgomery_form();
        if ((y_test.data[0] & 1UL) != y_sign) {
            result.y.self_neg();
        }
        if (!on_curve(result)) {
            set_infinity(result);
        }

        return result;
    }

    static inline affine_element hash_to_curve(uint64_t seed)
    {
        coordinate_field input = coordinate_field::zero;
        input.data[0] = seed;
        keccak256 c = hash_field_element((uint64_t*)&input.data[0]);
        coordinate_field compressed{ c.word64s[0], c.word64s[1], c.word64s[2], c.word64s[3] };
        return decompress(compressed);
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

    static inline void set_infinity(element& p) { p.set_infinity(); }

    static inline void set_infinity(affine_element& p) { p.set_infinity(); }

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

    static inline void add(const element& p1, const element& p2, element& p3)
    {
        bool p1_zero = p1.y.is_msb_set();
        bool p2_zero = p2.y.is_msb_set();
        if (__builtin_expect((p1_zero || p2_zero), 0)) {
            if (p1_zero && !p2_zero) {
                p3 = { p2.x, p2.y, p2.z };
                return;
            }
            if (p2_zero && !p1_zero) {
                p3 = { p1.x, p1.y, p1.z };
                return;
            }
            set_infinity(p3);
            return;
        }
        coordinate_field Z1Z1(p1.z.sqr());
        coordinate_field Z2Z2(p2.z.sqr());
        coordinate_field S2(Z1Z1 * p1.z);
        coordinate_field U2(Z1Z1 * p2.x);
        S2 *= p2.y;
        coordinate_field U1(Z2Z2 * p1.x);
        coordinate_field S1(Z2Z2 * p2.z);
        S1 *= p1.y;

        coordinate_field F(S2 - S1);

        coordinate_field H(U2 - U1);

        if (__builtin_expect(H.is_zero(), 0)) {
            if (F.is_zero()) {
                // y2 equals y1, x2 equals x1, double x1
                dbl(p1, p3);
                return;
            } else {
                set_infinity(p3);
                return;
            }
        }

        F += F;

        coordinate_field I(H + H);
        I.self_sqr();

        coordinate_field J(H * I);

        U1 *= I;

        U2 = U1 + U1;
        U2 += J;

        p3.x = F.sqr();

        p3.x -= U2;

        J *= S1;
        J += J;

        p3.y = U1 - p3.x;

        p3.y *= F;

        p3.y -= J;

        p3.z = p1.z + p2.z;

        Z1Z1 += Z2Z2;

        p3.z.self_sqr();
        p3.z -= Z1Z1;
        p3.z *= H;
    }

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

    static inline bool on_curve(const affine_element& pt)
    {
        if (is_point_at_infinity(pt)) {
            return false;
        }
        coordinate_field xxx = pt.x.sqr() * pt.x + GroupParams::b;
        coordinate_field yy = pt.y.sqr();
        return (xxx == yy);
    }

    static inline bool on_curve(const element& pt)
    {
        if (is_point_at_infinity(pt)) {
            return false;
        }
        coordinate_field zz = pt.z.sqr();
        coordinate_field bz_6 = zz.sqr() * zz * GroupParams::b;
        coordinate_field xxx = pt.x.sqr() * pt.x + bz_6;
        coordinate_field yy = pt.y.sqr();
        return (xxx == yy);
    }

    static inline void __neg(const element& a, element& r) { r = { a.x, -a.y, a.z }; }

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
        if (scalar == subgroup_field::zero) {
            element result;
            result.x = coordinate_field::zero;
            result.y = coordinate_field::zero;
            result.z = coordinate_field::zero;
            set_infinity(result);
            return result;
        }
        element work_element = a;

        subgroup_field converted_scalar = scalar.from_montgomery_form();

        const uint64_t maximum_set_bit = converted_scalar.get_msb();
        for (uint64_t i = maximum_set_bit - 1; i < maximum_set_bit; --i) {
            dbl(work_element, work_element);
            if (converted_scalar.get_bit(i)) {
                add(work_element, a, work_element);
            }
        }
        return work_element;
    }

    static inline element group_exponentiation_endo(const element& a, const subgroup_field& scalar)
    {
        subgroup_field converted_scalar = scalar.from_montgomery_form();

        if (converted_scalar == subgroup_field::zero) {
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
        for (size_t i = 1; i < lookup_size; ++i) {
            add(precomp_table[i - 1], d2, precomp_table[i]);
        }

        batch_normalize(precomp_table, lookup_size);

        for (size_t i = 0; i < lookup_size; ++i) {
            lookup_table[i] = { precomp_table[i].x, precomp_table[i].y };
        }

        uint64_t wnaf_table[num_rounds * 2];
        subgroup_field endo_scalar;
        subgroup_field::split_into_endomorphism_scalars(
            converted_scalar, endo_scalar, *(subgroup_field*)&endo_scalar.data[2]);

        bool skew = false;
        bool endo_skew = false;
        wnaf::fixed_wnaf<2, num_wnaf_bits>(&endo_scalar.data[0], &wnaf_table[0], skew, 0);
        wnaf::fixed_wnaf<2, num_wnaf_bits>(&endo_scalar.data[2], &wnaf_table[1], endo_skew, 0);

        element work_element = one;
        element dummy_element = one;
        affine_element temporary;
        set_infinity(work_element);

        uint64_t wnaf_entry;
        uint64_t index;
        bool sign;
        for (size_t i = 0; i < num_rounds; ++i) {
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
            temporary.x *= coordinate_field::beta;

            mixed_add(work_element, temporary, work_element);

            if (i != num_rounds - 1) {
                dbl(work_element, work_element);
                dbl(work_element, work_element);
                dbl(work_element, work_element);
                dbl(work_element, work_element);
            }
        }
        __neg(lookup_table[0], temporary);
        if (skew) {
            mixed_add(work_element, temporary, work_element);
        } else {
            // grotty attempt at making this constant-time
            mixed_add(dummy_element, temporary, dummy_element);
        }

        copy(&lookup_table[0], &temporary);
        temporary.x *= coordinate_field::beta;

        if (endo_skew) {
            mixed_add(work_element, temporary, work_element);
        } else {
            // grotty attempt at making this constant-time
            mixed_add(dummy_element, temporary, dummy_element);
        }

        aligned_free(precomp_table);
        aligned_free(lookup_table);
        return work_element;
    }

    static inline element group_exponentiation(const element& a, const subgroup_field& scalar)
    {
        if constexpr (GroupParams::USE_ENDOMORPHISM) {
            return group_exponentiation_endo(a, scalar);
        } else {
            return group_exponentiation_no_endo(a, scalar);
        }
    }
    static inline element group_exponentiation_inner(const affine_element& a, const subgroup_field& scalar)
    {
        element point;
        affine_to_jacobian(a, point);
        return group_exponentiation(point, scalar);
    }

    static inline affine_element group_exponentiation(const affine_element& a, const subgroup_field& scalar)
    {
        element output = group_exponentiation_inner(a, scalar);
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

    static inline bool eq(const element& a, const element& b)
    {
        bool both_infinity = is_point_at_infinity(a) && is_point_at_infinity(b);

        coordinate_field a_zz = a.z.sqr();
        coordinate_field a_zzz = a_zz * a.z;
        coordinate_field b_zz = b.z.sqr();
        coordinate_field b_zzz = b_zz * b.z;

        coordinate_field T0 = a.x * b_zz;
        coordinate_field T1 = a.y * b_zzz;
        coordinate_field T2 = b.x * a_zz;
        coordinate_field T3 = b.y * a_zzz;

        return both_infinity || ((T0 == T2) && (T1 == T3));
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
