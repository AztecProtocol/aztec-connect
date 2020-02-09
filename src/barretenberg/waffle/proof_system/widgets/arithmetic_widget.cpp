#include "./arithmetic_widget.hpp"

#include "../../../curves/bn254/fr.hpp"
#include "../../../curves/bn254/g1.hpp"
#include "../../../curves/bn254/scalar_multiplication/scalar_multiplication.hpp"
#include "../../../polynomials/evaluation_domain.hpp"
#include "../../../types.hpp"

using namespace barretenberg;

namespace waffle {
ProverArithmeticWidget::ProverArithmeticWidget(proving_key* input_key, program_witness* input_witness)
    : ProverBaseWidget(input_key, input_witness)
    , q_1(key->constraint_selectors.at("q_1"))
    , q_2(key->constraint_selectors.at("q_2"))
    , q_3(key->constraint_selectors.at("q_3"))
    , q_m(key->constraint_selectors.at("q_m"))
    , q_c(key->constraint_selectors.at("q_c"))
    , q_1_fft(key->constraint_selector_ffts.at("q_1_fft"))
    , q_2_fft(key->constraint_selector_ffts.at("q_2_fft"))
    , q_3_fft(key->constraint_selector_ffts.at("q_3_fft"))
    , q_m_fft(key->constraint_selector_ffts.at("q_m_fft"))
    , q_c_fft(key->constraint_selector_ffts.at("q_c_fft"))
{}

ProverArithmeticWidget::ProverArithmeticWidget(const ProverArithmeticWidget& other)
    : ProverBaseWidget(other)
    , q_1(other.q_1)
    , q_2(other.q_2)
    , q_3(other.q_3)
    , q_m(other.q_m)
    , q_c(other.q_c)
    , q_1_fft(other.q_1_fft)
    , q_2_fft(other.q_2_fft)
    , q_3_fft(other.q_3_fft)
    , q_m_fft(other.q_m_fft)
    , q_c_fft(other.q_c_fft)
{}

ProverArithmeticWidget::ProverArithmeticWidget(ProverArithmeticWidget&& other)
    : ProverBaseWidget(other)
    , q_1(other.q_1)
    , q_2(other.q_2)
    , q_3(other.q_3)
    , q_m(other.q_m)
    , q_c(other.q_c)
    , q_1_fft(other.q_1_fft)
    , q_2_fft(other.q_2_fft)
    , q_3_fft(other.q_3_fft)
    , q_m_fft(other.q_m_fft)
    , q_c_fft(other.q_c_fft)
{}

ProverArithmeticWidget& ProverArithmeticWidget::operator=(const ProverArithmeticWidget& other)
{
    ProverBaseWidget::operator=(other);
    q_1 = key->constraint_selectors.at("q_1");
    q_2 = key->constraint_selectors.at("q_2");
    q_3 = key->constraint_selectors.at("q_3");
    q_m = key->constraint_selectors.at("q_m");
    q_c = key->constraint_selectors.at("q_c");

    q_1_fft = key->constraint_selectors.at("q_1_fft");
    q_2_fft = key->constraint_selectors.at("q_2_fft");
    q_3_fft = key->constraint_selectors.at("q_3_fft");
    q_m_fft = key->constraint_selectors.at("q_m_fft");
    q_c_fft = key->constraint_selectors.at("q_c_fft");
    return *this;
}

ProverArithmeticWidget& ProverArithmeticWidget::operator=(ProverArithmeticWidget&& other)
{
    ProverBaseWidget::operator=(other);

    q_1 = key->constraint_selectors.at("q_1");
    q_2 = key->constraint_selectors.at("q_2");
    q_3 = key->constraint_selectors.at("q_3");
    q_m = key->constraint_selectors.at("q_m");
    q_c = key->constraint_selectors.at("q_c");

    q_1_fft = key->constraint_selectors.at("q_1_fft");
    q_2_fft = key->constraint_selectors.at("q_2_fft");
    q_3_fft = key->constraint_selectors.at("q_3_fft");
    q_m_fft = key->constraint_selectors.at("q_m_fft");
    q_c_fft = key->constraint_selectors.at("q_c_fft");

    return *this;
}

fr::field_t ProverArithmeticWidget::compute_quotient_contribution(const fr::field_t& alpha_base,
                                                                  const transcript::Transcript& transcript)
{
    fr::field_t alpha = fr::serialize_from_buffer(transcript.get_challenge("alpha").begin());

    polynomial& w_1_fft = key->wire_ffts.at("w_1_fft");
    polynomial& w_2_fft = key->wire_ffts.at("w_2_fft");
    polynomial& w_3_fft = key->wire_ffts.at("w_3_fft");

    polynomial& quotient_mid = key->quotient_mid;

    ITERATE_OVER_DOMAIN_START(key->mid_domain);
    fr::field_t T0;
    fr::field_t T1;
    fr::field_t T2;
    fr::field_t T3;
    fr::__mul(w_1_fft.at(2 * i), q_m_fft.at(i), T0); // w_l * q_m = rdx
    fr::__mul(T0, w_2_fft.at(2 * i), T0);            // w_l * w_r * q_m = rdx
    fr::__mul(w_1_fft.at(2 * i), q_1_fft.at(i), T1); // w_l * q_l = rdi
    fr::__mul(w_2_fft.at(2 * i), q_2_fft.at(i), T2); // w_r * q_r = rsi
    fr::__mul(w_3_fft.at(2 * i), q_3_fft.at(i), T3); // w_o * q_o = r8
    fr::__add(T0, T1, T0);                           // q_m * w_l * w_r + w_l * q_l = rdx
    fr::__add(T2, T3, T2);                           // q_r * w_r + q_o * w_o = rsi
    fr::__add(T0, T2, T0);                           // q_m * w_l * w_r + w_l * q_l + q_r * w_r + q_o * w_o = rdx
    fr::__add(T0, q_c_fft.at(i), T0);                // q_m * w_l * w_r + w_l * q_l + q_r * w_r + q_o * w_o + q_c = rdx
    fr::__mul(T0, alpha_base, T0);
    fr::__add(quotient_mid.at(i), T0, quotient_mid.at(i));
    ITERATE_OVER_DOMAIN_END;

    return fr::mul(alpha_base, alpha);
}

fr::field_t ProverArithmeticWidget::compute_linear_contribution(const fr::field_t& alpha_base,
                                                                const transcript::Transcript& transcript,
                                                                polynomial& r)
{
    fr::field_t alpha = fr::serialize_from_buffer(transcript.get_challenge("alpha").begin());
    fr::field_t w_l_eval = fr::serialize_from_buffer(&transcript.get_element("w_1")[0]);
    fr::field_t w_r_eval = fr::serialize_from_buffer(&transcript.get_element("w_2")[0]);
    fr::field_t w_o_eval = fr::serialize_from_buffer(&transcript.get_element("w_3")[0]);
    fr::field_t w_lr = fr::mul(w_l_eval, w_r_eval);
    ITERATE_OVER_DOMAIN_START(key->small_domain);
    fr::field_t T0;
    fr::field_t T1;
    fr::field_t T2;
    fr::field_t T3;
    fr::__mul(w_lr, q_m.at(i), T0);
    fr::__mul(w_l_eval, q_1.at(i), T1);
    fr::__mul(w_r_eval, q_2.at(i), T2);
    fr::__mul(w_o_eval, q_3.at(i), T3);
    fr::__add(T0, T1, T0);
    fr::__add(T2, T3, T2);
    fr::__add(T0, T2, T0);
    fr::__add(T0, q_c.at(i), T0);
    fr::__mul(T0, alpha_base, T0);
    fr::__add(r.at(i), T0, r.at(i));
    ITERATE_OVER_DOMAIN_END;
    return fr::mul(alpha_base, alpha);
}

fr::field_t ProverArithmeticWidget::compute_opening_poly_contribution(const barretenberg::fr::field_t& nu_base,
                                                                      const transcript::Transcript&,
                                                                      barretenberg::fr::field_t*,
                                                                      barretenberg::fr::field_t*)
{
    return nu_base;
}

std::unique_ptr<VerifierBaseWidget> ProverArithmeticWidget::compute_preprocessed_commitments(
    const ReferenceString& reference_string) const
{
    polynomial polys[5]{
        polynomial(q_m, key->small_domain.size), polynomial(q_1, key->small_domain.size),
        polynomial(q_2, key->small_domain.size), polynomial(q_3, key->small_domain.size),
        polynomial(q_c, key->small_domain.size),
    };

    std::vector<g1::affine_element> commitments;
    commitments.resize(5);

    for (size_t i = 0; i < 5; ++i) {
        g1::jacobian_to_affine(scalar_multiplication::pippenger(
                                   polys[i].get_coefficients(), reference_string.monomials, key->small_domain.size),
                               commitments[i]);
    }
    std::unique_ptr<VerifierBaseWidget> result = std::make_unique<VerifierArithmeticWidget>(commitments);
    return result;
}


// ###

VerifierArithmeticWidget::VerifierArithmeticWidget(std::vector<g1::affine_element>& instance_commitments)
    : VerifierBaseWidget()
{
    ASSERT(instance_commitments.size() == 5);
    instance = std::vector<g1::affine_element>{
        instance_commitments[0], instance_commitments[1], instance_commitments[2],
        instance_commitments[3], instance_commitments[4],
    };
}

fr::field_t VerifierArithmeticWidget::compute_quotient_evaluation_contribution(const fr::field_t& alpha_base,
                                                                               const transcript::Transcript& transcript,
                                                                               fr::field_t&,
                                                                               const evaluation_domain&)
{
    fr::field_t alpha = fr::serialize_from_buffer(transcript.get_challenge("alpha").begin());
    return fr::mul(alpha, alpha_base);
}

fr::field_t VerifierArithmeticWidget::compute_batch_evaluation_contribution(
    fr::field_t&, const fr::field_t& nu_base, const transcript::Transcript&)
{
    return nu_base;
};

VerifierBaseWidget::challenge_coefficients VerifierArithmeticWidget::append_scalar_multiplication_inputs(
    const challenge_coefficients& challenge,
    const transcript::Transcript& transcript,
    std::vector<g1::affine_element>& points,
    std::vector<fr::field_t>& scalars)
{
    fr::field_t w_l_eval = fr::serialize_from_buffer(&transcript.get_element("w_1")[0]);
    fr::field_t w_r_eval = fr::serialize_from_buffer(&transcript.get_element("w_2")[0]);
    fr::field_t w_o_eval = fr::serialize_from_buffer(&transcript.get_element("w_3")[0]);

    // Q_M term = w_l * w_r * challenge.alpha_base * nu
    fr::field_t q_m_term;
    fr::__mul(w_l_eval, w_r_eval, q_m_term);
    fr::__mul(q_m_term, challenge.alpha_base, q_m_term);
    fr::__mul(q_m_term, challenge.linear_nu, q_m_term);
    if (g1::on_curve(instance[0])) {
        points.push_back(instance[0]);
        scalars.push_back(q_m_term);
    }

    fr::field_t q_l_term;
    fr::__mul(w_l_eval, challenge.alpha_base, q_l_term);
    fr::__mul(q_l_term, challenge.linear_nu, q_l_term);
    if (g1::on_curve(instance[1])) {
        points.push_back(instance[1]);
        scalars.push_back(q_l_term);
    }

    fr::field_t q_r_term;
    fr::__mul(w_r_eval, challenge.alpha_base, q_r_term);
    fr::__mul(q_r_term, challenge.linear_nu, q_r_term);
    if (g1::on_curve(instance[2])) {
        points.push_back(instance[2]);
        scalars.push_back(q_r_term);
    }

    fr::field_t q_o_term;
    fr::__mul(w_o_eval, challenge.alpha_base, q_o_term);
    fr::__mul(q_o_term, challenge.linear_nu, q_o_term);
    if (g1::on_curve(instance[3])) {
        points.push_back(instance[3]);
        scalars.push_back(q_o_term);
    }

    fr::field_t q_c_term;
    fr::__mul(challenge.alpha_base, challenge.linear_nu, q_c_term);
    if (g1::on_curve(instance[4])) {
        points.push_back(instance[4]);
        scalars.push_back(q_c_term);
    }

    return VerifierBaseWidget::challenge_coefficients{ fr::mul(challenge.alpha_base, challenge.alpha_step),
                                                       challenge.alpha_step,
                                                       challenge.nu_base,
                                                       challenge.nu_step,
                                                       challenge.linear_nu };
}
} // namespace waffle