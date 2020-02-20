#pragma once

#ifndef DISABLE_SHENANIGANS
#include "asm_macros.hpp"
#endif

#include <type_traits>

#ifdef DISABLE_SHENANIGANS
#define NO_ASM 1
#else
#define NO_ASM std::is_constant_evaluated()
#endif

namespace test {
namespace internal {
constexpr uint64_t zero_reference = 0;
}
template <class T>
constexpr std::pair<uint64_t, uint64_t> field<T>::mul_wide(const uint64_t a, const uint64_t b) const noexcept
{
    const uint64_t a_lo = a & 0xffffffffULL;
    const uint64_t a_hi = a >> 32ULL;
    const uint64_t b_lo = b & 0xffffffffULL;
    const uint64_t b_hi = b >> 32ULL;

    const uint64_t lo_lo = a_lo * b_lo;
    const uint64_t hi_lo = a_hi * b_lo;
    const uint64_t lo_hi = a_lo * b_hi;
    const uint64_t hi_hi = a_hi * b_hi;

    const uint64_t cross = (lo_lo >> 32ULL) + (hi_lo & 0xffffffffULL) + lo_hi;

    return { (cross << 32ULL) | (lo_lo & 0xffffffffULL), (hi_lo >> 32ULL) + (cross >> 32ULL) + hi_hi };
}

template <class T>
constexpr std::pair<uint64_t, uint64_t> field<T>::mac(const uint64_t a,
                                                      const uint64_t b,
                                                      const uint64_t c,
                                                      const uint64_t carry_in) const noexcept
{
#if defined(__SIZEOF_INT128__) && !defined(__wasm__)
    const uint128_t res = (uint128_t)a + ((uint128_t)b * (uint128_t)c) + (uint128_t)carry_in;
    return { (uint64_t)(res & lo_mask), (uint64_t)(res >> 64) };
#else
    auto result = mul_wide(b, c, r, carry_out);
    result.first += a;
    const uint64_t overflow_c = (result.first < a);
    result.first += carry_in;
    const uint64_t overflow_carry = (result.first < carry_in);
    result.second += (overflow_c + overflow_carry);
    return result;
#endif
}

template <class T>
constexpr uint64_t field<T>::mac_discard_hi(const uint64_t a,
                                            const uint64_t b,
                                            const uint64_t c,
                                            const uint64_t carry_in) const noexcept
{
    return (b * c) + a + carry_in;
}

template <class T>
constexpr uint64_t field<T>::mac_discard_lo(const uint64_t a,
                                            const uint64_t b,
                                            const uint64_t c,
                                            const uint64_t carry_in) const noexcept
{
#if defined(__SIZEOF_INT128__) && !defined(__wasm__)
    const uint128_t res = (uint128_t)a + ((uint128_t)b * (uint128_t)c) + (uint128_t)carry_in;
    return (uint64_t)(res >> 64);
#else
    auto result = mul_wide(b, c, r, carry_out);
    result.first += a;
    const uint64_t overflow_c = (result.first < a);
    result.first += carry_in;
    const uint64_t overflow_carry = (result.first < carry_in);
    result.second += (overflow_c + overflow_carry);
    return result.second;
#endif
}

template <class T>
constexpr std::pair<uint64_t, uint64_t> field<T>::addc(const uint64_t a,
                                                       const uint64_t b,
                                                       const uint64_t carry_in) const noexcept
{
#if defined(__SIZEOF_INT128__) && !defined(__wasm__)
    uint128_t res = (uint128_t)a + (uint128_t)b + (uint128_t)carry_in;
    return { (uint64_t)(res & lo_mask), (uint64_t)(res >> 64) };
#else
    uint64_t r = a + b;
    const uint64_t carry_temp = r < a;
    r += carry_in;
    const uint64_t carry_out = carry_temp + (r < carry_in);
    return { r, carry_out };
#endif
}

template <class T>
constexpr uint64_t field<T>::addc_discard_hi(const uint64_t a, const uint64_t b, const uint64_t carry_in) const noexcept
{
    return a + b + carry_in;
}

template <class T>
constexpr std::pair<uint64_t, uint64_t> field<T>::sbb(const uint64_t a,
                                                      const uint64_t b,
                                                      const uint64_t borrow_in) const noexcept
{
#if defined(__SIZEOF_INT128__) && !defined(__wasm__)
    uint128_t res = (uint128_t)a - ((uint128_t)b + (uint128_t)(borrow_in >> 63));
    return { (uint64_t)(res & lo_mask), (uint64_t)(res >> 64) };
#else
    uint64_t t_1 = a - (borrow_in >> 63ULL);
    uint64_t borrow_temp_1 = t_1 > a;
    uint64_t t_2 = t_1 - b;
    uint64_t borrow_temp_2 = t_2 > t_1;
    return { t_2, 0ULL - (borrow_temp_1 | borrow_temp_2) };
#endif
}

template <class T>
constexpr uint64_t field<T>::sbb_discard_hi(const uint64_t a, const uint64_t b, const uint64_t borrow_in) const noexcept
{
    return a - b - (borrow_in >> 63);
}

template <class T> constexpr field<T> field<T>::subtract(const field& other) const noexcept
{
    const auto [r0, t0] = sbb(data[0], other.data[0], 0ULL);
    const auto [r1, t1] = sbb(data[1], other.data[1], t0);
    const auto [r2, t2] = sbb(data[2], other.data[2], t1);
    const auto [r3, t3] = sbb(data[3], other.data[3], t2);

    const auto [r4, c0] = addc(r0, T::modulus_0 & t3, 0);
    const auto [r5, c1] = addc(r1, T::modulus_1 & t3, c0);
    const auto [r6, c2] = addc(r2, T::modulus_2 & t3, c1);
    const auto r7 = addc_discard_hi(r3, T::modulus_3 & t3, c2);
    return { r4, r5, r6, r7 };
}

template <class T> constexpr field<T> field<T>::subtract_coarse(const field& other) const noexcept
{
    const auto [r0, t0] = sbb(data[0], other.data[0], 0ULL);
    const auto [r1, t1] = sbb(data[1], other.data[1], t0);
    const auto [r2, t2] = sbb(data[2], other.data[2], t1);
    const auto [r3, t3] = sbb(data[3], other.data[3], t2);

    const auto [r4, c0] = addc(r0, T::twice_modulus_0 & t3, 0);
    const auto [r5, c1] = addc(r1, T::twice_modulus_1 & t3, c0);
    const auto [r6, c2] = addc(r2, T::twice_modulus_2 & t3, c1);
    const auto r7 = addc_discard_hi(r3, T::twice_modulus_3 & t3, c2);
    return { r4, r5, r6, r7 };
}

template <class T> constexpr field<T> field<T>::montgomery_reduce(const wide_array& r) const noexcept
{
    uint64_t k = r.data[0] * T::r_inv;

    const auto c0 = mac_discard_lo(r.data[0], k, T::modulus_0, 0);
    const auto [t1, c1] = mac(r.data[1], k, T::modulus_1, c0);
    const auto [t2, c2] = mac(r.data[2], k, T::modulus_2, c1);
    const auto [t3, c3] = mac(r.data[3], k, T::modulus_3, c2);

    const auto [v0, z0] = addc(r.data[4], 0, c3);

    k = t1 * T::r_inv;

    const auto c4 = mac_discard_lo(t1, k, T::modulus_0, 0);
    const auto [t5, c5] = mac(t2, k, T::modulus_1, c4);
    const auto [t6, c6] = mac(t3, k, T::modulus_2, c5);
    const auto [t7, c7] = mac(v0, k, T::modulus_3, c6);

    const auto [v1, z1] = addc(r.data[5], z0, c7);

    k = t5 * T::r_inv;

    const auto c8 = mac_discard_lo(t5, k, T::modulus_0, 0);
    const auto [t8, c9] = mac(t6, k, T::modulus_1, c8);
    const auto [t9, c10] = mac(t7, k, T::modulus_2, c9);
    const auto [t10, c11] = mac(v1, k, T::modulus_3, c10);

    const auto [v2, z2] = addc(r.data[6], z1, c11);

    k = t8 * T::r_inv;

    const auto c12 = mac_discard_lo(t8, k, T::modulus_0, 0);
    const auto [r0, c13] = mac(t9, k, T::modulus_1, c12);
    const auto [r1, c14] = mac(t10, k, T::modulus_2, c13);
    const auto [r2, c15] = mac(v2, k, T::modulus_3, c14);
    const auto r3 = addc_discard_hi(r.data[7], z2, c15);

    return { r0, r1, r2, r3 };
}

template <class T> constexpr class field<T>::wide_array field<T>::mul_512(const field& other) const noexcept {
    const auto [r0, t0] = mac(0, data[0], other.data[0], 0ULL);
    const auto [q0, t1] = mac(0, data[0], other.data[1], t0);
    const auto [q1, t2] = mac(0, data[0], other.data[2], t1);
    const auto [q2, z0] = mac(0, data[0], other.data[3], t2);

    const auto [r1, t3] = mac(q0, data[1], other.data[0], 0ULL);
    const auto [q3, t4] = mac(q1, data[1], other.data[1], t3);
    const auto [q4, t5] = mac(q2, data[1], other.data[2], t4);
    const auto [q5, z1] = mac(z0, data[1], other.data[3], t5);

    const auto [r2, t6] = mac(q3, data[2], other.data[0], 0ULL);
    const auto [q6, t7] = mac(q4, data[2], other.data[1], t6);
    const auto [q7, t8] = mac(q5, data[2], other.data[2], t7);
    const auto [q8, z2] = mac(z1, data[2], other.data[3], t8);

    const auto [r3, t9] = mac(q6, data[3], other.data[0], 0ULL);
    const auto [r4, t10] = mac(q7, data[3], other.data[1], t9);
    const auto [r5, t11] = mac(q8, data[3], other.data[2], t10);
    const auto [r6, r7] = mac(z2, data[3], other.data[3], t11);

    return { r0, r1, r2, r3, r4, r5, r6, r7 };
}

#ifndef DISABLE_SHENANIGANS
template <class T>
field<T> field<T>::asm_mul(const field& a, const field& b) noexcept
{
    field r;
    constexpr uint64_t not_modulus_3 = T::not_modulus_3;
    constexpr uint64_t not_modulus_2 = T::not_modulus_2;
    constexpr uint64_t not_modulus_1 = T::not_modulus_1;
    constexpr uint64_t not_modulus_0 = T::not_modulus_0;
    constexpr uint64_t r_inv = T::r_inv;
    constexpr uint64_t modulus_3 = T::modulus_3;
    constexpr uint64_t modulus_2 = T::modulus_2;
    constexpr uint64_t modulus_1 = T::modulus_1;
    constexpr uint64_t modulus_0 = T::modulus_0;
    /**
     * Registers: rax:rdx = multiplication accumulator
     *            %r12, %r13, %r14, %r15, %rax: work registers for `r`
     *            %r8, %r9, %rdi, %rsi: scratch registers for multiplication results
     *            %r10: zero register
     *            %0: pointer to `a`
     *            %1: pointer to `b`
     *            %2: pointer to `r`
     **/
    __asm__(MUL("%0", "%1")
                REDUCE_FIELD_ELEMENT("%[not_modulus_0]", "%[not_modulus_1]", "%[not_modulus_2]", "%[not_modulus_3]")
                    STORE_FIELD_ELEMENT("%2", "%%r12", "%%r13", "%%r14", "%%r15")
            :
            : "%r"(&a),
              "%r"(&b),
              "r"(&r),
              [modulus_0] "m"(modulus_0),
              [modulus_1] "m"(modulus_1),
              [modulus_2] "m"(modulus_2),
              [modulus_3] "m"(modulus_3),
              [r_inv] "m"(r_inv),
              [not_modulus_0] "m"(not_modulus_0),
              [not_modulus_1] "m"(not_modulus_1),
              [not_modulus_2] "m"(not_modulus_2),
              [not_modulus_3] "m"(not_modulus_3),
              [zero_reference] "m"(internal::zero_reference)
            : "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "%rdx", "%rdi", "cc", "memory");
    return r;
}

template <class T> void field<T>::asm_self_mul(const field& a, const field& b) noexcept
{
    constexpr uint64_t not_modulus_3 = T::not_modulus_3;
    constexpr uint64_t not_modulus_2 = T::not_modulus_2;
    constexpr uint64_t not_modulus_1 = T::not_modulus_1;
    constexpr uint64_t not_modulus_0 = T::not_modulus_0;
    constexpr uint64_t r_inv = T::r_inv;
    constexpr uint64_t modulus_3 = T::modulus_3;
    constexpr uint64_t modulus_2 = T::modulus_2;
    constexpr uint64_t modulus_1 = T::modulus_1;
    constexpr uint64_t modulus_0 = T::modulus_0;
    /**
     * Registers: rax:rdx = multiplication accumulator
     *            %r12, %r13, %r14, %r15, %rax: work registers for `r`
     *            %r8, %r9, %rdi, %rsi: scratch registers for multiplication results
     *            %r10: zero register
     *            %0: pointer to `a`
     *            %1: pointer to `b`
     *            %2: pointer to `r`
     **/
    __asm__(MUL("%0", "%1")
                REDUCE_FIELD_ELEMENT("%[not_modulus_0]", "%[not_modulus_1]", "%[not_modulus_2]", "%[not_modulus_3]")
                    STORE_FIELD_ELEMENT("%0", "%%r12", "%%r13", "%%r14", "%%r15")
            :
            : "r"(&a),
              "r"(&b),
              [modulus_0] "m"(modulus_0),
              [modulus_1] "m"(modulus_1),
              [modulus_2] "m"(modulus_2),
              [modulus_3] "m"(modulus_3),
              [r_inv] "m"(r_inv),
              [not_modulus_0] "m"(not_modulus_0),
              [not_modulus_1] "m"(not_modulus_1),
              [not_modulus_2] "m"(not_modulus_2),
              [not_modulus_3] "m"(not_modulus_3),
              [zero_reference] "m"(internal::zero_reference)
            : "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "%rdx", "%rdi", "cc", "memory");
}

template <class T> field<T> field<T>::asm_mul_with_coarse_reduction(const field& a, const field& b) noexcept
{
    field r;
    constexpr uint64_t r_inv = T::r_inv;
    constexpr uint64_t modulus_3 = T::modulus_3;
    constexpr uint64_t modulus_2 = T::modulus_2;
    constexpr uint64_t modulus_1 = T::modulus_1;
    constexpr uint64_t modulus_0 = T::modulus_0;
    /**
     * Registers: rax:rdx = multiplication accumulator
     *            %r12, %r13, %r14, %r15, %rax: work registers for `r`
     *            %r8, %r9, %rdi, %rsi: scratch registers for multiplication results
     *            %r10: zero register
     *            %0: pointer to `a`
     *            %1: pointer to `b`
     *            %2: pointer to `r`
     **/
    __asm__(MUL("%0", "%1") STORE_FIELD_ELEMENT("%2", "%%r12", "%%r13", "%%r14", "%%r15")
            :
            : "%r"(&a),
              "%r"(&b),
              "r"(&r),
              [modulus_0] "m"(modulus_0),
              [modulus_1] "m"(modulus_1),
              [modulus_2] "m"(modulus_2),
              [modulus_3] "m"(modulus_3),
              [r_inv] "m"(r_inv),
              [zero_reference] "m"(internal::zero_reference)
            : "%rdx", "%rdi", "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
    return r;
}

template <class T> void field<T>::asm_self_mul_with_coarse_reduction(const field& a, const field& b) noexcept
{
    constexpr uint64_t r_inv = T::r_inv;
    constexpr uint64_t modulus_3 = T::modulus_3;
    constexpr uint64_t modulus_2 = T::modulus_2;
    constexpr uint64_t modulus_1 = T::modulus_1;
    constexpr uint64_t modulus_0 = T::modulus_0;
    /**
     * Registers: rax:rdx = multiplication accumulator
     *            %r12, %r13, %r14, %r15, %rax: work registers for `r`
     *            %r8, %r9, %rdi, %rsi: scratch registers for multiplication results
     *            %r10: zero register
     *            %0: pointer to `a`
     *            %1: pointer to `b`
     *            %2: pointer to `r`
     **/
    __asm__(MUL("%0", "%1") STORE_FIELD_ELEMENT("%0", "%%r12", "%%r13", "%%r14", "%%r15")
            :
            : "r"(&a),
              "r"(&b),
              [modulus_0] "m"(modulus_0),
              [modulus_1] "m"(modulus_1),
              [modulus_2] "m"(modulus_2),
              [modulus_3] "m"(modulus_3),
              [r_inv] "m"(r_inv),
              [zero_reference] "m"(internal::zero_reference)
            : "%rdx", "%rdi", "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
}

template <class T> field<T> field<T>::asm_sqr(const field& a) noexcept
{
    field r;
    constexpr uint64_t not_modulus_3 = T::not_modulus_3;
    constexpr uint64_t not_modulus_2 = T::not_modulus_2;
    constexpr uint64_t not_modulus_1 = T::not_modulus_1;
    constexpr uint64_t not_modulus_0 = T::not_modulus_0;
    constexpr uint64_t r_inv = T::r_inv;
    constexpr uint64_t modulus_3 = T::modulus_3;
    constexpr uint64_t modulus_2 = T::modulus_2;
    constexpr uint64_t modulus_1 = T::modulus_1;
    constexpr uint64_t modulus_0 = T::modulus_0;
    /**
     * Registers: rax:rdx = multiplication accumulator
     *            %r12, %r13, %r14, %r15, %rax: work registers for `r`
     *            %r8, %r9, %rdi, %rsi: scratch registers for multiplication results
     *            %[zero_reference]: memory location of zero value
     *            %0: pointer to `a`
     *            %[r_ptr]: memory location of pointer to `r`
     **/
    __asm__(SQR("%0")
            // "movq %[r_ptr], %%rsi                   \n\t"
            REDUCE_FIELD_ELEMENT("%[not_modulus_0]", "%[not_modulus_1]", "%[not_modulus_2]", "%[not_modulus_3]")
                STORE_FIELD_ELEMENT("%1", "%%r12", "%%r13", "%%r14", "%%r15")
            :
            : "r"(&a),
              "r"(&r),
              [zero_reference] "m"(internal::zero_reference),
              [modulus_0] "m"(modulus_0),
              [modulus_1] "m"(modulus_1),
              [modulus_2] "m"(modulus_2),
              [modulus_3] "m"(modulus_3),
              [r_inv] "m"(r_inv),
              [not_modulus_0] "m"(not_modulus_0),
              [not_modulus_1] "m"(not_modulus_1),
              [not_modulus_2] "m"(not_modulus_2),
              [not_modulus_3] "m"(not_modulus_3)
            : "%rcx", "%rdx", "%rdi", "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
    return r;
}

template <class T> void field<T>::asm_self_sqr(const field& a) noexcept
{
    constexpr uint64_t not_modulus_3 = T::not_modulus_3;
    constexpr uint64_t not_modulus_2 = T::not_modulus_2;
    constexpr uint64_t not_modulus_1 = T::not_modulus_1;
    constexpr uint64_t not_modulus_0 = T::not_modulus_0;
    constexpr uint64_t r_inv = T::r_inv;
    constexpr uint64_t modulus_3 = T::modulus_3;
    constexpr uint64_t modulus_2 = T::modulus_2;
    constexpr uint64_t modulus_1 = T::modulus_1;
    constexpr uint64_t modulus_0 = T::modulus_0;
    /**
     * Registers: rax:rdx = multiplication accumulator
     *            %r12, %r13, %r14, %r15, %rax: work registers for `r`
     *            %r8, %r9, %rdi, %rsi: scratch registers for multiplication results
     *            %[zero_reference]: memory location of zero value
     *            %0: pointer to `a`
     *            %[r_ptr]: memory location of pointer to `r`
     **/
    __asm__(SQR("%0")
            // "movq %[r_ptr], %%rsi                   \n\t"
            REDUCE_FIELD_ELEMENT("%[not_modulus_0]", "%[not_modulus_1]", "%[not_modulus_2]", "%[not_modulus_3]")
                STORE_FIELD_ELEMENT("%0", "%%r12", "%%r13", "%%r14", "%%r15")
            :
            : "r"(&a),
              [zero_reference] "m"(internal::zero_reference),
              [modulus_0] "m"(modulus_0),
              [modulus_1] "m"(modulus_1),
              [modulus_2] "m"(modulus_2),
              [modulus_3] "m"(modulus_3),
              [r_inv] "m"(r_inv),
              [not_modulus_0] "m"(not_modulus_0),
              [not_modulus_1] "m"(not_modulus_1),
              [not_modulus_2] "m"(not_modulus_2),
              [not_modulus_3] "m"(not_modulus_3)
            : "%rcx", "%rdx", "%rdi", "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
}

template <class T> field<T> field<T>::asm_sqr_with_coarse_reduction(const field& a) noexcept
{
    field r;
    constexpr uint64_t r_inv = T::r_inv;
    constexpr uint64_t modulus_3 = T::modulus_3;
    constexpr uint64_t modulus_2 = T::modulus_2;
    constexpr uint64_t modulus_1 = T::modulus_1;
    constexpr uint64_t modulus_0 = T::modulus_0;
    /**
     * Registers: rax:rdx = multiplication accumulator
     *            %r12, %r13, %r14, %r15, %rax: work registers for `r`
     *            %r8, %r9, %rdi, %rsi: scratch registers for multiplication results
     *            %[zero_reference]: memory location of zero value
     *            %0: pointer to `a`
     *            %[r_ptr]: memory location of pointer to `r`
     **/
    __asm__(SQR("%0")
            // "movq %[r_ptr], %%rsi                   \n\t"
            STORE_FIELD_ELEMENT("%1", "%%r12", "%%r13", "%%r14", "%%r15")
            :
            : "r"(&a),
              "r"(&r),
              [zero_reference] "m"(internal::zero_reference),
              [modulus_0] "m"(modulus_0),
              [modulus_1] "m"(modulus_1),
              [modulus_2] "m"(modulus_2),
              [modulus_3] "m"(modulus_3),
              [r_inv] "m"(r_inv)
            : "%rcx", "%rdx", "%rdi", "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
    return r;
}

template <class T> void field<T>::asm_self_sqr_with_coarse_reduction(const field& a) noexcept
{
    constexpr uint64_t r_inv = T::r_inv;
    constexpr uint64_t modulus_3 = T::modulus_3;
    constexpr uint64_t modulus_2 = T::modulus_2;
    constexpr uint64_t modulus_1 = T::modulus_1;
    constexpr uint64_t modulus_0 = T::modulus_0;
    /**
     * Registers: rax:rdx = multiplication accumulator
     *            %r12, %r13, %r14, %r15, %rax: work registers for `r`
     *            %r8, %r9, %rdi, %rsi: scratch registers for multiplication results
     *            %[zero_reference]: memory location of zero value
     *            %0: pointer to `a`
     *            %[r_ptr]: memory location of pointer to `r`
     **/
    __asm__(SQR("%0")
            // "movq %[r_ptr], %%rsi                   \n\t"
            STORE_FIELD_ELEMENT("%0", "%%r12", "%%r13", "%%r14", "%%r15")
            :
            : "r"(&a),
              [zero_reference] "m"(internal::zero_reference),
              [modulus_0] "m"(modulus_0),
              [modulus_1] "m"(modulus_1),
              [modulus_2] "m"(modulus_2),
              [modulus_3] "m"(modulus_3),
              [r_inv] "m"(r_inv)
            : "%rcx", "%rdx", "%rdi", "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
}

template <class T> field<T> field<T>::asm_add(const field& a, const field& b) noexcept
{
    field r;
    constexpr uint64_t not_modulus_3 = T::not_modulus_3;
    constexpr uint64_t not_modulus_2 = T::not_modulus_2;
    constexpr uint64_t not_modulus_1 = T::not_modulus_1;
    constexpr uint64_t not_modulus_0 = T::not_modulus_0;
    __asm__(CLEAR_FLAGS("%%r12") LOAD_FIELD_ELEMENT("%0", "%%r12", "%%r13", "%%r14", "%%r15")
                ADD_REDUCE("%1", "%[not_modulus_0]", "%[not_modulus_1]", "%[not_modulus_2]", "%[not_modulus_3]")
                    STORE_FIELD_ELEMENT("%2", "%%r12", "%%r13", "%%r14", "%%r15")
            :
            : "%r"(&a),
              "%r"(&b),
              "r"(&r),
              [not_modulus_0] "m"(not_modulus_0),
              [not_modulus_1] "m"(not_modulus_1),
              [not_modulus_2] "m"(not_modulus_2),
              [not_modulus_3] "m"(not_modulus_3)
            : "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
    return r;
}

template <class T> void field<T>::asm_self_add(const field& a, const field& b) noexcept
{
    constexpr uint64_t not_modulus_3 = T::not_modulus_3;
    constexpr uint64_t not_modulus_2 = T::not_modulus_2;
    constexpr uint64_t not_modulus_1 = T::not_modulus_1;
    constexpr uint64_t not_modulus_0 = T::not_modulus_0;
    __asm__(CLEAR_FLAGS("%%r12") LOAD_FIELD_ELEMENT("%0", "%%r12", "%%r13", "%%r14", "%%r15")
                ADD_REDUCE("%1", "%[not_modulus_0]", "%[not_modulus_1]", "%[not_modulus_2]", "%[not_modulus_3]")
                    STORE_FIELD_ELEMENT("%0", "%%r12", "%%r13", "%%r14", "%%r15")
            :
            : "r"(&a),
              "r"(&b),
              [not_modulus_0] "m"(not_modulus_0),
              [not_modulus_1] "m"(not_modulus_1),
              [not_modulus_2] "m"(not_modulus_2),
              [not_modulus_3] "m"(not_modulus_3)
            : "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
}

template <class T> field<T> field<T>::asm_sub(const field& a, const field& b) noexcept
{
    field r;
    constexpr uint64_t modulus_3 = T::modulus_3;
    constexpr uint64_t modulus_2 = T::modulus_2;
    constexpr uint64_t modulus_1 = T::modulus_1;
    constexpr uint64_t modulus_0 = T::modulus_0;
    __asm__(CLEAR_FLAGS("%%r12") LOAD_FIELD_ELEMENT("%0", "%%r12", "%%r13", "%%r14", "%%r15") SUB("%1")
            // If b > a, then we've underflowed: adding the modulus will flip the overflow flag, so we can use
            // REDUCE_FIELD_ELEMENT to normalize r.
            REDUCE_FIELD_ELEMENT("%[modulus_0]", "%[modulus_1]", "%[modulus_2]", "%[modulus_3]")
                STORE_FIELD_ELEMENT("%2", "%%r12", "%%r13", "%%r14", "%%r15")
            :
            : "r"(&a),
              "r"(&b),
              "r"(&r),
              [modulus_0] "m"(modulus_0),
              [modulus_1] "m"(modulus_1),
              [modulus_2] "m"(modulus_2),
              [modulus_3] "m"(modulus_3)
            : "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
    return r;
}

template <class T> void field<T>::asm_self_sub(const field& a, const field& b) noexcept
{
    constexpr uint64_t modulus_3 = T::modulus_3;
    constexpr uint64_t modulus_2 = T::modulus_2;
    constexpr uint64_t modulus_1 = T::modulus_1;
    constexpr uint64_t modulus_0 = T::modulus_0;
    __asm__(CLEAR_FLAGS("%%r12") LOAD_FIELD_ELEMENT("%0", "%%r12", "%%r13", "%%r14", "%%r15") SUB("%1")
            // If b > a, then we've underflowed: adding the modulus will flip the overflow flag, so we can use
            // REDUCE_FIELD_ELEMENT to normalize r.
            REDUCE_FIELD_ELEMENT("%[modulus_0]", "%[modulus_1]", "%[modulus_2]", "%[modulus_3]")
                STORE_FIELD_ELEMENT("%0", "%%r12", "%%r13", "%%r14", "%%r15")
            :
            : "r"(&a),
              "r"(&b),
              [modulus_0] "m"(modulus_0),
              [modulus_1] "m"(modulus_1),
              [modulus_2] "m"(modulus_2),
              [modulus_3] "m"(modulus_3)
            : "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
}

template <class T> field<T> field<T>::asm_add_without_reduction(const field& a, const field& b) noexcept
{
    field r;
    __asm__(CLEAR_FLAGS("%%r12") LOAD_FIELD_ELEMENT("%0", "%%r12", "%%r13", "%%r14", "%%r15") ADD("%1")
                STORE_FIELD_ELEMENT("%2", "%%r12", "%%r13", "%%r14", "%%r15")
            :
            : "%r"(&a), "%r"(&b), "r"(&r)
            : "%r12", "%r13", "%r14", "%r15", "cc", "memory");
    return r;
}

template <class T> void field<T>::asm_self_add_without_reduction(const field& a, const field& b) noexcept
{
    __asm__(CLEAR_FLAGS("%%r12") LOAD_FIELD_ELEMENT("%0", "%%r12", "%%r13", "%%r14", "%%r15") ADD("%1")
                STORE_FIELD_ELEMENT("%0", "%%r12", "%%r13", "%%r14", "%%r15")
            :
            : "r"(&a), "r"(&b)
            : "%r12", "%r13", "%r14", "%r15", "cc", "memory");
}

template <class T> field<T> field<T>::asm_add_with_coarse_reduction(const field& a, const field& b) noexcept
{
    field r;
    constexpr uint64_t twice_not_modulus_3 = T::twice_not_modulus_3;
    constexpr uint64_t twice_not_modulus_2 = T::twice_not_modulus_2;
    constexpr uint64_t twice_not_modulus_1 = T::twice_not_modulus_1;
    constexpr uint64_t twice_not_modulus_0 = T::twice_not_modulus_0;
    __asm__(CLEAR_FLAGS("%%r12") LOAD_FIELD_ELEMENT("%0", "%%r12", "%%r13", "%%r14", "%%r15")
                ADD_REDUCE("%1",
                           "%[twice_not_modulus_0]",
                           "%[twice_not_modulus_1]",
                           "%[twice_not_modulus_2]",
                           "%[twice_not_modulus_3]") STORE_FIELD_ELEMENT("%2", "%%r12", "%%r13", "%%r14", "%%r15")
            :
            : "%r"(&a),
              "%r"(&b),
              "r"(&r),
              [twice_not_modulus_0] "m"(twice_not_modulus_0),
              [twice_not_modulus_1] "m"(twice_not_modulus_1),
              [twice_not_modulus_2] "m"(twice_not_modulus_2),
              [twice_not_modulus_3] "m"(twice_not_modulus_3)
            : "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
    return r;
}

template <class T> void field<T>::asm_self_add_with_coarse_reduction(const field& a, const field& b) noexcept
{
    constexpr uint64_t twice_not_modulus_3 = T::twice_not_modulus_3;
    constexpr uint64_t twice_not_modulus_2 = T::twice_not_modulus_2;
    constexpr uint64_t twice_not_modulus_1 = T::twice_not_modulus_1;
    constexpr uint64_t twice_not_modulus_0 = T::twice_not_modulus_0;
    __asm__(CLEAR_FLAGS("%%r12") LOAD_FIELD_ELEMENT("%0", "%%r12", "%%r13", "%%r14", "%%r15")
                ADD_REDUCE("%1",
                           "%[twice_not_modulus_0]",
                           "%[twice_not_modulus_1]",
                           "%[twice_not_modulus_2]",
                           "%[twice_not_modulus_3]") STORE_FIELD_ELEMENT("%0", "%%r12", "%%r13", "%%r14", "%%r15")
            :
            : "r"(&a),
              "r"(&b),
              [twice_not_modulus_0] "m"(twice_not_modulus_0),
              [twice_not_modulus_1] "m"(twice_not_modulus_1),
              [twice_not_modulus_2] "m"(twice_not_modulus_2),
              [twice_not_modulus_3] "m"(twice_not_modulus_3)
            : "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
}

template <class T> field<T> field<T>::asm_sub_with_coarse_reduction(const field& a, const field& b) noexcept
{
    field r;
    constexpr uint64_t twice_modulus_3 = T::twice_modulus_3;
    constexpr uint64_t twice_modulus_2 = T::twice_modulus_2;
    constexpr uint64_t twice_modulus_1 = T::twice_modulus_1;
    constexpr uint64_t twice_modulus_0 = T::twice_modulus_0;
    __asm__(
        CLEAR_FLAGS("%%r12") LOAD_FIELD_ELEMENT("%0", "%%r12", "%%r13", "%%r14", "%%r15") SUB("%1")
            REDUCE_FIELD_ELEMENT("%[twice_modulus_0]", "%[twice_modulus_1]", "%[twice_modulus_2]", "%[twice_modulus_3]")
                STORE_FIELD_ELEMENT("%2", "%%r12", "%%r13", "%%r14", "%%r15")
        :
        : "r"(&a),
          "r"(&b),
          "r"(&r),
          [twice_modulus_0] "m"(twice_modulus_0),
          [twice_modulus_1] "m"(twice_modulus_1),
          [twice_modulus_2] "m"(twice_modulus_2),
          [twice_modulus_3] "m"(twice_modulus_3)
        : "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
    return r;
}

template <class T> void field<T>::asm_self_sub_with_coarse_reduction(const field& a, const field& b) noexcept
{
    constexpr uint64_t twice_modulus_3 = T::twice_modulus_3;
    constexpr uint64_t twice_modulus_2 = T::twice_modulus_2;
    constexpr uint64_t twice_modulus_1 = T::twice_modulus_1;
    constexpr uint64_t twice_modulus_0 = T::twice_modulus_0;
    __asm__(
        CLEAR_FLAGS("%%r12") LOAD_FIELD_ELEMENT("%0", "%%r12", "%%r13", "%%r14", "%%r15") SUB("%1")
            REDUCE_FIELD_ELEMENT("%[twice_modulus_0]", "%[twice_modulus_1]", "%[twice_modulus_2]", "%[twice_modulus_3]")
                STORE_FIELD_ELEMENT("%0", "%%r12", "%%r13", "%%r14", "%%r15")
        :
        : "r"(&a),
          "r"(&b),
          [twice_modulus_0] "m"(twice_modulus_0),
          [twice_modulus_1] "m"(twice_modulus_1),
          [twice_modulus_2] "m"(twice_modulus_2),
          [twice_modulus_3] "m"(twice_modulus_3)
        : "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
}

template <class T> void field<T>::asm_conditional_negate(field& r, const uint64_t predicate) noexcept
{
    __asm__(CLEAR_FLAGS("%%r8") LOAD_FIELD_ELEMENT(
                "%1", "%%r8", "%%r9", "%%r10", "%%r11") "movq %[modulus_0], %%r12 \n\t"
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
                                                        "cmovcq %%r15, %%r11 \n\t" STORE_FIELD_ELEMENT(
                                                            "%1", "%%r8", "%%r9", "%%r10", "%%r11")
            :
            : "r"(predicate),
              "r"(&r),
              [modulus_0] "i"(T::modulus_0),
              [modulus_1] "i"(T::modulus_1),
              [modulus_2] "i"(T::modulus_2),
              [modulus_3] "i"(T::modulus_3)
            : "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
}

template <class T> field<T> field<T>::asm_reduce_once(const field& a) noexcept
{
    field r;
    constexpr uint64_t not_modulus_3 = T::not_modulus_3;
    constexpr uint64_t not_modulus_2 = T::not_modulus_2;
    constexpr uint64_t not_modulus_1 = T::not_modulus_1;
    constexpr uint64_t not_modulus_0 = T::not_modulus_0;
    __asm__(CLEAR_FLAGS("%%r12") LOAD_FIELD_ELEMENT("%0", "%%r12", "%%r13", "%%r14", "%%r15")
                REDUCE_FIELD_ELEMENT("%[not_modulus_0]", "%[not_modulus_1]", "%[not_modulus_2]", "%[not_modulus_3]")
                    STORE_FIELD_ELEMENT("%1", "%%r12", "%%r13", "%%r14", "%%r15")
            :
            : "r"(&a),
              "r"(&r),
              [not_modulus_0] "m"(not_modulus_0),
              [not_modulus_1] "m"(not_modulus_1),
              [not_modulus_2] "m"(not_modulus_2),
              [not_modulus_3] "m"(not_modulus_3)
            : "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
    return r;
}

template <class T> void field<T>::asm_self_reduce_once(const field& a) noexcept
{
    constexpr uint64_t not_modulus_3 = T::not_modulus_3;
    constexpr uint64_t not_modulus_2 = T::not_modulus_2;
    constexpr uint64_t not_modulus_1 = T::not_modulus_1;
    constexpr uint64_t not_modulus_0 = T::not_modulus_0;
    __asm__(CLEAR_FLAGS("%%r12") LOAD_FIELD_ELEMENT("%0", "%%r12", "%%r13", "%%r14", "%%r15")
                REDUCE_FIELD_ELEMENT("%[not_modulus_0]", "%[not_modulus_1]", "%[not_modulus_2]", "%[not_modulus_3]")
                    STORE_FIELD_ELEMENT("%0", "%%r12", "%%r13", "%%r14", "%%r15")
            :
            : "r"(&a),
              [not_modulus_0] "m"(not_modulus_0),
              [not_modulus_1] "m"(not_modulus_1),
              [not_modulus_2] "m"(not_modulus_2),
              [not_modulus_3] "m"(not_modulus_3)
            : "%r8", "%r9", "%r10", "%r11", "%r12", "%r13", "%r14", "%r15", "cc", "memory");
}
#endif
/**
 *
 * Mutiplication
 *
 **/
template <class T> constexpr field<T> field<T>::operator*(const field& other) const noexcept
{
    if (NO_ASM) {
        return montgomery_reduce(mul_512(other)).subtract(modulus);
    } else {
        return asm_mul(*this, other);
    }
}

template <class T> constexpr field<T> field<T>::mul_with_coarse_reduction(const field& other) const noexcept
{
    if (NO_ASM) {
        return montgomery_reduce(mul_512(other));
    } else {
        return asm_mul_with_coarse_reduction(*this, other);
    }
}

template <class T> constexpr void field<T>::self_mul(const field& other) noexcept
{
    if (NO_ASM) {
        *this = operator*(other);
    } else {
        asm_self_mul(*this, other);
    }
}

template <class T> constexpr void field<T>::self_mul_with_coarse_reduction(const field& other) noexcept
{
    if (NO_ASM) {
        *this = montgomery_reduce(mul_512(other));
    } else {
        asm_self_mul_with_coarse_reduction(*this, other);
    }
}

/**
 *
 * Squaring
 *
 **/
template <class T> constexpr field<T> field<T>::sqr() const noexcept
{
    if (NO_ASM) {
        return operator*(*this);
    } else {
        return asm_sqr(*this);
    }
}

template <class T> constexpr field<T> field<T>::sqr_with_coarse_reduction() const noexcept
{
    if (NO_ASM) {
        return montgomery_reduce(mul_512(*this));
    } else {
        return asm_sqr_with_coarse_reduction(*this);
    }
}

template <class T> constexpr void field<T>::self_sqr() noexcept
{
    if (NO_ASM) {
        *this = sqr();
    } else {
        asm_self_sqr(*this);
    }
}

template <class T> constexpr void field<T>::self_sqr_with_coarse_reduction() noexcept
{
    if (NO_ASM) {
        *this = montgomery_reduce(mul_512(*this));
    } else {
        asm_self_sqr_with_coarse_reduction(*this);
    }
}

/**
 *
 * Addition
 *
 **/

template <class T> constexpr field<T> field<T>::add_without_reduction(const field& other) const noexcept
{
    if (NO_ASM) {
        const auto [r0, c0] = addc(data[0], other.data[0], 0);
        const auto [r1, c1] = addc(data[1], other.data[1], c0);
        const auto [r2, c2] = addc(data[2], other.data[2], c1);
        const auto r3 = addc_discard_hi(data[3], other.data[3], c2);
        return field{ r0, r1, r2, r3 };
    } else {
        return asm_add_without_reduction(*this, other);
    }
}

template <class T> constexpr field<T> field<T>::operator+(const field& other) const noexcept
{
    if (NO_ASM) {
        return add_without_reduction(other).subtract(modulus);
    } else {
        return asm_add(*this, other);
    }
}

template <class T> constexpr field<T> field<T>::add_with_coarse_reduction(const field& other) const noexcept
{
    if (NO_ASM) {
        return add_without_reduction(other).subtract_coarse(twice_modulus);
    } else {
        return asm_add_with_coarse_reduction(*this, other);
    }
}

template <class T> constexpr void field<T>::self_add_without_reduction(const field& other) noexcept
{
    if (NO_ASM) {
        *this = add_without_reduction(other);
    } else {
        asm_self_add_without_reduction(*this, other);
    }
}

template <class T> constexpr void field<T>::self_add(const field& other) noexcept
{
    if (NO_ASM) {
        (*this) = operator+(other);
    } else {
        asm_self_add(*this, other);
    }
}

template <class T> constexpr void field<T>::self_add_with_coarse_reduction(const field& other) noexcept
{
    if (NO_ASM) {
        *this = add_without_reduction(other).subtract_coarse(twice_modulus);
    } else {
        asm_self_add_with_coarse_reduction(*this, other);
    }
}

/**
 *
 * Subtraction
 *
 **/
template <class T> constexpr field<T> field<T>::operator-(const field& other) const noexcept
{
    if (NO_ASM) {
        return subtract(other);
    } else {
        return asm_sub(*this, other);
    }
}

template <class T> constexpr field<T> field<T>::sub_with_coarse_reduction(const field& other) const noexcept
{
    if (NO_ASM) {
        return subtract_coarse(other);
    } else {
        return asm_sub_with_coarse_reduction(*this, other);
    }
}

template <class T> constexpr void field<T>::self_sub(const field& other) noexcept
{
    if (NO_ASM) {
        *this = subtract(other);
    } else {
        asm_self_sub(*this, other);
    }
}

template <class T> constexpr void field<T>::self_sub_with_coarse_reduction(const field& other) noexcept
{
    if (NO_ASM) {
        *this = subtract_coarse(other);
    } else {
        asm_self_sub_with_coarse_reduction(*this, other);
    }
}

template <class T> constexpr bool field<T>::operator>(const field& other) const noexcept
{
    const bool t0 = data[3] > other.data[3];
    const bool t1 = (data[3] == other.data[3]) && (data[2] > other.data[2]);
    const bool t2 = (data[3] == other.data[3]) && (data[2] == other.data[2]) && (data[1] > other.data[1]);
    const bool t3 = (data[3] == other.data[3]) && (data[2] == other.data[2]) && (data[1] == other.data[1]) &&
                    (data[0] > other.data[0]);
    return (t0 || t1 || t2 || t3);
}

template <class T> constexpr bool field<T>::operator<(const field& other) const noexcept
{
    return (other > *this);
}

template <class T> constexpr bool field<T>::operator==(const field& other) const noexcept
{
    return (data[0] == other.data[0]) && (data[1] == other.data[1]) && (data[2] == other.data[2]) &&
           (data[3] == other.data[3]);
}

template <class T> constexpr bool field<T>::operator!=(const field& other) const noexcept
{
    return (!operator==(other));
}

template <class T> constexpr field<T> field<T>::to_montgomery_form() const noexcept
{
    field result = *this;
    result.reduce_once();
    result.reduce_once();
    result.reduce_once();
    return result * r_squared;
}

template <class T> constexpr field<T> field<T>::from_montgomery_form() const noexcept
{
    return operator*(one_raw);
}

template <class T> constexpr void field<T>::self_to_montgomery_form() noexcept
{
    self_reduce_once();
    self_reduce_once();
    self_reduce_once();
    self_mul(r_squared);
}

template <class T> constexpr void field<T>::self_from_montgomery_form() noexcept
{
    self_mul(one_raw);
}

template <class T> constexpr field<T> field<T>::reduce_once() const noexcept
{
    if (NO_ASM) {
        return subtract(modulus);
    } else {
        return asm_reduce_once(*this);
    }
}

template <class T> constexpr void field<T>::self_reduce_once() noexcept
{
    if (NO_ASM) {
        *this = subtract(modulus);
    } else {
        asm_self_reduce_once(*this);
    }
}

template <class T> field<T> constexpr field<T>::neg() const noexcept
{
    return modulus - *this;
}

template <class T> constexpr void field<T>::self_neg() noexcept
{
    *this = modulus - *this;
}

template <class T> constexpr void field<T>::self_conditional_negate(const uint64_t predicate) noexcept
{
    if (NO_ASM) {
        *this = predicate ? neg() : *this;
    } else {
        asm_conditional_negate(*this, predicate);
    }
}

template <class T> constexpr field<T> field<T>::pow(const field& exponent) const noexcept
{
    if (*this == zero) {
        return zero;
    }
    if (exponent == zero) {
        return one;
    }
    if (exponent == one) {
        return *this;
    }

    field accumulator{ data[0], data[1], data[2], data[3] };
    const uint64_t maximum_set_bit = exponent.get_msb();

    for (uint64_t i = maximum_set_bit - 1; i < maximum_set_bit; --i) {
        accumulator.self_sqr_with_coarse_reduction();
        if (exponent.get_bit(i)) {
            accumulator.self_mul_with_coarse_reduction(*this);
        }
    }
    return accumulator.reduce_once();
}

template <class T> constexpr field<T> field<T>::pow(const uint64_t exponent) const noexcept
{
    return pow({ exponent, 0, 0, 0 });
}

template <class T> constexpr field<T> field<T>::invert() const noexcept
{
    return pow(modulus_minus_two);
}

template <class T> constexpr void field<T>::self_invert() noexcept
{
    *this = pow(modulus_minus_two);
}

template <class T> constexpr field<T> field<T>::tonelli_shanks_sqrt() const noexcept
{
    // Tonelli-shanks algorithm begins by finding a field element Q and integer S,
    // such that (p - 1) = Q.2^{s}

    // We can compute the square root of a, by considering a^{(Q + 1) / 2} = R
    // Once we have found such an R, we have
    // R^{2} = a^{Q + 1} = a^{Q}a
    // If a^{Q} = 1, we have found our square root.
    // Otherwise, we have a^{Q} = t, where t is a 2^{s-1}'th root of unity.
    // This is because t^{2^{s-1}} = a^{Q.2^{s-1}}.
    // We know that (p - 1) = Q.w^{s}, therefore t^{2^{s-1}} = a^{(p - 1) / 2}
    // From Euler's criterion, if a is a quadratic residue, a^{(p - 1) / 2} = 1
    // i.e. t^{2^{s-1}} = 1

    // To proceed with computing our square root, we want to transform t into a smaller subgroup,
    // specifically, the (s-2)'th roots of unity.
    // We do this by finding some value b,such that
    // (t.b^2)^{2^{s-2}} = 1 and R' = R.b
    // Finding such a b is trivial, because from Euler's criterion, we know that,
    // for any quadratic non-residue z, z^{(p - 1) / 2} = -1
    // i.e. z^{Q.2^{s-1}} = -1
    // => z^Q is a 2^{s-1}'th root of -1
    // => z^{Q^2} is a 2^{s-2}'th root of -1
    // Since t^{2^{s-1}} = 1, we know that t^{2^{s - 2}} = -1
    // => t.z^{Q^2} is a 2^{s - 2}'th root of unity.

    // We can iteratively transform t into ever smaller subgroups, until t = 1.
    // At each iteration, we need to find a new value for b, which we can obtain
    // by repeatedly squaring z^{Q}
    field Q_minus_one_over_two{
        { T::Q_minus_one_over_two_0, T::Q_minus_one_over_two_1, T::Q_minus_one_over_two_2, T::Q_minus_one_over_two_3 }
    };
    // __to_montgomery_form(Q_minus_one_over_two, Q_minus_one_over_two);
    field z = multiplicative_generator; // the generator is a non-residue
    field b = pow(Q_minus_one_over_two);
    field r = operator*(b); // r = a^{(Q + 1) / 2}
    field t = r * b;        // t = a^{(Q - 1) / 2 + (Q + 1) / 2} = a^{Q}

    // check if t is a square with euler's criterion
    // if not, we don't have a quadratic residue and a has no square root!
    field check = t;
    for (size_t i = 0; i < T::primitive_root_log_size - 1; ++i) {
        check.self_sqr();
    }
    if (check != one) {
        return zero;
    }
    field t1 = z.pow(Q_minus_one_over_two);
    field t2 = t1 * z;
    field c = t2 * t1; // z^Q

    size_t m = T::primitive_root_log_size;
    while (t != one) {
        size_t i = 0;
        field t2m = t;

        // find the smallest value of m, such that t^{2^m} = 1
        while (t2m != one) {
            t2m.self_sqr();
            i += 1;
        }

        size_t j = m - i - 1;
        b = c;
        while (j > 0) {
            b.self_sqr();
            --j;
        } // b = z^2^(m-i-1)

        c = b.sqr();
        t = t * c;
        r = r * b;
        m = i;
    }
    return r;
}

template <class T> constexpr field<T> field<T>::sqrt() const noexcept
{
    if constexpr ((T::modulus_0 & 0x3UL) == 0x3UL) {
        return pow(sqrt_exponent);
    } else {
        return tonelli_shanks_sqrt();
    }
}

template <class T> constexpr void field<T>::self_sqrt() noexcept
{
    *this = sqrt();
}

template <class T> constexpr field<T> field<T>::operator/(const field& other) const noexcept
{
    return operator*(other.invert());
}

template <class T> constexpr uint64_t field<T>::get_msb() const noexcept
{
    constexpr auto get_uint64_msb = [](const uint64_t in) {
        constexpr uint8_t de_bruijn_sequence[64]{ 0,  47, 1,  56, 48, 27, 2,  60, 57, 49, 41, 37, 28, 16, 3,  61,
                                                  54, 58, 35, 52, 50, 42, 21, 44, 38, 32, 29, 23, 17, 11, 4,  62,
                                                  46, 55, 26, 59, 40, 36, 15, 53, 34, 51, 20, 43, 31, 22, 10, 45,
                                                  25, 39, 14, 33, 19, 30, 9,  24, 13, 18, 8,  12, 7,  6,  5,  63 };

        uint64_t t = in | (in >> 1);
        t |= t >> 2;
        t |= t >> 4;
        t |= t >> 8;
        t |= t >> 16;
        t |= t >> 32;
        return static_cast<uint64_t>(de_bruijn_sequence[(t * 0x03F79D71B4CB0A89ULL) >> 58ULL]);
    };

    uint64_t idx = get_uint64_msb(data[3]);
    idx = idx == 0 ? get_uint64_msb(data[2]) : idx + 64;
    idx = idx == 0 ? get_uint64_msb(data[1]) : idx + 64;
    idx = idx == 0 ? get_uint64_msb(data[0]) : idx + 64;
    return idx;
}

template <class T> constexpr void field<T>::self_set_msb() noexcept
{
    data[3] = 0ULL | (1ULL << 63ULL);
}

template <class T> constexpr bool field<T>::is_msb_set() const noexcept
{
    return (data[3] >> 63ULL) == 1ULL;
}

template <class T> constexpr uint64_t field<T>::is_msb_set_word() const noexcept
{
    return (data[3] >> 63ULL);
}

template <class T> constexpr bool field<T>::get_bit(const uint64_t bit_index) const noexcept
{
    return bool((data[bit_index >> 6] >> (bit_index & 63)) & 1);
}

template <class T> constexpr bool field<T>::is_zero() const noexcept
{
    return ((data[0] | data[1] | data[2] | data[3]) == 0);
}

template <class T> constexpr field<T> field<T>::get_root_of_unity(const size_t subgroup_size) noexcept
{
    field r = root_of_unity;
    for (size_t i = T::primitive_root_log_size; i > subgroup_size; --i) {
        r.self_sqr();
    }
    return r;
}
} // namespace test