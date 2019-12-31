#include <gtest/gtest.h>

#include <vector>
#include <chrono>

#include <barretenberg/io/io.hpp>
#include <barretenberg/curves/bn254/fq.hpp>
#include <barretenberg/curves/bn254/fr.hpp>
#include <barretenberg/curves/bn254/g1.hpp>
#include <barretenberg/curves/bn254/scalar_multiplication/scalar_multiplication.hpp>

using namespace barretenberg;


TEST(scalar_multiplication, pippenger_timing)
{
    constexpr size_t num_initial_points = 1 << 20;
    constexpr size_t num_points = num_initial_points * 2;
    g1::affine_element* monomials = (g1::affine_element*)(aligned_alloc(64, sizeof(g1::affine_element) * (num_points)));
    g2::affine_element g2_x;
    io::read_transcript(monomials, g2_x, num_initial_points, BARRETENBERG_SRS_PATH);

    scalar_multiplication::generate_pippenger_point_table(monomials, monomials, num_initial_points);

    fr::field_t* scalars = (fr::field_t*)(aligned_alloc(64, sizeof(fr::field_t) * num_initial_points));

    fr::field_t source_scalar = fr::random_element();
    for (size_t i = 0; i < num_initial_points; ++i)
    {
        fr::__sqr(source_scalar, source_scalar);
        fr::__copy(source_scalar, scalars[i]);
    }

    scalar_multiplication::multiplication_runtime_state state;
    scalar_multiplication::generate_pippenger_point_table(monomials, monomials, num_initial_points);

    std::chrono::steady_clock::time_point start = std::chrono::steady_clock::now();
    scalar_multiplication::compute_wnaf_states<num_initial_points>(state, scalars);
    std::chrono::steady_clock::time_point end = std::chrono::steady_clock::now();
    std::chrono::milliseconds diff = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);
    std::cout << "wnaf time: " << diff.count() << "ms" << std::endl;

    start = std::chrono::steady_clock::now();
    scalar_multiplication::organize_buckets<num_points>(state);
    end = std::chrono::steady_clock::now();
    diff = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);
    std::cout << "organize bucket time: " << diff.count() << "ms" << std::endl;

    start = std::chrono::steady_clock::now();
    scalar_multiplication::scalar_multiplication_internal<num_points>(state, monomials);
    end = std::chrono::steady_clock::now();
    diff = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);
    std::cout << "scalar mul: " << diff.count() << "ms" << std::endl;


    aligned_free(scalars);
    aligned_free(monomials);
}

TEST(scalar_multiplication, endomorphism_split)
{
    fr::field_t scalar = fr::random_element();

    g1::element expected = g1::group_exponentiation_inner(g1::affine_one, scalar);

    // we want to test that we can split a scalar into two half-length components, using the same location in memory.
    fr::field_t* k1_t = &scalar;
    fr::field_t* k2_t = (fr::field_t*)&scalar.data[2];

    fr::split_into_endomorphism_scalars(scalar, *k1_t, *k2_t);

    fr::field_t k1{ { (*k1_t).data[0], (*k1_t).data[1], 0, 0 } };
    fr::field_t k2{ { (*k2_t).data[0], (*k2_t).data[1], 0, 0 } };

    g1::element result;
    g1::element t1 = g1::group_exponentiation_inner(g1::affine_one, k1);
    g1::affine_element beta = g1::affine_one;
    fq::__mul_beta(beta.x, beta.x);
    fq::__neg(beta.y, beta.y);
    g1::element t2 = g1::group_exponentiation_inner(beta, k2);
    g1::add(t1, t2, result);

    EXPECT_EQ(g1::eq(result, expected), true);
}

TEST(scalar_multiplication, radix_sort)
{
    // check that our radix sort correctly sorts!
    constexpr size_t target_degree = 1 << 8;
    constexpr size_t num_rounds = scalar_multiplication::get_num_rounds(target_degree * 2);
    fr::field_t* scalars = (fr::field_t*)(aligned_alloc(64, sizeof(fr::field_t) * target_degree));

    fr::field_t source_scalar = fr::random_element();
    for (size_t i = 0; i < target_degree; ++i)
    {
        fr::__sqr(source_scalar, source_scalar);
        fr::__copy(source_scalar, scalars[i]);
    }

    scalar_multiplication::multiplication_runtime_state state;
    scalar_multiplication::compute_wnaf_states<target_degree>(state, scalars);

    uint64_t* wnaf_copy = (uint64_t*)(aligned_alloc(64, sizeof(uint64_t) * target_degree * 2 * num_rounds));
    memcpy((void*)wnaf_copy, (void*)state.wnaf_table, sizeof(uint64_t) * target_degree * 2 * num_rounds);

    scalar_multiplication::organize_buckets<target_degree * 2>(state);
    for (size_t i = 0; i < num_rounds; ++i)
    {
        uint64_t* unsorted_wnaf = &wnaf_copy[i * target_degree * 2];
        uint64_t* sorted_wnaf = &state.wnaf_table[i * target_degree * 2];

        const auto find_entry = [unsorted_wnaf, num_entries = target_degree * 2](auto x)
        {
            for (size_t k = 0; k < num_entries; ++k)
            {
                if (unsorted_wnaf[k] == x)
                {
                    return true;
                }
            }
            return false;
        };
        for (size_t j = 0; j < target_degree * 2; ++j)
        {
            EXPECT_EQ(find_entry(sorted_wnaf[j]), true);
            if (j > 0)
            {
                EXPECT_EQ((sorted_wnaf[j] & 0x7fffffffU) >= (sorted_wnaf[j - 1] & 0x7fffffffU), true);
            }
        }
    }

    free(scalars);
    free(wnaf_copy);
}

TEST(scalar_multiplication, oversized_inputs)
{
    // for point ranges with more than 1 << 20 points, we split into chunks of smaller multi-exps.
    // Check that this is done correctly
    size_t transcript_degree = 1 << 20;
    size_t target_degree = 1200000;
    g1::affine_element* monomials = (g1::affine_element*)(aligned_alloc(64, sizeof(g1::affine_element) * (2 * target_degree)));
    g2::affine_element g2_x;
    io::read_transcript(monomials, g2_x, transcript_degree, BARRETENBERG_SRS_PATH);

    memcpy((void*)(monomials + (2 * transcript_degree)), (void*)monomials, ((2 * target_degree - 2 * transcript_degree) * sizeof(g1::affine_element)));
    scalar_multiplication::generate_pippenger_point_table(monomials, monomials, target_degree);

    fr::field_t* scalars = (fr::field_t*)(aligned_alloc(64, sizeof(fr::field_t) * target_degree));

    fr::field_t source_scalar = fr::random_element();
    for (size_t i = 0; i < target_degree; ++i)
    {
        fr::__sqr(source_scalar, source_scalar);
        fr::__copy(source_scalar, scalars[i]);
    }


    g1::element first = scalar_multiplication::pippenger(scalars, monomials, target_degree);
    first = g1::normalize(first);
    
    for (size_t i = 0; i < target_degree; ++i)
    {
        fr::__neg(scalars[i], scalars[i]);
    }

    g1::element second = scalar_multiplication::pippenger(scalars, monomials, target_degree);
    second = g1::normalize(second);

    EXPECT_EQ(fq::eq(first.z, second.z), true);
    EXPECT_EQ(fq::eq(first.z, fq::one), true);
    EXPECT_EQ(fq::eq(first.x, second.x), true);
    EXPECT_EQ(fq::eq(first.y, fq::neg(second.y)), true);

    aligned_free(monomials);
    aligned_free(scalars);
}

TEST(scalar_multiplication, undersized_inputs)
{
    // we fall back to traditional scalar multiplication algorithm for small input sizes.
    // Check this is done correctly
    size_t num_points = 17;

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

    g1::affine_element* points = (g1::affine_element*)aligned_alloc(32, sizeof(g1::affine_element) * 2 + 1);

    g1::element result = scalar_multiplication::pippenger(scalars, points, 0);
    EXPECT_EQ(g1::is_point_at_infinity(result), true);
}

TEST(scalar_multiplication, pippenger_mul_by_zero)
{
    fr::field_t* scalars = (fr::field_t*)aligned_alloc(32, sizeof(fr::field_t));

    g1::affine_element* points = (g1::affine_element*)aligned_alloc(32, sizeof(g1::affine_element) * 2 + 1);

    scalars[0] = fr::zero;
    points[0] = g1::affine_one;
    scalar_multiplication::generate_pippenger_point_table(points, points, 1);

    g1::element result = scalar_multiplication::pippenger(scalars, points, 1);
    EXPECT_EQ(g1::is_point_at_infinity(result), true);
}

