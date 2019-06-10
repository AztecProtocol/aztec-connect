#pragma once

// #define STR_HELPER(x) x
// #define STR(x) STR_HELPER(x)
#define STRF(x) x

#define ADD(a, r) \
        "xorq %%r12, %%r12                        \n\t"                                     \
        "movq 0(" a "), %%r12                   \n\t"                                     \
        "movq 8(" a "), %%r13                   \n\t"                                     \
        "movq 16(" a "), %%r14                 \n\t"                                     \
        "movq 24(" a "), %%r15                 \n\t"                                     \
        "adcxq 0(" r "), %%r12                 \n\t"                                     \
        "adcxq 8(" r "), %%r13                 \n\t"                                     \
        "adcxq 16(" r "), %%r14               \n\t"                                     \
        "adcxq 24(" r "), %%r15               \n\t"                                   

/**
 * Take a 4-limb integer, r, in (%r12, %r13, %r14, %r15)
 * and conditionally subtract modulus, if r > p.
 **/ 
#define REDUCE_RESULT(r) \
        /* Duplicate `r` */                                                               \
        "movq %%r12, %%r8                       \n\t"                                     \
        "movq %%r13, %%r9                       \n\t"                                     \
        "movq %%r14, %%r10                      \n\t"                                     \
        "movq %%r15, %%r11                      \n\t"                                     \
        /* Add the negative representation of 'modulus' into `r`. We do this instead */   \
        /* of subtracting, because we can use `adoxq`.                               */   \
        /* This opcode only has a dependence on the overflow                         */   \
        /* flag (sub/sbb changes both carry and overflow flags).                     */   \
        /* We can process an `adcxq` and `acoxq` opcode simultaneously.              */   \
        "adoxq %[not_modulus_0], %%r12          \n\t" /* r'[0] -= modulus.data[0]    */   \
        "adoxq %[not_modulus_1], %%r13          \n\t" /* r'[1] -= modulus.data[1]    */   \
        "adoxq %[not_modulus_2], %%r14          \n\t" /* r'[2] -= modulus.data[2]    */   \
        "adoxq %[not_modulus_3], %%r15          \n\t" /* r'[3] -= modulus.data[3]    */   \
                                                                                          \
        /* if r does not need to be reduced, overflow flag is 1 */                        \
        /* set r' = r if this flag is set                       */                        \
        "cmovnoq %%r8, %%r12                    \n\t"                                     \
        "movq %%r12, 0(" r ")                 \n\t"                                       \
        "cmovnoq %%r9, %%r13                    \n\t"                                     \
        "movq %%r13, 8(" r ")                 \n\t"                                       \
        "cmovnoq %%r10, %%r14                   \n\t"                                     \
        "movq %%r14, 16(" r ")                \n\t"                                       \
        "cmovnoq %%r11, %%r15                   \n\t"                                     \
        "movq %%r15, 24(" r ")                \n\t"                                     

#define SUB(a, b, r) \
        /* clear flags */                                                                 \
        "xorq %%r8, %%r8                        \n\t"                                     \
        "movq 0(" a "), %%r8                   \n\t"                                      \
        "movq 8(" a "), %%r9                   \n\t"                                      \
        "movq 16(" a "), %%r10                 \n\t"                                      \
        "movq 24(" a "), %%r11                 \n\t"                                      \
                                                                                          \
        "subq 0(" b "), %%r8                  \n\t"                                       \
        "sbbq 8(" b "), %%r9                  \n\t"                                       \
        "sbbq 16(" b "), %%r10                \n\t"                                       \
        "sbbq 24(" b "), %%r11                \n\t"                                       \
                                                                                          \
        "movq %%r8, %%r12                       \n\t"                                     \
        "movq %%r9, %%r13                       \n\t"                                     \
        "movq %%r10, %%r14                      \n\t"                                     \
        "movq %%r11, %%r15                      \n\t"                                     \
                                                                                          \
        "adoxq %[modulus_0], %%r8               \n\t" /* r'[0] -= modulus.data[0]  */     \
        "adoxq %[modulus_1], %%r9               \n\t" /* r'[1] -= modulus.data[1]  */     \
        "adoxq %[modulus_2], %%r10              \n\t" /* r'[2] -= modulus.data[2]  */     \
        "adoxq %[modulus_3], %%r11              \n\t" /* r'[3] -= modulus.data[3]  */     \
                                                                                          \
        /* if the carry flag is set, then b > a and we need to                     */     \
        /* add a modulus back into the result                                      */     \
        /* i.e. if the carry is *not* set, then r8-r11 represents                  */     \
        /* the correct result of subtraction, otherwise, swap with r8-r11          */     \
        "cmovncq %%r12, %%r8                    \n\t"                                     \
        "movq %%r8, 0(" r ")                    \n\t"                                     \
        "cmovncq %%r13, %%r9                    \n\t"                                     \
        "movq %%r9, 8(" r ")                    \n\t"                                     \
        "cmovncq %%r14, %%r10                   \n\t"                                     \
        "movq %%r10, 16(" r ")                  \n\t"                                     \
        "cmovncq %%r15, %%r11                   \n\t"                                     \
        "movq %%r11, 24(" r ")                  \n\t"


/**
 * Compute Montgomery multiplication a*a. Store result in (%%r12, %%r13, %%r14, %%r15)
 * We proceed by computing limb multiplications that aren't squares (e.g. a[0]*a[1]), and add into 8-limb result %r8-%r15.
 * We then double the result, and add the squares a[0]^2, a[1]^2, a[2]^2, a[3]^2
 **/
#define SQR(a) \
        "movq 0(" a "), %%rdx                   \n\t" /* load a[0] into %rdx */          \
                                                                                         \
        "xorq %%r8, %%r8                        \n\t" /* clear flags                 */  \
        /* compute a[0] *a[1], a[0]*a[2], a[0]*a[3], a[1]*a[2], a[1]*a[3], a[2]*a[3] */  \
        "mulxq 8(" a "), %%r9, %%r10            \n\t" /* (r[1], r[2]) <- a[0] * a[1] */  \
        "mulxq 16(" a "), %%r8, %%r15           \n\t" /* (t[1], t[2]) <- a[0] * a[2] */  \
        "mulxq 24(" a "), %%r11, %%r12          \n\t" /* (r[3], r[4]) <- a[0] * a[3] */  \
        "movq 8(" a "), %%rdx                   \n\t" /* load a[1] into %r%dx        */  \
        "mulxq 16(" a "), %%rdi, %%rsi          \n\t" /* (t[5], t[6]) <- a[1] * a[2] */  \
        "mulxq 24(" a "), %%rax, %%rcx          \n\t" /* (t[3], t[4]) <- a[1] * a[3] */  \
        "movq 24(" a "), %%rdx                  \n\t" /* load a[3] into %%rdx        */  \
        "mulxq 16(" a "), %%r13, %%r14          \n\t" /* (r[5], r[6]) <- a[3] * a[2] */  \
                                                                                         \
        /* accumulate products into result registers */                                  \
        "adoxq %%r8, %%r10                      \n\t" /* r[2] += t[1]                */  \
        "adcxq %%r15, %%r11                     \n\t" /* r[3] += t[2]                */  \
        "adoxq %%rdi, %%r11                     \n\t" /* r[3] += t[5]                */  \
        "adcxq %%rax, %%r12                     \n\t" /* r[4] += t[3]                */  \
        "adoxq %%rsi, %%r12                     \n\t" /* r[4] += t[6]                */  \
        "adcxq %%rcx, %%r13                     \n\t" /* r[5] += t[4] + flag_o       */  \
        "adoxq %[zero_reference], %%r13         \n\t" /* r[5] += flag_o              */  \
        "adcxq %[zero_reference], %%r14         \n\t" /* r[6] += flag_c              */  \
                                                                                         \
        /* double result registers  */                                                   \
        "adoxq %%r9, %%r9                       \n\t" /* r[1] = 2r[1]                */  \
        "adcxq %%r12, %%r12                     \n\t" /* r[4] = 2r[4]                */  \
        "adoxq %%r10, %%r10                     \n\t" /* r[2] = 2r[2]                */  \
        "adcxq %%r13, %%r13                     \n\t" /* r[5] = 2r[5]                */  \
        "adoxq %%r11, %%r11                     \n\t" /* r[3] = 2r[3]                */  \
        "adcxq %%r14, %%r14                     \n\t" /* r[6] = 2r[6]                */  \
        "adoxq %[zero_reference], %%r12         \n\t" /* r[4] += flag_o              */  \
                                                                                         \
        /* compute a[3]*a[3], a[2]*a[2], a[1]*a[1], a[0]*a[0] */                         \
        "mulxq %%rdx, %%rdi, %%r15              \n\t" /* (t[5], r[7]) <- a[3] * a[3] */  \
        "movq 0(" a "), %%rdx                   \n\t" /* load a[0] into %rdx         */  \
        "mulxq %%rdx, %%r8, %%rcx               \n\t" /* (r[0], t[4]) <- a[0] * a[0] */  \
        "movq 16(" a "), %%rdx                  \n\t" /* load a[2] into %rdx         */  \
        "mulxq %%rdx, %%rdx, %%rax              \n\t" /* (t[7], t[8]) <- a[2] * a[2] */  \
        /* add squares into result registers */                                          \
        "adcxq %%rcx, %%r9                      \n\t" /* r[1] += t[4]                */  \
        "adoxq %%rdx, %%r12                     \n\t" /* r[4] += t[7]                */  \
        "adoxq %%rax, %%r13                     \n\t" /* r[5] += t[8]                */  \
                                                                                         \
        "movq 8(" a "), %%rdx                   \n\t" /* load a[1] into %rdx         */  \
        "mulxq %%rdx, %%rax, %%rsi              \n\t" /* (t[3], t[6]) <- a[1] * a[1] */  \
                                                                                         \
        "adcxq %%rax, %%r10                     \n\t" /* r[2] += t[3]                */  \
        "adcxq %%rsi, %%r11                     \n\t" /* r[3] += t[6]                */  \
        "adoxq %%rdi, %%r14                     \n\t" /* r[6] += t[5]                */  \
        "adcxq %[zero_reference], %%r12         \n\t" /* r[4] += flag_c              */  \
        "adoxq %[zero_reference], %%r15         \n\t" /* r[7] += flag_o              */  \
                                                                                         \
        /* perform modular reduction: r[0] */                                            \
        "movq %%r8, %%rdx                       \n\t" /* move r8 into %rdx           */  \
        "mulxq %[r_inv], %%rdx, %%rax           \n\t" /* (%rdx, _) <- k = r[9] * r_inv */ \
        "mulxq %[modulus_0], %%rdi, %%rsi       \n\t" /* (t[0], t[1]) <- (modulus[0] * k) */ \
        "mulxq %[modulus_1], %%rax, %%rcx       \n\t" /* (t[2], t[3]) <- (modulus[1] * k) */ \
        "adcxq %%rdi, %%r8                      \n\t" /* r[0] += t[0] (%r8 now free) */  \
        "adoxq %%rax, %%r9                      \n\t" /* r[1] += t[2]                */  \
        "adcxq %%rsi, %%r9                      \n\t" /* r[1] += t[1] + flag_c       */  \
        "adoxq %%rcx, %%r10                     \n\t" /* r[2] += t[3] + flag_o       */  \
        "mulxq %[modulus_2], %%rdi, %%rsi       \n\t" /* (t[0], t[1]) <- (modulus[3] * k) */ \
        "mulxq %[modulus_3], %%rax, %%rcx       \n\t" /* (t[2], t[3]) <- (modulus[2] * k) */ \
        "adcxq %%rdi, %%r10                     \n\t" /* r[2] += t[0] + flag_c       */  \
        "adoxq %%rax, %%r11                     \n\t" /* r[3] += t[2] + flag_o       */  \
        "adcxq %%rsi, %%r11                     \n\t" /* r[3] += t[1] + flag_c       */  \
        "adoxq %%rcx, %%r12                     \n\t" /* r[4] += t[3] + flag_o       */  \
        "adcxq %[zero_reference], %%r12         \n\t" /* r[4] += flag_c              */  \
        "adoxq %[zero_reference], %%r13         \n\t" /* r[5] += flag_o              */  \
                                                                                         \
        /* perform modular reduction: r[1] */                                            \
        "movq %%r9, %%rdx                       \n\t" /* move r9 into %rdx           */  \
        "mulxq %[r_inv], %%rdx, %%rax           \n\t" /* (%rdx, _) <- k = r[9] * r_inv */ \
        "mulxq %[modulus_0], %%rdi, %%rsi       \n\t" /* (t[0], t[1]) <- (modulus[0] * k) */ \
        "mulxq %[modulus_1], %%rax, %%rcx       \n\t" /* (t[2], t[3]) <- (modulus[1] * k) */ \
        "adoxq %%rdi, %%r9                      \n\t" /* r[1] += t[0] (%r8 now free) */  \
        "adcxq %%rax, %%r10                     \n\t" /* r[2] += t[2]                */  \
        "adoxq %%rsi, %%r10                     \n\t" /* r[2] += t[1] + flag_c       */  \
        "adcxq %%rcx, %%r11                     \n\t" /* r[3] += t[3] + flag_o       */  \
        "mulxq %[modulus_2], %%rdi, %%rsi       \n\t" /* (t[0], t[1]) <- (modulus[3] * k) */ \
        "mulxq %[modulus_3], %%rax, %%rcx       \n\t" /* (t[2], t[3]) <- (modulus[2] * k) */ \
        "adoxq %%rdi, %%r11                     \n\t" /* r[3] += t[0] + flag_c       */  \
        "adcxq %%rax, %%r12                     \n\t" /* r[4] += t[2] + flag_o       */  \
        "adoxq %%rsi, %%r12                     \n\t" /* r[4] += t[1] + flag_c       */  \
        "adcxq %%rcx, %%r13                     \n\t" /* r[5] += t[3] + flag_o       */  \
        "adoxq %[zero_reference], %%r13         \n\t" /* r[5] += flag_c              */  \
        "adcxq %[zero_reference], %%r14         \n\t" /* r[6] += flag_o              */  \
                                                                                         \
        /* perform modular reduction: r[2] */                                            \
        "movq %%r10, %%rdx                      \n\t" /* move r10 into %rdx          */  \
        "mulxq %[r_inv], %%rdx, %%rax           \n\t" /* (%rdx, _) <- k = r[10] * r_inv */ \
        "mulxq %[modulus_0], %%rdi, %%rsi       \n\t" /* (t[0], t[1]) <- (modulus[0] * k) */ \
        "mulxq %[modulus_1], %%rax, %%rcx       \n\t" /* (t[2], t[3]) <- (modulus[1] * k) */ \
        "adoxq %%rdi, %%r10                     \n\t" /* r[2] += t[0] (%r8 now free) */  \
        "adcxq %%rax, %%r11                     \n\t" /* r[3] += t[2]                */  \
        "adoxq %%rsi, %%r11                     \n\t" /* r[3] += t[1] + flag_c       */  \
        "adcxq %%rcx, %%r12                     \n\t" /* r[4] += t[3] + flag_o       */  \
        "mulxq %[modulus_2], %%rdi, %%rsi       \n\t" /* (t[0], t[1]) <- (modulus[3] * k) */ \
        "mulxq %[modulus_3], %%rax, %%rcx       \n\t" /* (t[2], t[3]) <- (modulus[2] * k) */ \
        "adoxq %%rdi, %%r12                     \n\t" /* r[4] += t[0] + flag_o       */  \
        "adcxq %%rax, %%r13                     \n\t" /* r[5] += t[2] + flag_c       */  \
        "adoxq %%rsi, %%r13                     \n\t" /* r[5] += t[1] + flag_o       */  \
        "adcxq %%rcx, %%r14                     \n\t" /* r[6] += t[3] + flag_c       */  \
        "adoxq %[zero_reference], %%r14         \n\t" /* r[6] += flag_o              */  \
        "adcxq %[zero_reference], %%r15         \n\t" /* r[7] += flag_c              */  \
                                                                                         \
        /* perform modular reduction: r[3] */                                            \
        "movq %%r11, %%rdx                      \n\t" /* move r11 into %rdx          */  \
        "mulxq %[r_inv], %%rdx, %%rax           \n\t" /* (%rdx, _) <- k = r[10] * r_inv */  \
        "mulxq %[modulus_0], %%rdi, %%rsi       \n\t" /* (t[0], t[1]) <- (modulus[0] * k) */ \
        "mulxq %[modulus_1], %%rax, %%rcx       \n\t" /* (t[2], t[3]) <- (modulus[1] * k) */ \
        "mulxq %[modulus_2], %%r8, %%r9         \n\t" /* (t[0], t[1]) <- (modulus[3] * k) */ \
        "mulxq %[modulus_3], %%r10, %%rdx       \n\t" /* (t[2], t[3]) <- (modulus[2] * k) */ \
        "adoxq %%rdi, %%r11                     \n\t" /* r[3] += t[0] (%r8 now free) */  \
        "adcxq %%rax, %%r12                     \n\t" /* r[4] += t[2]                */  \
        "adoxq %%rsi, %%r12                     \n\t" /* r[4] += t[1] + flag_o       */  \
        "adcxq %%rcx, %%r13                     \n\t" /* r[5] += t[3] + flag_c       */  \
        "adoxq %%r8, %%r13                      \n\t" /* r[5] += t[0] + flag_o       */  \
        "adcxq %%r10, %%r14                     \n\t" /* r[6] += t[2] + flag_c       */  \
        "adoxq %%r9, %%r14                      \n\t" /* r[6] += t[1] + flag_o       */  \
        "adcxq %%rdx, %%r15                     \n\t" /* r[7] += t[3] + flag_c       */  \
        "adoxq %[zero_reference], %%r15         \n\t" /* r[7] += flag_o              */


/**
 * Compute Montgomery multiplication of a, b.
 * Result is stored, in (%%r12, %%r13, %%r14, %%r15), in preparation for being stored in "r"
 **/
#define MUL(a, b, r) \
        "movq 0(" a "), %%rdx                       \n\t" /* load a[0] into %rdx                             */         \
                                                                                                                        \
        /* front-load mul ops, can parallelize 4 of these but latency is 4 cycles */                                    \
        "mulxq 8(" b "), %%r8, %%r9                 \n\t" /* (t[0], t[1]) <- a[0] * b[1]                     */         \
        "mulxq 24(" b "), %%rdi, %%r12              \n\t" /* (t[2], r[4]) <- a[0] * b[3] (overwrite a[0])    */         \
        "mulxq 0(" b "), %%r13, %%r14               \n\t" /* (r[0], r[1]) <- a[0] * b[0]                     */         \
        "mulxq 16(" b "), %%r15, %%rax              \n\t" /* (r[2] , r[3]) <- a[0] * b[2]                    */         \
        /* zero flags */                                                                                                \
        "xorq %%r10, %%r10                          \n\t" /* clear r10 register, we use this when we need 0  */         \
                                                                                                                        \
        /* start computing modular reduction */                                                                         \
        "movq %%r13, %%rdx                          \n\t" /* move r[0] into %rdx                             */         \
        "mulxq %[r_inv], %%rdx, %%rsi               \n\t" /* (%rdx, _) <- k = r[1] * r_inv                   */         \
                                                                                                                        \
        /* start first addition chain */                                                                                \
        "adcxq %%r8, %%r14                          \n\t" /* r[1] += t[0]                                    */         \
        "adoxq %%rdi, %%rax                         \n\t" /* r[3] += t[2] + flag_o                           */         \
        "adcxq %%r9, %%r15                          \n\t" /* r[2] += t[1] + flag_c                           */         \
        "adoxq %%r10, %%r12                         \n\t" /* r[4] += flag_c                                  */         \
        "adcxq %%r10, %%rax                         \n\t" /* r[3] += flag_o                                  */         \
                                                                                                                        \
        /* reduce by r[0] * k */                                                                                        \
        "mulxq %[modulus_0], %%r8, %%r9             \n\t" /* (t[0], t[1]) <- (modulus.data[0] * k)           */         \
        "mulxq %[modulus_1], %%rdi, %%rsi           \n\t" /* (t[0], t[1]) <- (modulus.data[1] * k)           */         \
        "adoxq %%r8, %%r13                          \n\t" /* r[0] += t[0] (%r13 now free)                    */         \
        "adcxq %%rdi, %%r14                         \n\t" /* r[1] += t[0]                                    */         \
        "adoxq %%r9, %%r14                          \n\t" /* r[1] += t[1] + flag_o                           */         \
        "adcxq %%rsi, %%r15                         \n\t" /* r[2] += t[1] + flag_c                           */         \
        "mulxq %[modulus_2], %%r8, %%r9             \n\t" /* (t[0], t[1]) <- (modulus.data[2] * k)           */         \
        "mulxq %[modulus_3], %%rdi, %%rsi           \n\t" /* (t[2], t[3]) <- (modulus.data[3] * k)           */         \
        "adoxq %%r8, %%r15                          \n\t" /* r[2] += t[0] + flag_o                           */         \
        "adcxq %%rdi, %%rax                         \n\t" /* r[3] += t[2] + flag_c                           */         \
        "adoxq %%r9, %%rax                          \n\t" /* r[3] += t[1] + flag_o                           */         \
        "adcxq %%rsi, %%r12                         \n\t" /* r[4] += t[3] + flag_c                           */         \
        "adoxq %%r10, %%r12                         \n\t" /* r[4] += flag_i                                  */         \
                                                                                                                        \
        /* modulus = 254 bits, so max(t[3])  = 62 bits                                                       */         \
        /* b also 254 bits, so (a[0] * b[3]) = 62 bits                                                       */         \
        /* i.e. carry flag here is always 0 if b is in mont form, no need to update r[5]                     */         \
        /* (which is very convenient because we're out of registers!)                                        */         \
        /* N.B. the value of r[4] now has a max of 63 bits and can accept another 62 bit value before overflowing */    \
                                                                                                                        \
        /* a[1] * b */                                                                                                  \
        "movq 8(" a "), %%rdx                      \n\t" /* load a[1] into %rdx                              */         \
        "mulxq 0(" b "), %%r8, %%r9                \n\t" /* (t[0], t[1]) <- (a[1] * b[0])                    */         \
        "mulxq 8(" b "), %%rdi, %%rsi              \n\t" /* (t[4], t[5]) <- (a[1] * b[1])                    */         \
        "adcxq %%r8, %%r14                         \n\t" /* r[1] += t[0] + flag_c                            */         \
        "adoxq %%r9, %%r15                         \n\t" /* r[2] += t[1] + flag_o                            */         \
        "adcxq %%rdi, %%r15                        \n\t" /* r[2] += t[0] + flag_c                            */         \
        "adoxq %%rsi, %%rax                        \n\t" /* r[3] += t[1] + flag_o                            */         \
                                                                                                                        \
        "mulxq 16(" b "), %%r8, %%r9               \n\t" /* (t[2], t[3]) <- (a[1] * b[2])                    */         \
        "mulxq 24(" b "), %%rdi, %%r13             \n\t" /* (t[6], r[5]) <- (a[1] * b[3])                    */         \
        "adcxq %%r8, %%rax                         \n\t" /* r[3] += t[0] + flag_c                            */         \
        "adoxq %%rdi, %%r12                        \n\t" /* r[4] += t[2] + flag_o                            */         \
        "adcxq %%r9, %%r12                         \n\t" /* r[4] += t[1] + flag_c                            */         \
        "adoxq %%r10, %%r13                        \n\t" /* r[5] += flag_o                                   */         \
        "adcxq %%r10, %%r13                        \n\t" /* r[5] += flag_c                                   */         \
                                                                                                                        \
        /* reduce by r[1] * k */                                                                                        \
        "movq %%r14, %%rdx                         \n\t"  /* move r[1] into %rdx                             */         \
        "mulxq %[r_inv], %%rdx, %%r8               \n\t"  /* (%rdx, _) <- k = r[1] * r_inv                   */         \
        "mulxq %[modulus_0], %%r8, %%r9            \n\t"  /* (t[0], t[1]) <- (modulus.data[0] * k)           */         \
        "mulxq %[modulus_1], %%rdi, %%rsi          \n\t"  /* (t[0], t[1]) <- (modulus.data[1] * k)           */         \
        "adoxq %%r8, %%r14                         \n\t"  /* r[1] += t[0] (%r14 now free)                    */         \
        "adcxq %%rdi, %%r15                        \n\t"  /* r[2] += t[0] + flag_c                           */         \
        "adoxq %%r9, %%r15                         \n\t"  /* r[2] += t[1] + flag_o                           */         \
        "adcxq %%rsi, %%rax                        \n\t"  /* r[3] += t[1] + flag_c                           */         \
        "mulxq %[modulus_2], %%r8, %%r9            \n\t"  /* (t[0], t[1]) <- (modulus.data[2] * k)           */         \
        "mulxq %[modulus_3], %%rdi, %%rsi          \n\t"  /* (t[2], t[3]) <- (modulus.data[3] * k)           */         \
        "adoxq %%r8, %%rax                         \n\t"  /* r[3] += t[0] + flag_o                           */         \
        "adcxq %%r9, %%r12                         \n\t"  /* r[4] += t[2] + flag_c                           */         \
        "adoxq %%rdi, %%r12                        \n\t"  /* r[4] += t[1] + flag_o                           */         \
        "adcxq %%rsi, %%r13                        \n\t"  /* r[5] += t[3] + flag_c                           */         \
        "adoxq %%r10, %%r13                        \n\t"  /* r[5] += flag_o                                  */         \
                                                                                                                        \
        /* a[2] * b */                                                                                                  \
        "movq 16(" a "), %%rdx                     \n\t" /* load a[2] into %rdx                              */         \
        "mulxq 0(" b "), %%r8, %%r9                \n\t" /* (t[0], t[1]) <- (a[2] * b[0])                    */         \
        "mulxq 8(" b "), %%rdi, %%rsi              \n\t" /* (t[0], t[1]) <- (a[2] * b[1])                    */         \
        "adcxq %%r8, %%r15                         \n\t" /* r[2] += t[0] + flag_c                            */         \
        "adoxq %%r9, %%rax                         \n\t" /* r[3] += t[1] + flag_o                            */         \
        "adcxq %%rdi, %%rax                        \n\t" /* r[3] += t[0] + flag_c                            */         \
        "adoxq %%rsi, %%r12                        \n\t" /* r[4] += t[1] + flag_o                            */         \
        "mulxq 16(" b "), %%r8, %%r9               \n\t" /* (t[0], t[1]) <- (a[2] * b[2])                    */         \
        "mulxq 24(" b "), %%rdi, %%r14             \n\t" /* (t[2], r[6]) <- (a[2] * b[3])                    */         \
        "adcxq %%r8, %%r12                         \n\t" /* r[4] += t[0] + flag_c                            */         \
        "adoxq %%r9, %%r13                         \n\t" /* r[5] += t[2] + flag_o                            */         \
        "adcxq %%rdi, %%r13                        \n\t" /* r[5] += t[1] + flag_c                            */         \
        "adoxq %%r10, %%r14                        \n\t" /* r[6] += flag_o                                   */         \
        "adcxq %%r10, %%r14                        \n\t" /* r[6] += flag_c                                   */         \
                                                                                                                        \
        /* reduce by r[2] * k */                                                                                        \
        "movq %%r15, %%rdx                         \n\t"  /* move r[2] into %rdx                             */         \
        "mulxq %[r_inv], %%rdx, %%r8               \n\t"  /* (%rdx, _) <- k = r[1] * r_inv                   */         \
        "mulxq %[modulus_0], %%r8, %%r9            \n\t"  /* (t[0], t[1]) <- (modulus.data[0] * k)           */         \
        "mulxq %[modulus_1], %%rdi, %%rsi          \n\t"  /* (t[0], t[1]) <- (modulus.data[1] * k)           */         \
        "adoxq %%r8, %%r15                         \n\t"  /* r[2] += t[0] (%r15 now free)                    */         \
        "adcxq %%r9, %%rax                         \n\t"  /* r[3] += t[0] + flag_c                           */         \
        "adoxq %%rdi, %%rax                        \n\t"  /* r[3] += t[1] + flag_o                           */         \
        "adcxq %%rsi, %%r12                        \n\t"  /* r[4] += t[1] + flag_c                           */         \
        "mulxq %[modulus_2], %%r8, %%r9            \n\t"  /* (t[0], t[1]) <- (modulus.data[2] * k)           */         \
        "mulxq %[modulus_3], %%rdi, %%rsi          \n\t"  /* (t[2], t[3]) <- (modulus.data[3] * k)           */         \
        "adoxq %%r8, %%r12                         \n\t"  /* r[4] += t[0] + flag_o                           */         \
        "adcxq %%r9, %%r13                         \n\t"  /* r[5] += t[2] + flag_c                           */         \
        "adoxq %%rdi, %%r13                        \n\t"  /* r[5] += t[1] + flag_o                           */         \
        "adcxq %%rsi, %%r14                        \n\t"  /* r[6] += t[3] + flag_c                           */         \
        "adoxq %%r10, %%r14                        \n\t"  /* r[6] += flag_o                                  */         \
                                                                                                                        \
        /* a[3] * b */                                                                                                  \
        "movq 24(" a "), %%rdx                     \n\t"  /* load a[3] into %rdx                             */         \
        "mulxq 0(" b "), %%r8, %%r9                \n\t"  /* (t[0], t[1]) <- (a[3] * b[0])                   */         \
        "mulxq 8(" b "), %%rdi, %%rsi              \n\t"  /* (t[4], t[5]) <- (a[3] * b[1])                   */         \
        "adcxq %%r8, %%rax                         \n\t"  /* r[3] += t[0] + flag_c                           */         \
        "adoxq %%r9, %%r12                         \n\t"  /* r[4] += t[2] + flag_o                           */         \
        "adcxq %%rdi, %%r12                        \n\t"  /* r[4] += t[1] + flag_c                           */         \
        "adoxq %%rsi, %%r13                        \n\t"  /* r[5] += t[3] + flag_o                           */         \
                                                                                                                        \
        "mulxq 16(" b "), %%r8, %%r9               \n\t"  /* (t[2], t[3]) <- (a[3] * b[2])                   */         \
        "mulxq 24(" b "), %%rdi, %%r15             \n\t"  /* (t[6], r[7]) <- (a[3] * b[3])                   */         \
        "adcxq %%r8, %%r13                         \n\t"  /* r[5] += t[4] + flag_c                           */         \
        "adoxq %%r9, %%r14                         \n\t"  /* r[6] += t[6] + flag_o                           */         \
        "adcxq %%rdi, %%r14                        \n\t"  /* r[6] += t[5] + flag_c                           */         \
        "adoxq %%r10, %%r15                        \n\t"  /* r[7] += + flag_o                                */         \
        "adcxq %%r10, %%r15                        \n\t"  /* r[7] += flag_c                                  */         \
                                                                                                                        \
        /* reduce by r[3] * k */                                                                                        \
        "movq %%rax, %%rdx                         \n\t" /* move r_inv into %rdx                             */         \
        "mulxq %[r_inv], %%rdx, %%r8               \n\t" /* (%rdx, _) <- k = r[1] * r_inv                    */         \
        "mulxq %[modulus_0], %%r8, %%r9            \n\t" /* (t[0], t[1]) <- (modulus.data[0] * k)            */         \
        "mulxq %[modulus_1], %%rdi, %%r11          \n\t" /* (t[2], t[3]) <- (modulus.data[1] * k)            */         \
        "movq %[r_ptr], " r "                    \n\t" /* pre-load output ptr into out                     */         \
        "adoxq %%r8, %%rax                         \n\t" /* r[3] += t[0] (%rax now free)                     */         \
        "adcxq %%r9, %%r12                         \n\t" /* r[4] += t[2] + flag_c                            */         \
        "adoxq %%rdi, %%r12                        \n\t" /* r[4] += t[1] + flag_o                            */         \
        "adcxq %%r11, %%r13                        \n\t" /* r[5] += t[3] + flag_c                            */         \
                                                                                                                        \
        "mulxq %[modulus_2], %%r8, %%r9            \n\t" /* (t[4], t[5]) <- (modulus.data[2] * k)            */         \
        "mulxq %[modulus_3], %%rdi, %%rdx          \n\t" /* (t[6], t[7]) <- (modulus.data[3] * k)            */         \
        "adoxq %%r8, %%r13                         \n\t" /* r[5] += t[4] + flag_o                            */         \
        "adcxq %%r9, %%r14                         \n\t" /* r[6] += t[6] + flag_c                            */         \
        "adoxq %%rdi, %%r14                        \n\t" /* r[6] += t[5] + flag_o                            */         \
        "adcxq %%rdx, %%r15                        \n\t" /* r[7] += t[7] + flag_c                            */         \
        "adoxq %%r10, %%r15                        \n\t" /* r[7] += flag_o                                   */


