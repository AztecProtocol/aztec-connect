#include <gtest/gtest.h>

#include <barretenberg/waffle/preprocess.hpp>
#include <barretenberg/waffle/permutation.hpp>

using namespace barretenberg;

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

    uint32_t* sigma_memory = (uint32_t*)(aligned_alloc(32, sizeof(uint32_t) * 3 * n));

    uint32_t* sigma_mappings[3] = { 
        &sigma_memory[0],
        &sigma_memory[n],
        &sigma_memory[n + n]
    };

    for (size_t i = 0; i < 6; ++i)
    {
        for (size_t j = 0; j < n; ++j)
        {
            polys[i][j] = fr::random_element();
        }
    }

    for (size_t i = 0; i < 3; ++i)
    {
        for (size_t j = 0; j < n; ++j)
        {
            sigma_mappings[i][j] = (uint32_t)(j + ((i / 3) << 30U));
        }
    }

    waffle::circuit_state state;
    state.small_domain = polynomials::get_domain(n);
    state.n = n;
    state.sigma_1 = polys[6];
    state.sigma_2 = polys[7];
    state.sigma_3 = polys[8];
    state.s_id = polys[0];
    state.q_m = polys[1];
    state.q_l = polys[2];
    state.q_r = polys[3];
    state.q_o = polys[4];
    state.q_c = polys[5];
    state.sigma_1_mapping = sigma_mappings[0];
    state.sigma_2_mapping = sigma_mappings[1];
    state.sigma_3_mapping = sigma_mappings[2];

    g1::affine_element* monomials = (g1::affine_element*)(aligned_alloc(32, sizeof(g1::affine_element) * (6 * n + 2)));
    fr::field_t x = fr::random_element();
    srs::plonk_srs srs = compute_dummy_srs(3 * n, x, monomials);

    waffle::circuit_instance instance = waffle::preprocess_circuit(state, srs);
    fr::field_t* roots = (fr::field_t*)aligned_alloc(32, sizeof(fr::field_t) * state.small_domain.size);
    fr::copy(fr::one(), roots[0]);
    for (size_t i = 1; i < state.small_domain.size; ++i)
    {
        fr::mul(roots[i-1], state.small_domain.root, roots[i]);
    }

    waffle::compute_permutation_lagrange_base(roots, state.sigma_1, sigma_mappings[0], state.n);
    waffle::compute_permutation_lagrange_base(roots, state.sigma_2, sigma_mappings[1], state.n);
    waffle::compute_permutation_lagrange_base(roots, state.sigma_3, sigma_mappings[2], state.n);

    free(roots);
    for (size_t i = 0; i < 9; ++i)
    {
        polynomials::ifft(polys[i], state.small_domain);
    }

    // fr::to_montgomery_form(x, x);
    fr::field_t sigma_1_eval = polynomials::evaluate(state.sigma_1, x, n);
    fr::field_t sigma_2_eval = polynomials::evaluate(state.sigma_2, x, n);
    fr::field_t sigma_3_eval = polynomials::evaluate(state.sigma_3, x, n);
    fr::field_t q_m_eval = polynomials::evaluate(state.q_m, x, n);
    fr::field_t q_l_eval = polynomials::evaluate(state.q_l, x, n);
    fr::field_t q_r_eval = polynomials::evaluate(state.q_r, x, n);
    fr::field_t q_o_eval = polynomials::evaluate(state.q_o, x, n);
    fr::field_t q_c_eval = polynomials::evaluate(state.q_c, x, n);

    g1::affine_element sigma_1_expected = g1::group_exponentiation(g1::affine_one(), sigma_1_eval);
    g1::affine_element sigma_2_expected = g1::group_exponentiation(g1::affine_one(), sigma_2_eval);
    g1::affine_element sigma_3_expected = g1::group_exponentiation(g1::affine_one(), sigma_3_eval);
    g1::affine_element q_m_expected = g1::group_exponentiation(g1::affine_one(), q_m_eval);
    g1::affine_element q_l_expected = g1::group_exponentiation(g1::affine_one(), q_l_eval);
    g1::affine_element q_r_expected = g1::group_exponentiation(g1::affine_one(), q_r_eval);
    g1::affine_element q_o_expected = g1::group_exponentiation(g1::affine_one(), q_o_eval);
    g1::affine_element q_c_expected = g1::group_exponentiation(g1::affine_one(), q_c_eval);

    EXPECT_EQ(g1::eq(instance.SIGMA_1, sigma_1_expected), true);
    EXPECT_EQ(g1::eq(instance.SIGMA_2, sigma_2_expected), true);
    EXPECT_EQ(g1::eq(instance.SIGMA_3, sigma_3_expected), true);
    EXPECT_EQ(g1::eq(instance.Q_M, q_m_expected), true);
    EXPECT_EQ(g1::eq(instance.Q_L, q_l_expected), true);
    EXPECT_EQ(g1::eq(instance.Q_R, q_r_expected), true);
    EXPECT_EQ(g1::eq(instance.Q_O, q_o_expected), true);
    EXPECT_EQ(g1::eq(instance.Q_C, q_c_expected), true);
    EXPECT_EQ(instance.n, n);
}