#pragma once 

#include "stdint.h"

namespace barretenberg
{

// copies src into dest. n.b. both src and dest must be aligned on 32 byte boundaries
template <typename coordinate_field, typename subgroup_field>
static inline void group::copy(affine_element* src, affine_element* dest)
{
    coordinate_field::copy(src->x, dest->x);
    coordinate_field::copy(src->y, dest->y);
}

// copies src into dest. n.b. both src and dest must be aligned on 32 byte boundaries
template <typename coordinate_field, typename subgroup_field>
static inline void group::copy(element* src, element* dest)
{
    coordinate_field::copy(src->x, dest->x);
    coordinate_field::copy(src->y, dest->y);
    coordinate_field::copy(src->z, dest->z);
}

template <typename coordinate_field, typename subgroup_field>
static inline void group::conditional_negate_affine(affine_element* src, affine_element* dest, uint64_t predicate)
{
    copy(src, dest);
    if (predicate)
    {
        coordinate_field::__neg(dest->y, dest->y);
    }
}
} // namespace barretenberg