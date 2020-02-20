#pragma once

#include <array>
#include <cstdint>

#include "../utils.hpp"

__extension__ using uint128_t = unsigned __int128;

namespace test {
template <class Params> struct field {
  public:
    alignas(32) uint64_t data[4];

    static constexpr field modulus = { Params::modulus_0, Params::modulus_1, Params::modulus_2, Params::modulus_3 };
    static constexpr field twice_modulus = {
        Params::twice_modulus_0, Params::twice_modulus_1, Params::twice_modulus_2, Params::twice_modulus_3
    };
    static constexpr field zero{ 0x00, 0x00, 0x00, 0x00 };
    static constexpr field two_inv{ Params::two_inv_0, Params::two_inv_1, Params::two_inv_2, Params::two_inv_3 };
    static constexpr field modulus_plus_one{
        Params::modulus_0 + 1ULL, Params::modulus_1, Params::modulus_2, Params::modulus_3
    };
    static constexpr field modulus_minus_two = {
        Params::modulus_0 - 2ULL, Params::modulus_1, Params::modulus_2, Params::modulus_3
    };
    static constexpr field sqrt_exponent = {
        Params::sqrt_exponent_0, Params::sqrt_exponent_1, Params::sqrt_exponent_2, Params::sqrt_exponent_3
    };
    static constexpr field r_squared{
        Params::r_squared_0, Params::r_squared_1, Params::r_squared_2, Params::r_squared_3
    };
    static constexpr field one_raw{ 1ULL, 0ULL, 0ULL, 0ULL };
    static constexpr field one{ Params::one_mont_0, Params::one_mont_1, Params::one_mont_2, Params::one_mont_3 };
    static constexpr field beta{ Params::cube_root_0, Params::cube_root_1, Params::cube_root_2, Params::cube_root_3 };
    static constexpr field multiplicative_generator{ Params::multiplicative_generator_0,
                                                     Params::multiplicative_generator_1,
                                                     Params::multiplicative_generator_2,
                                                     Params::multiplicative_generator_3 };
    static constexpr field multiplicative_generator_inverse{ Params::multiplicative_generator_inverse_0,
                                                             Params::multiplicative_generator_inverse_1,
                                                             Params::multiplicative_generator_inverse_2,
                                                             Params::multiplicative_generator_inverse_3 };
    static constexpr field alternate_multiplicative_generator{ Params::alternate_multiplicative_generator_0,
                                                               Params::alternate_multiplicative_generator_1,
                                                               Params::alternate_multiplicative_generator_2,
                                                               Params::alternate_multiplicative_generator_3 };
    static constexpr field root_of_unity{
        Params::primitive_root_0, Params::primitive_root_1, Params::primitive_root_2, Params::primitive_root_3
    };

    static constexpr field coset_generators[15]{ { Params::coset_generators_0[0],
                                                   Params::coset_generators_1[0],
                                                   Params::coset_generators_2[0],
                                                   Params::coset_generators_3[0] },
                                                 { Params::coset_generators_0[1],
                                                   Params::coset_generators_1[1],
                                                   Params::coset_generators_2[1],
                                                   Params::coset_generators_3[1] },
                                                 { Params::coset_generators_0[2],
                                                   Params::coset_generators_1[2],
                                                   Params::coset_generators_2[2],
                                                   Params::coset_generators_3[2] },
                                                 { Params::coset_generators_0[3],
                                                   Params::coset_generators_1[3],
                                                   Params::coset_generators_2[3],
                                                   Params::coset_generators_3[3] },
                                                 { Params::coset_generators_0[4],
                                                   Params::coset_generators_1[4],
                                                   Params::coset_generators_2[4],
                                                   Params::coset_generators_3[4] },
                                                 { Params::coset_generators_0[5],
                                                   Params::coset_generators_1[5],
                                                   Params::coset_generators_2[5],
                                                   Params::coset_generators_3[5] },
                                                 { Params::coset_generators_0[6],
                                                   Params::coset_generators_1[6],
                                                   Params::coset_generators_2[6],
                                                   Params::coset_generators_3[6] },
                                                 { Params::coset_generators_0[7],
                                                   Params::coset_generators_1[7],
                                                   Params::coset_generators_2[7],
                                                   Params::coset_generators_3[7] },
                                                 { Params::coset_generators_0[8],
                                                   Params::coset_generators_1[8],
                                                   Params::coset_generators_2[8],
                                                   Params::coset_generators_3[8] },
                                                 { Params::coset_generators_0[9],
                                                   Params::coset_generators_1[9],
                                                   Params::coset_generators_2[9],
                                                   Params::coset_generators_3[9] },
                                                 { Params::coset_generators_0[10],
                                                   Params::coset_generators_1[10],
                                                   Params::coset_generators_2[10],
                                                   Params::coset_generators_3[10] },
                                                 { Params::coset_generators_0[11],
                                                   Params::coset_generators_1[11],
                                                   Params::coset_generators_2[11],
                                                   Params::coset_generators_3[11] },
                                                 { Params::coset_generators_0[12],
                                                   Params::coset_generators_1[12],
                                                   Params::coset_generators_2[12],
                                                   Params::coset_generators_3[12] },
                                                 { Params::coset_generators_0[13],
                                                   Params::coset_generators_1[13],
                                                   Params::coset_generators_2[13],
                                                   Params::coset_generators_3[13] },
                                                 { Params::coset_generators_0[14],
                                                   Params::coset_generators_1[14],
                                                   Params::coset_generators_2[14],
                                                   Params::coset_generators_3[14] } };

    // constexpr field() noexcept
    // {
    //     if constexpr (unstd::is_constant_evaluated()) {
    //         data[0] = 0;
    //         data[1] = 1;
    //         data[2] = 2;
    //         data[3] = 3;
    //     }
    // }

    // constexpr field() = default;

    // constexpr field(uint64_t* inputs) noexcept
    //     : data{ inputs }
    // {}

    // constexpr field(const field& other) = default;
    // constexpr field(field&& other) = default;

    // constexpr field& operator=(const field& other) = default;
    // constexpr field& operator=(field&& other) = default;
    // // field() noexcept {}
    // constexpr field() noexcept
    //     : data()
    // {}
    // constexpr field(const uint64_t a, const uint64_t b, const uint64_t c, const uint64_t d) noexcept
    //     : data{ a, b, c, d }
    // {}

    // constexpr field(const std::array<uint64_t, 4>& input) noexcept
    //     : data{ input[0], input[1], input[2], input[3] }
    // {}

    // constexpr field(const field& other) noexcept
    //     : data{ other.data[0], other.data[1], other.data[2], other.data[3] }
    // {}

    // constexpr field& operator=(const field& other) = default;
    // constexpr field& operator=(field&& other) = default;

    BBERG_INLINE constexpr field operator*(const field& other) const noexcept;
    BBERG_INLINE constexpr field operator+(const field& other) const noexcept;
    BBERG_INLINE constexpr field operator-(const field& other) const noexcept;
    constexpr field operator/(const field& other) const noexcept;

    BBERG_INLINE constexpr bool operator>(const field& other) const noexcept;
    BBERG_INLINE constexpr bool operator<(const field& other) const noexcept;
    BBERG_INLINE constexpr bool operator==(const field& other) const noexcept;
    BBERG_INLINE constexpr bool operator!=(const field& other) const noexcept;

    BBERG_INLINE constexpr field to_montgomery_form() const noexcept;
    BBERG_INLINE constexpr field from_montgomery_form() const noexcept;

    BBERG_INLINE constexpr field sqr() const noexcept;
    BBERG_INLINE constexpr field neg() const noexcept;
    BBERG_INLINE constexpr field pow(const field& exponent) const noexcept;
    BBERG_INLINE constexpr field pow(const uint64_t exponent) const noexcept;
    constexpr field invert() const noexcept;
    constexpr field sqrt() const noexcept;

    BBERG_INLINE constexpr field mul_with_coarse_reduction(const field& other) const noexcept;
    BBERG_INLINE constexpr field sqr_with_coarse_reduction() const noexcept;
    BBERG_INLINE constexpr field add_without_reduction(const field& other) const noexcept;
    BBERG_INLINE constexpr field add_with_coarse_reduction(const field& other) const noexcept;
    BBERG_INLINE constexpr field sub_with_coarse_reduction(const field& other) const noexcept;

    BBERG_INLINE constexpr void self_mul_with_coarse_reduction(const field& other) noexcept;
    BBERG_INLINE constexpr void self_sqr_with_coarse_reduction() noexcept;
    BBERG_INLINE constexpr void self_add_without_reduction(const field& other) noexcept;
    BBERG_INLINE constexpr void self_add_with_coarse_reduction(const field& other) noexcept;
    BBERG_INLINE constexpr void self_sub_with_coarse_reduction(const field& other) noexcept;

    BBERG_INLINE constexpr void self_mul(const field& other) noexcept;
    BBERG_INLINE constexpr void self_sqr() noexcept;
    BBERG_INLINE constexpr void self_add(const field& other) noexcept;
    BBERG_INLINE constexpr void self_sub(const field& other) noexcept;
    BBERG_INLINE constexpr void self_neg() noexcept;
    constexpr void self_invert() noexcept;
    constexpr void self_sqrt() noexcept;

    BBERG_INLINE constexpr void self_to_montgomery_form() noexcept;
    BBERG_INLINE constexpr void self_from_montgomery_form() noexcept;

    BBERG_INLINE constexpr void self_conditional_negate(const uint64_t predicate) noexcept;

    BBERG_INLINE constexpr field reduce_once() const noexcept;
    BBERG_INLINE constexpr void self_reduce_once() noexcept;

    BBERG_INLINE constexpr uint64_t get_msb() const noexcept;
    BBERG_INLINE constexpr void self_set_msb() noexcept;
    BBERG_INLINE constexpr bool is_msb_set() const noexcept;
    BBERG_INLINE constexpr uint64_t is_msb_set_word() const noexcept;
    BBERG_INLINE constexpr bool get_bit(const uint64_t bit_index) const noexcept;

    BBERG_INLINE constexpr bool is_zero() const noexcept;

    static constexpr field get_root_of_unity(const size_t degree) noexcept;

    // constexpr void __invert() noexcept;
    // constexpr void __neg() noexcept;
    // constexpr void __to_montgomery_form() noexcept;
    // constexpr void __from_montgomery_form() noexcept;
    struct wide_array {
        uint64_t data[8];
    };
    BBERG_INLINE constexpr wide_array mul_512(const field& other) const noexcept;

  private:
    BBERG_INLINE constexpr std::pair<uint64_t, uint64_t> mul_wide(const uint64_t a, const uint64_t b) const noexcept;
    BBERG_INLINE constexpr std::pair<uint64_t, uint64_t> mac(const uint64_t a,
                                                             const uint64_t b,
                                                             const uint64_t c,
                                                             const uint64_t carry_in) const noexcept;
    BBERG_INLINE constexpr uint64_t mac_discard_lo(const uint64_t a,
                                                   const uint64_t b,
                                                   const uint64_t c,
                                                   const uint64_t carry_in) const noexcept;
    BBERG_INLINE constexpr uint64_t mac_discard_hi(const uint64_t a,
                                                   const uint64_t b,
                                                   const uint64_t c,
                                                   const uint64_t carry_in) const noexcept;

    BBERG_INLINE constexpr std::pair<uint64_t, uint64_t> addc(const uint64_t a,
                                                              const uint64_t b,
                                                              const uint64_t carry_in) const noexcept;
    BBERG_INLINE constexpr uint64_t addc_discard_hi(const uint64_t a, const uint64_t b, const uint64_t carry_in) const
        noexcept;

    BBERG_INLINE constexpr std::pair<uint64_t, uint64_t> sbb(const uint64_t a,
                                                             const uint64_t b,
                                                             const uint64_t borrow_in) const noexcept;
    BBERG_INLINE constexpr uint64_t sbb_discard_hi(const uint64_t a, const uint64_t b, const uint64_t borrow_in) const
        noexcept;

    BBERG_INLINE constexpr field subtract(const field& other) const noexcept;
    BBERG_INLINE constexpr field subtract_coarse(const field& other) const noexcept;
    BBERG_INLINE constexpr field montgomery_reduce(const wide_array& r) const noexcept;

#ifndef DISABLE_SHENANIGANS
    BBERG_INLINE static field asm_mul(const field& a, const field& b) noexcept;
    BBERG_INLINE static field asm_sqr(const field& a) noexcept;
    BBERG_INLINE static field asm_add(const field& a, const field& b) noexcept;
    BBERG_INLINE static field asm_sub(const field& a, const field& b) noexcept;
    BBERG_INLINE static field asm_mul_with_coarse_reduction(const field& a, const field& b) noexcept;
    BBERG_INLINE static field asm_sqr_with_coarse_reduction(const field& a) noexcept;
    BBERG_INLINE static field asm_add_with_coarse_reduction(const field& a, const field& b) noexcept;
    BBERG_INLINE static field asm_sub_with_coarse_reduction(const field& a, const field& b) noexcept;
    BBERG_INLINE static field asm_add_without_reduction(const field& a, const field& b) noexcept;

    BBERG_INLINE static void asm_self_mul(const field& a, const field& b) noexcept;
    BBERG_INLINE static void asm_self_sqr(const field& a) noexcept;
    BBERG_INLINE static void asm_self_add(const field& a, const field& b) noexcept;
    BBERG_INLINE static void asm_self_sub(const field& a, const field& b) noexcept;
    BBERG_INLINE static void asm_self_mul_with_coarse_reduction(const field& a, const field& b) noexcept;
    BBERG_INLINE static void asm_self_sqr_with_coarse_reduction(const field& a) noexcept;
    BBERG_INLINE static void asm_self_add_with_coarse_reduction(const field& a, const field& b) noexcept;
    BBERG_INLINE static void asm_self_sub_with_coarse_reduction(const field& a, const field& b) noexcept;
    BBERG_INLINE static void asm_self_add_without_reduction(const field& a, const field& b) noexcept;

    BBERG_INLINE static void asm_conditional_negate(field& a, const uint64_t predicate) noexcept;
    BBERG_INLINE static field asm_reduce_once(const field& a) noexcept;
    BBERG_INLINE static void asm_self_reduce_once(const field& a) noexcept;

    constexpr field tonelli_shanks_sqrt() const noexcept;
#endif
    static constexpr uint128_t lo_mask = 0xffffffffffffffffUL;
};
} // namespace test

#include "./new_field_impl.hpp"
