#include <benchmark/benchmark.h>

using namespace benchmark;

#include <iostream>
#include <time.h>
#include <string.h>
#include <vector>
#include <math.h>

#include <barretenberg/types.hpp>

#include <barretenberg/fields/fq.hpp>
#include <barretenberg/fields/fr.hpp>
#include <barretenberg/groups/wnaf.hpp>
#include <barretenberg/groups/g1.hpp>
#include <barretenberg/groups/g2.hpp>
#include <barretenberg/groups/scalar_multiplication.hpp>
#include <barretenberg/groups/pairing.hpp>
#include <barretenberg/polynomials/polynomial_arithmetic.hpp>
#include <barretenberg/waffle/proof_system/verifier/verifier.hpp>
#include <barretenberg/waffle/proof_system/prover/prover.hpp>
#include <barretenberg/waffle/proof_system/widgets/arithmetic_widget.hpp>
#include <barretenberg/waffle/proof_system/preprocess.hpp>
#include <barretenberg/io/io.hpp>

using namespace barretenberg;


constexpr size_t MAX_GATES = 1 << 20;
constexpr size_t START = (1 << 20) >> 7;


#define CIRCUIT_STATE_SIZE(x) ((x * 17 * sizeof(fr::field_t)) + (x * 3 * sizeof(uint32_t)) )
#define FFT_SIZE(x) (x * 22 * sizeof(fr::field_t))

void generate_random_plonk_circuit(waffle::Prover &state)
{
    size_t n = state.n;
    std::unique_ptr<waffle::ProverArithmeticWidget> widget = std::make_unique<waffle::ProverArithmeticWidget>(n);
    state.w_l.resize(n);
    state.w_r.resize(n);
    state.w_o.resize(n);

    fr::field_t T0;
    fr::field_t T1;
    fr::field_t T2;
    // even indices = mul gates, odd incides = add gates
    // make selector polynomial_arithmetic / wire values randomly distributed (subject to gate constraints)
    fr::field_t q_m_seed = fr::random_element();
    fr::field_t q_l_seed = fr::random_element();
    fr::field_t q_r_seed = fr::random_element();
    fr::field_t q_o_seed = fr::random_element();
    fr::field_t q_c_seed = fr::random_element();
    fr::field_t w_l_seed = fr::random_element();
    fr::field_t w_r_seed = fr::random_element();
    fr::field_t q_m_acc;
    fr::field_t q_l_acc;
    fr::field_t q_r_acc;
    fr::field_t q_o_acc;
    fr::field_t q_c_acc;
    fr::field_t w_l_acc;
    fr::field_t w_r_acc;
    fr::copy(q_m_seed, q_m_acc);
    fr::copy(q_l_seed, q_l_acc);
    fr::copy(q_r_seed, q_r_acc);
    fr::copy(q_o_seed, q_o_acc);
    fr::copy(q_c_seed, q_c_acc);
    fr::copy(w_l_seed, w_l_acc);
    fr::copy(w_r_seed, w_r_acc);

    for (size_t i = 0; i < n / 2; i += 2)
    {
        fr::copy(q_m_acc, widget->q_m.at(i));
        fr::copy(fr::zero(), widget->q_l.at(i));
        fr::copy(fr::zero(), widget->q_r.at(i));
        fr::copy(q_o_acc, widget->q_o.at(i));
        fr::copy(q_c_acc, widget->q_c.at(i));
        fr::copy(w_l_acc, state.w_l.at(i));
        fr::copy(w_r_acc, state.w_r.at(i));
        fr::copy(widget->q_o.at(i), state.w_o.at(i));

        fr::__mul(q_m_acc, q_m_seed, q_m_acc);
        fr::__mul(q_l_acc, q_l_seed, q_l_acc);
        fr::__mul(q_r_acc, q_r_seed, q_r_acc);
        fr::__mul(q_o_acc, q_o_seed, q_o_acc);
        fr::__mul(q_c_acc, q_c_seed, q_c_acc);
        fr::__mul(w_l_acc, w_l_seed, w_l_acc);
        fr::__mul(w_r_acc, w_r_seed, w_r_acc);

        fr::copy(fr::zero(), widget->q_m.at(i+1));
        fr::copy(q_l_acc, widget->q_l.at(i+1));
        fr::copy(q_r_acc, widget->q_r.at(i+1));
        fr::copy(q_o_acc, widget->q_o.at(i+1));
        fr::copy(q_c_acc, widget->q_c.at(i+1));
        fr::copy(w_l_acc, state.w_l.at(i+1));
        fr::copy(w_r_acc, state.w_r.at(i+1));
        fr::copy(widget->q_o.at(i+1), state.w_o.at(i+1));

        fr::__mul(q_m_acc, q_m_seed, q_m_acc);
        fr::__mul(q_l_acc, q_l_seed, q_l_acc);
        fr::__mul(q_r_acc, q_r_seed, q_r_acc);
        fr::__mul(q_o_acc, q_o_seed, q_o_acc);
        fr::__mul(q_c_acc, q_c_seed, q_c_acc);
        fr::__mul(w_l_acc, w_l_seed, w_l_acc);
        fr::__mul(w_r_acc, w_r_seed, w_r_acc);
    }
    fr::batch_invert(state.w_o.get_coefficients(), n / 2);


    for (size_t i = 0; i < n / 2; ++i)
    {
        fr::__mul(widget->q_l.at(i), state.w_l.at(i), T0);
        fr::__mul(widget->q_r.at(i), state.w_r.at(i), T1);
        fr::__mul(state.w_l.at(i), state.w_r.at(i), T2);
        fr::__mul(T2, widget->q_m.at(i), T2);
        fr::__add(T0, T1, T0);
        fr::__add(T0, T2, T0);
        fr::__add(T0, widget->q_c.at(i), T0);
        fr::__neg(T0, T0);
        fr::__mul(state.w_o.at(i), T0, state.w_o.at(i));
    }
    size_t shift = n / 2;
    polynomial_arithmetic::copy_polynomial(&state.w_l.at(0), &state.w_l.at(shift), shift, shift);
    polynomial_arithmetic::copy_polynomial(&state.w_r.at(0), &state.w_r.at(shift), shift, shift);
    polynomial_arithmetic::copy_polynomial(&state.w_o.at(0), &state.w_o.at(shift), shift, shift);
    polynomial_arithmetic::copy_polynomial(&widget->q_m.at(0), &widget->q_m.at(shift), shift, shift);
    polynomial_arithmetic::copy_polynomial(&widget->q_l.at(0), &widget->q_l.at(shift), shift, shift);
    polynomial_arithmetic::copy_polynomial(&widget->q_r.at(0), &widget->q_r.at(shift), shift, shift);
    polynomial_arithmetic::copy_polynomial(&widget->q_o.at(0), &widget->q_o.at(shift), shift, shift);
    polynomial_arithmetic::copy_polynomial(&widget->q_c.at(0), &widget->q_c.at(shift), shift, shift);

    state.sigma_1_mapping.resize(n);
    state.sigma_2_mapping.resize(n);
    state.sigma_3_mapping.resize(n);
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

    fr::zero(state.w_l.at(n-1));
    fr::zero(state.w_r.at(n-1));
    fr::zero(state.w_o.at(n-1));
    fr::zero(widget->q_c.at(n-1));
    fr::zero(state.w_l.at(shift-1));
    fr::zero(state.w_r.at(shift-1));
    fr::zero(state.w_o.at(shift-1));
    fr::zero(widget->q_c.at(shift-1));
    fr::zero(widget->q_m.at(shift-1));
    fr::zero(widget->q_l.at(shift-1));
    fr::zero(widget->q_r.at(shift-1));
    fr::zero(widget->q_o.at(shift-1));
    // make last permutation the same as identity permutation
    state.sigma_1_mapping[shift - 1] = (uint32_t)shift - 1;
    state.sigma_2_mapping[shift - 1] = (uint32_t)shift - 1 + (1U << 30U);
    state.sigma_3_mapping[shift - 1] = (uint32_t)shift - 1 + (1U << 31U);
    state.sigma_1_mapping[n - 1] = (uint32_t)n - 1;
    state.sigma_2_mapping[n - 1] = (uint32_t)n - 1 + (1U << 30U);
    state.sigma_3_mapping[n - 1] = (uint32_t)n - 1 + (1U << 31U);

    fr::zero(widget->q_l.at(n - 1));
    fr::zero(widget->q_r.at(n - 1));
    fr::zero(widget->q_o.at(n - 1));
    fr::zero(widget->q_m.at(n - 1));

    state.widgets.emplace_back(std::move(widget));
}

struct global_vars
{
    alignas(32) g1::affine_element g1_pair_points[2];
    alignas(32) g2::affine_element g2_pair_points[2];
    std::vector<waffle::Verifier> plonk_instances;
    waffle::plonk_proof plonk_proof;
    waffle::ReferenceString reference_string;
    std::vector<waffle::plonk_proof> plonk_proofs;
    fr::field_t *data;
    fr::field_t *scalars;
    fr::field_t *roots;
    fr::field_t *coefficients;
    g1::affine_element *precompute_point_table;
    std::vector<g1::affine_element *> point_table_pointers;
};

global_vars globals;

waffle::Prover plonk_circuit_states[8]{
    waffle::Prover(START),
    waffle::Prover(START * 2),
    waffle::Prover(START * 4),
    waffle::Prover(START * 8),
    waffle::Prover(START * 16),
    waffle::Prover(START * 32),
    waffle::Prover(START * 64),
    waffle::Prover(START * 128),
};

constexpr size_t NUM_THREADS = 8;

void generate_scalars(fr::field_t *scalars)
{
    fr::field_t T0 = fr::random_element();
    fr::field_t acc;
    fr::copy(T0, acc);
    for (size_t i = 0; i < MAX_GATES; ++i)
    {
        fr::__mul(acc, T0, acc);
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

const auto init = []() {
    printf("generating test data\n");
    globals.reference_string =  waffle::ReferenceString(MAX_GATES);
    globals.scalars = (fr::field_t*)(aligned_alloc(32, sizeof(fr::field_t) * MAX_GATES));
    std::string my_file_path = std::string(BARRETENBERG_SRS_PATH);
    globals.data =  (fr::field_t*)(aligned_alloc(32, sizeof(fr::field_t) * (8 * 17 * MAX_GATES)));

    for (size_t i = 0; i < 8; ++i)
    {
        size_t n = (MAX_GATES >> 7) << i;
        printf("%lu\n", n);
        generate_random_plonk_circuit(plonk_circuit_states[i]);
    }

    generate_pairing_points(&globals.g1_pair_points[0], &globals.g2_pair_points[0]);
    generate_scalars(globals.scalars);
    globals.plonk_instances.resize(8);
    globals.plonk_proofs.resize(8);

    size_t bucket_width = scalar_multiplication::get_optimal_bucket_width(MAX_GATES);
    size_t num_rounds = WNAF_SIZE(bucket_width);
    globals.precompute_point_table = (g1::affine_element*)aligned_alloc(32, sizeof(g1::affine_element) * (MAX_GATES) * num_rounds);
    globals.point_table_pointers = scalar_multiplication::generate_pippenger_precompute_table(globals.reference_string.monomials, globals.precompute_point_table, (MAX_GATES), bucket_width);
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
        fq::__sqr(a, r);
    }
    return 1;
}

constexpr size_t NUM_MULTIPLICATIONS = 10000000;
inline uint64_t fq_mul_asm(fq::field_t& a, fq::field_t& r) noexcept
{
    for (size_t i = 0; i < NUM_MULTIPLICATIONS; ++i)
    {
        fq::__mul(a, r, r);
    }
    return 1;
}

void pippenger_bench(State& state) noexcept
{
    for (auto _ : state)
    {
        uint64_t before = rdtsc();
        DoNotOptimize(scalar_multiplication::pippenger(&globals.scalars[0], &globals.reference_string.monomials[0], MAX_GATES, 15));
        uint64_t after = rdtsc();
        printf("pippenger single, clock cycles per scalar mul = %lu\n", (after - before) / (MAX_GATES));
    }
}
BENCHMARK(pippenger_bench);

void pippenger_precompute_bench(State &state) noexcept
{
    for (auto _ : state)
    {
        uint64_t before = rdtsc();
        DoNotOptimize(scalar_multiplication::pippenger_precomputed(&globals.scalars[0], globals.point_table_pointers, MAX_GATES));
        uint64_t after = rdtsc();
        printf("pippenger single, clock cycles per scalar mul = %lu\n", (after - before) / (MAX_GATES));
    }
}
BENCHMARK(pippenger_precompute_bench);


void pippenger_2_pow_16_12_bench(State &state) noexcept
{
    for (auto _ : state)
    {
        uint64_t before = rdtsc();
        DoNotOptimize(scalar_multiplication::pippenger(&globals.scalars[0], &globals.reference_string.monomials[0], MAX_GATES >> 4, 12));
        uint64_t after = rdtsc();
        printf("pippenger single, clock cycles per scalar mul = %lu\n", (after - before) / (MAX_GATES >> 4));
    }
}
BENCHMARK(pippenger_2_pow_16_12_bench);


void pippenger_2_pow_16_15_bench(State &state) noexcept
{
    for (auto _ : state)
    {
        uint64_t before = rdtsc();
        DoNotOptimize(scalar_multiplication::pippenger(&globals.scalars[0], &globals.reference_string.monomials[0], MAX_GATES >> 4, 15));
        uint64_t after = rdtsc();
        printf("pippenger single, clock cycles per scalar mul = %lu\n", (after - before) / (MAX_GATES >> 4));
    }
}
BENCHMARK(pippenger_2_pow_16_15_bench);
// so what's the plan?????
// 1: determine the optimal number of rounds for each power of two breakpoint
// 2: write algorithm to precompute exponentiated powers of relevant generators
// 3: write an SRS class?

// i.e. our prover will want to multi-exponentiate based off of:
// 1: splitting n into chunks of 4
// 2: splitting n into chunks of 8
// (we could try chunks of 3 but let's not overcomplicate for now - benchmarks don't seem to rate 3)

// both chunk types will have different round sizes, most likely
// so we will need to cache these generator powers

// so....
// what about...
// each 'round index' has a block of memory attributed to it
// and we create pointers to each index

// e.g. in the SRS class, we input 'n', and split down into 'n/2', 'n/4' - compute the desired round structure for these,
// and load from relevant files
// we then fill a pointer array with pointers to memory.

// Total memory required will be...erm...so let's say we have a 7-round and 8-round structure...
// we'll need 14 'rounds' (1st round shared)
// orrrrr we just load in the lowest common denominator...
// hom
// hum
// hmm
// no let's load all the rounds. if we need to memory optmize, we can ditch the n/4 memory later on

// 765625000 2^17
// 6125000000 = (2^17 * 3) // man...
// 4093750000 2^20

// 1921875000 = 2^18
// 7687500000
// 3781250000 = 2^20
// 4375000000 = 2^20 from 2^17
void pippenger_2_pow_17_12_bench(State &state) noexcept
{
    for (auto _ : state)
    {
        uint64_t before = rdtsc();
        DoNotOptimize(scalar_multiplication::pippenger(&globals.scalars[0], &globals.reference_string.monomials[0], MAX_GATES >> 3, 12));
        uint64_t after = rdtsc();
        printf("pippenger single, clock cycles per scalar mul = %lu\n", (after - before) / (MAX_GATES >> 3));
    }
}
BENCHMARK(pippenger_2_pow_17_12_bench);


void pippenger_2_pow_17_15_bench(State &state) noexcept
{
    for (auto _ : state)
    {
        uint64_t before = rdtsc();
        DoNotOptimize(scalar_multiplication::pippenger(&globals.scalars[0], &globals.reference_string.monomials[0], MAX_GATES >> 3, 15));
        uint64_t after = rdtsc();
        printf("pippenger single, clock cycles per scalar mul = %lu\n", (after - before) / (MAX_GATES >> 3));
    }
}
BENCHMARK(pippenger_2_pow_17_15_bench);



void pippenger_2_pow_18_12_bench(State &state) noexcept
{
    for (auto _ : state)
    {
        uint64_t before = rdtsc();
        DoNotOptimize(scalar_multiplication::pippenger(&globals.scalars[0], &globals.reference_string.monomials[0], MAX_GATES >> 1, 12));
        uint64_t after = rdtsc();
        printf("pippenger single, clock cycles per scalar mul = %lu\n", (after - before) / (MAX_GATES >> 2));
    }
}
BENCHMARK(pippenger_2_pow_18_12_bench);


void pippenger_2_pow_18_15_bench(State &state) noexcept
{
    for (auto _ : state)
    {
        uint64_t before = rdtsc();
        DoNotOptimize(scalar_multiplication::pippenger(&globals.scalars[0], &globals.reference_string.monomials[0], MAX_GATES >> 1, 15));
        uint64_t after = rdtsc();
        printf("pippenger single, clock cycles per scalar mul = %lu\n", (after - before) / (MAX_GATES >> 2));
    }
}
BENCHMARK(pippenger_2_pow_18_15_bench);




void pippenger_2_pow_19_12_bench(State &state) noexcept
{
    for (auto _ : state)
    {
        uint64_t before = rdtsc();
        DoNotOptimize(scalar_multiplication::pippenger(&globals.scalars[0], &globals.reference_string.monomials[0], MAX_GATES >> 1, 12));
        uint64_t after = rdtsc();
        printf("pippenger single, clock cycles per scalar mul = %lu\n", (after - before) / (MAX_GATES >> 1));
    }
}
BENCHMARK(pippenger_2_pow_19_12_bench);


void pippenger_2_pow_19_15_bench(State &state) noexcept
{
    for (auto _ : state)
    {
        uint64_t before = rdtsc();
        DoNotOptimize(scalar_multiplication::pippenger(&globals.scalars[0], &globals.reference_string.monomials[0], MAX_GATES >> 1, 15));
        uint64_t after = rdtsc();
        printf("pippenger single, clock cycles per scalar mul = %lu\n", (after - before) / (MAX_GATES >> 1));
    }
}
BENCHMARK(pippenger_2_pow_19_15_bench);




void pippenger_one_million_12_bench(State &state) noexcept
{
    for (auto _ : state)
    {
        uint64_t before = rdtsc();
        DoNotOptimize(scalar_multiplication::pippenger(&globals.scalars[0], &globals.reference_string.monomials[0], MAX_GATES, 12));
        uint64_t after = rdtsc();
        printf("pippenger single, clock cycles per scalar mul = %lu\n", (after - before) / MAX_GATES);
    }
}
BENCHMARK(pippenger_one_million_12_bench);


void pippenger_one_million_15_bench(State &state) noexcept
{
    for (auto _ : state)
    {
        uint64_t before = rdtsc();
        DoNotOptimize(scalar_multiplication::pippenger(&globals.scalars[0], &globals.reference_string.monomials[0], MAX_GATES, 15));
        uint64_t after = rdtsc();
        printf("pippenger single, clock cycles per scalar mul = %lu\n", (after - before) / MAX_GATES);
    }
}
BENCHMARK(pippenger_one_million_15_bench);


void pippenger_one_million_18_bench(State &state) noexcept
{
    for (auto _ : state)
    {
        uint64_t before = rdtsc();
        DoNotOptimize(scalar_multiplication::pippenger(&globals.scalars[0], &globals.reference_string.monomials[0], MAX_GATES, 18));
        uint64_t after = rdtsc();
        printf("pippenger single, clock cycles per scalar mul = %lu\n", (after - before) / MAX_GATES);
    }
}
BENCHMARK(pippenger_one_million_18_bench);

void alt_pippenger_bench(State& state) noexcept
{
    for (auto _ : state)
    {
        uint64_t before = rdtsc();
        DoNotOptimize(scalar_multiplication::alt_pippenger(&globals.scalars[0], &globals.reference_string.monomials[0], MAX_GATES));
        uint64_t after = rdtsc();
        printf("pippenger single, clock cycles per scalar mul = %lu\n", (after - before) / MAX_GATES);
    }
}
BENCHMARK(alt_pippenger_bench);

void three_non_batched_scalar_multiplications_bench(State& state) noexcept
{
    for (auto _ : state)
    {
        DoNotOptimize(scalar_multiplication::pippenger(&globals.scalars[0], &globals.reference_string.monomials[0], MAX_GATES));
        DoNotOptimize(scalar_multiplication::pippenger(&globals.scalars[0], &globals.reference_string.monomials[0], MAX_GATES));
        DoNotOptimize(scalar_multiplication::pippenger(&globals.scalars[0], &globals.reference_string.monomials[0], MAX_GATES));
    }
}
BENCHMARK(three_non_batched_scalar_multiplications_bench);


void one_batched_scalar_multiplications_bench(State& state) noexcept
{
    size_t num_batches = 1;
    scalar_multiplication::multiplication_state mul_state[num_batches];
    for (size_t i = 0; i < num_batches; ++i)
    {
        mul_state[i].num_elements = MAX_GATES;
        mul_state[i].scalars = &globals.scalars[0];
        mul_state[i].points = &globals.reference_string.monomials[0];
    }
    for (auto _ : state)
    {
        (scalar_multiplication::batched_scalar_multiplications(mul_state, num_batches));
    }
}
BENCHMARK(one_batched_scalar_multiplications_bench);

void two_batched_scalar_multiplications_bench(State& state) noexcept
{
    size_t num_batches = 2;
    scalar_multiplication::multiplication_state mul_state[num_batches];
    for (size_t i = 0; i < num_batches; ++i)
    {
        mul_state[i].num_elements = MAX_GATES;
        mul_state[i].scalars = &globals.scalars[0];
        mul_state[i].points = &globals.reference_string.monomials[0];
    }
    for (auto _ : state)
    {
        (scalar_multiplication::batched_scalar_multiplications(mul_state, num_batches));
    }
}
BENCHMARK(two_batched_scalar_multiplications_bench);

void three_batched_scalar_multiplications_bench(State& state) noexcept
{
    size_t num_batches = 3;
    scalar_multiplication::multiplication_state mul_state[num_batches];
    for (size_t i = 0; i < num_batches; ++i)
    {
        mul_state[i].num_elements = MAX_GATES;
        mul_state[i].scalars = &globals.scalars[0];
        mul_state[i].points = &globals.reference_string.monomials[0];
    }
    for (auto _ : state)
    {
        (scalar_multiplication::batched_scalar_multiplications(mul_state, num_batches));
    }
}
BENCHMARK(three_batched_scalar_multiplications_bench);


void plonk_scalar_multiplications_bench(State& state) noexcept
{
    scalar_multiplication::multiplication_state mul_state_a[3];
    scalar_multiplication::multiplication_state mul_state_b[1];
    scalar_multiplication::multiplication_state mul_state_c[3];
    scalar_multiplication::multiplication_state mul_state_d[2];

    for (size_t i = 0; i < 3; ++i)
    {
        mul_state_a[i].num_elements = MAX_GATES;
        mul_state_a[i].scalars = &globals.scalars[0];
        mul_state_a[i].points = &globals.reference_string.monomials[0];
        mul_state_c[i].num_elements = MAX_GATES;
        mul_state_c[i].scalars = &globals.scalars[0];
        mul_state_c[i].points = &globals.reference_string.monomials[0];
        if (i < 1)
        {
            mul_state_b[i].num_elements = MAX_GATES;
            mul_state_b[i].scalars = &globals.scalars[0];
            mul_state_b[i].points = &globals.reference_string.monomials[0];
        }
        if (i < 2)
        {
            mul_state_d[i].num_elements = MAX_GATES;
            mul_state_d[i].scalars = &globals.scalars[0];
            mul_state_d[i].points = &globals.reference_string.monomials[0];
        }
    }
    for (auto _ : state)
    {
        (scalar_multiplication::batched_scalar_multiplications(mul_state_a, 3));
        (scalar_multiplication::batched_scalar_multiplications(mul_state_b, 1));
        (scalar_multiplication::batched_scalar_multiplications(mul_state_c, 3));
        (scalar_multiplication::batched_scalar_multiplications(mul_state_d, 2));
    }
}
BENCHMARK(plonk_scalar_multiplications_bench);


void fft_bench_parallel(State& state) noexcept
{
    for (auto _ : state)
    {
        size_t idx = (size_t)log2(state.range(0) / 4) - (size_t)log2(START);
        barretenberg::polynomial_arithmetic::fft(globals.data, plonk_circuit_states[idx].circuit_state.large_domain);
    }
}
BENCHMARK(fft_bench_parallel)->RangeMultiplier(2)->Range(START * 4, MAX_GATES * 4);

void fft_bench_serial(State& state) noexcept
{
    for (auto _ : state)
    {
        size_t idx = (size_t)log2(state.range(0) / 4) - (size_t)log2(START);
        barretenberg::polynomial_arithmetic::fft_inner_serial(globals.data, plonk_circuit_states[idx].circuit_state.large_domain.thread_size, plonk_circuit_states[idx].circuit_state.large_domain.get_round_roots());
    }
}
BENCHMARK(fft_bench_serial)->RangeMultiplier(2)->Range(START * 4, MAX_GATES * 4);

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
    fq::field_t a{{ 0x1122334455667788, 0x8877665544332211, 0x0123456701234567, 0x0efdfcfbfaf9f8f7 } };
    fq::field_t r{{ 1, 0, 0, 0 } };
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
    fq::field_t a{{ 0x1122334455667788, 0x8877665544332211, 0x0123456701234567, 0x0efdfcfbfaf9f8f7 } };
    fq::field_t r{{ 1, 0, 0, 0 } };
    for (auto _ : state)
    {
        size_t before = rdtsc();
        (DoNotOptimize(fq_mul_asm(a, r)));
        size_t after = rdtsc();
        count += after - before;
        ++i;
    }
    printf("mul number of cycles = %lu\n", count / (i * NUM_MULTIPLICATIONS));
}
BENCHMARK(fq_mul_asm_bench);

BENCHMARK_MAIN();
// 21218750000