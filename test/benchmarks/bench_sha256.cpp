#include <benchmark/benchmark.h>

#include "math.h"

#include <barretenberg/fields/fr.hpp>

#include <barretenberg/waffle/composer/extended_composer.hpp>
#include <barretenberg/waffle/composer/standard_composer.hpp>
#include <barretenberg/waffle/proof_system/preprocess.hpp>
#include <barretenberg/waffle/proof_system/prover/prover.hpp>
#include <barretenberg/waffle/proof_system/verifier/verifier.hpp>

#include <barretenberg/waffle/stdlib/uint32/uint32.hpp>
#include <barretenberg/waffle/stdlib/crypto/hash/sha256.hpp>

using namespace benchmark;

typedef plonk::stdlib::uint32<waffle::ExtendedComposer> uint32;
typedef plonk::stdlib::witness_t<waffle::ExtendedComposer> witness_t;

constexpr size_t MAX_HASHES = 10;

uint32_t get_random_int()
{
return static_cast<uint32_t>(barretenberg::fr::random_element().data[0]);
}

void generate_test_plonk_circuit(waffle::ExtendedComposer& composer, size_t num_hashes)
{
    for (size_t j = 0; j < num_hashes; ++j)
    {
        std::array<uint32, 16> inputs;
        for (size_t i = 0; i < 16; ++i)
        {
            inputs[i] = witness_t(&composer, get_random_int());
        }
        std::array<uint32, 8> h;
        prepare_constants(h);
        plonk::stdlib::sha256_block(h, inputs);
    }
}

waffle::Prover provers[MAX_HASHES];
waffle::Verifier verifiers[MAX_HASHES];
waffle::plonk_proof proofs[MAX_HASHES];

void construct_witnesses_bench(State& state) noexcept
{
    for (auto _ : state)
    {
        waffle::ExtendedComposer composer = waffle::ExtendedComposer(static_cast<size_t>(state.range(0)));
        generate_test_plonk_circuit(composer, static_cast<size_t>(state.range(0)));
        size_t idx = static_cast<size_t>((state.range(0))) - 1;
        provers[idx] = composer.preprocess();
    }
}
BENCHMARK(construct_witnesses_bench)->DenseRange(1, MAX_HASHES, 1);

void construct_instances_bench(State& state) noexcept
{
    for (auto _ : state)
    {
        size_t idx = static_cast<size_t>((state.range(0))) - 1;
        verifiers[idx] = (waffle::preprocess(provers[idx]));
    }
}
BENCHMARK(construct_instances_bench)->DenseRange(1, MAX_HASHES, 1);

void construct_proofs_bench(State& state) noexcept
{
    for (auto _ : state)
    {
        size_t idx = static_cast<size_t>((state.range(0))) - 1;
        proofs[idx] = provers[idx].construct_proof();
        state.PauseTiming();
        provers[idx].reset();
        state.ResumeTiming();
    }
}
BENCHMARK(construct_proofs_bench)->DenseRange(1, MAX_HASHES, 1);

void verify_proofs_bench(State& state) noexcept
{
    for (auto _ : state)
    {
        size_t idx = static_cast<size_t>((state.range(0))) - 1;
        bool valid = verifiers[idx].verify_proof(proofs[idx]);
        state.PauseTiming();
        if (!valid)
        {
            printf("hey! proof not valid!\n");
        }
        state.ResumeTiming();
    }
}
BENCHMARK(verify_proofs_bench)->DenseRange(1, MAX_HASHES, 1);

BENCHMARK_MAIN();
