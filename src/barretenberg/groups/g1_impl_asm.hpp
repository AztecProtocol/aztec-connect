#include "../fields/fq.hpp"
#include "../types.hpp"

namespace barretenberg
{
namespace g1
{

// copies src into dest. n.b. both src and dest must be aligned on 32 byte boundaries
inline void copy(affine_element* src, affine_element* dest)
{
#if defined __AVX__ && defined USE_AVX
    ASSERT((((uintptr_t)src & 0x1f) == 0));
    ASSERT((((uintptr_t)dest & 0x1f) == 0));
    __asm__ __volatile__("vmovdqa 0(%0), %%ymm0              \n\t"
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
inline void copy(element* src, element* dest)
{
#if defined __AVX__ && defined USE_AVX
    ASSERT((((uintptr_t)src & 0x1f) == 0));
    ASSERT((((uintptr_t)dest & 0x1f) == 0));
    __asm__ __volatile__("vmovdqa 0(%0), %%ymm0              \n\t"
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

// copies src into dest, inverting y-coordinate if 'predicate' is true
// n.b. requires src and dest to be aligned on 32 byte boundary
inline void conditional_negate_affine(affine_element* src, affine_element* dest, uint64_t predicate)
{
#if defined __AVX__ && defined USE_AVX
    ASSERT((((uintptr_t)src & 0x1f) == 0));
    ASSERT((((uintptr_t)dest & 0x1f) == 0));
    __asm__ __volatile__("xorq %%r8, %%r8                              \n\t"
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
    __asm__ __volatile__("xorq %%r8, %%r8                              \n\t"
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

} // namespace g1
} // namespace barretenberg