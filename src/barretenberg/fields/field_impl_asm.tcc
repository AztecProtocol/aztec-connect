#pragma once

#include <cstdint>
#include <unistd.h>

#include "../assert.hpp"

#include "asm_macros.hpp"


namespace barretenberg
{

namespace internal
{
// sometimes we don't have any free registers to store 0.
// When adding carry flags into a limb, apparently adding relative
// to a memory location that stores 0 is faster than changing the
// asm code to free up a register we can zero...I think (TODO: zero register?)
constexpr uint64_t zero_reference = 0;
} // namespace


/**
 * copy src into dest. AVX implementation requires words to be aligned on 32 byte bounary
 **/
template <typename FieldParams>
inline void field<FieldParams>::__copy(const field_t &src, field_t &dest) noexcept
{
#if defined __AVX__ && defined USE_AVX
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
template <typename FieldParams>
inline void field<FieldParams>::reduce_once(const field_t &a, field_t &r) noexcept
{
    __asm__(
        CLEAR_FLAGS("%%r12")
        LOAD_FIELD_ELEMENT("%0", "%%r12", "%%r13", "%%r14", "%%r15")
        REDUCE_FIELD_ELEMENT("%[not_modulus_0]", "%[not_modulus_1]", "%[not_modulus_2]", "%[not_modulus_3]")
        STORE_FIELD_ELEMENT("%1", "%%r12", "%%r13", "%%r14", "%%r15")
        :
        : "r"(&a), "r"(&r), [not_modulus_0] "m"(FieldParams::not_modulus_0), [not_modulus_1] "m"(FieldParams::not_modulus_1), [not_modulus_2] "m"(FieldParams::not_modulus_2), [not_modulus_3] "m"(FieldParams::not_modulus_3)
        : "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
}

/**
 * Add field_t elements `a` and `b` modulo `q`, store the result in `r`
 * We assume both `b` and `a` are 254 bit integers, and skip the relevant carry checks on the most significant limb
 **/
template <typename FieldParams>
inline void field<FieldParams>::__add(const field_t &a, const field_t &b, field_t &r) noexcept
{
    __asm__(
        CLEAR_FLAGS("%%r12")
        LOAD_FIELD_ELEMENT("%0", "%%r12", "%%r13", "%%r14", "%%r15")
        ADD_REDUCE("%1", "%[not_modulus_0]", "%[not_modulus_1]", "%[not_modulus_2]", "%[not_modulus_3]")
        STORE_FIELD_ELEMENT("%2", "%%r12", "%%r13", "%%r14", "%%r15")
        :
        : "%r"(&a), "%r"(&b), "r"(&r), [not_modulus_0] "m"(FieldParams::not_modulus_0), [not_modulus_1] "m"(FieldParams::not_modulus_1), [not_modulus_2] "m"(FieldParams::not_modulus_2), [not_modulus_3] "m"(FieldParams::not_modulus_3)
        : "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
}

/**
 * Add field_t elements `a` and `b` modulo `2q`, store the result in `r`
 * We assume both `b` and `a` are 254 bit integers, and skip the relevant carry checks on the most significant limb
 **/
template <typename FieldParams>
inline void field<FieldParams>::__add_with_coarse_reduction(const field_t &a, const field_t &b, field_t &r) noexcept
{
    __asm__(
        CLEAR_FLAGS("%%r12")
        LOAD_FIELD_ELEMENT("%0", "%%r12", "%%r13", "%%r14", "%%r15")
        ADD_REDUCE("%1", "%[twice_not_modulus_0]", "%[twice_not_modulus_1]", "%[twice_not_modulus_2]", "%[twice_not_modulus_3]")
        STORE_FIELD_ELEMENT("%2", "%%r12", "%%r13", "%%r14", "%%r15")
        :
        : "%r"(&a), "%r"(&b), "r"(&r), [twice_not_modulus_0] "m"(FieldParams::twice_not_modulus_0), [twice_not_modulus_1] "m"(FieldParams::twice_not_modulus_1), [twice_not_modulus_2] "m"(FieldParams::twice_not_modulus_2), [twice_not_modulus_3] "m"(FieldParams::twice_not_modulus_3)
        : "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
}

/**
 * Add field_t elements `a` and `b`, store the result in `r`
 * We assume both `b` and `a` are 254 bit integers, and skip the relevant carry checks on the most significant limb
 **/
template <typename FieldParams>
inline void field<FieldParams>::__add_without_reduction(const field_t &a, const field_t &b, field_t &r) noexcept
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
template <typename FieldParams>
inline void field<FieldParams>::__quad_with_coarse_reduction(const field_t &a, field_t &r) noexcept
{
    __asm__(
        CLEAR_FLAGS("%%r12")
        LOAD_FIELD_ELEMENT("%0", "%%r12", "%%r13", "%%r14", "%%r15")
        DOUBLE_REDUCE("%[twice_not_modulus_0]", "%[twice_not_modulus_1]", "%[twice_not_modulus_2]", "%[twice_not_modulus_3]")
        CLEAR_FLAGS("%%r8")
        DOUBLE_REDUCE("%[twice_not_modulus_0]", "%[twice_not_modulus_1]", "%[twice_not_modulus_2]", "%[twice_not_modulus_3]")
        STORE_FIELD_ELEMENT("%1", "%%r12", "%%r13", "%%r14", "%%r15")
        :
        : "r"(&a), "r"(&r), [twice_not_modulus_0] "m"(FieldParams::twice_not_modulus_0), [twice_not_modulus_1] "m"(FieldParams::twice_not_modulus_1), [twice_not_modulus_2] "m"(FieldParams::twice_not_modulus_2), [twice_not_modulus_3] "m"(FieldParams::twice_not_modulus_3)
        : "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
}

/**
 * Compute `8a` mod `2p` and store result in `&r`
 * We assume all field elements are 254 bit integers, and skip the relevant carry checks on the most significant limb
 **/
template <typename FieldParams>
inline void field<FieldParams>::__oct_with_coarse_reduction(const field_t &a, field_t &r) noexcept
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
        : "%r"(&a), "%r"(&r), [twice_not_modulus_0] "m"(FieldParams::twice_not_modulus_0), [twice_not_modulus_1] "m"(FieldParams::twice_not_modulus_1), [twice_not_modulus_2] "m"(FieldParams::twice_not_modulus_2), [twice_not_modulus_3] "m"(FieldParams::twice_not_modulus_3)
        : "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
}

/**
 * Compute `x_0 + x_0` and store result in `&x_0`
 * Compute `y_0 + y_1` and store result if `&r`
 * This method is for the niche situation where we need to perform a double and an add at the same time,
 * we can use two ADCX/ADOX addition chains to perform both operations on different execution ports, at the same time
 * We assume all field elements are 254 bit integers, and skip the relevant carry checks on the most significant limb
 **/
template <typename FieldParams>
inline void field<FieldParams>::__paralell_double_and_add_without_reduction(field_t &x_0, const field_t &y_0, const field_t &y_1, field_t &r) noexcept
{
    __asm__(
        CLEAR_FLAGS("%%r12")
        LOAD_FIELD_ELEMENT("%0", "%%r8", "%%r9", "%%r10", "%%r11")
        LOAD_FIELD_ELEMENT("%1", "%%r12", "%%r13", "%%r14", "%%r15")
        PARALLEL_DOUBLE_ADD("%2")
        STORE_FIELD_ELEMENT("%0", "%%r8", "%%r9", "%%r10", "%%r11")
        STORE_FIELD_ELEMENT("%3", "%%r12", "%%r13", "%%r14", "%%r15")
        :
        : "r"(x_0.data), "%r"(y_0.data), "%r"(y_1.data), "r"(&r), [not_modulus_0] "m"(FieldParams::not_modulus_0), [not_modulus_1] "m"(FieldParams::not_modulus_1), [not_modulus_2] "m"(FieldParams::not_modulus_2), [not_modulus_3] "m"(FieldParams::not_modulus_3)
        : "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
}

/**
 * Subtract `b` from `a` modulo `q`, store result in `r`
 * We assume both `b` and `a` are 254 bit integers, and skip the relevant carry checks on the most significant limb
 **/
template <typename FieldParams>
inline void field<FieldParams>::__sub(const field_t &a, const field_t &b, field_t &r) noexcept
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
        : "r"(&a), "r"(&b), "r"(&r), [modulus_0] "m"(FieldParams::modulus_0), [modulus_1] "m"(FieldParams::modulus_1), [modulus_2] "m"(FieldParams::modulus_2), [modulus_3] "m"(FieldParams::modulus_3)
        : "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
}

/**
 * Subtract `b` from `a` modulo `2q`, store result in `r`
 * We assume both `b` and `a` are 254 bit integers, and skip the relevant carry checks on the most significant limb
 **/
template <typename FieldParams>
inline void field<FieldParams>::__sub_with_coarse_reduction(const field_t &a, const field_t &b, field_t &r) noexcept
{
    __asm__(
        CLEAR_FLAGS("%%r12")
        LOAD_FIELD_ELEMENT("%0", "%%r12", "%%r13", "%%r14", "%%r15")
        SUB("%1")
        REDUCE_FIELD_ELEMENT("%[twice_modulus_0]", "%[twice_modulus_1]", "%[twice_modulus_2]", "%[twice_modulus_3]")
        STORE_FIELD_ELEMENT("%2", "%%r12", "%%r13", "%%r14", "%%r15")
        :
        : "r"(&a), "r"(&b), "r"(&r), [twice_modulus_0] "m"(FieldParams::twice_modulus_0), [twice_modulus_1] "m"(FieldParams::twice_modulus_1), [twice_modulus_2] "m"(FieldParams::twice_modulus_2), [twice_modulus_3] "m"(FieldParams::twice_modulus_3)
        : "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
}

/**
 * negate if predicate is true
 **/
template <typename FieldParams>
inline void field<FieldParams>::__conditionally_negate_self(field_t &r, const uint64_t predicate) noexcept
{
    // TODO use literals instead of memory references
    __asm__ (
        CLEAR_FLAGS("%%r8")
        LOAD_FIELD_ELEMENT("%1", "%%r8", "%%r9", "%%r10", "%%r11")
        "movq %[modulus_0], %%r12 \n\t"
        "movq %[modulus_1], %%r13 \n\t"
        "movq %[modulus_2], %%r14 \n\t"
        "movq %[modulus_3], %%r15 \n\t"
        "subq %%r8, %%r12 \n\t"
        "sbbq %%r9, %%r13 \n\t"
        "sbbq %%r10, %%r14 \n\t"
        "sbbq %%r11, %%r15 \n\t"
        "btq $0, %0 \n\t"
        "cmovcq %%r12, %%r8 \n\t"
        "cmovcq %%r13, %%r9 \n\t"
        "cmovcq %%r14, %%r10 \n\t"
        "cmovcq %%r15, %%r11 \n\t"
        STORE_FIELD_ELEMENT("%1", "%%r8", "%%r9", "%%r10", "%%r11")
        :
        : "r"(predicate), "r"(&r), [modulus_0] "m"(FieldParams::modulus_0), [modulus_1] "m"(FieldParams::modulus_1), [modulus_2] "m"(FieldParams::modulus_2), [modulus_3] "m"(FieldParams::modulus_3)
        : "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
}


/**
 * Copy `a` into `r`. If `predicate == true`, subtract modulus from r
 **/
template <typename FieldParams>
inline void field<FieldParams>::__conditionally_subtract_from_double_modulus(const field_t &a, field_t &r, const uint64_t predicate) noexcept
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
        : "r"(&a), "r"(predicate), "r"(&r), [modulus_0] "m"(FieldParams::twice_modulus_0), [modulus_1] "m"(FieldParams::twice_modulus_1), [modulus_2] "m"(FieldParams::twice_modulus_2), [modulus_3] "m"(FieldParams::twice_modulus_3)
        : "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
}

/**
 * Compute the square of `a`, modulo `q`. Store result in `r`
 * We assume `a` is 254 bits and do not perform carry checks on most significant limb
 **/
template <typename FieldParams>
inline void field<FieldParams>::__sqr(const field_t &a, field_t &r) noexcept
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
        : "r"(&a), "r"(&r), [zero_reference] "m"(internal::zero_reference), [modulus_0] "m"(FieldParams::modulus_0), [modulus_1] "m"(FieldParams::modulus_1), [modulus_2] "m"(FieldParams::modulus_2), [modulus_3] "m"(FieldParams::modulus_3), [r_inv] "m"(FieldParams::r_inv), [not_modulus_0] "m"(FieldParams::not_modulus_0), [not_modulus_1] "m"(FieldParams::not_modulus_1), [not_modulus_2] "m"(FieldParams::not_modulus_2), [not_modulus_3] "m"(FieldParams::not_modulus_3)
        : "%rcx", "%rdx", "%rdi", "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
}

/**
 * Compute the square of `a`, modulo `q`. Store result in `r`
 * We assume `a` is 254 bits and do not perform carry checks on most significant limb
 **/
template <typename FieldParams>
inline void field<FieldParams>::__sqr_with_coarse_reduction(const field_t &a, field_t &r) noexcept
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
        : "r"(&a), "r"(&r), [zero_reference] "m"(internal::zero_reference), [modulus_0] "m"(FieldParams::modulus_0), [modulus_1] "m"(FieldParams::modulus_1), [modulus_2] "m"(FieldParams::modulus_2), [modulus_3] "m"(FieldParams::modulus_3), [r_inv] "m"(FieldParams::r_inv)
        : "%rcx", "%rdx", "%rdi", "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
}

/**
 * Compute `a` * `b` mod `q`, store result in `r`
 * We assume `a` is 254 bits and do not perform carry checks on most significant limb
 **/
template <typename FieldParams>
inline void field<FieldParams>::__mul(const field_t &a, const field_t &b, field_t &r) noexcept
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
        : "%r"(&a), "%r"(&b), "r"(&r), [modulus_0] "m"(FieldParams::modulus_0), [modulus_1] "m"(FieldParams::modulus_1), [modulus_2] "m"(FieldParams::modulus_2), [modulus_3] "m"(FieldParams::modulus_3), [r_inv] "m"(FieldParams::r_inv), [not_modulus_0] "m"(FieldParams::not_modulus_0), [not_modulus_1] "m"(FieldParams::not_modulus_1), [not_modulus_2] "m"(FieldParams::not_modulus_2), [not_modulus_3] "m"(FieldParams::not_modulus_3), [zero_reference] "m"(internal::zero_reference)
        : "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "%rdx", "%rdi", "cc", "memory");
}

/**
 * Compute `a` * `b` mod `q`, store result in `r`
 * We assume `a` is 254 bits and do not perform carry checks on most significant limb
 **/
template <typename FieldParams>
inline void field<FieldParams>::__mul_with_coarse_reduction(const field_t &a, const field_t &b, field_t &r) noexcept
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
        : "%r"(&b), "%r"(&a), "r"(&r), [modulus_0] "m"(FieldParams::modulus_0), [modulus_1] "m"(FieldParams::modulus_1), [modulus_2] "m"(FieldParams::modulus_2), [modulus_3] "m"(FieldParams::modulus_3), [r_inv] "m"(FieldParams::r_inv), [zero_reference] "m"(internal::zero_reference)
        : "%rdx", "%rdi", "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
}

template <typename FieldParams>
inline void field<FieldParams>::__mul_512(const field_t &a, const field_t &b, field_wide_t &r) noexcept
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


/**
 * swap src and dest. AVX implementation requires words to be aligned on 32 byte bounary
 **/
template <typename FieldParams>
inline void field<FieldParams>::__swap(field_t &src, field_t &dest) noexcept
{
#if defined __AVX__ && defined USE_AVX
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

} // namespace barretenberg

