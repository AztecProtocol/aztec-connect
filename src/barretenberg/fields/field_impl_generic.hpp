#pragma once

namespace barretenberg
{
template <class T>
constexpr std::pair<uint64_t, uint64_t> field<T>::mul_wide(const uint64_t a, const uint64_t b) noexcept
{
#if defined(__SIZEOF_INT128__) && !defined(__wasm__)
    const uint128_t res = ((uint128_t)a * (uint128_t)b);
    return { (uint64_t)(res & lo_mask), (uint64_t)(res >> 64) };
#else
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
#endif
}

template <class T>
constexpr std::pair<uint64_t, uint64_t> field<T>::mac(const uint64_t a,
                                                      const uint64_t b,
                                                      const uint64_t c,
                                                      const uint64_t carry_in) noexcept
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
constexpr std::pair<uint64_t, uint64_t> field<T>::mac_mini(const uint64_t a,
                                                           const uint64_t b,
                                                           const uint64_t c) noexcept
{
#if defined(__SIZEOF_INT128__) && !defined(__wasm__)
    const uint128_t res = (uint128_t)a + ((uint128_t)b * (uint128_t)c);
    return { (uint64_t)(res & lo_mask), (uint64_t)(res >> 64) };
#else
    auto result = mul_wide(b, c, r, carry_out);
    result.first += a;
    const uint64_t overflow_c = (result.first < a);
    result.second += (overflow_c);
    return result;
#endif
}

template <class T>
constexpr uint64_t field<T>::mac_discard_hi(const uint64_t a,
                                            const uint64_t b,
                                            const uint64_t c,
                                            const uint64_t carry_in) noexcept
{
    return (b * c) + a + carry_in;
}

template <class T>
constexpr uint64_t field<T>::mac_discard_lo(const uint64_t a,
                                            const uint64_t b,
                                            const uint64_t c,
                                            const uint64_t carry_in) noexcept
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
                                                       const uint64_t carry_in) noexcept
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
constexpr std::pair<uint64_t, uint64_t> field<T>::addc_mini(const uint64_t a, const uint64_t b) noexcept
{
#if defined(__SIZEOF_INT128__) && !defined(__wasm__)
    uint128_t res = (uint128_t)a + (uint128_t)b;
    return { (uint64_t)(res & lo_mask), (uint64_t)(res >> 64) };
#else
    uint64_t r = a + b;
    return { r, uint64_t(r < a) };
#endif
}

template <class T>
constexpr uint64_t field<T>::addc_discard_hi(const uint64_t a, const uint64_t b, const uint64_t carry_in) noexcept
{
    return a + b + carry_in;
}

template <class T>
constexpr std::pair<uint64_t, uint64_t> field<T>::sbb(const uint64_t a,
                                                      const uint64_t b,
                                                      const uint64_t borrow_in) noexcept
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
constexpr uint64_t field<T>::sbb_discard_hi(const uint64_t a, const uint64_t b, const uint64_t borrow_in) noexcept
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

    const auto [r4, c0] = addc(r0, twice_modulus.data[0] & t3, 0);
    const auto [r5, c1] = addc(r1, twice_modulus.data[1] & t3, c0);
    const auto [r6, c2] = addc(r2, twice_modulus.data[2] & t3, c1);
    const auto r7 = addc_discard_hi(r3, twice_modulus.data[3] & t3, c2);
    return { r4, r5, r6, r7 };
}

template <class T> constexpr field<T> field<T>::montgomery_reduce(const wide_array& r) noexcept
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
    const auto [r0, t0] = mul_wide(data[0], other.data[0]);
    const auto [q0, t1] = mac_mini(t0, data[0], other.data[1]);
    const auto [q1, t2] = mac_mini(t1, data[0], other.data[2]);
    const auto [q2, z0] = mac_mini(t2, data[0], other.data[3]);

    const auto [r1, t3] = mac_mini(q0, data[1], other.data[0]);
    const auto [q3, t4] = mac(q1, data[1], other.data[1], t3);
    const auto [q4, t5] = mac(q2, data[1], other.data[2], t4);
    const auto [q5, z1] = mac(z0, data[1], other.data[3], t5);

    const auto [r2, t6] = mac_mini(q3, data[2], other.data[0]);
    const auto [q6, t7] = mac(q4, data[2], other.data[1], t6);
    const auto [q7, t8] = mac(q5, data[2], other.data[2], t7);
    const auto [q8, z2] = mac(z1, data[2], other.data[3], t8);

    const auto [r3, t9] = mac_mini(q6, data[3], other.data[0]);
    const auto [r4, t10] = mac(q7, data[3], other.data[1], t9);
    const auto [r5, t11] = mac(q8, data[3], other.data[2], t10);
    const auto [r6, r7] = mac(z2, data[3], other.data[3], t11);

    return { r0, r1, r2, r3, r4, r5, r6, r7 };
}

template <class T>
constexpr class field<T>::wide_array field<T>::sqr_512() const noexcept {
    const auto [r0, aa1] = mul_wide(data[0], data[0]);
    const auto [ab0, ab1] = mul_wide(data[0], data[1]);

    const auto [r1, c0] = addc(ab0, ab0, aa1);

    const auto [ac0, ac1] = mul_wide(data[0], data[2]);
    const auto [bb0, bb1] = mac(ac0, data[1], data[1], ac0);
    const auto [t0, c1a] = addc(ab1, ab1, c0);
    const auto [r2, c1b] = addc_mini(t0, bb0);

    const auto [ad0, ad1] = mac_mini(ac1, data[0], data[3]);
    const auto [bc0, bc1] = mul_wide(data[1], data[2]);
    const auto [t1, c3a] = addc(bb1, c1a + c1b, ad0);
    const auto [t2, c3b] = addc(t1, ad0, bc0);
    const auto [r3, c3c] = addc_mini(t2, bc0);

    const auto [bd0, bd1] = mac(bc1, data[1], data[3], ad1);
    const auto [cc0, cc1] = mul_wide(data[2], data[2]);
    const auto [t3, c4a] = addc(bd0, bd0, c3a + c3b + c3c);
    const auto [r4, c4b] = addc_mini(cc0, t3);

    const auto [cd0, cd1] = mac_mini(bd1, data[2], data[3]);
    const auto [t4, c5a] = addc(cd0, cd0, cc1);
    const auto [r5, c5b] = addc_mini(t4, c4a + c4b);

    const auto [dd0, dd1] = mac_mini(cd1, data[3], data[3]);
    const auto [r6, t5] = addc(dd0, c5a + c5b, cd1);
    const auto r7 = addc_discard_hi(t5, dd1, 0ULL);
    return { r0, r1, r2, r3, r4, r5, r6, r7 };
}
}