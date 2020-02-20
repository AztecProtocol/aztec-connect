#pragma once

#include <stdint.h>

namespace test {
template <class base_field, class Params> struct field2 {
  public:
    typename base_field::field_t c0;
    typename base_field::field_t c1;

    constexpr field2 operator*(const field2& other) const noexcept;
    constexpr field2 operator+(const field2& other) const noexcept;
    constexpr field2 operator-(const field2& other) const noexcept;
    constexpr field2 operator/(const field2& other) const noexcept;

    // constexpr bool operator>(const field& other) const noexcept;
    // constexpr bool operator<(const field& other) const noexcept;
    constexpr bool operator==(const field2& other) const noexcept;

    constexpr field2 sqr() const noexcept;
    constexpr field2 neg() const noexcept;
    constexpr field2 pow(const field2& exponent) const noexcept;
    constexpr field2 invert() const noexcept;

    constexpr field2 mul_with_coarse_reduction(const field2& other) const noexcept;
    constexpr field2 sqr_with_coarse_reduction() const noexcept;
    constexpr field2 add_without_reduction(const field2& other) const noexcept;
    constexpr field2 add_with_coarse_reduction(const field2& other) const noexcept;
    constexpr field2 sub_with_coarse_reduction(const field2& other) const noexcept;

    constexpr void self_mul_with_coarse_reduction(const field2& other) noexcept;
    constexpr void self_sqr_with_coarse_reduction() noexcept;
    constexpr void self_add_without_reduction(const field2& other) noexcept;
    constexpr void self_add_with_coarse_reduction(const field2& other) noexcept;
    constexpr void self_sub_with_coarse_reduction(const field2& other) noexcept;

    constexpr void self_mul(const field2& other) noexcept;
    constexpr void self_sqr() noexcept;
    constexpr void self_add(const field2& other) noexcept;
    constexpr void self_sub(const field2& other) noexcept;
    constexpr void self_neg() noexcept;
    constexpr void self_invert() noexcept;

    constexpr field2 to_montgomery_form() const noexcept;
    constexpr field2 from_montgomery_form() const noexcept;

    constexpr void self_to_montgomery_form() noexcept;
    constexpr void self_from_montgomery_form() noexcept;

    constexpr void self_conditional_negate(const uint64_t predicate) noexcept;

    constexpr field2 reduce_once() const noexcept;
    constexpr void self_reduce_once() noexcept;

    constexpr bool is_zero() const noexcept;

    constexpr field2 frobenius_map() const noexcept;
    constexpr void self_frobenius_map() noexcept;
};
} // namespace test

#include "new_field2_impl.hpp"