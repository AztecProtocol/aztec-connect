#pragma once

#include <vector>

#include "../../../polynomials/evaluation_domain.hpp"

namespace waffle {
barretenberg::fr::field_t compute_public_input_delta(const std::vector<barretenberg::fr::field_t>& inputs,
                                                     const barretenberg::fr::field_t& beta,
                                                     const barretenberg::fr::field_t& gamma,
                                                     const barretenberg::fr::field_t& subgroup_generator);
}