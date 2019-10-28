#include <benchmark/benchmark.h>

#include "math.h"

#include <barretenberg/fields/fr.hpp>

#include <barretenberg/waffle/composer/mimc_composer.hpp>
#include <barretenberg/waffle/composer/standard_composer.hpp>
#include <barretenberg/waffle/proof_system/prover/prover.hpp>
#include <barretenberg/waffle/proof_system/verifier/verifier.hpp>
#include <barretenberg/waffle/proof_system/preprocess.hpp>

#include <barretenberg/waffle/stdlib/field/field.hpp>
#include <barretenberg/waffle/stdlib/mimc.hpp>

using namespace benchmark;

constexpr size_t MAX_GATES = 1 << 20;
constexpr size_t NUM_CIRCUITS = 8;
constexpr size_t START = (1 << 20) >> (NUM_CIRCUITS - 1);
constexpr size_t NUM_HASH_CIRCUITS = 8;
constexpr size_t MAX_HASH_ROUNDS = 8192;
constexpr size_t START_HASH_ROUNDS = 64;

void generate_test_plonk_circuit(waffle::StandardComposer &composer, size_t num_gates)
{
    plonk::stdlib::field_t a(&composer, plonk::stdlib::witness_t(barretenberg::fr::random_element()));
    plonk::stdlib::field_t b(&composer, plonk::stdlib::witness_t(barretenberg::fr::random_element()));
    plonk::stdlib::field_t c(&composer);
    for (size_t i = 0; i < (num_gates / 4) - 4; ++i)
    {
        c = a + b;
        c = a * c;
        a = b * b;
        b = c * c;
    }
}

void generate_test_mimc_circuit(waffle::MiMCComposer &mimc_composer, size_t num_hashes)
{
    plonk::stdlib::field_t<waffle::MiMCComposer> mimc_input(&mimc_composer, plonk::stdlib::witness_t(barretenberg::fr::random_element()));
    plonk::stdlib::field_t<waffle::MiMCComposer> mimc_k(&mimc_composer, plonk::stdlib::witness_t(barretenberg::fr::zero()));
    plonk::stdlib::field_t<waffle::MiMCComposer> mimc_output(&mimc_composer);
    for (size_t i = 0; i < num_hashes; ++i)
    {
        mimc_output = mimc_hash(mimc_input, mimc_k);
        mimc_k = mimc_k + mimc_input;
        mimc_input = mimc_output;
    }
}

waffle::Prover provers[NUM_CIRCUITS];
waffle::Verifier verifiers[NUM_CIRCUITS];
waffle::plonk_proof proofs[NUM_CIRCUITS];

waffle::Prover mimc_provers[NUM_CIRCUITS];
waffle::Verifier mimc_verifiers[NUM_CIRCUITS];
waffle::plonk_proof mimc_proofs[NUM_CIRCUITS];

// ###
const int64_t hash_sizes[8]{
    78,
    156,
    312,
    625,
    1250,
    2500,
    5000,
    10000
};
void construct_mimc_witnesses_bench(State &state) noexcept
{
    for (auto _ : state)
    {
        waffle::MiMCComposer composer = waffle::MiMCComposer(static_cast<size_t>(state.range(0)));
        generate_test_mimc_circuit(composer, static_cast<size_t>(state.range(0)));
        size_t idx = static_cast<size_t>(log2(state.range(0))) - static_cast<size_t>(log2(START_HASH_ROUNDS));
        mimc_provers[idx] = composer.preprocess();
    }
}
BENCHMARK(construct_mimc_witnesses_bench)->Arg(hash_sizes[0])->Arg(hash_sizes[1])->Arg(hash_sizes[2])->Arg(hash_sizes[3])->Arg(hash_sizes[4])->Arg(hash_sizes[5])->Arg(hash_sizes[6])->Arg(hash_sizes[7]);

void construct_mimc_instances_bench(State &state) noexcept
{
    for (auto _ : state)
    {
        size_t idx = static_cast<size_t>(log2(state.range(0))) - static_cast<size_t>(log2(START_HASH_ROUNDS));
        mimc_verifiers[idx] = (waffle::preprocess(mimc_provers[idx]));
    }
}
BENCHMARK(construct_mimc_instances_bench)->Arg(hash_sizes[0])->Arg(hash_sizes[1])->Arg(hash_sizes[2])->Arg(hash_sizes[3])->Arg(hash_sizes[4])->Arg(hash_sizes[5])->Arg(hash_sizes[6])->Arg(hash_sizes[7]);

void construct_mimc_proofs_bench(State &state) noexcept
{
    for (auto _ : state)
    {
        size_t idx = static_cast<size_t>(log2(state.range(0))) - static_cast<size_t>(log2(START_HASH_ROUNDS));
        mimc_proofs[idx] = mimc_provers[idx].construct_proof();
        state.PauseTiming();
        mimc_provers[idx].reset();
        state.ResumeTiming();
    }
}
BENCHMARK(construct_mimc_proofs_bench)->Arg(hash_sizes[0])->Arg(hash_sizes[1])->Arg(hash_sizes[2])->Arg(hash_sizes[3])->Arg(hash_sizes[4])->Arg(hash_sizes[5])->Arg(hash_sizes[6])->Arg(hash_sizes[7]);

void verify_mimc_proofs_bench(State &state) noexcept
{
    for (auto _ : state)
    {
        size_t idx = static_cast<size_t>(log2(state.range(0))) - static_cast<size_t>(log2(START_HASH_ROUNDS));
        bool result = mimc_verifiers[idx].verify_proof(mimc_proofs[idx]);
        state.PauseTiming();
        if (!result)
        {
            printf("hey! proof isn't valid!\n");
        
        }
        state.ResumeTiming();
    }
}
BENCHMARK(verify_mimc_proofs_bench)->Arg(hash_sizes[0])->Arg(hash_sizes[1])->Arg(hash_sizes[2])->Arg(hash_sizes[3])->Arg(hash_sizes[4])->Arg(hash_sizes[5])->Arg(hash_sizes[6])->Arg(hash_sizes[7]);

// ###

void construct_witnesses_bench(State &state) noexcept
{
    for (auto _ : state)
    {
        waffle::StandardComposer composer = waffle::StandardComposer(static_cast<size_t>(state.range(0)));
        generate_test_plonk_circuit(composer, static_cast<size_t>(state.range(0)));
        size_t idx = static_cast<size_t>(log2(state.range(0))) - static_cast<size_t>(log2(START));
        provers[idx] = composer.preprocess();
    }
}
BENCHMARK(construct_witnesses_bench)->RangeMultiplier(2)->Range(START, MAX_GATES);

void construct_instances_bench(State &state) noexcept
{
    for (auto _ : state)
    {
        size_t idx = static_cast<size_t>(log2(state.range(0))) - static_cast<size_t>(log2(START));
        verifiers[idx] = (waffle::preprocess(provers[idx]));
    }
}
BENCHMARK(construct_instances_bench)->RangeMultiplier(2)->Range(START, MAX_GATES);

void construct_proofs_bench(State &state) noexcept
{
    for (auto _ : state)
    {
        size_t idx = static_cast<size_t>(log2(state.range(0))) - static_cast<size_t>(log2(START));
        proofs[idx] = provers[idx].construct_proof();
        state.PauseTiming();
        provers[idx].reset();
        state.ResumeTiming();
    }
}
BENCHMARK(construct_proofs_bench)->RangeMultiplier(2)->Range(START, MAX_GATES);

void verify_proofs_bench(State &state) noexcept
{
    for (auto _ : state)
    {
        size_t idx = static_cast<size_t>(log2(state.range(0))) - static_cast<size_t>(log2(START));
        bool result = verifiers[idx].verify_proof(proofs[idx]);
        state.PauseTiming();
        if (!result)
        {
            printf("hey! proof isn't valid!\n");
        
        }
        state.ResumeTiming();
    }
}
BENCHMARK(verify_proofs_bench)->RangeMultiplier(2)->Range(START, MAX_GATES);


BENCHMARK_MAIN();
