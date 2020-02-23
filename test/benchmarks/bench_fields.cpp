#include <benchmark/benchmark.h>

using namespace benchmark;

#include <barretenberg/curves/bn254/fr.hpp>
#include <barretenberg/fields/new_field.hpp>

typedef test::field<barretenberg::FrParams> new_field;

using namespace barretenberg;

void new_field_mixed_add(const new_field& x1,
                         const new_field& y1,
                         const new_field& z1,
                         const new_field& x2,
                         const new_field& y2,
                         new_field& x3,
                         new_field& y3,
                         new_field& z3)
{
    new_field T0 = z1.sqr();
    new_field T1 = T0 * x2;
    T1 -= x1;
    new_field T2 = T0 * z1 * y2;
    T2 -= y1;

    T2 += T2;
    z3 = z1 + T1;
    new_field T3 = T1.sqr();
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

    T1 *= y1;
    T1 += T1;

    T3 *= T2;

    y3 = T3 - T1;
}

void old_field_mixed_add(const fr::field_t& x1,
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
std::vector<barretenberg::fr::field_t> oldx;
std::vector<barretenberg::fr::field_t> oldy;
// std::vector<barretenberg::fr::field_t> oldz;

std::vector<new_field> newx;
std::vector<new_field> newy;
// std::vector<new_field> newz;

fr::field_t accx;
fr::field_t accy;
fr::field_t accz;
const auto init = []() {
    fr::field_t seed_x = fr::random_element();
    fr::field_t seed_y = fr::random_element();
    fr::field_t seed_z = fr::random_element();
    accx = seed_x;
    accy = seed_y;
    accz = seed_z;
    for (size_t i = 0; i < NUM_POINTS; ++i) {
        oldx.emplace_back(accx);
        oldy.emplace_back(accy);
        // oldz.emplace_back(accz);
        newx.emplace_back(new_field{ accx.data[0], accx.data[1], accx.data[2], accx.data[3] });
        newy.emplace_back(new_field{ accy.data[0], accy.data[1], accy.data[2], accy.data[3] });
        // newz.emplace_back({ accz.data[0], accz.data[1], accz.data[2], accz.data[3] });

        accx = accx * seed_x;
        accy = accy * seed_y;
        accz = accz * seed_z;
    }
    return 1;
}();

void old_field_bench(State& state) noexcept
{
    for (auto _ : state) {
        fr::field_t x = accx;
        fr::field_t y = accy;
        fr::field_t z = accz;
        for (size_t i = 0; i < NUM_POINTS; ++i) {
            old_field_mixed_add(x, y, z, oldx[i], oldy[i], x, y, z);
        }
    }
}
BENCHMARK(old_field_bench);

void new_field_bench(State& state) noexcept
{
    for (auto _ : state) {
        new_field x{ accx.data[0], accx.data[1], accx.data[2], accx.data[3] };
        new_field y{ accy.data[0], accy.data[1], accy.data[2], accy.data[3] };
        new_field z{ accz.data[0], accz.data[1], accz.data[2], accz.data[3] };
        for (size_t i = 0; i < NUM_POINTS; ++i) {
            new_field_mixed_add(x, y, z, newx[i], newy[i], x, y, z);
        }
    }
}
BENCHMARK(new_field_bench);

BENCHMARK_MAIN();
