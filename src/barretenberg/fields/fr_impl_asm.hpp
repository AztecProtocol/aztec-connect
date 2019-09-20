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
namespace
{
constexpr uint64_t modulus_0 = 0x43E1F593F0000001UL;
constexpr uint64_t modulus_1 = 0x2833E84879B97091UL;
constexpr uint64_t modulus_2 = 0xB85045B68181585DUL;
constexpr uint64_t modulus_3 = 0x30644E72E131A029UL;
constexpr uint64_t not_modulus_0 = (~0x43E1F593F0000001UL) + 1;
constexpr uint64_t not_modulus_1 = ~0x2833E84879B97091UL;
constexpr uint64_t not_modulus_2 = ~0xB85045B68181585DUL;
constexpr uint64_t not_modulus_3 = ~0x30644E72E131A029UL;
constexpr uint64_t r_inv = 0xc2e1f593efffffffUL;

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
    ASSERT((((uintptr_t)src.data & 0x1f) == 0));
    ASSERT((((uintptr_t)dest.data & 0x1f) == 0));
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
        : "%r8", "%r9", "%r10", "%r11", "memory", "cc");
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
        "vmovdqa 0(%0), %%ymm0              \n\t"
        "vmovdqa 0(%1), %%ymm1              \n\t"
        "vmovdqa %%ymm0, 0(%1)              \n\t"
        "vmovdqa %%ymm1, 0(%0)              \n\t"
        :
        : "r"(src.data), "r"(dest.data)
        : "%ymm0", "memory");
#else
    __asm__(
        "movq 0(%0), %%r8                       \n\t"
        "movq 8(%0), %%r9                       \n\t"
        "movq 16(%0), %%r10                     \n\t"
        "movq 24(%0), %%r11                     \n\t"
        "movq 0(%1), %%r12                       \n\t"
        "movq 8(%1), %%r13                       \n\t"
        "movq 16(%1), %%r14                     \n\t"
        "movq 24(%1), %%r15                     \n\t"
        "movq %%r8, 0(%1)                       \n\t"
        "movq %%r9, 8(%1)                       \n\t"
        "movq %%r10, 16(%1)                     \n\t"
        "movq %%r11, 24(%1)                     \n\t"
        "movq %%r12, 0(%0)                       \n\t"
        "movq %%r13, 8(%0)                       \n\t"
        "movq %%r14, 16(%0)                     \n\t"
        "movq %%r15, 24(%0)                     \n\t"
        :
        : "r"(src.data), "r"(dest.data)
        : "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
#endif
}

/**
 * Add field_t elements `a` and `b` modulo `q`, store the result in `r`
 * We assume both `b` and `a` are 254 bit integers, and skip the relevant carry checks on the most significant limb
 **/
inline void add(const field_t &a, const field_t &b, field_t &r)
{
    __asm__(
        ADD("%%rbx", "%%rcx")
            REDUCE_RESULT("%%rsi")
        :
        : "b"(&a), "c"(&b), "S"(&r), [not_modulus_0] "m"(not_modulus_0), [not_modulus_1] "m"(not_modulus_1), [not_modulus_2] "m"(not_modulus_2), [not_modulus_3] "m"(not_modulus_3)
        : "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
}

/**
 * Subtract `b` from `a` modulo `q`, store result in `r`
 * We assume both `b` and `a` are 254 bit integers, and skip the relevant carry checks on the most significant limb
 **/
inline void sub(const field_t &a, const field_t &b, field_t &r)
{
    __asm__(
        SUB("%%rbx", "%%rcx", "%%rsi")
        :
        : "b"(&a), "c"(&b), "S"(&r), [modulus_0] "m"(modulus_0), [modulus_1] "m"(modulus_1), [modulus_2] "m"(modulus_2), [modulus_3] "m"(modulus_3)
        : "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
}

/**
 * Compute the square of `a`, modulo `q`. Store result in `r`
 * We assume `a` is 254 bits and do not perform carry checks on most significant limb
 **/
inline void sqr(const field_t &a, field_t &r)
{
    __asm__(
        SQR("%%rbx") "movq %[r_ptr], %%rsi                   \n\t" REDUCE_RESULT("%%rsi")
        :
        : "b"(&a), [zero_reference] "m"(zero_reference), [r_ptr] "m"(&r), [modulus_0] "m"(modulus_0), [modulus_1] "m"(modulus_1), [modulus_2] "m"(modulus_2), [modulus_3] "m"(modulus_3), [r_inv] "m"(r_inv), [not_modulus_0] "m"(not_modulus_0), [not_modulus_1] "m"(not_modulus_1), [not_modulus_2] "m"(not_modulus_2), [not_modulus_3] "m"(not_modulus_3)
        : "%rax", "rcx", "%rdx", "%rdi", "%rsi", "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
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
         *            %rbx: pointer to `a`
         *            %rcx: pointer to `b`
         *            %rdx: work register for multiplication operand
         */
    __asm__(
        MUL("%%rbx", "%%rcx")
            REDUCE_RESULT("%%rsi")
        :
        : "c"(&b), "b"(&a), "S"(&r), [modulus_0] "m"(modulus_0), [modulus_1] "m"(modulus_1), [modulus_2] "m"(modulus_2), [modulus_3] "m"(modulus_3), [r_inv] "m"(r_inv), [not_modulus_0] "m"(not_modulus_0), [not_modulus_1] "m"(not_modulus_1), [not_modulus_2] "m"(not_modulus_2), [not_modulus_3] "m"(not_modulus_3)
        : "%rax", "%rdx", "%rdi", "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
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