#include <gtest/gtest.h>

#include <gmp.h>
#include <libff/algebra/fields/fp.hpp>
#include <libff/algebra/curves/alt_bn128/alt_bn128_g1.hpp>
#include <libff/algebra/curves/alt_bn128/alt_bn128_init.hpp>

#include <barretenberg/g1.hpp>

namespace
{
void to_bigint(uint64_t *a, libff::bigint<4>& a_bigint)
{
    a_bigint.data[0] = a[0];
    a_bigint.data[1] = a[1];
    a_bigint.data[2] = a[2];
    a_bigint.data[3] = a[3];
}

// libff::alt_bn128_G1 mixed_add(libff::alt_bn128_G1& lhs, libff::alt_bn128_G1 &other)
// {
// #ifdef DEBUG
//     assert(other.is_special());
// #endif
//     // handle special cases having to do with O

//     // no need to handle points of order 2,4
//     // (they cannot exist in a prime-order subgroup)

//     // check for doubling case

//     // using Jacobian coordinates so:
//     // (X1:Y1:Z1) = (X2:Y2:Z2)
//     // iff
//     // X1/Z1^2 == X2/Z2^2 and Y1/Z1^3 == Y2/Z2^3
//     // iff
//     // X1 * Z2^2 == X2 * Z1^2 and Y1 * Z2^3 == Y2 * Z1^3

//     // we know that Z2 = 1

//     const libff::alt_bn128_Fq Z1Z1 = (lhs.Z).squared();

//     const libff::alt_bn128_Fq &U1 = lhs.X;
//     const libff::alt_bn128_Fq U2 = other.X * Z1Z1;

//     const libff::alt_bn128_Fq Z1_cubed = (lhs.Z) * Z1Z1;

//     const libff::alt_bn128_Fq &S1 = (lhs.Y);                // S1 = Y1 * Z2 * Z2Z2
//     const libff::alt_bn128_Fq S2 = (other.Y) * Z1_cubed;      // S2 = Y2 * Z1 * Z1Z1

//     if (U1 == U2 && S1 == S2)
//     {
//         // dbl case; nothing of above can be reused
//         printf("ERROR! SHOULD NOT DOUBLE\n");
//         // return this->dbl();
//     }

//     // NOTE: does not handle O and pts of order 2,4
//     // http://www.hyperelliptic.org/EFD/g1p/auto-shortw-jacobian-0.html#addition-madd-2007-bl
//     libff::alt_bn128_Fq H = U2-(lhs.X);                         // H = U2-X1
//     libff::alt_bn128_Fq HH = H.squared() ;                        // HH = H&2
//     libff::alt_bn128_Fq I = HH+HH;                                // I = 4*HH
//     I = I + I;
//     libff::alt_bn128_Fq J = H*I;                                  // J = H*I
//     libff::alt_bn128_Fq r = S2-(lhs.Y);                         // r = 2*(S2-Y1)
//     r = r + r;
//     libff::alt_bn128_Fq V = (lhs.X) * I ;                       // V = X1*I
//     libff::alt_bn128_Fq X3 = r.squared()-J-V-V;                   // X3 = r^2-J-2*V
//     libff::alt_bn128_Fq Y3 = (lhs.Y)*J;                         // Y3 = r*(V-X3)-2*Y1*J
//     Y3 = r*(V-X3) - Y3 - Y3;
//     libff::alt_bn128_Fq Z3 = ((lhs.Z)+H).squared() - Z1Z1 - HH; // Z3 = (Z1+H)^2-Z1Z1-HH

//     return libff::alt_bn128_G1(X3, Y3, Z3);
// }
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

    for (size_t j = 0; j < 3; ++j)
    {
        EXPECT_EQ(result.x[j], g1_result.X.mont_repr.data[j]);
        EXPECT_EQ(result.y[j], g1_result.Y.mont_repr.data[j]);
        EXPECT_EQ(result.z[j], g1_result.Z.mont_repr.data[j]);
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
    for (size_t j = 0; j < 3; ++j)
    {
        EXPECT_EQ(result.x[j], g1_result.X.mont_repr.data[j]);
        EXPECT_EQ(result.y[j], g1_result.Y.mont_repr.data[j]);
        EXPECT_EQ(result.z[j], g1_result.Z.mont_repr.data[j]);
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
        EXPECT_EQ(result.x[j], g1_result.X.mont_repr.data[j]);
        EXPECT_EQ(result.y[j], g1_result.Y.mont_repr.data[j]);
        EXPECT_EQ(result.z[j], g1_result.Z.mont_repr.data[j]);
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
        EXPECT_EQ(result.x[j], g1_result.X.mont_repr.data[j]);
        EXPECT_EQ(result.y[j], g1_result.Y.mont_repr.data[j]);
        EXPECT_EQ(result.z[j], g1_result.Z.mont_repr.data[j]);
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
            EXPECT_EQ(result_x[j], points[i].x[j]);
            EXPECT_EQ(result_y[j], points[i].y[j]);
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