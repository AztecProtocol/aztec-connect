#pragma once

#include "../../../composer/turbo_composer.hpp"
#include "../../field/field.hpp"
namespace plonk {
namespace stdlib {
namespace pedersen {
field_t<waffle::TurboComposer> compress(const field_t<waffle::TurboComposer>& left, const field_t<waffle::TurboComposer>& right);
}
} // namespace stdlib
} // namespace plonk