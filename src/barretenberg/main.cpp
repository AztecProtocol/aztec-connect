// #include "stdlib.h"
// #include <valgrind/callgrind.h>
// #include <pthread.h>
#include "./types.hpp"
#include "fields/fq.hpp"

int main()
{
    // test against some randomly generated test data
    barretenberg::fq::field_t a = { .data = { 0x2523b6fa3956f038, 0x158aa08ecdd9ec1d, 0xf48216a4c74738d4, 0x2514cc93d6f0a1bf } };
    barretenberg::fq::field_t a_copy = { .data = { 0x2523b6fa3956f038, 0x158aa08ecdd9ec1d, 0xf48216a4c74738d4, 0x2514cc93d6f0a1bf } };
    barretenberg::fq::field_t b = { .data = { 0xb68aee5e4c8fc17c, 0xc5193de7f401d5e8, 0xb8777d4dde671db3, 0xe513e75c087b0bb } };
    barretenberg::fq::field_t b_copy = { .data = { 0xb68aee5e4c8fc17c, 0xc5193de7f401d5e8, 0xb8777d4dde671db3, 0xe513e75c087b0bb } };
    barretenberg::fq::field_t expected = { .data = { 0x7ed4174114b521c4, 0x58f5bd1d4279fdc2, 0x6a73ac09ee843d41, 0x687a76ae9b3425c } };
    barretenberg::fq::field_t result = { .data = { 0,0,0,0 } };
    barretenberg::fq::__mul(a, b, result);
    barretenberg::fq::print(a);
    barretenberg::fq::print(b);
    barretenberg::fq::print(result);
    printf("mul result = %u\n", barretenberg::fq::eq(result, expected));
    printf("a preserved = %u\n", barretenberg::fq::eq(a, a_copy));
    printf("b preserved = %u\n", barretenberg::fq::eq(b, b_copy));

    for (size_t i = 0; i < 4; ++i)
    {
    printf("mul result inner = %u\n", result.data[i] == expected.data[i]);
    printf("a preserved inner = %u\n", a.data[i] == a_copy.data[i]);
    printf("b preserved inner = %u\n", b.data[i] == b_copy.data[i]);
    }
}

// #include "groups/g1.hpp"
// #include "groups/scalar_multiplication.hpp"
// #include "assert.hpp"

// using namespace barretenberg;

// void generate_points(g1::affine_element *points, size_t num_points)
// {
//     g1::element small_table[10000];
//     printf("making small table\n");
//     g1::element one = g1::one();
//     uint8_t number = 0;

//     for (size_t i = 0; i < 10000; ++i)
//     {
//         int got_entropy = getentropy((void *)&number, 1);
//         ASSERT(got_entropy == 0);
//         g1::element pt = g1::one();
//         for (size_t j = 0; j < number; ++j)
//         {
//             g1::add(one, pt, pt);
//         }
//         small_table[i] = pt;
//     }
//     g1::element current_table[10000];
//     printf("iterating over num_points / 10000 \n");
//     for (size_t i = 0; i < (num_points / 10000); ++i)
//     {
//         for (size_t j = 0; j < 10000; ++j)
//         {
//             g1::add(small_table[i], small_table[j], current_table[j]);
//         }
//         g1::batch_normalize(&current_table[0], 10000);
//         for (size_t j = 0; j < 10000; ++j)
//         {
//             fq::copy(current_table[j].x, points[i * 10000 + j].x);
//             fq::copy(current_table[j].y, points[i * 10000 + j].y);
//         }
//     }
//     printf("calling batch normalize\n");
//     g1::batch_normalize(small_table, 10000);
//     size_t rounded = (num_points / 10000) * 10000;
//     size_t leftovers = num_points - rounded;
//     printf("fixing up leftovers\n");
//     for (size_t j = 0; j < leftovers; ++j)
//     {
//         fq::copy(small_table[j].x, points[rounded + j].x);
//         fq::copy(small_table[j].y, points[rounded + j].y);
//     }
// }

// struct pippenger_point_data
// {
//     fr::field_t *scalars;
//     g1::affine_element *points;
// };

// constexpr size_t NUM_POINTS = 10000;
// constexpr size_t NUM_THREADS = 4;

// void *pippenger_single(void *v_args) noexcept
// {
//     pippenger_point_data *data = (pippenger_point_data *)v_args;
//     scalar_multiplication::pippenger(&data->scalars[0], &data->points[0], NUM_POINTS);
//     return NULL;
// }

// void pippenger_multicore() noexcept
// {
//     fr::field_t *scalars = (fr::field_t *)aligned_alloc(32, sizeof(fr::field_t) * NUM_POINTS * NUM_THREADS);
//     g1::affine_element *points = (g1::affine_element *)aligned_alloc(32, sizeof(g1::affine_element) * NUM_POINTS * NUM_THREADS * 2);

//     pthread_t thread[NUM_THREADS];
//     printf("Before Thread\n");
//     for (size_t i = 0; i < NUM_POINTS; ++i)
//     {
//         scalars[i] = fr::random_element();
//     }

//     generate_points(points, NUM_POINTS * NUM_THREADS);

//     printf("generating point table\n");
//     scalar_multiplication::generate_pippenger_point_table(points, points, NUM_POINTS * NUM_THREADS);

//     pippenger_point_data *inputs = (pippenger_point_data *)malloc(sizeof(pippenger_point_data) * NUM_THREADS);
//     for (size_t i = 0; i < NUM_THREADS; ++i)
//     {
//         size_t inc = i * NUM_POINTS;
//         inputs[i].scalars = &scalars[inc];
//         inputs[i].points = &points[inc];
//         pthread_create(&thread[i], NULL, &pippenger_single, (void *)(&inputs[i]));
//     }
//     for (size_t j = 0; j < NUM_THREADS; ++j)
//     {
//         pthread_join(thread[j], NULL);
//     }
//     printf("After Thread\n");
//     free(inputs);
//     free(scalars);
//     free(points);
// }

// int main()
// {
//     pippenger_multicore();
// }
// // // small .exe for profiling
// // int main()
// // {

// //     printf("allocating memory for scalars and points\n");
// //     fr::field_t* scalars = (fr::field_t*)aligned_alloc(32, sizeof(fr::field_t) * NUM_POINTS + 100);
// //     g1::affine_element* points = (g1::affine_element*)aligned_alloc(32, sizeof(g1::affine_element) * NUM_POINTS * 2 + 100);

// //     printf("generating scalars\n");
// //     for (size_t i = 0; i < NUM_POINTS; ++i)
// //     {
// //         fr::random_element(scalars[i]);
// //     }
// //     printf("generating points\n");
// //     generate_points(points, NUM_POINTS);

// //     printf("generating point table\n");
// //     scalar_multiplication::generate_pippenger_point_table(points, points, NUM_POINTS);

// //     printf("calling pippenger\n");
// //     CALLGRIND_START_INSTRUMENTATION;
// //     // for (size_t i = (NUM_POINTS * 2) - 1; i > 0; --i)
// //     // {
// //     //     printf("point[%lu] = :", i);
// //     //     g1::print(points[i]);
// //     //     printf("\n");
// //     // }
// //     g1::element result = scalar_multiplication::pippenger(scalars, points, NUM_POINTS, NUM_BUCKETS);
// //     CALLGRIND_STOP_INSTRUMENTATION;
// //     CALLGRIND_DUMP_STATS;
// //     result = g1::normalize(result);

// //     g1::print(result);
// //     free(scalars);
// //     free(points);
// // }