#pragma once
#include "../../composer/standard_composer.hpp"
#include "../field/field.hpp"
#include "../mimc.hpp"
#include <vector>

namespace plonk {
namespace stdlib {
namespace merkle_tree {

inline barretenberg::fr::field_t hash(std::vector<barretenberg::fr::field_t> const& input)
{
    // TODO: Change to pederson hashes.
    // As mimc currently only accepts witness types use a throw away composer to compute the hashes.
    waffle::StandardComposer throw_away_composer;
    std::vector<field_t<waffle::StandardComposer>> inputs;
    std::transform(input.begin(), input.end(), std::back_inserter(inputs), [&](auto const& v) {
        return field_t<waffle::StandardComposer>(witness_t(&throw_away_composer, v));
    });
    return stdlib::mimc7<waffle::StandardComposer>(inputs).get_value();
}

} // namespace merkle_tree
} // namespace stdlib
} // namespace plonk