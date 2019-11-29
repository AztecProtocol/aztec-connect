
#ifndef SHA256_TCC
#define SHA256_TCC

#include "../../uint32/uint32.hpp"

namespace plonk
{
namespace stdlib
{

constexpr uint32_t init_constants[8]{ 0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
                                      0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19 };

constexpr uint32_t round_constants[64]{
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
};

template <typename Composer>
std::array<uint32<Composer>, 8> sha256(std::array<uint32<Composer>, 16> &input)
{
    typedef uint32<Composer> uint32;
    std::array<uint32, 64> w;

    for (size_t i = 0; i < 16; ++i)
    {
        w[i] = input[i];
    }

    for (size_t i = 16; i < 64; ++i)
    {
        uint32 s0 = w[i - 15].ror(7) ^ w[i - 15].ror(18) ^ w[i - 15].ror(3);
        uint32 s1 = w[i - 2].ror(17) ^ w[i - 2].ror(19) ^ w[i - 2].ror(10);
        w[i] = w[i - 16] + s0 + w[i - 7] + s1;
    }

    uint32 a = init_constants[0];
    uint32 b = init_constants[1];
    uint32 c = init_constants[2];
    uint32 d = init_constants[3];
    uint32 e = init_constants[4];
    uint32 f = init_constants[5];
    uint32 g = init_constants[6];
    uint32 h = init_constants[7];

    for (size_t i = 0; i < 64; ++i)
    {
        uint32 S1 = e.ror(7U) ^ e.ror(11U) ^ e.ror(25U);
        uint32 ch = (e & f) + ((~e) & g);
        uint32 temp1 = h + S1 + ch + round_constants[i] + w[i];
        uint32 S0 = a.ror(2U) ^ a.ror(13U) ^ a.ror(22U);
        uint32 T0 = (b & c);
        uint32 T1 = (b - T0) + (c - T0);
        uint32 T2 = a & T1;
        uint32 maj = T2 + T0;
        uint32 temp2 = S0 + maj;

        h = g;
        g = f;
        f = e;
        e = d + temp1;
        d = c;
        c = b;
        b = a;
        a = temp1 + temp2;
    }

    std::array<uint32, 8> output;
    output[0] = a + init_constants[0];
    output[1] = b + init_constants[1];
    output[2] = c + init_constants[2];
    output[3] = d + init_constants[3];
    output[4] = e + init_constants[4];
    output[5] = f + init_constants[5];
    output[6] = g + init_constants[6];
    output[7] = h + init_constants[7];
    return output;
}

} // namespace stdlib
} // namespace plonk

#endif