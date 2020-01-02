#pragma once
#include "../../waffle/composer/extended_composer.hpp"
#include "../../waffle/stdlib/bool/bool.hpp"
#include "../../waffle/stdlib/uint32/uint32.hpp"

namespace noir {
namespace code_gen {

//#define throw std::abort(); auto __ex__ =

typedef waffle::ExtendedComposer Composer;
typedef plonk::stdlib::field_t<Composer> field_t;
typedef plonk::stdlib::bool_t<Composer> bool_t;
typedef plonk::stdlib::witness_t<Composer> witness_t;
typedef plonk::stdlib::uint<Composer> uint;
typedef plonk::stdlib::uint32<Composer> uint32;

} // namespace code_gen
} // namespace noir