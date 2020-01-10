#pragma once

namespace int_utils
{
__extension__ using uint128_t = unsigned __int128;

// from http://supertech.csail.mit.edu/papers/debruijn.pdf
inline size_t get_msb(uint32_t v)
{
    static const uint32_t MultiplyDeBruijnBitPosition[32] = { 0,  9,  1,  10, 13, 21, 2,  29, 11, 14, 16,
                                                              18, 22, 25, 3,  30, 8,  12, 20, 28, 15, 17,
                                                              24, 7,  19, 27, 23, 6,  26, 5,  4,  31 };

    v |= v >> 1; // first round down to one less than a power of 2
    v |= v >> 2;
    v |= v >> 4;
    v |= v >> 8;
    v |= v >> 16;

    return MultiplyDeBruijnBitPosition[static_cast<uint32_t>(v * static_cast<uint32_t>(0x07C4ACDD)) >> static_cast<uint32_t>(27)];
}

inline size_t get_msb(uint128_t v)
{
    uint32_t lolo = static_cast<uint32_t>(v & static_cast<uint128_t>(0xffffffffULL));
    uint32_t lohi = static_cast<uint32_t>((v >> static_cast<uint128_t>(32ULL)) & static_cast<uint128_t>(0xffffffffULL));
    uint32_t hilo = static_cast<uint32_t>((v >> static_cast<uint128_t>(64ULL)) & static_cast<uint128_t>(0xffffffffULL));
    uint32_t hihi = static_cast<uint32_t>((v >> static_cast<uint128_t>(96ULL)) & static_cast<uint128_t>(0xffffffffULL));

    if (hihi > 0)
    {
        return (get_msb(hihi) + 96);
    }
    if (hilo > 0)
    {
        return (get_msb(hilo) + 64);
    }
    if (lohi > 0)
    {
        return (get_msb(lohi) + 32);
    }
    return get_msb(lolo);
}

// inline bool get_bit(uint128_t v, size_t index)
// {
//     uint128_t T0 = v >> static_cast<uint128_t>(index);
//     return static_cast<bool>(T0 & static_cast<uint128_t>(1UL));
// }
} // namespace int_utils