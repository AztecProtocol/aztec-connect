#include <benchmark/benchmark.h>

#include <math.h>

#include <barretenberg/curves/bn254/fr.hpp>

#include <barretenberg/waffle/composer/turbo_composer.hpp>
#include <barretenberg/waffle/proof_system/preprocess.hpp>
#include <barretenberg/waffle/proof_system/prover/prover.hpp>
#include <barretenberg/waffle/proof_system/verifier/verifier.hpp>

#include <barretenberg/waffle/stdlib/field/field.hpp>
#include <barretenberg/waffle/stdlib/crypto/hash/pedersen.hpp>

using namespace benchmark;

constexpr size_t MAX_REPETITIONS = 4000; // 1791;

constexpr size_t STARTING_NUM_HASHES = 4000; // 1791; // 1535;// 255;
constexpr size_t NUM_HASHES_PER_REPETITION = 256;
constexpr size_t NUM_CIRCUITS = 1 + ((MAX_REPETITIONS - STARTING_NUM_HASHES) / NUM_HASHES_PER_REPETITION);

void generate_test_pedersen_circuit(waffle::TurboComposer& turbo_composer, size_t num_repetitions)
{
    plonk::stdlib::field_t<waffle::TurboComposer> left(
        plonk::stdlib::witness_t(&turbo_composer, barretenberg::fr::random_element()));
    plonk::stdlib::field_t<waffle::TurboComposer> out(
        plonk::stdlib::witness_t(&turbo_composer, barretenberg::fr::random_element()));

    for (size_t i = 0; i < num_repetitions; ++i)
    {
        out = plonk::stdlib::pedersen::compress(left, out);
    }
}

waffle::TurboProver pedersen_provers[NUM_CIRCUITS];
waffle::Verifier pedersen_verifiers[NUM_CIRCUITS];
waffle::plonk_proof pedersen_proofs[NUM_CIRCUITS];

void construct_pedersen_witnesses_bench(State &state) noexcept
{
    for (auto _ : state)
    {
        waffle::TurboComposer composer = waffle::TurboComposer(static_cast<size_t>(state.range(0)));
        generate_test_pedersen_circuit(composer, static_cast<size_t>(state.range(0)));
        composer.compute_witness();
    }
}
BENCHMARK(construct_pedersen_witnesses_bench)->DenseRange(STARTING_NUM_HASHES, MAX_REPETITIONS, NUM_HASHES_PER_REPETITION);

void construct_pedersen_proving_keys_bench(State &state) noexcept
{
    for (auto _ : state)
    {
        waffle::TurboComposer composer = waffle::TurboComposer(static_cast<size_t>(state.range(0)));
        generate_test_pedersen_circuit(composer, static_cast<size_t>(state.range(0)));
        size_t idx = ((static_cast<size_t>((state.range(0))) - static_cast<size_t>(STARTING_NUM_HASHES)) / NUM_HASHES_PER_REPETITION);
        composer.compute_proving_key();
        state.PauseTiming();
        pedersen_provers[idx] = composer.preprocess();
        state.ResumeTiming();
    }
}
BENCHMARK(construct_pedersen_proving_keys_bench)->DenseRange(STARTING_NUM_HASHES, MAX_REPETITIONS, NUM_HASHES_PER_REPETITION);

void construct_pedersen_instances_bench(State &state) noexcept
{
    for (auto _ : state)
    {
        size_t idx = ((static_cast<size_t>((state.range(0))) - static_cast<size_t>(STARTING_NUM_HASHES)) / NUM_HASHES_PER_REPETITION);
        pedersen_verifiers[idx] = (waffle::preprocess(pedersen_provers[idx]));
    }
}
BENCHMARK(construct_pedersen_instances_bench)->DenseRange(STARTING_NUM_HASHES, MAX_REPETITIONS, NUM_HASHES_PER_REPETITION);

void construct_pedersen_proofs_bench(State &state) noexcept
{
    for (auto _ : state)
    {
        size_t idx = ((static_cast<size_t>((state.range(0))) - static_cast<size_t>(STARTING_NUM_HASHES)) / NUM_HASHES_PER_REPETITION);
        pedersen_proofs[idx] = pedersen_provers[idx].construct_proof();
        state.PauseTiming();
        pedersen_provers[idx].reset();
        state.ResumeTiming();
    }
}
BENCHMARK(construct_pedersen_proofs_bench)->DenseRange(STARTING_NUM_HASHES, MAX_REPETITIONS, NUM_HASHES_PER_REPETITION);

void verify_pedersen_proofs_bench(State &state) noexcept
{
    for (auto _ : state)
    {
        size_t idx = ((static_cast<size_t>((state.range(0))) - static_cast<size_t>(STARTING_NUM_HASHES)) / NUM_HASHES_PER_REPETITION);
        bool result = pedersen_verifiers[idx].verify_proof(pedersen_proofs[idx]);
        state.PauseTiming();
        if (!result)
        {
            printf("hey! proof isn't valid!\n");

        }
        state.ResumeTiming();
    }
}
BENCHMARK(verify_pedersen_proofs_bench)->DenseRange(STARTING_NUM_HASHES, MAX_REPETITIONS, NUM_HASHES_PER_REPETITION);

BENCHMARK_MAIN();
