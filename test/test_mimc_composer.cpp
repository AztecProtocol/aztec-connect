#include <gtest/gtest.h>

#include <barretenberg/waffle/composer/mimc_composer.hpp>
#include <barretenberg/waffle/proof_system/preprocess.hpp>
#include <barretenberg/waffle/proof_system/widgets/arithmetic_widget.hpp>
#include <barretenberg/waffle/proof_system/prover/prover.hpp>
#include <barretenberg/waffle/proof_system/verifier/verifier.hpp>

#include <barretenberg/polynomials/polynomial_arithmetic.hpp>
#include <memory>

using namespace barretenberg;

TEST(mimc_composer, test_mimc_gate_proof)
{
    size_t n = 64;
    waffle::MiMCComposer composer = waffle::MiMCComposer(n);
    fr::field_t c[n];
    for (size_t i = 0; i < n; ++i)
    {
        c[i] = fr::random_element();
    }
    fr::field_t x = fr::random_element();
    fr::field_t k = fr::random_element();

    uint32_t x_in_idx = composer.add_variable(x);
    uint32_t k_idx = composer.add_variable(k);
    uint32_t x_out_idx;
    uint32_t x_cubed_idx = 0;
    for (size_t i = 0; i < n; ++i)
    {
        fr::field_t T0 = fr::add(fr::add(x, k), c[i]);
        fr::field_t x_cubed = fr::sqr(T0);
        x_cubed = fr::mul(x_cubed, T0);
        x_cubed_idx = composer.add_variable(x_cubed);
        fr::field_t x_out = fr::sqr(x_cubed);
        x_out = fr::mul(x_out, T0);
        x_out_idx = composer.add_variable(x_out);
        composer.create_mimc_gate({x_in_idx, x_cubed_idx, k_idx, x_out_idx, c[i] });
        x_in_idx = x_out_idx;
        x = x_out;
    }

    waffle::Prover prover = composer.preprocess();

    waffle::Verifier verifier = waffle::preprocess(prover);

    waffle::plonk_proof proof = prover.construct_proof();

    bool result = verifier.verify_proof(proof); // instance, prover.reference_string.SRS_T2);
    EXPECT_EQ(result, true);
}
