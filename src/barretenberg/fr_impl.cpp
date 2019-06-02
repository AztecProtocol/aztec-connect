#include <stdint.h>
#include <unistd.h>
#include <stdio.h>

#include "assert.hpp"

#include "fr.hpp"

namespace fr
{
namespace
{
using uint128_t = unsigned __int128;
constexpr uint128_t lo_mask = 0xffffffffffffffffUL;

// 2 4ccef014a773d2cf 7a7bd9d4391eb18d

// 0x30644E72E131A029 B85045B68181585D 2833E84879B97091 43E1F593F0000001
static uint64_t __attribute__((used)) modulus[4] = {
    0x43E1F593F0000001UL,
    0x2833E84879B97091UL,
    0xB85045B68181585DUL,
    0x30644E72E131A029UL};

static uint64_t __attribute__((used)) modulus_plus_one[4] = {
    0x43E1F593F0000002UL,
    0x2833E84879B97091UL,
    0xB85045B68181585DUL,
    0x30644E72E131A029UL};

// N.B. Commented data is F_squared for Fr NOT Fq
// 216D0B17F4E44A5 // 8C49833D53BB8085 // 53FE3AB1E35C59E3 // 1BB8E645AE216DA7
//
static uint64_t r_squared[4] = {
    0x1BB8E645AE216DA7UL,
    0x53FE3AB1E35C59E3UL,
    0x8C49833D53BB8085UL,
    0x216D0B17F4E44A5UL,
};

// lambda = curve root of unity modulo n, converted to montgomery form
static uint64_t lambda[4] = {
    0x93e7cede4a0329b3UL,
    0x7d4fdca77a96c167UL,
    0x8be4ba08b19a750aUL,
    0x1cbd5653a5661c25UL};

// // 0x
// static uint64_t lambda[4] = {
//     0x8b17ea66b99c90dd,
//     0x5bfc41088d8daaa7,
//     0xb3c4d79d41a91758,
//     0
// };

static uint64_t one_raw[4] = {1, 0, 0, 0};

static uint64_t __attribute__((used)) r_inv = 0xc2e1f593efffffffUL;
static uint64_t __attribute__((used)) stubby = 0;

bool gt(uint64_t *a, uint64_t *b)
{
    bool t0 = a[3] > b[3];
    bool t1 = (a[3] == b[3]) && (a[2] > b[2]);
    bool t2 = (a[3] == b[3]) && (a[2] == b[2]) && (a[1] > b[1]);
    bool t3 = (a[3] == b[3]) && (a[2] == b[2]) && (a[1] == b[1]) && (a[0] > b[0]);
    return (t0 || t1 || t2 || t3);
}
} // namespace

void print(uint64_t *a)
{
    printf("fr: [%lx, %lx, %lx, %lx]\n", a[0], a[1], a[2], a[3]);
}
// compute a + b + carry, returning the carry
void addc(uint64_t a, uint64_t b, uint64_t carry_in, uint64_t &r, uint64_t &carry_out)
{
    uint128_t res = (uint128_t)a + (uint128_t)b + (uint128_t)carry_in;
    carry_out = (uint64_t)(res >> 64);
    r = (uint64_t)(res & lo_mask);
}

// compute a - (b + borrow), returning result and updated borrow
void sbb(uint64_t a, uint64_t b, uint64_t borrow_in, uint64_t &r, uint64_t &borrow_out)
{
    uint128_t res = (uint128_t)a - ((uint128_t)b + (uint128_t)(borrow_in >> 63));
    borrow_out = (uint64_t)(res >> 64);
    r = (uint64_t)(res & lo_mask);
}

// perform a + (b * c) + carry, putting result in r and returning new carry
void mac(uint64_t a, uint64_t b, uint64_t c, uint64_t carry_in, uint64_t &r, uint64_t &carry_out)
{
    uint128_t res = (uint128_t)a + ((uint128_t)b * (uint128_t)c) + (uint128_t)carry_in;
    carry_out = (uint64_t)(res >> 64);
    r = (uint64_t)(res & lo_mask);
}

void subtract(uint64_t *a, uint64_t *b, uint64_t *r)
{
    uint64_t borrow = 0;
    uint64_t carry = 0;

    sbb(a[0], b[0], 0, r[0], borrow);
    sbb(a[1], b[1], borrow, r[1], borrow);
    sbb(a[2], b[2], borrow, r[2], borrow);
    sbb(a[3], b[3], borrow, r[3], borrow);

    addc(r[0], modulus[0] & borrow, 0, r[0], carry);
    addc(r[1], modulus[1] & borrow, carry, r[1], carry);
    addc(r[2], modulus[2] & borrow, carry, r[2], carry);
    addc(r[3], modulus[3] & borrow, carry, r[3], carry);
}

void add(uint64_t *a, uint64_t *b, uint64_t *r)
{
    uint64_t carry = 0;
    addc(a[0], b[0], 0, r[0], carry);
    addc(a[1], b[1], carry, r[1], carry);
    addc(a[2], b[2], carry, r[2], carry);
    addc(a[3], b[3], carry, r[3], carry);
    subtract(r, modulus, r);
}

void sub(uint64_t *a, uint64_t *b, uint64_t *r)
{
    subtract(a, b, r);
}

void mul_512(uint64_t *a, uint64_t *b, uint64_t *r)
{
    uint64_t carry = 0;
    mac(0, a[0], b[0], 0, r[0], carry);
    mac(0, a[0], b[1], carry, r[1], carry);
    mac(0, a[0], b[2], carry, r[2], carry);
    mac(0, a[0], b[3], carry, r[3], r[4]);

    mac(r[1], a[1], b[0], 0, r[1], carry);
    mac(r[2], a[1], b[1], carry, r[2], carry);
    mac(r[3], a[1], b[2], carry, r[3], carry);
    mac(r[4], a[1], b[3], carry, r[4], r[5]);

    mac(r[2], a[2], b[0], 0, r[2], carry);
    mac(r[3], a[2], b[1], carry, r[3], carry);
    mac(r[4], a[2], b[2], carry, r[4], carry);
    mac(r[5], a[2], b[3], carry, r[5], r[6]);

    mac(r[3], a[3], b[0], 0, r[3], carry);
    mac(r[4], a[3], b[1], carry, r[4], carry);
    mac(r[5], a[3], b[2], carry, r[5], carry);
    mac(r[6], a[3], b[3], carry, r[6], r[7]);
}

// inline int mul_512_asm(uint64_t* a, uint64_t* b, uint64_t* r)
// {
//     /**
//      * Registers: rax:rdx = multiplication accumulator
//      *            r8-r9  = t[0-1], work registers for multipliation results
//      *            r12     = r[0]
//      *            r13     = r[1]
//      *            r14     = r[2]
//      *            r15     = r[3]
//      *            rax     = b_ptr
//      *            rbx     = a_ptr
//      *            rsi     = r_ptr
//      *            rcx     = b[0]
//      *            rdi     = b[1]
//      *            r11     = b[2]
//      *            r10     = b[3]
//      */
//     __asm__ __volatile__ (
//         /* load b0 - b4 into r10-r13*/
//         "movq 0(%%rax), %%rcx           \n\t"
//         "movq 8(%%rax), %%rdi           \n\t"
//         "movq 16(%%rax), %%r11          \n\t"
//         "movq 24(%%rax), %%r10          \n\t"
//         /* load a0 into rdx */
//         "movq 0(%%rbx), %%rdx           \n\t"
//         /* a[0] * b[0] = (r[0], r[1]) */
//         "mulxq %%rcx, %%r12, %%r13      \n\t"
//         /* a[0] * b[2] = (r[2], r[3]) */
//         "mulxq %%r11, %%r14, %%r15      \n\t"
//         /* a[0] * b[1] = (t[0], t[1]) */
//         "mulxq %%rdi, %%r8, %%r9         \n\t"
//         /* write r[0] */
//         "movq %%r12, 0(%%rsi)           \n\t"
//         /* r[1] += t[0] */
//         "addq %%r8, %%r13               \n\t"
//         /* r[2] += t[1] + flag_c */
//         "adcq %%r9, %%r14               \n\t"
//         /* a[0] * b[3] = (t[2], r[4]) */
//         "mulxq %%r10, %%rax, %%r12       \n\t"
//         /* r[3] += t[2] + flag_c */
//         "adcq %%rax, %%r15              \n\t"
//         /* r[4] = t[3] + flag_c */
//         /* (repurpose r12 for r[4]) */
//         "adcq $0, %%r12              \n\t"

//         /**
//          * a[1] * b
//          **/
//         /* load a[1] into rdx */
//         "movq 8(%%rbx), %%rdx           \n\t"
//         /* a[1] * b[0] = (t[0], t[1]) */
//         "mulxq %%rcx, %%r8, %%r9        \n\t"
//         /* r[1] += t[0] */
//         "addq %%r8, %%r13               \n\t"
//         /* write out r[1] */
//         "movq %%r13, 8(%%rsi)            \n\t"
//         /* r[2] += t[1] + flag_c */
//         "adcq %%r9, %%r14               \n\t"
//         /* a[1] * b[2] = (t[0], t[1]) */
//         "mulxq %%r11, %%r8, %%r9      \n\t"
//         /* r[3] += t[2] + flag_c */
//         "adcq %%r8, %%r15              \n\t"
//         /* r[4] += t[3] + flag_c */
//         "adcq %%r9, %%r12              \n\t"
//         /* a[1] * b[1] = (t[0], t[1]) */
//         "mulxq %%rdi, %%r8, %%r9        \n\t"
//         /* a[1] * b[3] = (t[2], r[5]) */
//         "mulxq %%r10, %%rax, %%r13      \n\t"
//         /* add carry into r[5] */
//         "adcq $0, %%r13                 \n\t"
//         /* r[2] += t[0] */
//         "add %%r8, %%r14                \n\t"
//         /* r[3] += t[1] + c_flag */
//         "adcq %%r9, %%r15               \n\t"
//         /* r[4] += t[2] + c_flag */
//         "adcq %%rax, %%r12              \n\t"
//         /* add carry flag into r[5]... */
//         "adcq $0, %%r13                 \n\t"

//         /**
//          * a[2] * b
//          **/
//         /* load a[2] into rdx */
//         "movq 16(%%rbx), %%rdx           \n\t"
//         /* a[2] * b[0] = (t[0], t[1]) */
//         "mulxq %%rcx, %%r8, %%r9        \n\t"
//         /* r[2] += t[0] */
//         "addq %%r8, %%r14               \n\t"
//         /* write out r[2] */
//         "movq %%r14, 16(%%rsi)            \n\t"
//         /* r[3] += t[1] + flag_c */
//         "adcq %%r9, %%r15               \n\t"
//         /* a[2] * b[2] = (t[0], t[1]) */
//         "mulxq %%r11, %%r8, %%r9      \n\t"
//         /* r[4] += t[0] + flag_c */
//         "adcq %%r8, %%r12              \n\t"
//         /* r[5] += t[1] + flag_c */
//         "adcq %%r9, %%r13              \n\t"
//         /* a[2] * b[1] = (t[0], t[1]) */
//         "mulxq %%rdi, %%r8, %%r9        \n\t"
//         /* a[2] * b[3] = (t[2], r[6]) */
//         "mulxq %%r10, %%rax, %%r14      \n\t"
//         /* add carry into r[6] */
//         "adcq $0, %%r14                 \n\t"
//         /* r[3] += t[0] */
//         "add %%r8, %%r15                \n\t"
//         /* r[4] += t[1] + c_flag */
//         "adcq %%r9, %%r12               \n\t"
//         /* r[5] += t[2] + c_flag */
//         "adcq %%rax, %%r13              \n\t"
//         /* add carry flag into r[6]... */
//         "adcq $0, %%r14                 \n\t"

//         /**
//          * a[3] * b
//          **/
//         /* load a[3] into rdx */
//         "movq 24(%%rbx), %%rdx           \n\t"
//         /* a[3] * b[0] = (t[0], t[1]) */
//         "mulxq %%rcx, %%r8, %%r9        \n\t"
//         /* r[3] += t[0] */
//         "addq %%r8, %%r15               \n\t"
//         /* write out r[3] */
//         "movq %%r15, 24(%%rsi)            \n\t"
//         /* r[4] += t[1] + flag_c */
//         "adcq %%r9, %%r12               \n\t"
//         /* a[3] * b[2] = (t[0], t[1]) */
//         "mulxq %%r11, %%r8, %%r9      \n\t"
//         /* r[5] += t[0] + flag_c */
//         "adcq %%r8, %%r13              \n\t"
//         /* r[6] += t[1] + flag_c */
//         "adcq %%r9, %%r14              \n\t"

//         /* a[3] * b[1] = (t[0], t[1]) */
//         "mulxq %%rdi, %%r8, %%r9        \n\t"
//         /* a[3] * b[3] = (t[2], r[7]) */
//         "mulxq %%r10, %%rax, %%r15      \n\t"
//         /* add carry into r[7] */
//         "adcq $0, %%r15                 \n\t"
//         /* r[4] += t[0] */
//         "addq %%r8, %%r12                \n\t"
//         /* r[5] += t[1] + c_flag */
//         "adcq %%r9, %%r13               \n\t"
//         /* write out r[4] */
//         "movq %%r12, 32(%%rsi)           \n\t"
//         /* write out r[5] */
//         "movq %%r13, 40(%%rsi)              \n\t"
//         /* r[6] += t[2] + c_flag */
//         "adcq %%rax, %%r14              \n\t"
//         /* write out r[6] */
//         "movq %%r14, 48(%%rsi)           \n\t"
//         /* add carry flag into r[7]... */
//         "adcq $0, %%r15                 \n\t"
//         /* write out r[7] */
//         "movq %%r15, 56(%%rsi)              \n\t"
//         : "+a"(b), "+c"(r)
//         : "S"(r), "b"(a)
//         : "%rdx", "%rdi", "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory"
//     );
//     return 1;
// }

// void sqr_512_asm(uint64_t* a, uint64_t* r)
// {
//     __asm__ __volatile__ (
//         "movq 0(%%rbx), %%rdx                   \n\t" // load a[0] into %rdx

//         "mulxq 8(%%rbx), %%r9, %%r10            \n\t" // (r[1], r[2]) <- a[0] * a[1]
//         "mulxq 16(%%rbx), %%r8, %%r15           \n\t" // (t[1], t[2]) <- a[0] * a[2]
//         "mulxq 24(%%rbx), %%r11, %%r12          \n\t" // (r[3], r[4]) <- a[0] * a[3]
//         "movq 8(%%rbx), %%rdx                   \n\t" // load a[1] into %r%dx
//         "mulxq 16(%%rbx), %%rdi, %%rsi          \n\t" // (t[5], t[6]) <- a[1] * a[2]
//         "mulxq 24(%%rbx), %%rax, %%rcx          \n\t" // (t[3], t[4]) <- a[1] * a[3]
//         "movq 24(%%rbx), %%rdx                  \n\t" // load a[3] into %%rdx
//         "mulxq 16(%%rbx), %%r13, %%r14          \n\t" // (r[5], r[6]) <- a[3] * a[2]
//         "adoxq %%r8, %%r10                      \n\t" // r[2] += t[1]
//         "adcxq %%r15, %%r11                     \n\t" // r[3] += t[2]
//         "adoxq %%rdi, %%r11                     \n\t" // r[3] += t[5]
//         "adcxq %%rax, %%r12                     \n\t" // r[4] += t[3]
//         "adoxq %%rsi, %%r12                     \n\t" // r[4] += t[6]
//         "adcxq %%rcx, %%r13                     \n\t" // r[5] += t[4] + flag_o
//         "adoxq %[stubby], %%r13                 \n\t" // r[5] += flag_o
//         "adcq $0, %%r14                         \n\t" // r[6] += flag_c

//         "mulxq %%rdx, %%rdi, %%r15              \n\t" // (t[5], r[7]) <- a[3] * a[3]
//         "movq 0(%%rbx), %%rdx                   \n\t" // load a[0] into %rdx
//         "mulxq %%rdx, %%r8, %%rcx               \n\t" // (r[0], t[4]) <- a[0] * a[0]
//         "movq 8(%%rbx), %%rdx                   \n\t" // load a[1] into %rdx
//         "mulxq %%rdx, %%rax, %%rsi              \n\t" // (t[3], t[6]) <- a[1] * a[1]
//         "movq 16(%%rbx), %%rdx                  \n\t" // load a[2] into %rdx
//         "mulxq %%rdx, %%rdx, %%rbx              \n\t" // (t[7], t[8]) <- a[2] * a[2]

//         "adcxq %%r9, %%r9                       \n\t" // r[1] = 2r[1]
//         "adoxq %%r12, %%r12                     \n\t" // r[4] = 2r[4]
//         "adcxq %%r10, %%r10                     \n\t" // r[2] = 2r[2]
//         "adoxq %%r13, %%r13                     \n\t" // r[5] = 2r[5]
//         "adcxq %%r11, %%r11                     \n\t" // r[3] = 2r[3]
//         "adoxq %%r14, %%r14                     \n\t" // r[6] = 2r[6]
//         // "adoxq %[stubby], %%r15              \n\t"
//         "adcq $0, %%r12                         \n\t" // r[4] += flag_c

//         "adoxq %%rcx, %%r9                      \n\t" // r[1] += t[4]
//         "adcxq %%rdx, %%r12                     \n\t" // r[4] += t[7]
//         "adoxq %%rax, %%r10                     \n\t" // r[2] += t[3]
//         "adcxq %%rbx, %%r13                     \n\t" // r[5] += t[8]
//         "adoxq %%rsi, %%r11                     \n\t" // r[3] += t[6]
//         "adcxq %%rdi, %%r14                     \n\t" // r[6] += t[5]
//         "adoxq %[stubby], %%r12                 \n\t" // r[4] += flag_o
//         "adcq $0, %%r15                         \n\t" // r[7] += flag_c

//         "movq %[r_ptr], %%rsi                   \n\t"
//         "movq %%r8, 0(%%rsi)                    \n\t"
//         "movq %%r9, 8(%%rsi)                    \n\t"
//         "movq %%r10, 16(%%rsi)                  \n\t"
//         "movq %%r11, 24(%%rsi)                  \n\t"
//         "movq %%r12, 32(%%rsi)                  \n\t"
//         "movq %%r13, 40(%%rsi)                  \n\t"
//         "movq %%r14, 48(%%rsi)                  \n\t"
//         "movq %%r15, 56(%%rsi)                  \n\t"
//         : "+b"(a)
//         : [stubby] "m"(stubby), [r_ptr] "m"(r)
//         : "%rax", "rcx", "%rdx", "%rdi", "%rsi", "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory"
//     );
// }

void montgomery_reduce(uint64_t *r, uint64_t *out)
{
    uint64_t carry = 0;
    uint64_t carry_2 = 0;
    uint64_t stub = 0;
    uint64_t k = r[0] * r_inv;
    mac(r[0], k, modulus[0], 0, stub, carry);
    mac(r[1], k, modulus[1], carry, r[1], carry);
    mac(r[2], k, modulus[2], carry, r[2], carry);
    mac(r[3], k, modulus[3], carry, r[3], carry);
    addc(r[4], 0, carry, r[4], carry_2);

    k = r[1] * r_inv;
    mac(r[1], k, modulus[0], 0, stub, carry);
    mac(r[2], k, modulus[1], carry, r[2], carry);
    mac(r[3], k, modulus[2], carry, r[3], carry);
    mac(r[4], k, modulus[3], carry, r[4], carry);
    addc(r[5], carry_2, carry, r[5], carry_2);

    k = r[2] * r_inv;
    mac(r[2], k, modulus[0], 0, stub, carry);
    mac(r[3], k, modulus[1], carry, r[3], carry);
    mac(r[4], k, modulus[2], carry, r[4], carry);
    mac(r[5], k, modulus[3], carry, r[5], carry);
    addc(r[6], carry_2, carry, r[6], carry_2);

    k = r[3] * r_inv;
    mac(r[3], k, modulus[0], 0, stub, carry);
    mac(r[4], k, modulus[1], carry, r[4], carry);
    mac(r[5], k, modulus[2], carry, r[5], carry);
    mac(r[6], k, modulus[3], carry, r[6], carry);
    addc(r[7], carry_2, carry, r[7], carry_2);

    out[0] = r[4];
    out[1] = r[5];
    out[2] = r[6];
    out[3] = r[7];
    subtract(&r[4], (uint64_t *)&modulus[0], out);
}

void mul(uint64_t *lhs, uint64_t *rhs, uint64_t *r)
{
    uint64_t temp[8];
    mul_512(lhs, rhs, &temp[0]);
    montgomery_reduce(&temp[0], r);
}

void sqr(uint64_t *a, uint64_t *r)
{
    uint64_t temp[8];
    mul_512(a, a, &temp[0]);
    montgomery_reduce(&temp[0], r);
}

void normalize(uint64_t *a, uint64_t *r)
{
    r[0] = a[0];
    r[1] = a[1];
    r[2] = a[2];
    r[3] = a[3];
    while (gt(r, modulus_plus_one))
    {
        sub(r, modulus, r);
    }
}

void to_montgomery_form(uint64_t *a, uint64_t *r)
{
    normalize(a, r);
    mul(a, &r_squared[0], r);
}

void from_montgomery_form(uint64_t *a, uint64_t *r)
{
    mul(a, one_raw, r);
}

void random_element(uint64_t *r)
{
    int got_entropy = getentropy((void *)r, 32);
    ASSERT(got_entropy == 0);
    to_montgomery_form(r, r);
}

void one(uint64_t *r)
{
    to_montgomery_form(one_raw, r);
}
/**
 * For short Weierstrass curves y^2 = x^3 + b mod r, if there exists a cube root of unity mod r,
 * we can take advantage of an enodmorphism to decompose a 254 bit scalar into 2 128 bit scalars.
 * \beta = cube root of 1, mod q (q = order of fq)
 * \lambda = cube root of 1, mod r (r = order of fr)
 * 
 * For a point P1 = (X, Y), where Y^2 = X^3 + b, we know that
 * the point P2 = (X * \beta, Y) is also a point on the curve
 * We can represent P2 as a scalar multiplication of P1, where P2 = \lambda * P1
 * 
 * For a generic multiplication of P1 by a 254 bit scalar k, we can decompose k
 * into 2 127 bit scalars (k1, k2), such that k = k1 - (k2 * \lambda) 
 * 
 * We can now represent (k * P1) as (k1 * P1) - (k2 * P2), where P2 = (X * \beta, Y).
 * As k1, k2 have half the bit length of k, we have reduced the number of loop iterations of our
 * scalar multiplication algorithm in half
 * 
 * To find k1, k2, We use the extended euclidean algorithm to find 4 short scalars [a1, a2], [b1, b2] such that
 * modulus = (a1 * b2) - (b1 * a2)
 * We then compube scalars c1 = round(b2 * k / r), c2 = round(b1 * k / r), where
 * k1 = (c1 * a1) + (c2 * a2), k2 = -((c1 * b1) + (c2 * b2))
 * We pre-compute scalars g1 = (2^256 * b1) / n, g2 = (2^256 * b2) / n, to avoid having to perform long division
 * on 512-bit scalars
 **/

void split_into_endomorphism_scalars(uint64_t *k, uint64_t *k1, uint64_t *k2)
{
    // uint64_t lambda_reduction[4] = { 0 };
    // to_montgomery_form(lambda, lambda_reduction);

    static uint64_t g1[4] = {
        0x7a7bd9d4391eb18dUL,
        0x4ccef014a773d2cfUL,
        0x0000000000000002UL,
        0};
    static uint64_t g2[4] = {
        0xd91d232ec7e0b3d7UL,
        0x0000000000000002UL,
        0,
        0};

    // 6f4d8248eeb859fc 8211bbeb7d4f1128
    static uint64_t minus_b1[4] = {
        0x8211bbeb7d4f1128UL,
        0x6f4d8248eeb859fcUL,
        0,
        0};

    // 89d3256894d213e3
    static uint64_t b2[4] = {
        0x89d3256894d213e3UL,
        0,
        0,
        0};

    uint64_t c1[8];
    uint64_t c2[8];

    // compute c1 = (g2 * k) >> 256
    mul_512(g2, k, c1);
    // compute c2 = (g1 * k) >> 256
    mul_512(g1, k, c2);
    // (the bit shifts are implicit, as we only utilize the high limbs of c1, c2

    uint64_t q1[8];
    uint64_t q2[8];
    // compute q1 = c1 * -b1
    mul_512(&c1[4], minus_b1, q1);
    // compute q2 = c2 * b2
    mul_512(&c2[4], b2, q2);

    uint64_t t1[4];
    uint64_t t2[4];

    sub(q2, q1, t1);

    // to_montgomery_form(t1, t1);
    mul(t1, lambda, t2);
    // from_montgomery_form(t2, t2);
    add(k, t2, t2);

    k2[0] = t1[0];
    k2[1] = t1[1];
    k1[0] = t2[0];
    k1[1] = t2[1];
}

void mul_lambda(uint64_t *a, uint64_t *r)
{
    mul(a, lambda, r);
}
} // namespace fr

// 30644E72E131A029UL
//  f51e3ccb9d98f53

// F0AE 1C33 4626 70AC