#pragma once

#include "../types.hpp"
#include "../uint256/uint256.hpp"
#include "wnaf.hpp"
#include <array>
#include <random>

#include "./affine_group.hpp"
namespace barretenberg {
namespace test {
template <class Fq, class Fr, class Params> class alignas(32) element {
  public:
    static constexpr element one{ Params::one_x, Params::one_y, Fq::one };
    static constexpr element point_at_infinity = one.set_infinity();
    element() noexcept {}

    constexpr element(const Fq& a, const Fq& b, const Fq& c) noexcept;
    constexpr element(const element& other) noexcept;
    constexpr element(element&& other) noexcept;
    constexpr element(const affine_element<Fq, Fr, Params>& other) noexcept;

    constexpr element& operator=(const element& other) noexcept;
    constexpr element& operator=(element&& other) noexcept;

    explicit constexpr operator affine_element<Fq, Fr, Params>() noexcept;

    static element random_element(std::mt19937_64* engine = nullptr,
                                  std::uniform_int_distribution<uint64_t>* dist = nullptr) noexcept;

    static element hash_to_curve(uint64_t seed) noexcept;

    constexpr element dbl() const noexcept;
    constexpr void self_dbl() noexcept;
    constexpr void self_mixed_add_or_sub(const affine_element<Fq, Fr, Params>& other,
                                         const uint64_t predicate) noexcept;

    constexpr element operator+(const element& other) const noexcept;
    constexpr element operator+(const affine_element<Fq, Fr, Params>& other) const noexcept;
    constexpr element operator+=(const element& other) noexcept;
    constexpr element operator+=(const affine_element<Fq, Fr, Params>& other) noexcept;

    constexpr element operator-(const element& other) const noexcept;
    constexpr element operator-(const affine_element<Fq, Fr, Params>& other) const noexcept;
    constexpr element operator-() const noexcept;
    constexpr element operator-=(const element& other) noexcept;
    constexpr element operator-=(const affine_element<Fq, Fr, Params>& other) noexcept;

    friend constexpr element operator+(const affine_element<Fq, Fr, Params>& left, const element& right) noexcept
    {
        return right + left;
    }
    friend constexpr element operator-(const affine_element<Fq, Fr, Params>& left, const element& right) noexcept
    {
        return -right + left;
    }

    element operator*(const Fr& other) const noexcept;
    element operator*=(const Fr& other) noexcept;

    friend element operator*(const Fr& exponent, const element& base) noexcept { return base * exponent; }

    // constexpr Fr operator/(const element& other) noexcept {} TODO: this one seems harder than the others...

    constexpr element set_infinity() const noexcept;
    constexpr void self_set_infinity() noexcept;
    constexpr bool is_point_at_infinity() const noexcept;
    constexpr bool on_curve() const noexcept;
    constexpr bool operator==(const element& other) const noexcept;

    Fq x;
    Fq y;
    Fq z;

  private:
    element mul_without_endomorphism(const Fr& exponent) const noexcept;
    element mul_with_endomorphism(const Fr& exponent) const noexcept;
    static element random_coordinates_on_curve(std::mt19937_64* engine = nullptr,
                                               std::uniform_int_distribution<uint64_t>* dist = nullptr) noexcept;
    static void conditional_negate_affine(const affine_element<Fq, Fr, Params>& in,
                                          affine_element<Fq, Fr, Params>& out,
                                          const uint64_t predicate) noexcept;
    static void batch_normalize(element* elements, const size_t num_elements) noexcept;
};
} // namespace test
} // namespace barretenberg

#include "./new_group_impl.hpp"