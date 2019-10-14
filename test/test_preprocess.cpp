#include <gtest/gtest.h>

#include <barretenberg/waffle/preprocess.hpp>
#include <barretenberg/waffle/permutation.hpp>
#include <barretenberg/polynomials/polynomial.hpp>

#include <barretenberg/groups/g1.hpp>

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

    waffle::plonk_circuit_state state(n);
    state.sigma_1_mapping.resize(n);
    state.sigma_2_mapping.resize(n);
    state.sigma_3_mapping.resize(n);
    state.w_l.resize(n);
    state.w_r.resize(n);
    state.w_o.resize(n);
    state.q_m.resize(n);
    state.q_l.resize(n);
    state.q_r.resize(n);
    state.q_o.resize(n);
    state.q_c.resize(n);

    for (size_t i = 0; i < n; ++i)
    {
        state.w_l.at(i) = fr::random_element();
        state.w_r.at(i) = fr::random_element();
        state.w_o.at(i) = fr::random_element();
        state.q_m.at(i) = fr::random_element();
        state.q_l.at(i) = fr::random_element();
        state.q_r.at(i) = fr::random_element();
        state.q_o.at(i) = fr::random_element();
        state.q_c.at(i) = fr::random_element();
    }

    for (size_t i = 0; i < n; ++i)
    {
        state.sigma_1_mapping[i] =  (uint32_t)(i + ((0) << 30U));
        state.sigma_2_mapping[i] =  (uint32_t)(i + ((1U) << 30U));
        state.sigma_3_mapping[i] =  (uint32_t)(i + ((1U) << 31U));
    }


    g1::affine_element* monomials = (g1::affine_element*)(aligned_alloc(32, sizeof(g1::affine_element) * (6 * n + 2)));
    fr::field_t x = fr::random_element();
    compute_dummy_srs(n, x, monomials);

    g1::affine_element* cached = state.reference_string.monomials;
    state.reference_string.monomials = monomials;
    waffle::circuit_instance instance = waffle::construct_instance(state);


    waffle::compute_permutation_lagrange_base_single(state.sigma_1, state.sigma_1_mapping, state.small_domain);
    waffle::compute_permutation_lagrange_base_single(state.sigma_2, state.sigma_2_mapping, state.small_domain);
    waffle::compute_permutation_lagrange_base_single(state.sigma_3, state.sigma_3_mapping, state.small_domain);

    state.w_l.ifft(state.small_domain);
    state.w_r.ifft(state.small_domain);
    state.w_o.ifft(state.small_domain);
    state.q_m.ifft(state.small_domain);
    state.q_l.ifft(state.small_domain);
    state.q_r.ifft(state.small_domain);
    state.q_o.ifft(state.small_domain);
    state.q_c.ifft(state.small_domain);
    state.sigma_1.ifft(state.small_domain);
    state.sigma_2.ifft(state.small_domain);
    state.sigma_3.ifft(state.small_domain);

    // fr::__to_montgomery_form(x, x);
    fr::field_t sigma_1_eval = state.sigma_1.evaluate(x, n);
    fr::field_t sigma_2_eval = state.sigma_2.evaluate(x, n);
    fr::field_t sigma_3_eval = state.sigma_3.evaluate(x, n);
    fr::field_t q_m_eval = state.q_m.evaluate(x, n);
    fr::field_t q_l_eval = state.q_l.evaluate(x, n);
    fr::field_t q_r_eval = state.q_r.evaluate(x, n);
    fr::field_t q_o_eval = state.q_o.evaluate(x, n);
    fr::field_t q_c_eval = state.q_c.evaluate(x, n);

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

    state.reference_string.monomials = cached;
    free(monomials);
}