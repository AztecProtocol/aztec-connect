#pragma once

#include <cstddef>
#include <map>
#include <string>

#include "../../../curves/bn254/g1.hpp"

namespace waffle
{
    
struct verification_key
{
    verification_key(const size_t input_n) : n(input_n) {}

    std::map<std::string, barretenberg::g1::affine_element> constraint_selectors;

    std::map<std::string, barretenberg::g1::affine_element> permutation_selectors;

    const size_t n;
};
}