#pragma once

#include <array>
#include "../../uint32/uint32.hpp"

namespace waffle {
class StandardComposer;
class BoolComposer;
class MiMCComposer;
class ExtendedComposer;
class TurboComposer;
} // namespace waffle

namespace plonk {
namespace stdlib {
template <typename Composer> class bitarray;

template <typename Composer> void prepare_constants(std::array<uint32<Composer>, 8>& input);

template <typename Composer>
std::array<uint32<Composer>, 8> sha256_block(const std::array<uint32<Composer>, 8>& h_init,
                                             const std::array<uint32<Composer>, 16>& input);

template <typename Composer> bitarray<Composer> sha256(const bitarray<Composer>& input);

extern template bitarray<waffle::StandardComposer> sha256(const bitarray<waffle::StandardComposer>& input);
extern template bitarray<waffle::BoolComposer> sha256(const bitarray<waffle::BoolComposer>& input);
extern template bitarray<waffle::MiMCComposer> sha256(const bitarray<waffle::MiMCComposer>& input);
extern template bitarray<waffle::ExtendedComposer> sha256(const bitarray<waffle::ExtendedComposer>& input);
extern template bitarray<waffle::TurboComposer> sha256(const bitarray<waffle::TurboComposer>& input);

} // namespace stdlib
} // namespace plonk
