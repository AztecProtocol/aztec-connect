#pragma once

#include <cstdint>

namespace barretenberg
{

// copies src into dest. n.b. both src and dest must be aligned on 32 byte boundaries
template <typename coordinate_field, typename subgroup_field, typename GroupParams>
inline void group<coordinate_field, subgroup_field, GroupParams>::copy(const affine_element* src, affine_element* dest)
{
    coordinate_field::__copy(src->x, dest->x);
    coordinate_field::__copy(src->y, dest->y);
}

// copies src into dest. n.b. both src and dest must be aligned on 32 byte boundaries
template <typename coordinate_field, typename subgroup_field, typename GroupParams>
inline void group<coordinate_field, subgroup_field, GroupParams>::copy(const element* src, element* dest)
{
    coordinate_field::__copy(src->x, dest->x);
    coordinate_field::__copy(src->y, dest->y);
    coordinate_field::__copy(src->z, dest->z);
}

template <typename coordinate_field, typename subgroup_field, typename GroupParams>
inline void group<coordinate_field, subgroup_field, GroupParams>::conditional_negate_affine(const affine_element* src,
                                                                                            affine_element* dest,
                                                                                            uint64_t predicate)
{
    copy(src, dest);
    if (predicate)
    {
        dest->y.self_neg();
    }
}
} // namespace barretenberg