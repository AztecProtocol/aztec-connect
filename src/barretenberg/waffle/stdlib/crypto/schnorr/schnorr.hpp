#pragma once

#include "../../../composer/turbo_composer.hpp"
#include "../../field/field.hpp"
#include "../../bitarray/bitarray.hpp"

namespace plonk {
namespace stdlib {

namespace schnorr {

struct point
{
    field_t<waffle::TurboComposer> x;
    field_t<waffle::TurboComposer> y;
};

struct signature
{
    bitarray<waffle::TurboComposer> s;
    bitarray<waffle::TurboComposer> e;
};

field_t<waffle::TurboComposer> verify_signature(const bitarray<waffle::TurboComposer>& message, const point& pub_key, const signature& sig);
}
}
}

#include "./schnorr.tcc"