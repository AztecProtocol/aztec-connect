#include <barretenberg/curves/grumpkin/grumpkin.hpp>
#include <barretenberg/misc_crypto/schnorr/schnorr.hpp>

#include <gtest/gtest.h>

using namespace barretenberg;


TEST(schnorr, verify_signature_keccak256)
{
    std::string message = "The quick brown fox jumped over the lazy dog.";

    schnorr::key_pair<grumpkin::fr, grumpkin::g1> account;
    account.private_key = grumpkin::fr::random_element();
    account.public_key = grumpkin::g1::group_exponentiation(grumpkin::g1::affine_one, account.private_key);

    schnorr::signature signature = schnorr::construct_signature<KeccakHasher, grumpkin::fq, grumpkin::fr, grumpkin::g1>(message, account);

    bool result = schnorr::verify_signature<KeccakHasher, grumpkin::fq, grumpkin::fr, grumpkin::g1>(message, account.public_key, signature);

    EXPECT_EQ(result, true);
}


TEST(schnorr, verify_signature_sha256)
{
    std::string message = "The quick brown dog jumped over the lazy fox.";

    schnorr::key_pair<grumpkin::fr, grumpkin::g1> account;
    account.private_key = grumpkin::fr::random_element();
    account.public_key = grumpkin::g1::group_exponentiation(grumpkin::g1::affine_one, account.private_key);

    schnorr::signature signature = schnorr::construct_signature<Sha256Hasher, grumpkin::fq, grumpkin::fr, grumpkin::g1>(message, account);

    bool result = schnorr::verify_signature<Sha256Hasher, grumpkin::fq, grumpkin::fr, grumpkin::g1>(message, account.public_key, signature);

    EXPECT_EQ(result, true);
}