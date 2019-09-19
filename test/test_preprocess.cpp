#include <gtest/gtest.h>

#include <barretenberg/waffle/preprocess.hpp>

namespace
{
srs::plonk_srs compute_dummy_srs(const size_t n, const fr::field_t& x, g1::affine_element* monomials)
{
    srs::plonk_srs srs;
    monomials[0] = g1::affine_one();

    for (size_t i = 1; i < n; ++i)
    {
        monomials[i] = g1::group_exponentiation(monomials[i-1], x);
    }
    scalar_multiplication::generate_pippenger_point_table(monomials, monomials, n);
    srs.monomials = monomials;
    srs.degree = n;
    return srs;
}
} // namespace

TEST(preprocess, preprocess)
{
    size_t n = 256;

    fr::field_t* scratch_space = (fr::field_t*)(aligned_alloc(32, sizeof(fr::field_t) * 10 * n));
    
    fr::field_t* polys[9] = {
        &scratch_space[0],
        &scratch_space[n],
        &scratch_space[2*n],
        &scratch_space[3*n],
        &scratch_space[4*n],
        &scratch_space[5*n],
        &scratch_space[6*n],
        &scratch_space[7*n],
        &scratch_space[8*n]
    };

    for (size_t i = 0; i < 9; ++i)
    {
        for (size_t j = 0; j < n; ++j)
        {
            polys[i][j] = fr::random_element();
        }
    }

    waffle::circuit_state state;
    state.small_domain = polynomials::get_domain(n);
    state.n = n;
    state.sigma_1 = polys[1];
    state.sigma_2 = polys[0];
    state.sigma_3 = polys[2];
    state.s_id = polys[3];
    state.q_m = polys[4];
    state.q_l = polys[5];
    state.q_r = polys[6];
    state.q_o = polys[7];
    state.q_c = polys[8];

    g1::affine_element* monomials = (g1::affine_element*)(aligned_alloc(32, sizeof(g1::affine_element) * (6 * n + 2)));
    fr::field_t x = fr::random_element();
    srs::plonk_srs srs = compute_dummy_srs(3 * n, x, monomials);

    waffle::circuit_instance instance = waffle::preprocess_circuit(state, srs);

    for (size_t i = 0; i < 9; ++i)
    {
        polynomials::ifft(polys[i], state.small_domain);
    }
    // fr::to_montgomery_form(x, x);
    fr::field_t sigma_1_eval = polynomials::evaluate(state.sigma_1, x, n);
    fr::field_t sigma_2_eval = polynomials::evaluate(state.sigma_2, x, n);
    fr::field_t sigma_3_eval = polynomials::evaluate(state.sigma_3, x, n);
    fr::field_t s_id_eval = polynomials::evaluate(state.s_id, x, n);
    fr::field_t q_m_eval = polynomials::evaluate(state.q_m, x, n);
    fr::field_t q_l_eval = polynomials::evaluate(state.q_l, x, n);
    fr::field_t q_r_eval = polynomials::evaluate(state.q_r, x, n);
    fr::field_t q_o_eval = polynomials::evaluate(state.q_o, x, n);
    fr::field_t q_c_eval = polynomials::evaluate(state.q_c, x, n);

    g1::affine_element sigma_1_expected = g1::group_exponentiation(g1::affine_one(), sigma_1_eval);
    g1::affine_element sigma_2_expected = g1::group_exponentiation(g1::affine_one(), sigma_2_eval);
    g1::affine_element sigma_3_expected = g1::group_exponentiation(g1::affine_one(), sigma_3_eval);
    g1::affine_element s_id_expected = g1::group_exponentiation(g1::affine_one(), s_id_eval);
    g1::affine_element q_m_expected = g1::group_exponentiation(g1::affine_one(), q_m_eval);
    g1::affine_element q_l_expected = g1::group_exponentiation(g1::affine_one(), q_l_eval);
    g1::affine_element q_r_expected = g1::group_exponentiation(g1::affine_one(), q_r_eval);
    g1::affine_element q_o_expected = g1::group_exponentiation(g1::affine_one(), q_o_eval);
    g1::affine_element q_c_expected = g1::group_exponentiation(g1::affine_one(), q_c_eval);

    EXPECT_EQ(g1::eq(instance.SIGMA_1, sigma_1_expected), true);
    EXPECT_EQ(g1::eq(instance.SIGMA_2, sigma_2_expected), true);
    EXPECT_EQ(g1::eq(instance.SIGMA_3, sigma_3_expected), true);
    EXPECT_EQ(g1::eq(instance.S_ID, s_id_expected), true);
    EXPECT_EQ(g1::eq(instance.Q_M, q_m_expected), true);
    EXPECT_EQ(g1::eq(instance.Q_L, q_l_expected), true);
    EXPECT_EQ(g1::eq(instance.Q_R, q_r_expected), true);
    EXPECT_EQ(g1::eq(instance.Q_O, q_o_expected), true);
    EXPECT_EQ(g1::eq(instance.Q_C, q_c_expected), true);
    EXPECT_EQ(instance.n, n);
}