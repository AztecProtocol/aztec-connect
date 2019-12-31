#pragma once

#include <cstdint>

#include "../../fields/field.hpp"

namespace barretenberg
{
class FrParams
{
  public:
    static constexpr uint64_t modulus_0 = 0x43E1F593F0000001UL;
    static constexpr uint64_t modulus_1 = 0x2833E84879B97091UL;
    static constexpr uint64_t modulus_2 = 0xB85045B68181585DUL;
    static constexpr uint64_t modulus_3 = 0x30644E72E131A029UL;

    // negative modulus, in two's complement form (inverted + 1)
    static constexpr uint64_t not_modulus_0 = (~0x43E1F593F0000001UL) + 1;
    static constexpr uint64_t not_modulus_1 = ~0x2833E84879B97091UL;
    static constexpr uint64_t not_modulus_2 = ~0xB85045B68181585DUL;
    static constexpr uint64_t not_modulus_3 = ~0x30644E72E131A029UL;

    static constexpr uint64_t twice_modulus_0 = 0x87c3eb27e0000002UL;
    static constexpr uint64_t twice_modulus_1 = 0x5067d090f372e122UL;
    static constexpr uint64_t twice_modulus_2 = 0x70a08b6d0302b0baUL;
    static constexpr uint64_t twice_modulus_3 = 0x60c89ce5c2634053UL;

    static constexpr uint64_t twice_not_modulus_0 = (~0x87c3eb27e0000002UL) + 1;
    static constexpr uint64_t twice_not_modulus_1 = ~0x5067d090f372e122UL;
    static constexpr uint64_t twice_not_modulus_2 = ~0x70a08b6d0302b0baUL;
    static constexpr uint64_t twice_not_modulus_3 = ~0x60c89ce5c2634053UL;

    static constexpr uint64_t one_mont_0 = 0xac96341c4ffffffbUL;
    static constexpr uint64_t one_mont_1 = 0x36fc76959f60cd29UL;
    static constexpr uint64_t one_mont_2 = 0x666ea36f7879462eUL;
    static constexpr uint64_t one_mont_3 = 0xe0a77c19a07df2fUL;

    // TODO: add these in. Needed for pairings, which Fr isn't used for, but it's good to be consistent
    static constexpr uint64_t two_inv_0 = 0;
    static constexpr uint64_t two_inv_1 = 0;
    static constexpr uint64_t two_inv_2 = 0;
    static constexpr uint64_t two_inv_3 = 0;

    static constexpr uint64_t sqrt_exponent_0 = 0x50F87D64FC000000UL;
    static constexpr uint64_t sqrt_exponent_1 = 0x4A0CFA121E6E5C24UL;
    static constexpr uint64_t sqrt_exponent_2 = 0x6E14116DA0605617UL;
    static constexpr uint64_t sqrt_exponent_3 = 0xC19139CB84C680AUL;

    static constexpr uint64_t r_squared_0 = 0x1BB8E645AE216DA7UL;
    static constexpr uint64_t r_squared_1 = 0x53FE3AB1E35C59E3UL;
    static constexpr uint64_t r_squared_2 = 0x8C49833D53BB8085UL;
    static constexpr uint64_t r_squared_3 = 0x216D0B17F4E44A5UL;

    static constexpr uint64_t cube_root_0 = 0x93e7cede4a0329b3UL;
    static constexpr uint64_t cube_root_1 = 0x7d4fdca77a96c167UL;
    static constexpr uint64_t cube_root_2 = 0x8be4ba08b19a750aUL;
    static constexpr uint64_t cube_root_3 = 0x1cbd5653a5661c25UL;

    static constexpr uint64_t r_inv = 0xc2e1f593efffffffUL;

    static constexpr size_t primitive_root_log_size = 28;
    static constexpr uint64_t primitive_root_0 = 0x636e735580d13d9cUL;
    static constexpr uint64_t primitive_root_1 = 0xa22bf3742445ffd6UL;
    static constexpr uint64_t primitive_root_2 = 0x56452ac01eb203d8UL;
    static constexpr uint64_t primitive_root_3 = 0x1860ef942963f9e7UL;

    static constexpr uint64_t endo_g1_lo = 0x7a7bd9d4391eb18dUL;
    static constexpr uint64_t endo_g1_mid = 0x4ccef014a773d2cfUL;
    static constexpr uint64_t endo_g1_hi = 0x0000000000000002UL;
    static constexpr uint64_t endo_g2_lo = 0xd91d232ec7e0b3d7UL;
    static constexpr uint64_t endo_g2_mid = 0x0000000000000002UL;
    static constexpr uint64_t endo_minus_b1_lo = 0x8211bbeb7d4f1128UL;
    static constexpr uint64_t endo_minus_b1_mid = 0x6f4d8248eeb859fcUL;
    static constexpr uint64_t endo_b2_lo = 0x89d3256894d213e3UL;
    static constexpr uint64_t endo_b2_mid = 0UL;

    // 5, smallest quadratic non-residue
    static constexpr uint64_t multiplicative_generator_0 = 0x1b0d0ef99fffffe6UL;
    static constexpr uint64_t multiplicative_generator_1 = 0xeaba68a3a32a913fUL;
    static constexpr uint64_t multiplicative_generator_2 = 0x47d8eb76d8dd0689UL;
    static constexpr uint64_t multiplicative_generator_3 = 0x15d0085520f5bbc3UL;

    static constexpr uint64_t multiplicative_generator_inverse_0 = 0xd745397409999999UL;
    static constexpr uint64_t multiplicative_generator_inverse_1 = 0xb4ada7d483c3efa8UL;
    static constexpr uint64_t multiplicative_generator_inverse_2 = 0xc49ca2f8e57f3161UL;
    static constexpr uint64_t multiplicative_generator_inverse_3 = 0x162a3754ac156cb3UL;

    static constexpr uint64_t alternate_multiplicative_generator_0 = 0x3057819e4fffffdbUL;
    static constexpr uint64_t alternate_multiplicative_generator_1 = 0x307f6d866832bb01UL;
    static constexpr uint64_t alternate_multiplicative_generator_2 = 0x5c65ec9f484e3a89UL;
    static constexpr uint64_t alternate_multiplicative_generator_3 = 0x180a96573d3d9f8UL;

    // smallest Q such that Q * 2^{s} = (p - 1)
    static constexpr uint64_t Q_minus_one_over_two_0 = 0xCDCB848A1F0FAC9FUL;
    static constexpr uint64_t Q_minus_one_over_two_1 = 0x0C0AC2E9419F4243UL;
    static constexpr uint64_t Q_minus_one_over_two_2 = 0x098D014DC2822DB4UL;
    static constexpr uint64_t Q_minus_one_over_two_3 = 0x183227397UL;
    };

typedef field<FrParams> fr;
} // namespace barretenberg