#include <gtest/gtest.h>

#include <gmp.h>
#include <libff/algebra/fields/fp.hpp>
#include <libff/algebra/curves/alt_bn128/alt_bn128_g1.hpp>
#include <libff/algebra/curves/alt_bn128/alt_bn128_init.hpp>

#include <barretenberg/fields/fr.hpp>
#include <barretenberg/groups/g1.hpp>

namespace
{
void to_bigint(fq::field_t& a, libff::bigint<4>& a_bigint)
{
    a_bigint.data[0] = a.data[0];
    a_bigint.data[1] = a.data[1];
    a_bigint.data[2] = a.data[2];
    a_bigint.data[3] = a.data[3];
}


libff::alt_bn128_G1 to_libff_g1(g1::element a)
{
    libff::alt_bn128_G1 target;
    to_bigint(a.x, target.X.mont_repr);
    to_bigint(a.y, target.Y.mont_repr);
    to_bigint(a.z, target.Z.mont_repr);
    return target;
}

libff::alt_bn128_Fr to_libff_fr(fr::field_t a)
{
    libff::alt_bn128_Fr target;
    target.mont_repr.data[0] = a.data[0];
    target.mont_repr.data[1] = a.data[1];
    target.mont_repr.data[2] = a.data[2];
    target.mont_repr.data[3] = a.data[3];
    return target;
}
}

TEST(group, mixed_add)
{
    libff::init_alt_bn128_params();
    g1::element lhs = g1::random_element();
    g1::affine_element rhs = g1::random_affine_element();
    
    g1::element result;

    libff::alt_bn128_G1 g1_lhs;
    libff::alt_bn128_G1 g1_rhs;
    to_bigint(lhs.x, g1_lhs.X.mont_repr);
    to_bigint(lhs.y, g1_lhs.Y.mont_repr);
    to_bigint(lhs.z, g1_lhs.Z.mont_repr);

    to_bigint(rhs.x, g1_rhs.X.mont_repr);
    to_bigint(rhs.y, g1_rhs.Y.mont_repr);
    g1_rhs.Z = libff::alt_bn128_Fq::one();

    libff::alt_bn128_G1 g1_result = g1_lhs.mixed_add(g1_rhs);

    g1::mixed_add(lhs, rhs, result);

    for (size_t j = 0; j < 4; ++j)
    {
        EXPECT_EQ(result.x.data[j], g1_result.X.mont_repr.data[j]);
        EXPECT_EQ(result.y.data[j], g1_result.Y.mont_repr.data[j]);
        EXPECT_EQ(result.z.data[j], g1_result.Z.mont_repr.data[j]);
    }
}


TEST(group, mixed_sub)
{
    libff::init_alt_bn128_params();
    g1::element lhs = g1::random_element();
    g1::affine_element rhs = g1::random_affine_element();
    g1::dbl(lhs, lhs);
    g1::element result;

    libff::alt_bn128_G1 g1_lhs;
    libff::alt_bn128_G1 g1_rhs;
    to_bigint(lhs.x, g1_lhs.X.mont_repr);
    to_bigint(lhs.y, g1_lhs.Y.mont_repr);
    to_bigint(lhs.z, g1_lhs.Z.mont_repr);

    to_bigint(rhs.x, g1_rhs.X.mont_repr);
    to_bigint(rhs.y, g1_rhs.Y.mont_repr);
    to_bigint(lhs.z, g1_rhs.Z.mont_repr);
   //  g1_rhs.Z = libff::alt_bn128_Fq::one();
    g1_rhs = -g1_rhs;
    libff::alt_bn128_G1 g1_result = g1_lhs.mixed_add(g1_rhs);

    g1::mixed_sub(lhs, rhs, result);
    for (size_t j = 0; j < 4; ++j)
    {
        EXPECT_EQ(result.x.data[j], g1_result.X.mont_repr.data[j]);
        EXPECT_EQ(result.y.data[j], g1_result.Y.mont_repr.data[j]);
        EXPECT_EQ(result.z.data[j], g1_result.Z.mont_repr.data[j]);
    }
}

TEST(group, dbl)
{
    libff::init_alt_bn128_params();
    g1::element lhs = g1::random_element();
    
    g1::element result;

    libff::alt_bn128_G1 g1_lhs;
    to_bigint(lhs.x, g1_lhs.X.mont_repr);
    to_bigint(lhs.y, g1_lhs.Y.mont_repr);
    to_bigint(lhs.z, g1_lhs.Z.mont_repr);

    libff::alt_bn128_G1 g1_result = g1_lhs.dbl();
    g1_result = g1_result.dbl();
    g1_result = g1_result.dbl();

    g1::dbl(lhs, result);
    g1::dbl(result, result);
    g1::dbl(result, result);

    for (size_t j = 0; j < 3; ++j)
    {
        EXPECT_EQ(result.x.data[j], g1_result.X.mont_repr.data[j]);
        EXPECT_EQ(result.y.data[j], g1_result.Y.mont_repr.data[j]);
        EXPECT_EQ(result.z.data[j], g1_result.Z.mont_repr.data[j]);
    }
}

TEST(group, add)
{
    libff::init_alt_bn128_params();
    g1::element lhs = g1::random_element();
    g1::element rhs = g1::random_element();
    
    g1::element result;

    libff::alt_bn128_G1 g1_lhs;
    libff::alt_bn128_G1 g1_rhs;
    to_bigint(lhs.x, g1_lhs.X.mont_repr);
    to_bigint(lhs.y, g1_lhs.Y.mont_repr);
    to_bigint(lhs.z, g1_lhs.Z.mont_repr);

    to_bigint(rhs.x, g1_rhs.X.mont_repr);
    to_bigint(rhs.y, g1_rhs.Y.mont_repr);
    to_bigint(rhs.z, g1_rhs.Z.mont_repr);

    libff::alt_bn128_G1 g1_result = g1_lhs.add(g1_rhs);

    g1::add(lhs, rhs, result);

    for (size_t j = 0; j < 3; ++j)
    {
        EXPECT_EQ(result.x.data[j], g1_result.X.mont_repr.data[j]);
        EXPECT_EQ(result.y.data[j], g1_result.Y.mont_repr.data[j]);
        EXPECT_EQ(result.z.data[j], g1_result.Z.mont_repr.data[j]);
    }
}


TEST(group, batch_inverse)
{
    size_t num_points = 1;
    g1::element points[num_points];
    g1::element normalized[num_points];
    for (size_t i = 0; i < num_points; ++i)
    {
        g1::element a = g1::random_element();
        g1::element b = g1::random_element();
        g1::add(a, b, points[i]);
        g1::copy(&points[i], &normalized[i]);
    }
    g1::batch_normalize(normalized, num_points);

    for (size_t i = 0; i < num_points; ++i)
    {
        fq::field_t zz;
        fq::field_t zzz;
        fq::field_t result_x;
        fq::field_t result_y;
        fq::sqr(points[i].z, zz);
        fq::mul(points[i].z, zz, zzz);
        fq::mul(normalized[i].x, zz, result_x);
        fq::mul(normalized[i].y, zzz, result_y);

        for (size_t j = 0; j < 4; ++j)
        {
            EXPECT_EQ(result_x.data[j], points[i].x.data[j]);
            EXPECT_EQ(result_y.data[j], points[i].y.data[j]);
        }
    }
}

TEST(group, random_element)
{
    g1::element result = g1::random_element();
    EXPECT_EQ(g1::on_curve(result), true);
}

TEST(group, random_affine_element)
{
    g1::affine_element result = g1::random_affine_element();
    EXPECT_EQ(g1::on_curve(result), true);
}

TEST(group, group_exponentiation)
{

    fq::field_t foo;
    foo.data[0] = 0x3C208C16D87CFD47UL;
    foo.data[1] = 0x97816a916871ca8dUL;
    foo.data[2] = 0xb85045b68181585dUL;
    foo.data[3] = 0x30644e72e131a029UL;
    fq::add_without_reduction(foo, foo, foo);

    libff::init_alt_bn128_params();

    fr::field_t scalar;
    fr::random_element(scalar);
    g1::affine_element input = g1::random_affine_element();
    g1::affine_element result = g1::group_exponentiation(input, scalar);

    g1::element copy;
    fq::copy(input.x, copy.x);
    fq::copy(input.y, copy.y);
    fq::one(copy.z);
    libff::alt_bn128_G1 libff_input = to_libff_g1(copy);
    libff::alt_bn128_Fr libff_scalar = to_libff_fr(scalar);

    libff::alt_bn128_G1 expected = libff_scalar * libff_input;
    expected.to_affine_coordinates();
    for (size_t j = 0; j < 4; ++j)
    {
        EXPECT_EQ(result.x.data[j], expected.X.mont_repr.data[j]);
        EXPECT_EQ(result.y.data[j], expected.Y.mont_repr.data[j]);
    }   
}