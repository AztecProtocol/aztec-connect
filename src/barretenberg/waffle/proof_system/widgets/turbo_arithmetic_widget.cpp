#include "./turbo_arithmetic_widget.hpp"

#include "../../../curves/bn254/scalar_multiplication/scalar_multiplication.hpp"
#include "../../../polynomials/evaluation_domain.hpp"
#include "../../../transcript/transcript.hpp"
#include "../../../types.hpp"

#include "../transcript_helpers.hpp"

#include "../proving_key/proving_key.hpp"
#include "../verification_key/verification_key.hpp"

using namespace barretenberg;

namespace waffle {
ProverTurboArithmeticWidget::ProverTurboArithmeticWidget(proving_key* input_key, program_witness* input_witness)
    : ProverBaseWidget(input_key, input_witness)
    , q_1(key->constraint_selectors.at("q_1"))
    , q_2(key->constraint_selectors.at("q_2"))
    , q_3(key->constraint_selectors.at("q_3"))
    , q_4(key->constraint_selectors.at("q_4"))
    , q_4_next(key->constraint_selectors.at("q_4_next"))
    , q_m(key->constraint_selectors.at("q_m"))
    , q_c(key->constraint_selectors.at("q_c"))
    , q_arith(key->constraint_selectors.at("q_arith"))
    , q_1_fft(key->constraint_selector_ffts.at("q_1_fft"))
    , q_2_fft(key->constraint_selector_ffts.at("q_2_fft"))
    , q_3_fft(key->constraint_selector_ffts.at("q_3_fft"))
    , q_4_fft(key->constraint_selector_ffts.at("q_4_fft"))
    , q_4_next_fft(key->constraint_selector_ffts.at("q_4_next_fft"))
    , q_m_fft(key->constraint_selector_ffts.at("q_m_fft"))
    , q_c_fft(key->constraint_selector_ffts.at("q_c_fft"))
    , q_arith_fft(key->constraint_selector_ffts.at("q_arith_fft"))
{}

ProverTurboArithmeticWidget::ProverTurboArithmeticWidget(const ProverTurboArithmeticWidget& other)
    : ProverBaseWidget(other)
    , q_1(key->constraint_selectors.at("q_1"))
    , q_2(key->constraint_selectors.at("q_2"))
    , q_3(key->constraint_selectors.at("q_3"))
    , q_4(key->constraint_selectors.at("q_4"))
    , q_4_next(key->constraint_selectors.at("q_4_next"))
    , q_m(key->constraint_selectors.at("q_m"))
    , q_c(key->constraint_selectors.at("q_c"))
    , q_arith(key->constraint_selectors.at("q_arith"))
    , q_1_fft(key->constraint_selector_ffts.at("q_1_fft"))
    , q_2_fft(key->constraint_selector_ffts.at("q_2_fft"))
    , q_3_fft(key->constraint_selector_ffts.at("q_3_fft"))
    , q_4_fft(key->constraint_selector_ffts.at("q_4_fft"))
    , q_4_next_fft(key->constraint_selector_ffts.at("q_4_next_fft"))
    , q_m_fft(key->constraint_selector_ffts.at("q_m_fft"))
    , q_c_fft(key->constraint_selector_ffts.at("q_c_fft"))
    , q_arith_fft(key->constraint_selector_ffts.at("q_arith_fft"))
{}

ProverTurboArithmeticWidget::ProverTurboArithmeticWidget(ProverTurboArithmeticWidget&& other)
    : ProverBaseWidget(other)
    , q_1(key->constraint_selectors.at("q_1"))
    , q_2(key->constraint_selectors.at("q_2"))
    , q_3(key->constraint_selectors.at("q_3"))
    , q_4(key->constraint_selectors.at("q_4"))
    , q_4_next(key->constraint_selectors.at("q_4_next"))
    , q_m(key->constraint_selectors.at("q_m"))
    , q_c(key->constraint_selectors.at("q_c"))
    , q_arith(key->constraint_selectors.at("q_arith"))
    , q_1_fft(key->constraint_selector_ffts.at("q_1_fft"))
    , q_2_fft(key->constraint_selector_ffts.at("q_2_fft"))
    , q_3_fft(key->constraint_selector_ffts.at("q_3_fft"))
    , q_4_fft(key->constraint_selector_ffts.at("q_4_fft"))
    , q_4_next_fft(key->constraint_selector_ffts.at("q_4_next_fft"))
    , q_m_fft(key->constraint_selector_ffts.at("q_m_fft"))
    , q_c_fft(key->constraint_selector_ffts.at("q_c_fft"))
    , q_arith_fft(key->constraint_selector_ffts.at("q_arith_fft"))
{}

ProverTurboArithmeticWidget& ProverTurboArithmeticWidget::operator=(const ProverTurboArithmeticWidget& other)
{
    ProverBaseWidget::operator=(other);
    q_1 = key->constraint_selectors.at("q_1");
    q_2 = key->constraint_selectors.at("q_2");
    q_3 = key->constraint_selectors.at("q_3");
    q_4 = key->constraint_selectors.at("q_4");
    q_4_next = key->constraint_selectors.at("q_4_next");
    q_m = key->constraint_selectors.at("q_m");
    q_c = key->constraint_selectors.at("q_c");
    q_arith = key->constraint_selectors.at("q_arith");

    q_1_fft = key->constraint_selectors.at("q_1_fft");
    q_2_fft = key->constraint_selectors.at("q_2_fft");
    q_3_fft = key->constraint_selectors.at("q_3_fft");
    q_4_fft = key->constraint_selectors.at("q_4_fft");
    q_4_next_fft = key->constraint_selectors.at("q_4_next_fft");
    q_m_fft = key->constraint_selectors.at("q_m_fft");
    q_c_fft = key->constraint_selectors.at("q_c_fft");
    q_arith_fft = key->constraint_selectors.at("q_arith_fft");
    return *this;
}

ProverTurboArithmeticWidget& ProverTurboArithmeticWidget::operator=(ProverTurboArithmeticWidget&& other)
{
    ProverBaseWidget::operator=(other);
    q_1 = key->constraint_selectors.at("q_1");
    q_2 = key->constraint_selectors.at("q_2");
    q_3 = key->constraint_selectors.at("q_3");
    q_4 = key->constraint_selectors.at("q_4");
    q_4_next = key->constraint_selectors.at("q_4_next");
    q_m = key->constraint_selectors.at("q_m");
    q_c = key->constraint_selectors.at("q_c");
    q_arith = key->constraint_selectors.at("q_arith");

    q_1_fft = key->constraint_selectors.at("q_1_fft");
    q_2_fft = key->constraint_selectors.at("q_2_fft");
    q_3_fft = key->constraint_selectors.at("q_3_fft");
    q_4_fft = key->constraint_selectors.at("q_4_fft");
    q_4_next_fft = key->constraint_selectors.at("q_4_next_fft");
    q_m_fft = key->constraint_selectors.at("q_m_fft");
    q_c_fft = key->constraint_selectors.at("q_c_fft");
    q_arith_fft = key->constraint_selectors.at("q_arith_fft");
    return *this;
}

fr::field_t ProverTurboArithmeticWidget::compute_quotient_contribution(const barretenberg::fr::field_t& alpha_base,
                                                                       const transcript::Transcript& transcript)
{
    fr::field_t alpha = fr::serialize_from_buffer(transcript.get_challenge("alpha").begin());

    fr::field_t* w_1_fft = &key->wire_ffts.at("w_1_fft")[0];
    fr::field_t* w_2_fft = &key->wire_ffts.at("w_2_fft")[0];
    fr::field_t* w_3_fft = &key->wire_ffts.at("w_3_fft")[0];
    fr::field_t* w_4_fft = &key->wire_ffts.at("w_4_fft")[0];

    fr::field_t* quotient_large = &key->quotient_large[0];

    ITERATE_OVER_DOMAIN_START(key->large_domain);
    fr::field_t T0;
    fr::field_t T1;
    fr::field_t T2;
    fr::field_t T3;
    fr::field_t T4;
    fr::field_t T5;

    fr::__mul_with_coarse_reduction(w_1_fft[i], q_m_fft[i], T0); // w_l * q_m = rdx
    fr::__mul_with_coarse_reduction(T0, w_2_fft[i], T0);         // w_l * w_r * q_m = rdx
    fr::__mul_with_coarse_reduction(w_1_fft[i], q_1_fft[i], T1); // w_l * q_l = rdi
    fr::__mul_with_coarse_reduction(w_2_fft[i], q_2_fft[i], T2); // w_r * q_r = rsi
    fr::__mul_with_coarse_reduction(w_3_fft[i], q_3_fft[i], T3); // w_o * q_o = r8
    fr::__mul_with_coarse_reduction(w_4_fft[i], q_4_fft[i], T4);
    fr::__mul_with_coarse_reduction(w_4_fft[i + 4], q_4_next_fft[i], T5);

    fr::__add_with_coarse_reduction(T0, T1, T0); // q_m * w_l * w_r + w_l * q_l = rdx
    fr::__add_with_coarse_reduction(T2, T3, T2); // q_r * w_r + q_o * w_o = rsi
    fr::__add_with_coarse_reduction(T4, T5, T4); // q_m * w_l * w_r + w_l * q_l + q_r * w_r + q_o * w_o = rdx
    fr::__add_with_coarse_reduction(T0, T2, T0);
    fr::__add_with_coarse_reduction(T0, T4, T0);

    // q_m * w_l * w_r + w_l * q_l + q_r * w_r + q_o * w_o + q_c = rdx
    fr::__add_with_coarse_reduction(T0, q_c_fft[i], T0);
    fr::__mul_with_coarse_reduction(T0, q_arith_fft[i], T0);
    fr::__mul(T0, alpha_base, T0);
    fr::__add(quotient_large[i], T0, quotient_large[i]);
    ITERATE_OVER_DOMAIN_END;

    return fr::mul(alpha_base, alpha);
}

void ProverTurboArithmeticWidget::compute_transcript_elements(transcript::Transcript& transcript)
{
    fr::field_t z = fr::serialize_from_buffer(&transcript.get_challenge("z")[0]);

    transcript.add_element("q_arith",
                           transcript_helpers::convert_field_element(q_arith.evaluate(z, key->small_domain.size)));
}

fr::field_t ProverTurboArithmeticWidget::compute_linear_contribution(const fr::field_t& alpha_base,
                                                                     const transcript::Transcript& transcript,
                                                                     barretenberg::polynomial& r)
{

    fr::field_t alpha = fr::serialize_from_buffer(transcript.get_challenge("alpha").begin());
    fr::field_t w_l_eval = fr::serialize_from_buffer(&transcript.get_element("w_1")[0]);
    fr::field_t w_r_eval = fr::serialize_from_buffer(&transcript.get_element("w_2")[0]);
    fr::field_t w_o_eval = fr::serialize_from_buffer(&transcript.get_element("w_3")[0]);
    fr::field_t w_4_eval = fr::serialize_from_buffer(&transcript.get_element("w_4")[0]);
    fr::field_t w_4_shifted_eval = fr::serialize_from_buffer(&transcript.get_element("w_4_omega")[0]);
    fr::field_t q_arith_eval = fr::serialize_from_buffer(&transcript.get_element("q_arith")[0]);

    fr::field_t w_lr = fr::mul(w_l_eval, w_r_eval);
    ITERATE_OVER_DOMAIN_START(key->small_domain);
    fr::field_t T0;
    fr::field_t T1;
    fr::field_t T2;
    fr::field_t T3;
    fr::field_t T4;
    fr::field_t T5;
    fr::__mul(w_lr, q_m[i], T0);
    fr::__mul(w_l_eval, q_1[i], T1);
    fr::__mul(w_r_eval, q_2[i], T2);
    fr::__mul(w_o_eval, q_3[i], T3);
    fr::__mul(w_4_eval, q_4[i], T4);
    fr::__mul(w_4_shifted_eval, q_4_next[i], T5);
    fr::__add(T0, T1, T0);
    fr::__add(T2, T3, T2);
    fr::__add(T4, T5, T4);
    fr::__add(T0, T2, T0);
    fr::__add(T0, T4, T0);
    fr::__add(T0, q_c[i], T0);
    fr::__mul(T0, q_arith_eval, T0);
    fr::__mul(T0, alpha_base, T0);
    fr::__add(r[i], T0, r[i]);
    ITERATE_OVER_DOMAIN_END;
    return fr::mul(alpha_base, alpha);
}

fr::field_t ProverTurboArithmeticWidget::compute_opening_poly_contribution(const fr::field_t& nu_base,
                                                                           const transcript::Transcript& transcript,
                                                                           fr::field_t* poly,
                                                                           fr::field_t*)
{
    fr::field_t nu = fr::serialize_from_buffer(&transcript.get_challenge("nu")[0]);

    ITERATE_OVER_DOMAIN_START(key->small_domain);
    fr::field_t T0;
    fr::__mul(q_arith[i], nu_base, T0);
    fr::__add(poly[i], T0, poly[i]);
    ITERATE_OVER_DOMAIN_END;
    return fr::mul(nu_base, nu);
}

// ###

VerifierTurboArithmeticWidget::VerifierTurboArithmeticWidget()
    : VerifierBaseWidget()
{
}

fr::field_t VerifierTurboArithmeticWidget::compute_quotient_evaluation_contribution(
    verification_key*, const fr::field_t& alpha_base, const transcript::Transcript& transcript, fr::field_t&)
{
    // fr::field_t z_challenge = fr::serialize_from_buffer(&transcript.get_challenge("z")[0]);
    // printf("z challenge = ");
    // fr::print(fr::from_montgomery_form(z_challenge));
    // printf(" domain size = %lu \n", domain.size);
    fr::field_t alpha = fr::serialize_from_buffer(transcript.get_challenge("alpha").begin());
    // std::vector<barretenberg::fr::field_t> public_inputs =
    //     transcript_helpers::read_field_elements(transcript.get_element("public_inputs"));
    // if (public_inputs.size() > 0) {
    // //     printf("in v widget, pub inputs = %lu \n", public_inputs.size());
    // //     printf("verifier public alpha = ");
    // //     printf("loaded public input = ");
    // //     fr::print(fr::from_montgomery_form(public_inputs[0]));
    // //     fr::print(alpha_base);
    // // barretenberg::polynomial_arithmetic::lagrange_evaluations lagrange_evals =
    // //     barretenberg::polynomial_arithmetic::get_lagrange_evaluations(z_challenge, domain);

    // //     fr::field_t t0 = fr::mul(public_inputs[0], lagrange_evals.l_1);
    // //     fr::__mul(t0, alpha_base, t0);
    // //     fr::__add(t_eval, t0, t_eval);
    //     fr::field_t public_input_evaluation = barretenberg::polynomial_arithmetic::compute_barycentric_evaluation(
    //         &public_inputs[0], public_inputs.size(), z_challenge, domain);
    //         printf("public input evaluation = ");
    //     fr::print(fr::from_montgomery_form(public_input_evaluation));
    //     fr::__mul(public_input_evaluation, alpha_base, public_input_evaluation);
    //     fr::__sub(t_eval, public_input_evaluation, t_eval);
    // }
    return fr::mul(alpha, alpha_base);
}

barretenberg::fr::field_t VerifierTurboArithmeticWidget::compute_batch_evaluation_contribution(
    verification_key*,
    barretenberg::fr::field_t& batch_eval,
    const barretenberg::fr::field_t& nu_base,
    const transcript::Transcript& transcript)
{
    fr::field_t q_arith_eval = fr::serialize_from_buffer(&transcript.get_element("q_arith")[0]);

    fr::field_t nu = fr::serialize_from_buffer(&transcript.get_challenge("nu")[0]);

    fr::field_t T0;
    fr::__mul(q_arith_eval, nu_base, T0);
    fr::__add(batch_eval, T0, batch_eval);
    return fr::mul(nu_base, nu);
}

VerifierBaseWidget::challenge_coefficients VerifierTurboArithmeticWidget::append_scalar_multiplication_inputs(
    verification_key* key,
    const challenge_coefficients& challenge,
    const transcript::Transcript& transcript,
    std::vector<barretenberg::g1::affine_element>& points,
    std::vector<barretenberg::fr::field_t>& scalars)
{
    fr::field_t w_l_eval = fr::serialize_from_buffer(&transcript.get_element("w_1")[0]);
    fr::field_t w_r_eval = fr::serialize_from_buffer(&transcript.get_element("w_2")[0]);
    fr::field_t w_o_eval = fr::serialize_from_buffer(&transcript.get_element("w_3")[0]);
    fr::field_t w_4_eval = fr::serialize_from_buffer(&transcript.get_element("w_4")[0]);
    fr::field_t w_4_next_eval = fr::serialize_from_buffer(&transcript.get_element("w_4_omega")[0]);

    fr::field_t q_arith_eval = fr::serialize_from_buffer(&transcript.get_element("q_arith")[0]);

    fr::field_t q_l_term;
    fr::__mul(w_l_eval, challenge.alpha_base, q_l_term);
    fr::__mul(q_l_term, challenge.linear_nu, q_l_term);
    fr::__mul(q_l_term, q_arith_eval, q_l_term);
    if (g1::on_curve(key->constraint_selectors.at("Q_1"))) {
        points.push_back(key->constraint_selectors.at("Q_1"));
        scalars.push_back(q_l_term);
    }

    fr::field_t q_r_term;
    fr::__mul(w_r_eval, challenge.alpha_base, q_r_term);
    fr::__mul(q_r_term, challenge.linear_nu, q_r_term);
    fr::__mul(q_r_term, q_arith_eval, q_r_term);
    if (g1::on_curve(key->constraint_selectors.at("Q_2"))) {
        points.push_back(key->constraint_selectors.at("Q_2"));
        scalars.push_back(q_r_term);
    }

    fr::field_t q_o_term;
    fr::__mul(w_o_eval, challenge.alpha_base, q_o_term);
    fr::__mul(q_o_term, challenge.linear_nu, q_o_term);
    fr::__mul(q_o_term, q_arith_eval, q_o_term);
    if (g1::on_curve(key->constraint_selectors.at("Q_3"))) {
        points.push_back(key->constraint_selectors.at("Q_3"));
        scalars.push_back(q_o_term);
    }

    fr::field_t q_4_term;
    fr::__mul(w_4_eval, challenge.alpha_base, q_4_term);
    fr::__mul(q_4_term, challenge.linear_nu, q_4_term);
    fr::__mul(q_4_term, q_arith_eval, q_4_term);
    if (g1::on_curve(key->constraint_selectors.at("Q_4"))) {
        points.push_back(key->constraint_selectors.at("Q_4"));
        scalars.push_back(q_4_term);
    }

    fr::field_t q_4_next_term;
    fr::__mul(w_4_next_eval, challenge.alpha_base, q_4_next_term);
    fr::__mul(q_4_next_term, challenge.linear_nu, q_4_next_term);
    fr::__mul(q_4_next_term, q_arith_eval, q_4_next_term);
    if (g1::on_curve(key->constraint_selectors.at("Q_4_NEXT"))) {
        points.push_back(key->constraint_selectors.at("Q_4_NEXT"));
        scalars.push_back(q_4_next_term);
    }

    // Q_M term = w_l * w_r * challenge.alpha_base * nu
    fr::field_t q_m_term;
    fr::__mul(w_l_eval, w_r_eval, q_m_term);
    fr::__mul(q_m_term, challenge.alpha_base, q_m_term);
    fr::__mul(q_m_term, q_arith_eval, q_m_term);
    fr::__mul(q_m_term, challenge.linear_nu, q_m_term);
    if (g1::on_curve(key->constraint_selectors.at("Q_M"))) {
        points.push_back(key->constraint_selectors.at("Q_M"));
        scalars.push_back(q_m_term);
    }

    fr::field_t q_c_term;
    fr::__mul(challenge.alpha_base, challenge.linear_nu, q_c_term);
    fr::__mul(q_c_term, q_arith_eval, q_c_term);
    if (g1::on_curve(key->constraint_selectors.at("Q_C"))) {
        points.push_back(key->constraint_selectors.at("Q_C"));
        scalars.push_back(q_c_term);
    }

    if (g1::on_curve(key->constraint_selectors.at("Q_ARITHMETIC_SELECTOR"))) {
        points.push_back(key->constraint_selectors.at("Q_ARITHMETIC_SELECTOR"));
        scalars.push_back(challenge.nu_base);
    }

    return VerifierBaseWidget::challenge_coefficients{ fr::mul(challenge.alpha_base, challenge.alpha_step),
                                                       challenge.alpha_step,
                                                       fr::mul(challenge.nu_base, challenge.nu_step),
                                                       challenge.nu_step,
                                                       challenge.linear_nu };
}
} // namespace waffle