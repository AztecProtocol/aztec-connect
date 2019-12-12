#pragma once

#include "../../assert.hpp"
#include "../composer/mimc_composer.hpp"
#include "../composer/standard_composer.hpp"
#include "./field/field.hpp"

namespace plonk
{
namespace stdlib
{

field_t<waffle::MiMCComposer> mimc_block_cipher(field_t<waffle::MiMCComposer>& input,
                                                field_t<waffle::MiMCComposer>& k_in);

field_t<waffle::StandardComposer> mimc_block_cipher(field_t<waffle::StandardComposer> input,
                                                    field_t<waffle::StandardComposer> k_in);

template <typename Composer> field_t<Composer> mimc7(std::vector<field_t<Composer>>& inputs);

} // namespace stdlib
} // namespace plonk

#include "./mimc.tcc"
