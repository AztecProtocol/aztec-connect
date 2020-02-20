#pragma once

#include <stdint.h>

namespace test {
template <class base, class T> constexpr field2<base, T> field2<base, T>::operator*(const field2& other) const noexcept
{
    typename base::field_t t1 = c0 * other.c0;
    typename base::field_t t2 = c1 * other.c1;
    typename base::field_t t3 = c0 + c1;
    typename base::field_t t4 = other.c0 + other.c1;

    return { t1 - t2, t3 * t4 - (t1 + t2) };
}

template <class base, class T> constexpr field2<base, T> field2<base, T>::operator+(const field2& other) const noexcept
{
    return { c0 + other.c0, c1 + other.c1 };
}

template <class base, class T> constexpr field2<base, T> field2<base, T>::operator-(const field2& other) const noexcept
{
    return { c0 - other.c0, c1 - other.c1 };
}

template <class base, class T> constexpr field2<base, T> field2<base, T>::operator/(const field2& other) const noexcept
{
    return operator*(other.invert());
}

template <class base, class T> constexpr field2<base, T> field2<base, T>::sqr() const noexcept
{
    typename base::field_t t1 = (c0 * c1);
    return { (c0 + c1) * (c0 - c1), t1 + t1 };
}

template <class base, class T>
constexpr field2<base, T> field2<base, T>::mul_with_coarse_reduction(const field2& other) const noexcept
{
    return operator*(other);
    // typename base::field_t t1(c0.mul_with_coarse_reduction(other.c0));
    // typename base::field_t t2(c1.mul_with_coarse_reduction(other.c1));
    // typename base::field_t t3(c0.add_without_reduction(c1));
    // typename base::field_t t4(other.c0.add_without_reduction(other.c1));

    // return { t1.sub_with_coarse_reduction(t2),
    //          (t3.mul_with_coarse_reduction(t4)).sub_with_coarse_reduction(t1.add_with_coarse_reduction(t2)) };
}

template <class base, class T> constexpr field2<base, T> field2<base, T>::sqr_with_coarse_reduction() const noexcept
{
    return sqr();
    // typename base::field_t t1(c0.mul_with_coarse_reduction(c1));
    // return { (c0.add_with_coarse_reduction(c1)).mul_with_coarse_reduction(c0 - c1), t1.add_with_coarse_reduction(t1)
    // };
}

template <class base, class T>
constexpr field2<base, T> field2<base, T>::add_with_coarse_reduction(const field2& other) const noexcept
{
    return operator+(other);
    // return { c0.add_with_coarse_reduction(other.c0), c1.add_with_coarse_reduction(other.c1) };
}

template <class base, class T>
constexpr field2<base, T> field2<base, T>::add_without_reduction(const field2& other) const noexcept
{
    return operator+(other);
    // return { c0.add_without_reduction(other.c0), c1.add_without_reduction(other.c1) };
}

template <class base, class T>
constexpr field2<base, T> field2<base, T>::sub_with_coarse_reduction(const field2& other) const noexcept
{
    return operator-(other);
    // return { c0.sub_with_coarse_reduction(other.c0), c1.sub_with_coarse_reduction(other.c1) };
}

template <class base, class T>
constexpr void field2<base, T>::self_mul_with_coarse_reduction(const field2& other) noexcept
{
    *this = mul_with_coarse_reduction(other);
}

template <class base, class T> constexpr void field2<base, T>::self_sqr_with_coarse_reduction() noexcept
{
    *this = sqr_with_coarse_reduction();
}

template <class base, class T>
constexpr void field2<base, T>::self_add_with_coarse_reduction(const field2& other) noexcept
{
    *this = add_with_coarse_reduction(other);
}

template <class base, class T> constexpr void field2<base, T>::self_add_without_reduction(const field2& other) noexcept
{
    *this = add_without_reduction(other);
}

template <class base, class T>
constexpr void field2<base, T>::self_sub_with_coarse_reduction(const field2& other) noexcept
{
    *this = sub_with_coarse_reduction(other);
}

template <class base, class T> constexpr void field2<base, T>::self_mul(const field2& other) noexcept
{
    *this = operator*(other);
}

template <class base, class T> constexpr void field2<base, T>::self_sqr() noexcept
{
    *this = sqr();
}

template <class base, class T> constexpr void field2<base, T>::self_add(const field2& other) noexcept
{
    *this = operator+(other);
}

template <class base, class T> constexpr void field2<base, T>::self_sub(const field2& other) noexcept
{
    *this = operator-(other);
}

template <class base, class T> constexpr field2<base, T> field2<base, T>::to_montgomery_form() const noexcept
{
    return { c0.to_montgomery_form(), c1.to_montgomery_form() };
}

template <class base, class T> constexpr field2<base, T> field2<base, T>::from_montgomery_form() const noexcept
{
    return { c0.from_montgomery_form(), c1.from_montgomery_form() };
}

template <class base, class T> constexpr void field2<base, T>::self_to_montgomery_form() noexcept
{
    c0.self_to_montgomery_form();
    c1.self_to_montgomery_form();
}

template <class base, class T> constexpr void field2<base, T>::self_from_montgomery_form() noexcept
{
    c0.self_from_montgomery_form();
    c1.self_from_montgomery_form();
}

template <class base, class T> constexpr field2<base, T> field2<base, T>::reduce_once() const noexcept
{
    return *this;
    // return { c0.reduce_once(), c1.reduce_once() };
}

template <class base, class T> constexpr void field2<base, T>::self_reduce_once() noexcept
{
    // c0.self_reduce_once();
    // c1.self_reduce_once();
}

template <class base, class T> constexpr field2<base, T> field2<base, T>::neg() const noexcept
{
    return { c0.neg(), c1.neg() };
}

template <class base, class T> constexpr void field2<base, T>::self_neg() noexcept
{
    c0.self_neg();
    c1.self_neg();
}

template <class base, class T> constexpr field2<base, T> field2<base, T>::invert() const noexcept
{
    typename base::field_t t3 = (c0.sqr() + c1.sqr()).invert();
    return { c0 * t3, (c1 * t3).neg() };
}

template <class base, class T> constexpr void field2<base, T>::self_invert() noexcept
{
    *this = invert();
}

template <class base, class T>
constexpr void field2<base, T>::self_conditional_negate(const uint64_t predicate) noexcept
{
    *this = predicate ? neg() : *this;
}

template <class base, class T> constexpr bool field2<base, T>::is_zero() const noexcept
{
    return (c0.is_zero() && c1.is_zero());
}

template <class base, class T> constexpr bool field2<base, T>::operator==(const field2& other) const noexcept
{
    return (c0 == other.c0) && (c1 == other.c1);
}

template <class base, class T> constexpr field2<base, T> field2<base, T>::frobenius_map() const noexcept
{
    return { c0, c1.neg() };
}

template <class base, class T> constexpr void field2<base, T>::self_frobenius_map() noexcept
{
    c1.self_neg();
}
} // namespace test