#include <gtest/gtest.h>

#include <barretenberg/curves/bn254/g1.hpp>
#include <barretenberg/polynomials/polynomial.hpp>
#include <barretenberg/waffle/proof_system/permutation.hpp>
#include <barretenberg/waffle/proof_system/preprocess.hpp>
#include <barretenberg/waffle/proof_system/verifier/verifier.hpp>
#include <barretenberg/waffle/proof_system/widgets/arithmetic_widget.hpp>

#include <barretenberg/waffle/reference_string/reference_string.hpp>

using namespace barretenberg;

namespace
{
class DummyReferenceString : public waffle::ReferenceString
{
  public:
    DummyReferenceString(size_t n) : waffle::ReferenceString(n)
    {
    }

    void compute_dummy_srs(const fr::field_t& x)
    {
        ASSERT(monomials != nullptr);

        monomials[0] = g1::affine_one();

        for (size_t i = 1; i < degree; ++i)
        {
            monomials[i] = g1::group_exponentiation(monomials[i - 1], x);
        }
        scalar_multiplication::generate_pippenger_point_table(monomials, monomials, degree);
    }
};
} // namespace

TEST(preprocess, preprocess)
{
    size_t n = 256;

    waffle::Prover state(n);
    std::unique_ptr<waffle::ProverArithmeticWidget> widget = std::make_unique<waffle::ProverArithmeticWidget>(n);
    state.sigma_1_mapping.resize(n);
    state.sigma_2_mapping.resize(n);
    state.sigma_3_mapping.resize(n);
    state.w_l.resize(n);
    state.w_r.resize(n);
    state.w_o.resize(n);

    barretenberg::polynomial* q_m = &widget->q_m;
    barretenberg::polynomial* q_l = &widget->q_l;
    barretenberg::polynomial* q_r = &widget->q_r;
    barretenberg::polynomial* q_o = &widget->q_o;
    barretenberg::polynomial* q_c = &widget->q_c;

    for (size_t i = 0; i < n; ++i)
    {
        state.w_l.at(i) = fr::random_element();
        state.w_r.at(i) = fr::random_element();
        state.w_o.at(i) = fr::random_element();
        widget->q_m.at(i) = fr::random_element();
        widget->q_l.at(i) = fr::random_element();
        widget->q_r.at(i) = fr::random_element();
        widget->q_o.at(i) = fr::random_element();
        widget->q_c.at(i) = fr::random_element();
    }

    for (size_t i = 0; i < n; ++i)
    {
        state.sigma_3_mapping[i] = (uint32_t)((n - 1 - i) + ((0) << 30U));
        state.sigma_2_mapping[i] = (uint32_t)((n - 1 - i) + ((1U) << 30U));
        state.sigma_1_mapping[i] = (uint32_t)((n - 1 - i) + ((1U) << 31U));
    }

    state.widgets.emplace_back(std::move(widget));

    fr::field_t x = fr::random_element();
    DummyReferenceString fake_srs(n);
    fake_srs.compute_dummy_srs(x);

    state.reference_string = static_cast<waffle::ReferenceString>(fake_srs);

    waffle::Verifier verifier = waffle::preprocess(state);

    state.sigma_1.resize(n);
    state.sigma_2.resize(n);
    state.sigma_3.resize(n);

    waffle::compute_permutation_lagrange_base_single(
        state.sigma_1, state.sigma_1_mapping, state.circuit_state.small_domain);
    waffle::compute_permutation_lagrange_base_single(
        state.sigma_2, state.sigma_2_mapping, state.circuit_state.small_domain);
    waffle::compute_permutation_lagrange_base_single(
        state.sigma_3, state.sigma_3_mapping, state.circuit_state.small_domain);

    state.w_l.ifft(state.circuit_state.small_domain);
    state.w_r.ifft(state.circuit_state.small_domain);
    state.w_o.ifft(state.circuit_state.small_domain);

    q_m->ifft(state.circuit_state.small_domain);
    q_l->ifft(state.circuit_state.small_domain);
    q_r->ifft(state.circuit_state.small_domain);
    q_o->ifft(state.circuit_state.small_domain);
    q_c->ifft(state.circuit_state.small_domain);

    state.sigma_1.ifft(state.circuit_state.small_domain);
    state.sigma_2.ifft(state.circuit_state.small_domain);
    state.sigma_3.ifft(state.circuit_state.small_domain);

    fr::field_t sigma_1_eval = state.sigma_1.evaluate(x, n);
    fr::field_t sigma_2_eval = state.sigma_2.evaluate(x, n);
    fr::field_t sigma_3_eval = state.sigma_3.evaluate(x, n);
    fr::field_t q_m_eval = q_m->evaluate(x, n);
    fr::field_t q_l_eval = q_l->evaluate(x, n);
    fr::field_t q_r_eval = q_r->evaluate(x, n);
    fr::field_t q_o_eval = q_o->evaluate(x, n);
    fr::field_t q_c_eval = q_c->evaluate(x, n);

    g1::affine_element sigma_1_expected = g1::group_exponentiation(g1::affine_one(), sigma_1_eval);
    g1::affine_element sigma_2_expected = g1::group_exponentiation(g1::affine_one(), sigma_2_eval);
    g1::affine_element sigma_3_expected = g1::group_exponentiation(g1::affine_one(), sigma_3_eval);
    g1::affine_element q_m_expected = g1::group_exponentiation(g1::affine_one(), q_m_eval);
    g1::affine_element q_l_expected = g1::group_exponentiation(g1::affine_one(), q_l_eval);
    g1::affine_element q_r_expected = g1::group_exponentiation(g1::affine_one(), q_r_eval);
    g1::affine_element q_o_expected = g1::group_exponentiation(g1::affine_one(), q_o_eval);
    g1::affine_element q_c_expected = g1::group_exponentiation(g1::affine_one(), q_c_eval);

    EXPECT_EQ(g1::eq(verifier.SIGMA_1, sigma_1_expected), true);
    EXPECT_EQ(g1::eq(verifier.SIGMA_2, sigma_2_expected), true);
    EXPECT_EQ(g1::eq(verifier.SIGMA_3, sigma_3_expected), true);
    EXPECT_EQ(g1::eq(verifier.verifier_widgets[0]->instance[0], q_m_expected), true);
    EXPECT_EQ(g1::eq(verifier.verifier_widgets[0]->instance[1], q_l_expected), true);
    EXPECT_EQ(g1::eq(verifier.verifier_widgets[0]->instance[2], q_r_expected), true);
    EXPECT_EQ(g1::eq(verifier.verifier_widgets[0]->instance[3], q_o_expected), true);
    EXPECT_EQ(g1::eq(verifier.verifier_widgets[0]->instance[4], q_c_expected), true);
    EXPECT_EQ(verifier.n, n);
}