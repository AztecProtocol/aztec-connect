#pragma once

#include "../../composer/turbo_composer.hpp"
#include "../field/field.hpp"

namespace plonk {
namespace stdlib {
struct point {
    field_t<waffle::TurboComposer> x;
    field_t<waffle::TurboComposer> y;
};

} // namespace stdlib
} // namespace plonk