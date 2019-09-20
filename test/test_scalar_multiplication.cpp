#include <gtest/gtest.h>

#include <vector>

#include <libff/algebra/fields/fp.hpp>
#include <libff/algebra/curves/alt_bn128/alt_bn128_pp.hpp>
#include <libff/algebra/curves/alt_bn128/alt_bn128_g1.hpp>
#include <libff/algebra/curves/alt_bn128/alt_bn128_init.hpp>
#include <libff/algebra/scalar_multiplication/multiexp.hpp>

#include <barretenberg/groups/scalar_multiplication.hpp>
#include <barretenberg/groups/g1.hpp>
#include <barretenberg/fields/fq.hpp>
#include <barretenberg/fields/fr.hpp>

using namespace barretenberg;

namespace
{
void to_bigint(uint64_t *a, libff::bigint<4>& a_bigint)
{
    a_bigint.data[0] = a[0];
    a_bigint.data[1] = a[1];
    a_bigint.data[2] = a[2];
    a_bigint.data[3] = a[3];
}
void to_endo_bigint(uint64_t *a, libff::bigint<4>& a_bigint)
{
    a_bigint.data[0] = a[0];
    a_bigint.data[1] = a[1];
    a_bigint.data[2] = 0;
    a_bigint.data[3] = 0;
}
}

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
    for (size_t j = 0;  j < leftovers; ++j)
    {
        fq::copy(small_table[j].x, points[rounded + j].x);
        fq::copy(small_table[j].y, points[rounded + j].y);
    }
}

libff::alt_bn128_G1 libff_scalar_mul(uint64_t* scalars, g1::affine_element* points, size_t num_points)
{
    libff::init_alt_bn128_params();
    std::vector<libff::alt_bn128_Fr> libff_scalars;
    std::vector<libff::alt_bn128_G1> libff_points;
    libff_scalars.resize(num_points);
    libff_points.resize(num_points);
    printf("pre-processing libff data\n");
    for (size_t i = 0; i < num_points; ++i)
    {
        libff::bigint<4> scalar_data;
        scalar_data.data[0] = scalars[i * 4];
        scalar_data.data[1] = scalars[i * 4 + 1];
        scalar_data.data[2] = scalars[i * 4 + 2];
        scalar_data.data[3] = scalars[i * 4 + 3];
        libff_scalars[i] = libff::alt_bn128_Fr(scalar_data);
        libff_points[i].X.mont_repr.data[0] = points[i].x.data[0];
        libff_points[i].X.mont_repr.data[1] = points[i].x.data[1];
        libff_points[i].X.mont_repr.data[2] = points[i].x.data[2];
        libff_points[i].X.mont_repr.data[3] = points[i].x.data[3];
        libff_points[i].Y.mont_repr.data[0] = points[i].y.data[0];
        libff_points[i].Y.mont_repr.data[1] = points[i].y.data[1];
        libff_points[i].Y.mont_repr.data[2] = points[i].y.data[2];
        libff_points[i].Y.mont_repr.data[3] = points[i].y.data[3];
        libff_points[i].Z = libff::alt_bn128_Fq::one();
    }
    printf("calling libff::multi_exp\n");
    libff::alt_bn128_G1 multiexp_result = libff::multi_exp<libff::alt_bn128_G1, libff::alt_bn128_Fr, libff::multi_exp_method_BDLO12>(
        libff_points.begin(),
        libff_points.end(),
        libff_scalars.begin(),
        libff_scalars.end(),
        1
    );
    return multiexp_result;
}


TEST(scalar_multiplication, endomorphism_split)
{
    libff::init_alt_bn128_params();
    fr::field_t scalar = fr::random_element();

    libff::bigint<4> scalar_bigint;
    to_bigint(&scalar.data[0], scalar_bigint);

    libff::alt_bn128_G1 expected = scalar_bigint * libff::alt_bn128_G1::one();
    expected.to_affine_coordinates();
    fr::field_t* k1 = &scalar;
    fr::field_t* k2 = (fr::field_t*)(&scalar.data[2]);

    fr::split_into_endomorphism_scalars(scalar, *k1, *k2);

    libff::bigint<4> k1_bigint;
    libff::bigint<4> k2_bigint;
    to_endo_bigint(&k1->data[0], k1_bigint);
    to_endo_bigint(&k2->data[0], k2_bigint);
    libff::alt_bn128_G1 a = libff::alt_bn128_G1::one();
    libff::alt_bn128_G1 b = libff::alt_bn128_G1::one();

    fq::mul_beta(*(fq::field_t*)&b.X.mont_repr.data[0], *(fq::field_t*)&b.X.mont_repr.data[0]);
    libff::alt_bn128_G1 result = (k1_bigint * a) - (k2_bigint * b);
    result.to_affine_coordinates();
    for (size_t i = 0; i < 4; ++i)
    {
        EXPECT_EQ(result.X.mont_repr.data[i], expected.X.mont_repr.data[i]);
        EXPECT_EQ(result.Y.mont_repr.data[i], expected.Y.mont_repr.data[i]);
    }
}

TEST(scalar_multiplication, pippenger)
{
    libff::init_alt_bn128_params();
    size_t num_points = 100000;

    fr::field_t* scalars = (fr::field_t*)aligned_alloc(32, sizeof(fr::field_t) * num_points);
    fr::field_t* scalars_copy = (fr::field_t*)aligned_alloc(32, sizeof(fr::field_t) * num_points);

    g1::affine_element* points = (g1::affine_element*)aligned_alloc(32, sizeof(g1::affine_element) * num_points * 2 + 1);

    printf("computing random point data\n");
    for (size_t i = 0; i < num_points; ++i)
    {
        scalars[i] = fr::random_element();
    }
    generate_points(points, num_points);

    printf("calling libff scalar mul\n");

    for (size_t i = 0; i < num_points; ++i)
    {
        fr::from_montgomery_form(scalars[i], scalars_copy[i]);
    }
    libff::alt_bn128_G1 expected = libff_scalar_mul((uint64_t*)(&scalars_copy[0].data[0]), points, num_points); // TODO PUT BACK IN
    expected.to_affine_coordinates();

    scalar_multiplication::generate_pippenger_point_table(points, points, num_points);
    printf("calling scalar multiplication algorithm\n");
    g1::element result = scalar_multiplication::pippenger(scalars, points, num_points);
    result = g1::normalize(result);

    free(scalars);
    free(points);

    for (size_t i = 0; i < 4; ++i)
    {
        EXPECT_EQ(result.x.data[i], expected.X.mont_repr.data[i]);
        EXPECT_EQ(result.y.data[i], expected.Y.mont_repr.data[i]);
        EXPECT_EQ(result.z.data[i], expected.Z.mont_repr.data[i]);
    }

}

TEST(scalar_multiplication, batched_scalar_multiplication)
{
    libff::init_alt_bn128_params();
    size_t num_points = 100000;
    size_t num_exponentiations = 5;

    fr::field_t* scalars = (fr::field_t*)aligned_alloc(32, sizeof(fr::field_t) * num_points * 2);

    g1::affine_element* points = (g1::affine_element*)aligned_alloc(32, sizeof(g1::affine_element) * num_points * 4 + 2);

    printf("computing random point data\n");

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
    scalar_multiplication::generate_pippenger_point_table(points + (num_points * 2), points + (num_points * 2), num_points);

    for (size_t i = 0; i < num_exponentiations; ++i)
    {
        inputs[i].output = scalar_multiplication::pippenger(inputs[i].scalars, inputs[i].points, inputs[i].num_elements);
        inputs[i].output = g1::normalize(inputs[i].output);
    }

    scalar_multiplication::batched_scalar_multiplications(&inputs[num_exponentiations], num_exponentiations);
    free(scalars);
    free(points);

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
