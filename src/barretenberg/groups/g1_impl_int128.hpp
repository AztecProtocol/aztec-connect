#include "../fields/fq.hpp"
#include "../types.hpp"

namespace barretenberg
{
namespace g1
{

// copies src into dest. n.b. both src and dest must be aligned on 32 byte boundaries
inline void copy(affine_element* src, affine_element* dest)
{
    fq::copy(src->x, dest->x);
    fq::copy(src->y, dest->y);
}

// copies src into dest. n.b. both src and dest must be aligned on 32 byte boundaries
inline void copy(element* src, element* dest)
{
    fq::copy(src->x, dest->x);
    fq::copy(src->y, dest->y);
    fq::copy(src->z, dest->z);
}

inline void conditional_negate_affine(affine_element* src, affine_element* dest, uint64_t predicate)
{
    copy(src, dest);
    if (predicate)
    {
        fq::__neg(dest->y, dest->y);
    }
}

} // namespace g1
} // namespace barretenberg