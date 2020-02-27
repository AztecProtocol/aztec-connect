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
    static constexpr element foo{ GroupParams::one_x, GroupParams::one_y, coordinate_field::one };
    static constexpr element one{ GroupParams::one_x, GroupParams::one_y, coordinate_field::one };
    static constexpr affine_element affine_one{ GroupParams::one_x, GroupParams::one_y };

    static constexpr coordinate_field curve_b = GroupParams::b;

    template <size_t N> static inline std::array<affine_element, N> derive_generators()
    {
        std::array<affine_element, N> generators;
        size_t count = 0;
        size_t seed = 0;
        while (count < N) {
            ++seed;
            affine_element candidate = affine_element::hash_to_curve(seed);
            if (candidate.on_curve()) {
                generators[count] = candidate;
                ++count;
            }
        }

        return generators;
    }

    static void conditional_negate_affine(const affine_element* src, affine_element* dest, uint64_t predicate);

}; // class group
} // namespace barretenberg

#ifdef DISABLE_SHENANIGANS
#include "group_impl_int128.tcc"
#else
#include "group_impl_asm.tcc"
#endif
