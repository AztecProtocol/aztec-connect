#ifndef MIMC_HPP
#define MIMC_HPP

#include "../composer/composer.hpp"

namespace waffle
{
namespace mimc
{
    uint32_t mimc_round(const uint32_t input_index, Composer &composer);
}
}
#endif