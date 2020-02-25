#pragma once

#include "../types.hpp"
#include "../uint256/uint256.hpp"

namespace barretenberg {
namespace test {
template <typename Fq, typename Fr, typename Params> class alignas(64) affine_element {
  public:
    static constexpr affine_element one{ Params::one_x, Params::one_y };

    affine_element() noexcept {}

    constexpr affine_element(const Fq& a, const Fq& b) noexcept;

    constexpr affine_element(const affine_element& other) noexcept;

    constexpr affine_element(affine_element&& other) noexcept;

    explicit constexpr affine_element(const uint256_t& compressed) noexcept;

    constexpr affine_element& operator=(const affine_element& other) noexcept;

    constexpr affine_element& operator=(affine_element&& other) noexcept;

    explicit constexpr operator uint256_t() const noexcept;

    constexpr affine_element set_infinity() const noexcept;
    constexpr void self_set_infinity() noexcept;

    constexpr bool is_point_at_infinity() const noexcept;

    constexpr bool on_curve() const noexcept;

    constexpr bool operator==(const affine_element& other) const noexcept;

    constexpr affine_element operator-() const noexcept { return { x, -y }; }
    Fq x;
    Fq y;
};
} // namespace test
} // namespace barretenberg

#include "./affine_group_impl.hpp"