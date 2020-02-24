#include <barretenberg/curves/grumpkin/grumpkin.hpp>
#include <barretenberg/misc_crypto/schnorr/schnorr.hpp>

#include <gtest/gtest.h>

using namespace barretenberg;

TEST(schnorr, verify_signature_keccak256)
{
    std::string message = "The quick brown fox jumped over the lazy dog.";

    crypto::schnorr::key_pair<grumpkin::fr::field_t, grumpkin::g1> account;
    account.private_key = grumpkin::fr::field_t::random_element();
    account.public_key = grumpkin::g1::group_exponentiation(grumpkin::g1::affine_one, account.private_key);

    crypto::schnorr::signature signature =
        crypto::schnorr::construct_signature<KeccakHasher, grumpkin::fq::field_t, grumpkin::fr::field_t, grumpkin::g1>(
            message, account);

    bool result =
        crypto::schnorr::verify_signature<KeccakHasher, grumpkin::fq::field_t, grumpkin::fr::field_t, grumpkin::g1>(
            message, account.public_key, signature);

    EXPECT_EQ(result, true);
}

TEST(schnorr, verify_signature_sha256)
{
    std::string message = "The quick brown dog jumped over the lazy fox.";

    crypto::schnorr::key_pair<grumpkin::fr::field_t, grumpkin::g1> account;
    account.private_key = grumpkin::fr::field_t::random_element();
    account.public_key = grumpkin::g1::group_exponentiation(grumpkin::g1::affine_one, account.private_key);

    crypto::schnorr::signature signature =
        crypto::schnorr::construct_signature<Sha256Hasher, grumpkin::fq::field_t, grumpkin::fr::field_t, grumpkin::g1>(
            message, account);

    bool result =
        crypto::schnorr::verify_signature<Sha256Hasher, grumpkin::fq::field_t, grumpkin::fr::field_t, grumpkin::g1>(
            message, account.public_key, signature);

    EXPECT_EQ(result, true);
}

TEST(schnorr, verify_ecrecover)
{
    std::string message = "The quick brown dog jumped over the lazy fox.";

    crypto::schnorr::key_pair<grumpkin::fr::field_t, grumpkin::g1> account;
    account.private_key = grumpkin::fr::field_t::random_element();
    account.public_key = grumpkin::g1::group_exponentiation(grumpkin::g1::affine_one, account.private_key);

    crypto::schnorr::signature_b signature = crypto::schnorr::
        construct_signature_b<Sha256Hasher, grumpkin::fq::field_t, grumpkin::fr::field_t, grumpkin::g1>(message,
                                                                                                        account);

    grumpkin::g1::affine_element recovered_key =
        crypto::schnorr::ecrecover<Sha256Hasher, grumpkin::fq::field_t, grumpkin::fr::field_t, grumpkin::g1>(message,
                                                                                                             signature);
    bool result = grumpkin::g1::eq(
        recovered_key, account.public_key); // crypto::schnorr::verify_signature<Sha256Hasher, grumpkin::fq::field_t,
                                            // grumpkin::fr, grumpkin::g1>(message, account.public_key, signature);

    EXPECT_EQ(result, true);
}