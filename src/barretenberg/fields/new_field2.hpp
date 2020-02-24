#pragma once

#include <random>
#include <stdint.h>

namespace test {
template <class base_field, class Params> struct field2 {
  public:
    base_field c0;
    base_field c1;

    static constexpr field2 zero{ base_field::zero, base_field::zero };
    static constexpr field2 one{ base_field::one, base_field::zero };
    static constexpr field2 twist_coeff_b{ Params::twist_coeff_b_0, Params::twist_coeff_b_1 };
    static constexpr field2 twist_mul_by_q_x{ Params::twist_mul_by_q_x_0, Params::twist_mul_by_q_x_1 };
    static constexpr field2 twist_mul_by_q_y{ Params::twist_mul_by_q_y_0, Params::twist_mul_by_q_y_1 };
    static constexpr field2 twist_cube_root{ Params::twist_cube_root_0, Params::twist_cube_root_1 };

    constexpr field2 operator*(const field2& other) const noexcept;
    constexpr field2 operator+(const field2& other) const noexcept;
    constexpr field2 operator-(const field2& other) const noexcept;
    constexpr field2 operator-() const noexcept;
    constexpr field2 operator/(const field2& other) const noexcept;

    constexpr field2 operator*=(const field2& other) noexcept;
    constexpr field2 operator+=(const field2& other) noexcept;
    constexpr field2 operator-=(const field2& other) noexcept;
    constexpr field2 operator/=(const field2& other) noexcept;

    constexpr field2 mul_by_fq(const base_field& a) const noexcept
    {
        field2 r{ a * c0, a * c1 };
        return r;
    }

    // constexpr bool operator>(const field& other) const noexcept;
    // constexpr bool operator<(const field& other) const noexcept;
    constexpr bool operator==(const field2& other) const noexcept;

    constexpr field2 sqr() const noexcept;
    constexpr void self_sqr() noexcept;
    constexpr field2 invert() const noexcept;

    constexpr void self_neg() noexcept;
    constexpr field2 to_montgomery_form() const noexcept;
    constexpr field2 from_montgomery_form() const noexcept;

    constexpr void self_to_montgomery_form() noexcept;
    constexpr void self_from_montgomery_form() noexcept;

    constexpr void self_conditional_negate(const uint64_t predicate) noexcept;

    constexpr field2 reduce_once() const noexcept;
    constexpr void self_reduce_once() noexcept;

    constexpr void self_set_msb() noexcept;
    constexpr bool is_msb_set() const noexcept;
    constexpr uint64_t is_msb_set_word() const noexcept;

    constexpr bool is_zero() const noexcept;

    constexpr field2 frobenius_map() const noexcept;
    constexpr void self_frobenius_map() noexcept;

    static field2 random_element(std::mt19937_64* engine = nullptr, std::uniform_int_distribution<uint64_t>* dist = nullptr);
    static void serialize_to_buffer(const field2& value, uint8_t* buffer)
    {
        base_field::serialize_to_buffer(value.c0, buffer);
        base_field::serialize_to_buffer(value.c1, buffer + sizeof(base_field));
    }

    static field2 serialize_from_buffer(uint8_t* buffer)
    {
        field2 result{ base_field::zero, base_field::zero };
        result.c0 = base_field::serialize_from_buffer(buffer);
        result.c1 = base_field::serialize_from_buffer(buffer + sizeof(base_field));

        return result;
    }
};
} // namespace test

#include "new_field2_impl.hpp"