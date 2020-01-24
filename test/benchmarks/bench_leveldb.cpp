#include <benchmark/benchmark.h>

#include <iostream>
#include <math.h>

#include <barretenberg/waffle/stdlib/merkle_tree/hash.hpp>
#include <barretenberg/waffle/stdlib/merkle_tree/leveldb_store.hpp>

using namespace benchmark;
using namespace plonk::stdlib::merkle_tree;

constexpr size_t DEPTH = 256;

void hash(State& state) noexcept
{
    for (auto _ : state) {
        hash({ { { 0, 0, 0, 0 } }, { { 1, 1, 1, 1 } } });
    }
}
BENCHMARK(hash);

void update_first_element(State& state) noexcept
{
    leveldb::DestroyDB("/tmp/leveldb_bench", leveldb::Options());
    LevelDbStore db("/tmp/leveldb_bench", DEPTH);
    for (auto _ : state) {
        db.update_element(0, { { 0, 0, 0, 1 } });
    }
}
BENCHMARK(update_first_element)->Unit(benchmark::kMillisecond);

void update_elements(State& state) noexcept
{
    for (auto _ : state) {
        state.PauseTiming();
        leveldb::DestroyDB("/tmp/leveldb_bench", leveldb::Options());
        LevelDbStore db("/tmp/leveldb_bench", DEPTH);
        state.ResumeTiming();
        for (size_t i = 0; i < (size_t)state.range(0); ++i) {
            db.update_element(i, { { 0, 0, 0, i } });
        }
    }
}
BENCHMARK(update_elements)->Unit(benchmark::kMillisecond)->RangeMultiplier(2)->Range(256, 8 << 9);

void update_1024_random_elements(State& state) noexcept
{
    for (auto _ : state) {
        state.PauseTiming();
        leveldb::DestroyDB("/tmp/leveldb_bench", leveldb::Options());
        LevelDbStore db("/tmp/leveldb_bench", DEPTH);
        for (size_t i = 0; i < 1024; i++) {
            state.PauseTiming();
            size_t index;
            getentropy((void*)&index, sizeof(index));
            state.ResumeTiming();
            db.update_element(index, { { 0, 0, 0, index } });
        }
    }
}
BENCHMARK(update_1024_random_elements)->Unit(benchmark::kMillisecond);

BENCHMARK_MAIN();
