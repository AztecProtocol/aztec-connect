#include <gtest/gtest.h>

#include <barretenberg/curves/bn254/fq12.hpp>
#include <barretenberg/curves/bn254/fr.hpp>
#include <barretenberg/curves/bn254/g1.hpp>
#include <barretenberg/curves/bn254/g2.hpp>
#include <barretenberg/curves/bn254/pairing.hpp>

using namespace barretenberg;

TEST(pairing, reduced_ate_pairing_check_against_constants)
{
    g1::affine_element P = { .x = { { 0x956e256b9db00c13, 0x66d29ac18e1b2bff, 0x5d6f055e34402f6e, 0x5bfcbaaff0feb62 } },
                             .y = {
                                 { 0x564099dc0ef0a96, 0xa97eca7453f67dd2, 0x850e976b207e8c18, 0x20187f89a1d789cd } } };
    g2::affine_element Q = {
        .x = { .c0 = { { 0x3b25f1ad9a7f9cd2, 0xddb8b066d21ce86, 0xf8a4e318abd3cff7, 0x1272ee5f2e7e9dc1 } },
               .c1 = { { 0xc7b14ea54dc1436f, 0x1f9384eb12b6941a, 0x3afe17a00720e8e3, 0x2a171f424ab98d8 } } },
        .y = { .c0 = { { 0x890d5a50c1d88e96, 0x6ae79a7a2b439172, 0x4c120a629ced363c, 0x295bd556fe685dd } },
               .c1 = { { 0xa3189c7f120d4738, 0x4416da0df17c8ee, 0x4cc514acc1c2ac45, 0xb17d8f998e4ebe6 } } }
    };
    fq12::field_t expected = {
        .c0 = { .c0 = { .c0 = { { 0xd3b91c8dc40a9b8c, 0x5c8a39a470fcb4ea, 0x763e904e585a87e7, 0x2026f0077c50afa4 } },
                        .c1 = { { 0xddc69495371e5f38, 0x290bfc6512704e60, 0xc208c0f8e90bd52f, 0x2e82c92370a2f000 } } },
                .c1 = { .c0 = { { 0xdcbc2917451b8e12, 0x183016aa113a74eb, 0x9a2ff2a059f7d14d, 0x1166fc0ed488820c } },
                        .c1 = { { 0x3b2c1e19e47214ff, 0x374df83e0ac59c1a, 0x3e1c5ed4fd611cb2, 0x26179258a104da1a } } },
                .c2 = { .c0 = { { 0xc948bdff07912922, 0x3417ba2a42303918, 0x89336b54f20ff8a9, 0xb7eed88572fcac4 } },
                        .c1 = { { 0x85524385a79574ba,
                                  0xe7746ad78e659d8e,
                                  0x997e4848cc70eca5,
                                  0x2a9e3f37c50e6c9a } } } },
        .c1 = { .c0 = { .c0 = { { 0xc7eed1ca5aaa5a82, 0xea8d1f0be1ef0d7, 0xd7d539fd8136038a, 0x27196e24cd6d028e } },
                        .c1 = { { 0xcb7b6528984002e4, 0x1d3221c223e0587, 0xda44f3e957677f97, 0x1e3df34445cc3876 } } },
                .c1 = { .c0 = { { 0xf3e958491c2b4c43, 0x1dbafe473f7034b9, 0x129efae93ff9d8c9, 0xdedbf49d35171b9 } },
                        .c1 = { { 0x7da7c99cf811a603, 0xfcb99b8309663279, 0x1d80151ef8fcdb59, 0x1b09a01856170269 } } },
                .c2 = { .c0 = { { 0xa048b10941003960, 0x73d941c906a24cd0, 0x9c10f82a6bf78e2e, 0x13a41dbdd3d616d } },
                        .c1 = { { 0x31d7525fa8914a4c, 0xe1ed738718e2e8b8, 0x18305c749a9d97a2, 0x20534d878e1e9db0 } } } }
    };

    fq::__to_montgomery_form(P.x, P.x);
    fq::__to_montgomery_form(P.y, P.y);
    fq2::__to_montgomery_form(Q.x, Q.x);
    fq2::__to_montgomery_form(Q.y, Q.y);
    fq12::__to_montgomery_form(expected, expected);

    fq12::field_t result = pairing::reduced_ate_pairing(P, Q);

    EXPECT_EQ(fq12::eq(result, expected), true);
}

TEST(pairing, reduced_ate_pairing_consistency_check)
{
    g1::affine_element P = g1::random_affine_element();
    g2::affine_element Q = g2::random_affine_element();

    fr::field_t scalar = fr::random_element();

    g1::affine_element Pmul = g1::group_exponentiation(P, scalar);
    g2::affine_element Qmul = g2::group_exponentiation(Q, scalar);

    fq12::field_t result = pairing::reduced_ate_pairing(Pmul, Q);
    fq12::field_t expected = pairing::reduced_ate_pairing(P, Qmul);

    fq12::__from_montgomery_form(result, result);
    fq12::__from_montgomery_form(expected, expected);

    for (size_t j = 0; j < 4; ++j) {
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

TEST(pairing, reduced_ate_pairing_consistency_check_batch)
{
    size_t num_points = 10;

    g1::affine_element P_a[num_points];
    g2::affine_element Q_a[num_points];

    g1::affine_element P_b[num_points];
    g2::affine_element Q_b[num_points];

    fr::field_t scalars[num_points + num_points];
    for (size_t i = 0; i < 10; ++i) {
        scalars[i] = fr::random_element();
        scalars[i + num_points] = fr::random_element();
        g1::affine_element P = g1::random_affine_element();
        g2::affine_element Q = g2::random_affine_element();
        g1::copy_affine(P, P_a[i]);
        g2::copy_affine(Q, Q_a[i]);
        g1::copy_affine(P, P_b[i]);
        g2::copy_affine(Q, Q_b[i]);
    }

    for (size_t i = 0; i < 10; ++i) {
        P_a[i] = g1::group_exponentiation(P_a[i], scalars[i]);
        Q_b[i] = g2::group_exponentiation(Q_b[i], scalars[i]);
        P_b[i] = g1::group_exponentiation(P_b[i], scalars[i + num_points]);
        Q_a[i] = g2::group_exponentiation(Q_a[i], scalars[i + num_points]);
    }

    fq12::field_t result = pairing::reduced_ate_pairing_batch(&P_a[0], &Q_a[0], num_points);
    fq12::field_t expected = pairing::reduced_ate_pairing_batch(&P_b[0], &Q_b[0], num_points);

    fq12::__from_montgomery_form(result, result);
    fq12::__from_montgomery_form(expected, expected);

    for (size_t j = 0; j < 4; ++j) {
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

TEST(pairing, reduced_ate_pairing_precompute_consistency_check_batch)
{
    size_t num_points = 10;
    g1::affine_element P_a[num_points];
    g2::affine_element Q_a[num_points];
    g1::affine_element P_b[num_points];
    g2::affine_element Q_b[num_points];
    pairing::miller_lines precompute_miller_lines[num_points];
    fr::field_t scalars[num_points + num_points];
    for (size_t i = 0; i < 10; ++i) {
        scalars[i] = fr::random_element();
        scalars[i + num_points] = fr::random_element();
        g1::affine_element P = g1::random_affine_element();
        g2::affine_element Q = g2::random_affine_element();
        g1::copy_affine(P, P_a[i]);
        g2::copy_affine(Q, Q_a[i]);
        g1::copy_affine(P, P_b[i]);
        g2::copy_affine(Q, Q_b[i]);
    }
    for (size_t i = 0; i < 10; ++i) {
        P_a[i] = g1::group_exponentiation(P_a[i], scalars[i]);
        Q_b[i] = g2::group_exponentiation(Q_b[i], scalars[i]);
        P_b[i] = g1::group_exponentiation(P_b[i], scalars[i + num_points]);
        Q_a[i] = g2::group_exponentiation(Q_a[i], scalars[i + num_points]);
    }
    for (size_t i = 0; i < 10; ++i) {
        g2::element jac;
        g2::affine_to_jacobian(Q_a[i], jac);
        pairing::precompute_miller_lines(jac, precompute_miller_lines[i]);
    }
    fq12::field_t result =
        pairing::reduced_ate_pairing_batch_precomputed(&P_a[0], &precompute_miller_lines[0], num_points);
    fq12::field_t expected = pairing::reduced_ate_pairing_batch(&P_b[0], &Q_b[0], num_points);
    fq12::__from_montgomery_form(result, result);
    fq12::__from_montgomery_form(expected, expected);
    for (size_t j = 0; j < 4; ++j) {
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