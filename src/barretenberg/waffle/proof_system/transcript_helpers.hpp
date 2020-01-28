#pragma once 

#include "../../curves/bn254/fr.hpp"
#include "../../curves/bn254/g1.hpp"

namespace waffle {
namespace transcript_helpers {
inline std::vector<uint8_t> convert_field_element(const barretenberg::fr::field_t& ele)
{
    std::vector<uint8_t> buffer(sizeof(barretenberg::fr::field_t));
    barretenberg::fr::serialize_to_buffer(ele, &buffer[0]);
    return buffer;
}

inline std::vector<uint8_t> convert_g1_element(const barretenberg::g1::affine_element& ele)
{
    std::vector<uint8_t> buffer(sizeof(barretenberg::g1::affine_element));
    barretenberg::g1::serialize_to_buffer(ele, &buffer[0]);
    return buffer;
}
} // namespace transcript_helpers
} // namespace waffle