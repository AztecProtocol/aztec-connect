#include "./mimc_widget.hpp"

#include "../../../types.hpp"

#include "../../../curves/bn254/fr.hpp"
#include "../../../curves/bn254/g1.hpp"
#include "../../../curves/bn254/scalar_multiplication/scalar_multiplication.hpp"


using namespace barretenberg;

namespace waffle {
ProverMiMCWidget::ProverMiMCWidget(proving_key* input_key, program_witness* input_witness)
    : ProverBaseWidget(input_key, input_witness, static_cast<size_t>(WidgetVersionControl::Dependencies::REQUIRES_W_O_SHIFTED),
                       static_cast<size_t>(WidgetVersionControl::Features::HAS_MIMC_SELECTORS))
    , q_mimc_selector(key->constraint_selectors.at("q_mimc_selector"))
    , q_mimc_coefficient(key->constraint_selectors.at("q_mimc_coefficient"))
    , q_mimc_selector_fft(key->constraint_selector_ffts.at("q_mimc_selector_fft"))
    , q_mimc_coefficient_fft(key->constraint_selector_ffts.at("q_mimc_coefficient_fft"))
{
}

ProverMiMCWidget::ProverMiMCWidget(const ProverMiMCWidget& other)
    : ProverBaseWidget(other)
    , q_mimc_selector(key->constraint_selectors.at("q_mimc_selector"))
    , q_mimc_coefficient(key->constraint_selectors.at("q_mimc_coefficient"))
    , q_mimc_selector_fft(key->constraint_selector_ffts.at("q_mimc_selector_fft"))
    , q_mimc_coefficient_fft(key->constraint_selector_ffts.at("q_mimc_coefficient_fft"))
{
}

ProverMiMCWidget::ProverMiMCWidget(ProverMiMCWidget&& other)
    : ProverBaseWidget(other)
    , q_mimc_selector(key->constraint_selectors.at("q_mimc_selector"))
    , q_mimc_coefficient(key->constraint_selectors.at("q_mimc_coefficient"))
    , q_mimc_selector_fft(key->constraint_selector_ffts.at("q_mimc_selector_fft"))
    , q_mimc_coefficient_fft(key->constraint_selector_ffts.at("q_mimc_coefficient_fft"))
{
}

ProverMiMCWidget& ProverMiMCWidget::operator=(const ProverMiMCWidget& other)
{
    ProverBaseWidget::operator=(other);

    q_mimc_selector = key->constraint_selectors.at("q_mimc_selector");
    q_mimc_coefficient = key->constraint_selectors.at("q_mimc_coefficient");

    q_mimc_selector_fft = key->constraint_selector_ffts.at("q_mimc_selector_fft");
    q_mimc_coefficient_fft = key->constraint_selector_ffts.at("q_mimc_coefficient_fft");
    version = WidgetVersionControl(other.version);
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
                                                            const transcript::Transcript& transcript,
                                                            CircuitFFTState& circuit_state)
{
    fr::field_t alpha = fr::serialize_from_buffer(transcript.get_challenge("alpha").begin());

    polynomial& w_1_fft = key->wire_ffts.at("w_1_fft");
    polynomial& w_2_fft = key->wire_ffts.at("w_2_fft");
    polynomial& w_3_fft = key->wire_ffts.at("w_3_fft");

    ITERATE_OVER_DOMAIN_START(key->large_domain);
    fr::field_t T0;
    fr::field_t T1;
    fr::field_t T2;
    fr::__add_with_coarse_reduction(w_3_fft[i], w_1_fft[i], T0); // T0 = w_o + w_l
    fr::__add_with_coarse_reduction(T0, q_mimc_coefficient_fft[i], T0);                      // T0 = (w_o + w_l + q_c)
    fr::__sqr_with_coarse_reduction(T0, T1);                                                 // T1 = (w_o + w_l + q_c)^2
    fr::__mul_with_coarse_reduction(T1, T0, T1);                                             // T1 = (w_o + w_l + q_c)^3
    fr::__sub_with_coarse_reduction(T1, w_2_fft[i], T1);     // T1 = (w_o + w_l + q_c)^3 - w_r
    fr::__sqr_with_coarse_reduction(w_2_fft[i], T2);         // T2 = w_r^2
    fr::__mul_with_coarse_reduction(T2, T0, T2);                           // T2 = (w_o + w_l + q_c).w_r^2
    fr::__sub_with_coarse_reduction(T2, w_3_fft[i + 4], T2); // T2 = (w_o + w_l + q_c).w_r^2 - w_{o.next}
    fr::__mul_with_coarse_reduction(T2, alpha, T2); // T2 = (w_o + w_l + q_c).w_r^2 - w_{o.next}).alpha
    fr::__add_with_coarse_reduction(
        T1, T2, T1); // T1 = ((w_o + w_l + q_c)^3 - w_r) + (w_o + w_l + q_c).w_r^2 - w_{o.next}).alpha

    fr::__mul(T1,
              q_mimc_selector_fft[i],
              T1); // T1 = (((w_o + w_l + q_c)^3 - w_r) + (w_o + w_l + q_c).w_r^2 - w_{o.next}).alpha).q_mimc
    fr::__mul(T1, alpha_base, T1);
    fr::__add(circuit_state.quotient_large[i], T1, circuit_state.quotient_large[i]);
    ITERATE_OVER_DOMAIN_END;

    return fr::mul(alpha_base, fr::sqr(alpha));
}

void ProverMiMCWidget::compute_transcript_elements(transcript::Transcript& transcript)
{
    fr::field_t z = fr::serialize_from_buffer(&transcript.get_challenge("z")[0]);
    transcript.add_element("q_mimc_coefficient",
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

    fr::field_t mimc_T0 = fr::add(fr::add(w_o_eval, w_l_eval), q_mimc_coefficient_eval);
    fr::field_t mimc_a = fr::sqr(mimc_T0);
    mimc_a = fr::mul(mimc_a, mimc_T0);
    mimc_a = fr::sub(mimc_a, w_r_eval);
    fr::field_t mimc_term = fr::mul(fr::sub(fr::mul(fr::sqr(w_r_eval), mimc_T0), w_o_shifted_eval), alpha);
    mimc_term = fr::mul(fr::add(mimc_term, mimc_a), alpha_base);

    ITERATE_OVER_DOMAIN_START(key->small_domain);
    fr::field_t T0;
    fr::__mul(mimc_term, q_mimc_selector[i], T0);
    fr::__add(r[i], T0, r[i]);
    ITERATE_OVER_DOMAIN_END;
    return fr::mul(alpha_base, fr::sqr(alpha));
}

fr::field_t ProverMiMCWidget::compute_opening_poly_contribution(const fr::field_t& nu_base,
                                                                const transcript::Transcript& transcript,
                                                                fr::field_t* poly,
                                                                fr::field_t*)
{
    fr::field_t nu = fr::serialize_from_buffer(&transcript.get_challenge("nu")[0]);
    ITERATE_OVER_DOMAIN_START(key->small_domain);
    fr::field_t T0;
    fr::__mul(q_mimc_coefficient[i], nu_base, T0);
    fr::__add(poly[i], T0, poly[i]);
    ITERATE_OVER_DOMAIN_END;
    return fr::mul(nu_base, nu);
}

std::unique_ptr<VerifierBaseWidget> ProverMiMCWidget::compute_preprocessed_commitments(
    const ReferenceString& reference_string) const
{
    polynomial polys[2]{ polynomial(q_mimc_coefficient, key->small_domain.size), polynomial(q_mimc_selector, key->small_domain.size) };


    std::vector<barretenberg::g1::affine_element> commitments;
    commitments.resize(2);

    for (size_t i = 0; i < 2; ++i) {
        g1::jacobian_to_affine(
            scalar_multiplication::pippenger(polys[i].get_coefficients(), reference_string.monomials, key->small_domain.size),
            commitments[i]);
    }
    std::unique_ptr<VerifierBaseWidget> result = std::make_unique<VerifierMiMCWidget>(commitments);
    return result;
}

void ProverMiMCWidget::reset()
{
}

// ###

VerifierMiMCWidget::VerifierMiMCWidget(std::vector<barretenberg::g1::affine_element>& instance_commitments)
    : VerifierBaseWidget(static_cast<size_t>(WidgetVersionControl::Dependencies::REQUIRES_W_O_SHIFTED),
                         static_cast<size_t>(WidgetVersionControl::Features::HAS_MIMC_SELECTORS))
{
    ASSERT(instance_commitments.size() == 2);
    instance = std::vector<g1::affine_element>{ instance_commitments[0], instance_commitments[1] };
}

barretenberg::fr::field_t VerifierMiMCWidget::compute_batch_evaluation_contribution(
    barretenberg::fr::field_t& batch_eval,
    const barretenberg::fr::field_t& nu_base,
    const transcript::Transcript& transcript)
{
    fr::field_t q_mimc_coefficient_eval =
        fr::serialize_from_buffer(&transcript.get_element("q_mimc_coefficient")[0]);
    fr::field_t nu = fr::serialize_from_buffer(&transcript.get_challenge("nu")[0]);

    fr::field_t T0;
    fr::__mul(q_mimc_coefficient_eval, nu_base, T0);
    fr::__add(batch_eval, T0, batch_eval);
    return fr::mul(nu_base, nu);
}

VerifierBaseWidget::challenge_coefficients VerifierMiMCWidget::append_scalar_multiplication_inputs(
    const VerifierBaseWidget::challenge_coefficients& challenge,
    const transcript::Transcript& transcript,
    std::vector<barretenberg::g1::affine_element>& points,
    std::vector<barretenberg::fr::field_t>& scalars)
{
    if (g1::on_curve(instance[0])) {
        points.push_back(instance[0]);
        scalars.push_back(challenge.nu_base);
    }
    fr::field_t w_l_eval = fr::serialize_from_buffer(&transcript.get_element("w_1")[0]);
    fr::field_t w_r_eval = fr::serialize_from_buffer(&transcript.get_element("w_2")[0]);
    fr::field_t w_o_eval = fr::serialize_from_buffer(&transcript.get_element("w_3")[0]);
    fr::field_t w_o_shifted_eval = fr::serialize_from_buffer(&transcript.get_element("w_3_omega")[0]);
    fr::field_t q_mimc_coefficient_eval =
        fr::serialize_from_buffer(&transcript.get_element("q_mimc_coefficient")[0]);

    fr::field_t mimc_T0 = fr::add(fr::add(w_o_eval, w_l_eval), q_mimc_coefficient_eval);
    fr::field_t mimc_a = fr::sqr(mimc_T0);
    mimc_a = fr::mul(mimc_a, mimc_T0);
    mimc_a = fr::sub(mimc_a, w_r_eval);
    fr::field_t q_mimc_term =
        fr::mul(fr::sub(fr::mul(fr::sqr(w_r_eval), mimc_T0), w_o_shifted_eval), challenge.alpha_step);
    q_mimc_term = fr::mul(fr::add(q_mimc_term, mimc_a), challenge.alpha_base);
    q_mimc_term = fr::mul(q_mimc_term, challenge.linear_nu);

    if (g1::on_curve(instance[1])) {
        points.push_back(instance[1]);
        scalars.push_back(q_mimc_term);
    }

    return VerifierBaseWidget::challenge_coefficients{ fr::mul(challenge.alpha_base, fr::sqr(challenge.alpha_step)),
                                                       challenge.alpha_step,
                                                       fr::mul(challenge.nu_base, challenge.nu_step),
                                                       challenge.nu_step,
                                                       challenge.linear_nu };
}
} // namespace waffle