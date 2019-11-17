#include <gtest/gtest.h>

#include <vector>

#include <barretenberg/fields/fq.hpp>
#include <barretenberg/fields/fr.hpp>
#include <barretenberg/groups/g1.hpp>
#include <barretenberg/groups/scalar_multiplication.hpp>

using namespace barretenberg;

namespace
{
void generate_points(g1::affine_element* points, size_t num_points)
{
    g1::element small_table[10000];
    for (size_t i = 0; i < 10000; ++i)
    {
        small_table[i] = g1::random_element();
    }
    g1::element current_table[10000];
    for (size_t i = 0; i < (num_points / 10000); ++i)
    {
        for (size_t j = 0; j < 10000; ++j)
        {
            g1::add(small_table[i], small_table[j], current_table[j]);
        }
        g1::batch_normalize(&current_table[0], 10000);
        for (size_t j = 0; j < 10000; ++j)
        {
            fq::copy(current_table[j].x, points[i * 10000 + j].x);
            fq::copy(current_table[j].y, points[i * 10000 + j].y);
        }
    }
    g1::batch_normalize(small_table, 10000);
    size_t rounded = (num_points / 10000) * 10000;
    size_t leftovers = num_points - rounded;
    for (size_t j = 0; j < leftovers; ++j)
    {
        fq::copy(small_table[j].x, points[rounded + j].x);
        fq::copy(small_table[j].y, points[rounded + j].y);
    }
}
} // namespace

TEST(scalar_multiplication, endomorphism_split)
{
    fr::field_t scalar = fr::random_element();

    g1::element expected = g1::group_exponentiation_inner(g1::affine_one(), scalar);

    // we want to test that we can split a scalar into two half-length components, using the same location in memory.
    fr::field_t* k1_t = &scalar;
    fr::field_t* k2_t = (fr::field_t*)&scalar.data[2];

    fr::split_into_endomorphism_scalars(scalar, *k1_t, *k2_t);

    fr::field_t k1{ { (*k1_t).data[0], (*k1_t).data[1], 0, 0 } };
    fr::field_t k2{ { (*k2_t).data[0], (*k2_t).data[1], 0, 0 } };

    g1::element result;
    g1::element t1 = g1::group_exponentiation_inner(g1::affine_one(), k1);
    g1::affine_element beta = g1::affine_one();
    fq::__mul_beta(beta.x, beta.x);
    fq::__neg(beta.y, beta.y);
    g1::element t2 = g1::group_exponentiation_inner(beta, k2);
    g1::add(t1, t2, result);

    EXPECT_EQ(g1::eq(result, expected), true);
}

TEST(scalar_multiplication, pippenger)
{
    size_t num_points = 10000;

    fr::field_t* scalars = (fr::field_t*)aligned_alloc(32, sizeof(fr::field_t) * num_points);

    g1::affine_element* points =
        (g1::affine_element*)aligned_alloc(32, sizeof(g1::affine_element) * num_points * 2 + 1);

    for (size_t i = 0; i < num_points; ++i)
    {
        scalars[i] = fr::random_element();
        points[i] = g1::random_affine_element();
    }

    g1::element expected;
    g1::set_infinity(expected);
    for (size_t i = 0; i < num_points; ++i)
    {
        g1::element temp = g1::group_exponentiation_inner(points[i], scalars[i]);
        g1::add(expected, temp, expected);
    }
    expected = g1::normalize(expected);
    scalar_multiplication::generate_pippenger_point_table(points, points, num_points);

    g1::element result = scalar_multiplication::pippenger(scalars, points, num_points);
    result = g1::normalize(result);

    aligned_free(scalars);
    aligned_free(points);

    EXPECT_EQ(g1::eq(result, expected), true);
}

TEST(scalar_multiplication, pippenger_one)
{
    size_t num_points = 1;

    fr::field_t* scalars = (fr::field_t*)aligned_alloc(32, sizeof(fr::field_t) * 1);

    g1::affine_element* points =
        (g1::affine_element*)aligned_alloc(32, sizeof(g1::affine_element) * num_points * 2 + 1);

    for (size_t i = 0; i < num_points; ++i)
    {
        scalars[i] = fr::random_element();
        points[i] = g1::random_affine_element();
    }

    g1::element expected;
    g1::set_infinity(expected);
    for (size_t i = 0; i < num_points; ++i)
    {
        g1::element temp = g1::group_exponentiation_inner(points[i], scalars[i]);
        g1::add(expected, temp, expected);
    }
    expected = g1::normalize(expected);
    scalar_multiplication::generate_pippenger_point_table(points, points, num_points);

    g1::element result = scalar_multiplication::pippenger(scalars, points, num_points);
    result = g1::normalize(result);

    aligned_free(scalars);
    aligned_free(points);

    EXPECT_EQ(g1::eq(result, expected), true);
}

TEST(scalar_multiplication, pippenger_zero_points)
{
    fr::field_t* scalars = (fr::field_t*)aligned_alloc(32, sizeof(fr::field_t));

    g1::affine_element* points =
        (g1::affine_element*)aligned_alloc(32, sizeof(g1::affine_element) * 2 + 1);


    g1::element result = scalar_multiplication::pippenger(scalars, points, 0);
    EXPECT_EQ(g1::is_point_at_infinity(result), true);
}

TEST(scalar_multiplication, pippenger_mul_by_zero)
{
    fr::field_t* scalars = (fr::field_t*)aligned_alloc(32, sizeof(fr::field_t));

    g1::affine_element* points =
        (g1::affine_element*)aligned_alloc(32, sizeof(g1::affine_element) * 2 + 1);

    scalars[0] = fr::zero();
    points[0] = g1::affine_one();
    scalar_multiplication::generate_pippenger_point_table(points, points, 1);

    g1::element result = scalar_multiplication::pippenger(scalars, points, 1);
    EXPECT_EQ(g1::is_point_at_infinity(result), true);
}

TEST(scalar_multiplication, pippenger_low_memory)
{
    size_t num_points = 1000;

    fr::field_t* scalars = (fr::field_t*)aligned_alloc(32, sizeof(fr::field_t) * num_points);

    g1::affine_element* points = (g1::affine_element*)aligned_alloc(32, sizeof(g1::affine_element) * num_points);

    for (size_t i = 0; i < num_points; ++i)
    {
        scalars[i] = fr::random_element();
        points[i] = g1::random_affine_element();
    }

    g1::element expected;
    g1::set_infinity(expected);
    for (size_t i = 0; i < num_points; ++i)
    {
        g1::element temp = g1::group_exponentiation_inner(points[i], scalars[i]);
        g1::add(expected, temp, expected);
    }
    expected = g1::normalize(expected);

    g1::element result = scalar_multiplication::pippenger_low_memory(scalars, points, num_points);

    result = g1::normalize(result);

    aligned_free(scalars);
    aligned_free(points);

    EXPECT_EQ(g1::eq(result, expected), true);
}

TEST(scalar_multiplication, pippenger_internal_alt)
{
    size_t num_points = 1000;

    fr::field_t* scalars = (fr::field_t*)aligned_alloc(32, sizeof(fr::field_t) * num_points);

    g1::affine_element* points =
        (g1::affine_element*)aligned_alloc(32, sizeof(g1::affine_element) * num_points * 2 + 1);

    for (size_t i = 0; i < num_points; ++i)
    {
        scalars[i] = fr::random_element();
        points[i] = g1::random_affine_element();
    }

    g1::element expected;
    g1::set_infinity(expected);
    for (size_t i = 0; i < num_points; ++i)
    {
        g1::element temp = g1::group_exponentiation_inner(points[i], scalars[i]);
        g1::add(expected, temp, expected);
    }
    expected = g1::normalize(expected);
    scalar_multiplication::generate_pippenger_point_table(points, points, num_points);

    g1::element result = scalar_multiplication::alt_pippenger(scalars, points, num_points);
    result = g1::normalize(result);

    free(scalars);
    free(points);

    EXPECT_EQ(g1::eq(result, expected), true);
}

TEST(scalar_multiplication_precompute, precomputed_pippenger)
{
    size_t num_points = 1000;

    fr::field_t* scalars = (fr::field_t*)aligned_alloc(32, sizeof(fr::field_t) * num_points);

    g1::affine_element* points =
        (g1::affine_element*)aligned_alloc(32, sizeof(g1::affine_element) * num_points * 2 + 1);

    for (size_t i = 0; i < num_points; ++i)
    {
        scalars[i] = fr::random_element();
        points[i] = g1::random_affine_element();
    }

    size_t bits_per_bucket = scalar_multiplication::get_optimal_bucket_width(num_points);
    size_t num_rounds = (127 + bits_per_bucket) / (bits_per_bucket + 1);
    g1::affine_element* precompute_table =
        (g1::affine_element*)aligned_alloc(32, sizeof(g1::affine_element) * num_points * (num_rounds - 1));

    std::vector<g1::affine_element*> round_points = scalar_multiplication::generate_pippenger_precompute_table(
        points, precompute_table, num_points, bits_per_bucket);
    g1::element expected;
    g1::set_infinity(expected);
    for (size_t i = 0; i < num_points; ++i)
    {
        g1::element temp = g1::group_exponentiation_inner(points[i], scalars[i]);
        g1::add(expected, temp, expected);
    }
    expected = g1::normalize(expected);
    // scalar_multiplication::generate_pippenger_point_table(points, points, num_points);
    g1::element result = scalar_multiplication::pippenger_precomputed(scalars, round_points, num_points);
    result = g1::normalize(result);

    free(scalars);
    free(points);

    EXPECT_EQ(g1::eq(result, expected), true);
}

TEST(scalar_multiplication, batched_scalar_multiplication)
{
    size_t num_points = 10000;
    size_t num_exponentiations = 5; // pick a number that will (probably) not evenly divide # of cores

    fr::field_t* scalars = (fr::field_t*)aligned_alloc(32, sizeof(fr::field_t) * num_points * 2);

    g1::affine_element* points =
        (g1::affine_element*)aligned_alloc(32, sizeof(g1::affine_element) * num_points * 4 + 2);

    generate_points(points, num_points);
    size_t points_per_iteration = num_points / num_exponentiations;
    for (size_t i = 0; i < num_points; ++i)
    {
        scalars[i] = fr::random_element();
        fr::copy(scalars[i], scalars[i + num_points]);
        g1::copy(&points[i], &points[i + (num_points * 2)]);
    }
    scalar_multiplication::multiplication_state inputs[2 * num_exponentiations];
    for (size_t i = 0; i < num_exponentiations; ++i)
    {
        inputs[i].points = &points[i * (points_per_iteration * 2)];
        inputs[i + num_exponentiations].points = &points[i * (points_per_iteration * 2) + (num_points * 2)];
        inputs[i].scalars = &scalars[i * points_per_iteration];
        inputs[i + num_exponentiations].scalars = &scalars[i * points_per_iteration + num_points];
        inputs[i].num_elements = points_per_iteration;
        inputs[i + num_exponentiations].num_elements = points_per_iteration;
    }

    scalar_multiplication::generate_pippenger_point_table(points, points, num_points);
    scalar_multiplication::generate_pippenger_point_table(
        points + (num_points * 2), points + (num_points * 2), num_points);

    for (size_t i = 0; i < num_exponentiations; ++i)
    {
        inputs[i].output =
            scalar_multiplication::pippenger(inputs[i].scalars, inputs[i].points, inputs[i].num_elements);
        inputs[i].output = g1::normalize(inputs[i].output);
    }

    scalar_multiplication::batched_scalar_multiplications(&inputs[num_exponentiations], num_exponentiations);
    aligned_free(scalars);
    aligned_free(points);

    for (size_t j = 0; j < num_exponentiations; ++j)
    {
        for (size_t i = 0; i < 4; ++i)
        {
            EXPECT_EQ(inputs[j].output.x.data[i], inputs[j + num_exponentiations].output.x.data[i]);
            EXPECT_EQ(inputs[j].output.y.data[i], inputs[j + num_exponentiations].output.y.data[i]);
            EXPECT_EQ(inputs[j].output.z.data[i], inputs[j + num_exponentiations].output.z.data[i]);
        }
    }
}
