#ifndef SHA256_HPP
#define SHA256_HPP

#include "../../uint32/uint32.hpp"

namespace plonk
{
namespace stdlib
{

template <typename Composer>
std::array<uint32<Composer>, 4> sha256(std::array<uint32<Composer>, 4> &input);

}
}

#include "./sha256.tcc"
#endif