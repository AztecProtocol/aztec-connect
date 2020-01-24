#include <benchmark/benchmark.h>

#include <math.h>

#include <barretenberg/waffle/stdlib/merkle_tree/leveldb_store.hpp>

using namespace benchmark;
using namespace plonk::stdlib::merkle_tree;

void insert_element_bench(State& state) noexcept
{
    leveldb::DestroyDB("/tmp/insert_element_bench", leveldb::Options());
    LevelDbStore db("/tmp/insert_element_bench", 32);
    size_t index = 0;
    for (auto _ : state) {
        barretenberg::fr::field_t element = barretenberg::fr::random_element();
        db.update_element(index, element);
        ++index;
    }
}
BENCHMARK(insert_element_bench)->Unit(benchmark::kMillisecond);
;

BENCHMARK_MAIN();
