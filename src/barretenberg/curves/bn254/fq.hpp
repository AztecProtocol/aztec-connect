#pragma once

#include <cstdint>

#include "../../fields/field.hpp"

namespace barretenberg
{
class Bn254FqParams
{
public:
    static constexpr uint64_t modulus_0 = 0x3C208C16D87CFD47UL;
    static constexpr uint64_t modulus_1 = 0x97816a916871ca8dUL;
    static constexpr uint64_t modulus_2 = 0xb85045b68181585dUL;
    static constexpr uint64_t modulus_3 = 0x30644e72e131a029UL;

    // negative modulus, in two's complement form (inverted + 1)
    static constexpr uint64_t not_modulus_0 = ((~0x3C208C16D87CFD47UL) + 1);
    static constexpr uint64_t not_modulus_1 = ~0x97816a916871ca8dUL;
    static constexpr uint64_t not_modulus_2 = ~0xb85045b68181585dUL;
    static constexpr uint64_t not_modulus_3 = ~0x30644e72e131a029UL;

    static constexpr uint64_t twice_modulus_0 = 0x7841182db0f9fa8eUL;
    static constexpr uint64_t twice_modulus_1 = 0x2f02d522d0e3951aUL;
    static constexpr uint64_t twice_modulus_2 = 0x70a08b6d0302b0bbUL;
    static constexpr uint64_t twice_modulus_3 = 0x60c89ce5c2634053UL;

    static constexpr uint64_t twice_not_modulus_0 = ((~0x7841182db0f9fa8eUL) + 1);
    static constexpr uint64_t twice_not_modulus_1 = ~(0x2f02d522d0e3951aUL);
    static constexpr uint64_t twice_not_modulus_2 = ~(0x70a08b6d0302b0bbUL);
    static constexpr uint64_t twice_not_modulus_3 = ~(0x60c89ce5c2634053UL);

    static constexpr uint64_t one_mont_0 = 0xd35d438dc58f0d9dUL;
    static constexpr uint64_t one_mont_1 = 0x0a78eb28f5c70b3dUL;
    static constexpr uint64_t one_mont_2 = 0x666ea36f7879462cUL;
    static constexpr uint64_t one_mont_3 = 0x0e0a77c19a07df2fUL;

    static constexpr uint64_t two_inv_0 = 0x87bee7d24f060572UL;
    static constexpr uint64_t two_inv_1 = 0xd0fd2add2f1c6ae5UL;
    static constexpr uint64_t two_inv_2 = 0x8f5f7492fcfd4f44UL;
    static constexpr uint64_t two_inv_3 = 0x1f37631a3d9cbfacUL;

    static constexpr uint64_t sqrt_exponent_0 = 0x4F082305B61F3F52UL;
    static constexpr uint64_t sqrt_exponent_1 = 0x65E05AA45A1C72A3UL;
    static constexpr uint64_t sqrt_exponent_2 = 0x6E14116DA0605617UL;
    static constexpr uint64_t sqrt_exponent_3 = 0xC19139CB84C680AUL;

    static constexpr uint64_t r_squared_0 = 0xF32CFC5B538AFA89UL;
    static constexpr uint64_t r_squared_1 = 0xB5E71911D44501FBUL;
    static constexpr uint64_t r_squared_2 = 0x47AB1EFF0A417FF6UL;
    static constexpr uint64_t r_squared_3 = 0x06D89F71CAB8351FUL;

    static constexpr uint64_t cube_root_0 = 0x71930c11d782e155UL;
    static constexpr uint64_t cube_root_1 = 0xa6bb947cffbe3323UL;
    static constexpr uint64_t cube_root_2 = 0xaa303344d4741444UL;
    static constexpr uint64_t cube_root_3 = 0x2c3b3f0d26594943UL;

    static constexpr size_t primitive_root_log_size = 0UL;
    static constexpr uint64_t primitive_root_0 = 0UL;
    static constexpr uint64_t primitive_root_1 = 0UL;
    static constexpr uint64_t primitive_root_2 = 0UL;
    static constexpr uint64_t primitive_root_3 = 0UL;

    static constexpr uint64_t r_inv = 0x87d20782e4866389UL;

    static constexpr uint64_t endo_g1_lo = 0x7a7bd9d4391eb18d;
    static constexpr uint64_t endo_g1_mid = 0x4ccef014a773d2cfUL;
    static constexpr uint64_t endo_g1_hi = 0x0000000000000002UL;
    static constexpr uint64_t endo_g2_lo = 0xd91d232ec7e0b3d2UL;
    static constexpr uint64_t endo_g2_mid = 0x0000000000000002UL;
    static constexpr uint64_t endo_minus_b1_lo = 0x8211bbeb7d4f1129UL;
    static constexpr uint64_t endo_minus_b1_mid = 0x6f4d8248eeb859fcUL;
    static constexpr uint64_t endo_b2_lo = 0x89d3256894d213e2UL;
    static constexpr uint64_t endo_b2_mid = 0UL;

    // TODO: fill these in. Currently not needed
    static constexpr uint64_t multiplicative_generator_0 = 0UL;
    static constexpr uint64_t multiplicative_generator_1 = 0UL;
    static constexpr uint64_t multiplicative_generator_2 = 0UL;
    static constexpr uint64_t multiplicative_generator_3 = 0UL;

    static constexpr uint64_t multiplicative_generator_inverse_0 = 0UL;
    static constexpr uint64_t multiplicative_generator_inverse_1 = 0UL;
    static constexpr uint64_t multiplicative_generator_inverse_2 = 0UL;
    static constexpr uint64_t multiplicative_generator_inverse_3 = 0UL;

    static constexpr uint64_t alternate_multiplicative_generator_0 = 0UL;
    static constexpr uint64_t alternate_multiplicative_generator_1 = 0UL;
    static constexpr uint64_t alternate_multiplicative_generator_2 = 0UL;
    static constexpr uint64_t alternate_multiplicative_generator_3 = 0UL;

    static constexpr bool p_mod_4_eq_3 = true;
};

typedef field<Bn254FqParams> fq;
}