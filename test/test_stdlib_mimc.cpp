#include <gtest/gtest.h>

#include <barretenberg/waffle/composer/standard_composer.hpp>
#include <barretenberg/waffle/composer/mimc_composer.hpp>
#include <barretenberg/waffle/proof_system/preprocess.hpp>
#include <barretenberg/waffle/proof_system/prover/prover.hpp>
#include <barretenberg/waffle/proof_system/verifier/verifier.hpp>

#include <barretenberg/waffle/stdlib/field/field.hpp>
#include <barretenberg/waffle/stdlib/mimc.hpp>

#include <memory>


using namespace barretenberg;
using namespace plonk;

TEST(stdlib_mimc, composer_consistency_check)
{
    waffle::StandardComposer standard_composer = waffle::StandardComposer();
    waffle::MiMCComposer mimc_composer = waffle::MiMCComposer();

    fr::field_t input = fr::random_element();
    fr::field_t k_in = fr::zero();

    stdlib::field_t<waffle::StandardComposer> standard_input(&standard_composer, stdlib::witness_t(input));
    stdlib::field_t<waffle::StandardComposer> standard_k(&standard_composer, stdlib::witness_t(k_in));

    stdlib::field_t<waffle::MiMCComposer> mimc_input(&mimc_composer, stdlib::witness_t(input));
    stdlib::field_t<waffle::MiMCComposer> mimc_k(&mimc_composer, stdlib::witness_t(k_in));

    stdlib::field_t<waffle::StandardComposer> standard_out = mimc_hash(standard_input, standard_k);
    standard_out = standard_out.normalize();

    stdlib::field_t<waffle::MiMCComposer> mimc_out = mimc_hash(mimc_input, mimc_k);

    EXPECT_EQ(fr::eq(standard_out.witness, mimc_out.witness), true);

    waffle::Prover provers[2]{
        standard_composer.preprocess(),
        mimc_composer.preprocess()
    };
    waffle::Verifier verifiers[2]{
         waffle::preprocess(provers[0]),
         waffle::preprocess(provers[1])
    };
    waffle::plonk_proof proofs[2]{
        provers[0].construct_proof(),
        provers[1].construct_proof()
    };
    bool results[2]{
        verifiers[0].verify_proof(proofs[0]),
        verifiers[1].verify_proof(proofs[1])
    };
    EXPECT_EQ(results[0], true);
    EXPECT_EQ(results[1], true);
}

TEST(stdlib_mimc, repeated_hashing)
{
    waffle::MiMCComposer mimc_composer = waffle::MiMCComposer();
    fr::field_t input = fr::random_element();
    fr::field_t k_in = fr::zero();

    stdlib::field_t<waffle::MiMCComposer> mimc_input(&mimc_composer, stdlib::witness_t(input));
    stdlib::field_t<waffle::MiMCComposer> mimc_k(&mimc_composer, stdlib::witness_t(k_in));
    stdlib::field_t<waffle::MiMCComposer> mimc_output(&mimc_composer);
    constexpr size_t num_hashes = 100;

    for (size_t i = 0; i < num_hashes; ++i)
    {
        mimc_output = mimc_hash(mimc_input, mimc_k);
        mimc_k = mimc_k + mimc_input;
        mimc_input = mimc_output;
    }

    waffle::Prover prover = mimc_composer.preprocess();

    waffle::Verifier verifier = waffle::preprocess(prover);

    waffle::plonk_proof proof = prover.construct_proof();

    bool result = verifier.verify_proof(proof);
    EXPECT_EQ(result, true);
}
