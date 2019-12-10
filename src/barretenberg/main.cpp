#include "assert.hpp"
#include "stdlib.h"
//#include <valgrind/callgrind.h>

#include "./waffle/composer/mimc_composer.hpp"
#include "./waffle/composer/standard_composer.hpp"
#include "./waffle/proof_system/preprocess.hpp"
#include "./waffle/proof_system/prover/prover.hpp"
#include "./waffle/proof_system/verifier/verifier.hpp"

#include "./waffle/stdlib/common.hpp"
#include "./waffle/stdlib/field/field.hpp"
#include "./waffle/stdlib/mimc.hpp"
#include "./waffle/waffle_types.hpp"

void generate_test_plonk_circuit(waffle::StandardComposer& composer, size_t num_gates)
{
    plonk::stdlib::field_t a(plonk::stdlib::witness_t(&composer, barretenberg::fr::random_element()));
    plonk::stdlib::field_t b(plonk::stdlib::witness_t(&composer, barretenberg::fr::random_element()));
    plonk::stdlib::field_t c(&composer);
    for (size_t i = 0; i < (num_gates / 4) - 4; ++i)
    {
        c = a + b;
        c = a * c;
        a = b * b;
        b = c * c;
    }
}
constexpr size_t NUM_GATES = 1 << 10;

// size_t get_num_rounds(size_t bucket_size)
// {
//     return (127 + bucket_size) / (bucket_size + 1);
// }

// size_t get_num_bucket_adds(const size_t num_rounds, const size_t bucket_size)
// {
//     size_t num_buckets = 1UL << bucket_size;
//     return (2 * num_buckets + 2) * num_rounds;
// }

// size_t get_next_bucket_size(const size_t bucket_size)
// {
//     size_t old_rounds = get_num_rounds(bucket_size);
//     size_t acc = bucket_size;
//     size_t new_rounds = old_rounds;
//     while (old_rounds <= new_rounds)
//     {
//         ++acc;
//         new_rounds = get_num_rounds(acc);
//     }
//     return acc;
// }

// constexpr double add_to_mixed_add_complexity = 1.36;
int main()
{
    // CALLGRIND_STOP_INSTRUMENTATION;
    printf("generating witnesses\n");
    waffle::StandardComposer composer = waffle::StandardComposer(NUM_GATES);
    generate_test_plonk_circuit(composer, NUM_GATES);
    waffle::Prover prover = composer.preprocess();
    waffle::Verifier verifier = waffle::preprocess(prover);

    printf("constructing proof\n");
    // CALLGRIND_START_INSTRUMENTATION;
    waffle::plonk_proof proof = prover.construct_proof();
    // CALLGRIND_STOP_INSTRUMENTATION;
    // CALLGRIND_DUMP_STATS;

    // printf("test\n");
    // std::vector<size_t> buckets;

    // size_t current_bucket = 1;
    // for (size_t i = 1; i < 1 << 26; ++i)
    // {
    //     size_t num_points = i;
    //     bool found_optimal_bucket = false;
    //     while (!found_optimal_bucket)
    //     {
    //         size_t current_rounds = get_num_rounds(current_bucket);

    //         size_t next_bucket_size = get_next_bucket_size(current_bucket);
    //         size_t next_rounds = get_num_rounds(next_bucket_size);
    //         size_t current_bucket_adds = get_num_bucket_adds(current_rounds, current_bucket);
    //         size_t next_bucket_adds = get_num_bucket_adds(next_rounds, next_bucket_size);

    //         size_t current_mixed_adds = num_points * current_rounds * 2;
    //         size_t next_mixed_adds = num_points * next_rounds * 2;

    //         double current_complexity = static_cast<double>(current_mixed_adds) +
    //         (static_cast<double>(current_bucket_adds) * add_to_mixed_add_complexity); double next_complexity =
    //         static_cast<double>(next_mixed_adds) + (static_cast<double>(next_bucket_adds) *
    //         add_to_mixed_add_complexity);

    //         if (next_complexity < current_complexity)
    //         {
    //             current_bucket = next_bucket_size;
    //             printf("increased bucket size at i = %lu, to %lu\n", i, current_bucket);
    //         }
    //         else
    //         {
    //             found_optimal_bucket = true;
    //         }
    //     }
    // }
}
