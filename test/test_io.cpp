#include <gtest/gtest.h>

#include <barretenberg/groups/g1.hpp>
#include <barretenberg/groups/g2.hpp>
#include <barretenberg/io/io.hpp>
#include <barretenberg/groups/pairing.hpp>
#include <barretenberg/types.hpp>

using namespace barretenberg;

TEST(io, will_load_file)
{
    srs::plonk_srs srs;
    srs.degree = 100000;
    srs.monomials = (g1::affine_element*)(aligned_alloc(32, sizeof(g1::affine_element) * (srs.degree + 2)));

    io::read_transcript(srs, "../srs_db/transcript.dat");

    g1::affine_element P[2];
    g2::affine_element Q[2];
    g1::copy_affine(srs.monomials[1], P[0]);
    g1::copy_affine(g1::affine_one(), P[1]);
    fq::neg(P[0].y, P[0].y);
    g2::copy_affine(g2::affine_one(), Q[0]);
    g2::copy_affine(srs.SRS_T2, Q[1]);
    fq12::fq12_t res = pairing::reduced_ate_pairing_batch(P, Q, 2);

    EXPECT_EQ(fq12::eq(res, fq12::one()), true);
    for (size_t i = 0; i < srs.degree; ++i)
    {
        EXPECT_EQ(g1::on_curve(srs.monomials[i]), true);
    }
    free(srs.monomials);
}