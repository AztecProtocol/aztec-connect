#include <gtest/gtest.h>

#include <gmp.h>
#include <libff/algebra/fields/fp.hpp>

#include <libff/algebra/curves/alt_bn128/alt_bn128_g1.hpp>
#include <libff/algebra/curves/alt_bn128/alt_bn128_g2.hpp>
#include <libff/algebra/curves/alt_bn128/alt_bn128_pairing.hpp>
#include <libff/algebra/curves/alt_bn128/alt_bn128_init.hpp>

#include <barretenberg/g2.hpp>
#include <barretenberg/fr.hpp>
#include <barretenberg/fq12.hpp>
#include <barretenberg/pairing.hpp>

namespace
{

void to_bigint(fq::field_t &a, libff::bigint<4> &a_bigint)
{
    a_bigint.data[0] = a.data[0];
    a_bigint.data[1] = a.data[1];
    a_bigint.data[2] = a.data[2];
    a_bigint.data[3] = a.data[3];
}

libff::alt_bn128_G1 to_libff_g1(g1::element& a)
{
    libff::alt_bn128_G1 target = libff::alt_bn128_G1::one();
    to_bigint(a.x, target.X.mont_repr);
    to_bigint(a.y, target.Y.mont_repr);
    to_bigint(a.z, target.Z.mont_repr);
    return target;
}

libff::alt_bn128_G2 to_libff_g2(g2::element& a)
{
    libff::alt_bn128_G2 target = libff::alt_bn128_G2::one();
    to_bigint(a.x.c0, target.X.c0.mont_repr);
    to_bigint(a.y.c0, target.Y.c0.mont_repr);
    to_bigint(a.z.c0, target.Z.c0.mont_repr);
    to_bigint(a.x.c1, target.X.c1.mont_repr);
    to_bigint(a.y.c1, target.Y.c1.mont_repr);
    to_bigint(a.z.c1, target.Z.c1.mont_repr);
    return target;
}
}

TEST(pairing, reduced_ate_pairing)
{
    libff::init_alt_bn128_params();
    g1::affine_element P = g1::random_affine_element();
    g2::affine_element Q = g2::random_affine_element();

    fr::field_t scalar;
    fr::random_element(scalar);

    P = g1::group_exponentiation(P, scalar);
    Q = g2::group_exponentiation(Q, scalar);

    g1::element Pcopy;
    g2::element Qcopy;

    g1::copy_from_affine(P, Pcopy);
    g2::copy_from_affine(Q, Qcopy);

    libff::alt_bn128_G2 libff_Q = to_libff_g2(Qcopy);
    libff::alt_bn128_G1 libff_P = to_libff_g1(Pcopy);

    fq12::fq12_t result = pairing::reduced_ate_pairing(P, Q);
    result = pairing::reduced_ate_pairing(P, Q);

    libff::alt_bn128_Fq12 expected = libff::alt_bn128_reduced_pairing(libff_P, libff_Q);

    for (size_t j = 0; j < 4; ++j)
    {
        EXPECT_EQ(result.c0.c0.c0.data[j], expected.c0.c0.c0.mont_repr.data[j]);
        EXPECT_EQ(result.c0.c0.c1.data[j], expected.c0.c0.c1.mont_repr.data[j]);
        EXPECT_EQ(result.c0.c1.c0.data[j], expected.c0.c1.c0.mont_repr.data[j]);
        EXPECT_EQ(result.c0.c1.c1.data[j], expected.c0.c1.c1.mont_repr.data[j]);
        EXPECT_EQ(result.c0.c2.c0.data[j], expected.c0.c2.c0.mont_repr.data[j]);
        EXPECT_EQ(result.c0.c2.c1.data[j], expected.c0.c2.c1.mont_repr.data[j]);
        EXPECT_EQ(result.c1.c0.c0.data[j], expected.c1.c0.c0.mont_repr.data[j]);
        EXPECT_EQ(result.c1.c0.c1.data[j], expected.c1.c0.c1.mont_repr.data[j]);
        EXPECT_EQ(result.c1.c1.c0.data[j], expected.c1.c1.c0.mont_repr.data[j]);
        EXPECT_EQ(result.c1.c1.c1.data[j], expected.c1.c1.c1.mont_repr.data[j]);
        EXPECT_EQ(result.c1.c2.c0.data[j], expected.c1.c2.c0.mont_repr.data[j]);
        EXPECT_EQ(result.c1.c2.c1.data[j], expected.c1.c2.c1.mont_repr.data[j]);   
    }
}

TEST(pairing, reduced_ate_pairing_mul_check)
{
    g1::affine_element P = g1::random_affine_element();
    g2::affine_element Q = g2::random_affine_element();

    fr::field_t scalar = { .data = { 0, 0, 0, 0 } };
    fr::random_element(scalar);

    g1::affine_element Pmul = g1::group_exponentiation(P, scalar);
    g2::affine_element Qmul = g2::group_exponentiation(Q, scalar);

    fq12::fq12_t result = pairing::reduced_ate_pairing(Pmul, Q);
    fq12::fq12_t expected = pairing::reduced_ate_pairing(P, Qmul);

    fq12::from_montgomery_form(result, result);
    fq12::from_montgomery_form(expected, expected);

    for (size_t j = 0; j < 4; ++j)
    {
        EXPECT_EQ(result.c0.c0.c0.data[j], expected.c0.c0.c0.data[j]);
        EXPECT_EQ(result.c0.c0.c1.data[j], expected.c0.c0.c1.data[j]);
        EXPECT_EQ(result.c0.c1.c0.data[j], expected.c0.c1.c0.data[j]);
        EXPECT_EQ(result.c0.c1.c1.data[j], expected.c0.c1.c1.data[j]);
        EXPECT_EQ(result.c0.c2.c0.data[j], expected.c0.c2.c0.data[j]);
        EXPECT_EQ(result.c0.c2.c1.data[j], expected.c0.c2.c1.data[j]);
        EXPECT_EQ(result.c1.c0.c0.data[j], expected.c1.c0.c0.data[j]);
        EXPECT_EQ(result.c1.c0.c1.data[j], expected.c1.c0.c1.data[j]);
        EXPECT_EQ(result.c1.c1.c0.data[j], expected.c1.c1.c0.data[j]);
        EXPECT_EQ(result.c1.c1.c1.data[j], expected.c1.c1.c1.data[j]);
        EXPECT_EQ(result.c1.c2.c0.data[j], expected.c1.c2.c0.data[j]);
        EXPECT_EQ(result.c1.c2.c1.data[j], expected.c1.c2.c1.data[j]);   
    }
}


TEST(pairing, reduced_ate_pairing_mul_check_batch)
{
    size_t num_points = 10;

    g1::affine_element P_a[num_points];
    g2::affine_element Q_a[num_points];

    g1::affine_element P_b[num_points];
    g2::affine_element Q_b[num_points];

    fr::field_t scalars[num_points + num_points];
    for (size_t i = 0; i < 10; ++i)
    {
        fr::random_element(scalars[i]);
        fr::random_element(scalars[i + num_points]);
        g1::affine_element P = g1::random_affine_element();
        g2::affine_element Q = g2::random_affine_element();
        g1::copy_affine(P, P_a[i]);
        g2::copy_affine(Q, Q_a[i]);
        g1::copy_affine(P, P_b[i]);
        g2::copy_affine(Q, Q_b[i]);
    }

    for (size_t i = 0; i < 10; ++i)
    {
        P_a[i] = g1::group_exponentiation(P_a[i], scalars[i]);
        Q_b[i] = g2::group_exponentiation(Q_b[i], scalars[i]);
        P_b[i] = g1::group_exponentiation(P_b[i], scalars[i + num_points]);
        Q_a[i] = g2::group_exponentiation(Q_a[i], scalars[i + num_points]);

    }

    fq12::fq12_t result = pairing::reduced_ate_pairing_batch(&P_a[0], &Q_a[0], num_points);
    fq12::fq12_t expected = pairing::reduced_ate_pairing_batch(&P_b[0], &Q_b[0], num_points);

    fq12::from_montgomery_form(result, result);
    fq12::from_montgomery_form(expected, expected);

    for (size_t j = 0; j < 4; ++j)
    {
        EXPECT_EQ(result.c0.c0.c0.data[j], expected.c0.c0.c0.data[j]);
        EXPECT_EQ(result.c0.c0.c1.data[j], expected.c0.c0.c1.data[j]);
        EXPECT_EQ(result.c0.c1.c0.data[j], expected.c0.c1.c0.data[j]);
        EXPECT_EQ(result.c0.c1.c1.data[j], expected.c0.c1.c1.data[j]);
        EXPECT_EQ(result.c0.c2.c0.data[j], expected.c0.c2.c0.data[j]);
        EXPECT_EQ(result.c0.c2.c1.data[j], expected.c0.c2.c1.data[j]);
        EXPECT_EQ(result.c1.c0.c0.data[j], expected.c1.c0.c0.data[j]);
        EXPECT_EQ(result.c1.c0.c1.data[j], expected.c1.c0.c1.data[j]);
        EXPECT_EQ(result.c1.c1.c0.data[j], expected.c1.c1.c0.data[j]);
        EXPECT_EQ(result.c1.c1.c1.data[j], expected.c1.c1.c1.data[j]);
        EXPECT_EQ(result.c1.c2.c0.data[j], expected.c1.c2.c0.data[j]);
        EXPECT_EQ(result.c1.c2.c1.data[j], expected.c1.c2.c1.data[j]);   
    }
}