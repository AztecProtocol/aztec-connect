#include <gtest/gtest.h>

#include <gmp.h>
#include <libff/algebra/fields/fp.hpp>

#include <libff/algebra/curves/alt_bn128/alt_bn128_g2.hpp>
#include <libff/algebra/curves/alt_bn128/alt_bn128_init.hpp>

#include <barretenberg/g2.hpp>
#include <barretenberg/fr.hpp>
namespace
{

void to_bigint(fq::field_t &a, libff::bigint<4> &a_bigint)
{
    a_bigint.data[0] = a.data[0];
    a_bigint.data[1] = a.data[1];
    a_bigint.data[2] = a.data[2];
    a_bigint.data[3] = a.data[3];
}

libff::alt_bn128_G2 to_libff_g2(g2::element a)
{
    libff::alt_bn128_G2 target;
    to_bigint(a.x.c0, target.X.c0.mont_repr);
    to_bigint(a.y.c0, target.Y.c0.mont_repr);
    to_bigint(a.z.c0, target.Z.c0.mont_repr);
    to_bigint(a.x.c1, target.X.c1.mont_repr);
    to_bigint(a.y.c1, target.Y.c1.mont_repr);
    to_bigint(a.z.c1, target.Z.c1.mont_repr);
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
} // namespace

TEST(g2, dbl)
{
    libff::init_alt_bn128_params();
    g2::element lhs = g2::one();

    libff::alt_bn128_G2 g2_lhs = to_libff_g2(lhs);

    libff::alt_bn128_G2 g2_result = g2_lhs.dbl();

    g2::element result;
    g2::dbl(lhs, result);

    for (size_t j = 0; j < 4; ++j)
    {
        EXPECT_EQ(result.x.c0.data[j], g2_result.X.c0.mont_repr.data[j]);
        EXPECT_EQ(result.y.c0.data[j], g2_result.Y.c0.mont_repr.data[j]);
        EXPECT_EQ(result.z.c0.data[j], g2_result.Z.c0.mont_repr.data[j]);
        EXPECT_EQ(result.x.c1.data[j], g2_result.X.c1.mont_repr.data[j]);
        EXPECT_EQ(result.y.c1.data[j], g2_result.Y.c1.mont_repr.data[j]);
        EXPECT_EQ(result.z.c1.data[j], g2_result.Z.c1.mont_repr.data[j]);
    }
}

TEST(g2, mixed_add)
{
    libff::init_alt_bn128_params();
    g2::element lhs = g2::one();
    g2::dbl(lhs, lhs);
    g2::dbl(lhs, lhs);
    g2::element rhs = g2::one();
    g2::affine_element affine_rhs = g2::affine_one();

    g2::element result;

    libff::alt_bn128_G2 g2_lhs = to_libff_g2(lhs);
    libff::alt_bn128_G2 g2_rhs = to_libff_g2(rhs);

    libff::alt_bn128_G2 g2_result = g2_lhs.mixed_add(g2_rhs);

    g2::mixed_add(lhs, affine_rhs, result);

    for (size_t j = 0; j < 4; ++j)
    {
        EXPECT_EQ(result.x.c0.data[j], g2_result.X.c0.mont_repr.data[j]);
        EXPECT_EQ(result.y.c0.data[j], g2_result.Y.c0.mont_repr.data[j]);
        EXPECT_EQ(result.z.c0.data[j], g2_result.Z.c0.mont_repr.data[j]);
        EXPECT_EQ(result.x.c1.data[j], g2_result.X.c1.mont_repr.data[j]);
        EXPECT_EQ(result.y.c1.data[j], g2_result.Y.c1.mont_repr.data[j]);
        EXPECT_EQ(result.z.c1.data[j], g2_result.Z.c1.mont_repr.data[j]);
    }
}

TEST(g2, mixed_sub)
{
    libff::init_alt_bn128_params();
    g2::element lhs = g2::one();
    g2::dbl(lhs, lhs);
    g2::dbl(lhs, lhs);
    g2::element rhs = g2::one();
    g2::affine_element affine_rhs = g2::affine_one();

    g2::element result;

    libff::alt_bn128_G2 g2_lhs = to_libff_g2(lhs);
    libff::alt_bn128_G2 g2_rhs = to_libff_g2(rhs);
    g2_rhs = -g2_rhs;
    libff::alt_bn128_G2 g2_result = g2_lhs.mixed_add(g2_rhs);

    g2::mixed_sub(lhs, affine_rhs, result);

    for (size_t j = 0; j < 4; ++j)
    {
        EXPECT_EQ(result.x.c0.data[j], g2_result.X.c0.mont_repr.data[j]);
        EXPECT_EQ(result.y.c0.data[j], g2_result.Y.c0.mont_repr.data[j]);
        EXPECT_EQ(result.z.c0.data[j], g2_result.Z.c0.mont_repr.data[j]);
        EXPECT_EQ(result.x.c1.data[j], g2_result.X.c1.mont_repr.data[j]);
        EXPECT_EQ(result.y.c1.data[j], g2_result.Y.c1.mont_repr.data[j]);
        EXPECT_EQ(result.z.c1.data[j], g2_result.Z.c1.mont_repr.data[j]);
    }
}

TEST(g2, add)
{
    libff::init_alt_bn128_params();

    g2::element lhs = g2::one();
    g2::dbl(lhs, lhs);
    g2::dbl(lhs, lhs);
    g2::element rhs = g2::one();

    g2::element result;

    libff::alt_bn128_G2 g2_lhs = to_libff_g2(lhs);
    libff::alt_bn128_G2 g2_rhs = to_libff_g2(rhs);

    libff::alt_bn128_G2 g2_result = g2_lhs + g2_rhs;

    g2::add(lhs, rhs, result);

    for (size_t j = 0; j < 4; ++j)
    {
        EXPECT_EQ(result.x.c0.data[j], g2_result.X.c0.mont_repr.data[j]);
        EXPECT_EQ(result.y.c0.data[j], g2_result.Y.c0.mont_repr.data[j]);
        EXPECT_EQ(result.z.c0.data[j], g2_result.Z.c0.mont_repr.data[j]);
        EXPECT_EQ(result.x.c1.data[j], g2_result.X.c1.mont_repr.data[j]);
        EXPECT_EQ(result.y.c1.data[j], g2_result.Y.c1.mont_repr.data[j]);
        EXPECT_EQ(result.z.c1.data[j], g2_result.Z.c1.mont_repr.data[j]);
    }
}

TEST(g2, to_affine)
{
     libff::init_alt_bn128_params();

    g2::element lhs = g2::one();
    g2::dbl(lhs, lhs);
    g2::dbl(lhs, lhs);
    g2::element rhs = g2::one();

    g2::element result;

    libff::alt_bn128_G2 g2_lhs = to_libff_g2(lhs);
    libff::alt_bn128_G2 g2_rhs = to_libff_g2(rhs);

    libff::alt_bn128_G2 g2_result = g2_lhs + g2_rhs;

    g2::add(lhs, rhs, result);
    g2::affine_element result_affine = convert_to_affine(result);
    g2_result.to_affine_coordinates();
    for (size_t j = 0; j < 4; ++j)
    {
        EXPECT_EQ(result_affine.x.c0.data[j], g2_result.X.c0.mont_repr.data[j]);
        EXPECT_EQ(result_affine.y.c0.data[j], g2_result.Y.c0.mont_repr.data[j]);
        EXPECT_EQ(result_affine.x.c1.data[j], g2_result.X.c1.mont_repr.data[j]);
        EXPECT_EQ(result_affine.y.c1.data[j], g2_result.Y.c1.mont_repr.data[j]);
    }   
}

TEST(g2, group_exponentiation)
{
    libff::init_alt_bn128_params();

    fr::field_t scalar;
    fr::random_element(scalar);
    g2::affine_element input = g2::affine_one();
    g2::affine_element result = g2::group_exponentiation(input, scalar);

    libff::alt_bn128_G2 libff_input = to_libff_g2(g2::one());
    libff::alt_bn128_Fr libff_scalar = to_libff_fr(scalar);

    libff::alt_bn128_G2 expected = libff_scalar * libff_input;
    expected.to_affine_coordinates();
    for (size_t j = 0; j < 4; ++j)
    {
        EXPECT_EQ(result.x.c0.data[j], expected.X.c0.mont_repr.data[j]);
        EXPECT_EQ(result.y.c0.data[j], expected.Y.c0.mont_repr.data[j]);
        EXPECT_EQ(result.x.c1.data[j], expected.X.c1.mont_repr.data[j]);
        EXPECT_EQ(result.y.c1.data[j], expected.Y.c1.mont_repr.data[j]);
    }   
}