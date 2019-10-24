#ifndef MIMC_HPP
#define MIMC_HPP

#include "../../assert.hpp"

#include "../composer/standard_composer.hpp"
#include "../composer/mimc_composer.hpp"
#include "./field/field.hpp"

namespace pstd
{

field_t<waffle::MiMCComposer> mimc_hash(field_t<waffle::MiMCComposer> &input, field_t<waffle::MiMCComposer> &k_in);

field_t<waffle::StandardComposer> mimc_hash(field_t<waffle::StandardComposer> input, field_t<waffle::StandardComposer> k_in);
}

#endif