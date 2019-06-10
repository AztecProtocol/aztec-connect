#ifndef FQ_IMPL_ASM
#define FQ_IMPL_ASM

#include <stdint.h>
#include <unistd.h>

#include "assert.hpp"
#include "types.hpp"
#include "asm_macros.hpp"
namespace fq
{
namespace
{
static const field_t r_squared = { .data = {
    0xF32CFC5B538AFA89UL,
    0xB5E71911D44501FBUL,
    0x47AB1EFF0A417FF6UL,
    0x06D89F71CAB8351FUL,
}};

static const field_t modulus_plus_one = { .data = {
    0x3C208C16D87CFD48UL,
    0x97816a916871ca8dUL,
    0xb85045b68181585dUL,
    0x30644e72e131a029UL
}};

static const field_t one_raw = { .data = { 1, 0, 0, 0 } };

static const field_t one_mont = { .data = {
    0xd35d438dc58f0d9d,
    0x0a78eb28f5c70b3d,
    0x666ea36f7879462c,
    0x0e0a77c19a07df2f
}};

// negative modulus, in two's complement form (inverted + 1)
static const uint64_t not_modulus_0 = ((~0x3C208C16D87CFD47UL) + 1);
static const uint64_t not_modulus_1 = ~0x97816a916871ca8dUL;
static const uint64_t not_modulus_2 = ~0xb85045b68181585dUL;
static const uint64_t not_modulus_3 = ~0x30644e72e131a029UL;

static const field_t not_modulus = { .data = {
    ((~0x3C208C16D87CFD47UL) + 1),
    ~0x97816a916871ca8dUL,
    ~0xb85045b68181585dUL,
    ~0x30644e72e131a029UL
}};

// cube root of unity modulo (modulus), converted into montgomery form
static const field_t beta = {
    0x71930c11d782e155UL,
    0xa6bb947cffbe3323UL,
    0xaa303344d4741444UL,
    0x2c3b3f0d26594943UL};

static const uint64_t r_inv = 0x87d20782e4866389UL;

// sometimes we don't have any free registers to store 0.
// When adding carry flags into a limb, apparently adding relative
// to a memory location that stores 0 is faster than changing the
// asm code to free up a register we can zero
static uint64_t zero_reference = 0;
} // namespace

// modulus of field q
static const uint64_t modulus_0 = 0x3C208C16D87CFD47UL;
static const uint64_t modulus_1 = 0x97816a916871ca8dUL;
static const uint64_t modulus_2 = 0xb85045b68181585dUL;
static const uint64_t modulus_3 = 0x30644e72e131a029UL;

static const field_t modulus = {
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
    __asm__ __volatile__(
        "vmovdqa 0(%0), %%ymm0              \n\t"
        "vmovdqa %%ymm0, 0(%1)              \n\t"
        :
        : "r"(src.data), "r"(dest.data)
        : "%ymm0", "memory");
#else
    __asm__ __volatile__(
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
    __asm__ __volatile__(
        ADD("%%rbx", "%%rcx")
        REDUCE_RESULT("%%rsi")
        :
        : "b"(&a), "c"(&b), "S"(&r), [not_modulus_0] "m"(not_modulus_0), [not_modulus_1] "m"(not_modulus_1), [not_modulus_2] "m"(not_modulus_2), [not_modulus_3] "m"(not_modulus_3)
        : "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
}


/**
 * Add field_t elements `a` and `b` modulo `q`, store the result in `r`
 * We assume both `b` and `a` are 254 bit integers, and skip the relevant carry checks on the most significant limb
 **/ 
inline void add_without_reduction(const field_t& a, const field_t& b, field_t& r)
{
    __asm__ __volatile__(
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

/**
 * Subtract `b` from `a` modulo `q`, store result in `r`
 * We assume both `b` and `a` are 254 bit integers, and skip the relevant carry checks on the most significant limb
 **/ 
inline void sub(const field_t& a, const field_t& b, field_t& r)
{
    __asm__ __volatile__(
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
    __asm__ __volatile__(
        SQR("%%rbx")
        "movq %[r_ptr], %%rsi                   \n\t"
        REDUCE_RESULT("%%rsi")
        :
        : "b"(&a), [zero_reference] "m"(zero_reference), [r_ptr] "m"(&r), [modulus_0] "m"(modulus_0), [modulus_1] "m"(modulus_1), [modulus_2] "m"(modulus_2), [modulus_3] "m"(modulus_3), [r_inv] "m" (r_inv), [not_modulus_0] "m"(not_modulus_0), [not_modulus_1] "m"(not_modulus_1), [not_modulus_2] "m"(not_modulus_2), [not_modulus_3] "m"(not_modulus_3)
        : "%rax", "rcx", "%rdx", "%rdi", "%rsi", "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
}



/**
 * Compute the square of `a`, modulo `q`. Store result in `r`
 * We assume `a` is 254 bits and do not perform carry checks on most significant limb
 **/ 
inline void sqr_without_reduction(const field_t& a, field_t& r)
{
    __asm__ __volatile__(
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
    __asm__ __volatile__(
        MUL("%%rbx", "%%rcx", "%%rsi")
        REDUCE_RESULT("%%rsi")
        :
        : "c"(&b), "b"(&a), [r_ptr] "m"(&r), [modulus_0] "m"(modulus_0), [modulus_1] "m"(modulus_1), [modulus_2] "m"(modulus_2), [modulus_3] "m"(modulus_3), [r_inv] "m"(r_inv), [not_modulus_0] "m"(not_modulus_0), [not_modulus_1] "m"(not_modulus_1), [not_modulus_2] "m"(not_modulus_2), [not_modulus_3] "m"(not_modulus_3)
        : "%rsi", "%rax", "%rdx", "%rdi", "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
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
    __asm__ __volatile__(
        MUL("%%rbx", "%%rcx", "%%rsi")
        // store output. Result may be r, or r + p.
        "movq %%r12, 0(%%rsi)                       \n\t" // set r'[0]
        "movq %%r13, 8(%%rsi)                       \n\t" // set r'[1]
        "movq %%r14, 16(%%rsi)                      \n\t" // set r'[2]
        "movq %%r15, 24(%%rsi)                      \n\t" // set r'[3]
        :
        : "c"(&b), "b"(&a), [r_ptr] "m"(&r), [modulus_0] "m"(modulus_0), [modulus_1] "m"(modulus_1), [modulus_2] "m"(modulus_2), [modulus_3] "m"(modulus_3), [r_inv] "m"(r_inv), [not_modulus_0] "m"(not_modulus_0), [not_modulus_1] "m"(not_modulus_1), [not_modulus_2] "m"(not_modulus_2), [not_modulus_3] "m"(not_modulus_3)
        : "%rsi", "%rax", "%rdx", "%rdi", "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
}
} // namespace fq

#endif