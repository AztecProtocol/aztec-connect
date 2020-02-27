#include <benchmark/benchmark.h>

using namespace benchmark;

#include <barretenberg/curves/bn254/fr.hpp>

/*
ADX asm
------------------------------------------------------------
Benchmark                  Time             CPU   Iterations
------------------------------------------------------------
sqr_assign_bench    58897282 ns     59659091 ns           11
sqr_bench           80042911 ns     79861111 ns            9
unary_minus_bench   33735725 ns     34375000 ns           20
mul_assign_bench    61236664 ns     61079545 ns           11
mul_bench           81490829 ns     80357143 ns            7
add_bench           31052175 ns     31250000 ns           24
sub_bench           33843720 ns     33593750 ns           20
invert_bench      5008074600 ns   5000000000 ns            1
pow_bench         6020118300 ns   6015625000 ns            1
field_bench        916661900 ns    921875000 ns            1
-------------------------------------------------------------------------------------
Benchmark                                           Time             CPU   Iterations
-------------------------------------------------------------------------------------
pippenger_bench/8192                         16347884 ns     16047297 ns           37
pippenger_bench/16384                        29240762 ns     29296875 ns           24
pippenger_bench/32768                        57061918 ns     55397727 ns           11
pippenger_bench/65536                       106352929 ns    104910714 ns            7
pippenger_bench/131072                      205578500 ns    203125000 ns            4
pippenger_bench/262144                      352079750 ns    351562500 ns            2
pippenger_bench/524288                      691483800 ns    687500000 ns            1
pippenger_bench/1048576                    1333215400 ns   1250000000 ns            1
unsafe pippenger. 1048576 points. clock cycles = 1898152911
unsafe pippenger clock cycles per mul = 1810
unsafe_pippenger_bench/1048576              898753700 ns    875000000 ns            1
*/
/*
Generic
------------------------------------------------------------
Benchmark                  Time             CPU   Iterations
------------------------------------------------------------
sqr_assign_bench   109600860 ns    109375000 ns            5
sqr_bench          112329383 ns    111979167 ns            6
unary_minus_bench   29771167 ns     29296875 ns           24
mul_assign_bench   111395033 ns    111979167 ns            6
mul_bench          109264250 ns    109375000 ns            6
add_bench           29478508 ns     29947917 ns           24
sub_bench           32852481 ns     32738095 ns           21
invert_bench      10354704900 ns   10328125000 ns            1
pow_bench         12036579200 ns   12031250000 ns            1
field_bench       1557337500 ns   1562500000 ns            1
-------------------------------------------------------------------------------------
Benchmark                                           Time             CPU   Iterations
-------------------------------------------------------------------------------------
pippenger_bench/8192                         27198528 ns     25862069 ns           29
pippenger_bench/16384                        51719409 ns     48295455 ns           11
pippenger_bench/32768                        87673922 ns     86805556 ns            9
pippenger_bench/65536                       169227125 ns    160156250 ns            4
pippenger_bench/131072                      322899500 ns    328125000 ns            2
pippenger_bench/262144                      615274500 ns    546875000 ns            1
pippenger_bench/524288                     1119308100 ns   1078125000 ns            1
pippenger_bench/1048576                    2145468700 ns   2078125000 ns            1
unsafe pippenger. 1048576 points. clock cycles = 3626871186
unsafe pippenger clock cycles per mul = 3458
unsafe_pippenger_bench/1048576             1717275300 ns   1640625000 ns            1
*/
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

fr::field_t sqr_assign_impl(const fr::field_t& x)
{
    fr::field_t acc = x;
    for (size_t i = 0; i < NUM_POINTS; ++i) {
        acc.self_sqr();
    }
    return acc;
}
void sqr_assign_bench(State& state) noexcept
{
    for (auto _ : state) {
        DoNotOptimize(sqr_assign_impl(accx));
    }
}
BENCHMARK(sqr_assign_bench);

fr::field_t sqr_impl(const fr::field_t& x)
{
    fr::field_t acc = x;
    for (size_t i = 0; i < NUM_POINTS; ++i) {
        acc = acc.sqr();
    }
    return acc;
}
void sqr_bench(State& state) noexcept
{
    for (auto _ : state) {
        DoNotOptimize(sqr_impl(accx));
    }
}
BENCHMARK(sqr_bench);

fr::field_t unary_minus_impl(const fr::field_t& x)
{
    fr::field_t acc = x;
    for (size_t i = 0; i < NUM_POINTS; ++i) {
        acc = -acc;
    }
    return acc;
}
void unary_minus_bench(State& state) noexcept
{
    for (auto _ : state) {
        DoNotOptimize(unary_minus_impl(accx));
    }
}
BENCHMARK(unary_minus_bench);

fr::field_t mul_assign_impl(const fr::field_t& x, fr::field_t& y)
{
    fr::field_t acc = x;
    for (size_t i = 0; i < NUM_POINTS; ++i) {
        acc *= y;
    }
    return acc;
}
void mul_assign_bench(State& state) noexcept
{
    for (auto _ : state) {
        DoNotOptimize(mul_assign_impl(accx, accy));
    }
}
BENCHMARK(mul_assign_bench);

fr::field_t mul_impl(const fr::field_t& x, fr::field_t& y)
{
    fr::field_t acc = x;
    for (size_t i = 0; i < NUM_POINTS; ++i) {
        acc = acc * y;
    }
    return acc;
}

void mul_bench(State& state) noexcept
{
    for (auto _ : state) {
        DoNotOptimize(mul_impl(accx, accy));
    }
}
BENCHMARK(mul_bench);

fr::field_t add_impl(const fr::field_t& x, fr::field_t& y)
{
    fr::field_t acc = x;
    for (size_t i = 0; i < NUM_POINTS; ++i) {
        acc = acc + y;
    }
    return acc;
}

void add_bench(State& state) noexcept
{
    for (auto _ : state) {
        DoNotOptimize(add_impl(accx, accy));
    }
}
BENCHMARK(add_bench);

fr::field_t sub_impl(const fr::field_t& x, fr::field_t& y)
{
    fr::field_t acc = x;
    for (size_t i = 0; i < NUM_POINTS; ++i) {
        acc = acc - y;
    }
    return acc;
}

void sub_bench(State& state) noexcept
{
    for (auto _ : state) {
        DoNotOptimize(sub_impl(accx, accy));
    }
}
BENCHMARK(sub_bench);

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
        DoNotOptimize(z);
    }
}
BENCHMARK(field_bench);

BENCHMARK_MAIN();
