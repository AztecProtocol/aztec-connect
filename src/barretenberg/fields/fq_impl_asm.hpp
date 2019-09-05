#ifndef FQ_IMPL_ASM
#define FQ_IMPL_ASM

#include <stdint.h>
#include <unistd.h>

#include "../assert.hpp"
#include "../types.hpp"
#include "asm_macros.hpp"
namespace fq
{
namespace
{
constexpr field_t r_squared = { .data = {
    0xF32CFC5B538AFA89UL,
    0xB5E71911D44501FBUL,
    0x47AB1EFF0A417FF6UL,
    0x06D89F71CAB8351FUL,
}};

constexpr field_t modulus_plus_one = { .data = {
    0x3C208C16D87CFD48UL,
    0x97816a916871ca8dUL,
    0xb85045b68181585dUL,
    0x30644e72e131a029UL
}};

constexpr field_t one_raw = { .data = { 1, 0, 0, 0 } };

constexpr field_t one_mont = { .data = {
    0xd35d438dc58f0d9d,
    0x0a78eb28f5c70b3d,
    0x666ea36f7879462c,
    0x0e0a77c19a07df2f
}};

// negative modulus, in two's complement form (inverted + 1)
constexpr uint64_t not_modulus_0 = ((~0x3C208C16D87CFD47UL) + 1);
constexpr uint64_t not_modulus_1 = ~0x97816a916871ca8dUL;
constexpr uint64_t not_modulus_2 = ~0xb85045b68181585dUL;
constexpr uint64_t not_modulus_3 = ~0x30644e72e131a029UL;

constexpr uint64_t twice_not_modulus_0 = ((~0x7841182db0f9fa8eUL) + 1);
constexpr uint64_t twice_not_modulus_1 = ~(0x2f02d522d0e3951aUL);
constexpr uint64_t twice_not_modulus_2 = ~(0x70a08b6d0302b0bbUL);
constexpr uint64_t twice_not_modulus_3 = ~(0x60c89ce5c2634053UL);

constexpr field_t not_modulus = { .data = {
    ((~0x3C208C16D87CFD47UL) + 1),
    ~0x97816a916871ca8dUL,
    ~0xb85045b68181585dUL,
    ~0x30644e72e131a029UL
}};

// cube root of unity modulo (modulus), converted into montgomery form
constexpr field_t beta = {
    0x71930c11d782e155UL,
    0xa6bb947cffbe3323UL,
    0xaa303344d4741444UL,
    0x2c3b3f0d26594943UL};

constexpr uint64_t r_inv = 0x87d20782e4866389UL;

// sometimes we don't have any free registers to store 0.
// When adding carry flags into a limb, apparently adding relative
// to a memory location that stores 0 is faster than changing the
// asm code to free up a register we can zero
static uint64_t zero_reference = 0;
} // namespace

// modulus of field q
constexpr uint64_t modulus_0 = 0x3C208C16D87CFD47UL;
constexpr uint64_t modulus_1 = 0x97816a916871ca8dUL;
constexpr uint64_t modulus_2 = 0xb85045b68181585dUL;
constexpr uint64_t modulus_3 = 0x30644e72e131a029UL;

constexpr field_t modulus = {
    0x3C208C16D87CFD47UL,
    0x97816a916871ca8dUL,
    0xb85045b68181585dUL,
    0x30644e72e131a029UL};

/**
 * copy src into dest. AVX implementation requires words to be aligned on 32 byte bounary
 **/ 
inline void copy(const field_t& src, field_t& dest)
{
#ifdef __AVX__
    ASSERT((((uintptr_t)src.data & 0x1f) == 0));
    ASSERT((((uintptr_t)dest.data & 0x1f) == 0));
    __asm__ (
        "vmovdqa 0(%0), %%ymm0              \n\t"
        "vmovdqa %%ymm0, 0(%1)              \n\t"
        :
        : "r"(src.data), "r"(dest.data)
        : "%ymm0", "memory");
#else
    __asm__ (
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
        : "%r8", "%r9", "%r10", "%r11", "memory");
#endif
}

/**
 * Add field_t elements `a` and `b` modulo `q`, store the result in `r`
 * We assume both `b` and `a` are 254 bit integers, and skip the relevant carry checks on the most significant limb
 **/ 
inline void add(const field_t& a, const field_t& b, field_t& r)
{
    __asm__ (
        ADD("%%rbx", "%%rcx")
        REDUCE_RESULT("%%rsi")
        :
        : "b"(&a), "c"(&b), "S"(&r), [not_modulus_0] "m"(not_modulus_0), [not_modulus_1] "m"(not_modulus_1), [not_modulus_2] "m"(not_modulus_2), [not_modulus_3] "m"(not_modulus_3)
        : "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
}

// r = a + a + b mod p
inline void double_with_add(const field_t& a, const field_t& b, field_t& r)
{
    __asm__ (
        DOUBLE_WITH_ADD("%%rbx", "%%rcx")
        REDUCE_RESULT_TWICE()
        :
        : "b"(&a), "c"(&b), [dest] "m"(&r), [not_modulus_0] "m"(not_modulus_0), [not_modulus_1] "m"(not_modulus_1), [not_modulus_2] "m"(not_modulus_2), [not_modulus_3] "m"(not_modulus_3), [twice_not_modulus_0] "m"(twice_not_modulus_0), [twice_not_modulus_1] "m"(twice_not_modulus_1), [twice_not_modulus_2] "m"(twice_not_modulus_2), [twice_not_modulus_3] "m"(twice_not_modulus_3)
        : "%rax", "%rdx", "%rdi", "%rsi", "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
}

// r = a + a + b mod p
inline void double_with_add_with_coarse_reduction(const field_t& a, const field_t& b, field_t& r)
{
    __asm__ (
        DOUBLE_WITH_ADD("%%rbx", "%%rcx")
        REDUCE_RESULT_COARSE("%%rsi")
        :
        : "b"(&a), "c"(&b), "S"(&r), [not_modulus_0] "m"(not_modulus_0), [not_modulus_1] "m"(not_modulus_1), [not_modulus_2] "m"(not_modulus_2), [not_modulus_3] "m"(not_modulus_3), [twice_not_modulus_0] "m"(twice_not_modulus_0), [twice_not_modulus_1] "m"(twice_not_modulus_1), [twice_not_modulus_2] "m"(twice_not_modulus_2), [twice_not_modulus_3] "m"(twice_not_modulus_3)
        : "%rax", "%rdx", "%rdi", "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
}

inline void quad_with_partial_reduction(const field_t& a, field_t& r)
{
    __asm__ (
        QUAD("%%rbx")
        REDUCE_RESULT_COARSE("%%rsi")
        :
        : "b"(&a), "S"(&r), [twice_not_modulus_0] "m"(twice_not_modulus_0), [twice_not_modulus_1] "m"(twice_not_modulus_1), [twice_not_modulus_2] "m"(twice_not_modulus_2), [twice_not_modulus_3] "m"(twice_not_modulus_3)
        : "%rax", "%rcx", "%rdx", "%rdi", "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
}

inline void oct(const field_t& a, field_t& r)
{
     __asm__ (
        OCT("%%rbx", "%%rsi")
        :
        : "b"(&a), "S"(&r), [not_modulus_0] "m"(not_modulus_0), [not_modulus_1] "m"(not_modulus_1), [not_modulus_2] "m"(not_modulus_2), [not_modulus_3] "m"(not_modulus_3), [twice_not_modulus_0] "m"(twice_not_modulus_0), [twice_not_modulus_1] "m"(twice_not_modulus_1), [twice_not_modulus_2] "m"(twice_not_modulus_2), [twice_not_modulus_3] "m"(twice_not_modulus_3)
        : "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
}

inline void double_with_double_reduction(const field_t& a, field_t& r)
{
    __asm__ (
        ADD("%%rbx", "%%rbx")
        REDUCE_RESULT_TWICE()
        :
        : "b"(&a), [dest] "m"(&r), [not_modulus_0] "m"(not_modulus_0), [not_modulus_1] "m"(not_modulus_1), [not_modulus_2] "m"(not_modulus_2), [not_modulus_3] "m"(not_modulus_3), [twice_not_modulus_0] "m"(twice_not_modulus_0), [twice_not_modulus_1] "m"(twice_not_modulus_1), [twice_not_modulus_2] "m"(twice_not_modulus_2), [twice_not_modulus_3] "m"(twice_not_modulus_3)
        : "%rax", "%rdx", "%rdi", "%rsi", "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
}

/**
 * Add field_t elements `a` and `b` modulo `q`, store the result in `r`
 * We assume both `b` and `a` are 254 bit integers, and skip the relevant carry checks on the most significant limb
 **/ 
inline void add_without_reduction(const field_t& a, const field_t& b, field_t& r)
{
    __asm__ (
        ADD("%%rbx", "%%rcx")
        // Save result
        "movq %%r12, 0(%%rsi)                       \n\t"
        "movq %%r13, 8(%%rsi)                       \n\t"
        "movq %%r14, 16(%%rsi)                      \n\t"
        "movq %%r15, 24(%%rsi)                      \n\t"
        :
        : "b"(&a), "c"(&b), "S"(&r), [not_modulus_0] "m"(not_modulus_0), [not_modulus_1] "m"(not_modulus_1), [not_modulus_2] "m"(not_modulus_2), [not_modulus_3] "m"(not_modulus_3)
        : "%r12", "%r13", "%r14", "%r15", "cc", "memory");
}

// compute x_0 = x_0 + x_0
// compute r = y_0 + y_1
inline void double_add_twinned_without_reduction(field_t& x_0, const field_t& y_0, const field_t& y_1, field_t& r)
{
    __asm__ (
        // DOUBLE_ADD_TWINNED_DIRECT_STORE("%%rbx", "%%rcx")
        // Save result
        "xorq %%r12, %%r12                          \n\t"
        "movq 0(%%rbx), %%r8                        \n\t"
        "movq 8(%%rbx), %%r9                        \n\t"
        "movq 16(%%rbx), %%r10                        \n\t"
        "movq 24(%%rbx), %%r11                        \n\t"
        "movq 0(%%rcx), %%r12                        \n\t"
        "movq 8(%%rcx), %%r13                        \n\t"
        "movq 16(%%rcx), %%r14                        \n\t"
        "movq 24(%%rcx), %%r15                        \n\t"
        "adcxq %%r8, %%r8                              \n\t"
        "adoxq 0(%%rdx), %%r12                       \n\t"
        "adcxq %%r9, %%r9                              \n\t"
        "adoxq 8(%%rdx), %%r13                       \n\t"
        "adcxq %%r10, %%r10                              \n\t"
        "adoxq 16(%%rdx), %%r14                       \n\t"
        "adcxq %%r11, %%r11                              \n\t"
        "adoxq 24(%%rdx), %%r15                       \n\t"

        "movq %%r8, 0(%%rbx)                       \n\t"
        "movq %%r9, 8(%%rbx)                       \n\t"
        "movq %%r10, 16(%%rbx)                      \n\t"
        "movq %%r11, 24(%%rbx)                      \n\t"
        "movq %%r12, 0(%%rsi)                       \n\t"
        "movq %%r13, 8(%%rsi)                       \n\t"
        "movq %%r14, 16(%%rsi)                      \n\t"
        "movq %%r15, 24(%%rsi)                      \n\t"
        :
        : "b"(&x_0), "c"(&y_0), "d"(&y_1), "S"(&r), [not_modulus_0] "m"(not_modulus_0), [not_modulus_1] "m"(not_modulus_1), [not_modulus_2] "m"(not_modulus_2), [not_modulus_3] "m"(not_modulus_3)
        : "%r12", "%r13", "%r14", "%r15", "cc", "memory");
}

/**
 * Subtract `b` from `a` modulo `q`, store result in `r`
 * We assume both `b` and `a` are 254 bit integers, and skip the relevant carry checks on the most significant limb
 **/ 
inline void sub(const field_t& a, const field_t& b, field_t& r)
{
    __asm__ (
        SUB("%%rbx", "%%rcx", "%%rsi")
        :
        : "b"(&a), "c"(&b), "S"(&r), [modulus_0] "m"(modulus_0), [modulus_1] "m"(modulus_1), [modulus_2] "m"(modulus_2), [modulus_3] "m"(modulus_3)
        : "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
}

/**
 * Compute the square of `a`, modulo `q`. Store result in `r`
 * We assume `a` is 254 bits and do not perform carry checks on most significant limb
 **/ 
inline void sqr(const field_t& a, field_t& r)
{
    __asm__ (
        SQR("%%rbx")
        "movq %[r_ptr], %%rsi                   \n\t"
        REDUCE_RESULT("%%rsi")
        :
        : "b"(&a), [zero_reference] "m"(zero_reference), [r_ptr] "m"(&r), [modulus_0] "m"(modulus_0), [modulus_1] "m"(modulus_1), [modulus_2] "m"(modulus_2), [modulus_3] "m"(modulus_3), [r_inv] "m" (r_inv), [not_modulus_0] "m"(not_modulus_0), [not_modulus_1] "m"(not_modulus_1), [not_modulus_2] "m"(not_modulus_2), [not_modulus_3] "m"(not_modulus_3)
        : "%rax", "rcx", "%rdx", "%rdi", "%rsi", "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
}


/**
 * Compute `a` * `b` mod `q`, store result in `r`
 * We assume `a` is 254 bits and do not perform carry checks on most significant limb
 **/ 
inline void sqr_then_sub(const field_t& a, const field_t& c, field_t& r)
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
    __asm__ (
        SQR("%%rbx")
        "movq %[c_term], %%r8           \n\t"
        "subq 0(%%r8), %%r12            \n\t"
        "sbbq 8(%%r8), %%r13            \n\t"
        "sbbq 16(%%r8), %%r14            \n\t"
        "sbbq 24(%%r8), %%r15            \n\t"
        "movq %%r12, %%r8                       \n\t"                                 
        "movq %%r13, %%r9                       \n\t"                                 
        "movq %%r14, %%r10                      \n\t"                                 
        "movq %%r15, %%r11                      \n\t"                                 
                                                                                    
        "adoxq %[modulus_0], %%r8               \n\t" /* r'[0] -= modulus.data[0]  */ 
        "adoxq %[modulus_1], %%r9               \n\t" /* r'[1] -= modulus.data[1]  */ 
        "adoxq %[modulus_2], %%r10              \n\t" /* r'[2] -= modulus.data[2]  */ 
        "adoxq %[modulus_3], %%r11              \n\t" /* r'[3] -= modulus.data[3]  */ 
        /* if the carry flag is set, then b > a and we need to                     */ 
        /* add a modulus back into the result                                      */ 
        /* i.e. if the carry is *not* set, then r8-r11 represents                  */ 
        /* the correct result of subtraction, otherwise, swap with r8-r11          */ 
        "cmovcq %%r8, %%r12                   \n\t"                                   
        "cmovcq %%r9, %%r13                   \n\t"                                   
        "cmovcq %%r10, %%r14                   \n\t"                                  
        "cmovcq %%r11, %%r15                   \n\t"                                    
        "movq %[r_ptr], %%rsi                   \n\t"
        REDUCE_RESULT("%%rsi")
        :
        : "b"(&a), [c_term] "m"(&c), [zero_reference] "m"(zero_reference), [r_ptr] "m"(&r), [modulus_0] "m"(modulus_0), [modulus_1] "m"(modulus_1), [modulus_2] "m"(modulus_2), [modulus_3] "m"(modulus_3), [r_inv] "m" (r_inv), [not_modulus_0] "m"(not_modulus_0), [not_modulus_1] "m"(not_modulus_1), [not_modulus_2] "m"(not_modulus_2), [not_modulus_3] "m"(not_modulus_3)
        : "%rax", "rcx", "%rdx", "%rdi", "%rsi", "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
}

/**
 * Compute the square of `a`, modulo `q`. Store result in `r`
 * We assume `a` is 254 bits and do not perform carry checks on most significant limb
 **/ 
inline void sqr_without_reduction(const field_t& a, field_t& r)
{
    __asm__ (
        SQR("%%rbx")
        "movq %[r_ptr], %%rsi                   \n\t"
        // store output. Can be either r or (r + p)
        "movq %%r12, 0(%%rsi)                   \n\t" // set r'[0]
        "movq %%r13, 8(%%rsi)                   \n\t" // set r'[1]
        "movq %%r14, 16(%%rsi)                  \n\t" // set r'[2]
        "movq %%r15, 24(%%rsi)                  \n\t" // set r'[3]
        :
        : "b"(&a), [zero_reference] "m"(zero_reference), [r_ptr] "m"(&r), [modulus_0] "m"(modulus_0), [modulus_1] "m"(modulus_1), [modulus_2] "m"(modulus_2), [modulus_3] "m"(modulus_3), [r_inv] "m" (r_inv)
        : "%rax", "rcx", "%rdx", "%rdi", "%rsi", "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
}

/**
 * Compute `a` * `b` mod `q`, store result in `r`
 * We assume `a` is 254 bits and do not perform carry checks on most significant limb
 **/ 
inline void mul(const field_t& a, const field_t& b, field_t& r)
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
    __asm__ (
        MUL("%1", "%0")
        REDUCE_RESULT("%2")
        :
        : "r"(&b), "r"(&a), "r"(&r), [modulus_0] "m"(modulus_0), [modulus_1] "m"(modulus_1), [modulus_2] "m"(modulus_2), [modulus_3] "m"(modulus_3), [r_inv] "m"(r_inv), [not_modulus_0] "m"(not_modulus_0), [not_modulus_1] "m"(not_modulus_1), [not_modulus_2] "m"(not_modulus_2), [not_modulus_3] "m"(not_modulus_3)
        : "%rax", "%rdx", "%rdi", "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
}

/**
 * Compute `a` * `b` mod `q`, store result in `r`
 * We assume `a` is 254 bits and do not perform carry checks on most significant limb
 **/ 
inline void mul_then_double(const field_t& a, const field_t& b, field_t& r)
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
    __asm__ (
        MUL("%1", "%0")
        "adoxq %%r12, %%r12          \n\t"
        "adoxq %%r13, %%r13          \n\t"
        "adoxq %%r14, %%r14          \n\t"
        "adoxq %%r15, %%r15          \n\t"
        REDUCE_RESULT_TWICE()
        // REDUCE_RESULT("%2")
        :
        : "r"(&b), "r"(&a), [dest] "m"(&r), [modulus_0] "m"(modulus_0), [modulus_1] "m"(modulus_1), [modulus_2] "m"(modulus_2), [modulus_3] "m"(modulus_3), [r_inv] "m"(r_inv), [not_modulus_0] "m"(not_modulus_0), [not_modulus_1] "m"(not_modulus_1), [not_modulus_2] "m"(not_modulus_2), [not_modulus_3] "m"(not_modulus_3), [twice_not_modulus_0] "m"(twice_not_modulus_0), [twice_not_modulus_1] "m"(twice_not_modulus_1), [twice_not_modulus_2] "m"(twice_not_modulus_2), [twice_not_modulus_3] "m"(twice_not_modulus_3)
        : "%rax", "%rdx", "%rdi", "%rsi", "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
}

/**
 * Compute `a` * `b` mod `q`, store result in `r`
 * We assume `a` is 254 bits and do not perform carry checks on most significant limb
 **/ 
inline void mul_then_sub(const field_t& a, const field_t& b, const field_t& c, field_t& r)
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
    __asm__ (
        MUL("%1", "%0")
        "movq %[c_term], %%r8           \n\t"
        "subq 0(%%r8), %%r12            \n\t"
        "sbbq 8(%%r8), %%r13            \n\t"
        "sbbq 16(%%r8), %%r14            \n\t"
        "sbbq 24(%%r8), %%r15            \n\t"
        "movq %%r12, %%r8                       \n\t"                                 
        "movq %%r13, %%r9                       \n\t"                                 
        "movq %%r14, %%r10                      \n\t"                                 
        "movq %%r15, %%r11                      \n\t"                                 
                                                                                    
        "adoxq %[modulus_0], %%r8               \n\t" /* r'[0] -= modulus.data[0]  */ 
        "adoxq %[modulus_1], %%r9               \n\t" /* r'[1] -= modulus.data[1]  */ 
        "adoxq %[modulus_2], %%r10              \n\t" /* r'[2] -= modulus.data[2]  */ 
        "adoxq %[modulus_3], %%r11              \n\t" /* r'[3] -= modulus.data[3]  */ 
        /* if the carry flag is set, then b > a and we need to                     */ 
        /* add a modulus back into the result                                      */ 
        /* i.e. if the carry is *not* set, then r8-r11 represents                  */ 
        /* the correct result of subtraction, otherwise, swap with r8-r11          */ 
        "cmovcq %%r8, %%r12                   \n\t"                                   
        "cmovcq %%r9, %%r13                   \n\t"                                   
        "cmovcq %%r10, %%r14                   \n\t"                                  
        "cmovcq %%r11, %%r15                   \n\t"                                    
        REDUCE_RESULT("%2")
        :
        : "r"(&b), "r"(&a), "r"(&r), [c_term] "m"(&c), [modulus_0] "m"(modulus_0), [modulus_1] "m"(modulus_1), [modulus_2] "m"(modulus_2), [modulus_3] "m"(modulus_3), [r_inv] "m"(r_inv), [not_modulus_0] "m"(not_modulus_0), [not_modulus_1] "m"(not_modulus_1), [not_modulus_2] "m"(not_modulus_2), [not_modulus_3] "m"(not_modulus_3), [twice_not_modulus_0] "m"(twice_not_modulus_0), [twice_not_modulus_1] "m"(twice_not_modulus_1), [twice_not_modulus_2] "m"(twice_not_modulus_2), [twice_not_modulus_3] "m"(twice_not_modulus_3)
        : "%rax", "%rdx", "%rdi", "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
}
/**
 * Compute `a` * `b` mod `q`, store result in `r`
 * We assume `a` is 254 bits and do not perform carry checks on most significant limb
 **/ 
inline void mul_without_reduction(const field_t& a, const field_t& b, field_t& r)
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
    __asm__ (
        MUL("%1", "%0")
        // store output. Result may be r, or r + p.
        "movq %%r12, 0(%2)                       \n\t" // set r'[0]
        "movq %%r13, 8(%2)                       \n\t" // set r'[1]
        "movq %%r14, 16(%2)                      \n\t" // set r'[2]
        "movq %%r15, 24(%2)                      \n\t" // set r'[3]
        :
        : "r"(&b), "r"(&a), "r"(&r), [modulus_0] "m"(modulus_0), [modulus_1] "m"(modulus_1), [modulus_2] "m"(modulus_2), [modulus_3] "m"(modulus_3), [r_inv] "m"(r_inv), [not_modulus_0] "m"(not_modulus_0), [not_modulus_1] "m"(not_modulus_1), [not_modulus_2] "m"(not_modulus_2), [not_modulus_3] "m"(not_modulus_3)
        : "%rax", "%rdx", "%rdi", "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
}
} // namespace fq

#endif