#ifndef FQ_IMPL_ASM
#define FQ_IMPL_ASM

#include <stdint.h>
#include <unistd.h>

#include "assert.hpp"
#include "types.hpp"

namespace fq
{
namespace
{
static const field_t r_squared = {
    0xF32CFC5B538AFA89UL,
    0xB5E71911D44501FBUL,
    0x47AB1EFF0A417FF6UL,
    0x06D89F71CAB8351FUL,
};

static const field_t modulus_plus_one = {
    0x3C208C16D87CFD48UL,
    0x97816a916871ca8dUL,
    0xb85045b68181585dUL,
    0x30644e72e131a029UL};

static const field_t one_raw = {1, 0, 0, 0};

static const field_t one_mont = {
    0xd35d438dc58f0d9d,
    0x0a78eb28f5c70b3d,
    0x666ea36f7879462c,
    0x0e0a77c19a07df2f};

// negative modulus, in two's complement form (inverted + 1)
static const field_t not_modulus = {
    ((~0x3C208C16D87CFD47UL) + 1),
    ~0x97816a916871ca8dUL,
    ~0xb85045b68181585dUL,
    ~0x30644e72e131a029UL};

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

inline bool gt(const uint64_t *a, const uint64_t *b)
{
    // uint64_t out = false;
    // __asm__ (
    //     // clear flags
    //     "xorq %%rcx, %%rcx                        \n\t"
    //     "movq 0(%%rbx), %%r8                       \n\t"
    //     "movq 8(%%rbx), %%r9                       \n\t"
    //     "movq 16(%%rbx), %%r10                     \n\t"
    //     "movq 24(%%rbx), %%r11                     \n\t"

    //     "subq 0(%%rax), %%r8                       \n\t"
    //     "sbbq 8(%%rax), %%r9                       \n\t"
    //     "sbbq 16(%%rax), %%r10                     \n\t"
    //     "sbbq 24(%%rax), %%r11                     \n\t"
    //     "adcxq %%rcx, %%rcx                            \n\t"
    //     : "=c" (out)
    //     : "a" (a), "b" (b)
    //     : "%r8", "%r9", "%r10", "%r11", "cc");
    // printf("out = %d\n", (int)out);
    // return (bool)out;
    bool t0 = a[3] > b[3];
    bool t1 = (a[3] == b[3]) && (a[2] > b[2]);
    bool t2 = (a[3] == b[3]) && (a[2] == b[2]) && (a[1] > b[1]);
    bool t3 = (a[3] == b[3]) && (a[2] == b[2]) && (a[1] == b[1]) && (a[0] > b[0]);
    return (t0 || t1 || t2 || t3);
}
} // namespace

// modulus of field q
static const field_t modulus = {
    0x3C208C16D87CFD47UL,
    0x97816a916871ca8dUL,
    0xb85045b68181585dUL,
    0x30644e72e131a029UL};

/**
 * copy src into dest. AVX implementation requires words to be aligned on 32 byte bounary
 **/ 
inline void copy(const uint64_t* src, uint64_t* dest)
{
#ifdef __AVX__
    ASSERT((((uintptr_t)src & 0x1f) == 0));
    ASSERT((((uintptr_t)dest & 0x1f) == 0));
    __asm__ __volatile__(
        "vmovdqa 0(%0), %%ymm0              \n\t"
        "vmovdqa %%ymm0, 0(%1)              \n\t"
        :
        : "r"(src), "r"(dest)
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
        : "r"(src), "r"(dest)
        : "%r8", "%r9", "%r10", "%r11", "memory");
#endif
}

/**
 * Add field_t elements `a` and `b` modulo `q`, store the result in `r`
 * We assume both `b` and `a` are 254 bit integers, and skip the relevant carry checks on the most significant limb
 **/ 
inline void add(const uint64_t *a, const uint64_t *b, uint64_t *r)
{
    __asm__ __volatile__(
        // clear flags
        "xorq %%r8, %%r8                        \n\t"
        "movq 0(%%rax), %%r8                    \n\t"
        "movq 8(%%rax), %%r9                    \n\t"
        "movq 16(%%rax), %%r10                  \n\t"
        "movq 24(%%rax), %%r11                  \n\t"

        // perform addition via the `adcx` opcode and our modular reduction check
        // with the `adox` opcode. Every CPU cycle can process one of each opcode,
        // allowing us to evaluate two carry chains at once
        "adcxq 0(%%rbx), %%r8                   \n\t"
        "adcxq 8(%%rbx), %%r9                   \n\t"
        "adcxq 16(%%rbx), %%r10                 \n\t"
        "adcxq 24(%%rbx), %%r11                 \n\t"

        // r8-r11 contain our result `r`, however we may need to subtract `modulus` from the result.
        // Instead of a conditional branch (which cannot be reliably predicted), we evaluate
        // `r - modulus`, and use a conditional move instruction to get our result.

        // Duplicate `r`
        "movq %%r8, %%r12                       \n\t"
        "movq %%r9, %%r13                       \n\t"
        "movq %%r10, %%r14                      \n\t"
        "movq %%r11, %%r15                      \n\t"

        // Add the negative representation of 'modulus' into `r`. We do this instead
        // of subtracting, because we can use `adoxq`. This opcode only has a dependence on the overflow
        // flag (sub/sbb changes both carry and overflow flags).
        // We can process an `adcxq` and `acoxq` opcode simultaneously.
        "adoxq %[not_modulus_0], %%r8           \n\t" // r'[0] -= modulus[0]
        "adoxq %[not_modulus_1], %%r9           \n\t" // r'[1] -= modulus[1]
        "adoxq %[not_modulus_2], %%r10          \n\t" // r'[2] -= modulus[2]
        "adoxq %[not_modulus_3], %%r11          \n\t" // r'[3] -= modulus[3]

        // if r does not need to be reduced, overflow flag is 1
        // set r' = r if this flag is set
        "cmovnoq %%r12, %%r8                    \n\t"
        "movq %%r8, 0(%%rsi)                    \n\t"
        "cmovnoq %%r13, %%r9                    \n\t"
        "movq %%r9, 8(%%rsi)                    \n\t"
        "cmovnoq %%r14, %%r10                   \n\t"
        "movq %%r10, 16(%%rsi)                  \n\t"
        "cmovnoq %%r15, %%r11                   \n\t"
        "movq %%r11, 24(%%rsi)                  \n\t"
        :
        : "a"(a), "b"(b), "S"(r), [not_modulus_0] "m"(not_modulus[0]), [not_modulus_1] "m"(not_modulus[1]), [not_modulus_2] "m"(not_modulus[2]), [not_modulus_3] "m"(not_modulus[3])
        : "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
}

/**
 * Subtract `b` from `a` modulo `q`, store result in `r`
 * We assume both `b` and `a` are 254 bit integers, and skip the relevant carry checks on the most significant limb
 **/ 
inline void sub(const uint64_t *a, const uint64_t *b, uint64_t *r)
{
    __asm__ __volatile__(
        // clear flags
        "xorq %%r8, %%r8                        \n\t"
        "movq 0(%%rax), %%r8                    \n\t"
        "movq 8(%%rax), %%r9                    \n\t"
        "movq 16(%%rax), %%r10                  \n\t"
        "movq 24(%%rax), %%r11                  \n\t"

        "subq 0(%%rbx), %%r8                    \n\t"
        "sbbq 8(%%rbx), %%r9                    \n\t"
        "sbbq 16(%%rbx), %%r10                  \n\t"
        "sbbq 24(%%rbx), %%r11                  \n\t"

        "movq %%r8, %%r12                       \n\t"
        "movq %%r9, %%r13                       \n\t"
        "movq %%r10, %%r14                      \n\t"
        "movq %%r11, %%r15                      \n\t"

        "adoxq %[modulus_0], %%r8                \n\t" // r'[0] -= modulus[0]
        "adoxq %[modulus_1], %%r9                \n\t" // r'[1] -= modulus[1]
        "adoxq %[modulus_2], %%r10               \n\t" // r'[2] -= modulus[2]
        "adoxq %[modulus_3], %%r11               \n\t" // r'[3] -= modulus[3]

        // if the carry flag is set, then b > a and we need to add a modulus back into the result
        // i.e. if the carry is *not* set, then r8-r11 represents the correct result of subtraction,
        // otherwise, swap with r8-r11
        "cmovncq %%r12, %%r8                     \n\t"
        "movq %%r8, 0(%%rsi)                    \n\t"
        "cmovncq %%r13, %%r9                     \n\t"
        "movq %%r9, 8(%%rsi)                    \n\t"
        "cmovncq %%r14, %%r10                    \n\t"
        "movq %%r10, 16(%%rsi)                  \n\t"
        "cmovncq %%r15, %%r11                    \n\t"
        "movq %%r11, 24(%%rsi)                  \n\t"
        :
        : "a"(a), "b"(b), "S"(r), [modulus_0] "m"(modulus[0]), [modulus_1] "m"(modulus[1]), [modulus_2] "m"(modulus[2]), [modulus_3] "m"(modulus[3])
        : "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
}

/**
 * Compute the square of `a`, modulo `q`. Store result in `r`
 * We assume `a` is 254 bits and do not perform carry checks on most significant limb
 **/ 
inline void sqr(const uint64_t *a, uint64_t *r)
{
    __asm__ __volatile__(
        "movq 0(%%rbx), %%rdx                   \n\t" // load a[0] into %rdx

        // zero flags
        "xorq %%r8, %%r8                        \n\t"

        // compute a[0] *a[1], a[0]*a[2], a[0]*a[3], a[1]*a[2], a[1]*a[3], a[2]*a[3]
        "mulxq 8(%%rbx), %%r9, %%r10            \n\t" // (r[1], r[2]) <- a[0] * a[1]
        "mulxq 16(%%rbx), %%r8, %%r15           \n\t" // (t[1], t[2]) <- a[0] * a[2]
        "mulxq 24(%%rbx), %%r11, %%r12          \n\t" // (r[3], r[4]) <- a[0] * a[3]
        "movq 8(%%rbx), %%rdx                   \n\t" // load a[1] into %r%dx
        "mulxq 16(%%rbx), %%rdi, %%rsi          \n\t" // (t[5], t[6]) <- a[1] * a[2]
        "mulxq 24(%%rbx), %%rax, %%rcx          \n\t" // (t[3], t[4]) <- a[1] * a[3]
        "movq 24(%%rbx), %%rdx                  \n\t" // load a[3] into %%rdx
        "mulxq 16(%%rbx), %%r13, %%r14          \n\t" // (r[5], r[6]) <- a[3] * a[2]

        // "xorq %%rdx, %%rdx                      \n\t"
        // accumulate products into result registers
        "adoxq %%r8, %%r10                      \n\t"     // r[2] += t[1]
        "adcxq %%r15, %%r11                     \n\t"     // r[3] += t[2]
        "adoxq %%rdi, %%r11                     \n\t"     // r[3] += t[5]
        "adcxq %%rax, %%r12                     \n\t"     // r[4] += t[3]
        "adoxq %%rsi, %%r12                     \n\t"     // r[4] += t[6]
        "adcxq %%rcx, %%r13                     \n\t"     // r[5] += t[4] + flag_o
        "adoxq %[zero_reference], %%r13         \n\t" // r[5] += flag_o
        "adcxq %[zero_reference], %%r14         \n\t" // r[6] += flag_c

        // double result registers
        "adoxq %%r9, %%r9                       \n\t" // r[1] = 2r[1]
        "adcxq %%r12, %%r12                     \n\t" // r[4] = 2r[4]
        "adoxq %%r10, %%r10                     \n\t" // r[2] = 2r[2]
        "adcxq %%r13, %%r13                     \n\t" // r[5] = 2r[5]
        "adoxq %%r11, %%r11                     \n\t" // r[3] = 2r[3]
        "adcxq %%r14, %%r14                     \n\t" // r[6] = 2r[6]
        // "adoxq %[zero_reference], %%r15              \n\t"
        "adoxq %[zero_reference], %%r12         \n\t" // r[4] += flag_o

        // compute a[3]*a[3], a[2]*a[2], a[1]*a[1], a[0]*a[0]
        "mulxq %%rdx, %%rdi, %%r15              \n\t" // (t[5], r[7]) <- a[3] * a[3]
        "movq 0(%%rbx), %%rdx                   \n\t" // load a[0] into %rdx
        "mulxq %%rdx, %%r8, %%rcx               \n\t" // (r[0], t[4]) <- a[0] * a[0]
        "movq 16(%%rbx), %%rdx                  \n\t" // load a[2] into %rdx
        "mulxq %%rdx, %%rdx, %%rax              \n\t" // (t[7], t[8]) <- a[2] * a[2]

        // add squares into result registers
        // TODO: make this a bit nicer!
        "adcxq %%rcx, %%r9                      \n\t" // r[1] += t[4]
        "adoxq %%rdx, %%r12                     \n\t" // r[4] += t[7]
        "adoxq %%rax, %%r13                     \n\t" // r[5] += t[8]

        "movq 8(%%rbx), %%rdx                   \n\t" // load a[1] into %rdx
        "mulxq %%rdx, %%rax, %%rsi              \n\t" // (t[3], t[6]) <- a[1] * a[1]

        "adcxq %%rax, %%r10                     \n\t" // r[2] += t[3]
        "adcxq %%rsi, %%r11                     \n\t" // r[3] += t[6]
        "adoxq %%rdi, %%r14                     \n\t" // r[6] += t[5]
        "adcxq %[zero_reference], %%r12         \n\t" // r[4] += flag_o
        "adoxq %[zero_reference], %%r15         \n\t" // r[7] += flag_c

        // perform modular reduction: r[0]
        "movq %%r8, %%rdx                       \n\t"     // move r8 into %rdx
        "mulxq %[r_inv], %%rdx, %%rax           \n\t"     // (%rdx, _) <- k = r[9] * r_inv
        "mulxq %[modulus_0], %%rdi, %%rsi       \n\t"     // (t[0], t[1]) <- (modulus[0] * k)
        "mulxq %[modulus_1], %%rax, %%rcx       \n\t"     // (t[2], t[3]) <- (modulus[1] * k)
        "adcxq %%rdi, %%r8                      \n\t"     // r[0] += t[0] (%r8 now free)
        "adoxq %%rax, %%r9                      \n\t"     // r[1] += t[2]
        "adcxq %%rsi, %%r9                      \n\t"     // r[1] += t[1] + flag_c
        "adoxq %%rcx, %%r10                     \n\t"     // r[2] += t[3] + flag_o
        "mulxq %[modulus_2], %%rdi, %%rsi       \n\t"     // (t[0], t[1]) <- (modulus[3] * k)
        "mulxq %[modulus_3], %%rax, %%rcx       \n\t"     // (t[2], t[3]) <- (modulus[2] * k)
        "adcxq %%rdi, %%r10                     \n\t"     // r[2] += t[0] + flag_c
        "adoxq %%rax, %%r11                     \n\t"     // r[3] += t[2] + flag_o
        "adcxq %%rsi, %%r11                     \n\t"     // r[3] += t[1] + flag_c
        "adoxq %%rcx, %%r12                     \n\t"     // r[4] += t[3] + flag_o
        "adcxq %[zero_reference], %%r12         \n\t" // r[4] += flag_c
        "adoxq %[zero_reference], %%r13         \n\t" // r[5] += flag_o

        // perform modular reduction: r[1]
        "movq %%r9, %%rdx                       \n\t"     // move r9 into %rdx
        "mulxq %[r_inv], %%rdx, %%rax           \n\t"     // (%rdx, _) <- k = r[9] * r_inv
        "mulxq %[modulus_0], %%rdi, %%rsi       \n\t"     // (t[0], t[1]) <- (modulus[0] * k)
        "mulxq %[modulus_1], %%rax, %%rcx       \n\t"     // (t[2], t[3]) <- (modulus[1] * k)
        "adoxq %%rdi, %%r9                      \n\t"     // r[1] += t[0] (%r8 now free)
        "adcxq %%rax, %%r10                     \n\t"     // r[2] += t[2]
        "adoxq %%rsi, %%r10                     \n\t"     // r[2] += t[1] + flag_c
        "adcxq %%rcx, %%r11                     \n\t"     // r[3] += t[3] + flag_o
        "mulxq %[modulus_2], %%rdi, %%rsi       \n\t"     // (t[0], t[1]) <- (modulus[3] * k)
        "mulxq %[modulus_3], %%rax, %%rcx       \n\t"     // (t[2], t[3]) <- (modulus[2] * k)
        "adoxq %%rdi, %%r11                     \n\t"     // r[3] += t[0] + flag_c
        "adcxq %%rax, %%r12                     \n\t"     // r[4] += t[2] + flag_o
        "adoxq %%rsi, %%r12                     \n\t"     // r[4] += t[1] + flag_c
        "adcxq %%rcx, %%r13                     \n\t"     // r[5] += t[3] + flag_o
        "adoxq %[zero_reference], %%r13                     \n\t" // r[5] += flag_c
        "adcxq %[zero_reference], %%r14                     \n\t" // r[6] += flag_o

        // perform modular reduction: r[2]
        "movq %%r10, %%rdx                      \n\t"     // move r10 into %rdx
        "mulxq %[r_inv], %%rdx, %%rax           \n\t"     // (%rdx, _) <- k = r[10] * r_inv
        "mulxq %[modulus_0], %%rdi, %%rsi       \n\t"     // (t[0], t[1]) <- (modulus[0] * k)
        "mulxq %[modulus_1], %%rax, %%rcx       \n\t"     // (t[2], t[3]) <- (modulus[1] * k)
        "adoxq %%rdi, %%r10                      \n\t"    // r[2] += t[0] (%r8 now free)
        "adcxq %%rax, %%r11                     \n\t"     // r[3] += t[2]
        "adoxq %%rsi, %%r11                     \n\t"     // r[3] += t[1] + flag_c
        "adcxq %%rcx, %%r12                     \n\t"     // r[4] += t[3] + flag_o
        "mulxq %[modulus_2], %%rdi, %%rsi       \n\t"     // (t[0], t[1]) <- (modulus[3] * k)
        "mulxq %[modulus_3], %%rax, %%rcx       \n\t"     // (t[2], t[3]) <- (modulus[2] * k)
        "adoxq %%rdi, %%r12                     \n\t"     // r[4] += t[0] + flag_c
        "adcxq %%rax, %%r13                     \n\t"     // r[5] += t[2] + flag_o
        "adoxq %%rsi, %%r13                     \n\t"     // r[5] += t[1] + flag_c
        "adcxq %%rcx, %%r14                     \n\t"     // r[6] += t[3] + flag_o
        "adoxq %[zero_reference], %%r14                     \n\t" // r[6] += flag_c
        "adcxq %[zero_reference], %%r15                     \n\t" // r[7] += flag_o

        // perform modular reduction: r[3]
        "movq %%r11, %%rdx                      \n\t"         // move r11 into %rdx
        "mulxq %[r_inv], %%rdx, %%rax           \n\t"         // (%rdx, _) <- k = r[10] * r_inv
        "mulxq %[modulus_0], %%rdi, %%rsi       \n\t"         // (t[0], t[1]) <- (modulus[0] * k)
        "mulxq %[modulus_1], %%rax, %%rcx       \n\t"         // (t[2], t[3]) <- (modulus[1] * k)
        "mulxq %[modulus_2], %%r8, %%r9         \n\t"         // (t[0], t[1]) <- (modulus[3] * k)
        "mulxq %[modulus_3], %%r10, %%rdx       \n\t"         // (t[2], t[3]) <- (modulus[2] * k)
        "adoxq %%rdi, %%r11                     \n\t"         // r[3] += t[0] (%r8 now free)
        "adcxq %%rax, %%r12                     \n\t"         // r[4] += t[2]
        "adoxq %%rsi, %%r12                     \n\t"         // r[4] += t[1] + flag_c
        "adcxq %%rcx, %%r13                     \n\t"         // r[5] += t[3] + flag_o
        "adoxq %%r8, %%r13                      \n\t"         // r[5] += t[0] + flag_c
        "adcxq %%r10, %%r14                     \n\t"         // r[6] += t[2] + flag_o
        "adoxq %%r9, %%r14                      \n\t"         // r[6] += t[1] + flag_c
        "adcxq %%rdx, %%r15                     \n\t"         // r[7] += t[3] + flag_o
        "adoxq %[zero_reference], %%r15                         \n\t" // r[7] += flag_c

        // "xorq %%rsi, %%rsi                      \n\t"
        "movq %[r_ptr], %%rsi                   \n\t"

        // copy output
        "movq %%r12, %%r8                       \n\t" // set r'[0]
        "movq %%r13, %%r9                       \n\t" // set r'[1]
        "movq %%r14, %%r10                      \n\t" // set r'[2]
        "movq %%r15, %%r11                      \n\t" // set r'[3]
        // compute (r - p)
        "subq %[modulus_0], %%r8                \n\t" // r'[0] -= modulus[0]
        "sbbq %[modulus_1], %%r9                \n\t" // r'[1] -= modulus[1]
        "sbbq %[modulus_2], %%r10               \n\t" // r'[2] -= modulus[2]
        "sbbq %[modulus_3], %%r11               \n\t" // r'[3] -= modulus[3]
        // if r does not need to be reduced, carry flag is 1
        // set r' = r if this flag is set
        "cmovcq %%r12, %%r8                     \n\t"
        "movq %%r8, 0(%%rsi)                    \n\t"
        "cmovcq %%r13, %%r9                     \n\t"
        "movq %%r9, 8(%%rsi)                    \n\t"
        "cmovcq %%r14, %%r10                    \n\t"
        "movq %%r10, 16(%%rsi)                  \n\t"
        "cmovcq %%r15, %%r11                    \n\t"
        "movq %%r11, 24(%%rsi)                  \n\t"
        :
        : "b"(a), [zero_reference] "m"(zero_reference), [r_ptr] "m"(r), [modulus_0] "m"(modulus[0]), [modulus_1] "m"(modulus[1]), [modulus_2] "m"(modulus[2]), [modulus_3] "m"(modulus[3]), [r_inv] "m"(r_inv)
        : "%rax", "rcx", "%rdx", "%rdi", "%rsi", "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
}

/**
 * Compute `a` * `b` mod `q`, store result in `r`
 * We assume `a` is 254 bits and do not perform carry checks on most significant limb
 **/ 
inline void mul(const uint64_t *a, const uint64_t *b, uint64_t *r)
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
        "movq 0(%%rbx), %%rdx                       \n\t" // load a[0] into %rdx

        // front-load mul ops, can parallelize 4 of these but latency is 4 cycles
        "mulxq 8(%%rcx), %%r8, %%r9                 \n\t" // (t[0], t[1]) <- a[0] * b[1]
        "mulxq 24(%%rcx), %%rdi, %%rax              \n\t" // (t[2], r[4]) <- a[0] * b[3] (overwrite a[0])
        "mulxq 0(%%rcx), %%r12, %%r13               \n\t" // (r[0], r[1]) <- a[0] * b[0]
        "mulxq 16(%%rcx), %%r14, %%r15              \n\t" // (r[2] , r[3]) <- a[0] * b[2]
        // zero flags
        "xorq %%r10, %%r10                          \n\t" // clear r10 register, we use this as a reference to 9

        // start computing modular reduction
        "movq %%r12, %%rdx                          \n\t" // move r_inv into %rdx
        "mulxq %[r_inv], %%rdx, %%rsi               \n\t" // (%rdx, _) <- k = r[1] * r_inv

        // start first addition chain
        "adcxq %%r8, %%r13                          \n\t" // r[1] += t[0]
        "adoxq %%rdi, %%r15                         \n\t" // r[3] += t[2] + flag_o
        "adcxq %%r9, %%r14                          \n\t" // r[2] += t[1] + flag_c
        "adoxq %%r10, %%rax                         \n\t" // r[4] += flag_c
        "adcxq %%r10, %%r15                         \n\t" // r[3] += flag_o

        /**
         * reduce by r[0] * k
         **/
        "mulxq %[modulus_0], %%r8, %%r9             \n\t" // (t[0], t[1]) <- (modulus[0] * k)
        "mulxq %[modulus_1], %%rdi, %%rsi           \n\t" // (t[0], t[1]) <- (modulus[1] * k)
        "adoxq %%r8, %%r12                          \n\t" // r[1] += t[0] (%r12 now free)
        "adcxq %%rdi, %%r13                         \n\t" // r[1] += t[0]
        "adoxq %%r9, %%r13                          \n\t" // r[2] += t[1] + flag_c
        "adcxq %%rsi, %%r14                         \n\t" // r[2] += t[1] + flag_c
        "mulxq %[modulus_2], %%r8, %%r9             \n\t" // (t[0], t[1]) <- (modulus[2] * k)
        "mulxq %[modulus_3], %%rdi, %%rsi           \n\t" // (t[2], t[3]) <- (modulus[3] * k)
        "adoxq %%r8, %%r14                          \n\t" // r[3] += t[0] + flag_c
        "adcxq %%rdi, %%r15                         \n\t" // r[3] += t[2] + flag_c
        "adoxq %%r9, %%r15                          \n\t" // r[4] += t[1] + flag_c
        "adcxq %%rsi, %%rax                         \n\t" // r[4] += t[3] + flag_c
        "adoxq %%r10, %%rax                         \n\t" // r[4] += flag_c

        // modulus = 254 bits, so max(t[3])  = 62 bits
        // b also 254 bits, so (a[0] * b[3]) = 62 bits
        // i.e. carry flag here is always 0 if b is in mont form, no need to update r[5]
        // (which is very convenient because we're out of registers!)
        // N.B. the value of r[4] now has a max of 63 bits and can accept another 62 bit value before overflowing

        /**
         * a[1] * b
         * r12 <- r[5]
         **/
        "movq 8(%%rbx), %%rdx                      \n\t" // load a[1] into %rdx
        "mulxq 0(%%rcx), %%r8, %%r9                \n\t" // (t[0], t[1]) <- (a[1] * b[0])
        "mulxq 8(%%rcx), %%rdi, %%rsi              \n\t" // (t[4], t[5]) <- (a[1] * b[1])
        "adcxq %%r8, %%r13                         \n\t" // r[1] += t[0]
        "adoxq %%r9, %%r14                         \n\t" // r[2] += t[1] + flag_c
        "adcxq %%rdi, %%r14                        \n\t" // r[2] += t[0]
        "adoxq %%rsi, %%r15                        \n\t" // r[3] += t[1] + flag_c

        "mulxq 16(%%rcx), %%r8, %%r9               \n\t" // (t[2], t[3]) <- (a[1] * b[2])
        "mulxq 24(%%rcx), %%rdi, %%r12             \n\t" // (t[6], r[5]) <- (a[1] * b[3])
        "adcxq %%r8, %%r15                         \n\t" // r[3] += t[0] + flag_c
        "adoxq %%rdi, %%rax                        \n\t" // r[4] += t[2] + flag_c
        "adcxq %%r9, %%rax                         \n\t" // r[4] += t[1] + flag_c
        "adoxq %%r10, %%r12                        \n\t" // r[5] += flag_c
        "adcxq %%r10, %%r12                        \n\t" // r[5] += flag_c

        /**
         * reduce by r[1] * k
         **/
        "movq %%r13, %%rdx                         \n\t"  // move r_inv into %rdx
        "mulxq %[r_inv], %%rdx, %%r8               \n\t"  // (%rdx, _) <- k = r[1] * r_inv
        "mulxq %[modulus_0], %%r8, %%r9            \n\t"  // (t[0], t[1]) <- (modulus[0] * k)
        "mulxq %[modulus_1], %%rdi, %%rsi          \n\t"  // (t[0], t[1]) <- (modulus[1] * k)
        "adoxq %%r8, %%r13                         \n\t"  // r[1] += t[0] (%r13 now free)
        "adcxq %%rdi, %%r14                        \n\t"  // r[1] += t[0]
        "adoxq %%r9, %%r14                         \n\t"  // r[2] += t[1] + flag_c
        "adcxq %%rsi, %%r15                        \n\t"  // r[2] += t[1] + flag_c
        "mulxq %[modulus_2], %%r8, %%r9            \n\t"  // (t[0], t[1]) <- (modulus[2] * k)
        "mulxq %[modulus_3], %%rdi, %%rsi          \n\t"  // (t[2], t[3]) <- (modulus[3] * k)
        "adoxq %%r8, %%r15                         \n\t"  // r[3] += t[0] + flag_c
        "adcxq %%r9, %%rax                        \n\t"   // r[3] += t[2] + flag_c
        "adoxq %%rdi, %%rax                         \n\t" // r[4] += t[1] + flag_c
        "adcxq %%rsi, %%r12                        \n\t"  // r[4] += t[3] + flag_c
        "adoxq %%r10, %%r12                        \n\t"  // r[5] += flag_c

        /**
         * a[2] * b
         **/
        /* load a[2] into rdx */
        "movq 16(%%rbx), %%rdx                     \n\t" // load a[2] into %rdx
        "mulxq 0(%%rcx), %%r8, %%r9                \n\t" // (t[0], t[1]) <- (a[2] * b[0])
        "mulxq 8(%%rcx), %%rdi, %%rsi              \n\t" // (t[0], t[1]) <- (a[2] * b[1])
        "adcxq %%r8, %%r14                         \n\t" // r[1] += t[0]
        "adoxq %%r9, %%r15                         \n\t" // r[2] += t[1] + flag_c
        "adcxq %%rdi, %%r15                        \n\t" // r[2] += t[0]
        "adoxq %%rsi, %%rax                        \n\t" // r[3] += t[1] + flag_o

        "mulxq 16(%%rcx), %%r8, %%r9               \n\t"  // (t[0], t[1]) <- (a[2] * b[2])
        "mulxq 24(%%rcx), %%rdi, %%r13             \n\t"  // (t[2], r[6]) <- (a[2] * b[3])
        "adcxq %%r8, %%rax                         \n\t"  // r[3] += t[0] + flag_c
        "adoxq %%r9, %%r12                        \n\t"   // r[4] += t[2] + flag_o
        "adcxq %%rdi, %%r12                         \n\t" // r[4] += t[1] + flag_c
        "adoxq %%r10, %%r13                        \n\t"  // r[5] += flag_o
        "adcxq %%r10, %%r13                        \n\t"  // r[5] += flag_c

        /**
         * reduce by r[2] * k
         **/
        "movq %%r14, %%rdx                         \n\t"  // move r_inv into %rdx
        "mulxq %[r_inv], %%rdx, %%r8               \n\t"  // (%rdx, _) <- k = r[1] * r_inv
        "mulxq %[modulus_0], %%r8, %%r9            \n\t"  // (t[0], t[1]) <- (modulus[0] * k)
        "mulxq %[modulus_1], %%rdi, %%rsi          \n\t"  // (t[0], t[1]) <- (modulus[1] * k)
        "adoxq %%r8, %%r14                         \n\t"  // r[2] += t[0] (%r13 now free)
        "adcxq %%r9, %%r15                        \n\t"   // r[3] += t[0]
        "adoxq %%rdi, %%r15                         \n\t" // r[3] += t[1] + flag_c
        "adcxq %%rsi, %%rax                        \n\t"  // r[4] += t[1] + flag_o
        "mulxq %[modulus_2], %%r8, %%r9            \n\t"  // (t[0], t[1]) <- (modulus[2] * k)
        "mulxq %[modulus_3], %%rdi, %%rsi          \n\t"  // (t[2], t[3]) <- (modulus[3] * k)
        "adoxq %%r8, %%rax                         \n\t"  // r[4] += t[0] + flag_c
        "adcxq %%r9, %%r12                        \n\t"   // r[5] += t[2] + flag_o
        "adoxq %%rdi, %%r12                         \n\t" // r[5] += t[1] + flag_c
        "adcxq %%rsi, %%r13                        \n\t"  // r[6] += t[3] + flag_o
        "adoxq %%r10, %%r13                        \n\t"  // r[6] += flag_c

        /**
         * a[3] * b
         **/
        "movq 24(%%rbx), %%rdx                     \n\t"  // load a[3] into %rdx
        "mulxq 0(%%rcx), %%r8, %%r9                \n\t"  // (t[0], t[1]) <- (a[3] * b[0])
        "mulxq 8(%%rcx), %%rdi, %%rsi              \n\t"  // (t[4], t[5]) <- (a[3] * b[1])
        "adcxq %%r8, %%r15                         \n\t"  // r[3] += t[0]
        "adoxq %%r9, %%rax                        \n\t"   // r[4] += t[2]
        "adcxq %%rdi, %%rax                         \n\t" // r[4] += t[1] + flag_c
        "adoxq %%rsi, %%r12                        \n\t"  // r[5] += t[3] + flag_o

        "mulxq 16(%%rcx), %%r8, %%r9             \n\t"   // (t[2], t[3]) <- (a[3] * b[2])
        "mulxq 24(%%rcx), %%rdi, %%r14             \n\t" // (t[6], r[7]) <- (a[3] * b[3])
        "adcxq %%r8, %%r12                        \n\t"  // r[5] += t[4] + flag_c
        "adoxq %%r9, %%r13                        \n\t"  // r[6] += t[6] + flag_o
        "adcxq %%rdi, %%r13                        \n\t" // r[6] += t[5] + flag_c
        "adoxq %%r10, %%r14                        \n\t" // r[7] += + flag_o
        "adcxq %%r10, %%r14                        \n\t" // r[7] += flag_c

        /**
         * reduce by r[3] * k
         **/
        "movq %%r15, %%rdx                         \n\t" // move r_inv into %rdx
        "mulxq %[r_inv], %%rdx, %%r8               \n\t" // (%rdx, _) <- k = r[1] * r_inv
        "mulxq %[modulus_0], %%r8, %%r9            \n\t" // (t[0], t[1]) <- (modulus[0] * k)
        "mulxq %[modulus_1], %%rdi, %%r11          \n\t" // (t[2], t[3]) <- (modulus[1] * k)
        "movq %[r_ptr], %%rsi                      \n\t"
        "adoxq %%r8, %%r15                         \n\t"  // r[3] += t[0] (%r15 now free)
        "adcxq %%r9, %%rax                        \n\t"   // r[4] += t[2]
        "adoxq %%rdi, %%rax                         \n\t" // r[4] += t[1] + flag_c
        "adcxq %%r11, %%r12                        \n\t"  // r[5] += t[3] + flag_c

        "mulxq %[modulus_2], %%r8, %%r9            \n\t"  // (t[4], t[5]) <- (modulus[2] * k)
        "mulxq %[modulus_3], %%rdi, %%rdx          \n\t"  // (t[6], t[7]) <- (modulus[3] * k)
        "adoxq %%r8, %%r12                         \n\t"  // r[5] += t[4] + flag_c
        "adcxq %%r9, %%r13                        \n\t"   // r[6] += t[6] + flag_c
        "adoxq %%rdi, %%r13                         \n\t" // r[6] += t[5] + flag_c
        "adcxq %%rdx, %%r14                        \n\t"  // r[7] += t[7] + flag_c
        "adoxq %%r10, %%r14                        \n\t"  // r[7] += flag_c

        /**
         * constrain output to be mod p
         **/
        // Ok, we're almost done! The 'output', r, is in r[4], r[5], r[6], r[7]
        // But, this value can be up to 'p' times larger than p
        // We don't want use a conditional branch to normalize r,
        // because pipeline stalls are bad. When you're throwing around this many
        // 8 byte immediates, pipeline stalls are even worse!

        // So, to constrain r, we clone r and compute r' = r - p
        // If this calculation sets the carry flag, we know that
        // r <= p and can use the carry flag as the predicate for
        // a conditional move instruction, that sets the result to either
        // r, or (r - p)
        /**
             * Registers: rax, r12, r13, r14 = (r[4], r[5], r[6], r[7])
             *            r8, r9, r10, r11   = (p - r)
             *            rdx, r15, rcx, rdi = (modulus)
             * 
             **/
        // clear flags
        "xorq %%r8, %%r8\n\t"
        // copy output
        "movq %%rax, %%r8                          \n\t" // set r'[0]
        "movq %%r12, %%r9                          \n\t" // set r'[1]
        "movq %%r13, %%rdx                         \n\t" // set r'[2]
        "movq %%r14, %%r15                         \n\t" // set r'[3]
        // compute (r - p)
        "adcxq %[not_modulus_0], %%r8              \n\t" // r'[0] -= modulus[0]
        "adcxq %[not_modulus_1], %%r9              \n\t" // r'[1] -= modulus[1]
        "adcxq %[not_modulus_2], %%rdx             \n\t" // r'[2] -= modulus[2]
        "adcxq %[not_modulus_3], %%r15             \n\t" // r'[3] -= modulus[3]

        // if r does not need to be reduced, carry flag is 0
        "cmovncq %%rax, %%r8                       \n\t"
        "movq %%r8, 0(%%rsi)                       \n\t"
        "cmovncq %%r12, %%r9                       \n\t"
        "movq %%r9, 8(%%rsi)                       \n\t"
        "cmovncq %%r13, %%rdx                      \n\t"
        "movq %%rdx, 16(%%rsi)                     \n\t"
        "cmovncq %%r14, %%r15                      \n\t"
        "movq %%r15, 24(%%rsi)                     \n\t"
        // (we done? I think we're done...)
        :
        : "c"(b), "b"(a), [r_ptr] "m"(r), [modulus_0] "m"(modulus[0]), [modulus_1] "m"(modulus[1]), [modulus_2] "m"(modulus[2]), [modulus_3] "m"(modulus[3]), [r_inv] "m"(r_inv), [not_modulus_0] "m"(not_modulus[0]), [not_modulus_1] "m"(not_modulus[1]), [not_modulus_2] "m"(not_modulus[2]), [not_modulus_3] "m"(not_modulus[3])
        : "%rsi", "%rax", "%rdx", "%rdi", "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
}

} // namespace fq

#endif