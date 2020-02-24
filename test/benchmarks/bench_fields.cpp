#include <benchmark/benchmark.h>

using namespace benchmark;

#include <barretenberg/curves/bn254/fr.hpp>

using namespace barretenberg;

void field_mixed_add(const fr::field_t& x1,
                     const fr::field_t& y1,
                     const fr::field_t& z1,
                     const fr::field_t& x2,
                     const fr::field_t& y2,
                     fr::field_t& x3,
                     fr::field_t& y3,
                     fr::field_t& z3)
{
    fr::field_t T0;
    fr::field_t T1;
    fr::field_t T2;
    fr::field_t T3;

    T0 = z1.sqr();
    T1 = x2 * T0;
    T1 -= x1;
    T2 = z1 * T0;
    T2 *= y2;
    T2 -= y1;
    z3 = z1 + T1;
    T2 += T2;
    T3 = T1.sqr();
    T0 += T3;
    z3.self_sqr();
    z3 -= T0;
    T3 += T3;
    T3 += T3;
    T1 *= T3;
    T3 *= x1;
    T0 = T3 + T3;
    T0 += T1;
    x3 = T2.sqr();
    x3 -= T0;
    T3 -= x3;
    T1 *= y1;
    T1 += T1;
    T3 *= T2;
    y3 = T3 - T1;
}

constexpr size_t NUM_POINTS = 1 << 22;
constexpr size_t NUM_INVERSIONS = 1 << 20;
std::vector<barretenberg::fr::field_t> oldx;
std::vector<barretenberg::fr::field_t> oldy;

fr::field_t accx;
fr::field_t accy;
fr::field_t accz;
const auto init = []() {
    fr::field_t seed_x = fr::field_t::random_element();
    fr::field_t seed_y = fr::field_t::random_element();
    fr::field_t seed_z = fr::field_t::random_element();
    accx = seed_x;
    accy = seed_y;
    accz = seed_z;
    for (size_t i = 0; i < NUM_POINTS; ++i) {
        oldx.emplace_back(accx);
        oldy.emplace_back(accy);

        accx = accx * seed_x;
        accy = accy * seed_y;
        accz = accz * seed_z;
    }
    return 1;
}();

void invert_bench(State& state) noexcept
{
    for (auto _ : state) {
        fr::field_t x = accx;
        for (size_t i = 0; i < NUM_INVERSIONS; ++i) {
            x = x.invert();
        }
        DoNotOptimize(x);
    }
}
BENCHMARK(invert_bench);

void pow_bench(State& state) noexcept
{
    for (auto _ : state) {
        constexpr fr::field_t exponent = fr::field_t::modulus - fr::field_t(2);
        fr::field_t x = accx;
        for (size_t i = 0; i < NUM_INVERSIONS; ++i) {
            x = x.pow(exponent);
        }
        DoNotOptimize(x);
    }
}
BENCHMARK(pow_bench);

void field_bench(State& state) noexcept
{
    for (auto _ : state) {
        fr::field_t x = accx;
        fr::field_t y = accy;
        fr::field_t z = accz;
        for (size_t i = 0; i < NUM_POINTS; ++i) {
            field_mixed_add(x, y, z, oldx[i], oldy[i], x, y, z);
        }
    }
}
BENCHMARK(field_bench);

BENCHMARK_MAIN();
