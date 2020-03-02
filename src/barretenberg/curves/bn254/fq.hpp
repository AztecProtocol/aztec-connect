#pragma once

#include <cstdint>
#include <iomanip>

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
    static constexpr uint64_t multiplicative_generator_0 = 0xd35d438dc58f0d9dUL;
    static constexpr uint64_t multiplicative_generator_1 = 0xa78eb28f5c70b3dUL;
    static constexpr uint64_t multiplicative_generator_2 = 0x666ea36f7879462cUL;
    static constexpr uint64_t multiplicative_generator_3 = 0x0e0a77c19a07df2fUL;

    static constexpr uint64_t multiplicative_generator_inverse_0 = 0UL;
    static constexpr uint64_t multiplicative_generator_inverse_1 = 0UL;
    static constexpr uint64_t multiplicative_generator_inverse_2 = 0UL;
    static constexpr uint64_t multiplicative_generator_inverse_3 = 0UL;

    static constexpr uint64_t alternate_multiplicative_generator_0 = 0UL;
    static constexpr uint64_t alternate_multiplicative_generator_1 = 0UL;
    static constexpr uint64_t alternate_multiplicative_generator_2 = 0UL;
    static constexpr uint64_t alternate_multiplicative_generator_3 = 0UL;

    static constexpr uint64_t coset_generators_0[15]{ 0xd35d438dc58f0d9d, 0xa6ba871b8b1e1b3a, 0x7a17caa950ad28d7,
                                                     0x115482203dbf392d, 0xe4b1c5ae034e46ca, 0xb80f093bc8dd5467,
                                                     0x4f4bc0b2b5ef64bd, 0x22a904407b7e725a, 0xf60647ce410d7ff7,
                                                     0xc9638b5c069c8d94, 0x60a042d2f3ae9dea, 0x33fd8660b93dab87,
                                                     0x75ac9ee7eccb924,  0x9e9781656bdec97a, 0x71f4c4f3316dd717 };

    static constexpr uint64_t coset_generators_1[15]{ 0xa78eb28f5c70b3d,  0x14f1d651eb8e167b, 0x1f6ac17ae15521b9,
                                                      0x926242126eaa626a, 0x9cdb2d3b64716da7, 0xa75418645a3878e5,
                                                      0x1a4b98fbe78db996, 0x24c48424dd54c4d4, 0x2f3d6f4dd31bd011,
                                                      0x39b65a76c8e2db4f, 0xacaddb0e56381c00, 0xb726c6374bff273e,
                                                      0xc19fb16041c6327c, 0x349731f7cf1b732c, 0x3f101d20c4e27e6a };

    static constexpr uint64_t coset_generators_2[15]{ 0x666ea36f7879462c, 0xccdd46def0f28c58, 0x334bea4e696bd284,
                                                      0xe16a48076063c052, 0x47d8eb76d8dd067e, 0xae478ee651564caa,
                                                      0x5c65ec9f484e3a79, 0xc2d4900ec0c780a5, 0x2943337e3940c6d1,
                                                      0x8fb1d6edb1ba0cfd, 0x3dd034a6a8b1facb, 0xa43ed816212b40f7,
                                                      0xaad7b8599a48723,  0xb8cbd93e909c74f2, 0x1f3a7cae0915bb1e };

    static constexpr uint64_t coset_generators_3[15]{ 0x0e0a77c19a07df2f, 0x1c14ef83340fbe5e, 0x2a1f6744ce179d8e,
                                                      0x07c5909386eddc93, 0x15d0085520f5bbc3, 0x23da8016bafd9af2,
                                                      0x0180a96573d3d9f8, 0x0f8b21270ddbb927, 0x1d9598e8a7e39857,
                                                      0x2ba010aa41eb7786, 0x094639f8fac1b68c, 0x1750b1ba94c995bb,
                                                      0x255b297c2ed174eb, 0x030152cae7a7b3f0, 0x110bca8c81af9320 };

};

typedef field<Bn254FqParams> fq;

inline std::ostream& operator<<(std::ostream& os, typename barretenberg::fq::field_t const& v)
{
    auto a = barretenberg::fq::from_montgomery_form(v);
    std::ios_base::fmtflags f(os.flags());
    os << std::hex << "0x" << std::setfill('0') << std::setw(16) << a.data[3] << std::setw(16) << a.data[2]
       << std::setw(16) << a.data[1] << std::setw(16) << a.data[0];
    os.flags(f);
    return os;
}

} // namespace barretenberg