#include <benchmark/benchmark.h>

using namespace benchmark;

#include <gmp.h>
#include <iostream>
#include <time.h>
#include <pthread.h> 
#include <string.h>

#include <barretenberg/fields/fq.hpp>
#include <barretenberg/fields/fr.hpp>
#include <barretenberg/groups/g1.hpp>
#include <barretenberg/groups/g2.hpp>
#include <barretenberg/groups/scalar_multiplication.hpp>
#include <barretenberg/groups/pairing.hpp>

using namespace barretenberg;

struct multiplication_data
{
    g1::affine_element* points;
    fr::field_t* scalars;
};

struct pippenger_point_data
{
    fr::field_t* scalars;
    g1::affine_element* points;
};

constexpr size_t NUM_POINTS = 1048576;
constexpr size_t NUM_THREADS = 8;

// optimal bucket count for 1 million = 15
void generate_points(multiplication_data& data)
{
    data.scalars = (fr::field_t*)aligned_alloc(32, sizeof(fr::field_t) * NUM_POINTS * NUM_THREADS);
    data.points = (g1::affine_element*)aligned_alloc(32, sizeof(g1::affine_element) * NUM_POINTS * 2 * NUM_THREADS);

    g1::element small_table[10000];
    for (size_t i = 0; i < 10000; ++i)
    {
        small_table[i] = g1::random_element();
    }
    g1::element current_table[10000];
    for (size_t i = 0; i < ((NUM_POINTS) / 10000); ++i)
    {
        for (size_t j = 0; j < 10000; ++j)
        {
            g1::add(small_table[i], small_table[j], current_table[j]);
        }
        g1::batch_normalize(&current_table[0], 10000);
        for (size_t j = 0; j < 10000; ++j)
        {
            fq::copy(current_table[j].x, data.points[i * 10000 + j].x);
            fq::copy(current_table[j].y, data.points[i * 10000 + j].y);
        }
    }
    g1::batch_normalize(small_table, 10000);
    size_t rounded = ((NUM_POINTS) / 10000) * 10000;
    size_t leftovers = (NUM_POINTS) - rounded;
    for (size_t j = 0;  j < leftovers; ++j)
    {
            fq::copy(small_table[j].x, data.points[rounded + j].x);
            fq::copy(small_table[j].y, data.points[rounded + j].y);
    }

    for (size_t i = 0; i < (NUM_POINTS); ++i)
    {
        data.scalars[i] = fr::random_element();
    }
    scalar_multiplication::generate_pippenger_point_table(data.points, data.points, (NUM_POINTS));
    printf("boop\n");
    for (size_t i = 1; i < NUM_THREADS; ++i)
    {
        memcpy((void*)&data.points[NUM_POINTS * i], (void*)&data.points[0], sizeof(g1::affine_element) * NUM_POINTS);
        memcpy((void*)&data.scalars[NUM_POINTS * i], (void*)&data.scalars[0], sizeof(fr::field_t) * NUM_POINTS);

    }
}

multiplication_data point_data;

g1::affine_element g1_pair_points[2];
g2::affine_element g2_pair_points[2];

void generate_pairing_points(g1::affine_element* p1s, g2::affine_element* p2s)
{
    p1s[0] = g1::random_affine_element();
    p1s[1] = g1::random_affine_element();
    p2s[0] = g2::random_affine_element();
    p2s[1] = g2::random_affine_element();
}

const auto init = []() {
    generate_pairing_points(&g1_pair_points[0], &g2_pair_points[0]);
    printf("generating point data\n");
    generate_points(point_data);
    printf("generated point data\n");
    return true;
}();

uint64_t rdtsc(){
    unsigned int lo,hi;
    __asm__ __volatile__ ("rdtsc" : "=a" (lo), "=d" (hi));
    return ((uint64_t)hi << 32) | lo;
}


inline uint64_t fq_sqr_asm(fq::field_t& a, fq::field_t& r) noexcept
{
    for (size_t i = 0; i < 10000000; ++i)
    {
        fq::sqr(a, r);
    }
    return 1;
}


inline uint64_t fq_mul_asm(fq::field_t& a, fq::field_t& r) noexcept
{
    for (size_t i = 0; i < 10000000; ++i)
    {
        fq::mul(a, r, r);
    }
    return 1;
}

void *pippenger_single(void* v_args) noexcept
{
    pippenger_point_data* data = (pippenger_point_data*)v_args;
    uint64_t clk_start = rdtsc();
    scalar_multiplication::pippenger(&data->scalars[0], &data->points[0], NUM_POINTS);
    uint64_t clk_end = rdtsc();
    printf("num clks = %lu\n", clk_end - clk_start);
    return NULL;
}


void pairing_twin_bench(State& state) noexcept
{
    for (auto _ : state)
    {
        // uint64_t before = rdtsc();
        DoNotOptimize(pairing::reduced_ate_pairing_batch(&g1_pair_points[0], &g2_pair_points[0], 2));
        // uint64_t after = rdtsc();
        // printf("twin pairing clock cycles = %lu\n", (after - before));
    }
}
BENCHMARK(pairing_twin_bench);

void pippenger_multicore_bench(State& state) noexcept
{
    pthread_t thread[NUM_THREADS]; 
    printf("Before Thread\n");
    pippenger_point_data *inputs = (pippenger_point_data*)malloc(sizeof(pippenger_point_data) * NUM_THREADS);
    for (auto _ : state)
    {
        for (size_t i = 0; i < NUM_THREADS; ++i)
        {
            size_t inc = i * NUM_POINTS;
            inputs[i].scalars = &point_data.scalars[inc];
            inputs[i].points = &point_data.points[inc];
            pthread_create(&thread[i], NULL, &pippenger_single, (void *)(&inputs[i]));
        }
        for (size_t j = 0; j < NUM_THREADS; ++j)
        {
            pthread_join(thread[j], NULL);
        }
    }
    printf("After Thread\n"); 
    free(inputs);
}
BENCHMARK(pippenger_multicore_bench);

void pippenger_bench(State& state) noexcept
{
    for (auto _ : state)
    {
        uint64_t before = rdtsc();
        DoNotOptimize(scalar_multiplication::pippenger(&point_data.scalars[0], &point_data.points[0], NUM_POINTS));
        uint64_t after = rdtsc();
        printf("pippenger single clock cycles = %lu\n", (after - before));
    }
}
BENCHMARK(pippenger_bench);

// void libff_pippenger_bench(State &state) noexcept
// {
//     for (auto _ : state)
//     {
//         DoNotOptimize(libff::multi_exp<libff::alt_bn128_G1, libff::alt_bn128_Fr, libff::multi_exp_method_BDLO12>(
//             point_data.libff_points.begin(),
//             point_data.libff_points.end(),
//             point_data.libff_scalars.begin(),
//             point_data.libff_scalars.end(),
//             1));
//     }
// }
// BENCHMARK(libff_pippenger_bench);

void add_bench(State& state) noexcept
{
    // uint64_t count = 0;
    // uint64_t i = 0;
    g1::element a = g1::random_element();
    g1::element b = g1::random_element();
    for (auto _ : state)
    {
        for (size_t i = 0; i < 10000000; ++i)
        {
            g1::add(a, b, a);
        }
    }
    // printf("number of cycles = %lu\n", count / i);
    // printf("r_2 = [%lu, %lu, %lu, %lu]\n", r_2[0], r_2[1], r_2[2], r_2[3]);
}
BENCHMARK(add_bench);

void mixed_add_bench(State& state) noexcept
{
    // uint64_t count = 0;
    // uint64_t i = 0;
    g1::element a = g1::random_element();
    g1::affine_element b = g1::random_affine_element();
    for (auto _ : state)
    {
        for (size_t i = 0; i < 10000000; ++i)
        {
            g1::mixed_add(a, b, a);
        }
    }
    // printf("number of cycles = %lu\n", count / i);
    // printf("r_2 = [%lu, %lu, %lu, %lu]\n", r_2[0], r_2[1], r_2[2], r_2[3]);
}
BENCHMARK(mixed_add_bench);

void fq_sqr_asm_bench(State& state) noexcept
{
    uint64_t count = 0;
    uint64_t i = 0;
    fq::field_t a = { .data = { 0x1122334455667788, 0x8877665544332211, 0x0123456701234567, 0x0efdfcfbfaf9f8f7 } };
    fq::field_t r = { .data = { 1, 0, 0, 0 } };
    for (auto _ : state)
    {
        size_t before = rdtsc();
        (DoNotOptimize(fq_sqr_asm(a, r)));
        size_t after = rdtsc();
        count += after - before;
        ++i;
    }
    printf("sqr number of cycles = %lu\n", count / i);
    // printf("r_2 = [%lu, %lu, %lu, %lu]\n", r_2[0], r_2[1], r_2[2], r_2[3]);
}
BENCHMARK(fq_sqr_asm_bench);

void fq_mul_asm_bench(State& state) noexcept
{
    uint64_t count = 0;
    uint64_t i = 0;
    fq::field_t a = { .data = { 0x1122334455667788, 0x8877665544332211, 0x0123456701234567, 0x0efdfcfbfaf9f8f7 } };
    fq::field_t r = { .data = { 1, 0, 0, 0 } };
    for (auto _ : state)
    {
        size_t before = rdtsc();
        (DoNotOptimize(fq_mul_asm(a, r)));
        size_t after = rdtsc();
        count += after - before;
        ++i;
    }
    printf("mul number of cycles = %lu\n", count / i);
    // printf("r_2 = [%lu, %lu, %lu, %lu]\n", r_2[0], r_2[1], r_2[2], r_2[3]);
}
BENCHMARK(fq_mul_asm_bench);

BENCHMARK_MAIN();
// 21218750000