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
    , q_5(key->constraint_selectors.at("q_5"))
    , q_m(key->constraint_selectors.at("q_m"))
    , q_c(key->constraint_selectors.at("q_c"))
    , q_arith(key->constraint_selectors.at("q_arith"))
    , q_1_fft(key->constraint_selector_ffts.at("q_1_fft"))
    , q_2_fft(key->constraint_selector_ffts.at("q_2_fft"))
    , q_3_fft(key->constraint_selector_ffts.at("q_3_fft"))
    , q_4_fft(key->constraint_selector_ffts.at("q_4_fft"))
    , q_5_fft(key->constraint_selector_ffts.at("q_5_fft"))
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
    , q_5(key->constraint_selectors.at("q_5"))
    , q_m(key->constraint_selectors.at("q_m"))
    , q_c(key->constraint_selectors.at("q_c"))
    , q_arith(key->constraint_selectors.at("q_arith"))
    , q_1_fft(key->constraint_selector_ffts.at("q_1_fft"))
    , q_2_fft(key->constraint_selector_ffts.at("q_2_fft"))
    , q_3_fft(key->constraint_selector_ffts.at("q_3_fft"))
    , q_4_fft(key->constraint_selector_ffts.at("q_4_fft"))
    , q_5_fft(key->constraint_selector_ffts.at("q_5_fft"))
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
    , q_5(key->constraint_selectors.at("q_5"))
    , q_m(key->constraint_selectors.at("q_m"))
    , q_c(key->constraint_selectors.at("q_c"))
    , q_arith(key->constraint_selectors.at("q_arith"))
    , q_1_fft(key->constraint_selector_ffts.at("q_1_fft"))
    , q_2_fft(key->constraint_selector_ffts.at("q_2_fft"))
    , q_3_fft(key->constraint_selector_ffts.at("q_3_fft"))
    , q_4_fft(key->constraint_selector_ffts.at("q_4_fft"))
    , q_5_fft(key->constraint_selector_ffts.at("q_5_fft"))
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
    q_5 = key->constraint_selectors.at("q_5");
    q_m = key->constraint_selectors.at("q_m");
    q_c = key->constraint_selectors.at("q_c");
    q_arith = key->constraint_selectors.at("q_arith");

    q_1_fft = key->constraint_selectors.at("q_1_fft");
    q_2_fft = key->constraint_selectors.at("q_2_fft");
    q_3_fft = key->constraint_selectors.at("q_3_fft");
    q_4_fft = key->constraint_selectors.at("q_4_fft");
    q_5_fft = key->constraint_selectors.at("q_5_fft");
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
    q_5 = key->constraint_selectors.at("q_5");
    q_m = key->constraint_selectors.at("q_m");
    q_c = key->constraint_selectors.at("q_c");
    q_arith = key->constraint_selectors.at("q_arith");

    q_1_fft = key->constraint_selectors.at("q_1_fft");
    q_2_fft = key->constraint_selectors.at("q_2_fft");
    q_3_fft = key->constraint_selectors.at("q_3_fft");
    q_4_fft = key->constraint_selectors.at("q_4_fft");
    q_5_fft = key->constraint_selectors.at("q_5_fft");
    q_m_fft = key->constraint_selectors.at("q_m_fft");
    q_c_fft = key->constraint_selectors.at("q_c_fft");
    q_arith_fft = key->constraint_selectors.at("q_arith_fft");
    return *this;
}

fr::field_t ProverTurboArithmeticWidget::compute_quotient_contribution(const barretenberg::fr::field_t& alpha_base,
                                                                       const transcript::Transcript& transcript)
{
    const fr::field_t alpha = fr::field_t::serialize_from_buffer(transcript.get_challenge("alpha").begin());

    const fr::field_t* w_1_fft = &key->wire_ffts.at("w_1_fft")[0];
    const fr::field_t* w_2_fft = &key->wire_ffts.at("w_2_fft")[0];
    const fr::field_t* w_3_fft = &key->wire_ffts.at("w_3_fft")[0];
    const fr::field_t* w_4_fft = &key->wire_ffts.at("w_4_fft")[0];

    fr::field_t* quotient_large = &key->quotient_large[0];

    constexpr fr::field_t minus_two = fr::field_t{ 2, 0, 0, 0 }.to_montgomery_form().neg();
    constexpr fr::field_t minus_seven = fr::field_t{ 7, 0, 0, 0 }.to_montgomery_form().neg();
#ifndef NO_MULTITHREADING
#pragma omp parallel for
#endif
    for (size_t j = 0; j < key->large_domain.num_threads; ++j) {
        const size_t start = j * key->large_domain.thread_size;
        const size_t end = (j + 1) * key->large_domain.thread_size;
        fr::field_t T0;
        fr::field_t T1;
        fr::field_t T2;
        fr::field_t T3;
        fr::field_t T4;
        fr::field_t T5;
        fr::field_t T6;
        for (size_t i = start; i < end; ++i) {

            T0 = w_1_fft[i].mul_with_coarse_reduction(q_m_fft[i]);
            T0.self_mul_with_coarse_reduction(w_2_fft[i]);
            T1 = w_1_fft[i].mul_with_coarse_reduction(q_1_fft[i]);
            T2 = w_2_fft[i].mul_with_coarse_reduction(q_2_fft[i]);
            T3 = w_3_fft[i].mul_with_coarse_reduction(q_3_fft[i]);
            T4 = w_4_fft[i].mul_with_coarse_reduction(q_4_fft[i]);
            T5 = w_4_fft[i].sqr_with_coarse_reduction();
            T5.self_sub_with_coarse_reduction(w_4_fft[i]);
            T6 = w_4_fft[i].add_with_coarse_reduction(minus_two);
            T5.self_mul_with_coarse_reduction(T6);
            T5.self_mul_with_coarse_reduction(q_5_fft[i]);
            T5.self_mul_with_coarse_reduction(alpha);

            T0.self_add_with_coarse_reduction(T1);
            T0.self_add_with_coarse_reduction(T2);
            T0.self_add_with_coarse_reduction(T3);
            T0.self_add_with_coarse_reduction(T4);
            T0.self_add_with_coarse_reduction(T5);
            T0.self_add_with_coarse_reduction(q_c_fft[i]);
            T0.self_mul_with_coarse_reduction(q_arith_fft[i]);

            /**
             * quad extraction term
             *
             * We evaluate ranges using the turbo_range_widget, which generates a sequence
             * of accumulating sums - each sum aggregates a base-4 value.
             *
             * We sometimes need to extract individual bits from our quads, the following
             * term will extrat the high bit from two accumulators, and add it into the
             * arithmetic identity.
             *
             * This term is only active when q_arith[i] is set to 2
             **/
            T1 = q_arith_fft[i].sqr_with_coarse_reduction();
            T1.self_sub_with_coarse_reduction(q_arith_fft[i]);

            T2 = w_4_fft[i].add_without_reduction(w_4_fft[i]);
            T2.self_add_with_coarse_reduction(T2);
            T2 = w_3_fft[i].sub_with_coarse_reduction(T2);

            T3 = T2.sqr_with_coarse_reduction();
            T3.self_add_with_coarse_reduction(T3);

            T4 = T2.add_with_coarse_reduction(T2);
            T4.self_add_with_coarse_reduction(T2);
            T5 = T4.add_with_coarse_reduction(T4);
            T4.self_add_with_coarse_reduction(T5);

            T4.self_sub_with_coarse_reduction(T3);
            T4.self_add_with_coarse_reduction(minus_seven);

            // T2 = 6 iff delta is 2 or 3
            // T2 = 0 iff delta is 0 or 1 (extracts high bit)
            T2.self_mul_with_coarse_reduction(T4);

            T1.self_mul_with_coarse_reduction(T2);

            T0.self_add_with_coarse_reduction(T1);
            T0.self_mul_with_coarse_reduction(alpha_base);

            quotient_large[i].self_add(T0);
        }
    }
    return alpha_base * alpha.sqr();
}

void ProverTurboArithmeticWidget::compute_transcript_elements(transcript::Transcript& transcript)
{
    fr::field_t z = fr::field_t::serialize_from_buffer(&transcript.get_challenge("z")[0]);

    transcript.add_element("q_arith",
                           transcript_helpers::convert_field_element(q_arith.evaluate(z, key->small_domain.size)));
}

fr::field_t ProverTurboArithmeticWidget::compute_linear_contribution(const fr::field_t& alpha_base,
                                                                     const transcript::Transcript& transcript,
                                                                     barretenberg::polynomial& r)
{

    fr::field_t alpha = fr::field_t::serialize_from_buffer(transcript.get_challenge("alpha").begin());
    fr::field_t w_l_eval = fr::field_t::serialize_from_buffer(&transcript.get_element("w_1")[0]);
    fr::field_t w_r_eval = fr::field_t::serialize_from_buffer(&transcript.get_element("w_2")[0]);
    fr::field_t w_o_eval = fr::field_t::serialize_from_buffer(&transcript.get_element("w_3")[0]);
    fr::field_t w_4_eval = fr::field_t::serialize_from_buffer(&transcript.get_element("w_4")[0]);
    fr::field_t q_arith_eval = fr::field_t::serialize_from_buffer(&transcript.get_element("q_arith")[0]);

    fr::field_t neg_two = fr::field_t{ 2, 0, 0, 0 }.to_montgomery_form().neg();
    fr::field_t w_lr = w_l_eval * w_r_eval;
    fr::field_t is_w_4_bool = (w_4_eval.sqr() - w_4_eval) * (w_4_eval + neg_two) * alpha;
    ITERATE_OVER_DOMAIN_START(key->small_domain);
    fr::field_t T0 = w_lr * q_m[i];
    fr::field_t T1 = w_l_eval * q_1[i];
    fr::field_t T2 = w_r_eval * q_2[i];
    fr::field_t T3 = w_o_eval * q_3[i];
    fr::field_t T4 = w_4_eval * q_4[i];
    fr::field_t T5 = is_w_4_bool * q_5[i];
    r[i].self_add((T0 + T1 + T2 + T3 + T4 + T5 + q_c[i]) * q_arith_eval * alpha_base);
    ITERATE_OVER_DOMAIN_END;

    return alpha_base * alpha.sqr();
}

fr::field_t ProverTurboArithmeticWidget::compute_opening_poly_contribution(const fr::field_t& nu_base,
                                                                           const transcript::Transcript& transcript,
                                                                           fr::field_t* poly,
                                                                           fr::field_t*)
{
    fr::field_t nu = fr::field_t::serialize_from_buffer(&transcript.get_challenge("nu")[0]);

    ITERATE_OVER_DOMAIN_START(key->small_domain);
    poly[i].self_add(q_arith[i] * nu_base);
    ITERATE_OVER_DOMAIN_END;

    return nu_base * nu;
}

// ###

VerifierTurboArithmeticWidget::VerifierTurboArithmeticWidget()
    : VerifierBaseWidget()
{}

fr::field_t VerifierTurboArithmeticWidget::compute_quotient_evaluation_contribution(
    verification_key*, const fr::field_t& alpha_base, const transcript::Transcript& transcript, fr::field_t& t_eval)
{
    const fr::field_t alpha = fr::field_t::serialize_from_buffer(transcript.get_challenge("alpha").begin());
    const fr::field_t q_arith_eval = fr::field_t::serialize_from_buffer(&transcript.get_element("q_arith")[0]);

    const fr::field_t w_3_eval = fr::field_t::serialize_from_buffer(&transcript.get_element("w_3")[0]);
    const fr::field_t w_4_eval = fr::field_t::serialize_from_buffer(&transcript.get_element("w_4")[0]);

    fr::field_t T1;
    fr::field_t T2;
    fr::field_t T3;
    fr::field_t T4;
    fr::field_t T5;
    constexpr fr::field_t minus_seven = fr::field_t{ 7, 0, 0, 0 }.to_montgomery_form().neg();

    T1 = q_arith_eval.sqr() - q_arith_eval;

    T2 = w_4_eval + w_4_eval;
    T2 = T2 + T2;
    T2 = w_3_eval - T2;

    T3 = T2.sqr();
    T3 = T3 + T3;

    T4 = T2 + T2 + T2;
    T5 = T4 + T4;
    T4 = T4 + T5;
    T4 = T4 - T3;
    T4 = T4 + minus_seven;

    T2 = T2 * T4;

    T1 = T1 * T2;
    T1 = T1 * alpha_base;

    t_eval = t_eval + T1;

    return alpha_base * alpha.sqr();
}

barretenberg::fr::field_t VerifierTurboArithmeticWidget::compute_batch_evaluation_contribution(
    verification_key*,
    barretenberg::fr::field_t& batch_eval,
    const barretenberg::fr::field_t& nu_base,
    const transcript::Transcript& transcript)
{
    fr::field_t q_arith_eval = fr::field_t::serialize_from_buffer(&transcript.get_element("q_arith")[0]);

    fr::field_t nu = fr::field_t::serialize_from_buffer(&transcript.get_challenge("nu")[0]);

    batch_eval = batch_eval + (nu_base * q_arith_eval);

    return nu_base * nu;
}

VerifierBaseWidget::challenge_coefficients VerifierTurboArithmeticWidget::append_scalar_multiplication_inputs(
    verification_key* key,
    const challenge_coefficients& challenge,
    const transcript::Transcript& transcript,
    std::vector<barretenberg::g1::affine_element>& points,
    std::vector<barretenberg::fr::field_t>& scalars)
{
    fr::field_t w_l_eval = fr::field_t::serialize_from_buffer(&transcript.get_element("w_1")[0]);
    fr::field_t w_r_eval = fr::field_t::serialize_from_buffer(&transcript.get_element("w_2")[0]);
    fr::field_t w_o_eval = fr::field_t::serialize_from_buffer(&transcript.get_element("w_3")[0]);
    fr::field_t w_4_eval = fr::field_t::serialize_from_buffer(&transcript.get_element("w_4")[0]);

    fr::field_t q_arith_eval = fr::field_t::serialize_from_buffer(&transcript.get_element("q_arith")[0]);

    fr::field_t q_l_term = w_l_eval * q_arith_eval * challenge.alpha_base * challenge.linear_nu;
    if (g1::on_curve(key->constraint_selectors.at("Q_1"))) {
        points.push_back(key->constraint_selectors.at("Q_1"));
        scalars.push_back(q_l_term);
    }

    fr::field_t q_r_term = w_r_eval * q_arith_eval * challenge.alpha_base * challenge.linear_nu;
    if (g1::on_curve(key->constraint_selectors.at("Q_2"))) {
        points.push_back(key->constraint_selectors.at("Q_2"));
        scalars.push_back(q_r_term);
    }

    fr::field_t q_o_term = w_o_eval * q_arith_eval * challenge.alpha_base * challenge.linear_nu;
    if (g1::on_curve(key->constraint_selectors.at("Q_3"))) {
        points.push_back(key->constraint_selectors.at("Q_3"));
        scalars.push_back(q_o_term);
    }

    fr::field_t q_4_term = w_4_eval * q_arith_eval * challenge.alpha_base * challenge.linear_nu;
    if (g1::on_curve(key->constraint_selectors.at("Q_4"))) {
        points.push_back(key->constraint_selectors.at("Q_4"));
        scalars.push_back(q_4_term);
    }

    constexpr fr::field_t minus_two = fr::field_t{ 2, 0, 0, 0 }.to_montgomery_form().neg();
    fr::field_t q_5_term = (w_4_eval.sqr() - w_4_eval) * (w_4_eval + minus_two) * challenge.alpha_base *
                           challenge.alpha_step * challenge.linear_nu * q_arith_eval;
    if (g1::on_curve(key->constraint_selectors.at("Q_5"))) {
        points.push_back(key->constraint_selectors.at("Q_5"));
        scalars.push_back(q_5_term);
    }

    // Q_M term = w_l * w_r * challenge.alpha_base * nu
    fr::field_t q_m_term = w_l_eval * w_r_eval * challenge.alpha_base * challenge.linear_nu * q_arith_eval;
    if (g1::on_curve(key->constraint_selectors.at("Q_M"))) {
        points.push_back(key->constraint_selectors.at("Q_M"));
        scalars.push_back(q_m_term);
    }

    fr::field_t q_c_term = challenge.alpha_base * challenge.linear_nu * q_arith_eval;
    if (g1::on_curve(key->constraint_selectors.at("Q_C"))) {
        points.push_back(key->constraint_selectors.at("Q_C"));
        scalars.push_back(q_c_term);
    }

    if (g1::on_curve(key->constraint_selectors.at("Q_ARITHMETIC_SELECTOR"))) {
        points.push_back(key->constraint_selectors.at("Q_ARITHMETIC_SELECTOR"));
        scalars.push_back(challenge.nu_base);
    }

    return VerifierBaseWidget::challenge_coefficients{ challenge.alpha_base * challenge.alpha_step.sqr(),
                                                       challenge.alpha_step,
                                                       challenge.nu_base * challenge.nu_step,
                                                       challenge.nu_step,
                                                       challenge.linear_nu };
}
} // namespace waffle