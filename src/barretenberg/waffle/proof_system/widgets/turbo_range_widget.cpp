#include "./turbo_range_widget.hpp"

#include "../../../curves/bn254/fr.hpp"
#include "../../../curves/bn254/g1.hpp"
#include "../../../curves/grumpkin/grumpkin.hpp"

#include "../../../curves/bn254/scalar_multiplication/scalar_multiplication.hpp"
#include "../../../polynomials/evaluation_domain.hpp"
#include "../../../types.hpp"

using namespace barretenberg;

namespace waffle {
ProverTurboRangeWidget::ProverTurboRangeWidget(proving_key* input_key, program_witness* input_witness)
    : ProverBaseWidget(input_key,
                       input_witness,
                       static_cast<size_t>(WidgetVersionControl::Dependencies::REQUIRES_W_4_SHIFTED),
                       static_cast<size_t>(WidgetVersionControl::Features::HAS_TURBO_ARITHMETISATION))
    , q_range(key->constraint_selectors.at("q_range"))
    , q_range_fft(key->constraint_selector_ffts.at("q_range_fft"))
{
    version.set_dependency(WidgetVersionControl::Dependencies::REQUIRES_W_L_SHIFTED);
    version.set_dependency(WidgetVersionControl::Dependencies::REQUIRES_W_R_SHIFTED);
    version.set_dependency(WidgetVersionControl::Dependencies::REQUIRES_W_O_SHIFTED);
}

ProverTurboRangeWidget::ProverTurboRangeWidget(const ProverTurboRangeWidget& other)
    : ProverBaseWidget(other)
    , q_range(key->constraint_selectors.at("q_range"))
    , q_range_fft(key->constraint_selector_ffts.at("q_range_fft"))
{
    version = WidgetVersionControl(other.version);
}

ProverTurboRangeWidget::ProverTurboRangeWidget(ProverTurboRangeWidget&& other)
    : ProverBaseWidget(other)
    , q_range(key->constraint_selectors.at("q_range"))
    , q_range_fft(key->constraint_selector_ffts.at("q_range_fft"))
{
    version = WidgetVersionControl(other.version);
}

ProverTurboRangeWidget& ProverTurboRangeWidget::operator=(const ProverTurboRangeWidget& other)
{
    q_range = key->constraint_selectors.at("q_range");
    q_range_fft = key->constraint_selector_ffts.at("q_range_fft");
    version = WidgetVersionControl(other.version);
    return *this;
}

ProverTurboRangeWidget& ProverTurboRangeWidget::operator=(ProverTurboRangeWidget&& other)
{
    q_range = key->constraint_selectors.at("q_range");
    q_range_fft = key->constraint_selector_ffts.at("q_range_fft");
    version = WidgetVersionControl(other.version);
    return *this;
}

fr::field_t ProverTurboRangeWidget::compute_quotient_contribution(const barretenberg::fr::field_t& alpha_base,
                                                                      const transcript::Transcript& transcript)
{
    fr::field_t alpha = fr::serialize_from_buffer(transcript.get_challenge("alpha").begin());

    fr::field_t alpha_a = alpha_base;
    fr::field_t alpha_b = fr::mul(alpha_a, alpha);
    fr::field_t alpha_c = fr::mul(alpha_b, alpha);
    fr::field_t alpha_d = fr::mul(alpha_c, alpha);

    fr::field_t* w_1_fft = &key->wire_ffts.at("w_1_fft")[0];
    fr::field_t* w_2_fft = &key->wire_ffts.at("w_2_fft")[0];
    fr::field_t* w_3_fft = &key->wire_ffts.at("w_3_fft")[0];
    fr::field_t* w_4_fft = &key->wire_ffts.at("w_4_fft")[0];

    fr::field_t* quotient_large = &key->quotient_large[0];

    fr::field_t minus_two;
    fr::field_t minus_three;
    fr::__add(fr::one, fr::one, minus_two);
    fr::__add(minus_two, fr::one, minus_three);
    fr::__neg(minus_two, minus_two);
    fr::__neg(minus_three, minus_three);


    ITERATE_OVER_DOMAIN_START(key->large_domain);

    // accumulator_delta = d(Xw) - 4d(X)
    // accumulator_delta tracks the current round's scalar multiplier
    // which should be one of {-3, -1, 1, 3}
    fr::field_t delta_1;
    fr::field_t delta_2;
    fr::field_t delta_3;
    fr::field_t delta_4;

    fr::__add(w_4_fft[i], w_4_fft[i], delta_1);
    fr::__add(delta_1, delta_1, delta_1);
    fr::__sub(w_1_fft[i + 4], delta_1, delta_1);

    fr::__add(w_1_fft[i + 4], w_1_fft[i + 4], delta_2);
    fr::__add(delta_2, delta_2, delta_2);
    fr::__sub(w_2_fft[i + 4], delta_2, delta_2);

    fr::__add(w_2_fft[i + 4], w_2_fft[i + 4], delta_3);
    fr::__add(delta_3, delta_3, delta_3);
    fr::__sub(w_3_fft[i + 4], delta_3, delta_3);

    fr::__add(w_3_fft[i + 4], w_3_fft[i + 4], delta_4);
    fr::__add(delta_4, delta_4, delta_4);
    fr::__sub(w_4_fft[i + 4], delta_4, delta_4);

    fr::field_t T0;
    fr::field_t T1;
    fr::field_t range_accumulator = fr::zero;
    fr::__sqr_with_coarse_reduction(delta_1, T0);
    fr::__sub_with_coarse_reduction(T0, delta_1, T0); // D(D - 1)
    fr::__add_without_reduction(delta_1, minus_two, T1); // (D - 2)
    fr::__mul_with_coarse_reduction(T0, T1, T0); // D(D - 1)(D - 2)
    fr::__add_without_reduction(delta_1, minus_three, T1); // (D - 3)
    fr::__mul_with_coarse_reduction(T0, T1, T0); // D(D - 1)(D - 2)(D - 3)
    fr::__mul_with_coarse_reduction(T0, alpha_a, T0); // D(D - 1)(D - 2)(D - 3)alpha
    fr::__add(range_accumulator, T0, range_accumulator);

    fr::__sqr_with_coarse_reduction(delta_2, T0);
    fr::__sub_with_coarse_reduction(T0, delta_2, T0); // D(D - 1)
    fr::__add_without_reduction(delta_2, minus_two, T1); // (D - 2)
    fr::__mul_with_coarse_reduction(T0, T1, T0); // D(D - 1)(D - 2)
    fr::__add_without_reduction(delta_2, minus_three, T1); // (D - 3)
    fr::__mul_with_coarse_reduction(T0, T1, T0); // D(D - 1)(D - 2)(D - 3)
    fr::__mul_with_coarse_reduction(T0, alpha_b, T0); // D(D - 1)(D - 2)(D - 3)alpha
    fr::__add(range_accumulator, T0, range_accumulator);

    fr::__sqr_with_coarse_reduction(delta_3, T0);
    fr::__sub_with_coarse_reduction(T0, delta_3, T0); // D(D - 1)
    fr::__add_without_reduction(delta_3, minus_two, T1); // (D - 2)
    fr::__mul_with_coarse_reduction(T0, T1, T0); // D(D - 1)(D - 2)
    fr::__add_without_reduction(delta_3, minus_three, T1); // (D - 3)
    fr::__mul_with_coarse_reduction(T0, T1, T0); // D(D - 1)(D - 2)(D - 3)
    fr::__mul_with_coarse_reduction(T0, alpha_c, T0); // D(D - 1)(D - 2)(D - 3)alpha
    fr::__add(range_accumulator, T0, range_accumulator);


    fr::__sqr_with_coarse_reduction(delta_4, T0);
    fr::__sub_with_coarse_reduction(T0, delta_4, T0); // D(D - 1)
    fr::__add_without_reduction(delta_4, minus_two, T1); // (D - 2)
    fr::__mul_with_coarse_reduction(T0, T1, T0); // D(D - 1)(D - 2)
    fr::__add_without_reduction(delta_4, minus_three, T1); // (D - 3)
    fr::__mul_with_coarse_reduction(T0, T1, T0); // D(D - 1)(D - 2)(D - 3)
    fr::__mul_with_coarse_reduction(T0, alpha_d, T0); // D(D - 1)(D - 2)(D - 3)alpha
    fr::__add(range_accumulator, T0, range_accumulator);

    fr::__mul(range_accumulator, q_range_fft[i], range_accumulator);
    fr::__add(quotient_large[i], range_accumulator, quotient_large[i]);
    ITERATE_OVER_DOMAIN_END;

    return fr::mul(alpha_d, alpha);
}

void ProverTurboRangeWidget::compute_transcript_elements(transcript::Transcript& )
{
}

fr::field_t ProverTurboRangeWidget::compute_linear_contribution(const fr::field_t& alpha_base,
                                                                    const transcript::Transcript& transcript,
                                                                    barretenberg::polynomial& r)
{
    fr::field_t alpha = fr::serialize_from_buffer(transcript.get_challenge("alpha").begin());

    fr::field_t w_4_eval = fr::serialize_from_buffer(&transcript.get_element("w_4")[0]);
    fr::field_t w_1_omega_eval = fr::serialize_from_buffer(&transcript.get_element("w_1_omega")[0]);
    fr::field_t w_2_omega_eval = fr::serialize_from_buffer(&transcript.get_element("w_2_omega")[0]);
    fr::field_t w_3_omega_eval = fr::serialize_from_buffer(&transcript.get_element("w_3_omega")[0]);
    fr::field_t w_4_omega_eval = fr::serialize_from_buffer(&transcript.get_element("w_4_omega")[0]);

    fr::field_t alpha_a = alpha_base;
    fr::field_t alpha_b = fr::mul(alpha_a, alpha);
    fr::field_t alpha_c = fr::mul(alpha_b, alpha);
    fr::field_t alpha_d = fr::mul(alpha_c, alpha);

    fr::field_t delta_1;
    fr::field_t delta_2;
    fr::field_t delta_3;
    fr::field_t delta_4;

    fr::__add(w_4_eval, w_4_eval, delta_1);
    fr::__add(delta_1, delta_1, delta_1);
    fr::__sub(w_1_omega_eval, delta_1, delta_1);

    fr::__add(w_1_omega_eval, w_1_omega_eval, delta_2);
    fr::__add(delta_2, delta_2, delta_2);
    fr::__sub(w_2_omega_eval, delta_2, delta_2);

    fr::__add(w_2_omega_eval, w_2_omega_eval, delta_3);
    fr::__add(delta_3, delta_3, delta_3);
    fr::__sub(w_3_omega_eval, delta_3, delta_3);

    fr::__add(w_3_omega_eval, w_3_omega_eval, delta_4);
    fr::__add(delta_4, delta_4, delta_4);
    fr::__sub(w_4_omega_eval, delta_4, delta_4);

    fr::field_t T0;
    fr::field_t T1;
    fr::field_t T2;
 
    fr::__sub(delta_1, fr::one, T0);
    fr::__sub(T0, fr::one, T1);
    fr::__sub(T1, fr::one, T2);
    fr::__mul(T0, delta_1, T0);
    fr::__mul(T0, T1, T0);
    fr::__mul(T0, T2, T0);
    fr::__mul(T0, alpha_a, delta_1);

    fr::__sub(delta_2, fr::one, T0);
    fr::__sub(T0, fr::one, T1);
    fr::__sub(T1, fr::one, T2);
    fr::__mul(T0, delta_2, T0);
    fr::__mul(T0, T1, T0);
    fr::__mul(T0, T2, T0);
    fr::__mul(T0, alpha_b, delta_2);

    fr::__sub(delta_3, fr::one, T0);
    fr::__sub(T0, fr::one, T1);
    fr::__sub(T1, fr::one, T2);
    fr::__mul(T0, delta_3, T0);
    fr::__mul(T0, T1, T0);
    fr::__mul(T0, T2, T0);
    fr::__mul(T0, alpha_c, delta_3);

    fr::__sub(delta_4, fr::one, T0);
    fr::__sub(T0, fr::one, T1);
    fr::__sub(T1, fr::one, T2);
    fr::__mul(T0, delta_4, T0);
    fr::__mul(T0, T1, T0);
    fr::__mul(T0, T2, T0);
    fr::__mul(T0, alpha_d, delta_4);

    fr::field_t range_multiplicand;
    fr::__add(delta_1, delta_2, range_multiplicand);
    fr::__add(range_multiplicand, delta_3, range_multiplicand);
    fr::__add(range_multiplicand, delta_4, range_multiplicand);


    ITERATE_OVER_DOMAIN_START(key->small_domain);
    fr::field_t T3;
    fr::__mul(range_multiplicand, q_range[i], T3);
    fr::__add(r[i], T3, r[i]);
    ITERATE_OVER_DOMAIN_END;
    return fr::mul(alpha_d, alpha);
}

fr::field_t ProverTurboRangeWidget::compute_opening_poly_contribution(const fr::field_t& nu_base,
                                                                          const transcript::Transcript&,
                                                                          fr::field_t*,
                                                                          fr::field_t*)
{
    return nu_base;
}

std::unique_ptr<VerifierBaseWidget> ProverTurboRangeWidget::compute_preprocessed_commitments(const ReferenceString& reference_string) const
{
    polynomial polys[1]{ polynomial(q_range, key->small_domain.size)};


    std::vector<barretenberg::g1::affine_element> commitments;
    commitments.resize(1);

    for (size_t i = 0; i < 1; ++i) {
        g1::jacobian_to_affine(
            scalar_multiplication::pippenger(polys[i].get_coefficients(), reference_string.monomials, key->small_domain.size),
            commitments[i]);
    }
    std::unique_ptr<VerifierBaseWidget> result = std::make_unique<VerifierTurboRangeWidget>(commitments);
    return result;
}

void ProverTurboRangeWidget::reset()
{
}

// ###

VerifierTurboRangeWidget::VerifierTurboRangeWidget(
    std::vector<barretenberg::g1::affine_element>& instance_commitments)
    : VerifierBaseWidget(static_cast<size_t>(WidgetVersionControl::Dependencies::REQUIRES_W_4_SHIFTED),
                         static_cast<size_t>(WidgetVersionControl::Features::HAS_TURBO_ARITHMETISATION))
{
    version.set_dependency(WidgetVersionControl::Dependencies::REQUIRES_W_L_SHIFTED);
    version.set_dependency(WidgetVersionControl::Dependencies::REQUIRES_W_R_SHIFTED);
    version.set_dependency(WidgetVersionControl::Dependencies::REQUIRES_W_O_SHIFTED);
    ASSERT(instance_commitments.size() == 1);
    instance =
        std::vector<g1::affine_element>{ instance_commitments[0] };
}

barretenberg::fr::field_t VerifierTurboRangeWidget::compute_quotient_evaluation_contribution(
    const fr::field_t& alpha_base, const transcript::Transcript&, fr::field_t& , const evaluation_domain& )
{
    return alpha_base;
}

barretenberg::fr::field_t VerifierTurboRangeWidget::compute_batch_evaluation_contribution(
    barretenberg::fr::field_t&,
    const barretenberg::fr::field_t& nu_base,
    const transcript::Transcript&)
{
    return nu_base;
}

VerifierBaseWidget::challenge_coefficients VerifierTurboRangeWidget::append_scalar_multiplication_inputs(
    const challenge_coefficients& challenge,
    const transcript::Transcript& transcript,
    std::vector<barretenberg::g1::affine_element>& points,
    std::vector<barretenberg::fr::field_t>& scalars)
{
    fr::field_t w_4_eval = fr::serialize_from_buffer(&transcript.get_element("w_4")[0]);
    fr::field_t w_1_omega_eval = fr::serialize_from_buffer(&transcript.get_element("w_1_omega")[0]);
    fr::field_t w_2_omega_eval = fr::serialize_from_buffer(&transcript.get_element("w_2_omega")[0]);
    fr::field_t w_3_omega_eval = fr::serialize_from_buffer(&transcript.get_element("w_3_omega")[0]);
    fr::field_t w_4_omega_eval = fr::serialize_from_buffer(&transcript.get_element("w_4_omega")[0]);


    fr::field_t alpha_a = fr::mul(challenge.alpha_base, challenge.alpha_step);
    fr::field_t alpha_b = fr::mul(alpha_a, challenge.alpha_step);
    fr::field_t alpha_c = fr::mul(alpha_b, challenge.alpha_step);
    fr::field_t alpha_d = fr::mul(alpha_c, challenge.alpha_step);

    fr::field_t delta_1;
    fr::field_t delta_2;
    fr::field_t delta_3;
    fr::field_t delta_4;

    fr::__add(w_4_eval, w_4_eval, delta_1);
    fr::__add(delta_1, delta_1, delta_1);
    fr::__sub(w_1_omega_eval, delta_1, delta_1);

    fr::__add(w_1_omega_eval, w_1_omega_eval, delta_2);
    fr::__add(delta_2, delta_2, delta_2);
    fr::__sub(w_2_omega_eval, delta_2, delta_2);

    fr::__add(w_2_omega_eval, w_2_omega_eval, delta_3);
    fr::__add(delta_3, delta_3, delta_3);
    fr::__sub(w_3_omega_eval, delta_3, delta_3);

    fr::__add(w_3_omega_eval, w_3_omega_eval, delta_4);
    fr::__add(delta_4, delta_4, delta_4);
    fr::__sub(w_4_omega_eval, delta_4, delta_4);

    fr::field_t T0;
    fr::field_t T1;
    fr::field_t T2;
 
    fr::__sub(delta_1, fr::one, T0);
    fr::__sub(T0, fr::one, T1);
    fr::__sub(T1, fr::one, T2);
    fr::__mul(T0, delta_1, T0);
    fr::__mul(T0, T1, T0);
    fr::__mul(T0, T2, T0);
    fr::__mul(T0, alpha_a, delta_1);

    fr::__sub(delta_2, fr::one, T0);
    fr::__sub(T0, fr::one, T1);
    fr::__sub(T1, fr::one, T2);
    fr::__mul(T0, delta_2, T0);
    fr::__mul(T0, T1, T0);
    fr::__mul(T0, T2, T0);
    fr::__mul(T0, alpha_b, delta_2);

    fr::__sub(delta_3, fr::one, T0);
    fr::__sub(T0, fr::one, T1);
    fr::__sub(T1, fr::one, T2);
    fr::__mul(T0, delta_3, T0);
    fr::__mul(T0, T1, T0);
    fr::__mul(T0, T2, T0);
    fr::__mul(T0, alpha_c, delta_3);

    fr::__sub(delta_4, fr::one, T0);
    fr::__sub(T0, fr::one, T1);
    fr::__sub(T1, fr::one, T2);
    fr::__mul(T0, delta_4, T0);
    fr::__mul(T0, T1, T0);
    fr::__mul(T0, T2, T0);
    fr::__mul(T0, alpha_d, delta_4);

    fr::field_t range_multiplicand;
    fr::__add(delta_1, delta_2, range_multiplicand);
    fr::__add(range_multiplicand, delta_3, range_multiplicand);
    fr::__add(range_multiplicand, delta_4, range_multiplicand);
    fr::__mul(range_multiplicand, challenge.linear_nu, range_multiplicand);

    if (g1::on_curve(instance[0])) {
        points.push_back(instance[0]);
        scalars.push_back(range_multiplicand);
    }


    return VerifierBaseWidget::challenge_coefficients{ fr::mul(alpha_d, challenge.alpha_step),
                                                       challenge.alpha_step,
                                                       challenge.nu_base,
                                                       challenge.nu_step,
                                                       challenge.linear_nu };
}
} // namespace waffle