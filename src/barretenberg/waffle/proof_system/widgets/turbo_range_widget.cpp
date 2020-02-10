#include "./turbo_range_widget.hpp"

#include "../../../curves/grumpkin/grumpkin.hpp"

#include "../../../curves/bn254/scalar_multiplication/scalar_multiplication.hpp"
#include "../../../polynomials/evaluation_domain.hpp"
#include "../../../transcript/transcript.hpp"
#include "../../../types.hpp"

#include "../transcript_helpers.hpp"

#include "../proving_key/proving_key.hpp"
#include "../verification_key/verification_key.hpp"

using namespace barretenberg;

namespace waffle {
ProverTurboRangeWidget::ProverTurboRangeWidget(proving_key* input_key, program_witness* input_witness)
    : ProverBaseWidget(input_key, input_witness)
    , q_range(key->constraint_selectors.at("q_range"))
    , q_range_fft(key->constraint_selector_ffts.at("q_range_fft"))
{}

ProverTurboRangeWidget::ProverTurboRangeWidget(const ProverTurboRangeWidget& other)
    : ProverBaseWidget(other)
    , q_range(key->constraint_selectors.at("q_range"))
    , q_range_fft(key->constraint_selector_ffts.at("q_range_fft"))
{}

ProverTurboRangeWidget::ProverTurboRangeWidget(ProverTurboRangeWidget&& other)
    : ProverBaseWidget(other)
    , q_range(key->constraint_selectors.at("q_range"))
    , q_range_fft(key->constraint_selector_ffts.at("q_range_fft"))
{}

ProverTurboRangeWidget& ProverTurboRangeWidget::operator=(const ProverTurboRangeWidget& other)
{
    ProverBaseWidget::operator=(other);
    q_range = key->constraint_selectors.at("q_range");
    q_range_fft = key->constraint_selector_ffts.at("q_range_fft");
    return *this;
}

ProverTurboRangeWidget& ProverTurboRangeWidget::operator=(ProverTurboRangeWidget&& other)
{
    ProverBaseWidget::operator=(other);
    q_range = key->constraint_selectors.at("q_range");
    q_range_fft = key->constraint_selector_ffts.at("q_range_fft");
    return *this;
}

/*
 * The range constraint accumulates base 4 values into a sum.
 * We do this by evaluating a kind of 'raster scan', where we compare adjacent elements
 * and validate that their differences map to a base for value  *
 * Let's say that we want to perform a 32-bit range constraint in 'x'.
 * We can represent x via 16 constituent base-4 'quads' {q_0, ..., q_15}:
 *
 *      15
 *      ===
 *      \          i
 * x =  /    q  . 4
 *      ===   i
 *     i = 0
 *
 * In program memory, we place an accumulating base-4 sum of x {a_0, ..., a_15}, where
 *
 *         i
 *        ===
 *        \                  j
 * a   =  /    q         .  4
 *  i     ===   (15 - j)
 *       j = 0
 *
 *
 * From this, we can use our range transition constraint to validate that
 *
 *
 *  a      - 4 . a  ϵ [0, 1, 2, 3]
 *   i + 1        i
 *
 *
 * We place our accumulating sums in program memory in the following sequence:
 *
 * +-----+-----+-----+-----+
 * |  A  |  B  |  C  |  D  |
 * +-----+-----+-----+-----+
 * | a3  | a2  | a1  | 0   |
 * | a7  | a6  | a5  | a4  |
 * | a11 | a10 | a9  | a8  |
 * | a15 | a14 | a13 | a12 |
 * | --- | --- | --- | a16 |
 * +-----+-----+-----+-----+
 *
 * Our range transition constraint on row 'i'
 * performs our base-4 range check on the follwing pairs:
 *
 * (D_{i}, C_{i}), (C_{i}, B_{i}), (B_{i}, A_{i}), (A_{i}, D_{i+1})
 *
 * We need to start our raster scan at zero, so we simplify matters and just force the first value
 * to be zero.
 *
 * The output will be in the 4th column of an otherwise unused row. Assuming this row can
 * be used for a width-3 standard gate, the total number of gates for an n-bit range constraint
 * is (n / 8) gates
 *
 **/
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

    fr::field_t delta_1;
    fr::field_t delta_2;
    fr::field_t delta_3;
    fr::field_t delta_4;

    fr::__add(w_4_fft[i], w_4_fft[i], delta_1);
    fr::__add(delta_1, delta_1, delta_1);
    fr::__sub(w_3_fft[i], delta_1, delta_1);

    fr::__add(w_3_fft[i], w_3_fft[i], delta_2);
    fr::__add(delta_2, delta_2, delta_2);
    fr::__sub(w_2_fft[i], delta_2, delta_2);

    fr::__add(w_2_fft[i], w_2_fft[i], delta_3);
    fr::__add(delta_3, delta_3, delta_3);
    fr::__sub(w_1_fft[i], delta_3, delta_3);

    fr::__add(w_1_fft[i], w_1_fft[i], delta_4);
    fr::__add(delta_4, delta_4, delta_4);
    fr::__sub(w_4_fft[i + 4], delta_4, delta_4);

    fr::field_t T0;
    fr::field_t T1;
    fr::field_t range_accumulator = fr::zero;
    fr::__sqr_with_coarse_reduction(delta_1, T0);
    fr::__sub_with_coarse_reduction(T0, delta_1, T0);      // D(D - 1)
    fr::__add_without_reduction(delta_1, minus_two, T1);   // (D - 2)
    fr::__mul_with_coarse_reduction(T0, T1, T0);           // D(D - 1)(D - 2)
    fr::__add_without_reduction(delta_1, minus_three, T1); // (D - 3)
    fr::__mul_with_coarse_reduction(T0, T1, T0);           // D(D - 1)(D - 2)(D - 3)
    fr::__mul_with_coarse_reduction(T0, alpha_a, T0);      // D(D - 1)(D - 2)(D - 3)alpha
    fr::__add(range_accumulator, T0, range_accumulator);

    fr::__sqr_with_coarse_reduction(delta_2, T0);
    fr::__sub_with_coarse_reduction(T0, delta_2, T0);      // D(D - 1)
    fr::__add_without_reduction(delta_2, minus_two, T1);   // (D - 2)
    fr::__mul_with_coarse_reduction(T0, T1, T0);           // D(D - 1)(D - 2)
    fr::__add_without_reduction(delta_2, minus_three, T1); // (D - 3)
    fr::__mul_with_coarse_reduction(T0, T1, T0);           // D(D - 1)(D - 2)(D - 3)
    fr::__mul_with_coarse_reduction(T0, alpha_b, T0);      // D(D - 1)(D - 2)(D - 3)alpha
    fr::__add(range_accumulator, T0, range_accumulator);

    fr::__sqr_with_coarse_reduction(delta_3, T0);
    fr::__sub_with_coarse_reduction(T0, delta_3, T0);      // D(D - 1)
    fr::__add_without_reduction(delta_3, minus_two, T1);   // (D - 2)
    fr::__mul_with_coarse_reduction(T0, T1, T0);           // D(D - 1)(D - 2)
    fr::__add_without_reduction(delta_3, minus_three, T1); // (D - 3)
    fr::__mul_with_coarse_reduction(T0, T1, T0);           // D(D - 1)(D - 2)(D - 3)
    fr::__mul_with_coarse_reduction(T0, alpha_c, T0);      // D(D - 1)(D - 2)(D - 3)alpha
    fr::__add(range_accumulator, T0, range_accumulator);

    fr::__sqr_with_coarse_reduction(delta_4, T0);
    fr::__sub_with_coarse_reduction(T0, delta_4, T0);      // D(D - 1)
    fr::__add_without_reduction(delta_4, minus_two, T1);   // (D - 2)
    fr::__mul_with_coarse_reduction(T0, T1, T0);           // D(D - 1)(D - 2)
    fr::__add_without_reduction(delta_4, minus_three, T1); // (D - 3)
    fr::__mul_with_coarse_reduction(T0, T1, T0);           // D(D - 1)(D - 2)(D - 3)
    fr::__mul_with_coarse_reduction(T0, alpha_d, T0);      // D(D - 1)(D - 2)(D - 3)alpha
    fr::__add(range_accumulator, T0, range_accumulator);

    fr::__mul(range_accumulator, q_range_fft[i], range_accumulator);
    fr::__add(quotient_large[i], range_accumulator, quotient_large[i]);
    ITERATE_OVER_DOMAIN_END;

    return fr::mul(alpha_d, alpha);
}

void ProverTurboRangeWidget::compute_transcript_elements(transcript::Transcript&) {}

fr::field_t ProverTurboRangeWidget::compute_linear_contribution(const fr::field_t& alpha_base,
                                                                const transcript::Transcript& transcript,
                                                                barretenberg::polynomial& r)
{
    fr::field_t alpha = fr::serialize_from_buffer(transcript.get_challenge("alpha").begin());

    fr::field_t w_4_eval = fr::serialize_from_buffer(&transcript.get_element("w_4")[0]);
    fr::field_t w_1_eval = fr::serialize_from_buffer(&transcript.get_element("w_1")[0]);
    fr::field_t w_2_eval = fr::serialize_from_buffer(&transcript.get_element("w_2")[0]);
    fr::field_t w_3_eval = fr::serialize_from_buffer(&transcript.get_element("w_3")[0]);
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
    fr::__sub(w_3_eval, delta_1, delta_1);

    fr::__add(w_3_eval, w_3_eval, delta_2);
    fr::__add(delta_2, delta_2, delta_2);
    fr::__sub(w_2_eval, delta_2, delta_2);

    fr::__add(w_2_eval, w_2_eval, delta_3);
    fr::__add(delta_3, delta_3, delta_3);
    fr::__sub(w_1_eval, delta_3, delta_3);

    fr::__add(w_1_eval, w_1_eval, delta_4);
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


// ###

VerifierTurboRangeWidget::VerifierTurboRangeWidget()
    : VerifierBaseWidget()
{
}

barretenberg::fr::field_t VerifierTurboRangeWidget::compute_quotient_evaluation_contribution(
    verification_key*, const fr::field_t& alpha_base, const transcript::Transcript& transcript, fr::field_t&)
{
    fr::field_t alpha = fr::serialize_from_buffer(transcript.get_challenge("alpha").begin());

    fr::field_t alpha_quad = fr::sqr(fr::sqr(alpha));
    return fr::mul(alpha_base, alpha_quad);
}

barretenberg::fr::field_t VerifierTurboRangeWidget::compute_batch_evaluation_contribution(
    verification_key*, barretenberg::fr::field_t&, const barretenberg::fr::field_t& nu_base, const transcript::Transcript&)
{
    return nu_base;
}

VerifierBaseWidget::challenge_coefficients VerifierTurboRangeWidget::append_scalar_multiplication_inputs(
    verification_key* key,
    const challenge_coefficients& challenge,
    const transcript::Transcript& transcript,
    std::vector<barretenberg::g1::affine_element>& points,
    std::vector<barretenberg::fr::field_t>& scalars)
{
    fr::field_t w_4_eval = fr::serialize_from_buffer(&transcript.get_element("w_4")[0]);
    fr::field_t w_1_eval = fr::serialize_from_buffer(&transcript.get_element("w_1")[0]);
    fr::field_t w_2_eval = fr::serialize_from_buffer(&transcript.get_element("w_2")[0]);
    fr::field_t w_3_eval = fr::serialize_from_buffer(&transcript.get_element("w_3")[0]);
    fr::field_t w_4_omega_eval = fr::serialize_from_buffer(&transcript.get_element("w_4_omega")[0]);

    fr::field_t alpha_a = challenge.alpha_base; // fr::mul(challenge.alpha_base, challenge.alpha_step);
    fr::field_t alpha_b = fr::mul(alpha_a, challenge.alpha_step);
    fr::field_t alpha_c = fr::mul(alpha_b, challenge.alpha_step);
    fr::field_t alpha_d = fr::mul(alpha_c, challenge.alpha_step);

    fr::field_t delta_1;
    fr::field_t delta_2;
    fr::field_t delta_3;
    fr::field_t delta_4;

    fr::__add(w_4_eval, w_4_eval, delta_1);
    fr::__add(delta_1, delta_1, delta_1);
    fr::__sub(w_3_eval, delta_1, delta_1);

    fr::__add(w_3_eval, w_3_eval, delta_2);
    fr::__add(delta_2, delta_2, delta_2);
    fr::__sub(w_2_eval, delta_2, delta_2);

    fr::__add(w_2_eval, w_2_eval, delta_3);
    fr::__add(delta_3, delta_3, delta_3);
    fr::__sub(w_1_eval, delta_3, delta_3);

    fr::__add(w_1_eval, w_1_eval, delta_4);
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

    if (g1::on_curve(key->constraint_selectors.at("Q_RANGE_SELECTOR"))) {
        points.push_back(key->constraint_selectors.at("Q_RANGE_SELECTOR"));
        scalars.push_back(range_multiplicand);
    }

    return VerifierBaseWidget::challenge_coefficients{ fr::mul(alpha_d, challenge.alpha_step),
                                                       challenge.alpha_step,
                                                       challenge.nu_base,
                                                       challenge.nu_step,
                                                       challenge.linear_nu };
}
} // namespace waffle