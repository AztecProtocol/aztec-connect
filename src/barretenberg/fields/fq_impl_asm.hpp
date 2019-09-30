#ifndef FQ_IMPL_ASM
#define FQ_IMPL_ASM

#include "stdint.h"
#include "unistd.h"

#include "../assert.hpp"
#include "../types.hpp"
#include "asm_macros.hpp"


namespace barretenberg
{
namespace fq
{
namespace internal
{
// modulus of field q
constexpr uint64_t modulus_0 = 0x3C208C16D87CFD47UL;
constexpr uint64_t modulus_1 = 0x97816a916871ca8dUL;
constexpr uint64_t modulus_2 = 0xb85045b68181585dUL;
constexpr uint64_t modulus_3 = 0x30644e72e131a029UL;

// negative modulus, in two's complement form (inverted + 1)
constexpr uint64_t not_modulus_0 = ((~0x3C208C16D87CFD47UL) + 1);
constexpr uint64_t not_modulus_1 = ~0x97816a916871ca8dUL;
constexpr uint64_t not_modulus_2 = ~0xb85045b68181585dUL;
constexpr uint64_t not_modulus_3 = ~0x30644e72e131a029UL;

constexpr uint64_t twice_modulus_0 = 0x7841182db0f9fa8eUL;
constexpr uint64_t twice_modulus_1 = 0x2f02d522d0e3951aUL;
constexpr uint64_t twice_modulus_2 = 0x70a08b6d0302b0bbUL;
constexpr uint64_t twice_modulus_3 = 0x60c89ce5c2634053UL;

constexpr uint64_t twice_not_modulus_0 = ((~0x7841182db0f9fa8eUL) + 1);
constexpr uint64_t twice_not_modulus_1 = ~(0x2f02d522d0e3951aUL);
constexpr uint64_t twice_not_modulus_2 = ~(0x70a08b6d0302b0bbUL);
constexpr uint64_t twice_not_modulus_3 = ~(0x60c89ce5c2634053UL);
// sometimes we don't have any free registers to store 0.
// When adding carry flags into a limb, apparently adding relative
// to a memory location that stores 0 is faster than changing the
// asm code to free up a register we can zero...I think (TODO: zero register?)
constexpr uint64_t zero_reference = 0;
} // namespace



/**
 * copy src into dest. AVX implementation requires words to be aligned on 32 byte bounary
 **/
inline void copy(const field_t &src, field_t &dest)
{
#ifdef __AVX__
    ASSERT((((uintptr_t)src.data & 0x1f) == 0));
    ASSERT((((uintptr_t)dest.data & 0x1f) == 0));
    __asm__(
        "vmovdqa 0(%0), %%ymm0              \n\t"
        "vmovdqa %%ymm0, 0(%1)              \n\t"
        :
        : "r"(src.data), "r"(dest.data)
        : "%ymm0", "memory");
#else
    __asm__(
        "movq 0(%0), %%r8                       \n\t"
        "movq 8(%0), %%r9                       \n\t"
        "movq 16(%0), %%r10                     \n\t"
        "movq 24(%0), %%r11                     \n\t"
        "movq %%r8, 0(%1)                       \n\t"
        "movq %%r9, 8(%1)                       \n\t"
        "movq %%r10, 16(%1)                     \n\t"
        "movq %%r11, 24(%1)                     \n\t"
        :
        : "r"(src.data), "r"(dest.data)
        : "%r8", "%r9", "%r10", "%r11", "cc", "memory");
#endif
}

/**
 * Conditionally subtract p from field element a, store result in r
 **/
inline void reduce_once(const field_t &a, field_t &r)
{
    __asm__(
        CLEAR_FLAGS("%%r12")
        LOAD_FIELD_ELEMENT("%0", "%%r12", "%%r13", "%%r14", "%%r15")
        REDUCE_FIELD_ELEMENT("%[not_modulus_0]", "%[not_modulus_1]", "%[not_modulus_2]", "%[not_modulus_3]")
        STORE_FIELD_ELEMENT("%1", "%%r12", "%%r13", "%%r14", "%%r15")
        :
        : "r"(&a), "r"(&r), [not_modulus_0] "m"(internal::not_modulus_0), [not_modulus_1] "m"(internal::not_modulus_1), [not_modulus_2] "m"(internal::not_modulus_2), [not_modulus_3] "m"(internal::not_modulus_3)
        : "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
}

/**
 * Add field_t elements `a` and `b` modulo `q`, store the result in `r`
 * We assume both `b` and `a` are 254 bit integers, and skip the relevant carry checks on the most significant limb
 **/
inline void add(const field_t &a, const field_t &b, field_t &r)
{
    __asm__(
        CLEAR_FLAGS("%%r12")
        LOAD_FIELD_ELEMENT("%0", "%%r12", "%%r13", "%%r14", "%%r15")
        ADD_REDUCE("%1", "%[not_modulus_0]", "%[not_modulus_1]", "%[not_modulus_2]", "%[not_modulus_3]")
        STORE_FIELD_ELEMENT("%2", "%%r12", "%%r13", "%%r14", "%%r15")
        :
        : "%r"(&a), "%r"(&b), "r"(&r), [not_modulus_0] "m"(internal::not_modulus_0), [not_modulus_1] "m"(internal::not_modulus_1), [not_modulus_2] "m"(internal::not_modulus_2), [not_modulus_3] "m"(internal::not_modulus_3)
        : "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
}

/**
 * Add field_t elements `a` and `b` modulo `2q`, store the result in `r`
 * We assume both `b` and `a` are 254 bit integers, and skip the relevant carry checks on the most significant limb
 **/
inline void add_with_coarse_reduction(const field_t &a, const field_t &b, field_t &r)
{
    __asm__(
        CLEAR_FLAGS("%%r12")
        LOAD_FIELD_ELEMENT("%0", "%%r12", "%%r13", "%%r14", "%%r15")
        ADD_REDUCE("%1", "%[twice_not_modulus_0]", "%[twice_not_modulus_1]", "%[twice_not_modulus_2]", "%[twice_not_modulus_3]")
        STORE_FIELD_ELEMENT("%2", "%%r12", "%%r13", "%%r14", "%%r15")
        :
        : "%r"(&a), "%r"(&b), "r"(&r), [twice_not_modulus_0] "m"(internal::twice_not_modulus_0), [twice_not_modulus_1] "m"(internal::twice_not_modulus_1), [twice_not_modulus_2] "m"(internal::twice_not_modulus_2), [twice_not_modulus_3] "m"(internal::twice_not_modulus_3)
        : "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
}

/**
 * Add field_t elements `a` and `b`, store the result in `r`
 * We assume both `b` and `a` are 254 bit integers, and skip the relevant carry checks on the most significant limb
 **/
inline void add_without_reduction(const field_t &a, const field_t &b, field_t &r)
{
    __asm__(
        CLEAR_FLAGS("%%r12")
        LOAD_FIELD_ELEMENT("%0", "%%r12", "%%r13", "%%r14", "%%r15")
        ADD("%1")
        STORE_FIELD_ELEMENT("%2", "%%r12", "%%r13", "%%r14", "%%r15")
        :
        : "%r"(&a), "%r"(&b), "r"(&r)
        : "%r12", "%r13", "%r14", "%r15", "cc", "memory");
}

/**
 * Compute `4a` mod `2p` and store result in `&r`
 * We assume all field elements are 254 bit integers, and skip the relevant carry checks on the most significant limb
 **/
inline void quad_with_coarse_reduction(const field_t &a, field_t &r)
{
    __asm__(
        CLEAR_FLAGS("%%r12")
        LOAD_FIELD_ELEMENT("%0", "%%r12", "%%r13", "%%r14", "%%r15")
        DOUBLE_REDUCE("%[twice_not_modulus_0]", "%[twice_not_modulus_1]", "%[twice_not_modulus_2]", "%[twice_not_modulus_3]")
        CLEAR_FLAGS("%%r8")
        DOUBLE_REDUCE("%[twice_not_modulus_0]", "%[twice_not_modulus_1]", "%[twice_not_modulus_2]", "%[twice_not_modulus_3]")
        STORE_FIELD_ELEMENT("%1", "%%r12", "%%r13", "%%r14", "%%r15")
        :
        : "r"(&a), "r"(&r), [twice_not_modulus_0] "m"(internal::twice_not_modulus_0), [twice_not_modulus_1] "m"(internal::twice_not_modulus_1), [twice_not_modulus_2] "m"(internal::twice_not_modulus_2), [twice_not_modulus_3] "m"(internal::twice_not_modulus_3)
        : "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
}

/**
 * Compute `8a` mod `2p` and store result in `&r`
 * We assume all field elements are 254 bit integers, and skip the relevant carry checks on the most significant limb
 **/
inline void oct_with_coarse_reduction(const field_t &a, field_t &r)
{
    __asm__(
        CLEAR_FLAGS("%%r12")
        LOAD_FIELD_ELEMENT("%0", "%%r12", "%%r13", "%%r14", "%%r15")
        DOUBLE_REDUCE("%[twice_not_modulus_0]", "%[twice_not_modulus_1]", "%[twice_not_modulus_2]", "%[twice_not_modulus_3]")
        CLEAR_FLAGS("%%r8")
        DOUBLE_REDUCE("%[twice_not_modulus_0]", "%[twice_not_modulus_1]", "%[twice_not_modulus_2]", "%[twice_not_modulus_3]")
        CLEAR_FLAGS("%%r8")
        DOUBLE_REDUCE("%[twice_not_modulus_0]", "%[twice_not_modulus_1]", "%[twice_not_modulus_2]", "%[twice_not_modulus_3]")
        STORE_FIELD_ELEMENT("%1", "%%r12", "%%r13", "%%r14", "%%r15")
        :
        : "%r"(&a), "%r"(&r), [twice_not_modulus_0] "m"(internal::twice_not_modulus_0), [twice_not_modulus_1] "m"(internal::twice_not_modulus_1), [twice_not_modulus_2] "m"(internal::twice_not_modulus_2), [twice_not_modulus_3] "m"(internal::twice_not_modulus_3)
        : "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
}

/**
 * Compute `x_0 + x_0` and store result in `&x_0`
 * Compute `y_0 + y_1` and store result if `&r`
 * This method is for the niche situation where we need to perform a double and an add at the same time,
 * we can use two ADCX/ADOX addition chains to perform both operations on different execution ports, at the same time
 * We assume all field elements are 254 bit integers, and skip the relevant carry checks on the most significant limb
 **/
inline void paralell_double_and_add_without_reduction(field_t &x_0, const field_t &y_0, const field_t &y_1, field_t &r)
{
    __asm__(
        CLEAR_FLAGS("%%r12")
        LOAD_FIELD_ELEMENT("%0", "%%r8", "%%r9", "%%r10", "%%r11")
        LOAD_FIELD_ELEMENT("%1", "%%r12", "%%r13", "%%r14", "%%r15")
        PARALLEL_DOUBLE_ADD("%2")
        STORE_FIELD_ELEMENT("%0", "%%r8", "%%r9", "%%r10", "%%r11")
        STORE_FIELD_ELEMENT("%3", "%%r12", "%%r13", "%%r14", "%%r15")
        :
        : "r"(x_0.data), "%r"(y_0.data), "%r"(y_1.data), "r"(&r), [not_modulus_0] "m"(internal::not_modulus_0), [not_modulus_1] "m"(internal::not_modulus_1), [not_modulus_2] "m"(internal::not_modulus_2), [not_modulus_3] "m"(internal::not_modulus_3)
        : "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
}

/**
 * Subtract `b` from `a` modulo `q`, store result in `r`
 * We assume both `b` and `a` are 254 bit integers, and skip the relevant carry checks on the most significant limb
 **/
inline void sub(const field_t &a, const field_t &b, field_t &r)
{
    __asm__(
        CLEAR_FLAGS("%%r12")
        LOAD_FIELD_ELEMENT("%0", "%%r12", "%%r13", "%%r14", "%%r15")
        SUB("%1")
        // If b > a, then we've underflowed: adding the modulus will flip the overflow flag, so we can use
        // REDUCE_FIELD_ELEMENT to normalize r.
        REDUCE_FIELD_ELEMENT("%[modulus_0]", "%[modulus_1]", "%[modulus_2]", "%[modulus_3]")
        STORE_FIELD_ELEMENT("%2", "%%r12", "%%r13", "%%r14", "%%r15")
        :
        : "r"(&a), "r"(&b), "r"(&r), [modulus_0] "m"(internal::modulus_0), [modulus_1] "m"(internal::modulus_1), [modulus_2] "m"(internal::modulus_2), [modulus_3] "m"(internal::modulus_3)
        : "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
}

/**
 * Subtract `b` from `a` modulo `2q`, store result in `r`
 * We assume both `b` and `a` are 254 bit integers, and skip the relevant carry checks on the most significant limb
 **/
inline void sub_with_coarse_reduction(const field_t &a, const field_t &b, field_t &r)
{
    __asm__(
        CLEAR_FLAGS("%%r12")
        LOAD_FIELD_ELEMENT("%0", "%%r12", "%%r13", "%%r14", "%%r15")
        SUB("%1")
        REDUCE_FIELD_ELEMENT("%[twice_modulus_0]", "%[twice_modulus_1]", "%[twice_modulus_2]", "%[twice_modulus_3]")
        STORE_FIELD_ELEMENT("%2", "%%r12", "%%r13", "%%r14", "%%r15")
        :
        : "r"(&a), "r"(&b), "r"(&r), [twice_modulus_0] "m"(internal::twice_modulus_0), [twice_modulus_1] "m"(internal::twice_modulus_1), [twice_modulus_2] "m"(internal::twice_modulus_2), [twice_modulus_3] "m"(internal::twice_modulus_3)
        : "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
}

/**
 * Compute the square of `a`, modulo `q`. Store result in `r`
 * We assume `a` is 254 bits and do not perform carry checks on most significant limb
 **/
inline void sqr(const field_t &a, field_t &r)
{
    /**
     * Registers: rax:rdx = multiplication accumulator
     *            %r12, %r13, %r14, %r15, %rax: work registers for `r`
     *            %r8, %r9, %rdi, %rsi: scratch registers for multiplication results
     *            %[zero_reference]: memory location of zero value
     *            %0: pointer to `a`
     *            %[r_ptr]: memory location of pointer to `r`
     **/
    __asm__(
        SQR("%0")
        // "movq %[r_ptr], %%rsi                   \n\t"
        REDUCE_FIELD_ELEMENT("%[not_modulus_0]", "%[not_modulus_1]", "%[not_modulus_2]", "%[not_modulus_3]")
        STORE_FIELD_ELEMENT("%1", "%%r12", "%%r13", "%%r14", "%%r15")
        :
        : "r"(&a), "r"(&r), [zero_reference] "m"(internal::zero_reference), [modulus_0] "m"(internal::modulus_0), [modulus_1] "m"(internal::modulus_1), [modulus_2] "m"(internal::modulus_2), [modulus_3] "m"(internal::modulus_3), [r_inv] "m"(internal::r_inv), [not_modulus_0] "m"(internal::not_modulus_0), [not_modulus_1] "m"(internal::not_modulus_1), [not_modulus_2] "m"(internal::not_modulus_2), [not_modulus_3] "m"(internal::not_modulus_3)
        : "%rcx", "%rdx", "%rdi", "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
}

/**
 * Compute the square of `a`, modulo `q`. Store result in `r`
 * We assume `a` is 254 bits and do not perform carry checks on most significant limb
 **/
inline void sqr_without_reduction(const field_t &a, field_t &r)
{
    /**
     * Registers: rax:rdx = multiplication accumulator
     *            %r12, %r13, %r14, %r15, %rax: work registers for `r`
     *            %r8, %r9, %rdi, %rsi: scratch registers for multiplication results
     *            %[zero_reference]: memory location of zero value
     *            %0: pointer to `a`
     *            %[r_ptr]: memory location of pointer to `r`
     **/
    __asm__(
        SQR("%0") 
        // "movq %[r_ptr], %%rsi                   \n\t"
        STORE_FIELD_ELEMENT("%1", "%%r12", "%%r13", "%%r14", "%%r15")
        :
        : "r"(&a), "r"(&r), [zero_reference] "m"(internal::zero_reference), [modulus_0] "m"(internal::modulus_0), [modulus_1] "m"(internal::modulus_1), [modulus_2] "m"(internal::modulus_2), [modulus_3] "m"(internal::modulus_3), [r_inv] "m"(internal::r_inv)
        : "%rcx", "%rdx", "%rdi", "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
}

/**
 * Compute `a` * `b` mod `q`, store result in `r`
 * We assume `a` is 254 bits and do not perform carry checks on most significant limb
 **/
inline void mul(const field_t &a, const field_t &b, field_t &r)
{
    /**
     * Registers: rax:rdx = multiplication accumulator
     *            %r12, %r13, %r14, %r15, %rax: work registers for `r`
     *            %r8, %r9, %rdi, %rsi: scratch registers for multiplication results
     *            %r10: zero register
     *            %0: pointer to `a`
     *            %1: pointer to `b`
     *            %2: pointer to `r`
     **/
    __asm__ (
        MUL("%0", "%1")
        REDUCE_FIELD_ELEMENT("%[not_modulus_0]", "%[not_modulus_1]", "%[not_modulus_2]", "%[not_modulus_3]")
        STORE_FIELD_ELEMENT("%2", "%%r12", "%%r13", "%%r14", "%%r15")
        :
        : "%r"(&a), "%r"(&b), "r"(&r), [modulus_0] "m"(internal::modulus_0), [modulus_1] "m"(internal::modulus_1), [modulus_2] "m"(internal::modulus_2), [modulus_3] "m"(internal::modulus_3), [r_inv] "m"(internal::r_inv), [not_modulus_0] "m"(internal::not_modulus_0), [not_modulus_1] "m"(internal::not_modulus_1), [not_modulus_2] "m"(internal::not_modulus_2), [not_modulus_3] "m"(internal::not_modulus_3), [zero_reference] "m"(internal::zero_reference)
        : "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "%rdx", "%rdi", "cc", "memory");
}

/**
 * Compute `a` * `b` mod `q`, store result in `r`
 * We assume `a` is 254 bits and do not perform carry checks on most significant limb
 **/
inline void mul_without_reduction(const field_t &a, const field_t &b, field_t &r)
{
    /**
     * Registers: rax:rdx = multiplication accumulator
     *            %r12, %r13, %r14, %r15, %rax: work registers for `r`
     *            %r8, %r9, %rdi, %rsi: scratch registers for multiplication results
     *            %r10: zero register
     *            %0: pointer to `a`
     *            %1: pointer to `b`
     *            %2: pointer to `r`
     **/
    __asm__(
        MUL("%1", "%0")
        STORE_FIELD_ELEMENT("%2", "%%r12", "%%r13", "%%r14", "%%r15")
        :
        : "%r"(&b), "%r"(&a), "r"(&r), [modulus_0] "m"(internal::modulus_0), [modulus_1] "m"(internal::modulus_1), [modulus_2] "m"(internal::modulus_2), [modulus_3] "m"(internal::modulus_3), [r_inv] "m"(internal::r_inv), [zero_reference] "m"(internal::zero_reference)
        : "%rdx", "%rdi", "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
}

} // namespace fq
} // namespace barretenberg
#endif