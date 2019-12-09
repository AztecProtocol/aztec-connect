#ifndef SHA256_HPP
#define SHA256_HPP

#include "../../uint32/uint32.hpp"
#include "../../bitarray/bitarray.hpp"

namespace plonk
{
namespace stdlib
{

template <typename Composer>
void prepare_constants(std::array<uint32<Composer>, 8> &input);

template <typename Composer>
std::array<uint32<Composer>, 8> sha256_block(const std::array<uint32<Composer>, 8> &h_init, const std::array<uint32<Composer>, 16> &input);

template <typename Composer>
bitarray<Composer> sha256(const bitarray<Composer> &input);

}
}

#include "./sha256.tcc"
#endif