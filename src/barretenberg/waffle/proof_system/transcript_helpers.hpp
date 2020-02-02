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

inline std::vector<uint8_t> convert_field_elements(const std::vector<barretenberg::fr::field_t>& ele)
{
    std::vector<uint8_t> buffer(sizeof(barretenberg::fr::field_t) * ele.size());  
    for (size_t i = 0; i < ele.size(); ++i)
    {
        barretenberg::fr::serialize_to_buffer(ele[i], &buffer[i * sizeof(barretenberg::fr::field_t)]);
    }
    return buffer;
}

inline std::vector<uint8_t> convert_g1_element(const barretenberg::g1::affine_element& ele)
{
    std::vector<uint8_t> buffer(sizeof(barretenberg::g1::affine_element));
    barretenberg::g1::serialize_to_buffer(ele, &buffer[0]);
    return buffer;
}

inline std::vector<barretenberg::fr::field_t> read_field_elements(const std::vector<uint8_t>& buffer)
{
    const size_t num_elements = buffer.size() / sizeof(barretenberg::fr::field_t);
    std::vector<barretenberg::fr::field_t> elements;
    for (size_t i = 0; i < num_elements; ++i)
    {
        elements.push_back(barretenberg::fr::serialize_from_buffer(&buffer[i * sizeof(barretenberg::fr::field_t)]));
    }
    return elements;
}
} // namespace transcript_helpers
} // namespace waffle