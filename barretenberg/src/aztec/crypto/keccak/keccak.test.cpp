#include "keccak.hpp"
#include <gtest/gtest.h>
#include <memory>

TEST(misc_keccak, test_NIST_vector_one)
{
    std::string input_str = "abc";

    // Write input string into byte vector.
    std::vector<uint8_t> input;
    std::copy(input_str.begin(), input_str.end(), std::back_inserter(input));

    // Calculate the hash.
    keccak256 hash_result = ethash_keccak256(&input[0], input.size());

    // Write output to byte vector.
    std::vector<uint8_t> output;
    output.resize(32);
    memcpy((void*)&output[0], (void*)&hash_result.word64s[0], 32);

    // Expected output.
    std::vector<uint8_t> expected = {
        0x4E, 0x03, 0x65, 0x7A, 0xEA, 0x45, 0xA9, 0x4F, 0xC7, 0xD4, 0x7B, 0xA8, 0x26, 0xC8, 0xD6, 0x67,
        0xC0, 0xD1, 0xE6, 0xE3, 0x3A, 0x64, 0xA0, 0x36, 0xEC, 0x44, 0xF5, 0x8F, 0xA1, 0x2D, 0x6C, 0x45,
    };

    for (size_t i = 0; i < 9; ++i) {
        EXPECT_EQ(output[i], expected[i]);
    }
}
