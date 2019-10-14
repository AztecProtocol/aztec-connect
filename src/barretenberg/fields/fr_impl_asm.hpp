#ifndef FR_IMPL_ASM
#define FR_IMPL_ASM

#include "stdint.h"
#include "unistd.h"

#include "../assert.hpp"
#include "../types.hpp"
#include "asm_macros.hpp"

namespace barretenberg
{
namespace fr
{
namespace internal
{
constexpr uint64_t modulus_0 = 0x43E1F593F0000001UL;
constexpr uint64_t modulus_1 = 0x2833E84879B97091UL;
constexpr uint64_t modulus_2 = 0xB85045B68181585DUL;
constexpr uint64_t modulus_3 = 0x30644E72E131A029UL;

constexpr uint64_t twice_modulus_0 = 0x87c3eb27e0000002UL;
constexpr uint64_t twice_modulus_1 = 0x5067d090f372e122UL;
constexpr uint64_t twice_modulus_2 = 0x70a08b6d0302b0baUL;
constexpr uint64_t twice_modulus_3 = 0x60c89ce5c2634053UL;

constexpr uint64_t not_modulus_0 = (~0x43E1F593F0000001UL) + 1;
constexpr uint64_t not_modulus_1 = ~0x2833E84879B97091UL;
constexpr uint64_t not_modulus_2 = ~0xB85045B68181585DUL;
constexpr uint64_t not_modulus_3 = ~0x30644E72E131A029UL;

constexpr uint64_t twice_not_modulus_0 = (~0x87c3eb27e0000002UL) + 1;
constexpr uint64_t twice_not_modulus_1 = ~0x5067d090f372e122UL;
constexpr uint64_t twice_not_modulus_2 = ~0x70a08b6d0302b0baUL;
constexpr uint64_t twice_not_modulus_3 = ~0x60c89ce5c2634053UL;

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
        "vmovdqa 0(%0), %%ymm0                  \n\t"
        "vmovdqa %%ymm0, 0(%1)                  \n\t"
        :
        : "r"(&src), "r"(&dest)
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
        : "r"(&src), "r"(&dest)
        : "%r8", "%r9", "%r10", "%r11", "memory", "cc");
#endif
}

inline void zero(field_t &r)
{
#ifdef __AVX__
    ASSERT((((uintptr_t)r.data & 0x1f) == 0));
    __asm__(
        "vpxor  %%ymm0, %%ymm0, %%ymm0          \n\t"
        "vmovdqa %%ymm0, 0(%0)                  \n\t"
        :
        : "r"(&r)
        : "memory");
#else
    __asm__(
        "movq $0, 0(%0)                         \n\t"
        "movq $0, 8(%0)                         \n\t"
        "movq $0, 16(%0)                        \n\t"
        "movq $0, 24(%0)                        \n\t"
        :
        : "r"(&r)
        : "memory");
#endif
}

/**
 * swap src and dest. AVX implementation requires words to be aligned on 32 byte bounary
 **/
inline void swap(const field_t &src, field_t &dest)
{
#ifdef __AVX__
    ASSERT((((uintptr_t)src.data & 0x1f) == 0));
    ASSERT((((uintptr_t)dest.data & 0x1f) == 0));
    __asm__(
        "vmovdqa 0(%0), %%ymm0                  \n\t"
        "vmovdqa 0(%1), %%ymm1                  \n\t"
        "vmovdqa %%ymm0, 0(%1)                  \n\t"
        "vmovdqa %%ymm1, 0(%0)                  \n\t"
        :
        : "r"(&src), "r"(&dest)
        : "%ymm0", "memory");
#else
    __asm__(
        "movq 0(%0), %%r8                       \n\t"
        "movq 8(%0), %%r9                       \n\t"
        "movq 16(%0), %%r10                     \n\t"
        "movq 24(%0), %%r11                     \n\t"
        "movq 0(%1), %%r12                      \n\t"
        "movq 8(%1), %%r13                      \n\t"
        "movq 16(%1), %%r14                     \n\t"
        "movq 24(%1), %%r15                     \n\t"
        "movq %%r8, 0(%1)                       \n\t"
        "movq %%r9, 8(%1)                       \n\t"
        "movq %%r10, 16(%1)                     \n\t"
        "movq %%r11, 24(%1)                     \n\t"
        "movq %%r12, 0(%0)                      \n\t"
        "movq %%r13, 8(%0)                      \n\t"
        "movq %%r14, 16(%0)                     \n\t"
        "movq %%r15, 24(%0)                     \n\t"
        :
        : "r"(&src), "r"(&dest)
        : "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
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
inline void __add(const field_t &a, const field_t &b, field_t &r)
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
inline void __add_with_coarse_reduction(const field_t &a, const field_t &b, field_t &r)
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
inline void __add_without_reduction(const field_t &a, const field_t &b, field_t &r)
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
 * Subtract `b` from `a` modulo `q`, store result in `r`
 * We assume both `b` and `a` are 254 bit integers, and skip the relevant carry checks on the most significant limb
 **/
inline void __sub(const field_t &a, const field_t &b, field_t &r)
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
inline void __sub_with_coarse_reduction(const field_t &a, const field_t &b, field_t &r)
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
inline void __sqr(const field_t &a, field_t &r)
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
inline void __sqr_without_reduction(const field_t &a, field_t &r)
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
        STORE_FIELD_ELEMENT("%1", "%%r12", "%%r13", "%%r14", "%%r15")
        :
        : "r"(&a), "r"(&r), [zero_reference] "m"(internal::zero_reference), [modulus_0] "m"(internal::modulus_0), [modulus_1] "m"(internal::modulus_1), [modulus_2] "m"(internal::modulus_2), [modulus_3] "m"(internal::modulus_3), [r_inv] "m"(internal::r_inv)
        : "%rcx", "%rdx", "%rdi", "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
}

/**
 * Compute `a` * `b` mod `q`, store result in `r`
 * We assume `a` is 254 bits and do not perform carry checks on most significant limb
 **/
inline void __mul(const field_t &a, const field_t &b, field_t &r)
{
    /**
     * Registers: rax:rdx = multiplication accumulator
     *            %r12, %r13, %r14, %r15, %rax: work registers for `r`
     *            %r8, %r9, %rdi, %rsi: scratch registers for multiplication results
     *            %r10: zero register
     *            %0: pointer to `a`
     *            %1: pointer to `b`
     *            %2: poitner to `r`
     **/
    __asm__(
        MUL("%0", "%1")
        REDUCE_FIELD_ELEMENT("%[not_modulus_0]", "%[not_modulus_1]", "%[not_modulus_2]", "%[not_modulus_3]")
        STORE_FIELD_ELEMENT("%2", "%%r12", "%%r13", "%%r14", "%%r15")
        :
        : "%r"(&a), "%r"(&b), "r"(&r), [modulus_0] "m"(internal::modulus_0), [modulus_1] "m"(internal::modulus_1), [modulus_2] "m"(internal::modulus_2), [modulus_3] "m"(internal::modulus_3), [r_inv] "m"(internal::r_inv), [not_modulus_0] "m"(internal::not_modulus_0), [not_modulus_1] "m"(internal::not_modulus_1), [not_modulus_2] "m"(internal::not_modulus_2), [not_modulus_3] "m"(internal::not_modulus_3), [zero_reference] "m"(internal::zero_reference)
        : "%rdx", "%rdi", "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
}

/**
 * Compute `a` * `b` mod `q`, store result in `r`
 * We assume `a` is 254 bits and do not perform carry checks on most significant limb
 **/
inline void __mul_without_reduction(const field_t &a, const field_t &b, field_t &r)
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
        MUL("%0", "%1")
        STORE_FIELD_ELEMENT("%2", "%%r12", "%%r13", "%%r14", "%%r15")
        :
        : "%r"(&a), "%r"(&b), "r"(&r), [modulus_0] "m"(internal::modulus_0), [modulus_1] "m"(internal::modulus_1), [modulus_2] "m"(internal::modulus_2), [modulus_3] "m"(internal::modulus_3), [r_inv] "m"(internal::r_inv), [zero_reference] "m"(internal::zero_reference)
        : "%rdx", "%rdi", "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
}

/**
 * Copy `a` into `r`. If `predicate == true`, subtract modulus from r
 **/
inline void __conditionally_subtract_double_modulus(const field_t &a, field_t &r, const uint64_t predicate)
{
    // TODO use literals instead of memory references
    __asm__ (
        CLEAR_FLAGS("%%r8")
        LOAD_FIELD_ELEMENT("%0", "%%r8", "%%r9", "%%r10", "%%r11")
        "movq %[modulus_0], %%r12 \n\t"
        "movq %[modulus_1], %%r13 \n\t"
        "movq %[modulus_2], %%r14 \n\t"
        "movq %[modulus_3], %%r15 \n\t"
        "subq %%r8, %%r12 \n\t"
        "sbbq %%r9, %%r13 \n\t"
        "sbbq %%r10, %%r14 \n\t"
        "sbbq %%r11, %%r15 \n\t"
        "btq $0, %1 \n\t"
        "cmovcq %%r12, %%r8 \n\t"
        "cmovcq %%r13, %%r9 \n\t"
        "cmovcq %%r14, %%r10 \n\t"
        "cmovcq %%r15, %%r11 \n\t"
        STORE_FIELD_ELEMENT("%2", "%%r8", "%%r9", "%%r10", "%%r11")
        :
        : "r"(&a), "r"(predicate), "r"(&r), [modulus_0] "m"(internal::twice_modulus_0), [modulus_1] "m"(internal::twice_modulus_1), [modulus_2] "m"(internal::twice_modulus_2), [modulus_3] "m"(internal::twice_modulus_3)
        : "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
}

inline void mul_512(const field_t &a, const field_t &b, field_wide_t &r)
{
    // TODO REMOVE THIS
    //uint64_t cache[4] = { b.data[0], b.data[1], b.data[2], b.data[3] };
    uint64_t *TODO_remove_this = (uint64_t *)&b.data[0];
    /**
     * Registers: rax:rdx = multiplication accumulator
     *            r8-r9  = t[0-1], work registers for multipliation results
     *            r12     = r.data[0]
     *            r13     = r.data[1]
     *            r14     = r.data[2]
     *            r15     = r.data[3]
     *            rax     = b_ptr
     *            rbx     = a_ptr
     *            rsi     = r_ptr
     *            rcx     = b.data[0]
     *            rdi     = b.data[1]
     *            r11     = b.data[2]
     *            r10     = b.data[3]
     */
    __asm__ __volatile__(
        /* load b0 - b4 into r10-r13*/
        "movq 0(%%rax), %%rcx           \n\t"
        "movq 8(%%rax), %%rdi           \n\t"
        "movq 16(%%rax), %%r11          \n\t"
        "movq 24(%%rax), %%r10          \n\t"
        /* load a0 into rdx */
        "movq 0(%%rbx), %%rdx           \n\t"
        /* a.data[0] * b.data[0] = (r.data[0], r.data[1]) */
        "mulxq %%rcx, %%r12, %%r13      \n\t"
        /* a.data[0] * b.data[2] = (r.data[2], r.data[3]) */
        "mulxq %%r11, %%r14, %%r15      \n\t"
        /* a.data[0] * b.data[1] = (t[0], t[1]) */
        "mulxq %%rdi, %%r8, %%r9         \n\t"
        /* write r.data[0] */
        "movq %%r12, 0(%%rsi)           \n\t"
        /* r.data[1] += t[0] */
        "addq %%r8, %%r13               \n\t"
        /* r.data[2] += t[1] + flag_c */
        "adcq %%r9, %%r14               \n\t"
        /* a.data[0] * b.data[3] = (t[2], r.data[4]) */
        "mulxq %%r10, %%rax, %%r12       \n\t"
        /* r.data[3] += t[2] + flag_c */
        "adcq %%rax, %%r15              \n\t"
        /* r.data[4] = t[3] + flag_c */
        /* (repurpose r12 for r.data[4]) */
        "adcq $0, %%r12              \n\t"

        /**
         * a.data[1] * b
         **/
        /* load a.data[1] into rdx */
        "movq 8(%%rbx), %%rdx           \n\t"
        /* a.data[1] * b.data[0] = (t[0], t[1]) */
        "mulxq %%rcx, %%r8, %%r9        \n\t"
        /* r.data[1] += t[0] */
        "addq %%r8, %%r13               \n\t"
        /* write out r.data[1] */
        "movq %%r13, 8(%%rsi)            \n\t"
        /* r.data[2] += t[1] + flag_c */
        "adcq %%r9, %%r14               \n\t"
        /* a.data[1] * b.data[2] = (t[0], t[1]) */
        "mulxq %%r11, %%r8, %%r9      \n\t"
        /* r.data[3] += t[2] + flag_c */
        "adcq %%r8, %%r15              \n\t"
        /* r.data[4] += t[3] + flag_c */
        "adcq %%r9, %%r12              \n\t"
        /* a.data[1] * b.data[1] = (t[0], t[1]) */
        "mulxq %%rdi, %%r8, %%r9        \n\t"
        /* a.data[1] * b.data[3] = (t[2], r.data[5]) */
        "mulxq %%r10, %%rax, %%r13      \n\t"
        /* add carry into r.data[5] */
        "adcq $0, %%r13                 \n\t"
        /* r.data[2] += t[0] */
        "add %%r8, %%r14                \n\t"
        /* r.data[3] += t[1] + c_flag */
        "adcq %%r9, %%r15               \n\t"
        /* r.data[4] += t[2] + c_flag */
        "adcq %%rax, %%r12              \n\t"
        /* add carry flag into r.data[5]... */
        "adcq $0, %%r13                 \n\t"

        /**
         * a.data[2] * b
         **/
        /* load a.data[2] into rdx */
        "movq 16(%%rbx), %%rdx           \n\t"
        /* a.data[2] * b.data[0] = (t[0], t[1]) */
        "mulxq %%rcx, %%r8, %%r9        \n\t"
        /* r.data[2] += t[0] */
        "addq %%r8, %%r14               \n\t"
        /* write out r.data[2] */
        "movq %%r14, 16(%%rsi)            \n\t"
        /* r.data[3] += t[1] + flag_c */
        "adcq %%r9, %%r15               \n\t"
        /* a.data[2] * b.data[2] = (t[0], t[1]) */
        "mulxq %%r11, %%r8, %%r9      \n\t"
        /* r.data[4] += t[0] + flag_c */
        "adcq %%r8, %%r12              \n\t"
        /* r.data[5] += t[1] + flag_c */
        "adcq %%r9, %%r13              \n\t"
        /* a.data[2] * b.data[1] = (t[0], t[1]) */
        "mulxq %%rdi, %%r8, %%r9        \n\t"
        /* a.data[2] * b.data[3] = (t[2], r.data[6]) */
        "mulxq %%r10, %%rax, %%r14      \n\t"
        /* add carry into r.data[6] */
        "adcq $0, %%r14                 \n\t"
        /* r.data[3] += t[0] */
        "add %%r8, %%r15                \n\t"
        /* r.data[4] += t[1] + c_flag */
        "adcq %%r9, %%r12               \n\t"
        /* r.data[5] += t[2] + c_flag */
        "adcq %%rax, %%r13              \n\t"
        /* add carry flag into r.data[6]... */
        "adcq $0, %%r14                 \n\t"

        /**
         * a.data[3] * b
         **/
        /* load a.data[3] into rdx */
        "movq 24(%%rbx), %%rdx           \n\t"
        /* a.data[3] * b.data[0] = (t[0], t[1]) */
        "mulxq %%rcx, %%r8, %%r9        \n\t"
        /* r.data[3] += t[0] */
        "addq %%r8, %%r15               \n\t"
        /* write out r.data[3] */
        "movq %%r15, 24(%%rsi)            \n\t"
        /* r.data[4] += t[1] + flag_c */
        "adcq %%r9, %%r12               \n\t"
        /* a.data[3] * b.data[2] = (t[0], t[1]) */
        "mulxq %%r11, %%r8, %%r9      \n\t"
        /* r.data[5] += t[0] + flag_c */
        "adcq %%r8, %%r13              \n\t"
        /* r.data[6] += t[1] + flag_c */
        "adcq %%r9, %%r14              \n\t"

        /* a.data[3] * b.data[1] = (t[0], t[1]) */
        "mulxq %%rdi, %%r8, %%r9        \n\t"
        /* a.data[3] * b.data[3] = (t[2], r.data[7]) */
        "mulxq %%r10, %%rax, %%r15      \n\t"
        /* add carry into r.data[7] */
        "adcq $0, %%r15                 \n\t"
        /* r.data[4] += t[0] */
        "addq %%r8, %%r12                \n\t"
        /* r.data[5] += t[1] + c_flag */
        "adcq %%r9, %%r13               \n\t"
        /* write out r.data[4] */
        "movq %%r12, 32(%%rsi)           \n\t"
        /* write out r.data[5] */
        "movq %%r13, 40(%%rsi)              \n\t"
        /* r.data[6] += t[2] + c_flag */
        "adcq %%rax, %%r14              \n\t"
        /* write out r.data[6] */
        "movq %%r14, 48(%%rsi)           \n\t"
        /* add carry flag into r.data[7]... */
        "adcq $0, %%r15                 \n\t"
        /* write out r.data[7] */
        "movq %%r15, 56(%%rsi)              \n\t"
        : "+a"(TODO_remove_this)
        : "S"(&r), "b"(&a)
        : "%rcx", "%rdx", "%rdi", "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
}

} // namespace fr
} // namespace barretenberg

#endif