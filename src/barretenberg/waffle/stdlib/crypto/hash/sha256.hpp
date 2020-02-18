#pragma once

#include <array>
// #include "../../uint32/uint32.hpp"
#include "../../uint/noir_uint.hpp"

namespace waffle {
class StandardComposer;
class BoolComposer;
class MiMCComposer;
class TurboComposer;
class TurboComposer;
} // namespace waffle

namespace plonk {
namespace stdlib {
template <typename Composer> class bitarray;

template <typename Composer> void prepare_constants(std::array<uintNoir<Composer>, 8>& input);

template <typename Composer>
std::array<uintNoir<Composer>, 8> sha256_block(const std::array<uintNoir<Composer>, 8>& h_init,
                                             const std::array<uintNoir<Composer>, 16>& input);

template <typename Composer> bitarray<Composer> sha256(const bitarray<Composer>& input);

extern template bitarray<waffle::StandardComposer> sha256(const bitarray<waffle::StandardComposer>& input);
extern template bitarray<waffle::BoolComposer> sha256(const bitarray<waffle::BoolComposer>& input);
extern template bitarray<waffle::MiMCComposer> sha256(const bitarray<waffle::MiMCComposer>& input);
extern template bitarray<waffle::TurboComposer> sha256(const bitarray<waffle::TurboComposer>& input);

} // namespace stdlib
} // namespace plonk
