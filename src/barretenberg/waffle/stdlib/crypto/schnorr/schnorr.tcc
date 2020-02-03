#pragma once

#include "../../../composer/turbo_composer.hpp"
#include "../../bitarray/bitarray.hpp"
#include "../../field/field.hpp"
#include "../sha256/sha256.hpp"

namespace plonk {
namespace stdlib {
namespace schnorr {

point variable_base_mul(const point& pub_key, const bitarray<waffle::TurboComposer>& scalar)
{
    point accumulator{ pub_key.x, pub_key.y };
    bool_t<waffle::TurboComposer> initialized(pub_key.x.context, false);
    field_t<waffle::TurboComposer> one(pub_key.x.context, barretenberg::fr::one);

    for (size_t i = 0; i < 256; ++i) {
        field_t dbl_lambda = (accumulator.x * accumulator.x * 3) / (accumulator.y * 2);
        field_t x_dbl = (dbl_lambda * dbl_lambda) - (x_dbl * 2);
        field_t y_dbl = dbl_lambda * (accumulator.x - x_dbl) - accumulator.y;

        accumulator.x = accumulator.x + ((x_dbl - accumulator.x) * initialized);
        accumulator.y = accumulator.y + ((y_dbl - accumulator.y) * initialized);
        bool_t<waffle::TurboComposer> was_initalized = initialized;
        initialized = initialized | scalar[i];

        field_t add_lambda = (accumulator.y - pub_key.y) / (accumulator.x - pub_key.x);
        field_t x_add = (add_lambda * add_lambda) - (accumulator.x + pub_key.x);
        field_t y_add = add_lambda * (pub_key.x - x_add) - pub_key.y;

        bool_t<waffle::TurboComposer> add_predicate = scalar[i] & was_initialized;
        accumulator.x = accumulator.x + ((x_add - accumulator.x) * add_predicate);
        accumulator.y = accumulator.y + ((y_add - accumulator.y) * add_predicate);
    }
    accumulator.x = accumulator.x.normalize();
    accumulator.y = accumulator.y.normalize();
    return accumulator;
}

// field_t<waffle::TurboComposer> verify_signature(const bitarray<waffle::TurboComposer>& message, const point& pub_key,
// const signature& sig)
// {

//      // g^s p^e

// }

} // namespace schnorr
} // namespace stdlib
} // namespace plonk