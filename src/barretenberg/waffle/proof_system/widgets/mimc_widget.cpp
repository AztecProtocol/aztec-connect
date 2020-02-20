#include "./mimc_widget.hpp"

#include "../../../curves/bn254/scalar_multiplication/scalar_multiplication.hpp"
#include "../../../transcript/transcript.hpp"
#include "../../../types.hpp"

#include "../transcript_helpers.hpp"

#include "../proving_key/proving_key.hpp"
#include "../verification_key/verification_key.hpp"

using namespace barretenberg;

namespace waffle {
ProverMiMCWidget::ProverMiMCWidget(proving_key* input_key, program_witness* input_witness)
    : ProverBaseWidget(input_key, input_witness)
    , q_mimc_selector(key->constraint_selectors.at("q_mimc_selector"))
    , q_mimc_coefficient(key->constraint_selectors.at("q_mimc_coefficient"))
    , q_mimc_selector_fft(key->constraint_selector_ffts.at("q_mimc_selector_fft"))
    , q_mimc_coefficient_fft(key->constraint_selector_ffts.at("q_mimc_coefficient_fft"))
{}

ProverMiMCWidget::ProverMiMCWidget(const ProverMiMCWidget& other)
    : ProverBaseWidget(other)
    , q_mimc_selector(key->constraint_selectors.at("q_mimc_selector"))
    , q_mimc_coefficient(key->constraint_selectors.at("q_mimc_coefficient"))
    , q_mimc_selector_fft(key->constraint_selector_ffts.at("q_mimc_selector_fft"))
    , q_mimc_coefficient_fft(key->constraint_selector_ffts.at("q_mimc_coefficient_fft"))
{}

ProverMiMCWidget::ProverMiMCWidget(ProverMiMCWidget&& other)
    : ProverBaseWidget(other)
    , q_mimc_selector(key->constraint_selectors.at("q_mimc_selector"))
    , q_mimc_coefficient(key->constraint_selectors.at("q_mimc_coefficient"))
    , q_mimc_selector_fft(key->constraint_selector_ffts.at("q_mimc_selector_fft"))
    , q_mimc_coefficient_fft(key->constraint_selector_ffts.at("q_mimc_coefficient_fft"))
{}

ProverMiMCWidget& ProverMiMCWidget::operator=(const ProverMiMCWidget& other)
{
    ProverBaseWidget::operator=(other);

    q_mimc_selector = key->constraint_selectors.at("q_mimc_selector");
    q_mimc_coefficient = key->constraint_selectors.at("q_mimc_coefficient");

    q_mimc_selector_fft = key->constraint_selector_ffts.at("q_mimc_selector_fft");
    q_mimc_coefficient_fft = key->constraint_selector_ffts.at("q_mimc_coefficient_fft");
    return *this;
}

ProverMiMCWidget& ProverMiMCWidget::operator=(ProverMiMCWidget&& other)
{
    ProverBaseWidget::operator=(other);

    q_mimc_selector = key->constraint_selectors.at("q_mimc_selector");
    q_mimc_coefficient = key->constraint_selectors.at("q_mimc_coefficient");

    q_mimc_selector_fft = key->constraint_selector_ffts.at("q_mimc_selector_fft");
    q_mimc_coefficient_fft = key->constraint_selector_ffts.at("q_mimc_coefficient_fft");
    return *this;
}

fr::field_t ProverMiMCWidget::compute_quotient_contribution(const barretenberg::fr::field_t& alpha_base,
                                                            const transcript::Transcript& transcript)
{
    fr::field_t alpha = fr::serialize_from_buffer(transcript.get_challenge("alpha").begin());

    polynomial& w_1_fft = key->wire_ffts.at("w_1_fft");
    polynomial& w_2_fft = key->wire_ffts.at("w_2_fft");
    polynomial& w_3_fft = key->wire_ffts.at("w_3_fft");

    polynomial& quotient_large = key->quotient_large;

    ITERATE_OVER_DOMAIN_START(key->large_domain);
    fr::field_t T0 = (w_3_fft[i] + w_1_fft[i] + q_mimc_coefficient_fft[i]);
    fr::field_t T1 = (T0.sqr() * T0) - w_2_fft[i];
    fr::field_t T2 = (w_2_fft[i].sqr() * T0 - w_3_fft[i + 4]) * alpha;
    fr::field_t T3 = (T1 + T2) * q_mimc_selector_fft[i] * alpha_base;
    quotient_large[i].self_add(T3);
    ITERATE_OVER_DOMAIN_END;

    return alpha_base * alpha.sqr();
}

void ProverMiMCWidget::compute_transcript_elements(transcript::Transcript& transcript)
{
    fr::field_t z = fr::serialize_from_buffer(&transcript.get_challenge("z")[0]);
    transcript.add_element(
        "q_mimc_coefficient",
        transcript_helpers::convert_field_element(q_mimc_coefficient.evaluate(z, key->small_domain.size)));
}

fr::field_t ProverMiMCWidget::compute_linear_contribution(const fr::field_t& alpha_base,
                                                          const transcript::Transcript& transcript,
                                                          polynomial& r)
{
    fr::field_t alpha = fr::serialize_from_buffer(&transcript.get_challenge("alpha")[0]);
    fr::field_t w_l_eval = fr::serialize_from_buffer(&transcript.get_element("w_1")[0]);
    fr::field_t w_r_eval = fr::serialize_from_buffer(&transcript.get_element("w_2")[0]);
    fr::field_t w_o_eval = fr::serialize_from_buffer(&transcript.get_element("w_3")[0]);
    fr::field_t w_o_shifted_eval = fr::serialize_from_buffer(&transcript.get_element("w_3_omega")[0]);
    fr::field_t q_mimc_coefficient_eval = fr::serialize_from_buffer(&transcript.get_element("q_mimc_coefficient")[0]);

    fr::field_t mimc_T0 = w_l_eval + w_o_eval + q_mimc_coefficient_eval;
    fr::field_t mimc_a = (mimc_T0.sqr() * mimc_T0) - w_r_eval;
    fr::field_t mimc_term = ((w_r_eval.sqr() * mimc_T0 - w_o_shifted_eval) * alpha + mimc_a) * alpha_base;

    ITERATE_OVER_DOMAIN_START(key->small_domain);
    r[i].self_add(mimc_term * q_mimc_selector[i]);
    ITERATE_OVER_DOMAIN_END;
    return alpha_base * alpha.sqr();
}

fr::field_t ProverMiMCWidget::compute_opening_poly_contribution(const fr::field_t& nu_base,
                                                                const transcript::Transcript& transcript,
                                                                fr::field_t* poly,
                                                                fr::field_t*)
{
    fr::field_t nu = fr::serialize_from_buffer(&transcript.get_challenge("nu")[0]);
    ITERATE_OVER_DOMAIN_START(key->small_domain);
    poly[i].self_add(q_mimc_coefficient[i] * nu_base);
    ITERATE_OVER_DOMAIN_END;

    return nu_base * nu;
}

// ###

VerifierMiMCWidget::VerifierMiMCWidget()
    : VerifierBaseWidget()
{}

barretenberg::fr::field_t VerifierMiMCWidget::compute_batch_evaluation_contribution(
    verification_key*,
    barretenberg::fr::field_t& batch_eval,
    const barretenberg::fr::field_t& nu_base,
    const transcript::Transcript& transcript)
{
    fr::field_t q_mimc_coefficient_eval = fr::serialize_from_buffer(&transcript.get_element("q_mimc_coefficient")[0]);
    fr::field_t nu = fr::serialize_from_buffer(&transcript.get_challenge("nu")[0]);

    batch_eval.self_add(q_mimc_coefficient_eval * nu_base);

    return nu_base * nu;
}

VerifierBaseWidget::challenge_coefficients VerifierMiMCWidget::append_scalar_multiplication_inputs(
    verification_key* key,
    const VerifierBaseWidget::challenge_coefficients& challenge,
    const transcript::Transcript& transcript,
    std::vector<barretenberg::g1::affine_element>& points,
    std::vector<barretenberg::fr::field_t>& scalars)
{
    if (g1::on_curve(key->constraint_selectors.at("Q_MIMC_COEFFICIENT"))) {
        points.push_back(key->constraint_selectors.at("Q_MIMC_COEFFICIENT"));
        scalars.push_back(challenge.nu_base);
    }
    fr::field_t w_l_eval = fr::serialize_from_buffer(&transcript.get_element("w_1")[0]);
    fr::field_t w_r_eval = fr::serialize_from_buffer(&transcript.get_element("w_2")[0]);
    fr::field_t w_o_eval = fr::serialize_from_buffer(&transcript.get_element("w_3")[0]);
    fr::field_t w_o_shifted_eval = fr::serialize_from_buffer(&transcript.get_element("w_3_omega")[0]);
    fr::field_t q_mimc_coefficient_eval = fr::serialize_from_buffer(&transcript.get_element("q_mimc_coefficient")[0]);

    fr::field_t mimc_T0 = w_l_eval + w_o_eval + q_mimc_coefficient_eval;
    fr::field_t mimc_a = (mimc_T0.sqr() * mimc_T0) - w_r_eval;
    fr::field_t q_mimc_term =
        ((w_r_eval.sqr() * mimc_T0 - w_o_shifted_eval) * challenge.alpha_step + mimc_a) * challenge.alpha_base;
    q_mimc_term = q_mimc_term * challenge.linear_nu;

    if (g1::on_curve(key->constraint_selectors.at("Q_MIMC_SELECTOR"))) {
        points.push_back(key->constraint_selectors.at("Q_MIMC_SELECTOR"));
        scalars.push_back(q_mimc_term);
    }

    return VerifierBaseWidget::challenge_coefficients{ challenge.alpha_base * challenge.alpha_step.sqr(),
                                                       challenge.alpha_step,
                                                       challenge.nu_base * challenge.nu_step,
                                                       challenge.nu_step,
                                                       challenge.linear_nu };
}
} // namespace waffle