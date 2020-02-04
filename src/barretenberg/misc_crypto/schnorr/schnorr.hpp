#pragma once

#include "../../keccak/keccak.h"
#include "../sha256/sha256.hpp"

struct KeccakHasher
{
    static std::vector<uint8_t> hash(const std::vector<uint8_t>& message)
    {
        keccak256 hash_result = ethash_keccak256(&message[0], message.size());

        std::vector<uint8_t> output;
        output.resize(32);

        memcpy((void*)&output[0], (void*)&hash_result.word64s[0], 32);
        return output;
    }
};

struct Sha256Hasher
{
    static std::vector<uint8_t> hash(const std::vector<uint8_t>& message)
    {
        return sha256::sha256(message);
    } 
};

namespace crypto
{
namespace schnorr
{
    template <typename Fr, typename G1>
    struct key_pair
    {
        typename Fr::field_t private_key;
        typename G1::affine_element public_key;
    };

    struct signature
    {
        std::vector<uint8_t> s;
        std::vector<uint8_t> e;
    };

    template <typename Hash, typename Fq, typename Fr, typename G1>
    bool verify_signature(const std::string& message, const typename G1::affine_element& public_key, const signature& sig);

    template <typename Hash, typename Fq, typename Fr, typename G1>
    signature construct_signature(const std::string& message, const key_pair<Fr, G1>& account);
}
}
#include "./schnorr.tcc"