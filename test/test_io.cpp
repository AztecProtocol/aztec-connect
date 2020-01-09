#include <gtest/gtest.h>

#include <barretenberg/curves/bn254/fq12.hpp>
#include <barretenberg/curves/bn254/g1.hpp>
#include <barretenberg/curves/bn254/g2.hpp>
#include <barretenberg/curves/bn254/pairing.hpp>
#include <barretenberg/io/io.hpp>
#include <barretenberg/types.hpp>

using namespace barretenberg;

TEST(io, read_transcript_loads_well_formed_srs)
{
    size_t degree = 100000;
    g1::affine_element* monomials = (g1::affine_element*)(aligned_alloc(32, sizeof(g1::affine_element) * (degree + 2)));
    g2::affine_element g2_x;
    io::read_transcript(monomials, g2_x, degree, BARRETENBERG_SRS_PATH);

    g1::affine_element P[2];
    g2::affine_element Q[2];
    g1::copy_affine(monomials[1], P[0]);
    g1::copy_affine(g1::affine_one, P[1]);
    fq::__neg(P[0].y, P[0].y);
    g2::copy_affine(g2::affine_one, Q[0]);
    g2::copy_affine(g2_x, Q[1]);
    fq12::field_t res = pairing::reduced_ate_pairing_batch(P, Q, 2);

    EXPECT_EQ(fq12::eq(res, fq12::one), true);
    for (size_t i = 0; i < degree; ++i) {
        EXPECT_EQ(g1::on_curve(monomials[i]), true);
    }
    aligned_free(monomials);
}