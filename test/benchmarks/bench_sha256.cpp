#include <benchmark/benchmark.h>

#include <math.h>

#include <barretenberg/curves/bn254/fr.hpp>

#include <barretenberg/waffle/composer/extended_composer.hpp>
#include <barretenberg/waffle/composer/standard_composer.hpp>
#include <barretenberg/waffle/proof_system/preprocess.hpp>
#include <barretenberg/waffle/proof_system/prover/prover.hpp>
#include <barretenberg/waffle/proof_system/verifier/verifier.hpp>

#include <barretenberg/waffle/stdlib/crypto/hash/sha256.hpp>
#include <barretenberg/waffle/stdlib/uint32/uint32.hpp>

using namespace benchmark;

typedef plonk::stdlib::uint32<waffle::ExtendedComposer> uint32;
typedef plonk::stdlib::witness_t<waffle::ExtendedComposer> witness_t;
typedef plonk::stdlib::bitarray<waffle::ExtendedComposer> bitarray;

constexpr size_t NUM_HASHES = 10;
constexpr size_t MAX_BYTES = 55 + (9 * 64);

char get_random_char()
{
    return static_cast<char>(barretenberg::fr::random_element().data[0] % 8);
}

void generate_test_plonk_circuit(waffle::ExtendedComposer& composer, size_t num_bytes)
{
    std::string in;
    in.resize(num_bytes);
    for (size_t i = 0; i < num_bytes; ++i) {
        in[i] = get_random_char();
    }
    bitarray input(&composer, in);
    plonk::stdlib::sha256(input);
    // for (size_t j = 0; j < num_hashes; ++j)
    // {
    //     std::array<uint32, 16> inputs;
    //     for (size_t i = 0; i < 16; ++i)
    //     {
    //         inputs[i] = witness_t(&composer, get_random_int());
    //     }
    //     std::array<uint32, 8> h;
    //     prepare_constants(h);
    //     plonk::stdlib::sha256_block(h, inputs);
    // }
}

waffle::ExtendedComposer composers[NUM_HASHES];
waffle::ExtendedProver provers[NUM_HASHES];
waffle::ExtendedVerifier verifiers[NUM_HASHES];
waffle::plonk_proof proofs[NUM_HASHES];

void construct_witnesses_bench(State& state) noexcept
{
    for (auto _ : state) {
        size_t idx = (static_cast<size_t>((state.range(0))) - 55) / 64;
        composers[idx] = waffle::ExtendedComposer(static_cast<size_t>(state.range(0)));
        generate_test_plonk_circuit(composers[idx], static_cast<size_t>(state.range(0)));
    }
}
BENCHMARK(construct_witnesses_bench)->DenseRange(55, MAX_BYTES, 64);

void preprocess_witnesses_bench(State& state) noexcept
{
    for (auto _ : state) {
        size_t idx = (static_cast<size_t>((state.range(0))) - 55) / 64;
        provers[idx] = composers[idx].preprocess();
        printf("num bytes = %" PRIx64 ", num gates = %zu\n", state.range(0), composers[idx].get_num_gates());
    }
}
BENCHMARK(preprocess_witnesses_bench)->DenseRange(55, MAX_BYTES, 64);

void construct_instances_bench(State& state) noexcept
{
    for (auto _ : state) {
        size_t idx = (static_cast<size_t>((state.range(0))) - 55) / 64;
        verifiers[idx] = (waffle::preprocess(provers[idx]));
    }
}
BENCHMARK(construct_instances_bench)->DenseRange(55, MAX_BYTES, 64);

void construct_proofs_bench(State& state) noexcept
{
    for (auto _ : state) {
        size_t idx = (static_cast<size_t>((state.range(0))) - 55) / 64;
        proofs[idx] = provers[idx].construct_proof();
        state.PauseTiming();
        provers[idx].reset();
        state.ResumeTiming();
    }
}
BENCHMARK(construct_proofs_bench)->DenseRange(55, MAX_BYTES, 64);

void verify_proofs_bench(State& state) noexcept
{
    for (auto _ : state) {
        size_t idx = (static_cast<size_t>((state.range(0))) - 55) / 64;
        bool valid = verifiers[idx].verify_proof(proofs[idx]);
        state.PauseTiming();
        if (!valid) {
            printf("hey! proof not valid!\n");
        }
        state.ResumeTiming();
    }
}
BENCHMARK(verify_proofs_bench)->DenseRange(55, MAX_BYTES, 64);

BENCHMARK_MAIN();
