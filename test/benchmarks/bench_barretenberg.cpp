#include <benchmark/benchmark.h>

using namespace benchmark;

#include <gmp.h>
#include <iostream>
#include <time.h>
#include <libff/algebra/fields/fp.hpp>
#include <libff/algebra/curves/alt_bn128/alt_bn128_init.hpp>
#include <libff/algebra/curves/alt_bn128/alt_bn128_g1.hpp>
#include <libff/algebra/scalar_multiplication/multiexp.hpp>
#include <pthread.h> 

#include <barretenberg/fields/fq.hpp>
#include <barretenberg/fields/fr.hpp>
#include <barretenberg/groups/g1.hpp>
#include <barretenberg/groups/g2.hpp>
#include <barretenberg/groups/scalar_multiplication.hpp>
#include <barretenberg/groups/pairing.hpp>

struct multiplication_data
{
    g1::affine_element* points;
    fr::field_t* scalars;
    std::vector<libff::alt_bn128_G1> libff_points;
    std::vector<libff::alt_bn128_Fr> libff_scalars; 
};

struct pippenger_point_data
{
    fr::field_t* scalars;
    g1::affine_element* points;
};

constexpr size_t NUM_POINTS = 1048576;
constexpr size_t NUM_THREADS = 8;
constexpr size_t NUM_BUCKETS = 15; // (for 2^23): 17 was 4.3us 18 was 3.88us, 19 was 4us, 20 was 4.3us

// optimal bucket count for 1 million = 15
void generate_points(multiplication_data& data)
{
    data.scalars = (fr::field_t*)aligned_alloc(32, sizeof(fr::field_t) * NUM_POINTS * NUM_THREADS);
    data.points = (g1::affine_element*)aligned_alloc(32, sizeof(g1::affine_element) * NUM_POINTS * 2 * NUM_THREADS);

    data.libff_points.reserve(NUM_POINTS * NUM_THREADS);
    data.libff_scalars.reserve(NUM_POINTS * NUM_THREADS);

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
            // libff::alt_bn128_G1 libff_pt = libff::alt_bn128_G1::one();
            fq::copy(current_table[j].x, data.points[i * 10000 + j].x);
            fq::copy(current_table[j].y, data.points[i * 10000 + j].y);
            // fq::copy(current_table[j].x, *(fq::field_t*)&libff_pt.X.mont_repr.data);
            // fq::copy(current_table[j].y, *(fq::field_t*)&libff_pt.Y.mont_repr.data);
            // data.libff_points.emplace_back(libff_pt);
        }
    }
    g1::batch_normalize(small_table, 10000);
    size_t rounded = ((NUM_POINTS) / 10000) * 10000;
    size_t leftovers = (NUM_POINTS) - rounded;
    for (size_t j = 0;  j < leftovers; ++j)
    {
            // libff::alt_bn128_G1 libff_pt = libff::alt_bn128_G1::one();
            fq::copy(small_table[j].x, data.points[rounded + j].x);
            fq::copy(small_table[j].y, data.points[rounded + j].y);
        
            // fq::copy(small_table[j].x, *(fq::field_t*)&libff_pt.X.mont_repr.data);
            // fq::copy(small_table[j].y, *(fq::field_t*)&libff_pt.Y.mont_repr.data);
            // data.libff_points.emplace_back(libff_pt);
    }

    for (size_t i = 0; i < (NUM_POINTS); ++i)
    {
        fr::random_element(data.scalars[i]);
        // libff::alt_bn128_Fr libff_scalar;
        // fr::copy(data.scalars[i], *(fr::field_t*)&libff_scalar.mont_repr.data);
        // data.libff_scalars.emplace_back(libff_scalar);
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
    libff::init_alt_bn128_params();
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

inline uint64_t fq_mul_libff(libff::alt_bn128_Fq& a, libff::alt_bn128_Fq& r)
{
    for (size_t i = 0; i < 10000000; ++i)
    {
        r = a * r;
    }
    return 1;
}

void *pippenger_single(void* v_args) noexcept
{
    pippenger_point_data* data = (pippenger_point_data*)v_args;
    uint64_t clk_start = rdtsc();
    scalar_multiplication::pippenger(&data->scalars[0], &data->points[0], NUM_POINTS, NUM_BUCKETS);
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
        DoNotOptimize(scalar_multiplication::pippenger(&point_data.scalars[0], &point_data.points[0], NUM_POINTS, NUM_BUCKETS));
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


void dbl_bench(State& state) noexcept
{
    // uint64_t count = 0;
    // uint64_t i = 0;
    g1::element a = g1::random_element();
    for (auto _ : state)
    {
        for (size_t i = 0; i < 10000000; ++i)
        {
            g1::dbl(a, a);
        }
    }
    // printf("number of cycles = %lu\n", count / i);
    // printf("r_2 = [%lu, %lu, %lu, %lu]\n", r_2[0], r_2[1], r_2[2], r_2[3]);
}
BENCHMARK(dbl_bench);


void dbl_libff_bench(State& state) noexcept
{
    // uint64_t count = 0;
    // uint64_t i = 0;
    libff::init_alt_bn128_params();
    libff::alt_bn128_G1 a = libff::alt_bn128_G1::random_element();

    for (auto _ : state)
    {
        for (size_t i = 0; i < 10000000; ++i)
        {
            a = a.dbl();
        }
    }
    // printf("number of cycles = %lu\n", count / i);
    // printf("r_2 = [%lu, %lu, %lu, %lu]\n", r_2[0], r_2[1], r_2[2], r_2[3]);
}
BENCHMARK(dbl_libff_bench);

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


void add_libff_bench(State& state) noexcept
{
    // uint64_t count = 0;
    // uint64_t i = 0;
    libff::init_alt_bn128_params();
    libff::alt_bn128_G1 a = libff::alt_bn128_G1::random_element();
    libff::alt_bn128_G1 b = libff::alt_bn128_G1::random_element();

    for (auto _ : state)
    {
        for (size_t i = 0; i < 10000000; ++i)
        {
            a = a + b;
        }
    }
    // printf("number of cycles = %lu\n", count / i);
    // printf("r_2 = [%lu, %lu, %lu, %lu]\n", r_2[0], r_2[1], r_2[2], r_2[3]);
}
BENCHMARK(add_libff_bench);

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


void mixed_add_libff_bench(State& state) noexcept
{
    // uint64_t count = 0;
    // uint64_t i = 0;
    libff::init_alt_bn128_params();
    libff::alt_bn128_G1 a;
    a = libff::alt_bn128_G1::random_element();
    libff::alt_bn128_G1 b;
    b.X = a.X;
    b.Y = a.Y;
    b.Z = libff::alt_bn128_Fq::one();

    for (auto _ : state)
    {
        for (size_t i = 0; i < 10000000; ++i)
        {
            a = a.mixed_add(b);
        }
    }
    // printf("number of cycles = %lu\n", count / i);
    // printf("r_2 = [%lu, %lu, %lu, %lu]\n", r_2[0], r_2[1], r_2[2], r_2[3]);
}
BENCHMARK(mixed_add_libff_bench);

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


void fq_mul_libff_bench(State& state) noexcept
{
    // uint64_t count = 0;
    // uint64_t i = 0;
    libff::init_alt_bn128_params();
    libff::alt_bn128_Fq a = libff::alt_bn128_Fq::one();
    libff::alt_bn128_Fq r = libff::alt_bn128_Fq::one();
    
    a.mont_repr.data[0] = 0x1122334455667788;
    a.mont_repr.data[1] = 0x8877665544332211;
    a.mont_repr.data[2] = 0x0123456701234567;
    a.mont_repr.data[3] = 0x0efdfcfbfaf9f8f7;
    r.mont_repr.data[0] = 1;
    r.mont_repr.data[1] = 0;
    r.mont_repr.data[2] = 0;
    r.mont_repr.data[3] = 0;

    for (auto _ : state)
    {
        (DoNotOptimize(fq_mul_libff(a, r)));
        // ++i;
    }
}
BENCHMARK(fq_mul_libff_bench);

BENCHMARK_MAIN();
// 21218750000