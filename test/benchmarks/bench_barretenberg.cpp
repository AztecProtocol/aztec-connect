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


constexpr size_t MAX_GATES = 1 << 20;
constexpr size_t START = (1 << 20) >> 7;


#define CIRCUIT_STATE_SIZE(x) ((x * 17 * sizeof(fr::field_t)) + (x * 3 * sizeof(uint32_t)) )
#define FFT_SIZE(x) (x * 22 * sizeof(fr::field_t))

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
    state.sigma_1_mapping = (uint32_t*)&data[13 * n + 2];
    state.sigma_2_mapping = (uint32_t*)((uintptr_t)&data[13 * n + 2] + (uintptr_t)(n * sizeof(uint32_t)));
    state.sigma_3_mapping = (uint32_t*)((uintptr_t)&data[13 * n + 2] + (uintptr_t)((2 * n) * sizeof(uint32_t)));
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

    // create basic permutation - second half of witness vector is a copy of the first half
    for (size_t i = 0; i < n / 2; ++i)
    {
        state.sigma_1_mapping[shift + i] = (uint32_t)i;
        state.sigma_2_mapping[shift + i] = (uint32_t)i + (1U << 30U);
        state.sigma_3_mapping[shift + i] = (uint32_t)i + (1U << 31U);
        state.sigma_1_mapping[i] = (uint32_t)(i + shift);
        state.sigma_2_mapping[i] = (uint32_t)(i + shift) + (1U << 30U);
        state.sigma_3_mapping[i] = (uint32_t)(i + shift) + (1U << 31U);
    }

    fr::zero(state.w_l[n-1]);
    fr::zero(state.w_r[n-1]);
    fr::zero(state.w_o[n-1]);
    fr::zero(state.q_c[n-1]);
    fr::zero(state.w_l[shift-1]);
    fr::zero(state.w_r[shift-1]);
    fr::zero(state.w_o[shift-1]);
    fr::zero(state.q_c[shift-1]);

    // make last permutation the same as identity permutation
    state.sigma_1_mapping[shift - 1] = (uint32_t)shift - 1;
    state.sigma_2_mapping[shift - 1] = (uint32_t)shift - 1 + (1U << 30U);
    state.sigma_3_mapping[shift - 1] = (uint32_t)shift - 1 + (1U << 31U);
    state.sigma_1_mapping[n - 1] = (uint32_t)n - 1;
    state.sigma_2_mapping[n - 1] = (uint32_t)n - 1 + (1U << 30U);
    state.sigma_3_mapping[n - 1] = (uint32_t)n - 1 + (1U << 31U);

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
    std::vector<waffle::plonk_proof> plonk_proofs;
    srs::plonk_srs reference_string;
    fr::field_t *data;
    fr::field_t *scalars;
};

global_vars globals;

constexpr size_t NUM_THREADS = 8;

void generate_scalars(fr::field_t *scalars)
{
    fr::field_t T0 = fr::random_element();
    fr::field_t acc;
    fr::copy(T0, acc);
    for (size_t i = 0; i < MAX_GATES; ++i)
    {
        fr::mul(acc, T0, acc);
        fr::copy(acc, scalars[i]);
    }
}

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
    polynomials::fft(state.q_m, state.small_domain);
    polynomials::fft(state.q_l, state.small_domain);
    polynomials::fft(state.q_r, state.small_domain);
    polynomials::fft(state.q_o, state.small_domain);
    polynomials::fft_with_constant(state.q_c, state.small_domain, alpha_inv);
}

const auto init = []() {
    globals.reference_string.degree =  MAX_GATES;
    globals.reference_string.monomials = (g1::affine_element*)(aligned_alloc(32, sizeof(g1::affine_element) * (2 * MAX_GATES + 2)));
    globals.scalars = (fr::field_t*)(aligned_alloc(32, sizeof(fr::field_t) * MAX_GATES));
    std::string my_file_path = std::string(BARRETENBERG_SRS_PATH);
    io::read_transcript(globals.reference_string, my_file_path);
    scalar_multiplication::generate_pippenger_point_table(globals.reference_string.monomials, globals.reference_string.monomials, MAX_GATES);
    globals.data =  (fr::field_t*)(aligned_alloc(32, sizeof(fr::field_t) * (8 * 17 * MAX_GATES)));

    globals.plonk_states.resize(8);
    size_t pointer_offset = 0;
    for (size_t i = 0; i < 8; ++i)
    {
        size_t n = (MAX_GATES >> 7) << i;
        printf("n %lu\n", n);
        fr::field_t *data = &globals.data[pointer_offset];
        generate_random_plonk_circuit(globals.plonk_states[i], data, n);
        pointer_offset += 17 * n + 2;
    }

    generate_pairing_points(&globals.g1_pair_points[0], &globals.g2_pair_points[0]);
    generate_scalars(globals.scalars);
    globals.plonk_instances.resize(8);
    globals.plonk_proofs.resize(8);

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

void construct_instances_bench(State& state) noexcept
{
    for (auto _ : state)
    {
        size_t idx = (size_t)log2(state.range(0)) - (int)log2(START);
        waffle::circuit_instance instance = waffle::preprocess_circuit(globals.plonk_states[idx], globals.reference_string);
        // waffle::plonk_proof proof = waffle::construct_proof(globals.plonk_states[idx], globals.reference_string);
        state.PauseTiming();
        globals.plonk_instances[idx] = (instance);
        // bool res = waffle::verifier::verify_proof(proof, globals.plonk_instances[idx], globals.reference_string.SRS_T2);
        // if (res == false)
        // {
        //     printf("hey! this proof isn't valid!\n");
        // }
        state.ResumeTiming();
    }
}
BENCHMARK(construct_instances_bench)->RangeMultiplier(2)->Range(START, MAX_GATES);


void construct_proof_bench(State& state) noexcept
{
    for (auto _ : state)
    {
        size_t idx = (size_t)log2(state.range(0)) - (int)log2(START);
        waffle::plonk_proof proof = waffle::construct_proof(globals.plonk_states[idx], globals.reference_string);
        state.PauseTiming();
        globals.plonk_proofs[idx] = (proof);
        // bool res = waffle::verifier::verify_proof(proof, globals.plonk_instances[idx], globals.reference_string.SRS_T2);
        // if (res == false)
        // {
        //     printf("hey! this proof isn't valid!\n");
        // }
        reset_proof_state(globals.plonk_states[idx]);
        state.ResumeTiming();
    }
}
BENCHMARK(construct_proof_bench)->RangeMultiplier(2)->Range(START, MAX_GATES);


void verify_proof_bench(State& state) noexcept
{
    for (auto _ : state)
    {
        size_t idx = (size_t)log2(state.range(0)) - (int)log2(START);
        bool res = waffle::verifier::verify_proof(globals.plonk_proofs[idx], globals.plonk_instances[idx], globals.reference_string.SRS_T2);
        state.PauseTiming();
        if (!res)
        {
            printf("hey! proof isn't valid!\n");
        }
        state.ResumeTiming();
    }
}
BENCHMARK(verify_proof_bench)->RangeMultiplier(2)->Range(START, MAX_GATES);

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
        mul_state[i].num_elements = MAX_GATES;
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
        DoNotOptimize(scalar_multiplication::pippenger(&globals.scalars[0], &globals.reference_string.monomials[0], MAX_GATES));
        uint64_t after = rdtsc();
        printf("pippenger single, clock cycles per scalar mul = %lu\n", (after - before) / MAX_GATES);
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