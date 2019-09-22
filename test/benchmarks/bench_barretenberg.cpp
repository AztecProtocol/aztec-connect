#include <benchmark/benchmark.h>

using namespace benchmark;

#include <gmp.h>
#include <iostream>
#include <time.h>
#include <string.h>
#include <vector>

#include <barretenberg/types.hpp>

#include <barretenberg/fields/fq.hpp>
#include <barretenberg/fields/fr.hpp>
#include <barretenberg/groups/g1.hpp>
#include <barretenberg/groups/g2.hpp>
#include <barretenberg/groups/scalar_multiplication.hpp>
#include <barretenberg/groups/pairing.hpp>
#include <barretenberg/waffle/waffle.hpp>
#include <barretenberg/waffle/verifier.hpp>
#include <barretenberg/waffle/preprocess.hpp>
#include <barretenberg/io/io.hpp>

using namespace barretenberg;


// want to test circuits with size 2^12 to 2^20
// constexpr size_t NUM_WAFFLE_STEPS = 2;
// constexpr size_t NUM_STARTING_GATES = 1 << 12;
constexpr size_t MAX_GATES = 1 << 20;
constexpr size_t START = (1 << 20) >> 7;

void generate_random_plonk_circuit(waffle::circuit_state &state, fr::field_t *data, size_t n)
{
    state.n = n;
    state.small_domain = polynomials::get_domain(n);
    state.mid_domain = polynomials::get_domain(2 * n);
    state.large_domain = polynomials::get_domain(4 * n);
    state.w_l = &data[0];
    state.w_r = &data[n];
    state.w_o = &data[2 * n];
    state.z_1 = &data[3 * n];
    state.z_2 = &data[4 * n + 1];
    state.q_c = &data[5 * n + 2];
    state.q_l = &data[6 * n + 2];
    state.q_r = &data[7 * n + 2];
    state.q_o = &data[8 * n + 2];
    state.q_m = &data[9 * n + 2];
    state.sigma_1 = &data[10 * n + 2];
    state.sigma_2 = &data[11 * n + 2];
    state.sigma_3 = &data[12 * n + 2];
    state.s_id = &data[13 * n + 2];
    state.t = &data[14 * n + 2];

    state.w_l_lagrange_base = state.t;
    state.w_r_lagrange_base = &state.t[n + 1];
    state.w_o_lagrange_base = &state.t[2 * n + 2];

    // create some constraints that satisfy our arithmetic circuit relation
    fr::field_t one;
    fr::field_t zero;
    fr::field_t minus_one;
    fr::one(one);
    fr::neg(one, minus_one);
    fr::zero(zero);
    fr::field_t T0;
    // even indices = mul gates, odd incides = add gates
    for (size_t i = 0; i < n / 4; ++i)
    {
        state.w_l[2 * i] = fr::random_element();
        state.w_r[2 * i] = fr::random_element();
        fr::mul(state.w_l[2 * i], state.w_r[2 * i], state.w_o[2 * i]);
        fr::copy(zero, state.q_l[2 * i]);
        fr::copy(zero, state.q_r[2 * i]);
        fr::copy(minus_one, state.q_o[2 * i]);
        fr::copy(zero, state.q_c[2 * i]);
        fr::copy(one, state.q_m[2 * i]);

        state.w_l[2 * i + 1] = fr::random_element();
        state.w_r[2 * i + 1] = fr::random_element();
        state.w_o[2 * i + 1] = fr::random_element();

        fr::add(state.w_l[2 * i + 1], state.w_r[2 * i + 1], T0);
        fr::add(T0, state.w_o[2 * i + 1], state.q_c[2 * i + 1]);
        fr::neg(state.q_c[2 * i + 1], state.q_c[2 * i + 1]);
        fr::one(state.q_l[2 * i + 1]);
        fr::one(state.q_r[2 * i + 1]);
        fr::one(state.q_o[2 * i + 1]);
        fr::zero(state.q_m[2 * i + 1]);
    }

    size_t shift = n / 2;
    polynomials::copy_polynomial(state.w_l, state.w_l + shift, shift, shift);
    polynomials::copy_polynomial(state.w_r, state.w_r + shift, shift, shift);
    polynomials::copy_polynomial(state.w_o, state.w_o + shift, shift, shift);
    polynomials::copy_polynomial(state.q_m, state.q_m + shift, shift, shift);
    polynomials::copy_polynomial(state.q_l, state.q_l + shift, shift, shift);
    polynomials::copy_polynomial(state.q_r, state.q_r + shift, shift, shift);
    polynomials::copy_polynomial(state.q_o, state.q_o + shift, shift, shift);
    polynomials::copy_polynomial(state.q_c, state.q_c + shift, shift, shift);


    fr::field_t T1 = { .data = { shift + 1, 0, 0, 0 } };
    fr::field_t n_mont = { .data = { n, 0, 0, 0 } } ;
    fr::one(T0);
    fr::to_montgomery_form(T1, T1);
    fr::to_montgomery_form(n_mont, n_mont);
    for (size_t i = 0; i < n / 2; ++i)
    {
        fr::copy(T0, state.sigma_1[shift + i]);
        fr::copy(T0, state.sigma_2[shift + i]);
        fr::copy(T0, state.sigma_3[shift + i]);

        fr::add(state.sigma_2[shift + i], n_mont, state.sigma_2[shift + i]);
        fr::add(state.sigma_3[shift + i], n_mont, state.sigma_3[shift + i]);
        fr::add(state.sigma_3[shift + i], n_mont, state.sigma_3[shift + i]);

        fr::copy(T1, state.sigma_1[i]);
        fr::copy(T1, state.sigma_2[i]);
        fr::copy(T1, state.sigma_3[i]);

        fr::add(state.sigma_2[i], n_mont, state.sigma_2[i]);
        fr::add(state.sigma_3[i], n_mont, state.sigma_3[i]);
        fr::add(state.sigma_3[i], n_mont, state.sigma_3[i]);

        fr::add(T0, one, T0);
        fr::add(T1, one, T1);
    }

    fr::zero(state.w_l[n-1]);
    fr::zero(state.w_r[n-1]);
    fr::zero(state.w_o[n-1]);
    fr::zero(state.q_c[n-1]);
    fr::zero(state.w_l[shift-1]);
    fr::zero(state.w_r[shift-1]);
    fr::zero(state.w_o[shift-1]);
    fr::zero(state.q_c[shift-1]);

    fr::field_t T2 = { .data = { shift, 0, 0, 0 } };
    fr::to_montgomery_form(T2, T2);
    fr::copy(T2, state.sigma_1[shift-1]);
    fr::copy(T2, state.sigma_2[shift-1]);
    fr::copy(T2, state.sigma_3[shift-1]);
    fr::add(state.sigma_2[shift-1], n_mont, state.sigma_2[shift-1]);
    fr::add(state.sigma_3[shift-1], n_mont, state.sigma_3[shift-1]);
    fr::add(state.sigma_3[shift-1], n_mont, state.sigma_3[shift-1]);

    fr::zero(state.sigma_1[n-1]);
    fr::zero(state.sigma_2[n-1]);
    fr::zero(state.sigma_3[n-1]);
    fr::zero(state.q_l[n - 1]);
    fr::zero(state.q_r[n - 1]);
    fr::zero(state.q_o[n - 1]);
    fr::zero(state.q_m[n - 1]);
}

struct global_vars
{
    alignas(32) g1::affine_element g1_pair_points[2];
    alignas(32) g2::affine_element g2_pair_points[2];
    waffle::circuit_state plonk_state;
    std::vector<waffle::circuit_state> plonk_states;
    waffle::circuit_instance plonk_instance;
    std::vector<waffle::circuit_instance> plonk_instances;
    waffle::plonk_proof plonk_proof;
    srs::plonk_srs reference_string;
    fr::field_t *data;
    fr::field_t *scalars;
};

global_vars globals;

constexpr size_t MAX_NUM_POINTS = (3 * (1 << 20));
constexpr size_t NUM_POINTS = 1048576;
constexpr size_t NUM_THREADS = 8;

void generate_scalars(fr::field_t *scalars)
{
    fr::field_t T0 = fr::random_element();
    fr::field_t acc;
    fr::copy(T0, acc);
    for (size_t i = 0; i < NUM_POINTS; ++i)
    {
        fr::mul(acc, T0, acc);
        fr::copy(acc, scalars[i]);
    }
}
// {
//     data.scalars = (fr::field_t*)aligned_alloc(32, sizeof(fr::field_t) * NUM_POINTS * NUM_THREADS);
//     data.points = (g1::affine_element*)aligned_alloc(32, sizeof(g1::affine_element) * NUM_POINTS * 2 * NUM_THREADS);

//     g1::element small_table[10000];
//     for (size_t i = 0; i < 10000; ++i)
//     {
//         small_table[i] = g1::random_element();
//     }
//     g1::element current_table[10000];
//     for (size_t i = 0; i < ((NUM_POINTS) / 10000); ++i)
//     {
//         for (size_t j = 0; j < 10000; ++j)
//         {
//             g1::add(small_table[i], small_table[j], current_table[j]);
//         }
//         g1::batch_normalize(&current_table[0], 10000);
//         for (size_t j = 0; j < 10000; ++j)
//         {
//             fq::copy(current_table[j].x, data.points[i * 10000 + j].x);
//             fq::copy(current_table[j].y, data.points[i * 10000 + j].y);
//         }
//     }
//     g1::batch_normalize(small_table, 10000);
//     size_t rounded = ((NUM_POINTS) / 10000) * 10000;
//     size_t leftovers = (NUM_POINTS) - rounded;
//     for (size_t j = 0;  j < leftovers; ++j)
//     {
//             fq::copy(small_table[j].x, data.points[rounded + j].x);
//             fq::copy(small_table[j].y, data.points[rounded + j].y);
//     }

//     for (size_t i = 0; i < (NUM_POINTS); ++i)
//     {
//         data.scalars[i] = fr::random_element();
//     }
//     scalar_multiplication::generate_pippenger_point_table(data.points, data.points, (NUM_POINTS));
//     printf("boop\n");
//     for (size_t i = 1; i < NUM_THREADS; ++i)
//     {
//         memcpy((void*)&data.points[NUM_POINTS * i], (void*)&data.points[0], sizeof(g1::affine_element) * NUM_POINTS);
//         memcpy((void*)&data.scalars[NUM_POINTS * i], (void*)&data.scalars[0], sizeof(fr::field_t) * NUM_POINTS);

//     }
// }

void generate_pairing_points(g1::affine_element* p1s, g2::affine_element* p2s)
{
    p1s[0] = g1::random_affine_element();
    p1s[1] = g1::random_affine_element();
    p2s[0] = g2::random_affine_element();
    p2s[1] = g2::random_affine_element();
}


void reset_proof_state(waffle::circuit_state& state)
{
    fr::field_t beta_inv;
    fr::field_t alpha_inv;
    fr::invert(state.challenges.beta, beta_inv);
    fr::invert(state.challenges.alpha, alpha_inv);
    polynomials::fft(state.w_l, state.small_domain);
    polynomials::fft(state.w_r, state.small_domain);
    polynomials::fft(state.w_o, state.small_domain);
    polynomials::fft_with_constant(state.sigma_1, state.small_domain, beta_inv);
    polynomials::fft_with_constant(state.sigma_2, state.small_domain, beta_inv);
    polynomials::fft_with_constant(state.sigma_3, state.small_domain, beta_inv);
    polynomials::fft(state.q_m, state.small_domain);
    polynomials::fft(state.q_l, state.small_domain);
    polynomials::fft(state.q_r, state.small_domain);
    polynomials::fft(state.q_o, state.small_domain);
    polynomials::fft_with_constant(state.q_c, state.small_domain, alpha_inv);
}

const auto init = []() {
    printf("loading srs\n");
    globals.reference_string.degree =  MAX_NUM_POINTS;
    globals.reference_string.monomials = (g1::affine_element*)(aligned_alloc(32, sizeof(g1::affine_element) * (2 * MAX_NUM_POINTS + 2)));
    globals.scalars = (fr::field_t*)(aligned_alloc(32, sizeof(fr::field_t) * MAX_NUM_POINTS));
    io::read_transcript(globals.reference_string, "../srs_db/transcript.dat");
    // globals.reference_string.degree = 3 * NUM_GATES;
    scalar_multiplication::generate_pippenger_point_table(globals.reference_string.monomials, globals.reference_string.monomials, 3 * MAX_GATES);
    printf("generating test data\n");
    globals.data =  (fr::field_t*)(aligned_alloc(32, sizeof(fr::field_t) * (4 * 17 * MAX_GATES + 2)));

    globals.plonk_states.resize(8);
    size_t pointer_offset = 0;
    for (size_t i = 0; i < 8; ++i)
    {
        size_t n = (MAX_GATES >> 7) << i;
        printf("n = %lu\n", n);
        fr::field_t *data = &globals.data[pointer_offset];
        generate_random_plonk_circuit(globals.plonk_states[i], data, n);
        pointer_offset += 17 * n + 2;
        globals.plonk_instances.push_back(waffle::preprocess_circuit(globals.plonk_states[i], globals.reference_string));
    }


    // for (size_t i = 0; i < NUM_WAFFLE_STEPS; ++i)
    // {
    //     size_t n = NUM_STARTING_GATES << i;
    //     waffle::circuit_state state;
    //     waffle::circuit_instance instance;
    //     state.n = n;
    //     instance.n = n;
    //     state.small_domain = polynomials::get_domain(n);
    //     state.mid_domain = polynomials::get_domain(2 * n);
    //     state.large_domain = polynomials::get_domain(3 * n);
    //     state.w_l = globals.plonk_state.w_l;
    //     state.w_r = globals.plonk_state.w_r;
    //     state.w_o = globals.plonk_state.w_o;
    //     state.z_1 = globals.plonk_state.z_1;
    //     state.z_2 = globals.plonk_state.z_2;
    //     state.sigma_1 = globals.plonk_state.sigma_1;
    //     state.sigma_2 = globals.plonk_state.sigma_2;
    //     state.sigma_3 = globals.plonk_state.sigma_3;
    //     state.s_id = globals.plonk_state.s_id;
    //     state.t = globals.plonk_state.t;
    //     state.w_l_lagrange_base = globals.plonk_state.w_l_lagrange_base;
    //     state.w_r_lagrange_base = globals.plonk_state.w_r_lagrange_base;
    //     state.w_o_lagrange_base = globals.plonk_state.w_o_lagrange_base;
    //     state.q_m = globals.plonk_state.q_m;
    //     state.q_l = globals.plonk_state.q_l;
    //     state.q_r = globals.plonk_state.q_r;
    //     state.q_o = globals.plonk_state.q_o;
    //     state.q_c = globals.plonk_state.q_c;
    //     globals.plonk_states.push_back(state);

    //     globals.plonk_instances.push_back(waffle::preprocess_circuit(state, globals.reference_string));
    // }
    generate_pairing_points(&globals.g1_pair_points[0], &globals.g2_pair_points[0]);
    printf("generating scalar mul scalars\n");
    generate_scalars(globals.scalars);
    printf("generating plonk test circuit\n");
    globals.plonk_instance = waffle::preprocess_circuit(globals.plonk_states[7], globals.reference_string);
    printf("generating plonk test proof\n");
    globals.plonk_proof = waffle::construct_proof(globals.plonk_states[7], globals.reference_string);

    bool test = waffle::verifier::verify_proof(globals.plonk_proof, globals.plonk_instance, globals.reference_string.SRS_T2);
    reset_proof_state(globals.plonk_states[7]);
    
    if (test == false)
    {
        printf("hey! this proof isn't valid!\n");
    }
    printf("finished generating test data\n");
    return true;
}();


uint64_t rdtsc(){
    unsigned int lo,hi;
    __asm__ __volatile__ ("rdtsc" : "=a" (lo), "=d" (hi));
    return ((uint64_t)hi << 32) | lo;
}

constexpr size_t NUM_SQUARINGS = 10000000;
inline uint64_t fq_sqr_asm(fq::field_t& a, fq::field_t& r) noexcept
{
    for (size_t i = 0; i < NUM_SQUARINGS; ++i)
    {
        fq::sqr(a, r);
    }
    return 1;
}

constexpr size_t NUM_MULTIPLICATIONS = 10000000;
inline uint64_t fq_mul_asm(fq::field_t& a, fq::field_t& r) noexcept
{
    for (size_t i = 0; i < NUM_MULTIPLICATIONS; ++i)
    {
        fq::mul(a, r, r);
    }
    return 1;
}

void construct_proof_bench(State& state) noexcept
{
    for (auto _ : state)
    {
        size_t idx = log2((size_t)state.range(0)) - log2(START);
        waffle::plonk_proof proof = waffle::construct_proof(globals.plonk_states[idx], globals.reference_string);
        state.PauseTiming();
        bool res = waffle::verifier::verify_proof(proof, globals.plonk_instances[idx], globals.reference_string.SRS_T2);
        if (res == false)
        {
            printf("hey! this proof isn't valid!\n");
        }
        reset_proof_state(globals.plonk_states[idx]);
        state.ResumeTiming();
    }
}
BENCHMARK(construct_proof_bench)->RangeMultiplier(2)->Range(START, MAX_GATES);


void pairing_bench(State& state) noexcept
{
    uint64_t count = 0;
    uint64_t i = 0;
    for (auto _ : state)
    {
        uint64_t before = rdtsc();
        DoNotOptimize(pairing::reduced_ate_pairing(globals.g1_pair_points[0], globals.g2_pair_points[0]));
        uint64_t after = rdtsc();
        count += (after - before);
        ++i;
    }
    uint64_t avg_cycles = count / i;
    printf("single pairing clock cycles = %lu\n", (avg_cycles));
}
BENCHMARK(pairing_bench);

void pairing_twin_bench(State& state) noexcept
{
    uint64_t count = 0;
    uint64_t i = 0;
    for (auto _ : state)
    {
        uint64_t before = rdtsc();
        DoNotOptimize(pairing::reduced_ate_pairing_batch(&globals.g1_pair_points[0], &globals.g2_pair_points[0], 2));
        uint64_t after = rdtsc();
        count += (after - before);
        ++i;
    }
    uint64_t avg_cycles = count / i;
    printf("twin pairing clock cycles = %lu\n", (avg_cycles));
}
BENCHMARK(pairing_twin_bench);

void batched_scalar_multiplications_bench(State& state) noexcept
{
    scalar_multiplication::multiplication_state mul_state[NUM_THREADS];
    for (size_t i = 0; i < NUM_THREADS; ++i)
    {
        mul_state[i].num_elements = NUM_POINTS;
        mul_state[i].scalars = &globals.scalars[0];
        mul_state[i].points = &globals.reference_string.monomials[0];
    }
    for (auto _ : state)
    {
        (scalar_multiplication::batched_scalar_multiplications(mul_state, NUM_THREADS));
    }
}
BENCHMARK(batched_scalar_multiplications_bench);

void pippenger_bench(State& state) noexcept
{
    for (auto _ : state)
    {
        uint64_t before = rdtsc();
        DoNotOptimize(scalar_multiplication::pippenger(&globals.scalars[0], &globals.reference_string.monomials[0], NUM_POINTS));
        uint64_t after = rdtsc();
        printf("pippenger single, clock cycles per scalar mul = %lu\n", (after - before) / NUM_POINTS);
    }
}
BENCHMARK(pippenger_bench);

constexpr size_t NUM_G1_ADDITIONS = 10000000;
void add_bench(State& state) noexcept
{
    uint64_t count = 0;
    uint64_t j = 0;
    g1::element a = g1::random_element();
    g1::element b = g1::random_element();
    for (auto _ : state)
    {
        uint64_t before = rdtsc();
        for (size_t i = 0; i < NUM_G1_ADDITIONS; ++i)
        {
            g1::add(a, b, a);
        }
        uint64_t after = rdtsc();
        count += (after - before);
        ++j;
    }
    printf("g1 add number of cycles = %lu\n", count / (j * NUM_G1_ADDITIONS));
}
BENCHMARK(add_bench);

void mixed_add_bench(State& state) noexcept
{
    uint64_t count = 0;
    uint64_t j = 0;
    g1::element a = g1::random_element();
    g1::affine_element b = g1::random_affine_element();
    for (auto _ : state)
    {
        uint64_t before = rdtsc();
        for (size_t i = 0; i < NUM_G1_ADDITIONS; ++i)
        {
            g1::mixed_add(a, b, a);
        }
        uint64_t after = rdtsc();
        count += (after - before);
        ++j;
    }
    printf("g1 mixed add number of cycles = %lu\n", count / (j * NUM_G1_ADDITIONS));
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
    printf("sqr number of cycles = %lu\n", count / (i * NUM_SQUARINGS));
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
    printf("mul number of cycles = %lu\n", count / (i * NUM_MULTIPLICATIONS));
    // printf("r_2 = [%lu, %lu, %lu, %lu]\n", r_2[0], r_2[1], r_2[2], r_2[3]);
}
BENCHMARK(fq_mul_asm_bench);

BENCHMARK_MAIN();
// 21218750000