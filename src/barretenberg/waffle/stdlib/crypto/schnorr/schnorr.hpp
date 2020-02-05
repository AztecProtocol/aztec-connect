#pragma once

#include "../../../composer/turbo_composer.hpp"
#include "../../field/field.hpp"
#include "../../bitarray/bitarray.hpp"
#include "../../../../misc_crypto/schnorr/schnorr.hpp"
#include "../crypto.hpp"

namespace plonk {
namespace stdlib {

namespace schnorr {


struct signature_bits
{
    bitarray<waffle::TurboComposer> s;
    bitarray<waffle::TurboComposer> e;
};

point variable_base_mul(const point& pub_key, const bitarray<waffle::TurboComposer>& scalar);

bool verify_signature(const bitarray<waffle::TurboComposer>& message, const point& pub_key, const signature_bits& sig);

signature_bits convert_signature(waffle::TurboComposer* context, const crypto::schnorr::signature& sig);
bitarray<waffle::TurboComposer> convert_message(waffle::TurboComposer* context, const std::string& message_string);

}
}
}

#include "./schnorr.tcc"